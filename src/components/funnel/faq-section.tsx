"use client";

const FAQS = [
  {
    q: "Trading 80% Psychology और केवल 20% Technicals क्यों कही जाती है?",
    a: "क्योंकि दुनिया की सबसे बेहतरीन Technical Strategy भी तब फेल हो जाती है जब ट्रेडर के पास Emotional Control नहीं होता। 90% ट्रेडर्स चार्ट देखकर नहीं, बल्कि 1 Loss के बाद Revenge Trade लेने, जल्दी Profit बुक करने, बड़े Losses को पकड़े रहने और ओवरट्रेडिंग करने के कारण अपना पूरा कैपिटल गंवाते हैं।",
  },
  {
    q: "क्या Super Warrior 30 से मेरी Revenge Trading और Overtrading की आदत छूटेगी?",
    a: "हाँ, बिल्कुल! प्रोग्राम में आपको एक सख्त 'Disciplined Execution Protocol' और Daily Drawdown Rule सिखाया जाता है। आपको पता होगा कि दिन में मैक्सिमम कितने ट्रेड्स लेने हैं, और कब बिना किसी पछतावे के स्क्रीन बंद करनी है।",
  },
  {
    q: "क्या छोटे कैपिटल (जैसे ₹5,000 या $50) में Risk Management मुमकिन है?",
    a: "हाँ, यही सबसे बड़ा भ्रम है कि रिस्क मैनेजमेंट सिर्फ बड़े कैपिटल वालों के लिए है। अगर आप ₹5,000 के अकाउंट को मैनेज नहीं कर सकते, तो आप ₹5 लाख के अकाउंट को भी 1 दिन में उड़ा देंगे। हम आपको Micro Lots और Exact Position Sizing का गणित सिखाते हैं जिससे आपका छोटा कैपिटल भी सेफ रहे।",
  },
  {
    q: "क्या मुझे बहुत सारे Indicators (RSI, MACD, आदि) सीखने पड़ेंगे?",
    a: "बिल्कुल नहीं! Super Warrior 30 100% Indicator-Free Price Action सिखाता है। इंडिकेटर्स हमेशा मार्केट से लैग (देरी से) चलते हैं। हम आपको सिर्फ 20% कोर टेक्निकल सिखाते हैं: Market Structure, Liquidity Sweeps और Support & Resistance — एकदम साफ़ और क्लीन चार्ट्स।",
  },
  {
    q: "अगर मेरा Win Rate सिर्फ 50% या 45% हो, तो क्या मैं प्रॉफिटेबल बन सकता हूँ?",
    a: "हाँ! क्योंकि हम 1:2 से 1:3+ Risk-to-Reward Ratio पर काम करते हैं। जब लॉस होगा तो केवल ₹500 जाएगा, लेकिन जब प्रॉफिट होगा तो ₹1,000 से ₹1,500 आएगा। इस गणित के साथ 50% Win Rate पर भी आपका अकाउंट महीने के अंत में शानदार प्रॉफिट में रहेगा।",
  },
  {
    q: "क्या यह Forex, Crypto और Gold तीनों मार्केट्स में काम करता है?",
    a: "हाँ। इंसानी मनोविज्ञान (Human Psychology), डर और लालच हर मार्केट में एक जैसा ही होता है। चाहे आप Forex (EUR/USD, GBP/USD), Gold (XAU/USD) या Crypto (Bitcoin, Ethereum) ट्रेड करें — 80/20 Psychology और Price Action का यह नियम हर जगह समान रूप से काम करता है।",
  },
  {
    q: "अगर मैं पहले ट्रेडिंग में भारी नुकसान (Loss) कर चुका हूँ तो?",
    a: "अगर आप लॉस कर चुके हैं, तो बधाई हो — अब आप सीखने के लिए सबसे सही स्थिति में हैं! क्योंकि अब आपको समझ आ चुका है कि बिना Psychology और Risk Management के मार्केट में टिकना नामुमकिन है। Super Warrior 30 आपको एक नए अनुशासित माइंडसेट के साथ रिस्टार्ट करने में मदद करेगा।",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="py-16 md:py-24 border-b border-border/40 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 max-w-3xl space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground">
            अक्सर पूछे जाने वाले सवाल (FAQs)
          </h2>
          <p className="text-sm text-muted-foreground">
            Trading Psychology, Risk Management & Super Warrior 30 से जुड़े अहम सवाल
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-border bg-card p-5 transition-all open:border-primary/40 open:bg-primary/5 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-foreground">
                <span>{faq.q}</span>
                <span className="transition-transform group-open:rotate-180 text-primary font-bold ml-2 shrink-0">
                  ↓
                </span>
              </summary>
              <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
