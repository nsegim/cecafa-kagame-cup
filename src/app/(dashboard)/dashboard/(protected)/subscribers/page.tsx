import type { Metadata } from 'next'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { SubscribersTable } from './subscribers-table'

export const metadata: Metadata = { title: 'Subscribers' }

export default async function SubscribersPage() {
  const user = await requireCapability('subscribers:view')

  return (
    <>
      <Header title="Subscribers" description="Newsletter sign-ups collected from the site." />
      <div className="flex-1 p-4 md:p-6">
        <SubscribersTable canManage={can(user, 'subscribers:manage')} />
      </div>
    </>
  )
}
