export default function StudentLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-32 w-full rounded-2xl bg-card/60 border border-border/50 p-6 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-muted/70" />
          <div className="h-4 w-72 rounded-lg bg-muted/40" />
        </div>
        <div className="h-4 w-32 rounded-lg bg-muted/40" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-card/50 border border-border/40 p-4 flex flex-col justify-between"
          >
            <div className="h-4 w-20 rounded bg-muted/60" />
            <div className="h-6 w-16 rounded bg-primary/20" />
          </div>
        ))}
      </div>

      {/* Content Cards Skeleton Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-64 rounded-2xl bg-card/50 border border-border/40 p-5 flex flex-col justify-between space-y-4"
          >
            <div className="h-32 w-full rounded-xl bg-muted/50" />
            <div className="space-y-2 flex-1">
              <div className="h-5 w-3/4 rounded bg-muted/70" />
              <div className="h-3 w-1/2 rounded bg-muted/40" />
            </div>
            <div className="h-10 w-full rounded-xl bg-muted/30" />
          </div>
        ))}
      </div>
    </div>
  );
}
