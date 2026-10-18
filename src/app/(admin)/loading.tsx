export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4 sm:p-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 rounded-lg bg-muted/70" />
          <div className="h-4 w-80 rounded-lg bg-muted/40" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-xl bg-muted/50" />
          <div className="h-10 w-32 rounded-xl bg-primary/20" />
        </div>
      </div>

      {/* KPI Stats Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-card/60 border border-border/50 p-4 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-24 rounded bg-muted/60" />
              <div className="h-8 w-8 rounded-lg bg-muted/30" />
            </div>
            <div className="h-8 w-20 rounded bg-primary/30" />
          </div>
        ))}
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="h-14 w-full rounded-2xl bg-card/40 border border-border/40 p-3 flex gap-3 items-center">
        <div className="h-9 flex-1 rounded-xl bg-muted/40" />
        <div className="h-9 w-28 rounded-xl bg-muted/40" />
      </div>

      {/* Table Rows Skeleton */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-14 w-full rounded-xl bg-muted/30 flex items-center justify-between px-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted/60" />
              <div className="space-y-1">
                <div className="h-4 w-36 rounded bg-muted/70" />
                <div className="h-3 w-24 rounded bg-muted/40" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-muted/50" />
            <div className="h-8 w-24 rounded-lg bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
