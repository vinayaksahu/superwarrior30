"use client";

import { CheckCircle2, ArrowRight, Brain, ShieldAlert, Scale, Zap } from "lucide-react";

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
  psychology: "Revenge Trading & Emotions",
  risk: "Risk & Money Management",
  "fear-greed": "Fear & Greed (Holding Losers)",
  "indicator-confusion": "Indicator Paralysis",
  "entry-exit": "Entry & Exit Timing",
  dependency: "Telegram Signal Dependency",
  stoploss: "Stop Loss Hunting",
  trend: "Market Trend Analysis",
};

function getRecommendation(answers: Record<string, string>): { diagnosis: string; solution: string } {
  const challenge = answers.mainChallenge;

  if (challenge === "psychology" || challenge === "fear-greed") {
    return {
      diagnosis: "आपकी 80% समस्या Mindset & Emotions की है। आप Loss होने पर खुद पर काबू नहीं रख पाते और Revenge Trade लेकर पूरा Capital गंवा देते हैं।",
      solution: "Super Warrior 30 का 'Zero-Emotion Trading Protocol' आपको सिखाएगा कि कैसे हर ट्रेड को बिना किसी घबराहट या लालच के सिस्टमैटिकली execute करें।",
    };
  }

  if (challenge === "risk") {
    return {
      diagnosis: "आप बिना Position Sizing और Risk:Reward Ratio के ट्रेड कर रहे हैं। मनमर्जी का Lot Size लगाने से सिर्फ 1-2 गलत ट्रेड्स में आपका पूरा अकाउंट खाली हो जाता है।",
      solution: "Super Warrior 30 में आपको 'Capital Protection Formula' मिलेगा, जिसमें आप कभी भी 1-2% से ज्यादा Risk नहीं लेंगे और 1:2+ R:R से 50% Win Rate पर भी भारी प्रॉफिट में रहेंगे।",
    };
  }

  return {
    diagnosis: "आप बहुत सारे Indicators और Telegram Calls के चक्रव्यूह में उलझे हुए हैं, जिससे दिमाग में कन्फ्यूजन और डर पैदा होता है।",
    solution: "Super Warrior 30 आपको 100% Indicator-Free '20% Clean Price Action & Liquidity' सिखाएगा, जिससे आप किसी गुरु पर निर्भर रहे बिना खुद के दम पर कॉन्फिडेंट ट्रेडर बन सकें।",
  };
}

export function QuizResult({ answers, onContinue }: QuizResultProps) {
  const { diagnosis, solution } = getRecommendation(answers);

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Brain className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            आपका Trader Psychology Profile तैयार है
          </h3>
          <p className="text-xs text-muted-foreground">
            80% Mindset + Risk Management Diagnostic Report
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
            {EXPERIENCE_LABELS[answers.tradingExperience] || answers.tradingExperience || "Trader"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Target Market
          </p>
          <p className="text-sm font-bold text-primary">
            {MARKET_LABELS[answers.targetMarket] || answers.targetMarket || "Forex & Crypto"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Primary Hurdle
          </p>
          <p className="text-sm font-bold text-amber-500">
            {CHALLENGE_LABELS[answers.mainChallenge] || answers.mainChallenge || "Psychology"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Loss Experience
          </p>
          <p className="text-sm font-bold text-red-500">
            {answers.lossRange === "none" ? "Zero Loss" : answers.lossRange ? `${answers.lossRange}` : "Experienced"}
          </p>
        </div>
      </div>

      {/* Diagnostic Callout */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
          <ShieldAlert className="h-4 w-4" />
          <span>🔍 आपका Psychology Diagnosis:</span>
        </div>
        <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed">
          {diagnosis}
        </p>

        <div className="border-t border-border/60 pt-2.5 mt-2 space-y-1">
          <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Super Warrior 30 Roadmap:
          </span>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {solution}
          </p>
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onContinue}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all cursor-pointer"
      >
        Super Warrior 30 का 80/20 सिस्टम देखें
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
