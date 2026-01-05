/**
 * Quotes Loading Skeleton
 * Shows quote list placeholders during navigation
 */

export default function QuotesLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-6 w-32 rounded-md bg-muted/50 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-32 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-border/30">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-muted/30 animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Quote cards */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-muted/20 animate-pulse"
              style={{ animationDelay: `${(i + 4) * 50}ms` }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="h-5 w-24 rounded bg-muted/40" />
                <div className="h-6 w-16 rounded-full bg-muted/40" />
              </div>
              <div className="h-4 w-3/4 rounded bg-muted/30 mb-2" />
              <div className="h-4 w-1/2 rounded bg-muted/30 mb-4" />
              <div className="flex justify-between items-center">
                <div className="h-6 w-20 rounded bg-muted/40" />
                <div className="h-3 w-16 rounded bg-muted/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
