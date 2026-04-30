// PERF FIX: Route-level loading skeleton — shows instantly during page transitions
export default function PortalLoading() {
  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto animate-pulse">
      {/* TopBar skeleton */}
      <div className="h-12 bg-gray-100 rounded-xl" />
      {/* Card skeletons */}
      <div className="h-36 bg-gray-100 rounded-2xl" />
      <div className="h-24 bg-gray-100 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
