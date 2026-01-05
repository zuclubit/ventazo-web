/**
 * Kanban Loading Skeleton
 * Shows column placeholders during navigation
 */

export default function KanbanLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-6 w-40 rounded-md bg-muted/50 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-9 w-24 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Kanban columns skeleton */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full min-w-max">
          {[...Array(5)].map((_, colIdx) => (
            <div
              key={colIdx}
              className="w-72 flex-shrink-0 rounded-xl bg-muted/20 p-3 animate-pulse"
              style={{ animationDelay: `${colIdx * 75}ms` }}
            >
              {/* Column header */}
              <div className="h-8 w-24 rounded-md bg-muted/40 mb-3" />

              {/* Cards */}
              <div className="space-y-2">
                {[...Array(3)].map((_, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="h-24 rounded-lg bg-muted/30"
                    style={{ animationDelay: `${(colIdx * 3 + cardIdx) * 50}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
