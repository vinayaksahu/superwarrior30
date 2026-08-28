"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, User, Mail, Phone, MessageCircle } from "lucide-react";
import { submitQuizAction } from "@/server/actions/lead.actions";

interface QuizWidgetProps {
  courseId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  onComplete?: (leadId: string, answers: Record<string, string>) => void;
}

const QUESTIONS = [
  {
    id: "tradingExperience",
    title: "आपका Trading Experience?",
    options: [
      { value: "beginner", label: "बिल्कुल Beginner हूँ", emoji: "🌱" },
      { value: "6months", label: "6 महीने से कम", emoji: "📊" },
      { value: "6m-1y", label: "6 महीने – 1 साल", emoji: "📈" },
      { value: "1-3y", label: "1–3 साल", emoji: "💹" },
      { value: "3y+", label: "3 साल से अधिक", emoji: "🏆" },
    ],
  },
  {
    id: "targetMarket",
    title: "आप किस Market में सीखना चाहते हैं?",
    options: [
      { value: "forex", label: "Forex", emoji: "💱" },
      { value: "crypto", label: "Crypto", emoji: "₿" },
      { value: "gold", label: "Gold", emoji: "🥇" },
      { value: "all", label: "सभी", emoji: "🌍" },
    ],
  },
  {
    id: "mainChallenge",
    title: "अभी आपकी सबसे बड़ी Trading Problem क्या है?",
    options: [
      { value: "entry-exit", label: "Entry & Exit समझ नहीं आता", emoji: "🎯" },
      { value: "stoploss", label: "Stop Loss बार-बार hit होता है", emoji: "🛑" },
      { value: "trend", label: "Market Trend समझने में problem", emoji: "📉" },
      { value: "risk", label: "Risk Management की कमी", emoji: "⚖️" },
      { value: "psychology", label: "Trading Psychology control नहीं", emoji: "🧠" },
      { value: "dependency", label: "Signals/Calls पर dependency", emoji: "📞" },
    ],
  },
  {
    id: "lossRange",
    title: "अभी तक Trading में कितना Loss हुआ है?",
    options: [
      { value: "none", label: "कोई Loss नहीं", emoji: "✅" },
      { value: "1-100", label: "$1 से $100", emoji: "💸" },
      { value: "100-500", label: "$100 से $500", emoji: "💰" },
      { value: "500-1000", label: "$500 से $1000", emoji: "📊" },
      { value: "1000-5000", label: "$1000 से $5000", emoji: "⚠️" },
      { value: "5000+", label: "$5000 से above", emoji: "🔴" },
    ],
  },
  {
    id: "learningGoals",
    title: "आप क्या सीखना चाहते हैं?",
    multi: true,
    options: [
      { value: "basics", label: "Trading Basics", emoji: "📖" },
      { value: "trend", label: "Market Trend", emoji: "📈" },
      { value: "snr", label: "Support & Resistance", emoji: "🧱" },
      { value: "liquidity", label: "Liquidity Trading", emoji: "💧" },
      { value: "candle", label: "Candlestick Confirmation", emoji: "🕯️" },
      { value: "entry-exit", label: "Entry & Exit", emoji: "🎯" },
      { value: "risk", label: "Risk : Reward", emoji: "⚖️" },
      { value: "money", label: "Money Management", emoji: "💵" },
      { value: "live", label: "Live Trading Practice", emoji: "🖥️" },
      { value: "psychology", label: "Trading Psychology", emoji: "🧠" },
      { value: "all", label: "सभी", emoji: "🌟" },
    ],
  },
  {
    id: "readyForTraining",
    title: "क्या आप structured training के लिए ready हैं?",
    options: [
      { value: "yes", label: "हाँ, मैं Join करना चाहता/चाहती हूँ", emoji: "🚀" },
      { value: "info", label: "मुझे पहले और जानकारी चाहिए", emoji: "ℹ️" },
    ],
  },
];

export function QuizWidget({
  courseId,
  utmSource,
  utmMedium,
  utmCampaign,
  utmContent,
  onComplete,
}: QuizWidgetProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [multiSelections, setMultiSelections] = useState<string[]>([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactInfo, setContactInfo] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
  });

  const totalSteps = QUESTIONS.length;
  const progress = showContactForm
    ? 100
    : Math.round(((currentStep + 1) / (totalSteps + 1)) * 100);

  const currentQuestion = QUESTIONS[currentStep];

  const handleOptionSelect = (value: string) => {
    if (currentQuestion?.multi) {
      // Toggle multi-select
      if (value === "all") {
        setMultiSelections(["all"]);
      } else {
        setMultiSelections((prev) => {
          const filtered = prev.filter((v) => v !== "all");
          return filtered.includes(value)
            ? filtered.filter((v) => v !== value)
            : [...filtered, value];
        });
      }
    } else {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
      // Auto-advance after a short delay
      setTimeout(() => {
        if (currentStep < totalSteps - 1) {
          setCurrentStep((s) => s + 1);
        } else {
          // Save multi answers if any
          setShowContactForm(true);
        }
      }, 300);
    }
  };

  const handleNext = () => {
    if (currentQuestion?.multi && multiSelections.length > 0) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: multiSelections.join(", "),
      }));
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setShowContactForm(true);
    }
  };

  const handleBack = () => {
    if (showContactForm) {
      setShowContactForm(false);
    } else if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitQuizAction({
        ...contactInfo,
        tradingExperience: answers.tradingExperience,
        targetMarket: answers.targetMarket,
        mainChallenge: answers.mainChallenge,
        lossRange: answers.lossRange,
        learningGoals: answers.learningGoals,
        readyForTraining: answers.readyForTraining,
        courseId,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
      });

      if (result.success && result.leadId) {
        onComplete?.(result.leadId, answers);
      }
    } catch {
      // silently fail
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = currentQuestion?.multi
    ? multiSelections.length > 0
    : !!answers[currentQuestion?.id];

  if (showContactForm) {
    return (
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>अंतिम Step</span>
            <span>100%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: "100%" }} />
          </div>
        </div>

        <h3 className="text-xl font-bold text-foreground">
          अपनी Details भरें
        </h3>
        <p className="text-sm text-muted-foreground">
          आपका personalized Trading Profile तैयार है। Result देखने के लिए अपनी details दें।
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" /> Full Name *
            </label>
            <input
              type="text"
              required
              value={contactInfo.name}
              onChange={(e) => setContactInfo((p) => ({ ...p, name: e.target.value }))}
              placeholder="आपका नाम"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" /> Email *
            </label>
            <input
              type="email"
              required
              value={contactInfo.email}
              onChange={(e) => setContactInfo((p) => ({ ...p, email: e.target.value }))}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" /> Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={contactInfo.phone}
                onChange={(e) => setContactInfo((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+91 XXXXX XXXXX"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp Number
              </label>
              <input
                type="tel"
                value={contactInfo.whatsapp}
                onChange={(e) => setContactInfo((p) => ({ ...p, whatsapp: e.target.value }))}
                placeholder="Same as mobile?"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1 rounded-xl border border-border px-4 py-3 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !contactInfo.name || !contactInfo.email || !contactInfo.phone}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> अपना Trading Profile देखें →
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h3 className="text-xl font-bold text-foreground">
        {currentQuestion.title}
      </h3>

      {currentQuestion.multi && (
        <p className="text-xs text-muted-foreground">एक या अधिक select करें</p>
      )}

      {/* Options Grid */}
      <div className={`grid gap-3 ${currentQuestion.options.length <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
        {currentQuestion.options.map((option) => {
          const isSelected = currentQuestion.multi
            ? multiSelections.includes(option.value)
            : answers[currentQuestion.id] === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleOptionSelect(option.value)}
              className={`group relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
              }`}
            >
              <span className="text-2xl shrink-0">{option.emoji}</span>
              <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                {option.label}
              </span>
              {isSelected && (
                <CheckCircle2 className="h-5 w-5 text-primary absolute top-3 right-3" />
              )}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-1 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        {currentQuestion.multi && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed}
            className="flex items-center gap-1 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
