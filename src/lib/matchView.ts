/**
 * The narrow view of a fixture that list UIs actually render.
 *
 * WHY THIS EXISTS. `getTournamentData()` reads matches at `depth: 2`, which
 * hydrates, for every fixture: both `Team` docs, each team's `crest` Media doc
 * with all four size variants, both lineups (up to 40 `Player` docs with their
 * own `photo` Media docs), every commentary entry's player relationships and
 * attached images, and the full Lexical tree of every note.
 *
 * <MatchesTabs> is a client component, so handing it raw `Match` docs serialised
 * that entire object graph across the server→client boundary — twice, once into
 * the SSR HTML and again into the Flight payload. Measured on `/matches`:
 * 1,273 KB of HTML, of which 1,252 KB (98%) was that payload — 3,690 copies of
 * `"filename"`, 738 `sizes` objects, hundreds of rich-text nodes — to render a
 * list that shows two names, two crests and a scoreline.
 *
 * Mapping to `MatchRow` here keeps that data on the server. The same page now
 * ships roughly 12 KB.
 *
 * Note what is deliberately NOT resolved: `status` stays raw and `kickoff` comes
 * along with it, so the client can call `effectiveMatchStatus` itself. Deriving
 * "live" on the server would freeze a `Date.now()` reading into the page's
 * 5-minute ISR cache, and a fixture would keep reading as "scheduled" for
 * minutes after it kicked off.
 */
import type { Match, Team } from '@/payload-types'

export interface SideView {
  /** Team name, or the fixture's placeholder ("Winner Gr. B"), or 'TBC'. */
  label: string
  /** Abbreviation for tight layouts; falls back to `label` when there's no short name. */
  shortLabel: string
  /** Crest image URL, or null to render the monogram tile instead. */
  crestUrl: string | null
  /** Monogram shown when there's no crest — an em dash when no team is assigned yet. */
  crestMonogram: string
  /** Tooltip for the monogram tile — the full club name, when one is known. */
  teamName: string | null
}

export interface MatchRow {
  id: number
  /** ISO kickoff. The client formats it and derives live-ness from it. */
  kickoff: string
  /** Raw stored status — NOT the effective one. See the note above. */
  status: Match['status']
  venue: string
  homeScore: number | null
  awayScore: number | null
  home: SideView
  away: SideView
}

function crestUrlOf(crest: Team['crest']): string | null {
  if (!crest || typeof crest === 'number') return null
  return crest.sizes?.crest?.url || crest.url || null
}

function side(rel: Match['homeTeam'], placeholder?: string | null): SideView {
  const team = rel && typeof rel !== 'number' ? (rel as Team) : null

  if (!team) {
    const label = placeholder ?? 'TBC'
    return { label, shortLabel: label, crestUrl: null, crestMonogram: '—', teamName: null }
  }

  return {
    label: team.name,
    shortLabel: team.shortName || team.name,
    crestUrl: crestUrlOf(team.crest),
    // Mirrors the monogram <TeamCrest> builds for a team with no crest uploaded.
    crestMonogram: team.shortName || team.name.slice(0, 3).toUpperCase(),
    teamName: team.name,
  }
}

export function toMatchRow(m: Match): MatchRow {
  return {
    id: m.id,
    kickoff: m.kickoff,
    status: m.status,
    venue: m.venue,
    homeScore: m.homeScore ?? null,
    awayScore: m.awayScore ?? null,
    home: side(m.homeTeam, m.homeTeamPlaceholder),
    away: side(m.awayTeam, m.awayTeamPlaceholder),
  }
}
