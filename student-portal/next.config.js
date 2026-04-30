/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pg-hostel/shared'],

  // PERF FIX: Enable React strict mode
  reactStrictMode: true,

  // PERF FIX: Compress output
  compress: true,

  // PERF FIX: Power-up image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [320, 375, 420, 768, 1024],
    imageSizes: [16, 32, 48, 64, 96, 128],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  },

  // PERF FIX: Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      'date-fns',
    ],
  },

  // PERF FIX: Cache static assets for 1 year
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
