"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getLessonQuizAction,
  saveQuizAction,
  type QuizQuestionInput,
  type QuizOptionInput,
} from "@/server/actions/quiz.actions";
import {
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Clock,
  Award,
  CheckSquare,
  Sparkles,
  Save,
  Loader2,
  X,
  AlertCircle,
  Sliders,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface QuizBuilderProps {
  lessonId: string;
  lessonTitle: string;
  onSaveSuccess?: () => void;
  onClose?: () => void;
}

export function QuizBuilder({
  lessonId,
  lessonTitle,
  onSaveSuccess,
  onClose,
}: QuizBuilderProps) {
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Quiz Settings State
  const [title, setTitle] = useState(lessonTitle || "Lesson Quiz");
  const [description, setDescription] = useState("");
  const [passingPercentage, setPassingPercentage] = useState(70);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | "">("");
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [showAnswers, setShowAnswers] = useState<"IMMEDIATELY" | "AFTER_REVIEW" | "NEVER">("IMMEDIATELY");
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // Questions State
  const [questions, setQuestions] = useState<QuizQuestionInput[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);

  // Load existing quiz data if any
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    async function loadQuiz() {
      try {
        const res = await getLessonQuizAction(lessonId);
        if (!isMounted) return;

        if (res && res.quiz) {
          setTitle(res.quiz.title || lessonTitle);
          setDescription(res.quiz.description || "");
          setPassingPercentage(res.quiz.passingPercentage || 70);
          setTimeLimitMinutes(res.quiz.timeLimitMinutes ?? "");
          setMaxAttempts(res.quiz.maxAttempts || 3);
          setShowAnswers(res.quiz.showAnswers as any);
          setShuffleQuestions(res.quiz.shuffleQuestions);
          setShuffleOptions(res.quiz.shuffleOptions);
          setIsPublished(res.quiz.isPublished);

          if (res.quiz.questions && res.quiz.questions.length > 0) {
            setQuestions(
              res.quiz.questions.map((q: any) => ({
                id: q.id,
                questionText: q.questionText,
                questionType: q.questionType,
                imageUrl: q.imageUrl,
                marks: q.marks,
                explanation: q.explanation,
                sortOrder: q.sortOrder,
                options: q.options.map((o: any) => ({
                  id: o.id,
                  optionText: o.optionText,
                  isCorrect: Boolean(o.isCorrect),
                  sortOrder: o.sortOrder,
                })),
              }))
            );
          } else {
            // Default 1 question
            initDefaultQuestion();
          }
        } else {
          initDefaultQuestion();
        }
      } catch (err) {
        console.error("Failed to load quiz:", err);
        initDefaultQuestion();
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadQuiz();
    return () => {
      isMounted = false;
    };
  }, [lessonId, lessonTitle]);

  const initDefaultQuestion = () => {
    setQuestions([
      {
        questionText: "What is the primary concept covered in this lesson?",
        questionType: "SINGLE_CHOICE",
        marks: 1,
        explanation: "Correct answer rationale explanation.",
        sortOrder: 0,
        options: [
          { optionText: "Option A", isCorrect: true, sortOrder: 0 },
          { optionText: "Option B", isCorrect: false, sortOrder: 1 },
          { optionText: "Option C", isCorrect: false, sortOrder: 2 },
          { optionText: "Option D", isCorrect: false, sortOrder: 3 },
        ],
      },
    ]);
  };

  const handleAddQuestion = () => {
    const newQ: QuizQuestionInput = {
      questionText: `New Question ${questions.length + 1}`,
      questionType: "SINGLE_CHOICE",
      marks: 1,
      explanation: "",
      sortOrder: questions.length,
      options: [
        { optionText: "Option 1", isCorrect: true, sortOrder: 0 },
        { optionText: "Option 2", isCorrect: false, sortOrder: 1 },
      ],
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const target = questions[idx];
    const dup: QuizQuestionInput = {
      ...JSON.parse(JSON.stringify(target)),
      id: undefined,
      questionText: `${target.questionText} (Copy)`,
      sortOrder: questions.length,
    };
    setQuestions([...questions, dup]);
    setActiveQuestionIndex(questions.length);
    toast.success("Question duplicated");
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.error("Quiz must have at least one question.");
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    if (activeQuestionIndex >= updated.length) {
      setActiveQuestionIndex(updated.length - 1);
    }
  };

  const handleMoveQuestion = (idx: number, direction: "up" | "down") => {
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === questions.length - 1) return;

    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    const updated = [...questions];
    const temp = updated[idx];
    updated[idx] = updated[newIdx];
    updated[newIdx] = temp;
    setQuestions(updated);
    setActiveQuestionIndex(newIdx);
  };

  const handleUpdateActiveQuestion = (patch: Partial<QuizQuestionInput>) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[activeQuestionIndex] = { ...updated[activeQuestionIndex], ...patch };
      return updated;
    });
  };

  const handleAddOption = () => {
    const activeQ = questions[activeQuestionIndex];
    const newOpt: QuizOptionInput = {
      optionText: `Option ${activeQ.options.length + 1}`,
      isCorrect: false,
      sortOrder: activeQ.options.length,
    };
    handleUpdateActiveQuestion({
      options: [...activeQ.options, newOpt],
    });
  };

  const handleUpdateOption = (optIdx: number, patch: Partial<QuizOptionInput>) => {
    const activeQ = questions[activeQuestionIndex];
    const updatedOpts = [...activeQ.options];
    updatedOpts[optIdx] = { ...updatedOpts[optIdx], ...patch };

    // If single choice or true/false, make sure only 1 option is marked correct
    if (
      (activeQ.questionType === "SINGLE_CHOICE" || activeQ.questionType === "TRUE_FALSE") &&
      patch.isCorrect === true
    ) {
      updatedOpts.forEach((o, i) => {
        if (i !== optIdx) o.isCorrect = false;
      });
    }

    handleUpdateActiveQuestion({ options: updatedOpts });
  };

  const handleDeleteOption = (optIdx: number) => {
    const activeQ = questions[activeQuestionIndex];
    if (activeQ.options.length <= 2) {
      toast.error("Question must have at least 2 options.");
      return;
    }
    const updatedOpts = activeQ.options.filter((_, i) => i !== optIdx);
    handleUpdateActiveQuestion({ options: updatedOpts });
  };

  const handleQuestionTypeChange = (type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE") => {
    if (type === "TRUE_FALSE") {
      handleUpdateActiveQuestion({
        questionType: type,
        options: [
          { optionText: "True", isCorrect: true, sortOrder: 0 },
          { optionText: "False", isCorrect: false, sortOrder: 1 },
        ],
      });
    } else {
      handleUpdateActiveQuestion({ questionType: type });
    }
  };

  const handleSaveQuiz = () => {
    // Validation
    if (!title.trim()) {
      toast.error("Quiz title is required.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        toast.error(`Question ${i + 1} text cannot be empty.`);
        return;
      }
      if (q.options.length < 2) {
        toast.error(`Question ${i + 1} must have at least 2 options.`);
        return;
      }
      const hasCorrect = q.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        toast.error(`Question ${i + 1} must have at least one correct answer selected.`);
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await saveQuizAction(lessonId, {
          title,
          description,
          passingPercentage: Number(passingPercentage) || 70,
          timeLimitMinutes: timeLimitMinutes === "" ? null : Number(timeLimitMinutes),
          maxAttempts: Number(maxAttempts) || 1,
          showAnswers,
          shuffleQuestions,
          shuffleOptions,
          isPublished,
          questions,
        });

        if (res.success) {
          toast.success("Quiz saved successfully!");
          if (onSaveSuccess) onSaveSuccess();
          if (onClose) onClose();
        } else {
          toast.error("Failed to save quiz");
        }
      } catch (err: any) {
        toast.error(err.message || "Error saving quiz");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading Quiz Builder...</span>
      </div>
    );
  }

  const activeQuestion = questions[activeQuestionIndex] || questions[0];
  const totalCalculatedMarks = questions.reduce((acc, q) => acc + (q.marks || 1), 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card: Title, Settings */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-foreground">Quiz Configuration</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              Total Questions: <span className="text-amber-400">{questions.length}</span> | Total Marks:{" "}
              <span className="text-amber-400">{totalCalculatedMarks}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground">Quiz Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Risk Management & Order Flow Test"
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">Instructions / Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Read each scenario carefully before choosing your answer."
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Passing %</label>
            <input
              type="number"
              min={1}
              max={100}
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Time Limit (Mins)</label>
            <input
              type="number"
              min={0}
              placeholder="No limit"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Max Attempts</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Show Answers</label>
            <select
              value={showAnswers}
              onChange={(e) => setShowAnswers(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-1.5 text-xs font-bold"
            >
              <option value="IMMEDIATELY">Immediately After Submit</option>
              <option value="AFTER_REVIEW">After All Attempts</option>
              <option value="NEVER">Never Reveal</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border/60 text-xs font-semibold">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(e) => setShuffleQuestions(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Shuffle Questions</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(e) => setShuffleOptions(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary h-4 w-4"
            />
            <span>Shuffle Options</span>
          </label>
        </div>
      </div>

      {/* Main Builder Grid: Left Question Sidebar + Right Question Editor */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Left Column: Questions List (md:col-span-4) */}
        <div className="md:col-span-4 space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Questions ({questions.length})
            </span>
            <button
              type="button"
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <div
                key={idx}
                onClick={() => setActiveQuestionIndex(idx)}
                className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold cursor-pointer transition-all ${
                  activeQuestionIndex === idx
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 mr-1">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-background text-[11px] font-extrabold border border-border">
                    {idx + 1}
                  </span>
                  <span className="truncate text-xs font-semibold">{q.questionText || "Empty Question"}</span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveQuestion(idx, "up");
                    }}
                    disabled={idx === 0}
                    className="p-1 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveQuestion(idx, "down");
                    }}
                    disabled={idx === questions.length - 1}
                    className="p-1 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Question Editor (md:col-span-8) */}
        <div className="md:col-span-8 space-y-4 rounded-2xl border border-border bg-card p-5">
          {activeQuestion && (
            <>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-black font-extrabold text-xs">
                    {activeQuestionIndex + 1}
                  </span>
                  <span className="text-sm font-extrabold text-foreground">Question Details</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(activeQuestionIndex)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(activeQuestionIndex)}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="text-xs font-bold text-foreground">Question Text</label>
                <textarea
                  rows={2}
                  value={activeQuestion.questionText}
                  onChange={(e) => handleUpdateActiveQuestion({ questionText: e.target.value })}
                  placeholder="Enter the question text..."
                  className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-xs leading-relaxed focus:border-primary focus:outline-none"
                />
              </div>

              {/* Type, Marks, Image */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Question Type</label>
                  <select
                    value={activeQuestion.questionType}
                    onChange={(e) => handleQuestionTypeChange(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold"
                  >
                    <option value="SINGLE_CHOICE">Single Choice</option>
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={activeQuestion.marks || 1}
                    onChange={(e) => handleUpdateActiveQuestion({ marks: Number(e.target.value) || 1 })}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Image URL (Optional)</label>
                  <input
                    type="text"
                    value={activeQuestion.imageUrl || ""}
                    onChange={(e) => handleUpdateActiveQuestion({ imageUrl: e.target.value || null })}
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Options Section */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    Options & Correct Answer
                  </label>
                  {activeQuestion.questionType !== "TRUE_FALSE" && (
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {activeQuestion.options.map((opt, optIdx) => (
                    <div
                      key={optIdx}
                      className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${
                        opt.isCorrect
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : "border-border bg-background"
                      }`}
                    >
                      {/* Checkbox / Radio toggle */}
                      <button
                        type="button"
                        onClick={() => handleUpdateOption(optIdx, { isCorrect: !opt.isCorrect })}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold transition-all ${
                          opt.isCorrect
                            ? "bg-emerald-500 border-emerald-500 text-black shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:border-emerald-500/50"
                        }`}
                        title={opt.isCorrect ? "Correct Answer" : "Click to mark as correct"}
                      >
                        {opt.isCorrect ? "✓" : String.fromCharCode(65 + optIdx)}
                      </button>

                      <input
                        type="text"
                        value={opt.optionText}
                        onChange={(e) => handleUpdateOption(optIdx, { optionText: e.target.value })}
                        placeholder={`Option ${optIdx + 1}`}
                        className="flex-1 bg-transparent text-xs font-semibold focus:outline-none"
                      />

                      {activeQuestion.questionType !== "TRUE_FALSE" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(optIdx)}
                          className="rounded p-1 text-muted-foreground hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Explanation / Solution Note */}
              <div className="pt-2">
                <label className="text-xs font-bold text-foreground">Explanation / Solution (Shown after review)</label>
                <textarea
                  rows={2}
                  value={activeQuestion.explanation || ""}
                  onChange={(e) => handleUpdateActiveQuestion({ explanation: e.target.value })}
                  placeholder="Explain why the correct answer is right..."
                  className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={handleSaveQuiz}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Quiz & Questions
        </button>
      </div>
    </div>
  );
}
