"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { hashPassword } from "@/lib/auth/password";
import { generateReferralCode } from "@/lib/utils";
import crypto from "crypto";

function generateSecureRandomPassword(length = 10): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let result = "Sw30@";
  for (let i = 0; i < length - 5; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return result;
}

// 1. Get all courses available for manual assignment
export async function getAdminAvailableCoursesAction() {
  await requireAdmin();

  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      price: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return courses.map((c) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    status: c.status,
    price: Number(c.price || 0),
  }));
}

// 2. Create a new Student account manually by Admin
export async function adminCreateStudentAction(data: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  assignedCourseIds?: string[];
}) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  const cleanEmail = data.email.toLowerCase().trim();
  const cleanPhone = data.phone ? data.phone.trim() : null;

  if (!cleanName) {
    return { success: false, error: "Student name is required." };
  }

  if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
    return { success: false, error: "A valid email address is required." };
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existing) {
    return {
      success: false,
      error: `An account with email "${cleanEmail}" already exists (${existing.role}).`,
    };
  }

  // Determine password
  const plainPassword =
    data.password && data.password.trim().length >= 6
      ? data.password.trim()
      : generateSecureRandomPassword(10);

  const passwordHash = await hashPassword(plainPassword);

  // Generate unique referral code
  let newReferralCode: string;
  let codeExists = true;
  do {
    newReferralCode = generateReferralCode();
    const check = await prisma.user.findUnique({
      where: { referralCode: newReferralCode },
    });
    codeExists = !!check;
  } while (codeExists);

  try {
    const student = await prisma.$transaction(async (tx) => {
      // 1. Create student user
      const user = await tx.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          passwordHash,
          role: "STUDENT",
          status: "ACTIVE",
          referralCode: newReferralCode,
          tokenVersion: 1,
          isTestData: false,
        },
      });

      // 2. Create default wallet for student
      await tx.wallet.create({
        data: {
          userId: user.id,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
        },
      });

      // 3. Assign initial courses if selected
      const assignedIds = data.assignedCourseIds || [];
      if (assignedIds.length > 0) {
        for (const courseId of assignedIds) {
          await tx.courseEnrollment.create({
            data: {
              userId: user.id,
              courseId,
              status: "ACTIVE",
              progressPercentage: 0,
              isTestData: false,
              enrolledAt: new Date(),
            },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "STUDENT_MANUALLY_CREATED",
          entityType: "User",
          entityId: user.id,
          newValues: {
            name: cleanName,
            email: cleanEmail,
            assignedCourseIds: assignedIds,
          },
        },
      });

      return user;
    });

    revalidatePath("/admin/students");

    return {
      success: true,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        referralCode: student.referralCode,
        plainPassword,
        assignedCoursesCount: (data.assignedCourseIds || []).length,
      },
      message: "Student account created successfully!",
    };
  } catch (error) {
    console.error("[adminCreateStudentAction] Error creating student:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create student account.",
    };
  }
}

// 3. Get Student Enrollments for Courses Modal
export async function getAdminStudentEnrollmentsAction(studentId: string) {
  await requireAdmin();

  const [student, allCourses] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        email: true,
        enrollments: {
          select: {
            id: true,
            courseId: true,
            status: true,
            enrolledAt: true,
            progressPercentage: true,
          },
        },
      },
    }),
    prisma.course.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        price: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!student) {
    throw new Error("Student not found.");
  }

  const enrollmentMap = new Map(student.enrollments.map((e) => [e.courseId, e]));

  return {
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
    },
    courses: allCourses.map((c) => {
      const enrollment = enrollmentMap.get(c.id);
      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        status: c.status,
        price: Number(c.price || 0),
        isEnrolled: Boolean(enrollment && enrollment.status === "ACTIVE"),
        enrollmentId: enrollment?.id || null,
        enrolledAt: enrollment?.enrolledAt || null,
        progressPercentage: Number(enrollment?.progressPercentage || 0),
      };
    }),
  };
}

// 4. Assign Course to Student manually
export async function adminAssignCourseAction(studentId: string, courseId: string) {
  const admin = await requireAdmin();

  const [student, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { id: true, email: true, name: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true } }),
  ]);

  if (!student) return { success: false, error: "Student not found." };
  if (!course) return { success: false, error: "Course not found." };

  try {
    await prisma.courseEnrollment.upsert({
      where: {
        userId_courseId: {
          userId: studentId,
          courseId: courseId,
        },
      },
      update: {
        status: "ACTIVE",
        enrolledAt: new Date(),
      },
      create: {
        userId: studentId,
        courseId: courseId,
        status: "ACTIVE",
        progressPercentage: 0,
        isTestData: false,
        enrolledAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "COURSE_ASSIGNED_MANUALLY",
        entityType: "CourseEnrollment",
        entityId: `${studentId}_${courseId}`,
        newValues: {
          studentEmail: student.email,
          courseTitle: course.title,
        },
      },
    });

    revalidatePath("/admin/students");

    return {
      success: true,
      message: `Enrolled ${student.name || student.email} in "${course.title}" successfully.`,
    };
  } catch (error) {
    console.error("[adminAssignCourseAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign course.",
    };
  }
}

// 5. Revoke Course Access from Student
export async function adminRevokeCourseAction(studentId: string, courseId: string) {
  const admin = await requireAdmin();

  const [student, course] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId }, select: { id: true, email: true, name: true } }),
    prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true } }),
  ]);

  if (!student) return { success: false, error: "Student not found." };
  if (!course) return { success: false, error: "Course not found." };

  try {
    await prisma.courseEnrollment.deleteMany({
      where: {
        userId: studentId,
        courseId: courseId,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "COURSE_REVOKED_MANUALLY",
        entityType: "CourseEnrollment",
        entityId: `${studentId}_${courseId}`,
        newValues: {
          studentEmail: student.email,
          courseTitle: course.title,
        },
      },
    });

    revalidatePath("/admin/students");

    return {
      success: true,
      message: `Revoked access to "${course.title}" for ${student.name || student.email}.`,
    };
  } catch (error) {
    console.error("[adminRevokeCourseAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to revoke course access.",
    };
  }
}

// 6. Reset Student Password manually by Admin
export async function adminResetStudentPasswordAction(studentId: string, newPasswordInput?: string) {
  const admin = await requireAdmin();

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true },
  });

  if (!student) return { success: false, error: "Student not found." };

  const plainPassword =
    newPasswordInput && newPasswordInput.trim().length >= 6
      ? newPasswordInput.trim()
      : generateSecureRandomPassword(10);

  const passwordHash = await hashPassword(plainPassword);

  try {
    await prisma.user.update({
      where: { id: studentId },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }, // logs them out of any unauthorized old sessions
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "PASSWORD_RESET_BY_ADMIN",
        entityType: "User",
        entityId: studentId,
        newValues: {
          studentEmail: student.email,
        },
      },
    });

    return {
      success: true,
      plainPassword,
      message: `Password reset successfully for ${student.email}.`,
    };
  } catch (error) {
    console.error("[adminResetStudentPasswordAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset password.",
    };
  }
}
