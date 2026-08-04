import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import type { Role } from '@/lib/dashboard/permissions'

export function AppShell({
  email,
  roles,
  children,
}: {
  email: string
  roles: Role[]
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      <Sidebar email={email} roles={roles} />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {children}
      </div>
      <MobileNav email={email} roles={roles} />
    </div>
  )
}
