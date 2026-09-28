"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreateStudentAction,
  adminValidateReferrerAction,
} from "@/server/actions/admin-student.actions";
import {
  UserPlus,
  X,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  BookOpen,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  GitBranch,
  Search,
  IndianRupee,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface CourseOption {
  id: string;
  title: string;
  price: number;
}

interface CreateStudentModalProps {
  availableCourses: CourseOption[];
}

export function CreateStudentModal({ availableCourses }: CreateStudentModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  // Fee Collection State
  const [courseFee, setCourseFee] = useState<string>("0");
  const [paymentMode, setPaymentMode] = useState<string>("UPI / GPay / PhonePe");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Referral / Sponsor Placement State
  const [referralType, setReferralType] = useState<"DIRECT_ADMIN" | "OTHER_STUDENT">("DIRECT_ADMIN");
  const [referrerInput, setReferrerInput] = useState("");
  const [verifiedReferrer, setVerifiedReferrer] = useState<{
    id: string;
    name: string | null;
    email: string;
    referralCode: string;
    role: string;
  } | null>(null);
  const [isValidatingReferrer, setIsValidatingReferrer] = useState(false);
  const [referrerError, setReferrerError] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Success State
  const [createdStudent, setCreatedStudent] = useState<{
    name: string | null;
    email: string;
    phone: string | null;
    plainPassword: string;
    referralCode: string;
    assignedCoursesCount: number;
    feeCollected?: number;
    paymentMode?: string;
    orderNumber?: string | null;
    referrer: {
      name: string | null;
      email: string;
      referralCode: string;
    } | null;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setSelectedCourses([]);
    setCourseFee("0");
    setPaymentMode("UPI / GPay / PhonePe");
    setPaymentNotes("");
    setReferralType("DIRECT_ADMIN");
    setReferrerInput("");
    setVerifiedReferrer(null);
    setReferrerError(null);
    setError(null);
    setCreatedStudent(null);
    setIsCopied(false);
  };

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (!isPending) {
      setIsOpen(false);
      resetForm();
      router.refresh();
    }
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) => {
      const next = prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId];

      // Auto update suggested fee
      const sum = next.reduce((acc, id) => {
        const c = availableCourses.find((item) => item.id === id);
        return acc + (c?.price || 0);
      }, 0);
      setCourseFee(String(sum));

      return next;
    });
  };

  const handleVerifyReferrer = async () => {
    const q = referrerInput.trim();
    if (!q) {
      setReferrerError("Please enter a referral code or email to verify.");
      return;
    }

    setIsValidatingReferrer(true);
    setReferrerError(null);
    setVerifiedReferrer(null);

    try {
      const res = await adminValidateReferrerAction(q);
      if (res.success && res.referrer) {
        setVerifiedReferrer(res.referrer);
        toast.success(`Verified: ${res.referrer.name || "User"} (${res.referrer.referralCode})`);
      } else {
        setReferrerError(res.error || "Referrer not found.");
        toast.error(res.error || "Referrer not found.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to verify referrer";
      setReferrerError(msg);
      toast.error(msg);
    } finally {
      setIsValidatingReferrer(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter student's full name.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters (or leave empty to auto-generate).");
      return;
    }

    if (referralType === "OTHER_STUDENT" && !referrerInput.trim()) {
      setError("Please specify a referrer student code or email, or select Direct Admin (SW30).");
      return;
    }

    const feeAmount = parseFloat(courseFee) || 0;

    startTransition(async () => {
      const res = await adminCreateStudentAction({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password.trim() || undefined,
        assignedCourseIds: selectedCourses,
        referralType,
        referrerCodeOrEmail:
          referralType === "OTHER_STUDENT"
            ? verifiedReferrer?.referralCode || referrerInput.trim()
            : undefined,
        courseFeeCollected: feeAmount,
        paymentMode: feeAmount > 0 ? paymentMode : undefined,
        paymentNotes: feeAmount > 0 ? paymentNotes.trim() || undefined : undefined,
      });

      if (res.success && res.student) {
        setCreatedStudent(res.student);
        toast.success("Student account created & fee recorded!");
        router.refresh();
      } else {
        setError(res.error || "Failed to create student account.");
        toast.error(res.error || "Failed to create student account.");
      }
    });
  };

  const copyCredentials = () => {
    if (!createdStudent) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://superwarrior30.com";
    const sponsorName = createdStudent.referrer
      ? `${createdStudent.referrer.name || "Student"} (${createdStudent.referrer.referralCode})`
      : "Direct Admin (SW30)";
    const feeText = createdStudent.feeCollected && createdStudent.feeCollected > 0
      ? `\n💰 Course Fee: ₹${createdStudent.feeCollected.toLocaleString("en-IN")} (${createdStudent.paymentMode || "Paid"})`
      : "";

    const text = `🎓 Welcome to Trade Warrior Academy!\n\nHere are your Student Account Login details:\n\n👤 Name: ${createdStudent.name || "Student"}\n📧 Email: ${createdStudent.email}\n🔑 Password: ${createdStudent.plainPassword}\n🏷️ Referral Code: ${createdStudent.referralCode}\n👥 Sponsor / Referral: ${sponsorName}${feeText}\n\n🔗 Login Link: ${origin}/login\n\nPlease keep your credentials safe and do not share them.`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast.success("Login details copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
      >
        <UserPlus className="h-4 w-4" />
        <span>+ Add Student</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/25 text-primary shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {createdStudent ? "Student Created Successfully" : "Create New Student Account"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {createdStudent
                    ? "Copy student login credentials and share them with the student."
                    : "Register student, collect fee, assign courses, and set referral."}
                </p>
              </div>
            </div>

            {/* Success Card */}
            {createdStudent ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Account Active & Ready for Login</span>
                  </div>

                  <div className="space-y-2 bg-background/80 rounded-lg p-3 border border-border font-mono text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Name:</span>
                      <span className="font-semibold text-foreground">{createdStudent.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Email:</span>
                      <span className="font-semibold text-primary">{createdStudent.email}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Password:</span>
                      <span className="font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded">
                        {createdStudent.plainPassword}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Referral Code:</span>
                      <span className="text-foreground">{createdStudent.referralCode}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                      <span className="text-muted-foreground font-sans">Sponsor / Referrer:</span>
                      <span className="font-semibold text-emerald-400">
                        {createdStudent.referrer
                          ? `${createdStudent.referrer.name || "Student"} (${createdStudent.referrer.referralCode})`
                          : "Direct Admin (SW30)"}
                      </span>
                    </div>
                    {createdStudent.feeCollected && createdStudent.feeCollected > 0 ? (
                      <div className="flex justify-between items-center py-0.5 border-b border-border/50">
                        <span className="text-muted-foreground font-sans">Course Fee Collected:</span>
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(createdStudent.feeCollected)} ({createdStudent.paymentMode})
                        </span>
                      </div>
                    ) : null}
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-muted-foreground font-sans">Assigned Courses:</span>
                      <span className="font-semibold text-emerald-400">
                        {createdStudent.assignedCoursesCount} Course(s)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={copyCredentials}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md"
                  >
                    {isCopied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                    <span>{isCopied ? "Copied to Clipboard!" : "Copy Full Login Message"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Student Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Vinayak Sahu"
                        className="flex h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Email & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="flex h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="8827665788"
                          className="flex h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-foreground">
                        Account Password (Optional)
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        Empty = Auto-generate secure password
                      </span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave empty to auto-generate"
                        className="flex h-9 w-full rounded-xl border border-input bg-background pl-9 pr-9 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Referral / Sponsor Selection */}
                  <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3">
                    <label className="block text-xs font-semibold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-primary" />
                        Referral / Sponsor Placement
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Where does this student join?
                      </span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label
                        className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          referralType === "DIRECT_ADMIN"
                            ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                            : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="referralType"
                          value="DIRECT_ADMIN"
                          checked={referralType === "DIRECT_ADMIN"}
                          onChange={() => {
                            setReferralType("DIRECT_ADMIN");
                            setReferrerInput("");
                            setVerifiedReferrer(null);
                            setReferrerError(null);
                          }}
                          className="mt-0.5 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <div>
                          <p className="font-semibold text-xs text-foreground">Direct Admin (SW30)</p>
                          <p className="text-[10px] text-muted-foreground">Trade Warrior Academy Root</p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          referralType === "OTHER_STUDENT"
                            ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                            : "border-border/60 hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <input
                          type="radio"
                          name="referralType"
                          value="OTHER_STUDENT"
                          checked={referralType === "OTHER_STUDENT"}
                          onChange={() => setReferralType("OTHER_STUDENT")}
                          className="mt-0.5 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <div>
                          <p className="font-semibold text-xs text-foreground">Other Student / Affiliate</p>
                          <p className="text-[10px] text-muted-foreground">Assign to another student's downline</p>
                        </div>
                      </label>
                    </div>

                    {referralType === "OTHER_STUDENT" && (
                      <div className="pt-2 space-y-1.5 animate-in fade-in duration-150">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                              type="text"
                              value={referrerInput}
                              onChange={(e) => {
                                setReferrerInput(e.target.value);
                                setVerifiedReferrer(null);
                                setReferrerError(null);
                              }}
                              placeholder="Enter Student Referral Code or Email..."
                              className="flex h-9 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isValidatingReferrer || !referrerInput.trim()}
                            onClick={handleVerifyReferrer}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            {isValidatingReferrer ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            <span>Verify</span>
                          </button>
                        </div>

                        {verifiedReferrer && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">
                              Verified: <strong>{verifiedReferrer.name || "Student"}</strong> ({verifiedReferrer.email}) • Code:{" "}
                              <code className="font-mono bg-emerald-500/20 px-1 py-0.5 rounded font-bold">
                                {verifiedReferrer.referralCode}
                              </code>
                            </span>
                          </div>
                        )}

                        {referrerError && (
                          <p className="text-[11px] text-destructive pl-1">{referrerError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Immediate Course Assignment */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        Assign Courses (Select to auto-calculate fee)
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {selectedCourses.length} selected
                      </span>
                    </label>

                    {availableCourses.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic bg-muted/20 p-2.5 rounded-xl border border-border">
                        No courses created yet. You can assign courses later.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-xl border border-border p-2 bg-muted/10">
                        {availableCourses.map((c) => {
                          const isChecked = selectedCourses.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-primary/40 bg-primary/10 text-foreground font-medium"
                                  : "border-border/60 hover:bg-muted/20 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate mr-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCourse(c.id)}
                                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span className="truncate">{c.title}</span>
                              </div>
                              <span className="text-[11px] font-mono shrink-0 font-bold text-primary">
                                {c.price ? `₹${c.price}` : "Free"}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Course Fee Collection Section */}
                  <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <IndianRupee className="h-4 w-4 text-emerald-400" />
                        Course Fee Collected (Orders & Revenue)
                      </label>
                      <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Syncs to Dashboard
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Fee Collected Amount (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={courseFee}
                            onChange={(e) => setCourseFee(e.target.value)}
                            placeholder="e.g. 14999"
                            className="flex h-9 w-full rounded-xl border border-input bg-background pl-7 pr-3 text-xs font-mono font-bold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                          Payment Method
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                        >
                          <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                          <option value="Cash Payment">Cash Payment (In-Hand)</option>
                          <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</option>
                          <option value="Debit / Credit Card">Debit / Credit Card</option>
                          <option value="Scholarship / Free Access">Scholarship / Free Access (₹0)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                        Transaction UTR / Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="e.g. UTR: 82910482014 or Cash received by Admin"
                        className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleClose}
                    className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-60"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Creating Student...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Create & Record Fee</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
