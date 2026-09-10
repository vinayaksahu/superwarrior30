import { z } from "zod";

export const referralCommissionTypeSchema = z.enum(["PERCENTAGE", "FIXED_AMOUNT"]);
export type ReferralCommissionType = z.infer<typeof referralCommissionTypeSchema>;

export const referralLevelItemSchema = z.object({
  id: z.string().optional(),
  level: z.coerce.number().int().min(1, "Level must be at least 1").max(20, "Level cannot exceed 20"),
  commissionType: referralCommissionTypeSchema.default("PERCENTAGE"),
  commissionValue: z.coerce
    .number()
    .min(0, "Commission value cannot be negative")
    .optional(),
  commissionPercentage: z.coerce
    .number()
    .min(0, "Commission cannot be negative")
    .default(0),
  isEnabled: z.coerce.boolean().default(true),
  requiresDirectReferralQualification: z.coerce.boolean().default(false),
  directReferralsRequired: z.coerce
    .number()
    .int("Direct referrals required must be an integer")
    .min(0, "Direct referrals required cannot be negative")
    .max(1000000, "Direct referrals required cannot exceed 1,000,000")
    .default(0),
}).refine(
  (data) => {
    if (data.commissionType === "PERCENTAGE") {
      const val = data.commissionValue !== undefined ? data.commissionValue : data.commissionPercentage;
      return val <= 100;
    }
    return true;
  },
  {
    message: "Percentage commission cannot exceed 100%",
    path: ["commissionValue"],
  }
);

export const referralSettingsSchema = z.object({
  isReferralEnabled: z.coerce.boolean().default(true),
  holdingPeriodDays: z.coerce
    .number()
    .int("Holding days must be an integer")
    .min(0, "Holding period cannot be negative")
    .max(365, "Holding period cannot exceed 365 days")
    .default(7),
  minWithdrawalAmount: z.coerce
    .number()
    .min(50, "Minimum withdrawal must be at least ₹50")
    .max(100000, "Cannot exceed ₹1,00,000")
    .default(500),
  referralDiscountPercentage: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%")
    .default(10),
  referralDiscountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]).default("PERCENTAGE"),
  referralDiscountValue: z.coerce
    .number()
    .min(0, "Discount cannot be negative")
    .default(10),
  isReferralDiscountEnabled: z.coerce.boolean().default(true),
  levels: z.array(referralLevelItemSchema).min(1, "At least one referral level must be defined"),
}).refine(
  (data) => {
    if (data.referralDiscountType === "PERCENTAGE") {
      const val = data.referralDiscountValue !== undefined ? data.referralDiscountValue : data.referralDiscountPercentage;
      return val <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount cannot exceed 100%",
    path: ["referralDiscountValue"],
  }
).refine(
  (data) => {
    // Check no duplicate level numbers
    const levelNumbers = data.levels.map((l) => l.level);
    const uniqueNumbers = new Set(levelNumbers);
    return uniqueNumbers.size === levelNumbers.length;
  },
  {
    message: "Level numbers must be unique",
    path: ["levels"],
  }
).refine(
  (data) => {
    // Check that total enabled percentage commission doesn't exceed 100%
    const totalPercentage = data.levels
      .filter((l) => l.isEnabled && (l.commissionType || "PERCENTAGE") === "PERCENTAGE")
      .reduce((sum, l) => sum + (l.commissionValue !== undefined ? l.commissionValue : l.commissionPercentage), 0);
    return totalPercentage <= 100;
  },
  {
    message: "Total enabled percentage commission across all levels cannot exceed 100%",
    path: ["levels"],
  }
);

export type ReferralLevelItemInput = z.infer<typeof referralLevelItemSchema>;
export type ReferralSettingsInput = z.infer<typeof referralSettingsSchema>;
