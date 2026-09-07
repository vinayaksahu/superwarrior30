import Link from "next/link";
import {
  Coins,
  TrendingUp,
  Users,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
  Lock,
  Wallet,
} from "lucide-react";

interface DualIncomeOpportunityProps {
  courseId?: string;
  isHomePage?: boolean;
}

export function DualIncomeOpportunity({
  courseId,
  isHomePage = false,
}: DualIncomeOpportunityProps) {
  return (
    <section id="dual-income" className="py-16 md:py-24 border-b border-border/40 bg-gradient-to-b from-background via-amber-500/[0.03] to-background relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-black text-amber-500 uppercase tracking-wider shadow-sm">
            <Coins className="h-3.5 w-3.5" />
            <span>The Real Psychology Hack • Dual Income System</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
            शुरुआत में <span translate="no" className="notranslate">Trading Psychology</span> मजबूत रखने के लिए{" "}
            <span translate="no" className="notranslate bg-gradient-to-r from-amber-500 via-primary to-emerald-400 bg-clip-text text-transparent">
              2nd Source of Income
            </span>{" "}
            होना अनिवार्य है!
          </h2>

          <p className="text-xs sm:text-base text-muted-foreground leading-relaxed">
            अन्यथा एक छोटी सी गलती या लॉस आपकी पूरी ट्रेडिंग जर्नी को सालों पीछे धकेल सकती है।
            जानिए कैसे <span translate="no" className="notranslate font-bold">Super Warrior 30</span> आपको <strong translate="no" className="notranslate">Active Trading</strong> के साथ <strong translate="no" className="notranslate">100% Free Affiliate Passive Income</strong> का सुरक्षित बैकअप देता है:
          </p>
        </div>

        {/* The Brutal Reality vs Super Warrior 30 Solution */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: The Single Income Trap */}
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 sm:p-8 space-y-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-3 text-destructive font-bold text-base sm:text-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <span>खतरा: जब ट्रेडिंग ही आपकी एकमात्र उम्मीद हो</span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              अगर आपके पास कोई <strong>2nd Source of Income</strong> नहीं है, तो आपका दिमाग लगातार पैसे खोने के डर (Fear of Loss) में रहता है।
            </p>

            <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-black shrink-0 mt-0.5">✕</span>
                <span><strong>Fear & Desperation:</strong> जब हर महीने घर का खर्च या ईएमआई ट्रेडिंग से निकालनी हो, तो आप जबरदस्ती गलत ट्रेड्स में कूदते हैं।</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-black shrink-0 mt-0.5">✕</span>
                <span><strong>One Mistake Destroys Everything:</strong> एक दिन का इमोशनल ब्रेकडाउन या ओवरट्रेडिंग आपके महीनों की मेहनत और पूरे कैपिटल को खत्म कर देती है।</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-destructive font-black shrink-0 mt-0.5">✕</span>
                <span><strong>Revenge Trading Loop:</strong> खोए हुए पैसे वापस पाने की जल्दबाजी में आप लॉट साइज बड़ा करते हैं और पूरा अकाउंट खाली कर बैठते हैं।</span>
              </li>
            </ul>
          </div>

          {/* Card 2: Super Warrior 30 Free Affiliate Engine */}
          <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-card via-emerald-500/5 to-card p-6 sm:p-8 space-y-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-3 text-emerald-500 font-bold text-base sm:text-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <span>समाधान: 100% Free Super Warrior 30 Affiliate Opportunity</span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              जिनके पास <strong>ट्रेडिंग के लिए कैपिटल नहीं है</strong> या अभी <strong>कोर्स बाय करने के पैसे नहीं हैं</strong> — उनके लिए Super Warrior 30 एक बहुत बड़ा अवसर प्रदान कर रहा है:
            </p>

            <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>100% Free Registration:</strong> आप बिना ₹1 भी खर्च किए सीधे Affiliate Partner के रूप में फ्री में रजिस्टर कर सकते हैं।</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Affiliate Team Passive Income:</strong> डायरेक्ट रेफरल के साथ-साथ आपकी टीम के नेटवर्क से आपको <strong>Lifetime Passive Income</strong> आती रहती है।</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Zero-Stress Capital Growth:</strong> एफिलिएट से कमाए गए पैसों से आप अपना ट्रेडिंग कैपिटल तैयार कर सकते हैं और बिना किसी मानसिक दबाव के ट्रेड कर सकते हैं!</span>
              </li>
            </ul>
          </div>
        </div>

        {/* The Dual Engine Synergy: Active + Passive */}
        <div className="rounded-3xl border-2 border-primary/30 bg-card p-6 sm:p-10 shadow-xl space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary">
              The Warrior Dual Income Engine
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-foreground">
              <span translate="no" className="notranslate">Active Income + Passive Income</span> = 100% Stress-Free Trading!
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              इस तरह आपके पास एक्टिव और पैसिव दोनों तरह की इनकम चालू हो जाएगी, जिससे ट्रेडिंग में आपका माइंडसेट हमेशा शांत और रोबोटिक रहेगा:
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Stream 1 */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <TrendingUp className="h-5 w-5" />
                <span translate="no" className="notranslate">1. Active Income (Super Warrior 30 Trading):</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <span translate="no" className="notranslate font-bold">Super Warrior 30</span> के प्रूवन इंस्टीट्यूशनल फॉर्मूले (<span translate="no" className="notranslate">15-30 Pips Minor SL</span> और <span translate="no" className="notranslate">1:3 से 1:40+ Sky High R:R</span>) से लाइव मार्केट में <span translate="no" className="notranslate">Scalping, Intraday</span> और <span translate="no" className="notranslate">Swing ट्रेड्स</span> करके खुद का कैपिटल ग्रो करें।
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">15-30 Pips Minor SL</span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">1:3 to 1:40+ R:R</span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Live Journal Tracking</span>
              </div>
            </div>

            {/* Stream 2 */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-3">
              <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                <Users className="h-5 w-5" />
                <span>2. Passive Income (Affiliate Team Network):</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                अपने दोस्तों और सोशल मीडिया पर अपनी फ्री लिंक शेयर करें। आपकी टीम बनते ही आपको हर सेल और टीम एक्टिविटी से पैसिव कमीशन्स मिलते हैं, जो सीधे आपके बैंक अकाउंट में ट्रांसफर होते हैं।
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">100% Free Joining</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Team Passive Rewards</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Lifetime Payouts</span>
              </div>
            </div>
          </div>

          {/* Golden Takeaway Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 text-center">
            <p className="text-xs sm:text-sm font-bold text-foreground">
              💡 <span className="text-amber-500">गोल्डन रूल:</span> जब बैकअप में पैसे आ रहे होते हैं, तो ट्रेडिंग में कभी भी डर या जल्दबाजी नहीं होती। इसी मानसिक आज़ादी से 90% लूज़र ट्रेडर्स एक प्रोफ़िटेबल सुपर वॉरियर बनते हैं!
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/register"
              className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 sm:px-8 py-3 text-xs sm:text-sm font-black text-white text-center shadow-xl shadow-emerald-500/25 transition-all hover:bg-emerald-600 hover:scale-[1.02] cursor-pointer"
            >
              <Wallet className="h-4 w-4 shrink-0" />
              <span className="leading-snug">Free Affiliate Program में Join करें (Zero Investment)</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>

            {isHomePage ? (
              <Link
                href="/super-warrior-30"
                className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 sm:px-8 py-3 text-xs sm:text-sm font-bold text-center shadow transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <span>Super Warrior 30 Mentorship देखें</span>
              </Link>
            ) : (
              <a
                href="#offer"
                className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 sm:px-8 py-3 text-xs sm:text-sm font-bold text-center shadow transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <span>Super Warrior 30 Mentorship जॉइन करें</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
