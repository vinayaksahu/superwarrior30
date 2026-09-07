"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/dal/auth";
import { ensureDatabaseSchemaSync } from "@/lib/db-sync";
import type {
  CreatePsychologyInput,
  PsychologyEntry,
  PsychologyMood,
  StudentPsychologyData,
} from "@/types/psychology";

// ==========================================
// 1. GET STUDENT PSYCHOLOGY LOGS & AVERAGES
// ==========================================

export async function getStudentPsychologyLogsAction(): Promise<{
  success: boolean;
  data: StudentPsychologyData;
  error?: string;
}> {
  const defaultData: StudentPsychologyData = {
    entries: [],
    averages: {
      avgConfidence: 0,
      avgStress: 0,
      avgDiscipline: 0,
      totalEntries: 0,
      moodDistribution: {
        GREAT: 0,
        NEUTRAL: 0,
        STRESSED: 0,
        DOWN: 0,
      },
    },
  };

  const user = await getCurrentUser();
  if (!user) {
    return { success: false, data: defaultData, error: "Unauthorized" };
  }

  try {
    await ensureDatabaseSchemaSync();

    const rawEntries = await prisma.psychologyLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const entries: PsychologyEntry[] = rawEntries.map((e) => {
      let checklist: string[] = [];
      if (Array.isArray(e.checklist)) {
        checklist = e.checklist as string[];
      } else if (typeof e.checklist === "string") {
        try {
          checklist = JSON.parse(e.checklist);
        } catch {
          checklist = [];
        }
      }

      return {
        id: e.id,
        userId: e.userId,
        date: e.date,
        time: e.time,
        mood: (e.mood || "NEUTRAL") as PsychologyMood,
        confidence: e.confidence,
        stress: e.stress,
        discipline: e.discipline,
        notes: e.notes,
        checklist,
        checklistScore: e.checklistScore,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    });

    // Compute Averages
    const total = entries.length;
    let sumConfidence = 0;
    let sumStress = 0;
    let sumDiscipline = 0;
    const moodDist: Record<PsychologyMood, number> = {
      GREAT: 0,
      NEUTRAL: 0,
      STRESSED: 0,
      DOWN: 0,
    };

    for (const item of entries) {
      sumConfidence += item.confidence;
      sumStress += item.stress;
      sumDiscipline += item.discipline;
      if (moodDist[item.mood] !== undefined) {
        moodDist[item.mood]++;
      }
    }

    const averages = {
      avgConfidence: total > 0 ? Math.round((sumConfidence / total) * 10) / 10 : 0,
      avgStress: total > 0 ? Math.round((sumStress / total) * 10) / 10 : 0,
      avgDiscipline: total > 0 ? Math.round((sumDiscipline / total) * 10) / 10 : 0,
      totalEntries: total,
      moodDistribution: moodDist,
    };

    return {
      success: true,
      data: {
        entries,
        averages,
      },
    };
  } catch (error) {
    console.error("Error fetching psychology logs:", error);
    return {
      success: false,
      data: defaultData,
      error: error instanceof Error ? error.message : "Failed to fetch psychology logs",
    };
  }
}

// ==========================================
// 2. CREATE PSYCHOLOGY LOG ENTRY
// ==========================================

export async function createPsychologyLogAction(input: CreatePsychologyInput): Promise<{
  success: boolean;
  error?: string;
  entry?: PsychologyEntry;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized. Please log in." };
  }

  try {
    await ensureDatabaseSchemaSync();

    const mood: PsychologyMood = ["GREAT", "NEUTRAL", "STRESSED", "DOWN"].includes(input.mood)
      ? input.mood
      : "NEUTRAL";

    const confidence = Math.max(1, Math.min(10, Math.round(Number(input.confidence) || 7)));
    const stress = Math.max(1, Math.min(10, Math.round(Number(input.stress) || 3)));
    const discipline = Math.max(1, Math.min(10, Math.round(Number(input.discipline) || 8)));
    const checklist = Array.isArray(input.checklist) ? input.checklist : [];
    const checklistScore = checklist.length;

    const raw = await prisma.psychologyLog.create({
      data: {
        userId: user.id,
        date: input.date.trim() || new Date().toISOString().split("T")[0],
        time: input.time.trim() || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        mood,
        confidence,
        stress,
        discipline,
        notes: input.notes?.trim() || null,
        checklist,
        checklistScore,
      },
    });

    revalidatePath("/dashboard/journal");

    const entry: PsychologyEntry = {
      id: raw.id,
      userId: raw.userId,
      date: raw.date,
      time: raw.time,
      mood: raw.mood as PsychologyMood,
      confidence: raw.confidence,
      stress: raw.stress,
      discipline: raw.discipline,
      notes: raw.notes,
      checklist,
      checklistScore: raw.checklistScore,
      createdAt: raw.createdAt.toISOString(),
      updatedAt: raw.updatedAt.toISOString(),
    };

    return { success: true, entry };
  } catch (error) {
    console.error("Error creating psychology log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save psychology log",
    };
  }
}

// ==========================================
// 3. DELETE PSYCHOLOGY LOG ENTRY
// ==========================================

export async function deletePsychologyLogAction(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await ensureDatabaseSchemaSync();

    const existing = await prisma.psychologyLog.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== user.id) {
      return { success: false, error: "Entry not found or unauthorized" };
    }

    await prisma.psychologyLog.delete({
      where: { id },
    });

    revalidatePath("/dashboard/journal");
    return { success: true };
  } catch (error) {
    console.error("Error deleting psychology log:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete log entry",
    };
  }
}
