"use client";

import React, { useState, useEffect } from "react";
import {
  getAdminQuizzesAction,
  getAdminQuizAttemptsAction,
  getAdminQuizAttemptDetailAction,
} from "@/server/actions/quiz.actions";
import {
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Search,
  Loader2,
  X,
  ChevronRight,
  TrendingUp,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Quiz Attempts List State
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Single Attempt Inspector State
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [attemptDetail, setAttemptDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadQuizzes = async () => {
    setLoading(true);
    try {
      const res = await getAdminQuizzesAction();
      setQuizzes(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const handleOpenQuizAttempts = async (quiz: any) => {
    setSelectedQuiz(quiz);
    setLoadingAttempts(true);
    try {
      const res = await getAdminQuizAttemptsAction(quiz.id);
      setAttempts(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load quiz attempts");
    } finally {
      setLoadingAttempts(false);
    }
  };

  const handleInspectAttempt = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setLoadingDetail(true);
    try {
      const detail = await getAdminQuizAttemptDetailAction(attemptId);
      setAttemptDetail(detail);
    } catch (err: any) {
      toast.error(err.message || "Failed to load attempt details");
      setSelectedAttemptId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    const s = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(s) ||
      q.courseTitle.toLowerCase().includes(s) ||
      q.moduleTitle.toLowerCase().includes(s)
    );
  });

  const totalQuizzes = quizzes.length;
  const totalAttemptsCount = quizzes.reduce((acc, q) => acc + q.attemptsCount, 0);
  const totalPassedCount = quizzes.reduce((acc, q) => acc + q.passedAttempts, 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Quiz Assessments Management
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Monitor all course quizzes, student attempt metrics, passing percentages, and detailed test answers.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Total Quizzes
            </span>
            <HelpCircle className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{totalQuizzes}</p>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Total Attempts Taken
            </span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{totalAttemptsCount}</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Passed Attempts
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-foreground">{totalPassedCount}</p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search quizzes by title or course..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-input bg-card pl-9 pr-3.5 py-2 text-xs focus:border-primary focus:outline-none"
        />
      </div>

      {/* Quizzes Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <p className="text-xs text-muted-foreground">Loading quizzes...</p>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <HelpCircle className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No quizzes found</p>
            <p className="text-xs text-muted-foreground">Add Quiz lessons in the course curriculum editor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5">Quiz Title</th>
                  <th className="px-5 py-3.5">Course / Module</th>
                  <th className="px-5 py-3.5">Questions</th>
                  <th className="px-5 py-3.5">Passing %</th>
                  <th className="px-5 py-3.5">Total Attempts</th>
                  <th className="px-5 py-3.5">Avg Score</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredQuizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 font-bold text-foreground max-w-xs truncate">
                      {q.title}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      <p className="font-semibold text-foreground">{q.courseTitle}</p>
                      <p className="text-[11px]">{q.moduleTitle}</p>
                    </td>

                    <td className="px-5 py-4 font-mono font-bold text-foreground">
                      {q.questionsCount}
                    </td>

                    <td className="px-5 py-4 font-bold text-emerald-400">
                      {q.passingPercentage}%
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-bold text-foreground">{q.attemptsCount}</span>
                      <span className="text-[11px] text-muted-foreground ml-1">
                        ({q.passedAttempts} passed / {q.failedAttempts} failed)
                      </span>
                    </td>

                    <td className="px-5 py-4 font-black text-amber-400">
                      {q.avgScore}%
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenQuizAttempts(q)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Attempts
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz Attempts Drawer / Modal */}
      {selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card shadow-2xl my-8 p-6 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">{selectedQuiz.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Course: {selectedQuiz.courseTitle} • Passing Requirement: {selectedQuiz.passingPercentage}%
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedQuiz(null);
                  setAttempts([]);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingAttempts ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : attempts.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No student attempts recorded yet for this quiz.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Attempt</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Percentage</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Submitted At</th>
                      <th className="px-4 py-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attempts.map((att) => {
                      const isPassed = att.status === "PASSED";
                      return (
                        <tr key={att.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-semibold text-foreground">
                            <p>{att.studentName}</p>
                            <p className="text-[11px] text-muted-foreground">{att.studentEmail}</p>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">#{att.attemptNumber}</td>
                          <td className="px-4 py-3 font-bold text-foreground">
                            {att.score} / {att.totalMarks}
                          </td>
                          <td className="px-4 py-3 font-black text-amber-400">{att.percentage}%</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                isPassed
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-red-500/10 border-red-500/30 text-red-400"
                              }`}
                            >
                              {att.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-[11px]">
                            {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleInspectAttempt(att.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-background border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted cursor-pointer"
                            >
                              <Eye className="h-3 w-3" />
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attempt Inspector Modal */}
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl my-8 p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Attempt Inspection</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Student: {attemptDetail?.user?.name || attemptDetail?.user?.email} • Score:{" "}
                  {attemptDetail?.score}/{attemptDetail?.totalMarks} ({attemptDetail?.percentage}%)
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedAttemptId(null);
                  setAttemptDetail(null);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
              </div>
            ) : attemptDetail ? (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {attemptDetail.quiz.questions.map((q: any, idx: number) => {
                  const studentAns = attemptDetail.answers.find((a: any) => a.questionId === q.id);
                  const selectedIds: string[] = studentAns?.selectedOptionIds || [];
                  const isCorrect = studentAns?.isCorrect;

                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 space-y-2 text-xs ${
                        isCorrect
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-red-500/30 bg-red-500/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-extrabold text-foreground">
                          Q{idx + 1}. {q.questionText}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCorrect
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {isCorrect ? `+${studentAns?.marksAwarded} Marks` : "0 Marks"}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt: any) => {
                          const isStudentSelected = selectedIds.includes(opt.id);
                          const isOptionCorrect = opt.isCorrect;

                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 rounded-lg border p-2 ${
                                isStudentSelected && isOptionCorrect
                                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold"
                                  : isStudentSelected && !isOptionCorrect
                                  ? "border-red-500 bg-red-500/20 text-red-200 font-bold"
                                  : isOptionCorrect
                                  ? "border-emerald-500/40 text-emerald-300"
                                  : "border-border/50 text-muted-foreground"
                              }`}
                            >
                              <span>{isStudentSelected ? "●" : "○"}</span>
                              <span>{opt.optionText}</span>
                              {isOptionCorrect && (
                                <span className="ml-auto text-[9px] font-bold text-emerald-400">
                                  [Correct Answer]
                                </span>
                              )}
                              {isStudentSelected && !isOptionCorrect && (
                                <span className="ml-auto text-[9px] font-bold text-red-400">
                                  [Student Selected]
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <p className="text-[11px] text-muted-foreground pt-1">
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
