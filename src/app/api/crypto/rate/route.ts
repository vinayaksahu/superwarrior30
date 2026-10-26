import { NextResponse } from "next/server";
import { getUsdtInrRate, calculateUsdtAmount } from "@/lib/crypto/rates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const amountParam = searchParams.get("inrAmount");
    const inrAmount = amountParam ? parseFloat(amountParam) : null;

    // Check if admin set a custom fixed rate on the CRYPTO method
    let adminFixedRate: number | null = null;
    try {
      const cryptoMethod = await prisma.systemPaymentMethod.findFirst({
        where: { type: "CRYPTO", isActive: true },
        select: { details: true },
      });
      const details = cryptoMethod?.details as any;
      if (details?.exchangeRateINR && !isNaN(Number(details.exchangeRateINR))) {
        adminFixedRate = Number(details.exchangeRateINR);
      }
    } catch {
      // ignore
    }

    const rateData = await getUsdtInrRate(adminFixedRate);

    let calculation = null;
    if (inrAmount && !isNaN(inrAmount) && inrAmount > 0) {
      calculation = calculateUsdtAmount(inrAmount, rateData.rate);
    }

    return NextResponse.json({
      success: true,
      rate: rateData.rate,
      formattedRate: rateData.formattedRate,
      source: rateData.source,
      currency: "INR",
      cryptoSymbol: "USDT",
      updatedAt: rateData.updatedAt,
      calculation,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve USDT rate",
        rate: 103.0,
        formattedRate: "103.00",
      },
      { status: 500 }
    );
  }
}
