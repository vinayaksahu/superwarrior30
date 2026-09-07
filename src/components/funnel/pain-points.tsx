"use client";

import { AlertTriangle, Flame, ShieldAlert } from "lucide-react";

const PSYCHOLOGY_PAIN_POINTS = [
  {
    emoji: "😤",
    tag: "Revenge Trading Trap",
    title: "1 Loss हुआ नहीं कि दिमाग खो बैठते हैं",
    desc: "नुकसान रिकवर करने के चक्कर में बिना सोचे-समझे बड़ा Lot Size लगा देते हैं और पूरा Account खाली हो जाता है।",
  },
  {
    emoji: "🛑",
    tag: "Cutting Winners, Holding Losers",
    title: "Profit में जल्दी भागते हैं, Loss में बैठे रहते हैं",
    desc: "Profit में ₹500 दिखते ही डर के मारे Exit कर लेते हैं, लेकिन Loss में ₹5,000 तक उम्मीद में Trade पकड़े रहते हैं।",
  },
  {
    emoji: "🚀",
    tag: "FOMO (Fear Of Missing Out)",
    title: "Candle भागते देखकर बीच में कूद पड़ते हैं",
    desc: "जैसे ही कोई बड़ी Green/Red candle दिखती है, लगता है रैली छूट जाएगी — और ठीक Top या Bottom पर Entry लेकर फंस जाते हैं।",
  },
  {
    emoji: "⚖️",
    tag: "Zero Money Management",
    title: "Capital के हिसाब से Risk का कोई हिसाब नहीं",
    desc: "Account Size ₹10,000 है लेकिन Lot Size ऐसा कि 2 गलत ट्रेड में 50% कैपिटल स्वाहा। कोई Position Sizing रूल नहीं।",
  },
  {
    emoji: "🔄",
    tag: "The Overtrading Loop",
    title: "दिन भर Profit कमाया, शाम को सब गंवा दिया",
    desc: "सुबह 3 अच्छे ट्रेड करके ₹2,000 प्रॉफिट बनाया, लेकिन स्क्रीन बंद न करने की बीमारी के कारण शाम तक -₹3,000 में क्लोज किया।",
  },
  {
    emoji: "😵",
    tag: "Indicator Paralysis",
    title: "10 Indicators देखकर दिमाग में कन्फ्यूजन",
    desc: "RSI कुछ बोलता है, MACD कुछ और। हर दिन YouTube पर नई '100% Secret Strategy' ढूंढते हैं, लेकिन रिजल्ट वही लॉस।",
  },
  {
    emoji: "😨",
    tag: "Heart-Pounding Anxiety",
    title: "Trade लेते ही धड़कनें तेज और पसीना आना",
    desc: "क्योंकि पता ही नहीं है कि मैक्सिमम कितना नुकसान हो सकता है। कोई फिक्स्ड Stop Loss नहीं, सिर्फ भगवान भरोसे ट्रेडिंग।",
  },
  {
    emoji: "📞",
    tag: "Signal Dependency",
    title: "दूसरों के Telegram Calls पर निर्भर रहना",
    desc: "जब तक किसी 'Guru' की कॉल न आए, खुद से ट्रेड लेने का कॉन्फिडेंस नहीं होता — और उनकी कॉल पर भी अक्सर लॉस ही हाथ लगता है।",
  },
  {
    emoji: "📉",
    tag: "Missing 20% Technical Core",
    title: "Liquidity और Market Structure का असली सच नहीं पता",
    desc: "Smart Money कहाँ छोटे रिटेलर्स का Stop Loss हंट करता है, इसका लॉजिक समझे बिना बार-बार ट्रैप हो जाते हैं।",
  },
];

export function PainPoints() {
  return (
    <section className="py-16 md:py-24 border-b border-border/40 bg-card/30">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
        <div className="text-center space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>The Psychology Trap: 90% Traders Lose Here</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            क्या आपके साथ भी हर हफ्ते
            <br />
            <span className="text-primary">यही 9 गलतियाँ बार-बार हो रही हैं?</span>
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            सच यह है कि आपको कोई नई technical strategy नहीं चाहिए — आपकी सबसे बड़ी बीमारी <span className="text-foreground font-semibold">Uncontrolled Psychology और Zero Risk Management</span> है।
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PSYCHOLOGY_PAIN_POINTS.map((point, i) => (
            <div
              key={i}
              className="group rounded-2xl border border-border bg-card p-5 space-y-2.5 transition-all hover:border-amber-500/50 hover:bg-amber-500/5 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{point.emoji}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                  {point.tag}
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {point.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {point.desc}
              </p>
            </div>
          ))}
        </div>

        {/* The Golden Reality Banner */}
        <div className="mt-10 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-background to-primary/10 p-6 sm:p-8 text-center space-y-3">
          <span className="text-2xl">💡</span>
          <h3 className="text-lg sm:text-xl font-black text-foreground">
            "जब तक Risk Manage करना नहीं सीखोगे, दुनिया की सबसे अच्छी Strategy भी आपको अमीर नहीं बना सकती!"
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            Top 10% Profitable Traders का एक ही नियम है: <span className="text-foreground font-bold">First Protect Capital, Then Grow Capital</span>। Super Warrior 30 आपको इसी प्रोफेशनल माइंडसेट के साथ तैयार करता है।
          </p>
        </div>
      </div>
    </section>
  );
}
