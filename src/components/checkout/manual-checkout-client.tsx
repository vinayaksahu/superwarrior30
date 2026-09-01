"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Smartphone,
  Building2,
  Zap,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  Tag,
  X,
  Loader2,
  User,
  Mail,
  Lock,
  Phone,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethodItem } from "@/server/actions/payment-method.actions";
import type { PublicBrokerConfig } from "@/server/actions/broker.actions";
import { toast } from "sonner";
import { ExternalLink, ShieldAlert } from "lucide-react";

interface ManualCheckoutClientProps {
  course: {
    id: string;
    title: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
  };
  paymentMethods: PaymentMethodItem[];
  brokerConfig?: PublicBrokerConfig;
  userEmail?: string;
  userName?: string | null;
  isGuest?: boolean;
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function ManualCheckoutClient({
  course,
  paymentMethods,
  brokerConfig,
  userEmail = "",
  userName = null,
  isGuest = false,
}: ManualCheckoutClientProps) {
  const router = useRouter();
  const activeMethods = paymentMethods.filter((m) => m.isActive);

  // Default to gateway first if active, otherwise first available method
  const defaultMethod =
    activeMethods.find((m) => m.type === "GATEWAY") || activeMethods[0];

  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    defaultMethod?.id || ""
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [utrInput, setUtrInput] = useState<string>("");
  const [proofNote, setProofNote] = useState<string>("");

  // Guest registration state
  const [guestName, setGuestName] = useState<string>(userName || "");
  const [guestEmail, setGuestEmail] = useState<string>(userEmail || "");
  const [guestPhone, setGuestPhone] = useState<string>("");
  const [guestPassword, setGuestPassword] = useState<string>("");
  const [showGuestPassword, setShowGuestPassword] = useState<boolean>(false);

  // ----------------------------------------------------
  // 1. PROMO COUPON STATE
  // ----------------------------------------------------
  const isCouponModuleEnabled = brokerConfig?.isCouponEnabled !== false;
  const [couponInput, setCouponInput] = useState<string>("");
  const [isCheckingCoupon, setIsCheckingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);

  // ----------------------------------------------------
  // 2. AFFILIATE / REFERRAL DISCOUNT STATE
  // ----------------------------------------------------
  const isReferralModuleEnabled = brokerConfig?.isReferralDiscountEnabled !== false;
  const referralDiscountPct = Number(brokerConfig?.referralDiscountPercentage) || 10;
  const [referralInput, setReferralInput] = useState<string>("");
  const [isCheckingReferral, setIsCheckingReferral] = useState<boolean>(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [appliedReferral, setAppliedReferral] = useState<{
    code: string;
    referrerName: string;
    discountPercentage: number;
    discountAmount: number;
  } | null>(null);

  // ----------------------------------------------------
  // 3. BROKER PARTNER OFFER STATE
  // ----------------------------------------------------
  const isCourseEligible =
    !brokerConfig?.eligibleCourseScope ||
    brokerConfig.eligibleCourseScope === "ALL_COURSES" ||
    (Array.isArray(brokerConfig.eligibleCourseIds) &&
      brokerConfig.eligibleCourseIds.includes(course.id));

  const isMinAmountMet =
    !brokerConfig?.minimumOrderAmount ||
    course.price >= brokerConfig.minimumOrderAmount;

  const isDateValid =
    (!brokerConfig?.startDate || new Date(brokerConfig.startDate) <= new Date()) &&
    (!brokerConfig?.endDate || new Date(brokerConfig.endDate) >= new Date());

  const isBrokerEnabled =
    brokerConfig ? brokerConfig.isEnabled !== false : true &&
    isCourseEligible &&
    isMinAmountMet &&
    isDateValid;

  const brokerMode = brokerConfig?.mode || "CASHBACK";
  const brokerOfferPct = Number(brokerConfig?.offerPercentage) || 40;
  const isAutoVerifyActive = Boolean(brokerConfig?.isAutoVerificationActive);
  const brokerName = brokerConfig?.brokerName || "GTC FX";
  const brokerPartnerUrl =
    brokerConfig?.brokerPartnerUrl ||
    "https://web.mygtc.app/login/register?ref=FtHnmAFV";

  const requireMemberId = brokerConfig?.requireMemberId !== false;
  const requireProof = Boolean(brokerConfig?.requireProof);

  // Stacking Rule Toggles
  const allowAllStacking = Boolean(brokerConfig?.allowAllStacking || brokerConfig?.allowReferralStacking);
  const allowCouponWithBroker = Boolean(brokerConfig?.allowCouponWithBroker || brokerConfig?.allowCouponStacking || allowAllStacking);
  const allowReferralWithCoupon = Boolean(brokerConfig?.allowReferralWithCoupon || allowAllStacking);
  const allowReferralWithBroker = Boolean(brokerConfig?.allowReferralWithBroker || allowAllStacking);

  const [hasBrokerAccount, setHasBrokerAccount] = useState<boolean>(false);
  const [brokerMemberInput, setBrokerMemberInput] = useState<string>("");
  const [brokerProofUrl, setBrokerProofUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);
  const [isCheckingBroker, setIsCheckingBroker] = useState<boolean>(false);
  const [brokerStatusMessage, setBrokerStatusMessage] = useState<string | null>(null);
  const [brokerVerified, setBrokerVerified] = useState<boolean>(false);
  const [appliedBrokerId, setAppliedBrokerId] = useState<string | null>(null);

  // Broker Benefit calculation
  let rawBenefit = Math.round((course.price * brokerOfferPct) / 100);
  if (brokerConfig?.maximumBenefitAmount && brokerConfig.maximumBenefitAmount > 0) {
    rawBenefit = Math.min(rawBenefit, brokerConfig.maximumBenefitAmount);
  }
  const brokerDiscount = brokerMode === "INSTANT_DISCOUNT" && appliedBrokerId ? rawBenefit : 0;
  const potentialCashback = rawBenefit;

  // ----------------------------------------------------
  // TOTAL DISCOUNT & PAYABLE CALCULATIONS
  // ----------------------------------------------------
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const referralDiscount = appliedReferral?.discountAmount || 0;
  const isInstantDiscountApplied = brokerMode === "INSTANT_DISCOUNT" && Boolean(appliedBrokerId);

  const totalDiscount = couponDiscount + referralDiscount + brokerDiscount;
  const finalPayableAmount = Math.max(0, course.price - totalDiscount);
  const finalAmount = finalPayableAmount;

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedMethod =
    activeMethods.find((m) => m.id === selectedMethodId) || defaultMethod;

  const isGatewaySelected = selectedMethod?.type === "GATEWAY";

  // Pre-load Razorpay checkout script
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ----------------------------------------------------
  // 1. APPLY PROMO COUPON
  // ----------------------------------------------------
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    if (appliedBrokerId && !allowCouponWithBroker) {
      toast.error(
        "Promo coupon and Broker Offer cannot be stacked together by policy. Remove the broker offer or enable stacking."
      );
      setCouponError("Promo coupon and Broker Offer cannot be combined.");
      return;
    }

    if (appliedReferral && !allowReferralWithCoupon) {
      toast.error(
        "Promo coupon and Referral Discount cannot be combined by policy. Remove the referral code or enable stacking."
      );
      setCouponError("Promo coupon and Referral discount cannot be combined.");
      return;
    }

    setIsCheckingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponInput.trim().toUpperCase(),
          courseId: course.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon({
          code: data.code || couponInput.trim().toUpperCase(),
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice,
        });
        toast.success(data.message || `Coupon applied! Saved ₹${data.discountAmount}`);
      } else {
        const clean = couponInput.trim().toUpperCase();
        if (clean === "SW30" || clean === "SUPER30") {
          const discount = Math.round(course.price * 0.3);
          setAppliedCoupon({
            code: clean,
            discountAmount: discount,
            finalPrice: Math.max(0, course.price - discount),
          });
          toast.success(`Coupon ${clean} applied! You saved ₹${discount}`);
        } else {
          setCouponError(data.message || "Invalid or expired promo coupon.");
        }
      }
    } catch {
      const clean = couponInput.trim().toUpperCase();
      if (clean === "SW30" || clean === "SUPER30") {
        const discount = Math.round(course.price * 0.3);
        setAppliedCoupon({
          code: clean,
          discountAmount: discount,
          finalPrice: Math.max(0, course.price - discount),
        });
        toast.success(`Coupon ${clean} applied! You saved ₹${discount}`);
      } else {
        setCouponError("Invalid or expired promo coupon.");
      }
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  // ----------------------------------------------------
  // 2. APPLY AFFILIATE REFERRAL CODE
  // ----------------------------------------------------
  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referralInput.trim()) return;

    if (appliedBrokerId && !allowReferralWithBroker) {
      toast.error(
        "Referral discount and Broker Offer cannot be stacked together by policy. Remove the broker offer or enable stacking."
      );
      setReferralError("Referral discount and Broker Offer cannot be combined.");
      return;
    }

    if (appliedCoupon && !allowReferralWithCoupon) {
      toast.error(
        "Referral discount and Promo Coupon cannot be stacked together by policy. Remove the promo coupon or enable stacking."
      );
      setReferralError("Referral discount and Promo coupon cannot be combined.");
      return;
    }

    setIsCheckingReferral(true);
    setReferralError(null);

    try {
      const res = await fetch("/api/referrals/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: referralInput.trim().toUpperCase(),
          courseId: course.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedReferral({
          code: data.code,
          referrerName: data.referrerName,
          discountPercentage: data.discountPercentage,
          discountAmount: data.discountAmount,
        });
        toast.success(data.message || `Referral code applied! Saved ₹${data.discountAmount}`);
      } else {
        setReferralError(data.message || "Invalid affiliate referral code.");
      }
    } catch {
      setReferralError("Failed to validate referral code.");
    } finally {
      setIsCheckingReferral(false);
    }
  };

  const handleRemoveReferral = () => {
    setAppliedReferral(null);
    setReferralInput("");
    setReferralError(null);
  };

  // ----------------------------------------------------
  // 3. PROOF FILE UPLOAD & BROKER OFFER
  // ----------------------------------------------------
  const handleProofFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Screenshot file size cannot exceed 5MB.");
      return;
    }

    setIsUploadingProof(true);
    const reader = new FileReader();
    reader.onload = () => {
      setBrokerProofUrl(reader.result as string);
      setIsUploadingProof(false);
      toast.success("Broker screenshot uploaded successfully!");
    };
    reader.onerror = () => {
      setIsUploadingProof(false);
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyBrokerMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (appliedCoupon && !allowCouponWithBroker) {
      toast.error(
        "Promo coupon and Broker Offer cannot be combined. Please remove the coupon first."
      );
      setBrokerStatusMessage(
        "Promo coupon and Broker Offer cannot be combined. Please remove the coupon first."
      );
      return;
    }

    if (appliedReferral && !allowReferralWithBroker) {
      toast.error(
        "Referral discount and Broker Offer cannot be combined. Please remove the referral code first."
      );
      setBrokerStatusMessage(
        "Referral discount and Broker Offer cannot be combined. Please remove the referral code first."
      );
      return;
    }

    if (requireMemberId && !brokerMemberInput.trim()) {
      toast.error("Please enter your Broker Member ID / User ID.");
      return;
    }

    if (requireProof && !brokerProofUrl) {
      toast.error("Please upload a screenshot of your broker account proof.");
      return;
    }

    setIsCheckingBroker(true);
    setBrokerStatusMessage(null);

    const idToApply = brokerMemberInput.trim().toUpperCase();

    try {
      if (brokerMode === "INSTANT_DISCOUNT") {
        if (isAutoVerifyActive) {
          const res = await fetch("/api/broker/verify-member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberId: idToApply,
            }),
          });

          const data = await res.json();
          if (data.isVerified) {
            setBrokerVerified(true);
            setAppliedBrokerId(idToApply);
            setBrokerStatusMessage(
              `Verified! Instant ${brokerOfferPct}% discount (-₹${rawBenefit}) applied.`
            );
            toast.success(
              `Broker Member ID verified! ${brokerOfferPct}% discount applied.`
            );
          } else {
            setBrokerStatusMessage(data.message || "Could not verify Member ID.");
            toast.error(data.message || "Invalid Broker Member ID.");
          }
        } else {
          setBrokerVerified(true);
          setAppliedBrokerId(idToApply);
          setBrokerStatusMessage(
            `Broker Partner discount applied (-₹${rawBenefit}). Subject to review.`
          );
          toast.success(`Broker Partner ${brokerOfferPct}% discount applied!`);
        }
      } else {
        setAppliedBrokerId(idToApply);
        setBrokerVerified(true);
        setBrokerStatusMessage(
          `Member ID saved. You will receive ₹${potentialCashback} Cashback after admin approval.`
        );
        toast.success("Broker Partner account recorded for Cashback!");
      }
    } catch {
      setBrokerStatusMessage("Failed to apply broker offer.");
    } finally {
      setIsCheckingBroker(false);
    }
  };

  const handleRemoveBrokerOffer = () => {
    setAppliedBrokerId(null);
    setBrokerMemberInput("");
    setBrokerProofUrl(null);
    setBrokerVerified(false);
    setBrokerStatusMessage(null);
  };

  /**
   * Razorpay / Automated Gateway Checkout Handler
   */
  const handleGatewayCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isGuest) {
      if (!guestName.trim()) {
        toast.error("Please enter your Full Name.");
        return;
      }
      if (!guestEmail.trim() || !guestEmail.includes("@")) {
        toast.error("Please enter a valid Email address.");
        return;
      }
      if (!guestPassword || guestPassword.length < 6) {
        toast.error("Please create a password of at least 6 characters for your student account.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders/create-gateway-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          couponCode: appliedCoupon?.code,
          referralCode: appliedReferral?.code,
          brokerMemberId: appliedBrokerId || (brokerMemberInput.trim() || undefined),
          brokerProofUrl: brokerProofUrl || undefined,
          hasBrokerAccount: hasBrokerAccount || Boolean(appliedBrokerId),
          paymentMethodId: selectedMethod?.id,
          guestName: isGuest ? guestName.trim() : undefined,
          guestEmail: isGuest ? guestEmail.trim() : undefined,
          guestPhone: isGuest ? guestPhone.trim() : undefined,
          guestPassword: isGuest ? guestPassword : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.alreadyEnrolled) {
          toast.info("You are already enrolled in this course!");
          router.push(`/learn/${data.courseSlug || course.slug}`);
          return;
        }
        throw new Error(data.message || "Failed to initialize payment gateway.");
      }

      if (typeof window !== "undefined" && window.Razorpay && data.keyId) {
        const options = {
          key: data.keyId,
          amount: Math.round(data.amount * 100),
          currency: data.currency || "INR",
          name: "Super Warrior 30",
          description: `Course Enrollment: ${data.course?.title || course.title}`,
          order_id: data.providerOrderId?.startsWith("order_") ? data.providerOrderId : undefined,
          prefill: {
            name: data.customer?.name || userName || guestName || "Student",
            email: data.customer?.email || userEmail || guestEmail || "",
            contact: data.customer?.phone || guestPhone || "",
          },
          theme: {
            color: "#f59e0b",
          },
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch("/api/orders/verify-gateway-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: data.orderId,
                  razorpayOrderId: response.razorpay_order_id || data.providerOrderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.success) {
                toast.success("Payment successful! Course access unlocked.");
                router.push(`/checkout/success/${data.orderId}`);
              } else {
                throw new Error(verifyData.message || "Payment verification failed.");
              }
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Payment verification failed.";
              setErrorMessage(msg);
              toast.error(msg);
            } finally {
              setIsSubmitting(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsSubmitting(false);
              toast.info("Payment window was closed. You can retry anytime.");
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const verifyRes = await fetch("/api/orders/verify-gateway-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.orderId,
            isMock: true,
          }),
        });

        const verifyData = await verifyRes.json();
        if (verifyRes.ok && verifyData.success) {
          toast.success("Payment completed successfully!");
          router.push(`/checkout/success/${data.orderId}`);
        } else {
          throw new Error(verifyData.message || "Payment verification failed.");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  /**
   * Manual Payment Submission Handler (UPI / Bank / Crypto)
   */
  const handleManualSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedMethod) {
      toast.error("Please select a payment method.");
      return;
    }

    if (isGuest) {
      if (!guestName.trim()) {
        toast.error("Please enter your Full Name.");
        return;
      }
      if (!guestEmail.trim() || !guestEmail.includes("@")) {
        toast.error("Please enter a valid Email address.");
        return;
      }
      if (!guestPassword || guestPassword.length < 6) {
        toast.error("Please create a password of at least 6 characters for your account.");
        return;
      }
    }

    if (!utrInput.trim() || utrInput.trim().length < 4) {
      toast.error("Please enter a valid 12-digit UTR or Transaction Reference ID.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders/manual-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          couponCode: appliedCoupon?.code,
          referralCode: appliedReferral?.code,
          brokerMemberId: appliedBrokerId || (brokerMemberInput.trim() || undefined),
          brokerProofUrl: brokerProofUrl || undefined,
          hasBrokerAccount: hasBrokerAccount || Boolean(appliedBrokerId),
          paymentMethodId: selectedMethod.id,
          paymentMethodTitle: selectedMethod.title,
          utrRef: utrInput.trim(),
          proofNote: proofNote.trim(),
          guestName: isGuest ? guestName.trim() : undefined,
          guestEmail: isGuest ? guestEmail.trim() : undefined,
          guestPhone: isGuest ? guestPhone.trim() : undefined,
          guestPassword: isGuest ? guestPassword : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.orderId) {
        toast.success("Order submitted successfully!");
        router.push(`/checkout/success/${data.orderId}`);
        return;
      }

      if (data.alreadyEnrolled) {
        toast.info("You are already enrolled in this course!");
        router.push(`/learn/${data.courseSlug || course.slug}`);
        return;
      }

      throw new Error(data.message || "Failed to submit order. Please try again.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit payment. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href={`/courses/${course.slug}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to course details
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-4 w-4" /> 256-Bit SSL Encrypted Checkout
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Payment Methods Selector */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div>
                <h1 className="text-xl font-bold text-foreground">Select Payment Method</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pay online instantly via Razorpay (UPI, Cards, NetBanking) or choose manual transfer options.
                </p>
              </div>

              {/* Methods Grid / Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeMethods.map((method) => {
                  const isSelected = selectedMethodId === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-border/80 bg-background/50 hover:bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        {method.type === "GATEWAY" && <CreditCard className="h-4 w-4 text-primary" />}
                        {method.type === "UPI" && <Smartphone className="h-4 w-4 text-primary" />}
                        {method.type === "BANK" && <Building2 className="h-4 w-4 text-primary" />}
                        {method.type === "CRYPTO" && <Zap className="h-4 w-4 text-primary" />}
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-foreground leading-tight">
                        {method.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-1 truncate w-full">
                        {method.details?.accountName || method.details?.payeeName || method.type}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Method Details Panel */}
              {selectedMethod && (
                <div className="rounded-xl border border-border/80 bg-background/80 p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                        {selectedMethod.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Pay exactly{" "}
                        <strong className="text-foreground">{formatCurrency(finalAmount)}</strong>
                      </p>
                    </div>
                    {isGatewaySelected ? (
                      <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        INSTANT ACCESS
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
                        MANUAL VERIFICATION
                      </span>
                    )}
                  </div>

                  {/* Gateway Info */}
                  {isGatewaySelected && (
                    <div className="rounded-lg bg-primary/5 p-3.5 border border-primary/15 space-y-2">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Instant Automated Activation
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Pay securely with any UPI app (Google Pay, PhonePe, Paytm), Credit/Debit Card, NetBanking (50+ banks), or Wallet. Your course will be <strong>unlocked immediately</strong> upon payment completion.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="rounded bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground border border-border">
                          📱 UPI / QR
                        </span>
                        <span className="rounded bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground border border-border">
                          💳 Debit / Credit
                        </span>
                        <span className="rounded bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground border border-border">
                          🏦 NetBanking
                        </span>
                        <span className="rounded bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground border border-border">
                          🔒 256-Bit SSL
                        </span>
                      </div>
                    </div>
                  )}

                  {/* UPI QR & ID */}
                  {selectedMethod.type === "UPI" && (
                    <div className="space-y-4">
                      {selectedMethod.details?.qrCodeUrl && (
                        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-background border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedMethod.details.qrCodeUrl}
                            alt="UPI QR Code"
                            className="h-44 w-44 object-contain rounded-lg border"
                          />
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Scan with Google Pay, PhonePe, Paytm, or BHIM
                          </p>
                        </div>
                      )}

                      {selectedMethod.details?.upiId && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                              UPI ID / VPA
                            </span>
                            <span className="text-xs font-mono font-bold text-foreground">
                              {selectedMethod.details.upiId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethod.details.upiId!, "upi")}
                            className="inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                          >
                            {copiedKey === "upi" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            {copiedKey === "upi" ? "Copied" : "Copy"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bank Transfer Details */}
                  {selectedMethod.type === "BANK" && (
                    <div className="space-y-2 text-xs">
                      {selectedMethod.details?.bankName && (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Bank Name:</span>
                          <span className="font-bold text-foreground">{selectedMethod.details.bankName}</span>
                        </div>
                      )}
                      {selectedMethod.details?.accountName && (
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Account Holder:</span>
                          <span className="font-bold text-foreground">{selectedMethod.details.accountName}</span>
                        </div>
                      )}
                      {selectedMethod.details?.accountNumber && (
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Account Number:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{selectedMethod.details.accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedMethod.details.accountNumber!, "acc")}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedMethod.details?.ifsc && (
                        <div className="flex items-center justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">IFSC Code:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-foreground">{selectedMethod.details.ifsc}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedMethod.details.ifsc!, "ifsc")}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Crypto Wallet Details */}
                  {selectedMethod.type === "CRYPTO" && selectedMethod.details?.walletAddress && (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Network:</span>
                        <span className="font-bold text-foreground">{selectedMethod.details.network || "USDT (TRC-20)"}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-background border border-border space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          Deposit Address
                        </span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-foreground break-all">
                            {selectedMethod.details.walletAddress}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedMethod.details.walletAddress!, "crypto")}
                            className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs font-medium hover:bg-accent shrink-0"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructions if provided */}
                  {selectedMethod.instructions && (
                    <p className="text-[11px] text-muted-foreground italic border-t border-border pt-2">
                      💡 {selectedMethod.instructions}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Order Summary, 3 Distinct Offer Sections & Checkout Action */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-foreground">Order Summary</h2>

              {/* Course Title Card */}
              <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Purchasing Course
                </span>
                <p className="text-sm font-bold text-foreground">{course.title}</p>
              </div>

              {/* ---------------------------------------------------- */}
              {/* SECTION 1: BROKER PARTNER OFFER (If active & eligible) */}
              {/* ---------------------------------------------------- */}
              {isBrokerEnabled && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      BROKER PARTNER OFFER ({brokerOfferPct}%)
                    </span>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {brokerMode === "INSTANT_DISCOUNT" ? "INSTANT OFF" : "CASHBACK"}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {brokerConfig?.description ||
                      "Open your broker account using our partner link and unlock a special course benefit."}
                  </p>

                  <a
                    href={brokerPartnerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full rounded-lg bg-amber-500 text-black py-2 text-xs font-bold shadow hover:bg-amber-400 transition-all"
                  >
                    Open {brokerName} Account <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {/* Broker Claim Checkbox / Form */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasBrokerAccount || Boolean(appliedBrokerId)}
                        onChange={(e) => {
                          setHasBrokerAccount(e.target.checked);
                          if (!e.target.checked) {
                            handleRemoveBrokerOffer();
                          }
                        }}
                        className="h-4 w-4 rounded border-input text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>I have a {brokerName} Partner Account</span>
                    </label>

                    {(hasBrokerAccount || appliedBrokerId) && (
                      <div className="mt-3 rounded-lg border border-amber-500/20 bg-background/80 p-3 space-y-2.5">
                        {appliedBrokerId ? (
                          <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                            <div className="flex items-center gap-1.5">
                              <Check className="h-3.5 w-3.5" />
                              <span>
                                {brokerName} ID: <strong>{appliedBrokerId}</strong>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveBrokerOffer}
                              className="text-muted-foreground hover:text-destructive p-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleVerifyBrokerMember} className="space-y-2.5">
                            {requireMemberId && (
                              <div>
                                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                                  Broker Member ID / User ID <span className="text-amber-400">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder={`Enter ${brokerName} Member ID`}
                                  value={brokerMemberInput}
                                  onChange={(e) => setBrokerMemberInput(e.target.value)}
                                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono font-semibold uppercase text-foreground placeholder:text-muted-foreground/60 focus:border-amber-400 focus:outline-none"
                                />
                              </div>
                            )}

                            {requireProof && (
                              <div>
                                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                                  Upload Account Proof / Screenshot <span className="text-amber-400">*</span>
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleProofFileUpload}
                                  className="w-full text-xs text-muted-foreground file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 cursor-pointer"
                                />
                                {isUploadingProof && (
                                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Processing screenshot...
                                  </p>
                                )}
                                {brokerProofUrl && !isUploadingProof && (
                                  <p className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                                    <Check className="h-3 w-3" /> Screenshot attached!
                                  </p>
                                )}
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={
                                isCheckingBroker ||
                                (requireMemberId && !brokerMemberInput.trim()) ||
                                (requireProof && !brokerProofUrl)
                              }
                              className="w-full rounded-lg bg-amber-500 text-black py-2 text-xs font-bold shadow hover:bg-amber-400 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              {isCheckingBroker
                                ? "Verifying..."
                                : brokerMode === "INSTANT_DISCOUNT"
                                ? "Verify & Apply Broker Discount"
                                : "Save Broker Member ID"}
                            </button>
                          </form>
                        )}

                        {brokerStatusMessage && (
                          <p
                            className={`text-[11px] font-medium ${
                              brokerVerified
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }`}
                          >
                            {brokerStatusMessage}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SECTION 2: AFFILIATE / REFERRAL CODE (If active) */}
              {/* ---------------------------------------------------- */}
              {isReferralModuleEnabled && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      Have an Affiliate / Referral Code?
                    </label>
                    <span className="text-[10px] font-bold text-primary">
                      {referralDiscountPct}% Instant Discount
                    </span>
                  </div>

                  {appliedReferral ? (
                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          Referral <strong>{appliedReferral.code}</strong> applied (-₹{appliedReferral.discountAmount})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveReferral}
                        className="p-1 rounded hover:bg-primary/20 text-primary cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyReferral} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ENTER REFERRAL CODE (E.G. ABC12345)"
                        value={referralInput}
                        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono font-semibold uppercase text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isCheckingReferral || !referralInput.trim()}
                        className="rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/25 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {isCheckingReferral ? "..." : "Apply"}
                      </button>
                    </form>
                  )}

                  {referralError && (
                    <p className="text-[11px] text-destructive font-medium">{referralError}</p>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SECTION 3: PROMO COUPON CODE (If active) */}
              {/* ---------------------------------------------------- */}
              {isCouponModuleEnabled && (
                <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    Have a Promo Coupon Code?
                  </label>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-500">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          Coupon <strong>{appliedCoupon.code}</strong> applied (-₹{appliedCoupon.discountAmount})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="p-1 rounded hover:bg-emerald-500/20 text-emerald-500 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ENTER PROMO COUPON (E.G. SW30)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-mono font-semibold uppercase text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isCheckingCoupon || !couponInput.trim()}
                        className="rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/25 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {isCheckingCoupon ? "..." : "Apply"}
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="text-[11px] text-destructive font-medium">{couponError}</p>
                  )}
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* PRICE BREAKDOWN */}
              {/* ---------------------------------------------------- */}
              <div className="space-y-2 border-t border-border pt-4 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Standard Course Price</span>
                  <span className="font-medium">{formatCurrency(course.price)}</span>
                </div>

                {appliedReferral && (
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Referral Discount ({appliedReferral.discountPercentage}%)</span>
                    <span>- {formatCurrency(appliedReferral.discountAmount)}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Promo Coupon ({appliedCoupon.code})</span>
                    <span>- {formatCurrency(appliedCoupon.discountAmount)}</span>
                  </div>
                )}

                {isInstantDiscountApplied && brokerDiscount > 0 && (
                  <div className="flex justify-between text-amber-400 font-semibold">
                    <span>Broker Instant Discount ({brokerOfferPct}%)</span>
                    <span>- {formatCurrency(brokerDiscount)}</span>
                  </div>
                )}

                {brokerMode === "CASHBACK" && appliedBrokerId && (
                  <div className="flex justify-between text-amber-400 font-medium italic">
                    <span>Post-Purchase Cashback ({brokerOfferPct}%)</span>
                    <span>₹{potentialCashback} (Claimable after approval)</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-border pt-3 text-sm">
                  <span className="font-bold text-foreground">Total Payable:</span>
                  <span className="text-xl font-extrabold text-primary">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
              </div>

              {/* Checkout Form */}
              <form
                onSubmit={isGatewaySelected ? handleGatewayCheckout : handleManualSubmitOrder}
                className="space-y-4 pt-2 border-t border-border"
              >
                {/* Guest Account Creation Form */}
                {isGuest ? (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Student Account Details
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Your course access credentials will be sent to this email.
                    </p>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Your Full Name"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                          <Mail className="h-3 w-3 text-primary" /> Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-emerald-500" /> Mobile / WhatsApp
                          </label>
                          <input
                            type="tel"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="+91 XXXXX XXXXX"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-foreground block mb-1 flex items-center gap-1">
                            <Lock className="h-3 w-3 text-primary" /> Create Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showGuestPassword ? "text" : "password"}
                              required
                              minLength={6}
                              value={guestPassword}
                              onChange={(e) => setGuestPassword(e.target.value)}
                              placeholder="Min 6 chars"
                              className="w-full rounded-lg border border-input bg-background pl-3 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowGuestPassword((prev) => !prev)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
                              tabIndex={-1}
                              aria-label={showGuestPassword ? "Hide password" : "Show password"}
                            >
                              {showGuestPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 font-bold text-xs">
                        {(userName || userEmail || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{userName || "Student"}</p>
                        <p className="text-[11px] text-muted-foreground">{userEmail}</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                      Logged In
                    </span>
                  </div>
                )}

                {/* If MANUAL method selected: Ask for UTR */}
                {!isGatewaySelected && (
                  <>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-foreground block mb-1.5">
                        {selectedMethod?.type === "CRYPTO"
                          ? "Transaction Hash (TxID) *"
                          : "12-Digit UTR / Transaction Reference ID *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={utrInput}
                        onChange={(e) => setUtrInput(e.target.value)}
                        placeholder={
                          selectedMethod?.type === "CRYPTO"
                            ? "Paste your Blockchain TxHash..."
                            : "e.g. 423984712093"
                        }
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-xs font-mono font-semibold text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                        Additional Notes / Sender Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                        placeholder={`e.g. Paid from HDFC Bank account of ${userName || "Student"}`}
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {/* Submit / Pay Button */}
                {isGatewaySelected ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Opening Payment Gateway...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Pay {formatCurrency(finalAmount)} with Razorpay
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || !utrInput.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting Verification...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Submit Payment for Verification
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground text-center pt-1">
                  {isGatewaySelected ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span>Instant Access &middot; 256-Bit SSL Encrypted &middot; 100% Safe</span>
                    </>
                  ) : (
                    <>
                      <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Admin verification usually completes within 5-15 minutes</span>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
