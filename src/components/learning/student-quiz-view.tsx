"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  getLessonQuizAction,
  startQuizAttemptAction,
  submitQuizAttemptAction,
} from "@/server/actions/quiz.actions";
import {
  Sparkles,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Flame,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

interface StudentQuizViewProps {
  lessonId: string;
  courseSlug: string;
  onLessonCompleted?: () => void;
}

export function StudentQuizView({
  lessonId,
  courseSlug,
  onLessonCompleted,
}: StudentQuizViewProps) {
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<any>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [quizState, setQuizState] = useState<"INTRO" | "IN_PROGRESS" | "RESULT">("INTRO");

  // In-Progress Quiz State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, { selectedOptionIds: string[]; textAnswer?: string }>
  >({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  // Fetch Quiz & User Attempts
  const loadQuiz = async () => {
    setLoading(true);
    try {
      const res = await getLessonQuizAction(lessonId);
      if (res && res.quiz) {
        setQuizData(res);
        const latestAttempt = res.userAttempts[0];
        if (latestAttempt && latestAttempt.status !== "IN_PROGRESS") {
          setSubmissionResult(latestAttempt);
          setQuizState("RESULT");
        } else if (latestAttempt && latestAttempt.status === "IN_PROGRESS") {
          setActiveAttemptId(latestAttempt.id);
          setQuizState("IN_PROGRESS");
        } else {
          setQuizState("INTRO");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load quiz");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuiz();
  }, [lessonId]);

  // Countdown Timer
  useEffect(() => {
    if (quizState !== "IN_PROGRESS" || timeRemainingSeconds === null) return;
    if (timeRemainingSeconds <= 0) {
      toast.warning("Time is up! Submitting your answers automatically...");
      handleFinalSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, timeRemainingSeconds]);

  const handleStartQuiz = async () => {
    if (!quizData?.quiz?.id) return;

    try {
      const res = await startQuizAttemptAction(quizData.quiz.id);
      if (res.success) {
        setActiveAttemptId(res.attemptId);
        setCurrentQuestionIdx(0);
        setSelectedAnswers({});

        if (quizData.quiz.timeLimitMinutes) {
          setTimeRemainingSeconds(quizData.quiz.timeLimitMinutes * 60);
        } else {
          setTimeRemainingSeconds(null);
        }

        setQuizState("IN_PROGRESS");
        toast.success(`Quiz Attempt ${res.attemptNumber} Started!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to start quiz attempt");
    }
  };

  const handleSelectOption = (questionId: string, optionId: string, isMultiple: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId]?.selectedOptionIds || [];
      let nextSelected: string[];

      if (isMultiple) {
        nextSelected = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      } else {
        nextSelected = [optionId];
      }

      return {
        ...prev,
        [questionId]: {
          selectedOptionIds: nextSelected,
          textAnswer: prev[questionId]?.textAnswer,
        },
      };
    });
  };

  const handleFinalSubmit = () => {
    if (!activeAttemptId || !quizData?.quiz) return;

    const formattedAnswers = quizData.quiz.questions.map((q: any) => ({
      questionId: q.id,
      selectedOptionIds: selectedAnswers[q.id]?.selectedOptionIds || [],
      textAnswer: selectedAnswers[q.id]?.textAnswer,
    }));

    startSubmitTransition(async () => {
      try {
        const timeTaken = quizData.quiz.timeLimitMinutes
          ? quizData.quiz.timeLimitMinutes * 60 - (timeRemainingSeconds || 0)
          : undefined;

        const result = await submitQuizAttemptAction(activeAttemptId, formattedAnswers, timeTaken);
        if (result.success) {
          setSubmissionResult(result);
          setShowSubmitModal(false);
          setQuizState("RESULT");
          await loadQuiz();

          if (result.isPassed) {
            toast.success(`🎉 Congratulations! You PASSED with ${result.percentage}%!`);
            if (onLessonCompleted) onLessonCompleted();
          } else {
            toast.error(`You scored ${result.percentage}%. Passing criteria: ${quizData.quiz.passingPercentage}%.`);
          }
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to submit quiz");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        <p className="text-xs text-muted-foreground">Loading Quiz Assessment...</p>
      </div>
    );
  }

  if (!quizData?.quiz) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
        <HelpCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <h3 className="text-base font-bold text-foreground">No Quiz Found</h3>
        <p className="text-xs text-muted-foreground mt-1">This quiz is not yet published or configured.</p>
      </div>
    );
  }

  const { quiz, userAttempts, canAttempt, attemptsCount, maxAttempts } = quizData;
  const questions = quiz.questions || [];
  const currentQ = questions[currentQuestionIdx];

  // Helper for timer format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ========================================================
  // VIEW 1: INTRO SCREEN
  // ========================================================
  if (quizState === "INTRO") {
    const totalMarks = questions.reduce((acc: number, q: any) => acc + (q.marks || 1), 0);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 px-3 py-0.5 text-xs font-bold text-purple-400">
                <HelpCircle className="h-3.5 w-3.5" />
                Lesson Assessment
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {quiz.title}
              </h2>
              {quiz.description && (
                <p className="text-sm text-muted-foreground">{quiz.description}</p>
              )}
            </div>

            {canAttempt && (
              <button
                type="button"
                onClick={handleStartQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-extrabold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer shrink-0"
              >
                <Flame className="h-4 w-4" />
                Start Quiz Now
              </button>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Questions
              </span>
              <p className="text-lg font-black text-foreground">{questions.length}</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Marks
              </span>
              <p className="text-lg font-black text-amber-400">{totalMarks}</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Passing Score
              </span>
              <p className="text-lg font-black text-emerald-400">{quiz.passingPercentage}%</p>
            </div>

            <div className="rounded-xl border border-border bg-background p-4 space-y-1 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Time Limit
              </span>
              <p className="text-lg font-black text-sky-400">
                {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} Mins` : "Unlimited"}
              </p>
            </div>
          </div>

          {/* Attempts Status */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Attempts Used: <strong className="text-foreground">{attemptsCount}</strong> of{" "}
                <strong className="text-foreground">{maxAttempts}</strong>
              </span>
            </div>

            {userAttempts.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSubmissionResult(userAttempts[0]);
                  setQuizState("RESULT");
                }}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                View Latest Result
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // VIEW 2: ACTIVE IN-PROGRESS QUIZ
  // ========================================================
  if (quizState === "IN_PROGRESS" && currentQ) {
    const isMultiple = currentQ.questionType === "MULTIPLE_CHOICE";
    const selectedOptionIds = selectedAnswers[currentQ.id]?.selectedOptionIds || [];
    const answeredCount = Object.keys(selectedAnswers).filter(
      (k) => selectedAnswers[k]?.selectedOptionIds?.length > 0
    ).length;

    return (
      <div className="space-y-5">
        {/* Top Floating Quiz Navigation & Timer Bar */}
        <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur px-5 py-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-muted-foreground">
              Question <strong className="text-foreground">{currentQuestionIdx + 1}</strong> of{" "}
              <strong>{questions.length}</strong>
            </span>
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Answered: {answeredCount}/{questions.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {timeRemainingSeconds !== null && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-extrabold border ${
                  timeRemainingSeconds < 60
                    ? "bg-red-500/15 border-red-500/30 text-red-400 animate-pulse"
                    : "bg-background border-border text-foreground"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                {formatTime(timeRemainingSeconds)}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
            >
              Submit Quiz
            </button>
          </div>
        </div>

        {/* Question Pagination Dots */}
        <div className="flex flex-wrap items-center gap-1.5 p-1">
          {questions.map((q: any, idx: number) => {
            const isAnswered = (selectedAnswers[q.id]?.selectedOptionIds?.length || 0) > 0;
            const isCurrent = currentQuestionIdx === idx;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentQuestionIdx(idx)}
                className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-amber-400 text-black shadow-md ring-2 ring-amber-400/40"
                    : isAnswered
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                    : "bg-card border border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question Card */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                Question {currentQuestionIdx + 1} ({currentQ.marks || 1} Mark{(currentQ.marks || 1) > 1 ? "s" : ""})
              </span>
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-relaxed whitespace-pre-wrap">
                {currentQ.questionText}
              </h3>
            </div>

            {isMultiple && (
              <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md shrink-0">
                Multiple Answers
              </span>
            )}
          </div>

          {currentQ.imageUrl && (
            <div className="rounded-xl border border-border overflow-hidden max-h-96">
              <img
                src={currentQ.imageUrl}
                alt="Question diagram"
                className="w-full h-auto object-contain"
              />
            </div>
          )}

          {/* Options Grid */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt: any, optIdx: number) => {
              const isSelected = selectedOptionIds.includes(opt.id);
              const letter = String.fromCharCode(65 + optIdx);

              return (
                <div
                  key={opt.id}
                  onClick={() => handleSelectOption(currentQ.id, opt.id, isMultiple)}
                  className={`flex items-center gap-3.5 rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500/60 shadow-md text-amber-200"
                      : "bg-background/80 border-border hover:border-muted-foreground/40 text-foreground"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-extrabold text-xs transition-all ${
                      isSelected
                        ? "bg-amber-400 text-black shadow-sm"
                        : "bg-card border border-border text-muted-foreground"
                    }`}
                  >
                    {isSelected ? "✓" : letter}
                  </div>

                  <span className="text-sm font-semibold flex-1 leading-relaxed">
                    {opt.optionText}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Prev / Next Buttons */}
          <div className="flex items-center justify-between border-t border-border pt-6">
            <button
              type="button"
              disabled={currentQuestionIdx === 0}
              onClick={() => setCurrentQuestionIdx((p) => p - 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            {currentQuestionIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
              >
                Next Question
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 text-black px-6 py-2 text-xs font-extrabold shadow-lg hover:bg-emerald-400 cursor-pointer"
              >
                Review & Submit Quiz
              </button>
            )}
          </div>
        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">Submit Your Quiz?</h3>
                  <p className="text-xs text-muted-foreground">
                    You have answered {answeredCount} of {questions.length} questions.
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Once submitted, your answers will be automatically evaluated server-side and recorded in your course progress.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Continue Reviewing
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm & Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // VIEW 3: RESULT & ANSWERS REVIEW
  // ========================================================
  if (quizState === "RESULT" && submissionResult) {
    const isPassed = submissionResult.status === "PASSED" || submissionResult.isPassed;
    const percentage = submissionResult.percentage;

    return (
      <div className="space-y-6">
        {/* Score Card Banner */}
        <div
          className={`rounded-2xl border p-6 sm:p-8 space-y-4 shadow-xl text-center relative overflow-hidden ${
            isPassed
              ? "border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-card"
              : "border-red-500/40 bg-gradient-to-b from-red-500/10 to-card"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-extrabold border mx-auto">
            {isPassed ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> PASSED ASSESSMENT
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-400">
                <XCircle className="h-4 w-4" /> NEEDS IMPROVEMENT
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
              {percentage}%
            </h2>
            <p className="text-xs text-muted-foreground font-semibold">
              Score: <strong className="text-foreground">{submissionResult.score}</strong> /{" "}
              <strong>{submissionResult.totalMarks}</strong> Marks (Passing requirement:{" "}
              {quiz.passingPercentage}%)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {canAttempt && (
              <button
                type="button"
                onClick={handleStartQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retake Quiz (Attempt {attemptsCount + 1} of {maxAttempts})
              </button>
            )}

            <button
              type="button"
              onClick={() => setQuizState("INTRO")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Back to Overview
            </button>
          </div>
        </div>

        {/* Detailed Questions Review if permitted */}
        {questions.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-extrabold text-base text-foreground">Assessment Review</h3>
              <span className="text-xs text-muted-foreground">
                Showing all {questions.length} questions
              </span>
            </div>

            <div className="space-y-6">
              {questions.map((q: any, idx: number) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-border/80 bg-background/60 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <span className="text-[11px] font-extrabold uppercase text-amber-400">
                        Question {idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{q.questionText}</p>
                    </div>
                  </div>

                  {/* Options Display */}
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt: any) => {
                      const isCorrect = opt.isCorrect;
                      return (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-3 rounded-xl border p-3 text-xs font-medium ${
                            isCorrect === true
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold"
                              : "border-border/60 bg-muted/20 text-muted-foreground"
                          }`}
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-border text-[10px] font-bold">
                            {isCorrect ? "✓" : "•"}
                          </span>
                          <span>{opt.optionText}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[10px] font-bold text-emerald-400">
                              Correct Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
                      <strong className="text-foreground">Explanation:</strong>
                      <p>{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
