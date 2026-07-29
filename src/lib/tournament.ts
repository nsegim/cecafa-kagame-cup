/**
 * Server-side data layer for the public site.
 *
 * Reads teams and matches from Payload, then runs the pure standings/bracket
 * functions over them. Everything the homepage shows about the competition
 * flows through here, so a scoreline entered in the admin appears everywhere at
 * once and can never disagree with itself.
 */
import { cache } from 'react'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
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
import { effectiveMatchStatus, HALF_TIME_MINUTE } from './matchStatus'
import { findYouTubeUrls } from './video'
import { richTextToPlainText } from './richText'

export type { StandingRow } from './standings'
export { effectiveMatchStatus } from './matchStatus'

function relId(rel: number | { id: number } | null | undefined): number | null {
  if (rel == null) return null
  return typeof rel === 'number' ? rel : rel.id
}

/**
 * Which fields of a populated relation the public site actually reads.
 *
 * A populated Media doc weighs ~1.4 KB, and most of it is never looked at:
 * `caption`, `filesize`, `focalX/Y`, `createdAt/updatedAt`, plus a `mimeType`,
 * `filesize` and `filename` repeated inside each of the four size variants.
 * Everything here reads URLs and dimensions and nothing else.
 *
 * That adds up: one match's `photos` array alone is 194 entries, and reading it
 * at plain `depth: 2` returned 465 KB — of which 434 KB was image metadata. The
 * `/live` endpoint re-read all of it on every 15-second poll to emit a feed.
 *
 * `populate` is per-query, so this trims the SITE's reads without touching the
 * shape the admin loads or the Media collection itself.
 */
const PUBLIC_POPULATE = {
  media: { alt: true, url: true, width: true, height: true, sizes: true },
  players: { name: true, shirtNumber: true, position: true },
  teams: { name: true, shortName: true, country: true, crest: true },
} as const

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
 * Every fixture with its relations resolved, once per request.
 *
 * `depth: 2` is what makes `commentary[].player.team` readable, which both the
 * standings' fair-play tally and the player leaderboards need. Shared through
 * `cache()` so the homepage — which builds standings AND leaderboards — issues
 * one matches query rather than two.
 */
const getMatchesWithRelations = cache(async (): Promise<Match[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'matches',
    limit: 100,
    sort: 'matchNumber',
    depth: 2,
    populate: PUBLIC_POPULATE,
  })
  return res.docs as Match[]
})

// --- Player tallies ---------------------------------------------------------

export interface PlayerTally {
  player: Player
  team: Team | null
  played: number
  goals: number
  assists: number
  cleanSheets: number
  yellows: number
  reds: number
}

/**
 * Per-player goals, assists, cards and clean sheets, merged from the two places
 * an editor can record them.
 *
 * WHY THIS IS NOT JUST `player-match-stats`. There are two input paths and
 * editors use them differently in practice:
 *
 *   - Live Commentary is where the match is actually worked. It carries goals
 *     and cards, and it is already the source of truth for the SCORELINE (see
 *     `scoreFromGoalCommentary` in the Matches collection). At the time of
 *     writing it holds every card in the tournament — 13 yellows — and 17 goals.
 *   - Player Match Stats carries goals, assists and clean sheets, and is filled
 *     in afterwards. It holds 24 goals and 6 clean sheets, and NO cards at all.
 *
 * Reading only Player Match Stats therefore produced two visible faults: the
 * fair-play tiebreaker (CECAFA criterion 6) scored every team 0 because it
 * never saw a card, and a match page could show a scoreline built from
 * commentary goals whose scorers were absent from the top-scorer table.
 *
 * MERGE RULE, per match and per metric: if a match has commentary of that kind,
 * commentary wins for that match; otherwise Player Match Stats is used. Never
 * both, so the seven matches currently recorded in both places are not counted
 * twice. Assists and clean sheets exist only in Player Match Stats and are
 * always taken from there.
 */
export function playerTallies(matches: Match[], stats: PlayerMatchStat[]): Map<number, PlayerTally> {
  const tallies = new Map<number, PlayerTally>()

  /**
   * `fallbackTeam` is the club the player turned out for in THAT match, taken
   * from the fixture. It matters because commentary player relationships are
   * capped at `maxDepth: 1` (they carry a name, not a nested club) — and
   * because it is the more accurate answer anyway: a player's `team` field is
   * their current club, which is not necessarily who they played for here.
   */
  const rowFor = (player: Player, fallbackTeam: Team | null = null): PlayerTally => {
    const existing = tallies.get(player.id)
    if (existing) {
      if (!existing.team && fallbackTeam) existing.team = fallbackTeam
      return existing
    }
    const own = (typeof player.team === 'number' ? null : player.team) as Team | null
    const fresh: PlayerTally = {
      player,
      team: own ?? fallbackTeam,
      played: 0,
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      yellows: 0,
      reds: 0,
    }
    tallies.set(player.id, fresh)
    return fresh
  }

  // Which matches have commentary for each metric — these override the stats rows.
  const commentaryGoalMatches = new Set<number>()
  const commentaryCardMatches = new Set<number>()

  for (const match of matches) {
    for (const entry of match.commentary ?? []) {
      if (entry.hidden) continue
      if (entry.type === 'goal') commentaryGoalMatches.add(match.id)
      if (entry.type === 'yellow' || entry.type === 'red') commentaryCardMatches.add(match.id)
    }
  }

  for (const match of matches) {
    const home = (match.homeTeam && typeof match.homeTeam !== 'number' ? match.homeTeam : null) as
      | Team
      | null
    const away = (match.awayTeam && typeof match.awayTeam !== 'number' ? match.awayTeam : null) as
      | Team
      | null

    for (const entry of match.commentary ?? []) {
      // A hidden entry is retracted — it must not reach the standings either.
      if (entry.hidden) continue
      const player = entry.player && typeof entry.player === 'object' ? entry.player : null
      // A goal with no scorer still counts for the team's score, but there is
      // no player to credit here.
      if (!player) continue
      const side = entry.team === 'home' ? home : entry.team === 'away' ? away : null
      const row = rowFor(player as Player, side)
      if (entry.type === 'goal') row.goals += 1
      else if (entry.type === 'yellow') row.yellows += 1
      else if (entry.type === 'red') row.reds += 1
    }
  }

  for (const stat of stats) {
    if (typeof stat.player === 'number') continue
    const row = rowFor(stat.player as Player)
    const matchId = relId(stat.match)

    // Appearances only exist in Player Match Stats.
    row.played += 1
    row.assists += stat.assists ?? 0
    row.cleanSheets += stat.cleanSheet ? 1 : 0

    if (matchId == null || !commentaryGoalMatches.has(matchId)) row.goals += stat.goals ?? 0
    if (matchId == null || !commentaryCardMatches.has(matchId)) {
      row.yellows += stat.yellowCards ?? 0
      row.reds += stat.redCards ?? 0
    }
  }

  return tallies
}

/**
 * One round-trip for the whole competition state. Cached and tagged so a
 * Payload afterChange hook can revalidate it the instant a result is saved.
 */
export async function getTournamentData(): Promise<TournamentData> {
  const payload = await getPayloadClient()

  const [teamsRes, matches, stats] = await Promise.all([
    payload.find({ collection: 'teams', limit: 100, sort: 'name' }),
    getMatchesWithRelations(),
    getPlayerMatchStats(),
  ])

  const teams = teamsRes.docs

  // Fair-play points per team (CECAFA tiebreaker 6), summed from every card in
  // the tournament.
  //
  // This previously read `player-match-stats` at `depth: 0`, which returns
  // `player` as a bare id — so the "is this a number?" guard skipped EVERY row
  // and the tally was always empty. Even reading it at the right depth would
  // have scored zero, because editors log cards on the Live Commentary feed and
  // that collection holds none. `playerTallies` merges both sources; see its
  // doc comment for the anti-double-count rule.
  const fairPlayByTeam = new Map<number, number>()
  for (const tally of playerTallies(matches, stats).values()) {
    const teamId = tally.team?.id ?? relId((tally.player as Player)?.team)
    if (teamId == null) continue
    const prev = fairPlayByTeam.get(teamId) ?? 0
    fairPlayByTeam.set(teamId, prev + fairPlayFromCards(tally.yellows, tally.reds))
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

// --- Player match stats -----------------------------------------------------

/**
 * Every player-match-stat row, with `player` → `team` resolved.
 *
 * Shared by the standings' fair-play tally and the homepage leaderboards, which
 * previously issued two separate full scans of this collection on the same
 * render of `/`. `cache()` collapses them into one query per request.
 *
 * `depth: 2` is required, not incidental: both callers read `player.team`, and
 * at a shallower depth `player` comes back as a bare id and the aggregation
 * silently produces nothing.
 */
const getPlayerMatchStats = cache(async (): Promise<PlayerMatchStat[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'player-match-stats',
    limit: 5000,
    depth: 2, // player -> team
  })
  return res.docs as PlayerMatchStat[]
})

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
  const [matches, stats] = await Promise.all([getMatchesWithRelations(), getPlayerMatchStats()])

  // Same merged tally the standings use, so a scorer credited on the match feed
  // also appears in the top-scorer table. Reading `player-match-stats` alone
  // meant a match page could show a scoreline built from commentary goals whose
  // scorers were nowhere in this table.
  const all: LeaderboardRow[] = [...playerTallies(matches, stats).values()].map((t) => ({
    player: t.player,
    team: t.team,
    // A player can be credited by commentary without a stats row recording an
    // appearance; showing "0 played, 2 goals" reads as broken, so a scorer is
    // treated as having played at least once.
    played: Math.max(t.played, t.goals > 0 || t.assists > 0 ? 1 : 0),
    goals: t.goals,
    assists: t.assists,
    cleanSheets: t.cleanSheets,
  }))
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
      // Original upload — the photo exactly as it was added, at its true aspect
      // ratio. `hero` is a fixed 1600×900 crop, so it's only a fallback.
      return media.url || media.sizes?.hero?.url || null
    })
    .filter((url): url is string => Boolean(url))
    .reverse() // newest-added photos first, so the most recent match images show at the top
}

export type MatchEventType =
  | 'goal'
  | 'yellow'
  | 'red'
  | 'substitution'
  | 'kickoff'
  | 'halftime'
  | 'secondhalf'
  | 'fulltime'
  /** An editor's update posted after the final whistle — a wrap-up, reaction, extra photos. */
  | 'postmatch'
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
  /** Rich text (Lexical) — the body of a 'note' entry, or optional extra detail on any other type. */
  text?: DefaultTypedEditorState | null
  /** Photos an editor attached to this specific entry, in order — shown right here on the feed. */
  images?: FeedImage[]
  /**
   * YouTube player URLs for any video the editor linked in this entry's text —
   * played inline on the feed rather than sending the visitor off-site.
   */
  videos?: string[]
}

/**
 * Sentinel positions on the feed's minute axis. A real minute is 0–120, so
 * these sit safely either side of the run of play.
 */
const BEFORE_KICKOFF = -1
const AFTER_FULL_TIME = 1_000

/**
 * Where an entry sits on the feed's minute axis. Anything posted after the
 * final whistle sorts above the whole match; the whistle markers fall back to
 * the break when an editor didn't type a minute (they'd otherwise drop to the
 * bottom alongside the pre-match notes).
 */
function feedMinute(ev: MatchEvent): number {
  if (ev.type === 'postmatch') return AFTER_FULL_TIME
  if (ev.minute != null) return ev.minute
  if (ev.type === 'halftime' || ev.type === 'secondhalf') return HALF_TIME_MINUTE
  return BEFORE_KICKOFF
}

/**
 * Where each of the editor's own entries sits on the minute axis, read in the
 * order they were posted.
 *
 * A minute is optional in the admin, and an entry without one has to land where
 * the match had actually got to when it was written — otherwise an update typed
 * during the interval (a photo from the tunnel, a coach's remark, a stat) sank
 * to the very bottom of the feed, below kick-off, as if it had been posted
 * before the match. So a cursor walks the entries: a typed minute moves it
 * forward, a Half Time / Second Half marker moves it to the break, and anything
 * with no minute simply takes wherever the cursor has reached. Entries sharing
 * a position are separated by post order (newest on top), so an interval update
 * sits directly above the Half Time whistle and reads in sequence with the rest.
 *
 * The cursor only ever moves forward, so filling in a missed earlier incident
 * after the fact doesn't drag later minute-less entries backwards with it.
 */
function notePositions(notes: MatchEvent[]): number[] {
  let cursor: number | null = null // null until the match has visibly started
  return notes.map((ev) => {
    if (ev.type === 'postmatch') return AFTER_FULL_TIME
    if (ev.type === 'halftime' || ev.type === 'secondhalf') {
      cursor = Math.max(cursor ?? 0, ev.minute ?? HALF_TIME_MINUTE)
      return cursor
    }
    if (ev.minute != null) {
      cursor = Math.max(cursor ?? 0, ev.minute)
      return ev.minute
    }
    return cursor ?? BEFORE_KICKOFF
  })
}

/**
 * Builds the Live Expressions feed, newest-first.
 *
 * Primary key is the position on the minute axis (descending); when entries
 * share a position — including the pre-match / pre-live entries that have no
 * minute yet — the more recently posted one (a later row in the commentary
 * array) shows on top, so the latest update is always at the top even before
 * kickoff. Kick-off sorts in at minute 0 (just under the first in-match update,
 * above any pre-match notes). The full-time whistle sorts above everything
 * played, but *below* anything an editor posts after it, so post-match updates
 * stay at the very top, newest first.
 *
 * Editor entries with no minute of their own follow the run of play instead of
 * falling to the bottom — see `notePositions`. That's what lets an editor keep
 * posting through the half-time interval, and after the whistle, with the same
 * result as during play: the newest update on top.
 *
 * `scored` are the automatic goal/card events derived from Player Match Stats;
 * `notes` are the editor's own commentary rows, in the order they were added.
 */
export function orderMatchFeed(
  scored: MatchEvent[],
  notes: MatchEvent[],
  { started, final }: { started: boolean; final: boolean },
): MatchEvent[] {
  type Ordered = { ev: MatchEvent; min: number; seq: number }
  const ordered: Ordered[] = []
  scored.forEach((ev, i) => ordered.push({ ev, min: feedMinute(ev), seq: -1 - i }))
  const positions = notePositions(notes)
  notes.forEach((ev, i) => ordered.push({ ev, min: positions[i], seq: i }))
  if (started) {
    ordered.push({ ev: { minute: 0, type: 'kickoff' }, min: 0, seq: -1_000_000 })
  }
  if (final) {
    ordered.push({ ev: { minute: null, type: 'fulltime' }, min: AFTER_FULL_TIME, seq: -1_000_000 })
  }
  // Compare `min` for equality first — two entries can share the same sentinel,
  // and subtracting two identical non-finite values would give NaN.
  ordered.sort((a, b) => (a.min === b.min ? b.seq - a.seq : b.min - a.min))
  return ordered.map((o) => o.ev)
}

/** A feed image plus its real pixel size, so it can render at its own aspect ratio. */
export interface FeedImage {
  url: string
  width: number
  height: number
}

function mediaToFeedImage(media: number | Media | null | undefined): FeedImage | null {
  if (!media || typeof media === 'number') return null
  // Prefer the original upload with its real pixel size, so the feed shows the
  // photo exactly as it was added — whole, at its true aspect ratio. The `hero`
  // size is a fixed 1600×900 (16:9) crop, so it's only a fallback.
  if (media.url && media.width && media.height) {
    return { url: media.url, width: media.width, height: media.height }
  }
  const hero = media.sizes?.hero
  if (hero?.url && hero.width && hero.height) {
    return { url: hero.url, width: hero.width, height: hero.height }
  }
  // URL present but dimensions missing — fall back to a neutral 16:9 so it still renders.
  const url = media.url || hero?.url
  return url ? { url, width: 1600, height: 900 } : null
}

/** Resolve a `hasMany` upload value (or a single one) to sized images, in order. */
function feedImages(media: (number | Media)[] | number | Media | null | undefined): FeedImage[] {
  if (!media) return []
  const list = Array.isArray(media) ? media : [media]
  return list.map(mediaToFeedImage).filter((x): x is FeedImage => x !== null)
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
type RawLineup = {
  coach?: string | null
  startingXI?: RawLineupRow[] | null
  substitutes?: RawLineupRow[] | null
}

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
      .filter(
        (row): row is { player: Player; isCaptain?: boolean | null } =>
          !!row.player && typeof row.player === 'object',
      )
      .map((row) => ({ player: row.player, isCaptain: Boolean(row.isCaptain) }))

  const startingXI = toEntries(raw.startingXI)
  const substitutes = toEntries(raw.substitutes)
  if (!raw.coach && startingXI.length === 0 && substitutes.length === 0) return null
  return { coach: raw.coach ?? null, startingXI, substitutes }
}

/**
 * Every fixture id, for prerendering the match pages at build time.
 * `depth: 0` keeps this to a single cheap column read — no relations expanded.
 */
export const getAllMatchIds = cache(async (): Promise<number[]> => {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'matches',
      sort: 'matchNumber',
      limit: 500,
      depth: 0,
      pagination: false,
    })
    return (res.docs as Match[]).map((m) => m.id)
  } catch (err) {
    // A build shouldn't fail outright because the DB blipped — fall back to
    // rendering match pages on demand.
    console.error('[matches] failed to list match ids for prerender:', err)
    return []
  }
})

/**
 * Everything the single-match page shows: the fixture, both squads, a
 * commentary feed derived from recorded goals and cards, and other results.
 *
 * Wrapped in `cache()` because both `generateMetadata` and the page body need
 * it for the same request — this de-dupes the Payload round-trip.
 *
 * `includeOtherMatches` is off for the `/live` polling endpoint, which only
 * reads the scoreline and feed — no reason to pull 20 more fixtures every
 * 15 seconds for a sidebar the poll never touches.
 */
export const getMatchDetail = cache(
  async (
    id: number,
    { includeOtherMatches = true }: { includeOtherMatches?: boolean } = {},
  ): Promise<MatchDetail | null> => {
    const payload = await getPayloadClient()

    const match = await payload
      .findByID({ collection: 'matches', id, depth: 2, populate: PUBLIC_POPULATE })
      .catch(() => null)
    if (!match) return null

    const homeTeam = relTeam(match.homeTeam)
    const awayTeam = relTeam(match.awayTeam)

    // A failure here degrades the page (no feed, no sidebar) rather than
    // throwing it away entirely — the scoreline above is already in hand.
    const [statsRes, allMatchesRes] = await Promise.all([
      payload
        .find({
          collection: 'player-match-stats',
          where: { match: { equals: id } },
          limit: 200,
          depth: 2,
          populate: PUBLIC_POPULATE,
        })
        .catch((err) => {
          console.error(`[match ${id}] stats query failed:`, err)
          return { docs: [] }
        }),
      includeOtherMatches
        ? payload
            .find({
              collection: 'matches',
              sort: '-kickoff',
              limit: 20,
              depth: 1,
              populate: PUBLIC_POPULATE,
            })
            .catch((err) => {
              console.error(`[match ${id}] other-matches query failed:`, err)
              return { docs: [] }
            })
        : Promise.resolve({ docs: [] }),
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
        const teamId =
          side === 'home' ? (homeTeam?.id ?? null) : side === 'away' ? (awayTeam?.id ?? null) : null
        return {
          minute: c.minute ?? null,
          type: (c.type as MatchEventType) ?? 'note',
          playerName: player?.name,
          playerOutName: playerOff?.name,
          playerInName: playerOn?.name,
          teamId,
          side,
          text: c.text ?? undefined,
          images: feedImages(c.images),
          videos: findYouTubeUrls(richTextToPlainText(c.text)),
        }
      })

    const events = orderMatchFeed(scored, notes, {
      started: effectiveMatchStatus(match) !== 'scheduled',
      final: match.status === 'final',
    })

    const otherMatches = (allMatchesRes.docs as Match[])
      .filter((m) => m.id !== id && effectiveMatchStatus(m) !== 'scheduled')
      .slice(0, 4)

    const photos = matchPhotoUrls(match)

    return { match, homeTeam, awayTeam, homeLineup, awayLineup, events, otherMatches, photos }
  },
)

/**
 * The one match, if any, the site-wide header's LIVE button should point at.
 *
 * A match is eligible once an editor sets its status to Live, sets a
 * destination, and hasn't hidden the button. If several are live at once —
 * two group matches kicking off together — the earliest fixture (lowest
 * `matchNumber`) wins, so only one button is ever shown.
 */
export const getActiveLiveMatch = cache(
  async (): Promise<{ id: number; liveMatchUrl: string } | null> => {
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
        .find((m) => m.showLiveButton !== false)
      if (!match) return null
      // Blank Live Match URL defaults to the match's own page. `showLiveButton`
      // (default on) is the real toggle for hiding the button — not the URL.
      return { id: match.id, liveMatchUrl: match.liveMatchUrl || `/matches/${match.id}` }
    } catch (err) {
      console.error('[live-match] failed to read active live match:', err)
      return null
    }
  },
)
