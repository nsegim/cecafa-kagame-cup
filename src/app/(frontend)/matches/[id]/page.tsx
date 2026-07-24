import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMatchDetail, effectiveMatchStatus } from '@/lib/tournament'
import { TeamCrest } from '@/components/TeamCrest'
import { LiveMatchProvider } from '@/components/LiveMatchProvider'
import { LiveScore } from '@/components/LiveScore'
import { LiveMatchCenter } from '@/components/LiveMatchCenter'
import { Lineups } from '@/components/Lineups'
import { matchSide, VENUE_LABEL } from '@/lib/matchLabels'
import { matchSideStats, type LiveMatchData } from '@/lib/matchStats'
import { matchDate, matchTime } from '@/lib/datetime'

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
  const title = `${home.label} vs ${away.label} — CECAFA Kagame Cup 2026 | IGIHE`
  const played = effectiveMatchStatus(match) !== 'scheduled'
  const description = played
    ? `${home.label} ${match.homeScore ?? 0}-${match.awayScore ?? 0} ${away.label} — ${VENUE_LABEL[match.venue] ?? match.venue}, ${matchDate(match.kickoff)}.`
    : `${home.label} vs ${away.label} — ${matchDate(match.kickoff)} at ${VENUE_LABEL[match.venue] ?? match.venue}, Kigali.`

  return { title, description }
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getMatchDetail(Number(id))
  if (!detail) notFound()

  const { match, homeLineup, awayLineup, events, otherMatches, photos } = detail
  const home = matchSide(match.homeTeam, match.homeTeamPlaceholder)
  const away = matchSide(match.awayTeam, match.awayTeamPlaceholder)
  const displayStatus = effectiveMatchStatus(match)
  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  const metaLabel = match.group ? `Group ${match.group}` : (STAGE_LABEL[match.stage] ?? '')

  // Everything that changes while the match is live is seeded here from the
  // server render, then kept fresh in place by <LiveMatchProvider>'s polling.
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
  // Only poll a match that's live or about to kick off — never a final result
  // (frozen) or a fixture still days away (pointless load).
  const KICKOFF_SOON_MS = 30 * 60 * 1000
  const pollEnabled =
    displayStatus === 'live' ||
    (displayStatus === 'scheduled' &&
      new Date(match.kickoff).getTime() - Date.now() < KICKOFF_SOON_MS)

  return (
    <LiveMatchProvider matchId={match.id} initial={initialLive} enabled={pollEnabled}>
      <section className="match-hero">
        <div className="match-hero__overlay" />
        <div className="match-hero__content">
          <span className="match-hero__meta">{metaLabel}</span>
          <div className="match-hero__teams">
            <div className="match-hero__team">
              <TeamCrest team={home.team} size={78} />
              <span className="match-hero__name">{home.label}</span>
            </div>

            <LiveScore scheduledLabel={matchTime(match.kickoff)} />

            <div className="match-hero__team">
              <TeamCrest team={away.team} size={78} />
              <span className="match-hero__name">{away.label}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section match-detail">
        <div className="container match-detail__grid">
          <div className="match-detail__main">
            <LiveMatchCenter homeName={home.label} awayName={away.label} />
          </div>

          <aside className="match-detail__side">
            <div className="sidecard">
              <div className="sidecard__head">Amakuru y'umukino</div>
              <dl className="matchinfo">
                <div className="matchinfo__row">
                  <dt>Irushanwa</dt>
                  <dd>Kagame Cup · {metaLabel}</dd>
                </div>
                <div className="matchinfo__row">
                  <dt>Sitade</dt>
                  <dd>{VENUE_LABEL[match.venue] ?? match.venue}, Kigali</dd>
                </div>
                <div className="matchinfo__row">
                  <dt>Italiki</dt>
                  <dd>
                    {matchDate(match.kickoff)} · {matchTime(match.kickoff)}
                  </dd>
                </div>
              </dl>
            </div>

            <Lineups
              homeName={home.label}
              awayName={away.label}
              homeLineup={homeLineup}
              awayLineup={awayLineup}
            />

            {otherMatches.length > 0 && (
              <div className="sidecard">
                <div className="sidecard__head">Indi mikino</div>
                <ul className="othermatches">
                  {otherMatches.map((m) => {
                    const h = matchSide(m.homeTeam, m.homeTeamPlaceholder)
                    const a = matchSide(m.awayTeam, m.awayTeamPlaceholder)
                    return (
                      <li key={m.id} className="othermatch">
                        <Link href={`/matches/${m.id}`} className="othermatch__link">
                          <span className="othermatch__team">
                            <TeamCrest team={h.team} size={22} />
                            {h.team?.shortName ?? h.label}
                          </span>
                          <span className="othermatch__score">
                            {m.homeScore ?? 0} - {m.awayScore ?? 0}
                          </span>
                          <span className="othermatch__team othermatch__team--away">
                            {a.team?.shortName ?? a.label}
                            <TeamCrest team={a.team} size={22} />
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </section>
    </LiveMatchProvider>
  )
}
