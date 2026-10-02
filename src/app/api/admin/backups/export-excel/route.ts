import { NextResponse } from "next/server";
import { exportFullDatabaseBackupAction } from "@/server/actions/database-backup.actions";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await exportFullDatabaseBackupAction();

    if (!result.success || !result.backup) {
      return NextResponse.json(
        { error: result.error || "Failed to generate backup export" },
        { status: 500 }
      );
    }

    const d = result.backup.data;
    const wb = XLSX.utils.book_new();

    // 1. Users Sheet
    const usersData = (d.users || []).map((u: any) => ({
      ID: u.id,
      Name: u.name || "",
      Email: u.email,
      Phone: u.phone || "",
      Role: u.role || "STUDENT",
      AdminRole: u.adminRole || "",
      Status: u.status || "ACTIVE",
      ReferralCode: u.referralCode || "",
      PasswordHash: u.passwordHash,
      CreatedAt: u.createdAt || "",
    }));
    const usersSheet = XLSX.utils.json_to_sheet(usersData);
    XLSX.utils.book_append_sheet(wb, usersSheet, "Users");

    // 2. Courses Sheet
    const coursesData = (d.courses || []).map((c: any) => ({
      ID: c.id,
      Title: c.title,
      Slug: c.slug,
      Price: c.price,
      CompareAtPrice: c.compareAtPrice || "",
      Status: c.status || "PUBLISHED",
      Featured: c.isFeatured ? "YES" : "NO",
      Difficulty: c.difficulty || "BEGINNER",
      DurationSec: c.totalDuration || 0,
      CreatedAt: c.createdAt || "",
    }));
    const coursesSheet = XLSX.utils.json_to_sheet(coursesData);
    XLSX.utils.book_append_sheet(wb, coursesSheet, "Courses");

    // 3. Curriculum Sheet (Modules + Lessons)
    const curriculumData: any[] = [];
    (d.modules || []).forEach((m: any) => {
      curriculumData.push({
        Type: "MODULE",
        ID: m.id,
        CourseID: m.courseId,
        ModuleID: "",
        Title: m.title,
        Slug: "",
        Position: m.position,
        ContentType: "",
        DurationSec: 0,
        VideoKey: "",
        BunnyVideoId: "",
      });
    });
    (d.lessons || []).forEach((l: any) => {
      curriculumData.push({
        Type: "LESSON",
        ID: l.id,
        CourseID: "",
        ModuleID: l.moduleId,
        Title: l.title,
        Slug: l.slug,
        Position: l.position,
        ContentType: l.contentType || "VIDEO",
        DurationSec: l.durationSec || 0,
        VideoKey: l.videoKey || "",
        BunnyVideoId: l.bunnyVideoId || "",
      });
    });
    const curriculumSheet = XLSX.utils.json_to_sheet(curriculumData);
    XLSX.utils.book_append_sheet(wb, curriculumSheet, "Curriculum");

    // 4. Orders Sheet
    const ordersData = (d.orders || []).map((o: any) => ({
      ID: o.id,
      OrderNumber: o.orderNumber,
      UserID: o.userId,
      Status: o.status,
      Currency: o.currency || "INR",
      Subtotal: o.subtotalAmount,
      Discount: o.discountAmount || 0,
      Total: o.totalAmount,
      PaymentProvider: o.paymentProvider || "",
      GatewayOrderId: o.gatewayOrderId || "",
      PaymentID: o.paymentId || "",
      ManualRef: o.manualPaymentRef || "",
      PaidAt: o.paidAt || "",
      CreatedAt: o.createdAt || "",
    }));
    const ordersSheet = XLSX.utils.json_to_sheet(ordersData);
    XLSX.utils.book_append_sheet(wb, ordersSheet, "Orders");

    // 5. Enrollments Sheet
    const enrollmentsData = (d.courseEnrollments || []).map((e: any) => ({
      ID: e.id,
      UserID: e.userId,
      CourseID: e.courseId,
      OrderID: e.orderId || "",
      Status: e.status || "ACTIVE",
      ProgressPercent: e.progressPercentage || 0,
      EnrolledAt: e.enrolledAt || "",
      CompletedAt: e.completedAt || "",
    }));
    const enrollmentsSheet = XLSX.utils.json_to_sheet(enrollmentsData);
    XLSX.utils.book_append_sheet(wb, enrollmentsSheet, "Enrollments");

    // 6. Wallets Sheet
    const walletsData = (d.wallets || []).map((w: any) => ({
      ID: w.id,
      UserID: w.userId,
      AvailableBalance: w.availableBalance || 0,
      PendingBalance: w.pendingBalance || 0,
      TotalEarned: w.totalEarned || 0,
      TotalWithdrawn: w.totalWithdrawn || 0,
    }));
    const walletsSheet = XLSX.utils.json_to_sheet(walletsData);
    XLSX.utils.book_append_sheet(wb, walletsSheet, "Wallets");

    // 7. SiteSettings Sheet
    const settingsData = (d.siteSettings || []).map((s: any) => ({
      ID: s.id,
      Key: s.key,
      Value: s.value,
      Type: s.type || "string",
      UpdatedAt: s.updatedAt || "",
    }));
    const settingsSheet = XLSX.utils.json_to_sheet(settingsData);
    XLSX.utils.book_append_sheet(wb, settingsSheet, "Settings");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `superwarrior30_excel_backup_${timestamp}.xlsx`;

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("API Excel export route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error exporting Excel backup" },
      { status: 500 }
    );
  }
}
