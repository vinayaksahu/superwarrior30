"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";

interface QuizResultProps {
  answers: Record<string, string>;
  onContinue: () => void;
}

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  "6months": "6 महीने से कम",
  "6m-1y": "6 महीने – 1 साल",
  "1-3y": "1–3 साल",
  "3y+": "3+ साल",
};

const MARKET_LABELS: Record<string, string> = {
  forex: "Forex",
  crypto: "Crypto",
  gold: "Gold",
  all: "Forex + Crypto + Gold",
};

const CHALLENGE_LABELS: Record<string, string> = {
  "entry-exit": "Entry & Exit",
  stoploss: "Stop Loss Management",
  trend: "Market Trend Analysis",
  risk: "Risk Management",
  psychology: "Trading Psychology",
  dependency: "Signal Dependency",
};

function getRecommendation(answers: Record<string, string>): string {
  const exp = answers.tradingExperience;
  if (exp === "beginner" || exp === "6months") {
    return "आपके profile के अनुसार आपको structured foundation + practical trading training की सबसे ज्यादा जरूरत है। Super Warrior 30 में Trading Basics से लेकर Live Practice तक step-by-step सीखाया जाता है।";
  }
  if (exp === "6m-1y" || exp === "1-3y") {
    return "आपको trading experience है लेकिन structured methodology और disciplined execution की जरूरत है। Super Warrior 30 आपकी existing knowledge को systematic approach में convert करेगा।";
  }
  return "आप experienced trader हैं। Super Warrior 30 आपको advanced risk management, liquidity concepts और professional execution framework provide करेगा।";
}

export function QuizResult({ answers, onContinue }: QuizResultProps) {
  const recommendation = getRecommendation(answers);

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            आपका Trading Profile तैयार है
          </h3>
          <p className="text-xs text-muted-foreground">
            Based on your answers
          </p>
        </div>
      </div>

      {/* Profile cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Trading Experience
          </p>
          <p className="text-sm font-bold text-primary">
            {EXPERIENCE_LABELS[answers.tradingExperience] || answers.tradingExperience}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Primary Market
          </p>
          <p className="text-sm font-bold text-primary">
            {MARKET_LABELS[answers.targetMarket] || answers.targetMarket}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Main Challenge
          </p>
          <p className="text-sm font-bold text-primary">
            {CHALLENGE_LABELS[answers.mainChallenge] || answers.mainChallenge}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Learning Goal
          </p>
          <p className="text-sm font-bold text-primary">
            {answers.learningGoals === "all" ? "Complete Training" : answers.learningGoals}
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-2">
        <p className="text-sm font-semibold text-foreground">
          📊 आपका Analysis:
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {recommendation}
        </p>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all cursor-pointer"
      >
        देखें Super Warrior 30 आपके लिए कैसे काम करेगा
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
