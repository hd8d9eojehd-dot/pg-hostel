/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pg-hostel/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  },
}

module.exports = nextConfig
