import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireCapability } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { getPayloadClient } from '@/lib/payload'
import { Header } from '@/components/dashboard/layout/header'
import { MATCH_SELECT } from '@/lib/dashboard/match-select'
import { PhotosGrid } from './photos-grid'

export const metadata: Metadata = { title: 'Match Photos' }

export default async function MatchPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await requireCapability('photos:edit')
  const { id } = await params
  const matchId = Number(id)

  const payload = await getPayloadClient()
  const match = await payload
    .findByID({ collection: 'matches', id: matchId, depth: 0, select: MATCH_SELECT })
    .catch(() => null)

  return (
    <>
      <Header
        title={match ? `Photos — ${match.label}` : 'Match Photos'}
        description="Every photo uploaded for this fixture, newest first."
        actions={
          <Link
            href="/dashboard/matches"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to matches
          </Link>
        }
      />
      <div className="flex-1 p-4 md:p-6">
        <PhotosGrid matchId={matchId} canManage={can(user, 'photos:edit')} />
      </div>
    </>
  )
}
