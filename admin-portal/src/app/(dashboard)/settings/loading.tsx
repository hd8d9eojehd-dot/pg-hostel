// PERF FIX: Settings page skeleton
export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-24 bg-gray-200 rounded-lg" />
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 flex-1 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
        ))}
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}
