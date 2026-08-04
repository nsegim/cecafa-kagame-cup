import { Suspense } from 'react'
import { requireDashboardUser } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { DashboardHome } from './dashboard-home'

export default async function DashboardHomePage() {
  const user = await requireDashboardUser()

  return (
    <>
      <Header title="Dashboard" description={`Welcome back, ${user.email}`} />
      <div className="flex-1 p-4 md:p-6">
        <Suspense>
          <DashboardHome canViewSubscribers={can(user, 'subscribers:view')} />
        </Suspense>
      </div>
    </>
  )
}
