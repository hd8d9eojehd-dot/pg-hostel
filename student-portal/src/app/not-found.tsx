import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <p className="text-6xl font-bold text-primary mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6 text-sm">The page you're looking for doesn't exist.</p>
        <Link href="/home" className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
          Go Home
        </Link>
      </div>
    </div>
  )
}
