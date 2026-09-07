"use client";

import { Brain, ShieldCheck, TrendingUp, XCircle, CheckCircle2, Zap, Scale } from "lucide-react";

export function PsychologyBreakdown() {
  return (
    <section id="psychology-breakdown" className="py-16 md:py-24 border-b border-border/40 bg-muted/10">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-12">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            <Scale className="h-3.5 w-3.5" />
            <span>The 80/20 Law of Trading</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            Trading 80% Psychology और 20% Technical का खेल है
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            जब तक आप इस कड़वे सच को स्वीकार नहीं करेंगे, तब तक आप हर महीने अपनी गाढ़ी कमाई मार्केट में लुटाते रहेंगे।
          </p>
        </div>

        {/* 80/20 Visual Bar */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Super Warrior 30 Success Formula
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                80% फोकस Mindset और Capital Protection पर • 20% फोकस High-Probability Price Action पर
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full bg-primary/15 text-primary border border-primary/30 px-3 py-1 text-xs font-bold whitespace-nowrap">
                80% Psychology & Risk
              </span>
              <span className="rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 px-3 py-1 text-xs font-bold whitespace-nowrap">
                20% Technicals
              </span>
            </div>
          </div>

          {/* Visual Percentage Bar */}
          <div className="space-y-2.5">
            <div className="h-10 sm:h-11 w-full rounded-2xl overflow-hidden flex shadow-inner border border-border/80 bg-muted/30 p-1">
              <div
                className="bg-gradient-to-r from-amber-500 via-primary to-amber-400 rounded-xl flex items-center justify-center text-black font-black px-2 transition-all shadow-sm select-none"
                style={{ width: "80%" }}
              >
                <span className="hidden sm:inline text-xs font-black tracking-wider uppercase whitespace-nowrap">
                  80% PSYCHOLOGY & MONEY MANAGEMENT
                </span>
                <span className="sm:hidden text-[11px] font-black tracking-tight uppercase whitespace-nowrap">
                  80% PSYCHOLOGY & RISK
                </span>
              </div>
              <div
                className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-xl flex items-center justify-center text-white font-black px-1.5 transition-all shadow-sm ml-1 select-none"
                style={{ width: "20%" }}
              >
                <span className="text-[10px] sm:text-xs font-black tracking-tight sm:tracking-wider uppercase whitespace-nowrap">
                  20% TECH
                </span>
              </div>
            </div>

            {/* Clear Sub-Labels on mobile & desktop */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] sm:text-xs font-semibold px-0.5">
              <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1.5 font-bold">
                <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                80% Mindset, Discipline & Risk Management
              </span>
              <span className="text-sky-500 dark:text-sky-400 flex items-center gap-1.5 font-bold">
                <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                20% High-Probability Setups
              </span>
            </div>
          </div>

          {/* 3 Pillars Grid */}
          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            {/* Pillar 1 */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Brain className="h-4 w-4" />
                <span>40% Emotional Control</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Zero FOMO & Zero Revenge Trading</li>
                <li>Losses को बिज़नेस कॉस्ट मानना</li>
                <li>Screen से दूर जाने का Discipline</li>
                <li>Overtrading को रोकने की सख्त SOP</li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
                <ShieldCheck className="h-4 w-4" />
                <span>40% Risk & Money Management</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Fixed 1% to 2% Risk per trade rule</li>
                <li>1:2 से 1:3+ Minimum Risk-to-Reward</li>
                <li>Exact Position Sizing & Lot Calculation</li>
                <li>Daily Drawdown Stop (Account Protector)</li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <TrendingUp className="h-4 w-4" />
                <span>20% Clean Price Action</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Zero Indicators (No RSI, No MACD)</li>
                <li>Pure Market Structure & Trends</li>
                <li>Key Support, Resistance & Liquidity</li>
                <li>Rule-based Entry & Exit Triggers</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Side by Side: 90% Losers vs Top 10% Warriors */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: 90% Loser Mindset */}
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-500 font-bold text-base">
              <XCircle className="h-5 w-5" />
              <span>90% Losing Traders (Indicator Trap)</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>हर हफ्ते YouTube पर नई '100% Secret Holy Grail' Strategy ढूंढना।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>Loss होते ही आगबबूला होकर Revenge Trade लेना और बड़ा Lot Size लगाना।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>Profit में ₹200-₹500 में भाग जाना, लेकिन Loss में ₹5,000 तक उम्मीद में बैठे रहना।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 font-bold shrink-0">✕</span>
                <span>बिना किसी गणित के मनमर्जी का Lot Size लगाना और 1 दिन में अकाउंट उड़ाना।</span>
              </li>
            </ul>
          </div>

          {/* Right: Top 10% Super Warriors */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-base">
              <CheckCircle2 className="h-5 w-5" />
              <span>Top 10% Super Warrior Traders (Psychology First)</span>
            </div>
            <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span><strong>Pre-defined Risk</strong>: Trade लेने से पहले पता होता है कि कितना खोने को तैयार हैं।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span><strong>1:2+ R:R Formula</strong>: अगर 50% ट्रेड भी गलत हुए, तो भी Account Profitable रहेगा।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span><strong>Zero Revenge Trading</strong>: Stop loss hit होने पर चुपचाप शांति से स्क्रीन बंद करना।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span><strong>Clean Price Action</strong>: किसी पेड इंडिकेटर या कॉल प्रोवाइडर पर ₹1 भी खर्च न करना।</span>
              </li>
            </ul>
          </div>
        </div>

        {/* The 60-90% Win Rate & Asymmetric R:R Math Callout */}
        <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card via-primary/5 to-card p-6 sm:p-8 space-y-5 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-black text-primary uppercase">
            ⚡ Asymmetric Risk-Reward Math
          </div>
          <h3 className="text-lg sm:text-2xl font-black text-foreground">
            15-30 Pips Minor SL और 1:3 से 1:40+ Sky High R:R का जादुई गणित!
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            Super Warrior 30 में आपको <strong>60% से 90% की Average Accuracy</strong> वाले Institutional Setups मिलते हैं। जब आपका SL सिर्फ 15 से 30 Pips का होता है, तो आपका नुकसान न के बराबर होता है और एक अकेला 1:10 या 1:20 ट्रेड दर्जनों छोटे नुकसानों को एक झटके में कवर कर देता है:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto py-2">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Minor SL Loss (3 Trades)</p>
              <p className="text-sm sm:text-base font-black text-red-500">- ₹1,500</p>
              <p className="text-[10px] text-red-400">सिर्फ ₹500/trade का छोटा रिस्क</p>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">7 Won Trades (1:5 to 1:20 Avg)</p>
              <p className="text-sm sm:text-base font-black text-emerald-500">+ ₹21,000</p>
              <p className="text-[10px] text-emerald-400">Sky High R:R Targets</p>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Net Result</p>
              <p className="text-sm sm:text-base font-black text-primary">+ ₹19,500 PROFIT</p>
              <p className="text-[10px] text-primary">70% Win-Rate पर Massive Profit!</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-medium max-w-2xl mx-auto">
            इसलिए ट्रेड और सेटअप की कोई टेंशन नहीं है। आपका असली काम <strong>अपनी Psychology और अनुशासन को काबू में रखना</strong> है — और यही आपको हमारे <span className="text-foreground font-bold">In-App Trading Journal</span> के साथ सिखाया जाता है, जिसे सीधे <span className="text-primary font-bold">Admin/Mentor द्वारा ट्रैक</span> किया जाता है!
          </p>
        </div>
      </div>
    </section>
  );
}
