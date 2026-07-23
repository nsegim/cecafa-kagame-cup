/**
 * Shared helpers for rendering team labels and media URLs from live tournament data.
 */
import type { Match, Media, Team } from '@/payload-types'

export function shortTeamLabel(rel: Match['homeTeam'], fallback?: string | null): string {
  if (rel && typeof rel !== 'number') return (rel as Team).shortName || (rel as Team).name
  return fallback ?? 'TBC'
}

export function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return img.sizes?.hero?.url || img.url || null
}
