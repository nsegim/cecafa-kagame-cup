/**
 * Server-side data layer for the public site.
 *
 * Reads teams and matches from Payload, then runs the pure standings/bracket
 * functions over them. Everything the homepage shows about the competition
 * flows through here, so a scoreline entered in the admin appears everywhere at
 * once and can never disagree with itself.
 */
import { cache } from 'react'
import { getPayloadClient } from '@/lib/payload'
import type { Match, Media, Team, Player, PlayerMatchStat } from '@/payload-types'
import {
  computeAllGroups,
  fairPlayFromCards,
  type GroupId,
  type MatchResult,
  type StandingRow,
  type TeamRef,
} from './standings'
import { computeBracket, type Bracket } from './bracket'
import { effectiveMatchStatus } from './matchStatus'

export type { StandingRow } from './standings'
export { effectiveMatchStatus } from './matchStatus'

function relId(rel: number | { id: number } | null | undefined): number | null {
  if (rel == null) return null
  return typeof rel === 'number' ? rel : rel.id
}

function toMatchResult(m: Match): MatchResult {
  return {
    group: (m.group ?? null) as GroupId | null,
    stage: m.stage,
    status: m.status,
    homeTeamId: relId(m.homeTeam),
    awayTeamId: relId(m.awayTeam),
    homeScore: m.homeScore ?? null,
    awayScore: m.awayScore ?? null,
  }
}

export interface TournamentData {
  teams: Team[]
  matches: Match[]
  tables: Record<GroupId, StandingRow[]>
  bracket: Bracket
  groupStageComplete: boolean
}

/**
 * One round-trip for the whole competition state. Cached and tagged so a
 * Payload afterChange hook can revalidate it the instant a result is saved.
 */
export async function getTournamentData(): Promise<TournamentData> {
  const payload = await getPayloadClient()

  const [teamsRes, matchesRes, cardsRes] = await Promise.all([
    payload.find({ collection: 'teams', limit: 100, sort: 'name' }),
    payload.find({ collection: 'matches', limit: 100, sort: 'matchNumber', depth: 2 }),
    payload.find({ collection: 'player-match-stats', limit: 2000, depth: 0 }),
  ])

  const teams = teamsRes.docs
  const matches = matchesRes.docs

  // Fair-play points per team, summed from cards across all matches.
  const fairPlayByTeam = new Map<number, number>()
  for (const s of cardsRes.docs as PlayerMatchStat[]) {
    const player = s.player
    if (typeof player === 'number') continue // depth 0 gives ids; need team — skip
    const teamId = relId((player as Player)?.team)
    if (teamId == null) continue
    const prev = fairPlayByTeam.get(teamId) ?? 0
    fairPlayByTeam.set(teamId, prev + fairPlayFromCards(s.yellowCards ?? 0, s.redCards ?? 0))
  }

  const teamRefs: TeamRef[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    group: t.group as GroupId,
    fairPlayPoints: fairPlayByTeam.get(t.id) ?? 0,
    drawOfLotsRank: t.drawOfLotsRank ?? null,
  }))

  const matchResults = matches.map(toMatchResult)
  const tables = computeAllGroups(teamRefs, matchResults)

  const groupMatches = matches.filter((m) => m.stage === 'group')
  const finishedGroupMatches = groupMatches.filter((m) => m.status === 'final')
  const groupStageComplete =
    groupMatches.length > 0 && finishedGroupMatches.length === groupMatches.length

  const bracket = computeBracket(tables, { groupStageComplete })

  return { teams, matches, tables, bracket, groupStageComplete }
}

// --- Player performance leaderboards ---------------------------------------

export interface LeaderboardRow {
  player: Player
  team: Team | null
  played: number
  goals: number
  assists: number
  cleanSheets: number
}

export type LeaderboardMetric = 'goals' | 'assists' | 'cleanSheets'

export async function getLeaderboards(): Promise<Record<LeaderboardMetric, LeaderboardRow[]>> {
  const payload = await getPayloadClient()

  const statsRes = await payload.find({
    collection: 'player-match-stats',
    limit: 5000,
    depth: 2, // player -> team
  })

  const byPlayer = new Map<number, LeaderboardRow>()

  for (const s of statsRes.docs as PlayerMatchStat[]) {
    if (typeof s.player === 'number') continue
    const player = s.player as Player
    const team = (typeof player.team === 'number' ? null : player.team) as Team | null

    const row =
      byPlayer.get(player.id) ??
      ({ player, team, played: 0, goals: 0, assists: 0, cleanSheets: 0 } as LeaderboardRow)

    row.played += 1
    row.goals += s.goals ?? 0
    row.assists += s.assists ?? 0
    row.cleanSheets += s.cleanSheet ? 1 : 0
    byPlayer.set(player.id, row)
  }

  const all = [...byPlayer.values()]
  const top = (metric: LeaderboardMetric) =>
    [...all]
      .filter((r) => r[metric] > 0)
      .sort((a, b) => b[metric] - a[metric] || a.played - b.played)
      .slice(0, 5)

  return {
    goals: top('goals'),
    assists: top('assists'),
    cleanSheets: top('cleanSheets'),
  }
}

// --- Match helpers for the fixture strip ------------------------------------

export function teamName(rel: Match['homeTeam'], fallback?: string | null): string {
  if (rel && typeof rel !== 'number') return rel.name
  return fallback ?? 'TBC'
}

export function isResult(m: Match): boolean {
  return m.status === 'final' || m.status === 'live'
}

// --- Single match detail ----------------------------------------------------

function relTeam(rel: number | Team | null | undefined): Team | null {
  return rel && typeof rel !== 'number' ? rel : null
}

function matchPhotoUrls(match: Match): string[] {
  return (match.photos ?? [])
    .map((p) => {
      const img = p.image
      if (!img || typeof img === 'number') return null
      const media = img as Media
      return media.sizes?.hero?.url || media.url || null
    })
    .filter((url): url is string => Boolean(url))
}

export type MatchEventType =
  | 'goal'
  | 'yellow'
  | 'red'
  | 'substitution'
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'note'

export interface MatchEvent {
  minute: number | null
  type: MatchEventType
  playerName?: string
  /** Substitution only — player coming off / going on. */
  playerOutName?: string
  playerInName?: string
  teamId?: number | null
  side?: 'home' | 'away' | null
  /** Free text — the manual caption for a 'note' entry, or optional extra detail on any other type. */
  text?: string
  /** Optional photo an editor attached to this specific entry. */
  image?: string | null
}

function singleMediaUrl(media: number | Media | null | undefined): string | null {
  if (!media || typeof media === 'number') return null
  return media.sizes?.hero?.url || media.url || null
}

export interface LineupPlayerEntry {
  player: Player
  isCaptain: boolean
}

export interface TeamLineup {
  coach: string | null
  startingXI: LineupPlayerEntry[]
  substitutes: LineupPlayerEntry[]
}

export interface MatchDetail {
  match: Match
  homeTeam: Team | null
  awayTeam: Team | null
  homeLineup: TeamLineup | null
  awayLineup: TeamLineup | null
  events: MatchEvent[]
  otherMatches: Match[]
  photos: string[]
}

type RawLineupRow = { player?: number | Player | null; isCaptain?: boolean | null }
type RawLineup = { coach?: string | null; startingXI?: RawLineupRow[] | null; substitutes?: RawLineupRow[] | null }

/**
 * Resolves a match's stored lineup (player relationships + captain flags)
 * into the shape the Match Details page renders. Returns `null` when nothing
 * has been entered for this side yet, so the frontend can hide the section
 * entirely rather than show an empty one.
 */
function resolveLineup(raw: RawLineup | null | undefined): TeamLineup | null {
  if (!raw) return null
  const toEntries = (rows: RawLineupRow[] | null | undefined): LineupPlayerEntry[] =>
    (rows ?? [])
      // Player is optional in the CMS now — a row with no player selected yet
      // (stored as null) must be dropped. `typeof null === 'object'`, so guard
      // with a truthy check, not `typeof` alone.
      .filter((row): row is { player: Player; isCaptain?: boolean | null } => !!row.player && typeof row.player === 'object')
      .map((row) => ({ player: row.player, isCaptain: Boolean(row.isCaptain) }))

  const startingXI = toEntries(raw.startingXI)
  const substitutes = toEntries(raw.substitutes)
  if (!raw.coach && startingXI.length === 0 && substitutes.length === 0) return null
  return { coach: raw.coach ?? null, startingXI, substitutes }
}

/**
 * Everything the single-match page shows: the fixture, both squads, a
 * commentary feed derived from recorded goals and cards, and other results.
 *
 * Wrapped in `cache()` because both `generateMetadata` and the page body need
 * it for the same request — this de-dupes the Payload round-trip.
 */
export const getMatchDetail = cache(async (id: number): Promise<MatchDetail | null> => {
  const payload = await getPayloadClient()

  const match = await payload.findByID({ collection: 'matches', id, depth: 2 }).catch(() => null)
  if (!match) return null

  const homeTeam = relTeam(match.homeTeam)
  const awayTeam = relTeam(match.awayTeam)

  const [statsRes, allMatchesRes] = await Promise.all([
    payload.find({
      collection: 'player-match-stats',
      where: { match: { equals: id } },
      limit: 200,
      depth: 2,
    }),
    payload.find({ collection: 'matches', sort: '-kickoff', limit: 20, depth: 1 }),
  ])

  const homeLineup = resolveLineup(match.homeLineup)
  const awayLineup = resolveLineup(match.awayLineup)

  const scored: MatchEvent[] = []
  for (const s of statsRes.docs as PlayerMatchStat[]) {
    if (typeof s.player === 'number') continue
    const player = s.player as Player
    const teamId = relId(player.team)
    const side: 'home' | 'away' | null =
      teamId === homeTeam?.id ? 'home' : teamId === awayTeam?.id ? 'away' : null
    const base = { minute: s.minutes ?? null, playerName: player.name, teamId, side }
    for (let i = 0; i < (s.goals ?? 0); i++) scored.push({ ...base, type: 'goal' })
    for (let i = 0; i < (s.yellowCards ?? 0); i++) scored.push({ ...base, type: 'yellow' })
    for (let i = 0; i < (s.redCards ?? 0); i++) scored.push({ ...base, type: 'red' })
  }

  // Manual live updates an editor posts as the match happens — saves, chances,
  // substitutions, general commentary. Goals/cards above are automatic. Entries
  // marked `hidden` stay in the admin for reference but drop out of the feed.
  const notes: MatchEvent[] = (match.commentary ?? [])
    .filter((c) => !c.hidden)
    .map((c) => {
      const player = c.player && typeof c.player === 'object' ? c.player : null
      const playerOff = c.playerOff && typeof c.playerOff === 'object' ? c.playerOff : null
      const playerOn = c.playerOn && typeof c.playerOn === 'object' ? c.playerOn : null
      const side = c.team ?? null
      const teamId = side === 'home' ? (homeTeam?.id ?? null) : side === 'away' ? (awayTeam?.id ?? null) : null
      return {
        minute: c.minute ?? null,
        type: (c.type as MatchEventType) ?? 'note',
        playerName: player?.name,
        playerOutName: playerOff?.name,
        playerInName: playerOn?.name,
        teamId,
        side,
        text: c.text ?? undefined,
        image: singleMediaUrl(c.image),
      }
    })

  const feed = [...scored, ...notes].sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))

  // Frame the recorded events with kick-off / half-time / full-time markers so
  // the feed reads like live commentary even before editors add prose. Full-time
  // only ever comes from an editor's explicit Final — kick-off can be automatic.
  const events: MatchEvent[] = []
  if (match.status === 'final') events.push({ minute: 90, type: 'fulltime' })
  events.push(...feed)
  if (effectiveMatchStatus(match) !== 'scheduled') events.push({ minute: 0, type: 'kickoff' })

  const otherMatches = (allMatchesRes.docs as Match[])
    .filter((m) => m.id !== id && effectiveMatchStatus(m) !== 'scheduled')
    .slice(0, 4)

  const photos = matchPhotoUrls(match)

  return { match, homeTeam, awayTeam, homeLineup, awayLineup, events, otherMatches, photos }
})

/**
 * The one match, if any, the site-wide header's LIVE button should point at.
 *
 * A match is eligible once an editor sets its status to Live, sets a
 * destination, and hasn't hidden the button. If several are live at once —
 * two group matches kicking off together — the earliest fixture (lowest
 * `matchNumber`) wins, so only one button is ever shown.
 */
export const getActiveLiveMatch = cache(async (): Promise<{ id: number; liveMatchUrl: string } | null> => {
  try {
    const payload = await getPayloadClient()
    // A match already marked Final is never a candidate; everything else
    // (Scheduled or Live) is checked against the automatic kickoff window.
    const res = await payload.find({
      collection: 'matches',
      where: { status: { not_equals: 'final' } },
      sort: 'matchNumber',
      limit: 25,
      depth: 0,
    })
    const match = (res.docs as Match[])
      .filter((m) => effectiveMatchStatus(m) === 'live')
      .find((m) => m.showLiveButton !== false && m.liveMatchUrl)
    if (!match?.liveMatchUrl) return null
    return { id: match.id, liveMatchUrl: match.liveMatchUrl }
  } catch (err) {
    console.error('[live-match] failed to read active live match:', err)
    return null
  }
})
