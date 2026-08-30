import { NextResponse } from "next/server";
import { verifyBrokerMemberIdServer } from "@/lib/broker/verification";
import { getBrokerSettings } from "@/lib/broker/config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { memberId } = body;

    const settings = await getBrokerSettings();

    if (!settings.isEnabled) {
      return NextResponse.json({
        success: false,
        isVerified: false,
        message: "Broker offer is currently disabled.",
      });
    }

    if (settings.mode === "INSTANT_DISCOUNT" && !settings.isAutoVerificationActive) {
      return NextResponse.json({
        success: false,
        isVerified: false,
        isServiceAvailable: false,
        mode: settings.mode,
        message:
          "Instant discount verification is currently unavailable. Please use the Cashback option.",
      });
    }

    const result = await verifyBrokerMemberIdServer(memberId, settings);

    return NextResponse.json({
      success: result.isVerified,
      isVerified: result.isVerified,
      isServiceAvailable: result.isServiceAvailable,
      mode: settings.mode,
      offerPercentage: Number(settings.offerPercentage) || 40,
      brokerName: settings.brokerName,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        isVerified: false,
        message: error.message || "Failed to verify broker member ID.",
      },
      { status: 500 }
    );
  }
}
