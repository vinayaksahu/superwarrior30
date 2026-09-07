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
      desc: "छोटे कैपिटल (₹5,000 - ₹20,000) को बिना जुआ खेले 1:2+ Risk:Reward और Position Sizing के साथ धीरे-धीरे कंपाउंड करने का गणित।",
      badge: "Capital Protection",
    },
    {
      num: "05",
      icon: BookMarked,
      title: "In-App Student Trading Journal",
      desc: "आपके हर ट्रेड का डिजिटल रिकॉर्ड (Entry, Exit, R:R, Screenshot, Emotions और Mistakes)। कोई एक्सेल शीट का झंझट नहीं, सीधे LMS में।",
      badge: "Trade Recording",
    },
    {
      num: "06",
      icon: UserCheck,
      title: "Mentor Direct Trade Review & Tracking",
      desc: "एडमिन पैनल में मेंटर आपके ट्रेड्स और जर्नल को पर्सनली रिव्यू करेंगे ताकि आप अपनी गलतियों को पकड़ सकें और उन्हें दोहराना बंद करें।",
      badge: "Direct Guidance",
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
            "जब आप हमारे Super Warrior 30 Mentorship Program से जुड़ते हैं, तो आपको Strategy और Trade ढूँढने की कोई टेंशन नहीं लेनी है। मेरा मक़सद आपको सिर्फ वीडियोज बेचकर छोड़ देना नहीं है — आपको एक ऐसा संपूर्ण सिस्टम देना है जहाँ आपके हर ट्रेड का रिकॉर्ड रखा जाएगा, आपकी गलतियाँ पकड़ी जाएंगी, और आपको उस लॉस व ओवरट्रेडिंग के चक्रव्यूह से हमेशा के लिए बाहर निकाला जाएगा!"
          </blockquote>

          <div className="grid sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold">
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Zero Strategy Confusion</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Every Trade Recorded & Tracked</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>End-to-End Handholding System</span>
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
                Clean Setup समझा → 1-2% Risk कैलकुलेट किया → ट्रेड लिया → <strong>Trading Journal में रिकॉर्ड किया</strong> → मेंटर का फीडबैक मिला → गलतियाँ सुधरीं → <strong>Disciplined Capital Growth!</strong>
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
