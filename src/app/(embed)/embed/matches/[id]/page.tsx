import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMatchDetail, effectiveMatchStatus } from '@/lib/tournament'
import { TeamCrest } from '@/components/TeamCrest'
import { LiveMatchProvider } from '@/components/LiveMatchProvider'
import { LiveScore } from '@/components/LiveScore'
import { LiveMatchCenter } from '@/components/LiveMatchCenter'
import { matchSide } from '@/lib/matchLabels'
import { matchSideStats, type LiveMatchData } from '@/lib/matchStats'
import { matchTime } from '@/lib/datetime'

// Same freshness window as the full match page — the live scoreline and feed
// are kept up to date in the reader's browser by <LiveMatchProvider> polling,
// which continues to work inside the iframe (it fetches `/matches/{id}/live`
// against the embed's own origin).
export const revalidate = 120

const STAGE_LABEL: Record<string, string> = {
  group: 'Group Stage',
  semi: 'Semi-final',
  third: 'Third-place play-off',
  final: 'Final',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await getMatchDetail(Number(id))
  if (!detail) return {}
  const { match } = detail
  const home = matchSide(match.homeTeam, match.homeTeamPlaceholder)
  const away = matchSide(match.awayTeam, match.awayTeamPlaceholder)
  return {
    title: `${home.label} vs ${away.label} — Live Expressions | CECAFA Kagame Cup 2026`,
    robots: { index: false, follow: false },
  }
}

/**
 * The embeddable Live Expressions feed for a single match — everything an
 * editor logged (goals, cards, subs, notes, photos) plus the live scoreline,
 * with NO site header or footer, so it drops straight into a newsletter iframe.
 * It's the same live components the match page uses, wrapped in the compact
 * `.embed` card instead of the full-page hero + sidebar.
 */
export default async function MatchEmbedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getMatchDetail(Number(id))
  if (!detail) notFound()

  const { match, events, photos } = detail
  const home = matchSide(match.homeTeam, match.homeTeamPlaceholder)
  const away = matchSide(match.awayTeam, match.awayTeamPlaceholder)
  const displayStatus = effectiveMatchStatus(match)
  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  const metaLabel = match.group ? `Group ${match.group}` : (STAGE_LABEL[match.stage] ?? '')

  const { home: homeStats, away: awayStats } = matchSideStats(events, homeScore, awayScore)
  const initialLive: LiveMatchData = {
    status: displayStatus,
    homeScore,
    awayScore,
    events,
    photos,
    homeStats,
    awayStats,
  }
  // Only poll while the game can still change — live now, or kicking off soon.
  const KICKOFF_SOON_MS = 30 * 60 * 1000
  const pollEnabled =
    displayStatus === 'live' ||
    (displayStatus === 'scheduled' &&
      new Date(match.kickoff).getTime() - Date.now() < KICKOFF_SOON_MS)

  return (
    <LiveMatchProvider matchId={match.id} initial={initialLive} enabled={pollEnabled}>
      <div className="embed">
        <div className="embed-hero">
          {metaLabel && <span className="embed-hero__meta">{metaLabel}</span>}
          <div className="embed-hero__teams">
            <div className="embed-hero__team">
              <TeamCrest team={home.team} size={44} />
              <span className="embed-hero__name">{home.team?.shortName ?? home.label}</span>
            </div>

            <LiveScore scheduledLabel={matchTime(match.kickoff)} />

            <div className="embed-hero__team">
              <TeamCrest team={away.team} size={44} />
              <span className="embed-hero__name">{away.team?.shortName ?? away.label}</span>
            </div>
          </div>
        </div>

        <div className="embed-body-inner">
          <LiveMatchCenter homeName={home.label} awayName={away.label} />
        </div>

        {/* Opens the full match page in a new tab — inside an iframe a relative
            href resolves to the embed's own origin (the CECAFA site). */}
        <a
          className="embed-credit"
          href={`/matches/${match.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          CECAFA Kagame Cup 2026 · Komeza ukurikirane →
        </a>
      </div>
    </LiveMatchProvider>
  )
}
