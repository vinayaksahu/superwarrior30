import { z } from "zod";

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(30, "Code must be less than 30 characters")
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, and underscores"),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: z.coerce
    .number()
    .positive("Discount value must be greater than 0"),
  minOrderAmount: z.coerce
    .number()
    .min(0, "Minimum order amount cannot be negative")
    .default(0),
  maxDiscountAmount: z.coerce
    .number()
    .positive("Maximum discount must be positive")
    .optional()
    .nullable(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  usageLimit: z.coerce
    .number()
    .int()
    .positive("Usage limit must be a positive integer")
    .optional()
    .nullable(),
  perUserLimit: z.coerce
    .number()
    .int()
    .min(1, "Per user limit must be at least 1")
    .default(1),
  isActive: z.coerce.boolean().default(true),
  courseIds: z.array(z.string()).default([]),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  },
  {
    message: "Expiry date must be after or equal to start date",
    path: ["endDate"],
  }
).refine(
  (data) => {
    if (data.discountType === "PERCENTAGE") {
      return data.discountValue <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  }
);

export const applyCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  courseId: z.string().min(1, "Course ID is required"),
});

export type CouponInput = z.infer<typeof couponSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
