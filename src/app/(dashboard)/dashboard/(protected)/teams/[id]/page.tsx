import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Shield } from 'lucide-react'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { getPayloadClient } from '@/lib/payload'
import { Header } from '@/components/dashboard/layout/header'
import { SquadList } from './squad-list'

export const metadata: Metadata = { title: 'Squad' }

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireCapability('teams:view')
  const { id } = await params
  const teamId = Number(id)

  const payload = await getPayloadClient()
  const team = await payload.findByID({ collection: 'teams', id: teamId, depth: 1 }).catch(() => null)
  const crestUrl =
    team?.crest && typeof team.crest === 'object' ? (team.crest.sizes?.crest?.url ?? team.crest.url) : null

  return (
    <>
      <Header
        title={
          <span className="flex items-center gap-2.5">
            {crestUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={crestUrl} alt="" className="size-7 rounded-full object-cover" />
            ) : (
              <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                <Shield className="size-3.5 text-muted-foreground" />
              </span>
            )}
            {team ? team.name : 'Squad'}
          </span>
        }
        description={team ? `Group ${team.group} · ${team.shortName}` : undefined}
        actions={
          <Link
            href="/dashboard/teams"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to teams
          </Link>
        }
      />
      <div className="flex-1 p-4 md:p-6">
        <SquadList teamId={teamId} canManage={can(user, 'players:manage')} />
      </div>
    </>
  )
}
