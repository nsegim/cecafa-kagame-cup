'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/dashboard/ui/sheet'
import { NavList } from './nav-list'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'
import { cn } from '@/lib/utils'
import { MOBILE_PRIMARY_COUNT, visibleNavItems } from '@/lib/dashboard/nav'
import type { Role } from '@/lib/dashboard/permissions'

/** Touch-friendly mobile chrome: a bottom tab bar for the top items, a full-nav drawer for the rest. */
export function MobileNav({
  email,
  roles,
}: {
  email: string
  roles: Role[]
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const items = visibleNavItems(roles)
  const primary = items.slice(0, MOBILE_PRIMARY_COUNT)

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-card/95 backdrop-blur md:hidden">
        {primary.map((item) => {
          if (!item.href) return null
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground',
                active && 'text-primary',
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
        >
          <Menu className="size-5" />
          More
        </button>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border">
            <SheetTitle className="text-sm">CECAFA Dashboard</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3">
            <NavList items={items} onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t border-border p-2">
            <ThemeToggle />
          </div>
          <div className="border-t border-border p-2">
            <UserMenu email={email} roles={roles} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
