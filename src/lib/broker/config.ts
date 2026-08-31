import { prisma } from "@/lib/prisma";

export type BrokerOfferMode = "CASHBACK" | "INSTANT_DISCOUNT";
export type EligibleCourseScope = "ALL_COURSES" | "SELECTED_COURSES";

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
  offerPercentage: number; // e.g. 40 for 40%
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

  mode: "CASHBACK",
  brokerName: "GTC FX",
  brokerPartnerUrl: "https://web.mygtc.app/login/register?ref=FtHnmAFV",
  offerPercentage: 40,
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
