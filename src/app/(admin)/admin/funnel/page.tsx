import type { Metadata } from "next";
import { getAdminFunnelAnalyticsAction } from "@/server/actions/lead.actions";
import { BarChart3, TrendingUp, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnel Analytics",
};

export default async function AdminFunnelPage() {
  const data = await getAdminFunnelAnalyticsAction();

  const funnelStages = [
    { label: "Landing Page Visits", count: data.funnel.totalVisitors, color: "text-blue-500" },
    { label: "Quiz Started", count: data.funnel.quizStarted, color: "text-purple-500" },
    { label: "Quiz Completed", count: data.funnel.quizCompleted, color: "text-amber-500" },
    { label: "Course Viewed", count: data.funnel.courseViewed, color: "text-orange-500" },
    { label: "Checkout Started", count: data.funnel.checkoutStarted, color: "text-sky-500" },
    { label: "Purchased", count: data.funnel.purchased, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Funnel Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Super Warrior 30 sales funnel conversion metrics
        </p>
      </div>

      {/* Funnel Visualization */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Conversion Funnel
        </h2>

        <div className="space-y-3">
          {funnelStages.map((stage, i) => {
            const maxCount = Math.max(...funnelStages.map((s) => s.count), 1);
            const widthPct = Math.max((stage.count / maxCount) * 100, 8);
            const prevCount = i > 0 ? funnelStages[i - 1].count : 0;
            const convRate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : null;

            return (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                    {stage.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${stage.color}`}>{stage.count}</span>
                    {convRate !== null && (
                      <span className="text-muted-foreground text-[10px]">
                        ({convRate}% from prev)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-6 w-full rounded-lg bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-lg transition-all duration-700 ${stage.color.replace("text-", "bg-")}/20 border ${stage.color.replace("text-", "border-")}/40`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leads by Stage */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground">Leads by Stage</h2>
          {data.leadsByStage.length === 0 ? (
            <p className="text-xs text-muted-foreground">No lead data yet.</p>
          ) : (
            <div className="space-y-2">
              {data.leadsByStage.map((item) => (
                <div key={item.stage} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">
                    {item.stage.replace(/_/g, " ")}
                  </span>
                  <span className="font-bold text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads by UTM Source */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground">Leads by Source (UTM)</h2>
          {data.leadsBySource.length === 0 ? (
            <p className="text-xs text-muted-foreground">No UTM source data yet. Share your funnel link with UTM params to see breakdown.</p>
          ) : (
            <div className="space-y-2">
              {data.leadsBySource.map((item) => (
                <div key={item.source} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.source}</span>
                  <span className="font-bold text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
