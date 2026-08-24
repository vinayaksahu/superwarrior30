import { z } from "zod";

export const withdrawalRequestSchema = z.object({
  amount: z.coerce
    .number()
    .min(500, "Minimum withdrawal amount is ₹500")
    .max(500000, "Maximum withdrawal per request is ₹5,00,000"),
  paymentMethod: z.enum(["upi", "bank_transfer"]),
  upiId: z
    .string()
    .regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI ID format (e.g. user@okhdfcbank)")
    .optional()
    .or(z.literal("")),
  accountHolderName: z.string().max(100).optional().or(z.literal("")),
  accountNumber: z.string().max(30).optional().or(z.literal("")),
  ifscCode: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid Indian IFSC Code format (e.g. HDFC0001234)")
    .optional()
    .or(z.literal("")),
  bankName: z.string().max(100).optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.paymentMethod === "upi") {
      return Boolean(data.upiId && data.upiId.trim().length > 0);
    }
    if (data.paymentMethod === "bank_transfer") {
      return (
        Boolean(data.accountHolderName && data.accountHolderName.trim().length > 0) &&
        Boolean(data.accountNumber && data.accountNumber.trim().length > 0) &&
        Boolean(data.ifscCode && data.ifscCode.trim().length > 0) &&
        Boolean(data.bankName && data.bankName.trim().length > 0)
      );
    }
    return true;
  },
  {
    message: "Please complete all required fields for the selected payout method.",
    path: ["paymentMethod"],
  }
);

export const adminWithdrawalActionSchema = z.object({
  withdrawalId: z.string().min(1, "Withdrawal ID is required"),
  action: z.enum(["approve", "reject", "complete"]),
  adminNote: z.string().max(500).optional(),
  transactionRef: z.string().max(100).optional(),
});

export const adminWalletAdjustmentSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.enum(["CREDIT", "DEBIT"]),
  amount: z.coerce.number().positive("Adjustment amount must be positive"),
  reason: z.string().min(5, "Reason is required (min 5 characters)").max(500),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
export type AdminWithdrawalActionInput = z.infer<typeof adminWithdrawalActionSchema>;
export type AdminWalletAdjustmentInput = z.infer<typeof adminWalletAdjustmentSchema>;
