import { prisma } from "@/lib/prisma";

export type BrokerOfferMode = "CASHBACK" | "INSTANT_DISCOUNT";
export type EligibleCourseScope = "ALL_COURSES" | "SELECTED_COURSES";
export type BrokerOfferDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface BrokerItem {
  id: string;
  name: string;
  partnerUrl: string;
  offerPercentage: number;
  discountType?: BrokerOfferDiscountType;
  discountValue?: number;
  couponCode?: string;
  description?: string;
  isActive: boolean;
  requiresMemberId?: boolean;
  requiresProof?: boolean;
  requireMemberId?: boolean;
  requireProof?: boolean;
}

export interface BrokerOfferSettings {
  // 1. Independent Module Toggles
  isEnabled: boolean; // Broker Offer module toggle
  isCouponEnabled: boolean; // Promo Coupon module toggle
  isReferralDiscountEnabled: boolean; // Referral Discount module toggle
  referralDiscountPercentage: number; // Modifiable % (e.g. 5, 6, 10, 20)
  referralDiscountType?: BrokerOfferDiscountType; // "PERCENTAGE" | "FIXED_AMOUNT"
  referralDiscountValue?: number; // Modifiable % or ₹ amount

  // 2. Flexible Stacking Rules
  allowCouponWithBroker: boolean; // Allow Promo Coupon + Broker Offer
  allowReferralWithCoupon: boolean; // Allow Referral Discount + Promo Coupon
  allowReferralWithBroker: boolean; // Allow Referral Discount + Broker Offer
  allowAllStacking: boolean; // Allow All 3 together

  // Backward compatibility aliases
  allowCouponStacking?: boolean;
  allowReferralStacking?: boolean;

  // 3. Broker Specific Config
  mode: BrokerOfferMode;
  brokerName: string;
  brokerPartnerUrl: string;
  discountType?: BrokerOfferDiscountType; // "PERCENTAGE" | "FIXED_AMOUNT"
  discountValue?: number; // Discount rate (% or ₹)
  offerPercentage: number; // e.g. 25 for 25% (legacy fallback)
  minimumOrderAmount: number;
  maximumBenefitAmount: number | null;
  startDate: string | null;
  endDate: string | null;
  eligibleCourseScope: EligibleCourseScope;
  eligibleCourseIds: string[];
  requireMemberId: boolean;
  requireProof: boolean;
  description: string;
  isAutoVerificationActive: boolean;
  autoVerificationProvider: "INTERNAL_ADAPTER" | "API_WEBHOOK" | "CUSTOM";
  autoVerificationApiKey?: string;
  autoVerificationEndpoint?: string;

  // 4. Multi-Broker Support
  brokers: BrokerItem[];
}

export const DEFAULT_BROKER_SETTINGS: BrokerOfferSettings = {
  isEnabled: true,
  isCouponEnabled: true,
  isReferralDiscountEnabled: true,
  referralDiscountPercentage: 10,
  referralDiscountType: "PERCENTAGE",
  referralDiscountValue: 10,

  allowCouponWithBroker: false,
  allowReferralWithCoupon: false,
  allowReferralWithBroker: false,
  allowAllStacking: false,

  mode: "INSTANT_DISCOUNT",
  brokerName: "GTC FX",
  brokerPartnerUrl: "https://web.mygtc.app/login/register?ref=FtHnmAFV",
  discountType: "PERCENTAGE",
  discountValue: 25,
  offerPercentage: 25,
  minimumOrderAmount: 0,
  maximumBenefitAmount: null,
  startDate: null,
  endDate: null,
  eligibleCourseScope: "ALL_COURSES",
  eligibleCourseIds: [],
  requireMemberId: true,
  requireProof: false,
  description: "Open your broker account using our partner link and unlock a special course benefit.",
  isAutoVerificationActive: false,
  autoVerificationProvider: "INTERNAL_ADAPTER",

  brokers: [
    {
      id: "gtc-fx",
      name: "GTC FX",
      partnerUrl: "https://web.mygtc.app/login/register?ref=FtHnmAFV",
      discountType: "PERCENTAGE",
      discountValue: 25,
      offerPercentage: 25,
      couponCode: "",
      description: "Open your broker account using our partner link and unlock a special course benefit.",
      isActive: true,
      requiresMemberId: true,
      requiresProof: false,
    },
  ],
};

const SITE_SETTING_KEY = "BROKER_OFFER_SETTINGS";

export async function getBrokerSettings(): Promise<BrokerOfferSettings> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SITE_SETTING_KEY },
    });

    if (!setting || !setting.value) {
      return DEFAULT_BROKER_SETTINGS;
    }

    const parsed = JSON.parse(setting.value);
    const allowAll = Boolean(parsed.allowAllStacking || parsed.allowReferralStacking);

    const discountType: BrokerOfferDiscountType =
      parsed.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
    const discountValue =
      parsed.discountValue !== undefined
        ? Number(parsed.discountValue)
        : Number(parsed.offerPercentage) || 25;

    const referralDiscountType: BrokerOfferDiscountType =
      parsed.referralDiscountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
    const referralDiscountValue =
      parsed.referralDiscountValue !== undefined
        ? Number(parsed.referralDiscountValue)
        : Number(parsed.referralDiscountPercentage) || 10;

    // Normalize brokers array with backward compatibility
    let brokers: BrokerItem[] = [];
    if (Array.isArray(parsed.brokers) && parsed.brokers.length > 0) {
      brokers = parsed.brokers.map((b: any, idx: number) => {
        const bType: BrokerOfferDiscountType =
          b.discountType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "PERCENTAGE";
        const bValue =
          b.discountValue !== undefined
            ? Number(b.discountValue)
            : Number(b.offerPercentage) || Number(parsed.offerPercentage) || 25;
        return {
          id: b.id || `broker-${idx + 1}`,
          name: b.name || "Partner Broker",
          partnerUrl: b.partnerUrl || "",
          discountType: bType,
          discountValue: bValue,
          offerPercentage: bType === "PERCENTAGE" ? bValue : (Number(b.offerPercentage) || 25),
          couponCode: b.couponCode || "",
          description: b.description || parsed.description || "",
          isActive: b.isActive !== false,
          requiresMemberId: b.requiresMemberId !== false,
          requiresProof: Boolean(b.requiresProof),
        };
      });
    } else {
      brokers = [
        {
          id: "gtc-fx",
          name: parsed.brokerName || DEFAULT_BROKER_SETTINGS.brokerName,
          partnerUrl: parsed.brokerPartnerUrl || DEFAULT_BROKER_SETTINGS.brokerPartnerUrl,
          discountType,
          discountValue,
          offerPercentage: discountType === "PERCENTAGE" ? discountValue : (Number(parsed.offerPercentage) || 25),
          couponCode: parsed.couponCode || "",
          description: parsed.description || DEFAULT_BROKER_SETTINGS.description,
          isActive: true,
          requiresMemberId: parsed.requireMemberId !== false,
          requiresProof: Boolean(parsed.requireProof),
        },
      ];
    }

    const primaryBroker = brokers.find((b) => b.isActive) || brokers[0];

    return {
      ...DEFAULT_BROKER_SETTINGS,
      ...parsed,
      isEnabled: parsed.isEnabled !== undefined ? Boolean(parsed.isEnabled) : true,
      isCouponEnabled: parsed.isCouponEnabled !== undefined ? Boolean(parsed.isCouponEnabled) : true,
      isReferralDiscountEnabled:
        parsed.isReferralDiscountEnabled !== undefined
          ? Boolean(parsed.isReferralDiscountEnabled)
          : true,
      referralDiscountType,
      referralDiscountValue,
      referralDiscountPercentage:
        referralDiscountType === "PERCENTAGE"
          ? referralDiscountValue
          : (parsed.referralDiscountPercentage !== undefined ? Number(parsed.referralDiscountPercentage) : 10),
      allowCouponWithBroker: Boolean(parsed.allowCouponWithBroker || parsed.allowCouponStacking || allowAll),
      allowReferralWithCoupon: Boolean(parsed.allowReferralWithCoupon || allowAll),
      allowReferralWithBroker: Boolean(parsed.allowReferralWithBroker || allowAll),
      allowAllStacking: allowAll,
      allowCouponStacking: Boolean(parsed.allowCouponStacking || parsed.allowCouponWithBroker || allowAll),
      allowReferralStacking: allowAll,
      brokers,
      brokerName: primaryBroker?.name || parsed.brokerName || DEFAULT_BROKER_SETTINGS.brokerName,
      brokerPartnerUrl: primaryBroker?.partnerUrl || parsed.brokerPartnerUrl || DEFAULT_BROKER_SETTINGS.brokerPartnerUrl,
      discountType: primaryBroker?.discountType || discountType,
      discountValue: primaryBroker?.discountValue ?? discountValue,
      offerPercentage:
        (primaryBroker?.discountType || discountType) === "PERCENTAGE"
          ? (primaryBroker?.discountValue ?? discountValue)
          : (primaryBroker?.offerPercentage ?? (Number(parsed.offerPercentage) || 25)),
    };
  } catch (error) {
    console.error("Failed to load broker settings:", error);
    return DEFAULT_BROKER_SETTINGS;
  }
}

export async function saveBrokerSettings(
  settings: Partial<BrokerOfferSettings>
): Promise<BrokerOfferSettings> {
  const current = await getBrokerSettings();
  const updated: BrokerOfferSettings = {
    ...current,
    ...settings,
  };

  // Ensure offerPercentage and referralDiscountPercentage reflect updated values for backward compatibility
  if (updated.discountType === "PERCENTAGE" && updated.discountValue !== undefined) {
    updated.offerPercentage = updated.discountValue;
  }
  if (updated.referralDiscountType === "PERCENTAGE" && updated.referralDiscountValue !== undefined) {
    updated.referralDiscountPercentage = updated.referralDiscountValue;
  }

  // Keep primary single-broker fields synced with first active broker for legacy readers
  if (Array.isArray(updated.brokers) && updated.brokers.length > 0) {
    const primary = updated.brokers.find((b) => b.isActive) || updated.brokers[0];
    if (primary) {
      if (!settings.brokerName) updated.brokerName = primary.name;
      if (!settings.brokerPartnerUrl) updated.brokerPartnerUrl = primary.partnerUrl;
      if (settings.discountType === undefined && primary.discountType) updated.discountType = primary.discountType;
      if (settings.discountValue === undefined && primary.discountValue !== undefined) updated.discountValue = primary.discountValue;
      if (settings.offerPercentage === undefined) updated.offerPercentage = primary.offerPercentage;
    }
  }

  await prisma.siteSetting.upsert({
    where: { key: SITE_SETTING_KEY },
    update: {
      value: JSON.stringify(updated),
      type: "json",
    },
    create: {
      key: SITE_SETTING_KEY,
      value: JSON.stringify(updated),
      type: "json",
    },
  });

  return updated;
}
