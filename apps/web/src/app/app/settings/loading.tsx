/**
 * Settings Loading Skeleton
 * Shows settings panel placeholders during navigation
 */

export default function SettingsLoading() {
  return (
    <div className="flex flex-col h-full min-h-0 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="h-8 w-8 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-6 w-32 rounded-md bg-muted/50 animate-pulse" />
      </div>

      {/* Settings content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl space-y-6">
          {/* Section */}
          {[...Array(3)].map((_, sectionIdx) => (
            <div
              key={sectionIdx}
              className="space-y-4 animate-pulse"
              style={{ animationDelay: `${sectionIdx * 100}ms` }}
            >
              {/* Section title */}
              <div className="h-5 w-40 rounded bg-muted/50" />

              {/* Settings items */}
              <div className="space-y-3">
                {[...Array(3)].map((_, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/20"
                    style={{ animationDelay: `${(sectionIdx * 3 + itemIdx) * 50}ms` }}
                  >
                    <div className="space-y-2">
                      <div className="h-4 w-32 rounded bg-muted/40" />
                      <div className="h-3 w-48 rounded bg-muted/30" />
                    </div>
                    <div className="h-8 w-12 rounded-full bg-muted/40" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
