import type { Metadata } from 'next'
import { getTournamentData } from '@/lib/tournament'
import { effectiveMatchStatus } from '@/lib/matchStatus'
import { StadiumHero } from '@/components/StadiumHero'
import { MatchesTabs, type FeaturedMatch } from '@/components/MatchesTabs'
import { toMatchRow } from '@/lib/matchView'
import type { Match } from '@/payload-types'

export const revalidate = 300

const DESCRIPTION = 'Fixtures and results from the CECAFA Kagame Cup 2026 in Rwanda.'

// The site suffix comes from the root layout's title template.
export const metadata: Metadata = {
  title: 'Results',
  description: DESCRIPTION,
  alternates: { canonical: '/matches' },
  openGraph: { title: 'Results', description: DESCRIPTION, url: '/matches' },
}

function thumbUrl(m: Match): string | null {
  const t = m.highlightThumb
  if (t && typeof t !== 'number') return t.sizes?.hero?.url || t.url || null
  return null
}

export default async function MatchesPage() {
  const data = await getTournamentData()

  const upcoming = data.matches
    .filter((m) => effectiveMatchStatus(m) === 'scheduled')
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))

  const previous = data.matches
    .filter((m) => effectiveMatchStatus(m) !== 'scheduled')
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))

  // Narrow to the view shape BEFORE handing anything to <MatchesTabs>, which is
  // a client component. The full `Match` docs (depth: 2 — teams, crest Media and
  // all its size variants, lineups, commentary rich text, attached photos) were
  // otherwise serialised into the page twice: 1.25 MB of payload to render a
  // list of names and scorelines.
  const upcomingRows = upcoming.map(toMatchRow)
  const previousRows = previous.map(toMatchRow)

  const featuredUpcoming: FeaturedMatch | null = upcomingRows[0]
    ? { label: 'UMUKINO UKURIKIRA', match: upcomingRows[0], imageUrl: thumbUrl(upcoming[0]) }
    : null

  const featuredPrevious: FeaturedMatch | null = previousRows[0]
    ? { label: 'UMUKINO UHERUKA', match: previousRows[0], imageUrl: thumbUrl(previous[0]) }
    : null

  return (
    <>
      <StadiumHero title="UKO IMIKINO YARANGIYE" height={490} />
      <MatchesTabs
        upcoming={upcomingRows}
        previous={previousRows}
        featuredUpcoming={featuredUpcoming}
        featuredPrevious={featuredPrevious}
      />
    </>
  )
}
