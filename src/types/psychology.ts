export type PsychologyMood = "GREAT" | "NEUTRAL" | "STRESSED" | "DOWN";

export interface PsychologyEntry {
  id: string;
  userId: string;
  date: string;
  time: string;
  mood: PsychologyMood;
  confidence: number;
  stress: number;
  discipline: number;
  notes: string | null;
  checklist: string[];
  checklistScore: number;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface PsychologyAverages {
  avgConfidence: number;
  avgStress: number;
  avgDiscipline: number;
  totalEntries: number;
  moodDistribution: Record<PsychologyMood, number>;
}

export interface CreatePsychologyInput {
  date: string;
  time: string;
  mood: PsychologyMood;
  confidence: number;
  stress: number;
  discipline: number;
  notes?: string;
  checklist: string[];
  checklistScore: number;
}

export interface StudentPsychologyData {
  entries: PsychologyEntry[];
  averages: PsychologyAverages;
}
