'use client'

import Link from 'next/link'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import { Separator } from '@/components/dashboard/ui/separator'
import { NavList } from './nav-list'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { visibleNavItems } from '@/lib/dashboard/nav'
import type { Role } from '@/lib/dashboard/permissions'

export function Sidebar({
  email,
  roles,
}: {
  email: string
  roles: Role[]
}) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const items = visibleNavItems(roles)

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        'sticky top-0 hidden h-svh shrink-0 flex-col border-r border-border bg-card/50 transition-[width] duration-150 md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className={cn('flex h-14 items-center gap-2 px-4', collapsed && 'justify-center px-0')}>
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            CK
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold">CECAFA Dashboard</span>
          )}
        </Link>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-3 py-3">
        <NavList items={items} collapsed={collapsed} />
      </div>

      <Separator />

      <div className={cn('flex flex-col gap-1 p-2', collapsed && 'items-center')}>
        <ThemeToggle collapsed={collapsed} />
        <Button
          type="button"
          variant="ghost"
          size={collapsed ? 'icon-sm' : 'sm'}
          className={collapsed ? undefined : 'w-full justify-start gap-2.5 px-2.5'}
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>

      <Separator />

      <div className="p-2">
        <UserMenu email={email} roles={roles} collapsed={collapsed} />
      </div>
    </aside>
  )
}
