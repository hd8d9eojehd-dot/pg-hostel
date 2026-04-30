export default function ProfileLoading() {
  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto animate-pulse">
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-2xl flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 rounded w-36" />
          <div className="h-4 bg-gray-100 rounded w-24" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-28" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="flex justify-between">
              <div className="h-3 bg-gray-100 rounded w-20" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
