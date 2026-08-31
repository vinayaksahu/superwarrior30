import { z } from "zod";

export const referralLevelItemSchema = z.object({
  id: z.string().optional(),
  level: z.coerce.number().int().min(1, "Level must be at least 1").max(20, "Level cannot exceed 20"),
  commissionPercentage: z.coerce
    .number()
    .min(0, "Commission cannot be negative")
    .max(100, "Commission cannot exceed 100%"),
  isEnabled: z.coerce.boolean().default(true),
});

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
  isReferralDiscountEnabled: z.coerce.boolean().default(true),
  levels: z.array(referralLevelItemSchema).min(1, "At least one referral level must be defined"),
}).refine(
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
    // Check that total enabled commission doesn't exceed 100%
    const totalEnabled = data.levels
      .filter((l) => l.isEnabled)
      .reduce((sum, l) => sum + l.commissionPercentage, 0);
    return totalEnabled <= 100;
  },
  {
    message: "Total enabled commission across all levels cannot exceed 100%",
    path: ["levels"],
  }
);

export type ReferralLevelItemInput = z.infer<typeof referralLevelItemSchema>;
export type ReferralSettingsInput = z.infer<typeof referralSettingsSchema>;
