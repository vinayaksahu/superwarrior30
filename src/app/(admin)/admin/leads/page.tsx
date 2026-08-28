import type { Metadata } from "next";
import { getAdminLeadsAction } from "@/server/actions/lead.actions";
import {
  ContactRound,
  Search,
  MessageCircle,
  Phone,
  Mail,
  Download,
  Filter,
  UserCheck,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads Management & Follow-up | Super Warrior 30 Admin",
};

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  QUIZ_COMPLETED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  COURSE_VIEWED: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  CHECKOUT_STARTED: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  PURCHASED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; stage?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const stage = params.stage;
  const search = params.search;

  const result = await getAdminLeadsAction({ page, stage, search });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ContactRound className="h-6 w-6 text-primary" />
            Funnel Leads & Follow-up Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View captured student leads from quiz submissions, follow up directly via WhatsApp / Call / Email.
          </p>
        </div>

        <a
          href="/api/admin/leads/export"
          download
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground shadow-sm hover:border-primary/40 hover:bg-muted transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4 text-primary" />
          Export All Leads (CSV)
        </a>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { label: "All Leads", value: "all" },
          { label: "Needs Follow-up (Quiz Done)", value: "QUIZ_COMPLETED" },
          { label: "Viewed Course", value: "COURSE_VIEWED" },
          { label: "Abandoned Checkout", value: "CHECKOUT_STARTED" },
          { label: "Enrolled Students", value: "PURCHASED" },
        ].map((tab) => {
          const isActive = (stage || "all") === tab.value;
          return (
            <a
              key={tab.value}
              href={`/admin/leads?stage=${tab.value}${search ? `&search=${search}` : ""}`}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form method="GET" className="flex items-center gap-2">
          <input type="hidden" name="stage" value={stage || "all"} />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search name, email, phone..."
              className="rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-xs w-64 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Search
          </button>
          {search && (
            <a
              href={`/admin/leads?stage=${stage || "all"}`}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
            >
              Clear
            </a>
          )}
        </form>

        <p className="text-xs font-medium text-muted-foreground">
          Showing {result.data.length} of {result.total} leads
        </p>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Student Name</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Contact & Follow-up</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Trading Background</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Main Challenge & Loss</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Funnel Stage</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Traffic Source</th>
                <th className="px-4 py-3.5 text-left font-bold text-muted-foreground">Captured At</th>
                <th className="px-4 py-3.5 text-right font-bold text-muted-foreground">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {result.data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                    <div className="max-w-sm mx-auto space-y-2">
                      <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="font-semibold text-foreground">No leads found in this filter.</p>
                      <p className="text-xs">
                        Whenever visitors complete the quiz on your sales landing page, their details will appear here instantly for follow-up.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                result.data.map((lead) => {
                  const rawPhone = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
                  const formattedPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                  const waMessage = encodeURIComponent(
                    `Hello ${lead.name || "Trader"}, we saw you completed your trading profile check on Rahul Trade Warrior Academy. Do you have any questions regarding Super Warrior 30 or need help with enrollment?`
                  );

                  return (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs">
                            {(lead.name || "L").charAt(0).toUpperCase()}
                          </div>
                          <span>{lead.name || "—"}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5 font-medium">
                          {lead.email && (
                            <p className="text-foreground">{lead.email}</p>
                          )}
                          {lead.phone && (
                            <p className="text-muted-foreground">📞 {lead.phone}</p>
                          )}
                          {lead.whatsapp && lead.whatsapp !== lead.phone && (
                            <p className="text-emerald-500">💬 WA: {lead.whatsapp}</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">{lead.tradingExperience || "—"}</p>
                          <p className="text-muted-foreground">Market: {lead.targetMarket || "All"}</p>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <p className="text-foreground font-medium">{lead.mainChallenge || "—"}</p>
                          {lead.lossRange && (
                            <p className="text-amber-500 text-[11px]">Loss: {lead.lossRange}</p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                            STAGE_COLORS[lead.stage] || "bg-muted text-muted-foreground"
                          }`}
                        >
                          {lead.stage === "PURCHASED"
                            ? "✅ ENROLLED"
                            : lead.stage === "CHECKOUT_STARTED"
                            ? "🛒 ABANDONED CART"
                            : lead.stage === "COURSE_VIEWED"
                            ? "👀 VIEWED COURSE"
                            : "⏳ QUIZ DONE (FOLLOW UP)"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <span className="font-semibold capitalize text-foreground">
                            {lead.utmSource || lead.source || "Direct"}
                          </span>
                          {lead.utmCampaign && (
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {lead.utmCampaign}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {formattedPhone && (
                            <a
                              href={`https://wa.me/${formattedPhone}?text=${waMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="flex h-8 items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 text-xs font-bold text-emerald-500 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </a>
                          )}

                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              title="Call Lead"
                              className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}

                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}?subject=${encodeURIComponent("Super Warrior 30 Follow-up - Rahul Trade Warrior Academy")}`}
                              title="Send Email"
                              className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
          <p>
            Page {result.page} of {result.totalPages} ({result.total} leads total)
          </p>
          <div className="flex items-center gap-2">
            {result.page > 1 && (
              <a
                href={`/admin/leads?page=${result.page - 1}${stage ? `&stage=${stage}` : ""}${search ? `&search=${search}` : ""}`}
                className="rounded-lg border border-border bg-card px-3.5 py-1.5 font-semibold text-foreground hover:bg-muted"
              >
                Previous
              </a>
            )}
            {result.page < result.totalPages && (
              <a
                href={`/admin/leads?page=${result.page + 1}${stage ? `&stage=${stage}` : ""}${search ? `&search=${search}` : ""}`}
                className="rounded-lg border border-border bg-card px-3.5 py-1.5 font-semibold text-foreground hover:bg-muted"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
