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
  Image as ImageIcon,
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
}

interface JoinCommunityClientProps {
  brokerConfig: PublicBrokerConfig;
  existingClaim: ExistingClaim | null;
}

export function JoinCommunityClient({ brokerConfig, existingClaim }: JoinCommunityClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedBroker, setSelectedBroker] = useState<string | null>(null);
  const [memberId, setMemberId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeBrokers = (brokerConfig.brokers || []).filter((b) => b.isActive);
  const currentBroker = activeBrokers.find((b) => b.id === selectedBroker);

  // If already claimed
  if (existingClaim) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-400" />
            Join Community
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get FREE access to our Premium Telegram Community
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          {existingClaim.verificationStatus === "VERIFIED" && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-emerald-400">Account Verified! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your broker account has been verified. You should have access to the Premium Telegram Community. If you haven't been added yet, please contact support.
                </p>
              </div>
            </div>
          )}

          {existingClaim.verificationStatus === "PENDING" && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <Clock className="h-6 w-6 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-amber-400">Verification Pending ⏳</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your details have been submitted and are under review. You will be added to the Premium Telegram Community once verified (usually within 24 hours).
                </p>
              </div>
            </div>
          )}

          {existingClaim.verificationStatus === "REJECTED" && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <XCircle className="h-6 w-6 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-red-400">Submission Rejected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {existingClaim.rejectionReason || "Your submission was rejected. Please try again with correct details."}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Broker</p>
              <p className="text-sm font-bold text-foreground">{existingClaim.brokerName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Member ID</p>
              <p className="text-sm font-bold text-foreground">{existingClaim.brokerMemberId}</p>
            </div>
          </div>

          {existingClaim.proofUrl && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Proof Screenshot</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={existingClaim.proofUrl}
                alt="Account proof"
                className="max-w-xs rounded-lg border border-border"
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
    if (!selectedBroker || !currentBroker) {
      setMessage({ type: "error", text: "Please select a broker." });
      return;
    }
    if (!memberId.trim()) {
      setMessage({ type: "error", text: "Please enter your Broker Member / User ID." });
      return;
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
        brokerId: selectedBroker,
        brokerName: currentBroker.name,
        memberId: memberId.trim(),
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-400" />
          Join Community
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Get FREE access to our Premium Telegram Community
        </p>
      </div>

      {/* Steps Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-amber-600/10 p-5">
        <h2 className="text-sm font-black text-amber-400 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          📲 WANT FREE PREMIUM TELEGRAM ACCESS?
        </h2>
        <div className="space-y-2.5">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">1</span>
            <div>
              <p className="text-sm font-bold text-foreground">Select a Broker</p>
              <p className="text-xs text-muted-foreground">Choose an available partner broker below</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">2</span>
            <div>
              <p className="text-sm font-bold text-foreground">Open Your Account</p>
              <p className="text-xs text-muted-foreground">Click the partner link to create your broker account</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-black">3</span>
            <div>
              <p className="text-sm font-bold text-foreground">Submit Details & Get Access 🚀</p>
              <p className="text-xs text-muted-foreground">Enter your Member ID, upload proof screenshot, and get added to Premium Telegram</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-6">

        {/* Step 1: Select Broker */}
        <div>
          <h3 className="text-sm font-black text-foreground mb-3">SELECT PARTNER BROKER</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeBrokers.map((broker) => (
              <button
                key={broker.id}
                onClick={() => {
                  setSelectedBroker(broker.id);
                  setMessage(null);
                }}
                className={cn(
                  "rounded-xl border-2 p-3 sm:p-4 text-center transition-all cursor-pointer",
                  selectedBroker === broker.id
                    ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10"
                    : "border-border bg-card hover:border-amber-500/50 hover:bg-amber-500/5"
                )}
              >
                <p className="text-sm font-black text-foreground">{broker.name}</p>
                {broker.discountType === "PERCENTAGE" &&
                  typeof broker.discountValue === "number" &&
                  broker.discountValue > 0 && (
                    <p className="text-xs font-bold text-amber-400 mt-1">{broker.discountValue}% OFF</p>
                  )}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Open Account Link */}
        {currentBroker && (
          <div className="space-y-4">
            <a
              href={currentBroker.partnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-sm py-3.5 px-6 transition-all shadow-lg shadow-amber-500/20"
            >
              Open {currentBroker.name} Account
              <ExternalLink className="h-4 w-4" />
            </a>

            {/* Coupon Code */}
            {currentBroker.couponCode && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {currentBroker.name.toUpperCase()} PARTNER COUPON:
                  </p>
                  <p className="text-sm font-black text-amber-400 tracking-wider">
                    {currentBroker.couponCode}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentBroker.couponCode || "");
                    setMessage({ type: "success", text: "Coupon code copied!" });
                    setTimeout(() => setMessage(null), 2000);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30 transition-colors"
                >
                  Copy
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Step 3: Submit Details */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-black text-foreground">
                  I have a {currentBroker.name} Partner Account
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Enter your account details below for verification
              </p>

              <div className="space-y-4">
                {/* Member ID */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    {currentBroker.name} Member ID / User ID *
                  </label>
                  <input
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder={`Enter ${currentBroker.name} Member ID`}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Upload Account Proof / Screenshot
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {proofPreview ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proofPreview}
                        alt="Proof preview"
                        className="max-w-xs max-h-48 rounded-lg border border-border"
                      />
                      <button
                        onClick={() => {
                          setProofFile(null);
                          setProofPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 rounded-full bg-red-500/90 p-1 text-white hover:bg-red-600 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 w-full text-sm text-muted-foreground hover:border-amber-500/50 hover:text-foreground transition-all cursor-pointer"
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span>Click to upload screenshot (PNG, JPG, WEBP – max 15MB)</span>
                    </button>
                  )}
                </div>
              </div>
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
              disabled={isSubmitting || !memberId.trim()}
              className={cn(
                "flex items-center justify-center gap-2 w-full rounded-xl py-3.5 px-6 text-sm font-black transition-all",
                isSubmitting || !memberId.trim()
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/20 cursor-pointer"
              )}
            >
              {isUploading ? (
                <>Uploading Screenshot...</>
              ) : isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Verify & Get Telegram Access
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
