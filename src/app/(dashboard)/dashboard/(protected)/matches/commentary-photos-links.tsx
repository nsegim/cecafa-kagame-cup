import Link from 'next/link'
import { Radio, Images } from 'lucide-react'

/**
 * Dashboard-native port of src/components/admin/MatchContentLinks.tsx — now
 * linking into the dashboard's own per-match Live Commentary/Photos pages
 * (Phase 2) instead of bridging to the classic /admin.
 */
export function CommentaryPhotosLinks({ matchId }: { matchId: number }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">Live Commentary &amp; Photos</p>
      <p className="text-xs text-muted-foreground">
        Each entry saves on its own — no need to save the whole match, and two people can post at the same time.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/matches/${matchId}/commentary`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Radio className="size-3.5" /> Live Commentary
        </Link>
        <Link
          href={`/dashboard/matches/${matchId}/photos`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-input px-2.5 py-1.5 text-sm hover:bg-muted"
        >
          <Images className="size-3.5" /> Match Photos
        </Link>
      </div>
    </div>
  )
}
