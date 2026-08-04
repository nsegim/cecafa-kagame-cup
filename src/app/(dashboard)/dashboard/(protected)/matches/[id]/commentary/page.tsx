import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'
import { Header } from '@/components/dashboard/layout/header'
import { MATCH_SELECT } from '@/lib/dashboard/match-select'
import { CommentaryComposer } from './composer'
import { CommentaryFeed } from './feed'

export const metadata: Metadata = { title: 'Live Commentary' }

export default async function MatchCommentaryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireCapability('commentary:edit')
  const { id } = await params
  const matchId = Number(id)

  const payload = await getPayloadClient()
  const match = await payload
    .findByID({ collection: 'matches', id: matchId, depth: 1, select: MATCH_SELECT })
    .catch(() => null)

  const homeTeam = match?.homeTeam && typeof match.homeTeam === 'object' ? match.homeTeam : null
  const awayTeam = match?.awayTeam && typeof match.awayTeam === 'object' ? match.awayTeam : null

  return (
    <>
      <Header
        title={match ? `Live Commentary — ${match.label}` : 'Live Commentary'}
        description="Post updates as the match happens — each entry saves on its own."
        actions={
          <Link
            href="/dashboard/matches"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to matches
          </Link>
        }
      />
      <div className="grid flex-1 gap-4 p-4 md:p-6">
        <CommentaryComposer
          matchId={matchId}
          homeTeam={homeTeam ? { id: homeTeam.id, name: homeTeam.name } : null}
          awayTeam={awayTeam ? { id: awayTeam.id, name: awayTeam.name } : null}
        />
        <CommentaryFeed matchId={matchId} />
      </div>
    </>
  )
}
