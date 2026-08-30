import { prisma } from "@/lib/prisma";

export type BrokerOfferMode = "CASHBACK" | "INSTANT_DISCOUNT";

export interface BrokerOfferSettings {
  isEnabled: boolean;
  mode: BrokerOfferMode;
  brokerName: string;
  brokerPartnerUrl: string;
  offerPercentage: number; // e.g. 40 for 40%
  isAutoVerificationActive: boolean;
  autoVerificationProvider: "INTERNAL_ADAPTER" | "API_WEBHOOK" | "CUSTOM";
  autoVerificationApiKey?: string;
  autoVerificationEndpoint?: string;
  customInstructions?: string;
}

export const DEFAULT_BROKER_SETTINGS: BrokerOfferSettings = {
  isEnabled: true,
  mode: "CASHBACK",
  brokerName: "Exness",
  brokerPartnerUrl: "https://one.exness-track.com/a/superwarrior30",
  offerPercentage: 40,
  isAutoVerificationActive: false,
  autoVerificationProvider: "INTERNAL_ADAPTER",
  customInstructions: "Create your partner account using our link, deposit and complete KYC, then submit your Broker Member/Account ID here.",
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

  // Enforce rule: Admin CANNOT enable Instant Discount unless auto-verification is active
  if (updated.mode === "INSTANT_DISCOUNT" && !updated.isAutoVerificationActive) {
    throw new Error(
      "Cannot enable Instant Discount Mode: Automatic verification is not configured or active. Please configure and activate auto-verification first, or choose Cashback Mode."
    );
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
