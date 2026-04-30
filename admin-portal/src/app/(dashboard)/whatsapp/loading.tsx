export default function WhatsAppLoading() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded-lg" />
      <div className="h-20 bg-gray-100 rounded-xl" />
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-9 bg-gray-100 rounded-lg" />
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-10 bg-gray-100 rounded-lg" />
        <div className="h-24 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>
    </div>
  )
}
