"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin } from "@/server/dal/auth";
import type { ActionState } from "@/types";

export interface PaymentMethodItem {
  id: string;
  type: "UPI" | "BANK" | "CRYPTO";
  title: string;
  details: {
    upiId?: string;
    payeeName?: string;
    qrCodeUrl?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    branch?: string;
    network?: string;
    walletAddress?: string;
  };
  instructions: string | null;
  isActive: boolean;
  createdAt: Date;
}

// Fallback seed methods in case database table is initializing
const fallbackPaymentMethods: PaymentMethodItem[] = [
  {
    id: "spm_upi_001",
    type: "UPI",
    title: "GooglePay / PhonePe / Paytm UPI",
    details: {
      upiId: "superwarrior30@upi",
      payeeName: "Super Warrior 30 Mentorship",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=superwarrior30@upi&pn=SuperWarrior30",
    },
    instructions:
      "Scan the QR code or send payment to the UPI ID. After completing payment, enter the 12-digit UTR / Reference Number below.",
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "spm_crypto_001",
    type: "CRYPTO",
    title: "USDT (BEP-20 / BNB Smart Chain)",
    details: {
      network: "BEP-20 (BNB Smart Chain)",
      walletAddress: "0x45127b42b72c3357d94bc3687fe6c813a1a9e99a",
      qrCodeUrl:
        "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=0x45127b42b72c3357d94bc3687fe6c813a1a9e99a",
    },
    instructions:
      "Send exact USDT amount via BEP-20 network to the deposit address. Paste your transaction hash (TxID) below.",
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "spm_bank_001",
    type: "BANK",
    title: "Direct IMPS / NEFT Bank Transfer",
    details: {
      bankName: "HDFC Bank",
      accountName: "Super Warrior 30 Trading Institute",
      accountNumber: "50200084920192",
      ifsc: "HDFC0001234",
      branch: "Mumbai Main Branch",
    },
    instructions:
      "Transfer exact amount via IMPS/NEFT/RTGS. Enter the bank transfer reference/UTR number below.",
    isActive: true,
    createdAt: new Date(),
  },
];

export async function getSystemPaymentMethodsAction(
  includeInactive = false
): Promise<PaymentMethodItem[]> {
  try {
    const where = includeInactive ? {} : { isActive: true };
    const methods = await prisma.systemPaymentMethod.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    });

    if (!methods || methods.length === 0) {
      return includeInactive
        ? fallbackPaymentMethods
        : fallbackPaymentMethods.filter((m) => m.isActive);
    }

    return methods.map((m) => ({
      id: m.id,
      type: m.type as "UPI" | "BANK" | "CRYPTO",
      title: m.title,
      details: (m.details as PaymentMethodItem["details"]) || {},
      instructions: m.instructions,
      isActive: m.isActive,
      createdAt: m.createdAt,
    }));
  } catch (error) {
    console.error("Error loading payment methods:", error);
    return includeInactive
      ? fallbackPaymentMethods
      : fallbackPaymentMethods.filter((m) => m.isActive);
  }
}

export async function createPaymentMethodAction(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireSuperAdmin();

  const type = formData.get("type")?.toString() as "UPI" | "BANK" | "CRYPTO";
  const title = formData.get("title")?.toString().trim();
  const instructions = formData.get("instructions")?.toString().trim() || null;

  if (!type || !["UPI", "BANK", "CRYPTO"].includes(type)) {
    return { success: false, message: "Invalid payment method type." };
  }

  if (!title || title.length < 2) {
    return { success: false, message: "Please provide a descriptive title." };
  }

  const details: Record<string, string> = {};

  if (type === "UPI") {
    const upiId = formData.get("upiId")?.toString().trim();
    const payeeName = formData.get("payeeName")?.toString().trim() || title;
    let qrCodeUrl = formData.get("qrCodeUrl")?.toString().trim();

    if (!upiId || !upiId.includes("@")) {
      return { success: false, message: "Please enter a valid UPI ID (e.g. name@upi)." };
    }

    if (!qrCodeUrl) {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=${encodeURIComponent(
        upiId
      )}&pn=${encodeURIComponent(payeeName)}`;
    }

    details.upiId = upiId;
    details.payeeName = payeeName;
    details.qrCodeUrl = qrCodeUrl;
  } else if (type === "BANK") {
    const bankName = formData.get("bankName")?.toString().trim();
    const accountName = formData.get("accountName")?.toString().trim();
    const accountNumber = formData.get("accountNumber")?.toString().trim();
    const ifsc = formData.get("ifsc")?.toString().trim();
    const branch = formData.get("branch")?.toString().trim();

    if (!bankName || !accountNumber || !ifsc) {
      return {
        success: false,
        message: "Bank Name, Account Number, and IFSC code are required.",
      };
    }

    details.bankName = bankName;
    details.accountName = accountName || "Super Warrior 30";
    details.accountNumber = accountNumber;
    details.ifsc = ifsc.toUpperCase();
    if (branch) details.branch = branch;
  } else if (type === "CRYPTO") {
    const network = formData.get("network")?.toString().trim() || "BEP-20";
    const walletAddress = formData.get("walletAddress")?.toString().trim();
    let qrCodeUrl = formData.get("qrCodeUrl")?.toString().trim();

    if (!walletAddress || walletAddress.length < 10) {
      return { success: false, message: "Please provide a valid crypto deposit address." };
    }

    if (!qrCodeUrl) {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        walletAddress
      )}`;
    }

    details.network = network;
    details.walletAddress = walletAddress;
    details.qrCodeUrl = qrCodeUrl;
  }

  try {
    const newMethod = await prisma.systemPaymentMethod.create({
      data: {
        type,
        title,
        details,
        instructions,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "PAYMENT_METHOD_CREATED",
        entityType: "SystemPaymentMethod",
        entityId: newMethod.id,
        newValues: { type, title, details },
      },
    });

    revalidatePath("/admin/payment-methods");
    revalidatePath("/checkout");
    return { success: true, message: `${title} added successfully.` };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create payment method";
    return { success: false, message: msg };
  }
}

export async function togglePaymentMethodStatusAction(id: string): Promise<ActionState> {
  const admin = await requireSuperAdmin();

  try {
    const existing = await prisma.systemPaymentMethod.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, message: "Payment method not found." };
    }

    const updated = await prisma.systemPaymentMethod.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: updated.isActive ? "PAYMENT_METHOD_ACTIVATED" : "PAYMENT_METHOD_DEACTIVATED",
        entityType: "SystemPaymentMethod",
        entityId: id,
        newValues: { isActive: updated.isActive },
      },
    });

    revalidatePath("/admin/payment-methods");
    revalidatePath("/checkout");
    return {
      success: true,
      message: `${existing.title} is now ${updated.isActive ? "Active" : "Inactive"}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle status";
    return { success: false, message: msg };
  }
}

export async function deletePaymentMethodAction(id: string): Promise<ActionState> {
  const admin = await requireSuperAdmin();

  try {
    await prisma.systemPaymentMethod.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorEmail: admin.email,
        actorRole: admin.role,
        action: "PAYMENT_METHOD_DELETED",
        entityType: "SystemPaymentMethod",
        entityId: id,
      },
    });

    revalidatePath("/admin/payment-methods");
    revalidatePath("/checkout");
    return { success: true, message: "Payment method deleted." };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete payment method";
    return { success: false, message: msg };
  }
}
