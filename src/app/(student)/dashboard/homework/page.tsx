import type { Metadata } from "next";
import { requireAuth } from "@/server/dal/auth";
import { StudentHomeworkDashboardClient } from "@/components/student/student-homework-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Homework & Assignments | SuperWarrior30",
  description: "View and submit your chart analysis, homework assignments, and mentor reviews.",
};

export default async function StudentHomeworkDashboardPage() {
  await requireAuth();

  return <StudentHomeworkDashboardClient />;
}
