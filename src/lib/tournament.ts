/**
 * Server-side data layer for the public site.
 *
 * Reads teams and matches from Payload, then runs the pure standings/bracket
 * functions over them. Everything the homepage shows about the competition
 * flows through here, so a scoreline entered in the admin appears everywhere at
 * once and can never disagree with itself.
 */
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Match, Team, Player, PlayerMatchStat } from '@/payload-types'
import {
  computeAllGroups,
  fairPlayFromCards,
  type GroupId,
  type MatchResult,
  type StandingRow,
  type TeamRef,
} from './standings'
import { computeBracket, type Bracket } from './bracket'

export type { StandingRow } from './standings'

async function getClient() {
  return getPayload({ config: await config })
}

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
  const payload = await getClient()

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
  const payload = await getClient()

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

export type MatchEventType = 'goal' | 'yellow' | 'red' | 'kickoff' | 'halftime' | 'fulltime'

export interface MatchEvent {
  minute: number | null
  type: MatchEventType
  playerName?: string
  teamId?: number | null
  side?: 'home' | 'away' | null
}

export interface MatchDetail {
  match: Match
  homeTeam: Team | null
  awayTeam: Team | null
  homePlayers: Player[]
  awayPlayers: Player[]
  events: MatchEvent[]
  otherMatches: Match[]
}

/**
 * Everything the single-match page shows: the fixture, both squads, a
 * commentary feed derived from recorded goals and cards, and other results.
 */
export async function getMatchDetail(id: number): Promise<MatchDetail | null> {
  const payload = await getClient()

  const match = await payload.findByID({ collection: 'matches', id, depth: 2 }).catch(() => null)
  if (!match) return null

  const homeTeam = relTeam(match.homeTeam)
  const awayTeam = relTeam(match.awayTeam)
  const teamIds = [homeTeam?.id, awayTeam?.id].filter((v): v is number => typeof v === 'number')

  const [playersRes, statsRes, allMatchesRes] = await Promise.all([
    teamIds.length
      ? payload.find({
          collection: 'players',
          where: { team: { in: teamIds } },
          sort: 'shirtNumber',
          limit: 100,
          depth: 0,
        })
      : Promise.resolve({ docs: [] as Player[] }),
    payload.find({
      collection: 'player-match-stats',
      where: { match: { equals: id } },
      limit: 200,
      depth: 2,
    }),
    payload.find({ collection: 'matches', sort: '-kickoff', limit: 20, depth: 1 }),
  ])

  const homePlayers = (playersRes.docs as Player[]).filter((p) => relId(p.team) === homeTeam?.id)
  const awayPlayers = (playersRes.docs as Player[]).filter((p) => relId(p.team) === awayTeam?.id)

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
  scored.sort((a, b) => (b.minute ?? 0) - (a.minute ?? 0))

  // Frame the recorded events with kick-off / half-time / full-time markers so
  // the feed reads like live commentary even before editors add prose.
  const events: MatchEvent[] = []
  if (match.status === 'final') events.push({ minute: 90, type: 'fulltime' })
  events.push(...scored)
  if (match.status !== 'scheduled') events.push({ minute: 0, type: 'kickoff' })

  const otherMatches = (allMatchesRes.docs as Match[])
    .filter((m) => m.id !== id && (m.status === 'final' || m.status === 'live'))
    .slice(0, 4)

  return { match, homeTeam, awayTeam, homePlayers, awayPlayers, events, otherMatches }
}
