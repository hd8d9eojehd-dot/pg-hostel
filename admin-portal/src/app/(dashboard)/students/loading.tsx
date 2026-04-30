// PERF FIX: Students page skeleton — instant feedback while data loads
export default function StudentsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      <div className="flex gap-2">
        <div className="h-10 flex-1 bg-gray-100 rounded-lg" />
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
        <div className="h-10 w-32 bg-gray-100 rounded-lg" />
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-100 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-24" />
            </div>
            <div className="h-4 bg-gray-100 rounded w-20 hidden md:block" />
            <div className="h-4 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
