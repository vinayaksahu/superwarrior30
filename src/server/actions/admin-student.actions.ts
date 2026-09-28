"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { hashPassword } from "@/lib/auth/password";
import { generateReferralCode, generateOrderNumber } from "@/lib/utils";
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

// 1.5 Validate Referrer by code or email
export async function adminValidateReferrerAction(query: string) {
  await requireAdmin();

  const clean = query.trim();
  if (!clean) return { success: false, error: "Please enter a referral code or email." };

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { referralCode: { equals: clean, mode: "insensitive" } },
        { email: { equals: clean.toLowerCase(), mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      role: true,
    },
  });

  // If query is "SW30" or "SUPERADMIN" and not matched directly, find Super Admin
  if (!user && (clean.toUpperCase() === "SW30" || clean.toUpperCase() === "SUPERADMIN")) {
    user = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        role: true,
      },
    });
  }

  if (!user) {
    return { success: false, error: `No user found matching "${clean}".` };
  }

  return {
    success: true,
    referrer: user,
  };
}

// 2. Create a new Student account manually by Admin
export async function adminCreateStudentAction(data: {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  assignedCourseIds?: string[];
  referralType?: "DIRECT_ADMIN" | "OTHER_STUDENT" | "NONE";
  referrerCodeOrEmail?: string;
  courseFeeCollected?: number;
  paymentMode?: string;
  paymentNotes?: string;
}) {
  const admin = await requireAdmin();

  const cleanName = data.name.trim();
  const cleanEmail = data.email.toLowerCase().trim();
  const cleanPhone = data.phone ? data.phone.trim() : null;
  const referralType = data.referralType || "DIRECT_ADMIN";
  const feeAmount = Math.max(0, Number(data.courseFeeCollected || 0));

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

  // Resolve referrer
  let resolvedReferrer: { id: string; name: string | null; email: string; referralCode: string } | null = null;

  if (referralType === "DIRECT_ADMIN") {
    // Direct Admin / Super Warrior 30 (SW30)
    const adminUser =
      (await prisma.user.findFirst({
        where: { role: "SUPER_ADMIN" },
        select: { id: true, name: true, email: true, referralCode: true },
      })) ||
      (await prisma.user.findFirst({
        where: { role: "ADMIN" },
        select: { id: true, name: true, email: true, referralCode: true },
      }));
    if (adminUser) {
      resolvedReferrer = adminUser;
    }
  } else if (referralType === "OTHER_STUDENT") {
    const q = (data.referrerCodeOrEmail || "").trim();
    if (!q) {
      return { success: false, error: "Please enter the referrer code or student email." };
    }
    const refUser = await prisma.user.findFirst({
      where: {
        OR: [
          { referralCode: { equals: q, mode: "insensitive" } },
          { email: { equals: q.toLowerCase(), mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, referralCode: true },
    });

    if (!refUser) {
      return { success: false, error: `Referrer with code or email "${q}" not found.` };
    }
    resolvedReferrer = refUser;
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
    const { user: student, order: createdOrder } = await prisma.$transaction(async (tx) => {
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

      // 3. Optional: Create Paid Order if course fee was collected
      let orderRecord: any = null;
      const assignedIds = data.assignedCourseIds || [];

      if (feeAmount > 0) {
        const orderNumber = generateOrderNumber();
        const paymentModeStr = data.paymentMode || "Cash/UPI";
        const paymentRef = `${paymentModeStr}${data.paymentNotes ? ` - ${data.paymentNotes.trim()}` : ""}`;

        orderRecord = await tx.order.create({
          data: {
            orderNumber,
            userId: user.id,
            status: "PAID",
            currency: "INR",
            subtotalAmount: feeAmount,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: feeAmount,
            paymentProvider: "MANUAL_ADMIN",
            manualPaymentRef: paymentRef,
            paidAt: new Date(),
            approvedAt: new Date(),
            approvedBy: admin.email,
            isTestData: false,
          },
        });

        // Create Order Items
        if (assignedIds.length > 0) {
          const courses = await tx.course.findMany({
            where: { id: { in: assignedIds } },
            select: { id: true, title: true },
          });
          const splitPrice = Number((feeAmount / (courses.length || 1)).toFixed(2));
          for (const c of courses) {
            await tx.orderItem.create({
              data: {
                orderId: orderRecord.id,
                courseId: c.id,
                itemTitle: c.title,
                unitPrice: splitPrice,
                quantity: 1,
                totalPrice: splitPrice,
                isTestData: false,
              },
            });
          }
        } else {
          await tx.orderItem.create({
            data: {
              orderId: orderRecord.id,
              courseId: null,
              itemTitle: "Super Warrior 30 Admission / Course Fee",
              unitPrice: feeAmount,
              quantity: 1,
              totalPrice: feeAmount,
              isTestData: false,
            },
          });
        }
      }

      // 4. Assign initial courses if selected
      if (assignedIds.length > 0) {
        for (const courseId of assignedIds) {
          await tx.courseEnrollment.create({
            data: {
              userId: user.id,
              courseId,
              orderId: orderRecord?.id || null,
              status: "ACTIVE",
              progressPercentage: 0,
              isTestData: false,
              enrolledAt: new Date(),
            },
          });
        }
      }

      // 4. Create referral relationship and closure
      if (resolvedReferrer && resolvedReferrer.id !== user.id) {
        await tx.referralRelationship.create({
          data: {
            referrerId: resolvedReferrer.id,
            referredId: user.id,
            isTestData: false,
          },
        });

        await tx.referralClosure.create({
          data: {
            ancestorId: resolvedReferrer.id,
            descendantId: user.id,
            depth: 1,
            isTestData: false,
          },
        });

        const uplineAncestors = await tx.referralClosure.findMany({
          where: { descendantId: resolvedReferrer.id },
        });

        if (uplineAncestors.length > 0) {
          await tx.referralClosure.createMany({
            data: uplineAncestors.map((anc) => ({
              ancestorId: anc.ancestorId,
              descendantId: user.id,
              depth: anc.depth + 1,
              isTestData: false,
            })),
          });
        }
      }

      // 5. Audit Log
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
            referralType,
            feeAmount,
            paymentMode: data.paymentMode || null,
            orderNumber: orderRecord?.orderNumber || null,
            referrerInfo: resolvedReferrer
              ? `${resolvedReferrer.name || resolvedReferrer.email} (${resolvedReferrer.referralCode})`
              : "None",
          },
        },
      });

      return { user, order: orderRecord };
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");

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
        feeCollected: feeAmount,
        paymentMode: data.paymentMode || "Cash/UPI",
        orderNumber: createdOrder?.orderNumber || null,
        referrer: resolvedReferrer
          ? {
              name: resolvedReferrer.name,
              email: resolvedReferrer.email,
              referralCode: resolvedReferrer.referralCode,
            }
          : null,
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

// 7. Get Student Course Fee & Payment Details
export async function adminGetStudentFeeDetailsAction(studentId: string) {
  await requireAdmin();

  const [student, orders, enrollments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true },
    }),
    prisma.order.findMany({
      where: { userId: studentId, status: "PAID" },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        paymentProvider: true,
        manualPaymentRef: true,
        paidAt: true,
        createdAt: true,
        items: { select: { itemTitle: true, totalPrice: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.courseEnrollment.findMany({
      where: { userId: studentId, status: "ACTIVE" },
      include: { course: { select: { id: true, title: true, price: true } } },
    }),
  ]);

  if (!student) throw new Error("Student not found.");

  const totalFeeCollected = orders.reduce(
    (sum, o) => sum + Number(o.totalAmount || 0),
    0
  );

  return {
    student,
    totalFeeCollected,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      totalAmount: Number(o.totalAmount || 0),
      paymentProvider: o.paymentProvider || "MANUAL_ADMIN",
      paymentRef: o.manualPaymentRef || "",
      paidAt: o.paidAt || o.createdAt,
      items: o.items.map((i) => ({
        title: i.itemTitle,
        price: Number(i.totalPrice || 0),
      })),
    })),
    enrolledCourses: enrollments.map((e) => ({
      id: e.course.id,
      title: e.course.title,
      catalogPrice: Number(e.course.price || 0),
    })),
  };
}

// 8. Update or Record Student Course Fee Collected
export async function adminUpdateStudentFeeAction(data: {
  studentId: string;
  amount: number;
  paymentMode?: string;
  notes?: string;
}) {
  const admin = await requireAdmin();

  const student = await prisma.user.findUnique({
    where: { id: data.studentId },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: { course: true },
      },
      orders: {
        where: { status: "PAID" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) return { success: false, error: "Student not found." };

  const targetAmount = Math.max(0, Number(data.amount || 0));
  const paymentMode = data.paymentMode || "Cash/UPI";
  const paymentRef = `${paymentMode}${data.notes ? ` - ${data.notes.trim()}` : ""}`;

  try {
    await prisma.$transaction(async (tx) => {
      // Find latest manual order or any paid order
      const manualOrder =
        student.orders.find(
          (o) =>
            o.paymentProvider === "MANUAL_ADMIN" ||
            o.paymentProvider?.includes("Cash") ||
            o.paymentProvider?.includes("UPI")
        ) || student.orders[0];

      if (manualOrder) {
        // Update existing order amount & reference
        await tx.order.update({
          where: { id: manualOrder.id },
          data: {
            subtotalAmount: targetAmount,
            totalAmount: targetAmount,
            paymentProvider: "MANUAL_ADMIN",
            manualPaymentRef: paymentRef,
            approvedBy: admin.email,
            updatedAt: new Date(),
          },
        });

        // Refresh items snapshot
        await tx.orderItem.deleteMany({ where: { orderId: manualOrder.id } });
        if (student.enrollments.length > 0) {
          const split = Number((targetAmount / student.enrollments.length).toFixed(2));
          for (const en of student.enrollments) {
            await tx.orderItem.create({
              data: {
                orderId: manualOrder.id,
                courseId: en.courseId,
                itemTitle: en.course.title,
                unitPrice: split,
                quantity: 1,
                totalPrice: split,
                isTestData: false,
              },
            });
          }
        } else {
          await tx.orderItem.create({
            data: {
              orderId: manualOrder.id,
              courseId: null,
              itemTitle: "Super Warrior 30 Course Fee",
              unitPrice: targetAmount,
              quantity: 1,
              totalPrice: targetAmount,
              isTestData: false,
            },
          });
        }
      } else if (targetAmount > 0) {
        // Create new paid order for the student
        const orderNumber = generateOrderNumber();
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: student.id,
            status: "PAID",
            currency: "INR",
            subtotalAmount: targetAmount,
            discountAmount: 0,
            taxAmount: 0,
            totalAmount: targetAmount,
            paymentProvider: "MANUAL_ADMIN",
            manualPaymentRef: paymentRef,
            paidAt: new Date(),
            approvedAt: new Date(),
            approvedBy: admin.email,
            isTestData: false,
          },
        });

        if (student.enrollments.length > 0) {
          const split = Number((targetAmount / student.enrollments.length).toFixed(2));
          for (const en of student.enrollments) {
            await tx.orderItem.create({
              data: {
                orderId: newOrder.id,
                courseId: en.courseId,
                itemTitle: en.course.title,
                unitPrice: split,
                quantity: 1,
                totalPrice: split,
                isTestData: false,
              },
            });
            await tx.courseEnrollment.update({
              where: { id: en.id },
              data: { orderId: newOrder.id },
            });
          }
        } else {
          await tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              courseId: null,
              itemTitle: "Super Warrior 30 Course Fee",
              unitPrice: targetAmount,
              quantity: 1,
              totalPrice: targetAmount,
              isTestData: false,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorEmail: admin.email,
          actorRole: admin.role,
          action: "STUDENT_FEE_COLLECTION_UPDATED",
          entityType: "Order",
          entityId: manualOrder?.id || student.id,
          newValues: {
            studentEmail: student.email,
            feeAmount: targetAmount,
            paymentMode,
            notes: data.notes || null,
          },
        },
      });
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin");
    revalidatePath("/admin/orders");

    return {
      success: true,
      message: `Course fee collection updated to ₹${targetAmount.toLocaleString("en-IN")} for ${student.name || student.email}.`,
    };
  } catch (error) {
    console.error("[adminUpdateStudentFeeAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update course fee.",
    };
  }
}
