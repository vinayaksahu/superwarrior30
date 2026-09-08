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

    function sanitizeCsvCell(val: string | null | undefined): string {
      let str = (val || "").replace(/"/g, '""');
      // CSV Formula Injection mitigation: prefix dangerous leading characters with a single quote
      if (/^[\=\+\-\@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    }

    const rows = leads.map((l) => [
      sanitizeCsvCell(l.name),
      sanitizeCsvCell(l.email),
      sanitizeCsvCell(l.phone),
      sanitizeCsvCell(l.whatsapp),
      sanitizeCsvCell(l.tradingExperience),
      sanitizeCsvCell(l.targetMarket),
      sanitizeCsvCell(l.mainChallenge),
      sanitizeCsvCell(l.lossRange),
      sanitizeCsvCell(l.learningGoals),
      sanitizeCsvCell(l.readyForTraining),
      sanitizeCsvCell(l.stage),
      sanitizeCsvCell(l.utmSource),
      sanitizeCsvCell(l.utmMedium),
      sanitizeCsvCell(l.utmCampaign),
      sanitizeCsvCell(new Date(l.createdAt).toISOString()),
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
