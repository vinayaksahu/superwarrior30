import { GitBranch, User, Calendar, ShieldCheck } from "lucide-react";

interface NetworkStudent {
  id: string;
  name: string;
  level: number;
  joinedAt: Date;
  status: string;
}

interface ReferralNetworkTreeProps {
  network: NetworkStudent[];
  levelBreakdown: Array<{ level: number; count: number }>;
}

export function ReferralNetworkTree({
  network,
  levelBreakdown,
}: ReferralNetworkTreeProps) {
  // Group students by level
  const studentsByLevel: Record<number, NetworkStudent[]> = {};
  for (const student of network) {
    if (!studentsByLevel[student.level]) {
      studentsByLevel[student.level] = [];
    }
    studentsByLevel[student.level].push(student);
  }

  const levelsPresent = Object.keys(studentsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Tier Summary Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {levelBreakdown.map((l) => (
          <div
            key={l.level}
            className="rounded-xl border border-border bg-card p-4 text-center space-y-1"
          >
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Level {l.level}
            </span>
            <p className="text-2xl font-extrabold text-foreground">{l.count}</p>
            <span className="text-[10px] text-muted-foreground">
              {l.level === 1 ? "Direct Affiliates" : `Tier ${l.level} Network`}
            </span>
          </div>
        ))}
      </div>

      {/* Visual Tree / Multi-level List */}
      {network.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-xs text-muted-foreground space-y-2">
          <GitBranch className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">No affiliate network yet</p>
          <p>Share your affiliate link with peers and fellow traders to start building your network.</p>
        </div>
      ) : (
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              Affiliate Hierarchy Network Tree
            </h3>
            <span className="text-xs text-muted-foreground font-medium">
              {network.length} Total Members
            </span>
          </div>

          <div className="space-y-6">
            {levelsPresent.map((lvl) => {
              const students = studentsByLevel[lvl] || [];

              return (
                <div key={lvl} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary font-mono">
                      L{lvl}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      Tier {lvl}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({students.length} {students.length === 1 ? "member" : "members"})
                      </span>
                    </h4>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pl-8 border-l-2 border-primary/20 ml-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-background"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {student.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(student.joinedAt).toLocaleDateString("en-IN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase">
                          Active
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
