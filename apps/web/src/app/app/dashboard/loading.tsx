/**
 * Dashboard Loading Skeleton
 * Shows dashboard placeholders during navigation
 */

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-6 w-28 rounded-md bg-muted/50 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Dashboard content */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-muted/30 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-4">
          <div
            className="h-64 rounded-xl bg-muted/20 animate-pulse"
            style={{ animationDelay: '200ms' }}
          />
          <div
            className="h-64 rounded-xl bg-muted/20 animate-pulse"
            style={{ animationDelay: '250ms' }}
          />
        </div>

        {/* Activity feed */}
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-muted/20 animate-pulse"
              style={{ animationDelay: `${300 + i * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
