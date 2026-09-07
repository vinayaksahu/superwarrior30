"use client";

import {
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  FileText,
  HelpCircle,
  TrendingUp,
  BookMarked,
  UserCheck,
  Sparkles,
  ArrowRight,
  Target,
  Zap,
  Rocket,
  Flame,
  Scale,
  Crosshair,
  Lock,
} from "lucide-react";

export function MentorAssurance({ courseId }: { courseId?: string }) {
  const ecosystemItems = [
    {
      num: "01",
      icon: BookOpen,
      title: "Trading Basic to Advance Classes",
      desc: "बिल्कुल zero से लेकर institutional price action तक step-by-step masterclasses। किसी दूसरी जगह से कुछ भी सीखने की ज़रूरत नहीं।",
      badge: "Complete Foundation",
    },
    {
      num: "02",
      icon: FileText,
      title: "HD Video Lessons + PDF Study Material",
      desc: "हर क्लास के हाई-क्वालिटी वीडियो और साथ में डाउनलोडेबल PDF नोट्स, जिन्हें आप कभी भी रिविजन के लिए रेफर कर सकते हैं।",
      badge: "Lifetime Access",
    },
    {
      num: "03",
      icon: HelpCircle,
      title: "Quizzes & Practical Homework Assignments",
      desc: "हर टॉपिक के बाद आपकी समझ को टेस्ट करने के लिए Quizzes और चार्ट असाइनमेंट्स, ताकि आप अधूरा ज्ञान लेकर मार्केट में न कूदें।",
      badge: "Skill Verification",
    },
    {
      num: "04",
      icon: TrendingUp,
      title: "Systematic Capital Growth Blueprint",
      desc: "छोटे कैपिटल को बिना जुआ खेले 15-30 pts SL और 1:3 से 1:10+ R:R के साथ सेफली कंपाउंड करने का स्ट्रक्चर्ड फॉर्मूला।",
      badge: "Capital Protection",
    },
    {
      num: "05",
      icon: BookMarked,
      title: "In-App Student Trading Journal",
      desc: "आपके हर ट्रेड का डिजिटल रिकॉर्ड (Entry, Exit, SL, TP, R:R, Emotions और Mistakes)। कोई एक्सेल का झंझट नहीं, सीधे आपके पोर्टल में।",
      badge: "In-App Recording",
    },
    {
      num: "06",
      icon: UserCheck,
      title: "Mentor & Admin Direct Trade Tracking",
      desc: "एडमिन पैनल में मेंटर आपके हर जर्नल एंट्री को पर्सनली रिव्यू और ट्रैक करेंगे ताकि आपकी इमोशनल गलतियाँ तुरंत पकड़ी जा सकें।",
      badge: "Tracked by Admin",
    },
  ];

  return (
    <section id="mentor-assurance" className="py-16 md:py-24 border-b border-border/40 bg-gradient-to-b from-card/60 via-background to-card/60">
      <div className="container mx-auto px-4 sm:px-6 max-w-5xl space-y-12">
        {/* Top Mentor Quote Card */}
        <div className="rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-background p-6 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-lg">
                RW
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
                  Mentor's Personal Commitment
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-xs text-primary font-semibold">
                  Rahul • Founder & Lead Mentor, Rahul Trade Warrior Academy
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>100% Student Guidance Assurance</span>
            </div>
          </div>

          <blockquote className="text-base sm:text-lg md:text-xl font-medium text-foreground leading-relaxed italic">
            "जब आप हमारे Super Warrior 30 Mentorship Program से जुड़ते हैं, तो आपको Strategy और Trade ढूँढने की <strong>कोई टेंशन नहीं लेनी है</strong>। यहाँ आपको सिर्फ <strong>15-20-30 (Max) Points के Minor Stop-Loss</strong> के साथ <strong>1:2, 1:3 (Min)</strong> से लेकर <strong>1:5, 1:6 ... 1:10, 1:20, 1:30, 1:40... 'Sky High is the Limit'</strong> का असाधारण Risk-Reward ट्रेड मिलता है — वो भी <strong>60% से 90% की Average Accuracy</strong> के साथ! चाहे Scalping हो, Intraday हो या Swing Trading। असली चुनौती ट्रेड नहीं, बल्कि <strong>Psychology का Trap</strong> है — और उस ट्रैप से बाहर निकालना ही हम सिखाते हैं, वो भी प्रॉपर <strong>In-App Trading Journal System</strong> के साथ जो सीधे <strong>Mentor/Admin द्वारा ट्रैक</strong> किया जाता है!"
          </blockquote>

          {/* 4 Core Pillars of Asymmetric Trading */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3.5 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-primary">
                <Crosshair className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Minor SL</span>
              </div>
              <p className="text-base sm:text-lg font-black text-foreground">15 - 20 - 30 Pts</p>
              <p className="text-[10px] text-muted-foreground">Maximum चोक-प्रूफ छोटा SL</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-emerald-500">
                <Rocket className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Risk : Reward</span>
              </div>
              <p className="text-base sm:text-lg font-black text-emerald-500">1:2 to 1:40+</p>
              <p className="text-[10px] text-muted-foreground">Sky High Is The Limit!</p>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-amber-500">
                <Target className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider">Win-Rate</span>
              </div>
              <p className="text-base sm:text-lg font-black text-amber-500">60% - 90% Avg</p>
              <p className="text-[10px] text-muted-foreground">High-Probability Setups</p>
            </div>

            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3.5 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-sky-400">
                <Zap className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider">All Styles</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-foreground pt-1">Scalping • Day • Swing</p>
              <p className="text-[10px] text-muted-foreground">तीनों स्टाइल्स के लिए रेडी</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Zero Strategy & Trade Tension</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Psychology Trap Solution</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>In-App Journal Tracked by Admin</span>
            </div>
          </div>
        </div>

        {/* The Big Reality Box: Trade Tension Zero vs Psychology Trap */}
        <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card/80 to-background p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                <Flame className="h-3.5 w-3.5" />
                The Honest Truth About Trading
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-foreground mt-1">
                ट्रेड का टेंशन 0% है — असली ट्रैप केवल आपकी "Psychology" है!
              </h3>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-bold text-primary">
                <BookMarked className="h-3.5 w-3.5" />
                Live Journaling System
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <ShieldCheck className="h-5 w-5" />
                <span>1. Strategy & Trade Setup (हमारा काम):</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                मार्केट में ट्रेड कहाँ लेना है, कब लेना है और स्टॉप लॉस कहाँ रखना है — इसके लिए आपको कोई सिरदर्द नहीं लेना। हमारे प्रूवन इंस्टीट्यूशनल फॉर्मूले में सिर्फ <strong>15 से 30 पॉइंट्स (Max)</strong> का छोटा रिस्क होता है, और टारगेट <strong>1:3, 1:5 से लेकर 1:20, 1:40+ तक</strong> राइड किया जाता है। Scalping, Intraday और Swing तीनों में 60% से 90% की एवरेज एक्यूरेसी रहती है।
              </p>
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Scale className="h-5 w-5" />
                <span>2. The Psychology Trap & Training (आपका विकास):</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                ट्रेडर स्ट्रेटेजी की वजह से नहीं, बल्कि <strong>डर, लालच, इम्पेशेंस, FOMO और रिवेंज ट्रेडिंग</strong> की वजह से हारता है। इस प्रोग्राम में आपको उस साइकोलॉजिकल चक्रव्यूह से बाहर निकालने की सख्त ट्रेनिंग दी जाती है। आपके हर ट्रेड को हमारे <strong>In-App Trading Journal</strong> में दर्ज किया जाता है और <strong>Admin/Mentor द्वारा पर्सनली ट्रैक</strong> किया जाता है ताकि आप कभी अनुशासन न तोड़ें!
              </p>
            </div>
          </div>
        </div>

        {/* The 6 Pillars of the Mentorship Ecosystem */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              यहाँ आपको क्या-क्या मिलेगा?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
              यह केवल एक कोर्स नहीं, बल्कि एक ट्रेडर को शून्य से स्वतंत्र (Independent Profitable Warrior) बनाने का पूरा इकोसिस्टम है:
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystemItems.map((item) => (
              <div
                key={item.num}
                className="group rounded-2xl border border-border bg-card p-5 space-y-3 transition-all hover:border-primary/50 hover:bg-card/80 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono font-bold text-primary">Step {item.num}</span>
                  <span className="text-emerald-500 font-semibold">Included in LMS ✓</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The Loop-Breaker Graphic / Callout */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-4">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              The Transformation You Need
            </span>
            <h3 className="text-lg sm:text-xl font-black text-foreground">
              उस पुराने 'Loss & Revenge' लूप को हमेशा के लिए तोड़ें
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4 pt-2">
            {/* Old Loop */}
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
              <p className="text-xs font-bold text-red-500 uppercase">
                ❌ आपका पुराना लूप (बिना मेंटरशिप के):
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                YouTube Video देखा → बिना रिस्क मैनेजमेंट ट्रेड लिया → 1 Loss हुआ → गुस्सा आया → बड़ा Lot लगाकर Revenge Trade लिया → <strong>Account Blow</strong> → डिप्रेशन → फिर नया वीडियो!
              </p>
            </div>

            {/* New Warrior Loop */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <p className="text-xs font-bold text-emerald-500 uppercase">
                ✅ Super Warrior 30 लूप (मेंटरशिप के साथ):
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                15-30 Pts Minor SL और 1:3 से 1:20+ R:R Setup → <strong>In-App Trading Journal में रिकॉर्ड</strong> → <strong>Admin/Mentor द्वारा Live Tracking & Feedback</strong> → Psychology Trap ब्रेक → <strong>Disciplined Capital Growth!</strong>
              </p>
            </div>
          </div>

          <div className="pt-3 text-center">
            <a
              href="#offer"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-primary hover:underline cursor-pointer"
            >
              <span>इस सिस्टम का हिस्सा बनने के लिए एनरोलमेंट डिटेल्स देखें</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

