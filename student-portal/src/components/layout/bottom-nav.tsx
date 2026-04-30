'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, IndianRupee, MessageSquare, DoorOpen, Bell, User, UtensilsCrossed } from 'lucide-react'

const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/finance', label: 'Finance', icon: IndianRupee },
  { href: '/food', label: 'Food', icon: UtensilsCrossed },
  { href: '/complaints', label: 'Issues', icon: MessageSquare },
  { href: '/notices', label: 'Notices', icon: Bell },
  { href: '/outpass', label: 'Outpass', icon: DoorOpen },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="flex-shrink-0 bg-white border-t z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              // PERF FIX: prefetch=true (default) — Next.js prefetches all nav links in viewport
              // This makes navigation feel instant
              prefetch={true}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[3.5rem] transition-colors',
                active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className={cn('w-[1.125rem] h-[1.125rem] flex-shrink-0', active && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium leading-none truncate w-full text-center px-0.5">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
