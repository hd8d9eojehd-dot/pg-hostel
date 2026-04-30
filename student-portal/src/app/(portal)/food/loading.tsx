export default function FoodLoading() {
  return (
    <div className="p-4 space-y-3 max-w-lg mx-auto animate-pulse">
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="h-10 bg-gray-100 rounded-xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
