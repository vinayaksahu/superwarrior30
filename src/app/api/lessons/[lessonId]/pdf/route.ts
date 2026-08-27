import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedDownloadUrl } from "@/lib/storage";
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
            course: { select: { id: true } },
          },
        },
      },
    });

    if (!lesson || (!lesson.pdfKey && !lesson.bunnyCdnUrl)) {
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

    // 3. Handle Bunny CDN URL (redirect to CDN)
    if (lesson.mediaProvider === "BUNNY" && lesson.bunnyCdnUrl) {
      return NextResponse.redirect(lesson.bunnyCdnUrl);
    }

    const pdfKey = lesson.pdfKey;
    if (!pdfKey) {
      return new NextResponse("PDF not found for this lesson.", { status: 404 });
    }

    // 4. Handle base64 data URI
    if (pdfKey.startsWith("data:application/pdf;base64,")) {
      const base64Data = pdfKey.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");

      return new NextResponse(buffer, {
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
