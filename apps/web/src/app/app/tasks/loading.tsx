/**
 * Tasks Loading Skeleton
 * Shows task list placeholders during navigation
 */

export default function TasksLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-6 w-24 rounded-md bg-muted/50 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 rounded-lg bg-muted/30 animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 p-4 space-y-2 overflow-auto">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 animate-pulse"
            style={{ animationDelay: `${(i + 4) * 40}ms` }}
          >
            <div className="h-5 w-5 rounded bg-muted/40" />
            <div className="flex-1">
              <div className="h-4 w-3/4 rounded bg-muted/40 mb-2" />
              <div className="h-3 w-1/2 rounded bg-muted/30" />
            </div>
            <div className="h-6 w-16 rounded-full bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
