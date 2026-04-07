'use client'

export function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-gray-900 p-4 space-y-4 animate-pulse">
      <div className="h-48 rounded-xl bg-gray-800" />
      <div className="h-6 w-2/3 mx-auto rounded bg-gray-800" />
      <div className="h-4 w-1/2 mx-auto rounded bg-gray-800" />
      <div className="h-64 rounded-xl bg-gray-800 mt-6" />
      <div className="h-40 rounded-xl bg-gray-800" />
      <div className="h-10 w-48 mx-auto rounded-lg bg-gray-800 mt-4" />
    </div>
  )
}
