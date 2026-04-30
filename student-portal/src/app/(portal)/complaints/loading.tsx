export default function ComplaintsLoading() {
  return (
    <div className="p-4 space-y-3 max-w-lg mx-auto animate-pulse">
      <div className="h-12 bg-gray-100 rounded-xl" />
      <div className="h-10 bg-gray-200 rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-16 bg-gray-100 rounded-full" />
            <div className="h-5 w-20 bg-gray-100 rounded-full" />
          </div>
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-3 bg-gray-100 rounded w-32" />
        </div>
      ))}
    </div>
  )
}
