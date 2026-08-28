"use client";

const FAQS = [
  {
    q: "क्या मैं बिल्कुल Beginner हूँ तो Join कर सकता हूँ?",
    a: "बिल्कुल। Super Warrior 30 की शुरुआत Trading Basics से होती है। आपको बिल्कुल zero से step-by-step सिखाया जाता है। पहले concept, फिर chart analysis, फिर practice।",
  },
  {
    q: "क्या मुझे पहले से Trading आती होना जरूरी है?",
    a: "नहीं। ये program इसी लिए बनाया गया है कि जो लोग अभी शुरू कर रहे हैं या जिनकी foundation कमज़ोर है, वो structured तरीके से सीख सकें।",
  },
  {
    q: "क्या Forex के साथ Gold और Crypto भी समझाया जाएगा?",
    a: "हाँ। Program में Forex, Crypto और Gold तीनों markets का analysis cover किया जाता है — एक ही methodology के साथ।",
  },
  {
    q: "क्या सिर्फ theory होगी या practical chart learning भी होगी?",
    a: "Super Warrior 30 में practical chart-based learning पर focus है। हर concept को real charts पर explain किया जाता है और Live Market Practice module भी शामिल है।",
  },
  {
    q: "क्या मुझे कोई special indicator खरीदना पड़ेगा?",
    a: "नहीं। किसी भी paid indicator की जरूरत नहीं है। Program pure price action और market structure पर based है।",
  },
  {
    q: "अगर मैं पहले Trading में loss कर चुका हूँ तो?",
    a: "ज्यादातर traders loss करते हैं क्योंकि उनके पास structured approach नहीं होता। ये program आपको systematic methodology, risk management और disciplined execution सिखाता है ताकि आप informed decisions ले सकें।",
  },
  {
    q: "क्या course पूरा करने के बाद मुझे तुरंत profit होगा?",
    a: "कोई भी legitimate trading education program guaranteed profits का promise नहीं कर सकता। Trading में risk होता है। ये program education, structured methodology, risk management और practice पर focus करता है — ताकि आप better informed trader बन सकें।",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24 border-b border-border/40">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            अक्सर पूछे जाने वाले सवाल
          </h2>
          <p className="text-sm text-muted-foreground">
            Common questions about Super Warrior 30
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group rounded-xl border border-border bg-card p-5 transition-colors open:border-primary/40 open:bg-primary/5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-foreground">
                <span>{faq.q}</span>
                <span className="transition-transform group-open:rotate-180 text-muted-foreground ml-2 shrink-0">
                  ↓
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
