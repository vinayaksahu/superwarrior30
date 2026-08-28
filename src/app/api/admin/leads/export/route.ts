import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    await ensureDatabaseSchemaSync();

    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Name",
      "Email",
      "Phone",
      "WhatsApp",
      "Trading Experience",
      "Target Market",
      "Main Challenge",
      "Loss Range",
      "Learning Goals",
      "Ready For Training",
      "Funnel Stage",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "Created At",
    ];

    const rows = leads.map((l) => [
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.whatsapp || "").replace(/"/g, '""')}"`,
      `"${(l.tradingExperience || "").replace(/"/g, '""')}"`,
      `"${(l.targetMarket || "").replace(/"/g, '""')}"`,
      `"${(l.mainChallenge || "").replace(/"/g, '""')}"`,
      `"${(l.lossRange || "").replace(/"/g, '""')}"`,
      `"${(l.learningGoals || "").replace(/"/g, '""')}"`,
      `"${(l.readyForTraining || "").replace(/"/g, '""')}"`,
      `"${l.stage}"`,
      `"${l.utmSource || ""}"`,
      `"${l.utmMedium || ""}"`,
      `"${l.utmCampaign || ""}"`,
      `"${new Date(l.createdAt).toISOString()}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="superwarrior30_leads_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export leads error:", error);
    return NextResponse.json({ error: "Failed to export leads" }, { status: 500 });
  }
}
