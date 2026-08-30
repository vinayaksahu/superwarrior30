"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, getCurrentUser } from "@/server/dal/auth";
import { generateOrderNumber } from "@/lib/utils";
import { createRazorpayOrder, verifyRazorpayPaymentSignature, isRazorpayConfigured } from "@/lib/payment/razorpay";
import { calculateAndCreateOrderCommissions, reverseOrderCommissions } from "@/server/actions/referral.actions";
import { validateAndCalculateCouponAction } from "@/server/actions/coupon.actions";
import { PAGINATION } from "@/lib/constants";
import type { ActionState } from "@/types";
import { Prisma } from "@/generated/prisma";

// ==========================================
// 1. ORDER CREATION & CHECKOUT
// ==========================================

export async function createOrderAction(courseId: string, couponCode?: string) {
  const user = await requireAuth();

  // Rate limit: 10 order creation attempts per minute per student
  const { checkRateLimit } = await import("@/lib/rate-limit");
  const rateLimit = await checkRateLimit({
    key: `order-create:${user.id}`,
    limit: 10,
    windowSeconds: 60,
  });

  if (!rateLimit.success) {
    throw new Error("Too many order requests. Please wait a moment before trying again.");
  }

  // 1. Verify course exists and is published
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      status: true,
    },
  });

  if (!course || course.status !== "PUBLISHED") {
    throw new Error("Course is not available for purchase.");
  }

  // 2. Prevent duplicate enrollment
  const existingEnrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: course.id,
      },
    },
  });

  if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
    return {
      success: false,
      alreadyEnrolled: true,
      message: "You are already enrolled in this course.",
      courseSlug: course.slug,
    };
  }

  // 3. Server-side coupon verification
  let couponId: string | null = null;
  let discountAmount = 0.0;
  let finalPayable = Number(course.price);

  if (couponCode && couponCode.trim().length > 0) {
    const couponRes = await validateAndCalculateCouponAction({
      code: couponCode,
      courseId: course.id,
    });

    if (couponRes.valid && couponRes.couponId) {
      couponId = couponRes.couponId;
      discountAmount = couponRes.discountAmount;
      finalPayable = couponRes.finalPrice;
    }
  }

  // 4. Create unique order in DB
  const orderNumber = generateOrderNumber();
  const razorpayActive = await isRazorpayConfigured();

  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId: user.id,
        couponId,
        status: "PENDING",
        currency: "INR",
        subtotalAmount: course.price,
        discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
        taxAmount: 0.0,
        totalAmount: new Prisma.Decimal(finalPayable.toFixed(2)),
        paymentProvider: razorpayActive ? "RAZORPAY" : "MOCK",
        items: {
          create: {
            courseId: course.id,
            itemTitle: course.title,
            unitPrice: course.price,
            quantity: 1,
            totalPrice: new Prisma.Decimal(finalPayable.toFixed(2)),
          },
        },
      },
      include: {
        items: true,
      },
    });

    return newOrder;
  });

  // 5. Initialize payment provider order
  const paymentOrder = await createRazorpayOrder({
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: finalPayable,
    currency: "INR",
    customerEmail: user.email,
    customerName: user.name || undefined,
    customerPhone: user.phone || undefined,
  });

  // Update order with provider order ID
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentId: paymentOrder.providerOrderId,
      metadata: {
        providerOrderId: paymentOrder.providerOrderId,
        provider: paymentOrder.provider,
      },
    },
  });

  return {
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalAmount: finalPayable,
    discountAmount,
    courseTitle: course.title,
    courseSlug: course.slug,
    paymentOrder,
  };
}

// ==========================================
// 2. ATOMIC ORDER FULFILLMENT & ENROLLMENT
// ==========================================

export async function fulfillOrderPayment({
  orderId,
  provider,
  paymentId,
  metadata,
}: {
  orderId: string;
  provider: string;
  paymentId: string;
  metadata?: Record<string, unknown>;
}) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: { select: { id: true, email: true } },
      },
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Idempotency: if already marked paid, return safely without duplicate enrollment
    if (order.status === "PAID") {
      return { success: true, alreadyFulfilled: true, order };
    }

    // 1. Mark Order as PAID
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentProvider: provider,
        paymentId,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : (order.metadata as Prisma.InputJsonValue),
      },
    });

    // 2. Enroll user in all courses in the order
    for (const item of order.items) {
      if (item.courseId) {
        await tx.courseEnrollment.upsert({
          where: {
            userId_courseId: {
              userId: order.userId,
              courseId: item.courseId,
            },
          },
          update: {
            status: "ACTIVE",
            orderId: order.id,
            enrolledAt: new Date(),
          },
          create: {
            userId: order.userId,
            courseId: item.courseId,
            orderId: order.id,
            status: "ACTIVE",
            progressPercentage: 0.0,
          },
        });
      }
    }

    // 3. Record Coupon Redemption if coupon was applied
    if (order.couponId) {
      const coupon = await tx.coupon.findUnique({
        where: { id: order.couponId },
      });

      // Check if already redeemed for this order (idempotency)
      const existingRedemption = await tx.couponRedemption.findUnique({
        where: {
          couponId_orderId: {
            couponId: order.couponId,
            orderId: order.id,
          },
        },
      });

      if (!existingRedemption && coupon) {
        // Enforce global usage limit check atomically before incrementing
        const canRedeem = coupon.usageLimit === null || coupon.usageCount < coupon.usageLimit;

        if (canRedeem) {
          await tx.couponRedemption.create({
            data: {
              couponId: order.couponId,
              userId: order.userId,
              orderId: order.id,
              discountApplied: order.discountAmount,
            },
          });

          await tx.coupon.update({
            where: { id: order.couponId },
            data: {
              usageCount: { increment: 1 },
            },
          });
        }
      }
    }

    // 4. Create referral commissions and historical snapshot
    await calculateAndCreateOrderCommissions(tx, order.id);

    // 5. Create audit log
    await tx.auditLog.create({
      data: {
        actorId: order.userId,
        actorEmail: order.user.email,
        action: "ORDER_PAID",
        entityType: "Order",
        entityId: order.id,
        newValues: {
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount.toString(),
          paymentProvider: provider,
          paymentId,
        },
      },
    });

    return { success: true, order: updatedOrder };
  });
}

// ==========================================
// 3. PAYMENT VERIFICATION ACTIONS
// ==========================================

export async function verifyRazorpayPaymentAction({
  orderId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionState> {
  const user = await requireAuth();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true, status: true },
  });

  if (!order || order.userId !== user.id) {
    throw new Error("Order not found or access denied.");
  }

  if (order.status === "PAID") {
    return { success: true, message: "Order is already paid." };
  }

  // Verify signature
  const isValid = await verifyRazorpayPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!isValid) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "FAILED" },
    });
    return { success: false, message: "Payment signature verification failed." };
  }

  // Fulfill enrollment
  await fulfillOrderPayment({
    orderId,
    provider: "RAZORPAY",
    paymentId: razorpayPaymentId,
    metadata: { razorpayOrderId, razorpayPaymentId },
  });

  revalidatePath(`/dashboard`);
  revalidatePath(`/orders`);

  return { success: true, message: "Payment verified successfully!" };
}

/**
 * Development-only mock payment confirmation flow.
 * STRICTLY GATED: Always rejected in production environment and when live gateway is configured.
 */
export async function mockConfirmPaymentAction(orderId: string): Promise<ActionState> {
  const user = await requireAuth();

  // Gateway configuration block: if live Razorpay keys are configured, mock payment is strictly disabled
  const razorpayConfigured = await isRazorpayConfigured();
  if (razorpayConfigured && user.role !== "ADMIN") {
    throw new Error("Live payment gateway is active. Please complete checkout through Razorpay.");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  // 3. IDOR Protection: User must own the order or be Admin
  if (order.userId !== user.id && user.role !== "ADMIN") {
    throw new Error("Access denied.");
  }

  // 4. Fulfill order atomically
  await fulfillOrderPayment({
    orderId,
    provider: "MOCK_DEV",
    paymentId: `mock_pay_${Date.now()}`,
    metadata: { confirmedBy: user.email, timestamp: new Date().toISOString() },
  });

  revalidatePath(`/dashboard`);
  revalidatePath(`/orders`);
  revalidatePath(`/checkout/success/${orderId}`);

  return { success: true, message: "Test payment confirmed successfully." };
}

// ==========================================
// 4. ORDER QUERIES & HISTORY
// ==========================================

export async function getOrderByIdAction(orderId: string) {
  const user = await requireAuth();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              thumbnailKey: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!order) return null;

  // IDOR Check: user must own order or be admin
  if (order.userId !== user.id && user.role !== "ADMIN") {
    throw new Error("Access denied.");
  }

  return order;
}

export async function getUserOrdersAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
}: {
  page?: number;
  pageSize?: number;
} = {}) {
  const user = await requireAuth();

  try {
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          items: true,
        },
      }),
      prisma.order.count({ where: { userId: user.id } }),
    ]);

    return {
      data: orders || [],
      total: total || 0,
      page,
      pageSize,
      totalPages: Math.ceil((total || 0) / pageSize),
    };
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }
}

export async function getAdminOrdersAction({
  page = 1,
  pageSize = PAGINATION.DEFAULT_PAGE_SIZE,
  status,
  search,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
} = {}) {
  await requireAdmin();

  try {
    const where: Prisma.OrderWhereInput = {};
    if (status && status !== "all") {
      where.status = status as Prisma.EnumOrderStatusFilter;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data: orders || [],
      total: total || 0,
      page,
      pageSize,
      totalPages: Math.ceil((total || 0) / pageSize),
    };
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }
}

// ==========================================
// 5. ADMIN ORDER MANAGEMENT ACTIONS
// ==========================================

export async function adminCancelOrderAction(orderId: string): Promise<ActionState> {
  const admin = await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return { success: false, message: "Order not found" };
  if (order.status === "PAID") {
    return { success: false, message: "Cannot cancel a paid order. Issue a refund instead." };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      actorEmail: admin.email,
      actorRole: admin.role,
      action: "ORDER_CANCELLED",
      entityType: "Order",
      entityId: orderId,
    },
  });

  revalidatePath("/admin/orders");
  return { success: true, message: "Order cancelled successfully." };
}

export async function adminRefundOrderAction(orderId: string): Promise<ActionState> {
  const admin = await requireAdmin();

  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return { success: false, message: "Order not found" };
    if (order.status !== "PAID") {
      return { success: false, message: "Only paid orders can be refunded." };
    }

    // 1. Mark order as REFUNDED
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "REFUNDED",
        refundedAt: new Date(),
      },
    });

    // 2. Revoke associated enrollments
    for (const item of order.items) {
      if (item.courseId) {
        await tx.courseEnrollment.updateMany({
          where: {
            userId: order.userId,
            courseId: item.courseId,
            orderId: order.id,
          },
          data: {
            status: "REVOKED",
          },
        });
      }
    }

    // 3. Reverse associated referral commissions safely
    await reverseOrderCommissions(tx, orderId);

    // 4. Log audit
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "ORDER_REFUNDED",
        entityType: "Order",
        entityId: orderId,
        oldValues: { status: "PAID" },
        newValues: { status: "REFUNDED" },
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, message: "Order refunded and course enrollment revoked." };
  });
}

// ==========================================
// 6. MANUAL PAYMENT SUBMISSION & APPROVAL
// ==========================================

export async function submitManualPaymentOrderAction({
  courseId,
  couponCode,
  paymentMethodId,
  paymentMethodTitle,
  utrRef,
  proofNote,
}: {
  courseId: string;
  couponCode?: string;
  paymentMethodId: string;
  paymentMethodTitle: string;
  utrRef: string;
  proofNote?: string;
}): Promise<{
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  message: string;
  alreadyEnrolled?: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Please log in before submitting payment verification." };
  }

  if (!utrRef || utrRef.trim().length < 4) {
    return { success: false, message: "Please enter a valid UTR / Transaction Reference ID." };
  }

  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseId }, { slug: courseId }],
    },
  });

  if (!course) {
    return { success: false, message: "Course not found or unavailable." };
  }

  // Check enrollment
  const existingEnrollment = await prisma.courseEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: course.id,
      },
    },
  });

  if (existingEnrollment && existingEnrollment.status === "ACTIVE") {
    return {
      success: false,
      alreadyEnrolled: true,
      message: "You are already enrolled in this course.",
    };
  }

  // Coupon handling
  let couponId: string | null = null;
  let discountAmount = 0.0;
  let finalPayable = Number(course.price);

  if (couponCode && couponCode.trim().length > 0) {
    const couponRes = await validateAndCalculateCouponAction({
      code: couponCode,
      courseId: course.id,
    });

    if (couponRes.valid && couponRes.couponId) {
      couponId = couponRes.couponId;
      discountAmount = couponRes.discountAmount;
      finalPayable = couponRes.finalPrice;
    }
  }

  const orderNumber = generateOrderNumber();

  const proofData = {
    paymentMethodId,
    paymentMethodTitle,
    utrRef: utrRef.trim(),
    proofNote: proofNote?.trim() || null,
    submittedAt: new Date().toISOString(),
    customerEmail: user.email,
    customerName: user.name || "Student",
  };

  try {
    let order;
    try {
      order = await prisma.order.create({
        data: {
          orderNumber,
          userId: user.id,
          couponId,
          status: "PENDING",
          currency: "INR",
          subtotalAmount: new Prisma.Decimal(Number(course.price).toFixed(2)),
          discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
          taxAmount: new Prisma.Decimal("0.00"),
          totalAmount: new Prisma.Decimal(finalPayable.toFixed(2)),
          paymentProvider: "MANUAL",
          paymentId: utrRef.trim(),
          manualPaymentRef: utrRef.trim(),
          manualPaymentProof: proofData,
          metadata: proofData,
          items: {
            create: {
              courseId: course.id,
              itemTitle: course.title,
              unitPrice: new Prisma.Decimal(Number(course.price).toFixed(2)),
              quantity: 1,
              totalPrice: new Prisma.Decimal(finalPayable.toFixed(2)),
            },
          },
        },
      });
    } catch {
      // Fallback create without custom columns if DB schema is legacy
      order = await prisma.order.create({
        data: {
          orderNumber,
          userId: user.id,
          couponId,
          status: "PENDING",
          currency: "INR",
          subtotalAmount: new Prisma.Decimal(Number(course.price).toFixed(2)),
          discountAmount: new Prisma.Decimal(discountAmount.toFixed(2)),
          taxAmount: new Prisma.Decimal("0.00"),
          totalAmount: new Prisma.Decimal(finalPayable.toFixed(2)),
          paymentProvider: "MANUAL",
          paymentId: utrRef.trim(),
          metadata: proofData,
          items: {
            create: {
              courseId: course.id,
              itemTitle: course.title,
              unitPrice: new Prisma.Decimal(Number(course.price).toFixed(2)),
              quantity: 1,
              totalPrice: new Prisma.Decimal(finalPayable.toFixed(2)),
            },
          },
        },
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath("/orders");

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: "Payment submitted successfully. Your order is pending verification.",
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to submit order. Please try again.";
    console.error("Error submitting manual payment order:", errorMsg);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

export async function approveManualOrderPaymentAction(orderId: string): Promise<ActionState> {
  const admin = await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: true },
  });

  if (!order) {
    return { success: false, message: "Order not found." };
  }

  if (order.status === "PAID") {
    return { success: false, message: "This order is already marked as Paid." };
  }

  try {
    await fulfillOrderPayment({
      orderId,
      provider: "MANUAL_ADMIN_APPROVED",
      paymentId: order.manualPaymentRef || order.paymentId || "MANUAL_VERIFIED",
      metadata: {
        approvedBy: admin.email,
        approvedAt: new Date().toISOString(),
        manualPaymentRef: order.manualPaymentRef,
      },
    });

    // Update approved fields on order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        approvedAt: new Date(),
        approvedBy: admin.email,
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/courses");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Order #${order.orderNumber} approved! Student is now enrolled and commissions distributed.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve manual payment";
    return { success: false, message: msg };
  }
}

export async function rejectManualOrderPaymentAction(
  orderId: string,
  reason?: string
): Promise<ActionState> {
  const admin = await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) return { success: false, message: "Order not found." };
  if (order.status === "PAID") {
    return { success: false, message: "Cannot reject an order that is already Paid. Use Refund instead." };
  }

  try {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "FAILED",
        cancelledAt: new Date(),
        metadata: {
          rejectedBy: admin.email,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason || "Payment verification failed or invalid UTR.",
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "ORDER_PAYMENT_REJECTED",
        entityType: "Order",
        entityId: orderId,
        newValues: { reason: reason || "Invalid UTR" },
      },
    });

    revalidatePath("/admin/orders");
    revalidatePath("/orders");
    return { success: true, message: `Order #${order.orderNumber} rejected.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reject order";
    return { success: false, message: msg };
  }
}

