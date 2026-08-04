import type { Metadata } from 'next'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { Header } from '@/components/dashboard/layout/header'
import { MatchesTable } from './matches-table'

export const metadata: Metadata = { title: 'Matches' }

export default async function MatchesPage() {
  const user = await requireCapability('matches:edit')

  return (
    <>
      <Header title="Matches" description="Fixtures, live scores and match-day content." />
      <div className="flex-1 p-4 md:p-6">
        <MatchesTable canManage={can(user, 'matches:manage')} />
      </div>
    </>
  )
}
