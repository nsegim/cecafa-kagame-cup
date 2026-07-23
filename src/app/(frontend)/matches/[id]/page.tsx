import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMatchDetail } from '@/lib/tournament'
import { TeamCrest } from '@/components/TeamCrest'
import { MatchCenter } from '@/components/MatchCenter'
import { Lineups } from '@/components/Lineups'
import { matchSide, VENUE_LABEL } from '@/lib/matchLabels'
import { matchDate, matchTime } from '@/lib/datetime'

export const revalidate = 120

const STAGE_LABEL: Record<string, string> = {
  group: 'Group Stage',
  semi: 'Semi-final',
  third: 'Third-place play-off',
  final: 'Final',
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const detail = await getMatchDetail(Number(id))
  if (!detail) notFound()

  const { match, homePlayers, awayPlayers, events, otherMatches } = detail
  const home = matchSide(match.homeTeam, match.homeTeamPlaceholder)
  const away = matchSide(match.awayTeam, match.awayTeamPlaceholder)
  const played = match.status === 'final' || match.status === 'live'
  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  const metaLabel = match.group ? `Group ${match.group}` : STAGE_LABEL[match.stage] ?? ''
  const statusLabel =
    match.status === 'live' ? 'Live' : match.status === 'final' ? 'FT' : matchTime(match.kickoff)

  const count = (side: 'home' | 'away', type: 'yellow' | 'red') =>
    events.filter((e) => e.side === side && e.type === type).length
  const homeStats = { goals: homeScore, yellows: count('home', 'yellow'), reds: count('home', 'red') }
  const awayStats = { goals: awayScore, yellows: count('away', 'yellow'), reds: count('away', 'red') }
  const photos = ['/assets/hero-stadium.jpg', '/assets/team-card.jpg']

  return (
    <>
      <section className="match-hero">
        <div className="match-hero__overlay" />
        <div className="match-hero__content">
          <span className="match-hero__meta">{metaLabel}</span>
          <div className="match-hero__teams">
            <div className="match-hero__team">
              <TeamCrest team={home.team} size={78} />
              <span className="match-hero__name">{home.label}</span>
            </div>

            <div className="match-hero__score">
              <span className={`match-hero__status ${match.status === 'live' ? 'is-live' : ''}`}>
                {statusLabel}
              </span>
              <div className="match-hero__nums">
                <span>{played ? homeScore : '–'}</span>
                <span className="match-hero__colon">:</span>
                <span>{played ? awayScore : '–'}</span>
              </div>
            </div>

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
            <MatchCenter
              events={events}
              homeName={home.label}
              awayName={away.label}
              homeScore={homeScore}
              awayScore={awayScore}
              homeStats={homeStats}
              awayStats={awayStats}
              photos={photos}
            />
          </div>

          <aside className="match-detail__side">
            <div className="sidecard">
              <div className="sidecard__head">Match Info</div>
              <dl className="matchinfo">
                <div className="matchinfo__row">
                  <dt>Tournament</dt>
                  <dd>Kagame Cup · {metaLabel}</dd>
                </div>
                <div className="matchinfo__row">
                  <dt>Stadium</dt>
                  <dd>{VENUE_LABEL[match.venue] ?? match.venue}, Kigali</dd>
                </div>
                <div className="matchinfo__row">
                  <dt>Date</dt>
                  <dd>
                    {matchDate(match.kickoff)} · {matchTime(match.kickoff)}
                  </dd>
                </div>
              </dl>
            </div>

            <Lineups
              homeName={home.label}
              awayName={away.label}
              homePlayers={homePlayers}
              awayPlayers={awayPlayers}
            />

            {otherMatches.length > 0 && (
              <div className="sidecard">
                <div className="sidecard__head">Other Matches</div>
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
    </>
  )
}
