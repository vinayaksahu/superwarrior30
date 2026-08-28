import type { Metadata } from "next";
import { getAdminLeadsAction } from "@/server/actions/lead.actions";
import { ContactRound, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leads Management",
};

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD: "bg-blue-500/10 text-blue-500",
  QUIZ_COMPLETED: "bg-amber-500/10 text-amber-500",
  COURSE_VIEWED: "bg-purple-500/10 text-purple-500",
  CHECKOUT_STARTED: "bg-orange-500/10 text-orange-500",
  PURCHASED: "bg-emerald-500/10 text-emerald-500",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ContactRound className="h-6 w-6 text-primary" />
            Funnel Leads
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {result.total} total leads from Super Warrior 30 funnel
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form method="GET" className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search name, email, phone..."
              className="rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs w-60 focus:border-primary focus:outline-none"
            />
          </div>
          <select
            name="stage"
            defaultValue={stage || "all"}
            className="rounded-lg border border-input bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
          >
            <option value="all">All Stages</option>
            <option value="NEW_LEAD">New Lead</option>
            <option value="QUIZ_COMPLETED">Quiz Completed</option>
            <option value="COURSE_VIEWED">Course Viewed</option>
            <option value="CHECKOUT_STARTED">Checkout Started</option>
            <option value="PURCHASED">Purchased</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Contact</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Experience</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Market</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Challenge</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Loss Range</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Stage</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Source</th>
                <th className="px-4 py-3 text-left font-bold text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {result.data.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No leads found. Once visitors complete the funnel quiz, leads will appear here.
                  </td>
                </tr>
              ) : (
                result.data.map((lead) => (
                  <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{lead.name || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {lead.email && <p className="text-foreground">{lead.email}</p>}
                        {lead.phone && <p className="text-muted-foreground">{lead.phone}</p>}
                        {lead.whatsapp && <p className="text-emerald-500">WA: {lead.whatsapp}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.tradingExperience || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.targetMarket || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.mainChallenge || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.lossRange || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STAGE_COLORS[lead.stage] || "bg-muted text-muted-foreground"}`}>
                        {lead.stage.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.utmSource || lead.source || "Direct"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Page {result.page} of {result.totalPages} ({result.total} leads)
          </p>
          <div className="flex items-center gap-2">
            {result.page > 1 && (
              <a
                href={`/admin/leads?page=${result.page - 1}${stage ? `&stage=${stage}` : ""}${search ? `&search=${search}` : ""}`}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
              >
                Previous
              </a>
            )}
            {result.page < result.totalPages && (
              <a
                href={`/admin/leads?page=${result.page + 1}${stage ? `&stage=${stage}` : ""}${search ? `&search=${search}` : ""}`}
                className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
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
