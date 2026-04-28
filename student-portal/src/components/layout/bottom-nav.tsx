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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-0',
                active ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
