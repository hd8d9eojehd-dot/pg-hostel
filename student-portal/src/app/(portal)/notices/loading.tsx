export default function NoticesLoading() {
  return (
    <div className="p-4 space-y-3 max-w-lg mx-auto animate-pulse">
      <div className="h-12 bg-gray-100 rounded-xl" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
          <div className="flex gap-2 items-center">
            <div className="w-2.5 h-2.5 bg-gray-200 rounded-full" />
            <div className="h-4 bg-gray-200 rounded w-40" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  )
}
