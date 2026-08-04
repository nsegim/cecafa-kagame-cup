import type { ReactNode } from 'react'
import { requireDashboardUser } from '@/lib/dashboard/auth'
import { AppShell } from '@/components/dashboard/layout/app-shell'

/**
 * The real auth/RBAC authority for `/dashboard/*` (middleware.ts only checks
 * cookie presence). Resolves the user via Payload's local API and redirects
 * to login if the session is missing or invalid.
 *
 * Only `email`/`roles` (plain, serializable data) cross into the client
 * AppShell/Sidebar/MobileNav below — NAV_ITEMS (which carries Lucide icon
 * component references) is filtered by capability *inside* those client
 * components instead of being computed here and passed down, because a
 * Server Component cannot pass function/component values as client props.
 */
export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireDashboardUser()

  return (
    <AppShell email={user.email} roles={user.roles}>
      {children}
    </AppShell>
  )
}
