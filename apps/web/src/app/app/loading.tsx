/**
 * App Loading Skeleton - SPA Navigation Feedback
 *
 * This loading state appears during route transitions within the /app section.
 * Designed to provide immediate visual feedback while content loads.
 *
 * Features:
 * - Minimal, non-intrusive skeleton
 * - Matches the app's visual language
 * - GPU-accelerated animations
 * - Maintains layout stability (no CLS)
 *
 * @module app/app/loading
 */

export default function AppLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-150">
      {/* Header skeleton */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
          <div className="h-6 w-32 rounded-md bg-muted/50 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded-lg bg-muted/50 animate-pulse" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-muted/30 animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {/* Main content area */}
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-muted/20 animate-pulse"
              style={{ animationDelay: `${(i + 4) * 50}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
