"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Shield,
  Phone,
  Send,
  Image as ImageIcon,
  Check,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { submitJoinCommunityAction } from "@/server/actions/broker.actions";
import type { PublicBrokerConfig } from "@/server/actions/broker.actions";

interface ExistingClaim {
  id: string;
  brokerName: string;
  brokerMemberId: string;
  proofUrl: string | null;
  verificationStatus: string;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  createdAt: Date;
  telegramUsername?: string | null;
  phone?: string | null;
  hasPurchasedCourse?: boolean;
  telegramCommunityLink?: string | null;
}

interface JoinCommunityClientProps {
  brokerConfig: PublicBrokerConfig;
  existingClaim: ExistingClaim | null;
  hasPurchasedCourse: boolean;
  userPhone?: string;
}

export function JoinCommunityClient({
  brokerConfig,
  existingClaim,
  hasPurchasedCourse,
  userPhone = "",
}: JoinCommunityClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Broker is mandatory if:
  // - User has purchased course AND admin set isBrokerMandatoryForPaidUsers = true
  // - OR user is free signup AND isBrokerMandatoryForFreeUsers !== false
  const isBrokerRequired = hasPurchasedCourse
    ? Boolean(brokerConfig.isBrokerMandatoryForPaidUsers)
    : brokerConfig.isBrokerMandatoryForFreeUsers !== false;

  const [telegramUsername, setTelegramUsername] = useState("");
  const [phone, setPhone] = useState(userPhone);
  const [showBrokerOptional, setShowBrokerOptional] = useState(isBrokerRequired);
  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeBrokers = (brokerConfig.brokers || []).filter((b) => b.isActive);
  const currentBroker = activeBrokers.find((b) => b.id === selectedBroker);

  // If already submitted / existing claim
  if (existingClaim) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-400" />
            Join Community
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Premium Telegram Community Access Status
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {existingClaim.verificationStatus === "VERIFIED" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-400">Access Approved &amp; Verified! 🎉</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your details have been verified by our team. You now have access to the Super Warrior 30 Premium Telegram Community.
                  </p>
                </div>
              </div>

              {existingClaim.telegramCommunityLink ? (
                <a
                  href={existingClaim.telegramCommunityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm py-3.5 px-6 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  Join Premium Telegram Group Now
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  Admin has verified your Telegram username ({existingClaim.telegramUsername || "N/A"}). You will be added directly to the group.
                </div>
              )}
            </div>
          )}

          {existingClaim.verificationStatus === "PENDING" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <Clock className="h-6 w-6 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-amber-400">Verification Pending ⏳</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your Telegram and account details have been submitted and are under review by our admin team. Once verified, you will receive access to the Premium Telegram Community.
                </p>
              </div>
            </div>
          )}

          {existingClaim.verificationStatus === "REJECTED" && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <XCircle className="h-6 w-6 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-red-400">Submission Rejected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {existingClaim.rejectionReason || "Your submission was rejected. Please contact support or resubmit with valid details."}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground">Telegram Username</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {existingClaim.telegramUsername || "Submitted"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground">Phone / WhatsApp</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {existingClaim.phone || "Submitted"}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 border border-border/50">
              <p className="text-[11px] font-semibold text-muted-foreground">Broker &amp; Member ID</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {existingClaim.brokerName} {existingClaim.brokerMemberId && existingClaim.brokerMemberId !== "COURSE_STUDENT" && existingClaim.brokerMemberId !== "DIRECT_FREE" ? `(${existingClaim.brokerMemberId})` : ""}
              </p>
            </div>
          </div>

          {existingClaim.proofUrl && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Submitted Proof Screenshot</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingClaim.proofUrl}
                alt="Account proof"
                className="max-w-xs max-h-56 rounded-lg border border-border"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size must be under 15MB." });
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["png", "jpg", "jpeg", "webp"].includes(ext || "")) {
      setMessage({ type: "error", text: "Only PNG, JPG, JPEG, WEBP images are allowed." });
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = () => setProofPreview(reader.result as string);
    reader.readAsDataURL(file);
    setMessage(null);
  };

  const uploadProof = async (): Promise<string | null> => {
    if (!proofFile) return null;

    const formData = new FormData();
    formData.append("file", proofFile);
    formData.append("category", "screenshot");

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!data.success) throw new Error(data.error || "Screenshot upload failed.");
    return data.url || data.cdnUrl;
  };

  const handleSubmit = async () => {
    if (!telegramUsername.trim()) {
      setMessage({ type: "error", text: "Please enter your Telegram Username (e.g. @yourusername)." });
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      setMessage({ type: "error", text: "Please enter a valid Phone / WhatsApp Number." });
      return;
    }

    if (isBrokerRequired) {
      if (!selectedBroker || !currentBroker) {
        setMessage({ type: "error", text: "Please select an available partner broker." });
        return;
      }
      if (!memberId.trim()) {
        setMessage({ type: "error", text: `Please enter your ${currentBroker.name} Member ID / User ID.` });
        return;
      }
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      let proofUrl: string | null = null;

      if (proofFile) {
        setIsUploading(true);
        proofUrl = await uploadProof();
        setIsUploading(false);
      }

      const result = await submitJoinCommunityAction({
        telegramUsername: telegramUsername.trim(),
        phone: phone.trim(),
        brokerId: selectedBroker || undefined,
        brokerName: currentBroker?.name || undefined,
        memberId: memberId.trim() || undefined,
        proofUrl: proofUrl || undefined,
      });

      if (result.success) {
        setMessage({ type: "success", text: result.message || "Submitted successfully!" });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.message || "Submission failed." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Something went wrong." });
      setIsUploading(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-400" />
          Join Community
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get access to our Super Warrior 30 Premium Telegram Community
        </p>
      </div>

      {/* Special Notice for Enrolled Students */}
      {hasPurchasedCourse && !isBrokerRequired ? (
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
            <GraduationCap className="h-5 w-5" />
            <span>Enrolled Student Privilege Active</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Aapne Super Warrior 30 Course purchase kiya hua hai, isliye aapke liye <strong>Partner Broker me account open karna mandatory nahi hai</strong>. 
            Bas apna Telegram Username aur Phone Number enter karke submit karein, admin aapko verify karke Premium Community me add kar dega.
          </p>
        </div>
      ) : (
        /* Steps Banner for Free Users */
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/10 p-5">
          <h2 className="text-sm font-black text-amber-400 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            📲 WANT FREE PREMIUM TELEGRAM ACCESS?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-black">
                1
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Select Partner Broker</p>
                <p className="text-[11px] text-muted-foreground">Open your trading account via our partner link</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-black">
                2
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Enter Telegram &amp; Proof</p>
                <p className="text-[11px] text-muted-foreground">Provide Telegram username, phone &amp; Member ID</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-black">
                3
              </span>
              <div>
                <p className="text-xs font-bold text-foreground">Get Telegram Access 🚀</p>
                <p className="text-[11px] text-muted-foreground">Once verified by admin, you will be added</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6">
        {/* STEP 1: Telegram & Phone Details (MANDATORY FOR EVERYONE) */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-black text-foreground uppercase tracking-wide">
              Step 1: Your Telegram &amp; Contact Details
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Isi Telegram username par admin aapko Premium Community group me invite karega.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Telegram Username <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  @
                </span>
                <input
                  type="text"
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value.replace(/^@/, ""))}
                  placeholder="yourusername"
                  className="w-full rounded-lg border border-border bg-background pl-8 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Apna Telegram username enter karein (Telegram App &rarr; Settings &rarr; Username).
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Phone / WhatsApp Number <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Account verification aur direct assistance ke liye.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* STEP 2: Broker Selection (Mandatory for free users, optional for paid students) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-wide flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-400" />
                Step 2: Partner Broker Account {isBrokerRequired ? "(Required)" : "(Optional)"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isBrokerRequired
                  ? "Select an available partner broker and open an account via the partner link below."
                  : "Agar aap chahein to apna Partner Broker account bhi add kar sakte hain (Optional)."}
              </p>
            </div>

            {!isBrokerRequired && (
              <button
                type="button"
                onClick={() => setShowBrokerOptional(!showBrokerOptional)}
                className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
              >
                {showBrokerOptional ? "Hide Broker Details" : "+ Add Broker Details"}
              </button>
            )}
          </div>

          {(isBrokerRequired || showBrokerOptional) && (
            <div className="space-y-5 pt-1">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-2.5">
                  Select Partner Broker:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activeBrokers.map((broker) => (
                    <button
                      type="button"
                      key={broker.id}
                      onClick={() => {
                        setSelectedBroker(broker.id);
                        setMessage(null);
                      }}
                      className={cn(
                        "rounded-xl border-2 p-3.5 text-center transition-all cursor-pointer",
                        selectedBroker === broker.id
                          ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 font-black text-amber-400"
                          : "border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/5 text-foreground font-bold"
                      )}
                    >
                      <p className="text-sm">{broker.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {currentBroker && (
                <div className="space-y-4 pt-2">
                  <a
                    href={currentBroker.partnerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-sm py-3 px-6 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Open {currentBroker.name} Account
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        {currentBroker.name} Member ID / User ID {isBrokerRequired ? "*" : "(Optional)"}
                      </label>
                      <input
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        placeholder={`Enter your ${currentBroker.name} Member ID / Account number`}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5">
                        Upload Account Screenshot Proof {isBrokerRequired ? "(Recommended)" : "(Optional)"}
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      {proofPreview ? (
                        <div className="relative inline-block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={proofPreview}
                            alt="Proof preview"
                            className="max-w-xs max-h-48 rounded-lg border border-border object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setProofFile(null);
                              setProofPreview(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="absolute top-2 right-2 rounded-full bg-red-500/90 p-1 text-white hover:bg-red-600 transition-colors cursor-pointer"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-5 w-full text-xs text-muted-foreground hover:border-amber-500/50 hover:text-foreground transition-all cursor-pointer"
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span>Click to upload account screenshot (PNG, JPG, WEBP – max 15MB)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={cn(
              "p-3 rounded-lg text-sm font-semibold",
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            )}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !telegramUsername.trim() ||
            !phone.trim() ||
            (isBrokerRequired && (!selectedBroker || !memberId.trim()))
          }
          className={cn(
            "flex items-center justify-center gap-2 w-full rounded-xl py-3.5 px-6 text-sm font-black transition-all",
            isSubmitting ||
              !telegramUsername.trim() ||
              !phone.trim() ||
              (isBrokerRequired && (!selectedBroker || !memberId.trim()))
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/20 cursor-pointer"
          )}
        >
          {isUploading ? (
            <>Uploading Screenshot...</>
          ) : isSubmitting ? (
            <>Submitting Your Details...</>
          ) : (
            <>
              <MessageCircle className="h-4 w-4" />
              Submit Details &amp; Request Community Access
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
