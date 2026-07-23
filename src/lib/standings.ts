/**
 * Standings are DERIVED, never stored.
 *
 * Every table on the site — group tables, goal difference, points, and the
 * best-runner-up race that decides the fourth semi-final place — is computed
 * from finished matches. Nothing here is hand-edited, so nothing can drift out
 * of sync with the scorelines an editor entered.
 *
 * CECAFA tiebreakers for teams level on points, in strict order:
 *   1. Points in matches between the teams concerned      (head-to-head)
 *   2. Goal difference in matches between those teams     (head-to-head)
 *   3. Goals scored in matches between those teams        (head-to-head)
 *   4. Goal difference across all group matches
 *   5. Goals scored across all group matches
 *   6. Fair play points (fewest disciplinary points)
 *   7. Drawing of lots
 *
 * Head-to-head is applied ONLY among the tied teams, and once it separates
 * some of them the criteria restart for any subset still level — which is why
 * resolution below is recursive rather than a single comparator. A flat sort
 * gets three-way ties wrong.
 */

export type GroupId = 'A' | 'B' | 'C'

export const WIN_POINTS = 3
export const DRAW_POINTS = 1

export interface MatchResult {
  group?: GroupId | null
  stage: string
  status: string
  homeTeamId: string | number | null
  awayTeamId: string | number | null
  homeScore?: number | null
  awayScore?: number | null
}

export interface TeamRef {
  id: string | number
  name: string
  group: GroupId
  /**
   * Disciplinary points — lower is better. Criterion 6.
   * Aggregated from cards; see fairPlayFromCards().
   */
  fairPlayPoints?: number
  /**
   * Criterion 7. Set by an editor only after officials physically draw lots.
   * Lower ranks higher. Nothing else can resolve a tie this deep.
   */
  drawOfLotsRank?: number | null
}

export interface StandingRow {
  teamId: string | number
  name: string
  group: GroupId
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  fairPlayPoints: number
  /** 1-based position within the group, assigned after ranking. */
  position: number
  /**
   * True when every criterion including fair play left this team level with
   * another and no draw of lots has been recorded. The admin surfaces this so
   * nobody mistakes an arbitrary order for a decided one.
   */
  requiresDrawOfLots: boolean
}

/** FIFA-style disciplinary points. Confirm the exact scale with CECAFA. */
export const YELLOW_CARD_POINTS = 1
export const RED_CARD_POINTS = 3

export function fairPlayFromCards(yellows: number, reds: number): number {
  return yellows * YELLOW_CARD_POINTS + reds * RED_CARD_POINTS
}

/** A match only counts once it is Final and has both scores recorded. */
export function isCountable(m: MatchResult): boolean {
  return (
    m.stage === 'group' &&
    m.status === 'final' &&
    typeof m.homeScore === 'number' &&
    typeof m.awayScore === 'number' &&
    m.homeTeamId != null &&
    m.awayTeamId != null
  )
}

function emptyRow(team: TeamRef): StandingRow {
  return {
    teamId: team.id,
    name: team.name,
    group: team.group,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    fairPlayPoints: team.fairPlayPoints ?? 0,
    position: 0,
    requiresDrawOfLots: false,
  }
}

interface MiniStats {
  points: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
}

/**
 * Mini-table among a specific set of teams, counting only the matches they
 * played against each other. Criteria 1-3 read from this.
 */
function headToHead(ids: Set<string>, matches: MatchResult[]): Map<string, MiniStats> {
  const stats = new Map<string, MiniStats>()
  for (const id of ids) {
    stats.set(id, { points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 })
  }

  for (const m of matches) {
    if (!isCountable(m)) continue
    const h = String(m.homeTeamId)
    const a = String(m.awayTeamId)
    if (!ids.has(h) || !ids.has(a)) continue // at least one team is outside the tie

    const hs = m.homeScore as number
    const as = m.awayScore as number
    const hStat = stats.get(h)!
    const aStat = stats.get(a)!

    hStat.goalsFor += hs
    hStat.goalsAgainst += as
    aStat.goalsFor += as
    aStat.goalsAgainst += hs

    if (hs > as) hStat.points += WIN_POINTS
    else if (hs < as) aStat.points += WIN_POINTS
    else {
      hStat.points += DRAW_POINTS
      aStat.points += DRAW_POINTS
    }
  }

  for (const s of stats.values()) s.goalDifference = s.goalsFor - s.goalsAgainst
  return stats
}

/** Criteria 4-7, applied once head-to-head has failed to separate teams. */
function applyOverallCriteria(cluster: StandingRow[]): StandingRow[] {
  const sorted = [...cluster].sort((a, b) => {
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference // 4
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor // 5
    if (a.fairPlayPoints !== b.fairPlayPoints) return a.fairPlayPoints - b.fairPlayPoints // 6 (fewer is better)
    return 0
  })

  // Anything still level after criterion 6 can only be settled by lots.
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const x = sorted[i]
      const y = sorted[j]
      if (
        x.goalDifference === y.goalDifference &&
        x.goalsFor === y.goalsFor &&
        x.fairPlayPoints === y.fairPlayPoints
      ) {
        x.requiresDrawOfLots = true
        y.requiresDrawOfLots = true
      }
    }
  }

  return sorted
}

/**
 * Resolve one cluster of teams that are level on points.
 *
 * Recursion matters: in a three-way tie, head-to-head may separate one team
 * and leave two still level. Those two must have the criteria re-applied from
 * the top — now considering only the match between the two of them.
 */
function resolveCluster(
  cluster: StandingRow[],
  matches: MatchResult[],
  lots: Map<string, number | null | undefined>,
  depth = 0,
): StandingRow[] {
  if (cluster.length <= 1) return cluster
  if (depth > 8) return applyOverallCriteria(cluster) // paranoia guard

  const ids = new Set(cluster.map((r) => String(r.teamId)))
  const h2h = headToHead(ids, matches)

  const sorted = [...cluster].sort((a, b) => {
    const sa = h2h.get(String(a.teamId))!
    const sb = h2h.get(String(b.teamId))!
    if (sb.points !== sa.points) return sb.points - sa.points // 1
    if (sb.goalDifference !== sa.goalDifference) return sb.goalDifference - sa.goalDifference // 2
    if (sb.goalsFor !== sa.goalsFor) return sb.goalsFor - sa.goalsFor // 3
    return 0
  })

  // Partition into runs that head-to-head could not separate.
  const runs: StandingRow[][] = []
  for (const row of sorted) {
    const s = h2h.get(String(row.teamId))!
    const last = runs[runs.length - 1]
    if (last) {
      const ls = h2h.get(String(last[0].teamId))!
      if (
        ls.points === s.points &&
        ls.goalDifference === s.goalDifference &&
        ls.goalsFor === s.goalsFor
      ) {
        last.push(row)
        continue
      }
    }
    runs.push([row])
  }

  // Head-to-head separated nobody: fall through to criteria 4-7.
  if (runs.length === 1) {
    const resolved = applyOverallCriteria(cluster)
    return applyDrawOfLots(resolved, lots)
  }

  // It separated some — restart the criteria for each subset still tied.
  return runs.flatMap((run) => resolveCluster(run, matches, lots, depth + 1))
}

/** Criterion 7 — only an editor recording an actual draw can settle this. */
function applyDrawOfLots(
  rows: StandingRow[],
  lots: Map<string, number | null | undefined>,
): StandingRow[] {
  const anyUnresolved = rows.some((r) => r.requiresDrawOfLots)
  if (!anyUnresolved) return rows

  return [...rows].sort((a, b) => {
    const la = lots.get(String(a.teamId))
    const lb = lots.get(String(b.teamId))
    if (typeof la === 'number' && typeof lb === 'number' && la !== lb) return la - lb
    if (typeof la === 'number' && typeof lb !== 'number') return -1
    if (typeof lb === 'number' && typeof la !== 'number') return 1
    return a.name.localeCompare(b.name) // stable placeholder until lots are drawn
  })
}

/**
 * Build the table for one group. Teams with no matches played appear with
 * zeroes — which is exactly the state on 24 July, before a ball is kicked.
 */
export function computeGroupTable(
  teams: TeamRef[],
  matches: MatchResult[],
  group: GroupId,
): StandingRow[] {
  const rows = new Map<string, StandingRow>()
  const lots = new Map<string, number | null | undefined>()

  for (const team of teams) {
    if (team.group === group) {
      rows.set(String(team.id), emptyRow(team))
      lots.set(String(team.id), team.drawOfLotsRank)
    }
  }

  const groupMatches = matches.filter((m) => isCountable(m) && m.group === group)

  for (const m of groupMatches) {
    const home = rows.get(String(m.homeTeamId))
    const away = rows.get(String(m.awayTeamId))
    if (!home || !away) continue // a team outside this group; ignore

    const hs = m.homeScore as number
    const as = m.awayScore as number

    home.played++
    away.played++
    home.goalsFor += hs
    home.goalsAgainst += as
    away.goalsFor += as
    away.goalsAgainst += hs

    if (hs > as) {
      home.won++
      home.points += WIN_POINTS
      away.lost++
    } else if (hs < as) {
      away.won++
      away.points += WIN_POINTS
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += DRAW_POINTS
      away.points += DRAW_POINTS
    }
  }

  const table = [...rows.values()]
  for (const r of table) r.goalDifference = r.goalsFor - r.goalsAgainst

  // Cluster by points, then resolve each cluster through the hierarchy.
  const byPoints = [...table].sort((a, b) => b.points - a.points)
  const clusters: StandingRow[][] = []
  for (const row of byPoints) {
    const last = clusters[clusters.length - 1]
    if (last && last[0].points === row.points) last.push(row)
    else clusters.push([row])
  }

  const ranked = clusters.flatMap((c) => resolveCluster(c, groupMatches, lots))
  ranked.forEach((r, i) => (r.position = i + 1))
  return ranked
}

export function computeAllGroups(
  teams: TeamRef[],
  matches: MatchResult[],
): Record<GroupId, StandingRow[]> {
  return {
    A: computeGroupTable(teams, matches, 'A'),
    B: computeGroupTable(teams, matches, 'B'),
    C: computeGroupTable(teams, matches, 'C'),
  }
}

/**
 * The fourth semi-finalist.
 *
 * Three groups produce three runners-up, but only ONE reaches the semi-final.
 * They never played each other, so head-to-head cannot apply — they are ranked
 * on overall record: points, goal difference, goals scored, then fair play.
 */
export function computeRunnerUpRace(tables: Record<GroupId, StandingRow[]>): StandingRow[] {
  const runnersUp = (['A', 'B', 'C'] as GroupId[])
    .map((g) => tables[g].find((r) => r.position === 2))
    .filter((r): r is StandingRow => Boolean(r))

  return [...runnersUp].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    if (a.fairPlayPoints !== b.fairPlayPoints) return a.fairPlayPoints - b.fairPlayPoints
    return a.name.localeCompare(b.name)
  })
}

/** Group winners — the other three semi-finalists. */
export function computeGroupWinners(
  tables: Record<GroupId, StandingRow[]>,
): Record<GroupId, StandingRow | undefined> {
  return {
    A: tables.A.find((r) => r.position === 1),
    B: tables.B.find((r) => r.position === 1),
    C: tables.C.find((r) => r.position === 1),
  }
}
