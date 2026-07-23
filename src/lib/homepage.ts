/**
 * Shared helpers for building a page's hero banner from live tournament data.
 */
import type { Match, Media, Team } from '@/payload-types'
import { matchTime } from '@/lib/datetime'
import type { PageHeroSlide } from '@/components/PageHero'

export function teamLabel(rel: Match['homeTeam'], fallback?: string | null): string {
  if (rel && typeof rel !== 'number') return (rel as Team).name
  return fallback ?? 'TBC'
}

export function shortTeamLabel(rel: Match['homeTeam'], fallback?: string | null): string {
  if (rel && typeof rel !== 'number') return (rel as Team).shortName || (rel as Team).name
  return fallback ?? 'TBC'
}

export function mediaUrl(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return img.sizes?.hero?.url || img.url || null
}

/**
 * A generated hero banner from the next fixture, so any page's banner always
 * has real content without needing hand-written editorial copy.
 */
export function getPageHeroSlide(matches: Match[]): PageHeroSlide {
  const next = matches
    .filter((m) => m.stage === 'group' && m.status === 'scheduled')
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))[0]

  if (!next) {
    return {
      title: 'Twelve clubs. Three groups. Fifteen days.',
      blurb: 'The Kagame Cup returns to Rwanda from 24 July to 7 August 2026.',
    }
  }

  const h = teamLabel(next.homeTeam, next.homeTeamPlaceholder)
  const a = teamLabel(next.awayTeam, next.awayTeamPlaceholder)
  return {
    title: `${h} open against ${a}`,
    blurb: `Kick-off ${matchTime(next.kickoff)} at ${
      next.venue === 'amahoro' ? 'Amahoro Stadium' : 'Kigali Pele Stadium'
    }.`,
  }
}
