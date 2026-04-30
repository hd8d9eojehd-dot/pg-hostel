// PERF FIX: Finance page skeleton — instant feedback while fee data loads
export default function FinanceLoading() {
  return (
    <div className="max-w-lg mx-auto animate-pulse">
      <div className="h-12 bg-gray-100 rounded-xl mx-4 mt-4" />
      <div className="mx-4 mt-4 h-28 bg-gray-200 rounded-2xl" />
      <div className="mx-4 mt-3 h-2 bg-gray-100 rounded-full" />
      <div className="flex mx-4 mt-4 gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-9 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
