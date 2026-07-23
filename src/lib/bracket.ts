/**
 * Semi-final pairing.
 *
 * The published bracket reads:
 *   SF1 (M19) — Winner Gr. B  vs  Winner Gr. C
 *   SF2 (M20) — Winner Gr. A  vs  Best Runner-Up
 *
 * But CECAFA forbids an immediate group-stage rematch in the semi-finals, and
 * that default produces one whenever the best runner-up comes out of Group A:
 * Winner A would face the club that finished second in their own group.
 *
 * So when the best runner-up is from Group A the bracket pivots to:
 *   SF1 — Winner Gr. A  vs  Winner Gr. C
 *   SF2 — Winner Gr. B  vs  Best Runner-Up (Group A)
 *
 * A runner-up from Group B or C creates no clash, and the default stands.
 *
 * NOTE: the pivot keeps SF1 as the winner-vs-winner tie and SF2 as the
 * winner-vs-runner-up tie. Worth confirming against the written regulations
 * that the match NUMBERS map this way round, since it decides which side of
 * the bracket each club enters.
 */
import type { GroupId, StandingRow } from './standings'
import { computeGroupWinners, computeRunnerUpRace } from './standings'

export interface SemiFinalSlot {
  matchNumber: number
  home: StandingRow | null
  away: StandingRow | null
  homeLabel: string
  awayLabel: string
}

export interface Bracket {
  semiFinals: [SemiFinalSlot, SemiFinalSlot]
  bestRunnerUp: StandingRow | null
  /** True when the Group A pivot was applied. */
  reallocated: boolean
  /** False until all three groups have finished and second place is settled. */
  decided: boolean
}

export function computeBracket(
  tables: Record<GroupId, StandingRow[]>,
  { groupStageComplete }: { groupStageComplete: boolean },
): Bracket {
  const winners = computeGroupWinners(tables)
  const race = computeRunnerUpRace(tables)
  const bestRunnerUp = groupStageComplete && race.length > 0 ? race[0] : null

  const wA = groupStageComplete ? (winners.A ?? null) : null
  const wB = groupStageComplete ? (winners.B ?? null) : null
  const wC = groupStageComplete ? (winners.C ?? null) : null

  const reallocated = bestRunnerUp?.group === 'A'

  if (reallocated) {
    return {
      semiFinals: [
        {
          matchNumber: 19,
          home: wA,
          away: wC,
          homeLabel: 'Winner Gr. A',
          awayLabel: 'Winner Gr. C',
        },
        {
          matchNumber: 20,
          home: wB,
          away: bestRunnerUp,
          homeLabel: 'Winner Gr. B',
          awayLabel: 'Best Runner-Up',
        },
      ],
      bestRunnerUp,
      reallocated: true,
      decided: groupStageComplete,
    }
  }

  return {
    semiFinals: [
      {
        matchNumber: 19,
        home: wB,
        away: wC,
        homeLabel: 'Winner Gr. B',
        awayLabel: 'Winner Gr. C',
      },
      {
        matchNumber: 20,
        home: wA,
        away: bestRunnerUp,
        homeLabel: 'Winner Gr. A',
        awayLabel: 'Best Runner-Up',
      },
    ],
    bestRunnerUp,
    reallocated: false,
    decided: groupStageComplete,
  }
}

/** Guard: no semi-final may pair two clubs from the same group. */
export function hasSameGroupClash(bracket: Bracket): boolean {
  return bracket.semiFinals.some(
    (sf) => sf.home && sf.away && sf.home.group === sf.away.group,
  )
}
