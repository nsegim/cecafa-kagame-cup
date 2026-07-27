import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMatchDetail, getAllMatchIds, effectiveMatchStatus } from '@/lib/tournament'
import { TeamCrest } from '@/components/TeamCrest'
import { LiveMatchProvider } from '@/components/LiveMatchProvider'
import { LiveScore } from '@/components/LiveScore'
import { LiveMatchCenter } from '@/components/LiveMatchCenter'
import { Lineups } from '@/components/Lineups'
import { matchSide, VENUE_LABEL } from '@/lib/matchLabels'
import { matchSideStats, type LiveMatchData } from '@/lib/matchStats'
import { matchDate, matchTime } from '@/lib/datetime'
import { absoluteUrl, SITE_NAME, SITE_URL } from '@/lib/site'

export const revalidate = 120

/**
 * Prerender every fixture at build time so this page is served from the ISR
 * cache instead of being rendered from scratch on every request.
 *
 * Without this, a dynamic segment has no cache in front of it at all: each hit
 * re-ran the full `getMatchDetail` query set, which on a loaded origin pushed
 * past Cloudflare's 100s limit and returned a 524 instead of the page. The
 * scoreline still stays current — `revalidate` refreshes the shell, and
 * <LiveMatchProvider> polls `/matches/[id]/live` for anything in play.
 *
 * `dynamicParams` stays on (the default), so a fixture added after the build
 * is still rendered on demand rather than 404ing.
 */
export async function generateStaticParams() {
  const ids = await getAllMatchIds()
  return ids.map((id) => ({ id: String(id) }))
}

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
  const title = `${home.label} vs ${away.label}`
  const played = effectiveMatchStatus(match) !== 'scheduled'
  const description = played
    ? `${home.label} ${match.homeScore ?? 0}-${match.awayScore ?? 0} ${away.label} — ${VENUE_LABEL[match.venue] ?? match.venue}, ${matchDate(match.kickoff)}.`
    : `${home.label} vs ${away.label} — ${matchDate(match.kickoff)} at ${VENUE_LABEL[match.venue] ?? match.venue}, Kigali.`

  // The highlight thumbnail doubles as the social card when one is attached.
  const thumb = match.highlightThumb
  const ogImage =
    thumb && typeof thumb !== 'number' ? (thumb.sizes?.hero?.url ?? thumb.url ?? null) : null

  return {
    title,
    description,
    alternates: { canonical: `/matches/${match.id}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/matches/${match.id}`,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: { card: ogImage ? 'summary_large_image' : 'summary', title, description },
  }
}

/**
 * Per-fixture structured data.
 *
 * This is what produces a rich fixture result in search — teams, kickoff, venue
 * and (once played) the scoreline. `superEvent` ties it back to the
 * tournament-level SportsEvent in the root layout so the 22 games are
 * understood as one competition.
 */
function matchJsonLd(
  detail: NonNullable<Awaited<ReturnType<typeof getMatchDetail>>>,
  status: 'scheduled' | 'live' | 'final',
) {
  const { match } = detail
  const home = matchSide(match.homeTeam, match.homeTeamPlaceholder)
  const away = matchSide(match.awayTeam, match.awayTeamPlaceholder)
  const played = status !== 'scheduled'

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${home.label} vs ${away.label}`,
    sport: 'Football',
    startDate: match.kickoff,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: absoluteUrl(`/matches/${match.id}`),
    location: {
      '@type': 'Place',
      name: VENUE_LABEL[match.venue] ?? match.venue,
      address: { '@type': 'PostalAddress', addressLocality: 'Kigali', addressCountry: 'RW' },
    },
    competitor: [
      {
        '@type': 'SportsTeam',
        name: home.label,
        ...(played ? { award: `${match.homeScore ?? 0}` } : {}),
      },
      {
        '@type': 'SportsTeam',
        name: away.label,
        ...(played ? { award: `${match.awayScore ?? 0}` } : {}),
      },
    ],
    superEvent: {
      '@type': 'SportsEvent',
      name: SITE_NAME,
      url: SITE_URL,
    },
  }
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
  // Whether this fixture is worth polling is decided in the browser, not here:
  // this page is prerendered, so a `Date.now()` verdict computed at build time
  // would be frozen into the ISR cache and could keep the feed switched off for
  // minutes after kickoff. <LiveMatchProvider> makes the call from `kickoff`.

  return (
    <LiveMatchProvider matchId={match.id} initial={initialLive} kickoff={match.kickoff}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(matchJsonLd(detail, displayStatus)) }}
      />
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
              <div className="sidecard__head">Amakuru y&apos;umukino</div>
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
