import { getTournamentData } from '@/lib/tournament'
import { StadiumHero } from '@/components/StadiumHero'
import { MatchesTabs, type FeaturedMatch } from '@/components/MatchesTabs'
import type { Match } from '@/payload-types'

export const revalidate = 300

export const metadata = {
  title: 'Results — CECAFA Kagame Cup 2026 | IGIHE',
  description: 'Fixtures and results from the CECAFA Kagame Cup 2026 in Rwanda.',
}

function thumbUrl(m: Match): string | null {
  const t = m.highlightThumb
  if (t && typeof t !== 'number') return t.sizes?.hero?.url || t.url || null
  return null
}

export default async function MatchesPage() {
  const data = await getTournamentData()

  const upcoming = data.matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))

  const previous = data.matches
    .filter((m) => m.status === 'final' || m.status === 'live')
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))

  const featuredUpcoming: FeaturedMatch | null = upcoming[0]
    ? { label: 'Next Match', match: upcoming[0], imageUrl: thumbUrl(upcoming[0]) }
    : null

  const featuredPrevious: FeaturedMatch | null = previous[0]
    ? { label: 'Last Match', match: previous[0], imageUrl: thumbUrl(previous[0]) }
    : null

  return (
    <>
      <StadiumHero title="UKO IMIKINO YARANGIYE" height={490} />
      <MatchesTabs
        upcoming={upcoming}
        previous={previous}
        featuredUpcoming={featuredUpcoming}
        featuredPrevious={featuredPrevious}
      />
    </>
  )
}
