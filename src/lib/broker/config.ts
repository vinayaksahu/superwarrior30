import { prisma } from "@/lib/prisma";

export type BrokerOfferMode = "CASHBACK" | "INSTANT_DISCOUNT";
export type EligibleCourseScope = "ALL_COURSES" | "SELECTED_COURSES";

export interface BrokerOfferSettings {
  isEnabled: boolean;
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
  allowCouponStacking: boolean;
  allowReferralStacking: boolean; // Allow Promo Coupon + Broker Offer + Referral Discount Stacking
  isReferralDiscountEnabled: boolean; // Global toggle for referral discount
  referralDiscountPercentage: number; // e.g. 10 for 10% (modifiable by admin)
  isAutoVerificationActive: boolean;
  autoVerificationProvider: "INTERNAL_ADAPTER" | "API_WEBHOOK" | "CUSTOM";
  autoVerificationApiKey?: string;
  autoVerificationEndpoint?: string;
}

export const DEFAULT_BROKER_SETTINGS: BrokerOfferSettings = {
  isEnabled: true,
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
  allowCouponStacking: false,
  allowReferralStacking: false,
  isReferralDiscountEnabled: true,
  referralDiscountPercentage: 10,
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
    return {
      ...DEFAULT_BROKER_SETTINGS,
      ...parsed,
      referralDiscountPercentage:
        parsed.referralDiscountPercentage !== undefined
          ? Number(parsed.referralDiscountPercentage)
          : DEFAULT_BROKER_SETTINGS.referralDiscountPercentage,
      allowReferralStacking:
        parsed.allowReferralStacking !== undefined
          ? Boolean(parsed.allowReferralStacking)
          : DEFAULT_BROKER_SETTINGS.allowReferralStacking,
      isReferralDiscountEnabled:
        parsed.isReferralDiscountEnabled !== undefined
          ? Boolean(parsed.isReferralDiscountEnabled)
          : DEFAULT_BROKER_SETTINGS.isReferralDiscountEnabled,
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
