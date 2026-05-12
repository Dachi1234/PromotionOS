'use client'

/**
 * Runtime skeleton. Shown while the canvas config is fetching so the page
 * doesn't flash blank.
 *
 * `variant` lets callers hint which template family the campaign uses so
 * the skeleton shape matches what's about to land. Without a hint we
 * render the "wheel" silhouette because it's the dominant mechanic on
 * this platform — a round placeholder reads as "prize wheel loading"
 * immediately, which feels more intentional than a generic grid.
 *
 * All skeletons share the same heading + subtitle + CTA footprint so the
 * layout stays stable when the real template replaces the placeholder,
 * avoiding jarring content shift.
 */
interface SkeletonLoaderProps {
  variant?: 'wheel' | 'progress' | 'leaderboard' | 'mission' | 'generic'
}

export function SkeletonLoader({ variant = 'wheel' }: SkeletonLoaderProps) {
  return (
    <div className="min-h-screen bg-gray-900 p-4 animate-pulse">
      <div className="mx-auto max-w-md space-y-4 pt-6">
        {/* Header strip — present in every template (title + tagline). */}
        <div className="h-6 w-2/3 mx-auto rounded bg-gray-800" />
        <div className="h-4 w-1/2 mx-auto rounded bg-gray-800" />

        {/* Template-shaped hero. */}
        {variant === 'wheel' && (
          <div className="relative mx-auto mt-6" style={{ width: '80%', aspectRatio: '1 / 1' }}>
            <div className="absolute inset-0 rounded-full bg-gray-800" />
            {/* Hub dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-700" style={{ width: '22%', aspectRatio: '1 / 1' }} />
            {/* Pointer triangle */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                top: -10, width: 0, height: 0,
                borderLeft: '12px solid transparent',
                borderRight: '12px solid transparent',
                borderTop: '18px solid #374151',
              }}
            />
          </div>
        )}

        {variant === 'progress' && (
          <div className="mt-6 space-y-3">
            <div className="h-10 rounded-lg bg-gray-800" />
            <div className="h-3 rounded-full bg-gray-800" />
            <div className="flex gap-2">
              <div className="h-12 flex-1 rounded bg-gray-800" />
              <div className="h-12 flex-1 rounded bg-gray-800" />
              <div className="h-12 flex-1 rounded bg-gray-800" />
            </div>
          </div>
        )}

        {variant === 'leaderboard' && (
          <div className="mt-6 space-y-2">
            <div className="flex gap-3 justify-center">
              <div className="h-24 w-20 rounded-lg bg-gray-800" />
              <div className="h-28 w-20 rounded-lg bg-gray-800" />
              <div className="h-24 w-20 rounded-lg bg-gray-800" />
            </div>
            <div className="h-10 rounded bg-gray-800 mt-4" />
            <div className="h-10 rounded bg-gray-800" />
            <div className="h-10 rounded bg-gray-800" />
          </div>
        )}

        {variant === 'mission' && (
          <div className="mt-6 space-y-2">
            <div className="h-14 rounded-lg bg-gray-800" />
            <div className="h-14 rounded-lg bg-gray-800" />
            <div className="h-14 rounded-lg bg-gray-800" />
          </div>
        )}

        {variant === 'generic' && (
          <>
            <div className="h-48 rounded-xl bg-gray-800 mt-6" />
            <div className="h-40 rounded-xl bg-gray-800" />
          </>
        )}

        {/* Footer CTA — every template ends with a primary button. */}
        <div className="h-12 w-48 mx-auto rounded-full bg-gray-800 mt-6" />
      </div>
    </div>
  )
}
