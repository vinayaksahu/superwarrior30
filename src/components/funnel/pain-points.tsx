"use client";

import { AlertTriangle } from "lucide-react";

const PAIN_POINTS = [
  { emoji: "😤", text: "Trade लेते ही उल्टा चला जाता है" },
  { emoji: "🎯", text: "Entry कहाँ लें समझ नहीं आता" },
  { emoji: "🛑", text: "Stop Loss बार-बार hit होता है" },
  { emoji: "📉", text: "Market Trend समझने में problem" },
  { emoji: "😵", text: "बहुत सारे indicators देखकर confusion" },
  { emoji: "📞", text: "दूसरों की calls/signals पर dependency" },
  { emoji: "⚖️", text: "Risk Management की कमी" },
  { emoji: "🔄", text: "Profit के बाद भी वापस loss हो जाता है" },
  { emoji: "🧠", text: "Trading Psychology control नहीं रहती" },
];

export function PainPoints() {
  return (
    <section className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Common Trading Problems</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            अगर इनमें से कुछ आपके साथ होता है,
            <br />
            <span className="text-primary">तो आप अकेले नहीं हैं.</span>
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PAIN_POINTS.map((point, i) => (
            <div
              key={i}
              className="group flex items-center gap-3.5 rounded-xl border border-border bg-card p-4 transition-all hover:border-amber-500/40 hover:bg-amber-500/5"
            >
              <span className="text-2xl shrink-0">{point.emoji}</span>
              <span className="text-sm font-medium text-foreground group-hover:text-amber-200">
                {point.text}
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          ये सारी problems एक ही कारण से होती हैं — <span className="text-foreground font-semibold">Structured Learning की कमी</span>
        </p>
      </div>
    </section>
  );
}
