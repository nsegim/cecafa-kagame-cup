import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { getPayloadClient } from '@/lib/payload'
import { Header } from '@/components/dashboard/layout/header'
import { POSITIONS } from '@/lib/dashboard/match-options'
import { StatsList } from './stats-list'

export const metadata: Metadata = { title: 'Player' }

const POSITION_LABELS = Object.fromEntries(POSITIONS.map((p) => [p.value, p.label]))

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireCapability('players:view')
  const { id } = await params
  const playerId = Number(id)

  const payload = await getPayloadClient()
  const player = await payload
    .findByID({ collection: 'players', id: playerId, depth: 1 })
    .catch(() => null)
  const team = player?.team && typeof player.team === 'object' ? player.team : null
  const photoUrl =
    player?.photo && typeof player.photo === 'object' ? (player.photo.sizes?.thumbnail?.url ?? player.photo.url) : null

  return (
    <>
      <Header
        title={
          <span className="flex items-center gap-2.5">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="size-7 rounded-full object-cover" />
            ) : (
              <span className="flex size-7 items-center justify-center rounded-full bg-muted">
                <User className="size-3.5 text-muted-foreground" />
              </span>
            )}
            {player ? player.name : 'Player'}
          </span>
        }
        description={
          player
            ? `${POSITION_LABELS[player.position]}${player.shirtNumber ? ` · #${player.shirtNumber}` : ''}${team ? ` · ${team.name}` : ''}`
            : undefined
        }
        actions={
          team ? (
            <Link
              href={`/dashboard/teams/${team.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back to {team.shortName}
            </Link>
          ) : (
            <Link
              href="/dashboard/teams"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back to teams
            </Link>
          )
        }
      />
      <div className="flex-1 p-4 md:p-6">
        <StatsList playerId={playerId} canEdit={can(user, 'players:editStats')} />
      </div>
    </>
  )
}
