import { prisma } from "@/lib/prisma";

export type BrokerOfferMode = "CASHBACK" | "INSTANT_DISCOUNT";
export type EligibleCourseScope = "ALL_COURSES" | "SELECTED_COURSES";

export interface BrokerItem {
  id: string;
  name: string;
  partnerUrl: string;
  offerPercentage: number;
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
  offerPercentage: number; // e.g. 25 for 25%
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

  allowCouponWithBroker: false,
  allowReferralWithCoupon: false,
  allowReferralWithBroker: false,
  allowAllStacking: false,

  mode: "INSTANT_DISCOUNT",
  brokerName: "GTC FX",
  brokerPartnerUrl: "https://web.mygtc.app/login/register?ref=FtHnmAFV",
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

    // Normalize brokers array with backward compatibility
    let brokers: BrokerItem[] = [];
    if (Array.isArray(parsed.brokers) && parsed.brokers.length > 0) {
      brokers = parsed.brokers.map((b: any, idx: number) => ({
        id: b.id || `broker-${idx + 1}`,
        name: b.name || "Partner Broker",
        partnerUrl: b.partnerUrl || "",
        offerPercentage: Number(b.offerPercentage) || Number(parsed.offerPercentage) || 25,
        couponCode: b.couponCode || "",
        description: b.description || parsed.description || "",
        isActive: b.isActive !== false,
        requiresMemberId: b.requiresMemberId !== false,
        requiresProof: Boolean(b.requiresProof),
      }));
    } else {
      brokers = [
        {
          id: "gtc-fx",
          name: parsed.brokerName || DEFAULT_BROKER_SETTINGS.brokerName,
          partnerUrl: parsed.brokerPartnerUrl || DEFAULT_BROKER_SETTINGS.brokerPartnerUrl,
          offerPercentage: Number(parsed.offerPercentage) || 25,
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
      referralDiscountPercentage:
        parsed.referralDiscountPercentage !== undefined
          ? Number(parsed.referralDiscountPercentage)
          : 10,
      allowCouponWithBroker: Boolean(parsed.allowCouponWithBroker || parsed.allowCouponStacking || allowAll),
      allowReferralWithCoupon: Boolean(parsed.allowReferralWithCoupon || allowAll),
      allowReferralWithBroker: Boolean(parsed.allowReferralWithBroker || allowAll),
      allowAllStacking: allowAll,
      allowCouponStacking: Boolean(parsed.allowCouponStacking || parsed.allowCouponWithBroker || allowAll),
      allowReferralStacking: allowAll,
      brokers,
      brokerName: primaryBroker?.name || parsed.brokerName || DEFAULT_BROKER_SETTINGS.brokerName,
      brokerPartnerUrl: primaryBroker?.partnerUrl || parsed.brokerPartnerUrl || DEFAULT_BROKER_SETTINGS.brokerPartnerUrl,
      offerPercentage: primaryBroker?.offerPercentage ?? (Number(parsed.offerPercentage) || 25),
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

  // Keep primary single-broker fields synced with first active broker for legacy readers
  if (Array.isArray(updated.brokers) && updated.brokers.length > 0) {
    const primary = updated.brokers.find((b) => b.isActive) || updated.brokers[0];
    if (primary) {
      if (!settings.brokerName) updated.brokerName = primary.name;
      if (!settings.brokerPartnerUrl) updated.brokerPartnerUrl = primary.partnerUrl;
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
