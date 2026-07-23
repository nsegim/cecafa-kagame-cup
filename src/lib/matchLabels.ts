import type { Match, Team } from '@/payload-types'

export const VENUE_LABEL: Record<string, string> = {
  amahoro: 'Amahoro Stadium',
  pele: 'Kigali Pele Stadium',
}

export function matchSide(rel: Match['homeTeam'], placeholder?: string | null) {
  const team = rel && typeof rel !== 'number' ? (rel as Team) : null
  return { team, label: team?.name ?? placeholder ?? 'TBC' }
}
