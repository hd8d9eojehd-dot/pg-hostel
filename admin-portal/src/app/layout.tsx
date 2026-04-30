import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'

// PERF FIX: Load Inter via next/font — preloads, self-hosts, and uses font-display:swap
// This eliminates the render-blocking @import in globals.css and prevents FOIT
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  // PERF FIX: Only load weights actually used — reduces font file size
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: { default: 'PG Hostel Admin', template: '%s | PG Hostel Admin' },
  description: 'PG Hostel Management Platform — Admin Portal',
  manifest: '/manifest.json',
  icons: { icon: '/favicon.ico', shortcut: '/favicon.ico' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
