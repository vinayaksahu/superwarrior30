import type { Metadata } from "next";
import {
  getAdminFunnelAnalyticsAction,
  getFunnelCourseSettingsAction,
} from "@/server/actions/lead.actions";
import { FunnelCampaignGenerator } from "@/components/admin/funnel-campaign-generator";
import {
  BarChart3,
  TrendingUp,
  ArrowRight,
  Share2,
  Users,
  Eye,
  CheckCircle2,
  ShoppingCart,
  DollarSign,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Funnel & Campaign Analytics | Super Warrior 30 Admin",
};

export default async function AdminFunnelPage() {
  const [data, courseSettings] = await Promise.all([
    getAdminFunnelAnalyticsAction(),
    getFunnelCourseSettingsAction(),
  ]);

  const funnelStages = [
    { label: "Landing Page Visits", count: data.funnel.totalVisitors, color: "text-blue-500", icon: Eye },
    { label: "Quiz Started", count: data.funnel.quizStarted, color: "text-purple-500", icon: Users },
    { label: "Quiz Completed", count: data.funnel.quizCompleted, color: "text-amber-500", icon: CheckCircle2 },
    { label: "Course Viewed", count: data.funnel.courseViewed, color: "text-orange-500", icon: Eye },
    { label: "Checkout Started", count: data.funnel.checkoutStarted, color: "text-sky-500", icon: ShoppingCart },
    { label: "Purchased", count: data.funnel.purchased, color: "text-emerald-500", icon: DollarSign },
  ];

  const overallConversion =
    data.funnel.totalVisitors > 0
      ? ((data.funnel.quizCompleted / data.funnel.totalVisitors) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Funnel & Social Media Campaign Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure landing page courses, generate tracked campaign links for YouTube/Insta/FB, and track multi-channel conversions.
          </p>
        </div>
      </div>

      {/* 1. Interactive Campaign Link Generator & Course Selector */}
      <FunnelCampaignGenerator
        courses={courseSettings.courses}
        defaultCourseId={courseSettings.defaultCourseId}
      />

      {/* 2. Conversion Funnel Visualizer */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Conversion Funnel Pipeline
            </h2>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Visitor-to-Lead Rate: {overallConversion}%
          </span>
        </div>

        <div className="space-y-3.5">
          {funnelStages.map((stage, i) => {
            const maxCount = Math.max(...funnelStages.map((s) => s.count), 1);
            const widthPct = Math.max((stage.count / maxCount) * 100, 8);
            const prevCount = i > 0 ? funnelStages[i - 1].count : 0;
            const convRate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : null;
            const StageIcon = stage.icon;

            return (
              <div key={stage.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <StageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
                    {stage.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`font-extrabold text-sm ${stage.color}`}>{stage.count}</span>
                    {convRate !== null && (
                      <span className="text-muted-foreground text-[10px]">
                        ({convRate}% from prev stage)
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-6 w-full rounded-xl bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-xl transition-all duration-700 ${stage.color.replace("text-", "bg-")}/25 border ${stage.color.replace("text-", "border-")}/40`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Campaign Performance Breakdown */}
      {data.leadsByCampaign && data.leadsByCampaign.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" />
            Social Media & Campaign Performance
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground">Platform / Source</th>
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground">Campaign Name</th>
                  <th className="px-4 py-3 text-left font-bold text-muted-foreground">Placement / Medium</th>
                  <th className="px-4 py-3 text-right font-bold text-muted-foreground">Captured Leads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.leadsByCampaign.map((camp, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold capitalize text-foreground flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {camp.source}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-foreground">
                      {camp.campaign}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {camp.medium}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary">
                      {camp.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Leads By Stage and Leads By Source */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leads by Stage */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground">Leads by Funnel Stage</h2>
          {data.leadsByStage.length === 0 ? (
            <p className="text-xs text-muted-foreground">No lead data recorded yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.leadsByStage.map((item) => (
                <div key={item.stage} className="flex items-center justify-between text-xs rounded-lg border border-border/60 p-2.5">
                  <span className="font-medium text-foreground">
                    {item.stage.replace(/_/g, " ")}
                  </span>
                  <span className="font-extrabold text-primary">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads by UTM Source */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-foreground">Top Traffic Sources</h2>
          {data.leadsBySource.length === 0 ? (
            <p className="text-xs text-muted-foreground">No traffic source data yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.leadsBySource.map((item) => (
                <div key={item.source} className="flex items-center justify-between text-xs rounded-lg border border-border/60 p-2.5">
                  <span className="font-semibold capitalize text-foreground">
                    {item.source}
                  </span>
                  <span className="font-extrabold text-primary">{item.count} leads</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
