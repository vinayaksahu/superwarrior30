import { NextRequest, NextResponse } from "next/server";
import { verifyBrokerMemberIdServer } from "@/lib/broker/verification";
import { getBrokerSettings } from "@/lib/broker/config";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";

    // Rate limit: 15 verification requests per minute per IP
    const rateLimit = await checkRateLimit({
      key: `broker-verify:${ip}`,
      limit: 15,
      windowSeconds: 60,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          isVerified: false,
          message: "Too many verification requests. Please try again in a minute.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { memberId } = body;

    if (!memberId || typeof memberId !== "string" || !memberId.trim() || memberId.trim().length > 64) {
      return NextResponse.json(
        {
          success: false,
          isVerified: false,
          message: "Please provide a valid Member ID.",
        },
        { status: 400 }
      );
    }

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
