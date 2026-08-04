import type { Metadata } from 'next'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { TeamsList } from './teams-list'

export const metadata: Metadata = { title: 'Teams' }

export default async function TeamsPage() {
  const user = await requireCapability('teams:view')

  return (
    <>
      <Header title="Teams" description="The 12-club tournament roster." />
      <div className="flex-1 p-4 md:p-6">
        <TeamsList canEdit={can(user, 'teams:edit')} canDelete={can(user, 'teams:delete')} />
      </div>
    </>
  )
}
