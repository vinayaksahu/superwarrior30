import { requireAuth } from "@/server/dal/auth";
import { StudentNav } from "@/components/student/student-nav";
import { StudentHeader } from "@/components/student/student-header";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader user={user} />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row min-w-0">
          <StudentNav />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
