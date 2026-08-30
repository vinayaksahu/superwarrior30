import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/storage";
import { getResolvedBunnyConfig, bunnyStorageConfig, bunnyCdnConfig } from "@/lib/bunny";
import { isR2Configured, r2 } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return new NextResponse("Unauthorized. Please log in.", { status: 401 });
    }

    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

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

    // 2. Verify enrollment
    if (!isAdmin && !lesson.isFreePreview) {
      const enrollment = await prisma.courseEnrollment.findFirst({
        where: {
          userId: user.id,
          courseId: lesson.module.course.id,
          status: "ACTIVE",
        },
      });

      if (!enrollment) {
        // Check if student has a PAID order
        const paidOrder = await prisma.order.findFirst({
          where: {
            userId: user.id,
            status: "PAID",
            items: { some: { courseId: lesson.module.course.id } },
          },
        });

        if (!paidOrder) {
          return new NextResponse("Forbidden. Active enrollment required.", { status: 403 });
        }
      }
    }

    // 3. Handle Bunny CDN URL (stream directly to prevent CORS issues with dual fallback)
    if (lesson.bunnyCdnUrl) {
      try {
        let pdfBuffer: Buffer | null = null;

        // Attempt 1: Fetch via Bunny CDN
        try {
          const cdnRes = await fetch(lesson.bunnyCdnUrl);
          if (cdnRes.ok) {
            const arrayBuffer = await cdnRes.arrayBuffer();
            pdfBuffer = Buffer.from(arrayBuffer);
          }
        } catch (cdnFetchErr) {
          console.warn("[PDF Stream] Bunny CDN fetch error, trying storage fallback:", cdnFetchErr);
        }

        // Attempt 2: Direct Bunny Storage fetch fallback (authorized with AccessKey)
        const bunnyConfig = await getResolvedBunnyConfig();
        if (!pdfBuffer && bunnyConfig.storageZoneName && bunnyConfig.storagePassword) {
          try {
            const cdnBase = bunnyConfig.cdnHostname ? `https://${bunnyConfig.cdnHostname.replace(/^https?:\/\//, "")}` : bunnyCdnConfig.baseUrl;
            const storagePath = lesson.bunnyCdnUrl.replace(cdnBase, "").replace(/^\/+/, "");
            const storageUrl = `https://${bunnyConfig.storageHostname}/${bunnyConfig.storageZoneName}/${storagePath}`;
            const storageRes = await fetch(storageUrl, {
              headers: {
                AccessKey: bunnyConfig.storagePassword,
              },
            });
            if (storageRes.ok) {
              const arrayBuffer = await storageRes.arrayBuffer();
              pdfBuffer = Buffer.from(arrayBuffer);
            }
          } catch (storageErr) {
            console.error("[PDF Stream] Direct Bunny Storage fallback error:", storageErr);
          }
        }

        if (pdfBuffer) {
          return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${encodeURIComponent(lesson.title)}.pdf"`,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }

        console.error(`[PDF Stream] Bunny PDF not found on CDN or Storage for URL: ${lesson.bunnyCdnUrl}`);
        return new NextResponse("PDF storage file not found", { status: 404 });
      } catch (streamErr) {
        console.error("[PDF Stream] Could not proxy Bunny CDN stream:", streamErr);
        return new NextResponse("Failed to fetch PDF from CDN storage", { status: 502 });
      }
    }

    const pdfKey = lesson.pdfKey;
    if (!pdfKey) {
      return new NextResponse("PDF not found for this lesson.", { status: 404 });
    }

    // 4. Handle base64 data URI
    if (pdfKey.startsWith("data:application/pdf;base64,")) {
      const base64Data = pdfKey.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${encodeURIComponent(lesson.title)}.pdf"`,
          "Cache-Control": "public, max-age=3600",
        },
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
          const stream = s3Response.Body.transformToWebStream();
          return new NextResponse(stream, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${encodeURIComponent(lesson.title)}.pdf"`,
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      } catch (r2Err) {
        console.error("R2 PDF Fetch Error:", r2Err);
      }
    }

    // 5. Fallback presigned URL redirect
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
