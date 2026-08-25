import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/dal/auth";
import { prisma } from "@/lib/prisma";
import { isR2Configured, r2 } from "@/lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "pdf";
    const courseId = formData.get("courseId") as string;
    const moduleId = formData.get("moduleId") as string | null;
    const lessonId = formData.get("lessonId") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided for upload." },
        { status: 400 }
      );
    }

    const filename = file.name;
    const ext = filename.split(".").pop()?.toLowerCase() || "bin";
    const uniqueId = crypto.randomUUID();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let key: string;
    if (category === "thumbnail") {
      key = `courses/${courseId}/thumbnail-${uniqueId}.${ext}`;
    } else if (category === "video" && lessonId) {
      key = `courses/${courseId}/lessons/${lessonId}/video-${uniqueId}.${ext}`;
    } else if (category === "pdf" && lessonId) {
      key = `courses/${courseId}/lessons/${lessonId}/doc-${uniqueId}.${ext}`;
    } else {
      key = `courses/${courseId}/files/${uniqueId}.${ext}`;
    }

    // 1. Upload to Cloudflare R2 if configured
    if (isR2Configured()) {
      try {
        const bucket = process.env.R2_BUCKET_NAME || "superwarrior30";
        await r2.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: file.type || (category === "pdf" ? "application/pdf" : "application/octet-stream"),
          })
        );
      } catch (r2Err: unknown) {
        console.error("Cloudflare R2 PutObject error:", r2Err);
        // Fallback to base64 data URL for PDFs/images if R2 fails
        if (category === "pdf" || category === "thumbnail" || category === "image") {
          key = `data:${file.type || "application/pdf"};base64,${buffer.toString("base64")}`;
        } else {
          return NextResponse.json(
            { success: false, error: "Cloudflare R2 storage error. Please verify R2 credentials in environment variables." },
            { status: 500 }
          );
        }
      }
    } else {
      // If R2 is not configured: store PDF/image as base64 data URI for instant zero-config availability
      if (category === "pdf" || category === "thumbnail" || category === "image") {
        key = `data:${file.type || "application/pdf"};base64,${buffer.toString("base64")}`;
      } else {
        key = `demo-video-${uniqueId}.${ext}`;
      }
    }

    // If lessonId is present, auto-update lesson record
    if (lessonId) {
      try {
        if (category === "pdf") {
          await prisma.lesson.update({
            where: { id: lessonId },
            data: { pdfKey: key },
          });
        } else if (category === "video") {
          await prisma.lesson.update({
            where: { id: lessonId },
            data: { videoKey: key },
          });
        }
      } catch (dbErr) {
        console.warn("Could not auto-update lesson record:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      key,
      filename,
      category,
      message: `${filename} uploaded successfully!`,
    });
  } catch (error: unknown) {
    console.error("Upload API Error:", error);
    const msg = error instanceof Error ? error.message : "Internal upload server error";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
