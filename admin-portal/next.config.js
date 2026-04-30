/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pg-hostel/shared'],

  // PERF FIX: Enable React strict mode for better performance warnings
  reactStrictMode: true,

  // PERF FIX: Compress output
  compress: true,

  // PERF FIX: Power-up image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    // PERF FIX: Use modern formats for smaller file sizes
    formats: ['image/avif', 'image/webp'],
    // PERF FIX: Cache optimized images for 1 year
    minimumCacheTTL: 31536000,
    deviceSizes: [320, 420, 768, 1024, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  },

  // PERF FIX: Optimize bundle — remove unused locales
  i18n: undefined,

  // PERF FIX: Experimental optimizations
  experimental: {
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-toast',
      'recharts',
      'date-fns',
    ],
  },

  // PERF FIX: Custom headers for static assets caching
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
      {
        source: '/:path*.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
