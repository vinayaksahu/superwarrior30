"use client";

import { useState, useTransition } from "react";
import {
  addModuleAction,
  updateModuleAction,
  deleteModuleAction,
  reorderModuleAction,
  addLessonAction,
  deleteLessonAction,
  reorderLessonAction,
  recalculateCourseDurationAction,
} from "@/server/actions/course.actions";
import { LessonEditModal } from "@/components/admin/lesson-edit-modal";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Video,
  FileText,
  AlignLeft,
  Eye,
  Loader2,
  Check,
  X,
  Clock,
  Layers,
  HelpCircle,
  Award,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface LessonType {
  id: string;
  moduleId: string;
  title: string;
  slug: string;
  position: number;
  contentType: string;
  videoKey: string | null;
  pdfKey: string | null;
  bunnyVideoId?: string | null;
  bunnyCdnUrl?: string | null;
  mediaProvider?: string | null;
  textContent: string | null;
  durationSec: number;
  isFreePreview: boolean;
  isPublished: boolean;
}

interface ModuleType {
  id: string;
  courseId: string;
  title: string;
  position: number;
  isPublished: boolean;
  lessons: LessonType[];
}

interface CourseBuilderProps {
  courseId: string;
  modules: ModuleType[];
}

export function CourseBuilder({ courseId, modules }: CourseBuilderProps) {
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");

  const [addingLessonModuleId, setAddingLessonModuleId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonType, setNewLessonType] = useState<
    "VIDEO" | "PDF" | "TEXT" | "QUIZ" | "ASSIGNMENT"
  >("VIDEO");

  const [activeEditingLesson, setActiveEditingLesson] = useState<LessonType | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModuleTitle.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", newModuleTitle);
      formData.set("isPublished", "true");

      const res = await addModuleAction(courseId, formData);
      if (res.success) {
        toast.success("Module added!");
        setNewModuleTitle("");
        setIsAddingModule(false);
      } else {
        toast.error(res.message || "Failed to add module");
      }
    });
  };

  const handleUpdateModule = (moduleId: string) => {
    if (!editingModuleTitle.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", editingModuleTitle);
      formData.set("isPublished", "true");

      const res = await updateModuleAction(moduleId, formData);
      if (res.success) {
        toast.success("Module updated!");
        setEditingModuleId(null);
      } else {
        toast.error(res.message || "Failed to update module");
      }
    });
  };

  const handleDeleteModule = (moduleId: string, title: string) => {
    if (!confirm(`Delete module "${title}" and all its lessons?`)) return;

    startTransition(async () => {
      const res = await deleteModuleAction(moduleId);
      if (res.success) {
        toast.success("Module deleted!");
      } else {
        toast.error(res.message || "Failed to delete module");
      }
    });
  };

  const handleReorderModule = (moduleId: string, direction: "up" | "down") => {
    startTransition(async () => {
      const res = await reorderModuleAction(moduleId, direction);
      if (!res.success) {
        toast.error(res.message || "Could not reorder");
      }
    });
  };

  const handleAddLesson = (moduleId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", newLessonTitle);
      formData.set("contentType", newLessonType);
      formData.set("isPublished", "true");

      const res = await addLessonAction(moduleId, formData);
      if (res.success) {
        toast.success("Lesson added!");
        setNewLessonTitle("");
        setAddingLessonModuleId(null);
      } else {
        toast.error(res.message || "Failed to add lesson");
      }
    });
  };

  const handleDeleteLesson = (lessonId: string, title: string) => {
    if (!confirm(`Delete lesson "${title}"?`)) return;

    startTransition(async () => {
      const res = await deleteLessonAction(lessonId);
      if (res.success) {
        toast.success("Lesson deleted!");
        await recalculateCourseDurationAction(courseId);
      } else {
        toast.error(res.message || "Failed to delete lesson");
      }
    });
  };

  const handleReorderLesson = (lessonId: string, direction: "up" | "down") => {
    startTransition(async () => {
      const res = await reorderLessonAction(lessonId, direction);
      if (!res.success) {
        toast.error(res.message || "Could not reorder");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Curriculum & Course Structure</h2>
          <p className="text-sm text-muted-foreground">
            Organize modules, upload videos and lesson PDFs, and configure free preview lessons
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingModule(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Module
        </button>
      </div>

      {/* Add Module Form */}
      {isAddingModule && (
        <form
          onSubmit={handleAddModule}
          className="rounded-xl border border-primary/40 bg-card p-5 shadow-md space-y-4 animate-in fade-in"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            New Module Title
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              placeholder="e.g. Module 1: Price Action Secrets & Chart Patterns"
              autoFocus
              required
              className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Module
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingModule(false);
                setNewModuleTitle("");
              }}
              className="rounded-md border border-input px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold">No modules created yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Click &quot;Add Module&quot; above to create sections for your course, then add lessons, videos, and PDFs.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {modules.map((module, modIndex) => (
            <div
              key={module.id}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
            >
              {/* Module Header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3.5">
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {module.position}
                  </span>

                  {editingModuleId === module.id ? (
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                      <input
                        type="text"
                        value={editingModuleTitle}
                        onChange={(e) => setEditingModuleTitle(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateModule(module.id)}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModuleId(null)}
                        className="p-1.5 text-muted-foreground hover:bg-accent rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                      {module.title}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={modIndex === 0 || isPending}
                    onClick={() => handleReorderModule(module.id, "up")}
                    className="p-1 text-muted-foreground hover:bg-accent hover:text-foreground rounded disabled:opacity-30"
                    title="Move module up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={modIndex === modules.length - 1 || isPending}
                    onClick={() => handleReorderModule(module.id, "down")}
                    className="p-1 text-muted-foreground hover:bg-accent hover:text-foreground rounded disabled:opacity-30"
                    title="Move module down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  <div className="h-4 w-px bg-border mx-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setEditingModuleId(module.id);
                      setEditingModuleTitle(module.title);
                    }}
                    className="p-1 text-muted-foreground hover:bg-accent hover:text-foreground rounded"
                    title="Rename module"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteModule(module.id, module.title)}
                    className="p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded"
                    title="Delete module"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Lessons within module */}
              <div className="p-4 space-y-2.5">
                {module.lessons.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground italic">
                    No lessons in this module. Click below to add your first lesson.
                  </p>
                ) : (
                  module.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-3 transition-colors hover:border-primary/30 hover:bg-background"
                    >
                      <div className="flex items-center gap-3 min-w-0 mr-3">
                        <span className="text-xs text-muted-foreground/70 font-mono w-5">
                          {module.position}.{lesson.position}
                        </span>

                        <div className="rounded-md bg-muted p-1.5 text-muted-foreground">
                          {lesson.contentType === "VIDEO" ? (
                            <Video className="h-4 w-4 text-primary" />
                          ) : lesson.contentType === "PDF" ? (
                            <FileText className="h-4 w-4 text-amber-500" />
                          ) : lesson.contentType === "TEXT" ? (
                            <AlignLeft className="h-4 w-4 text-sky-500" />
                          ) : lesson.contentType === "QUIZ" ? (
                            <HelpCircle className="h-4 w-4 text-purple-400" />
                          ) : (
                            <Award className="h-4 w-4 text-emerald-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {lesson.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-amber-400/90">
                              {lesson.contentType === "ASSIGNMENT"
                                ? "HOMEWORK / ASSIGNMENT"
                                : lesson.contentType}
                            </span>
                            {!lesson.isFreePreview && lesson.durationSec >= 60 && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.round(lesson.durationSec / 60)} min
                              </span>
                            )}
                            {lesson.isFreePreview && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                <Eye className="h-3 w-3" />
                                {lesson.contentType === "VIDEO"
                                  ? `Free Preview (${lesson.durationSec || 15}s)`
                                  : lesson.contentType === "PDF"
                                  ? `Free Preview (${lesson.durationSec || 1} Page${(lesson.durationSec || 1) > 1 ? "s" : ""})`
                                  : `Free Preview (${lesson.durationSec || 150} Words)`}
                              </span>
                            )}
                            {(lesson.videoKey || lesson.bunnyVideoId) && (
                              <span className="text-[10px] text-primary font-medium">● Video Active</span>
                            )}
                            {(lesson.pdfKey || lesson.bunnyCdnUrl) && (
                              <span className="text-[10px] text-amber-500 font-medium">● PDF Active</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={lessonIndex === 0 || isPending}
                          onClick={() => handleReorderLesson(lesson.id, "up")}
                          className="p-1 text-muted-foreground hover:bg-accent rounded disabled:opacity-30"
                          title="Move lesson up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={lessonIndex === module.lessons.length - 1 || isPending}
                          onClick={() => handleReorderLesson(lesson.id, "down")}
                          className="p-1 text-muted-foreground hover:bg-accent rounded disabled:opacity-30"
                          title="Move lesson down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveEditingLesson(lesson)}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/80 ml-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit Content
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                          className="p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded ml-1"
                          title="Delete lesson"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Add lesson inline form */}
                {addingLessonModuleId === module.id ? (
                  <form
                    onSubmit={(e) => handleAddLesson(module.id, e)}
                    className="rounded-lg border border-primary/30 bg-muted/30 p-3 space-y-3 mt-2 animate-in fade-in"
                  >
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={newLessonTitle}
                        onChange={(e) => setNewLessonTitle(e.target.value)}
                        placeholder="e.g. Risk Management Rules & Position Sizing"
                        autoFocus
                        required
                        className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-xs"
                      />
                      <select
                        value={newLessonType}
                        onChange={(e) =>
                          setNewLessonType(
                            e.target.value as "VIDEO" | "PDF" | "TEXT" | "QUIZ" | "ASSIGNMENT"
                          )
                        }
                        className="h-9 rounded-md border border-input bg-background px-2.5 text-xs font-semibold"
                      >
                        <option value="VIDEO">Video Lesson</option>
                        <option value="PDF">PDF Document</option>
                        <option value="TEXT">Text Article</option>
                        <option value="QUIZ">Quiz</option>
                        <option value="ASSIGNMENT">Homework / Assignment</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingLessonModuleId(null);
                          setNewLessonTitle("");
                        }}
                        className="rounded-md border border-input px-3 py-1 text-xs hover:bg-accent"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                        Add Lesson
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingLessonModuleId(module.id)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-foreground mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Lesson to {module.title}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lesson Edit Modal */}
      {activeEditingLesson && (
        <LessonEditModal
          courseId={courseId}
          lesson={activeEditingLesson}
          onClose={() => setActiveEditingLesson(null)}
          onRefresh={() => {
            // will revalidate from server actions
          }}
        />
      )}
    </div>
  );
}
