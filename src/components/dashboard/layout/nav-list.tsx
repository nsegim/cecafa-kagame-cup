'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Badge } from '@/components/dashboard/ui/badge'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/lib/dashboard/nav'

/** Shared nav rendering for the desktop Sidebar and the mobile drawer. */
export function NavList({
  items,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[]
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false
        const Icon = item.icon

        if (!item.href) {
          return (
            <div
              key={item.label}
              aria-disabled
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground/60',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? `${item.label} — coming soon` : undefined}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{item.label}</span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground/60">
                    Soon
                  </Badge>
                </>
              )}
            </div>
          )
        }

        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            data-active={active}
            className={cn(
              'group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              'data-[active=true]:bg-primary/10 data-[active=true]:text-primary',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
