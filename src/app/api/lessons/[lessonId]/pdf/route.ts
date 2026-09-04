import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/storage";
import { getResolvedBunnyConfig, bunnyStorageConfig, bunnyCdnConfig } from "@/lib/bunny";
import { isR2Configured, r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { PDFDocument } from "pdf-lib";

async function slicePdfPages(pdfBytes: Uint8Array | Buffer, maxPages: number): Promise<Uint8Array> {
  try {
    const srcDoc = await PDFDocument.load(pdfBytes);
    const totalPages = srcDoc.getPageCount();
    if (totalPages <= maxPages) {
      return pdfBytes;
    }

    const previewDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: maxPages }, (_, i) => i);
    const copiedPages = await previewDoc.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => previewDoc.addPage(page));

    return await previewDoc.save();
  } catch (err) {
    console.error("[PDF Slice Error]:", err);
    return pdfBytes;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const user = await getCurrentUser();
    const isPreviewParam = req.nextUrl.searchParams.get("preview") === "true";

    // 1. Fetch lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            course: { select: { id: true, deletedAt: true } },
          },
        },
      },
    });

    if (!lesson || (!lesson.pdfKey && !lesson.bunnyCdnUrl) || lesson.module.course.deletedAt !== null) {
      return new NextResponse("PDF not found for this lesson.", { status: 404 });
    }

    const isAdmin = Boolean(user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN"));
    let isEnrolled = false;

    if (user) {
      const enrollment = await prisma.courseEnrollment.findFirst({
        where: {
          userId: user.id,
          courseId: lesson.module.course.id,
          status: "ACTIVE",
        },
      });

      if (enrollment) {
        isEnrolled = true;
      } else {
        const paidOrder = await prisma.order.findFirst({
          where: {
            userId: user.id,
            status: "PAID",
            items: { some: { courseId: lesson.module.course.id } },
          },
        });
        if (paidOrder) isEnrolled = true;
      }
    }

    // 2. Verify authorization (if not free preview, require enrolled user or admin)
    if (!lesson.isFreePreview && !isAdmin && !isEnrolled) {
      if (!user) {
        return new NextResponse("Unauthorized. Please log in.", { status: 401 });
      }
      return new NextResponse("Forbidden. Active enrollment required.", { status: 403 });
    }

    const shouldLimitPages = isPreviewParam || (!isEnrolled && !isAdmin && lesson.isFreePreview);
    const maxPages = lesson.durationSec && lesson.durationSec > 0 ? lesson.durationSec : 1;

    const getResponseHeaders = (isLimited: boolean) => ({
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${encodeURIComponent(lesson.title)}.pdf"`,
      "Cache-Control": isLimited
        ? "public, max-age=1800"
        : "private, no-cache, no-store, must-revalidate",
      "Pragma": isLimited ? "auto" : "no-cache",
      "X-Content-Type-Options": "nosniff",
    });

    // 3. Handle Bunny CDN / HTTP URL (stream directly with dual fallback)
    const effectivePdfUrl = lesson.bunnyCdnUrl || (lesson.pdfKey?.startsWith("http") ? lesson.pdfKey : null);
    if (effectivePdfUrl) {
      try {
        let pdfBytes: Uint8Array | null = null;

        // Attempt 1: Fetch via Bunny CDN
        try {
          const cdnRes = await fetch(effectivePdfUrl);
          if (cdnRes.ok) {
            const arrayBuffer = await cdnRes.arrayBuffer();
            pdfBytes = new Uint8Array(arrayBuffer);
          }
        } catch (cdnFetchErr) {
          console.warn("[PDF Stream] Bunny CDN fetch error, trying storage fallback:", cdnFetchErr);
        }

        // Attempt 2: Direct Bunny Storage fetch fallback (authorized with AccessKey)
        const bunnyConfig = await getResolvedBunnyConfig();
        if (!pdfBytes && bunnyConfig.storageZoneName && bunnyConfig.storagePassword) {
          try {
            const cdnBase = bunnyConfig.cdnHostname ? `https://${bunnyConfig.cdnHostname.replace(/^https?:\/\//, "")}` : bunnyCdnConfig.baseUrl;
            const storagePath = effectivePdfUrl.replace(cdnBase, "").replace(/^\/+/, "");
            const storageUrl = `https://${bunnyConfig.storageHostname}/${bunnyConfig.storageZoneName}/${storagePath}`;
            const storageRes = await fetch(storageUrl, {
              headers: {
                AccessKey: bunnyConfig.storagePassword,
              },
            });
            if (storageRes.ok) {
              const arrayBuffer = await storageRes.arrayBuffer();
              pdfBytes = new Uint8Array(arrayBuffer);
            }
          } catch (storageErr) {
            console.error("[PDF Stream] Direct Bunny Storage fallback error:", storageErr);
          }
        }

        if (pdfBytes) {
          if (shouldLimitPages) {
            pdfBytes = await slicePdfPages(pdfBytes, maxPages);
          }

          return new NextResponse(Buffer.from(pdfBytes), {
            headers: getResponseHeaders(shouldLimitPages),
          });
        }

        console.error(`[PDF Stream] Bunny PDF not found on CDN or Storage for URL: ${effectivePdfUrl}`);
      } catch (streamErr) {
        console.error("[PDF Stream] Could not proxy Bunny CDN stream:", streamErr);
      }
    }

    const pdfKey = lesson.pdfKey;
    if (!pdfKey) {
      return new NextResponse("PDF not found for this lesson.", { status: 404 });
    }

    // 4. Handle base64 data URI
    if (pdfKey.startsWith("data:application/pdf;base64,")) {
      const base64Data = pdfKey.split(",")[1];
      let pdfBytes: Uint8Array = Buffer.from(base64Data, "base64");

      if (shouldLimitPages) {
        pdfBytes = await slicePdfPages(pdfBytes, maxPages);
      }

      return new NextResponse(Buffer.from(pdfBytes), {
        headers: getResponseHeaders(shouldLimitPages),
      });
    }

    // 5. Handle Cloudflare R2 / S3
    if (isR2Configured()) {
      try {
        const bucket = process.env.R2_BUCKET_NAME || "superwarrior30";
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: pdfKey,
        });

        const s3Response = await r2.send(command);
        if (s3Response.Body) {
          const bytes = await s3Response.Body.transformToByteArray();
          let pdfBytes: Uint8Array = bytes;

          if (shouldLimitPages) {
            pdfBytes = await slicePdfPages(pdfBytes, maxPages);
          }

          return new NextResponse(Buffer.from(pdfBytes), {
            headers: getResponseHeaders(shouldLimitPages),
          });
        }
      } catch (r2Err) {
        console.error("R2 PDF Fetch Error:", r2Err);
      }
    }

    // 6. Fallback presigned URL redirect
    const signedUrl = await createPresignedDownloadUrl(pdfKey, 3600);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }

    return new NextResponse("Unable to load PDF", { status: 500 });
  } catch (error: unknown) {
    console.error("PDF Route Error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
