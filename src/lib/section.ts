/**
 * Data layer for the embeddable "Section" widget (`/embed/section`) — a
 * self-contained news + fixtures panel other sites drop into an <iframe>.
 * Aggregates the same real data the homepage uses (latest news, a featured
 * highlight, upcoming/live fixtures) into one small, JSON-serialisable payload
 * so it can be both server-rendered and polled for real-time refreshes.
 */
import { getPayloadClient } from '@/lib/payload'
import type { Match, Team } from '@/payload-types'
import { fetchLatestNews } from '@/lib/news'
import { getVideos } from '@/lib/videos'
import { effectiveMatchStatus } from '@/lib/matchStatus'
import { matchDayLabel, matchTime } from '@/lib/datetime'

export interface SectionMatch {
  id: number
  homeShort: string
  awayShort: string
  homeCrest: string | null
  awayCrest: string | null
  status: 'scheduled' | 'live' | 'final'
  homeScore: number
  awayScore: number
  time: string
}

export interface SectionGroup {
  dateLabel: string
  matches: SectionMatch[]
}

export interface SectionNews {
  id: string | number
  title: string
  excerpt: string
  imageUrl: string | null
  category: string | null
  readingMinutes: number
  /** Where a click goes — the article (kept absolute/external as stored). */
  url: string
}

export interface SectionFeature {
  title: string
  thumbnailUrl: string | null
  /** Destination on our own system, opened in a new tab from the iframe. */
  href: string
  isVideo: boolean
}

export interface SectionData {
  feature: SectionFeature | null
  news: SectionNews[]
  groups: SectionGroup[]
}

function relTeam(rel: Match['homeTeam']): Team | null {
  return rel && typeof rel !== 'number' ? (rel as Team) : null
}

function sideShort(rel: Match['homeTeam'], placeholder?: string | null): string {
  const t = relTeam(rel)
  return t?.shortName || t?.name || placeholder || 'TBC'
}

function crestUrl(rel: Match['homeTeam']): string | null {
  const crest = relTeam(rel)?.crest
  if (!crest || typeof crest === 'number') return null
  return crest.sizes?.crest?.url || crest.url || null
}

function toSectionMatch(m: Match): SectionMatch {
  return {
    id: m.id,
    homeShort: sideShort(m.homeTeam, m.homeTeamPlaceholder),
    awayShort: sideShort(m.awayTeam, m.awayTeamPlaceholder),
    homeCrest: crestUrl(m.homeTeam),
    awayCrest: crestUrl(m.awayTeam),
    status: effectiveMatchStatus(m),
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    time: matchTime(m.kickoff),
  }
}

/**
 * Live fixtures first (they carry the running score), then the next
 * kickoffs, then the latest results — so the panel always shows something
 * current and is never empty. Mirrors the homepage's selectHomeMatches.
 */
function buildGroups(matches: Match[], take = 5): SectionGroup[] {
  const now = Date.now()
  const byAsc = (a: Match, b: Match) => +new Date(a.kickoff) - +new Date(b.kickoff)
  const byDesc = (a: Match, b: Match) => +new Date(b.kickoff) - +new Date(a.kickoff)
  const live = matches.filter((m) => effectiveMatchStatus(m) === 'live').sort(byAsc)
  const upcoming = matches
    .filter((m) => effectiveMatchStatus(m) === 'scheduled' && +new Date(m.kickoff) >= now)
    .sort(byAsc)
  const recentFinal = matches.filter((m) => effectiveMatchStatus(m) === 'final').sort(byDesc)
  const ordered = [...live, ...upcoming, ...recentFinal].slice(0, take)

  const groups: SectionGroup[] = []
  for (const m of ordered) {
    const dateLabel = matchDayLabel(m.kickoff)
    const last = groups[groups.length - 1]
    if (last && last.dateLabel === dateLabel) last.matches.push(toSectionMatch(m))
    else groups.push({ dateLabel, matches: [toSectionMatch(m)] })
  }
  return groups
}

export async function getSectionData(): Promise<SectionData> {
  const [news, videos, matchesRes] = await Promise.all([
    fetchLatestNews({ limit: 2 }),
    getVideos(),
    getPayloadClient()
      .then((p) => p.find({ collection: 'matches', sort: 'kickoff', limit: 30, depth: 2 }))
      .catch(() => null),
  ])

  // Featured tile: prefer a real video (shows a play button), otherwise fall
  // back to the top news story's image so the tile is never empty.
  let feature: SectionFeature | null = null
  const video = videos[0]
  if (video) {
    const thumb = video.thumbnail
    feature = {
      title: video.title,
      thumbnailUrl:
        thumb && typeof thumb !== 'number' ? (thumb.sizes?.card?.url ?? thumb.url ?? null) : null,
      href: '/', // opens our homepage (where highlights live) in a new tab
      isVideo: true,
    }
  } else if (news[0]) {
    feature = {
      title: news[0].title,
      thumbnailUrl: news[0].imageUrl,
      href: news[0].url,
      isVideo: false,
    }
  }

  const groups = matchesRes ? buildGroups(matchesRes.docs as Match[]) : []

  return {
    feature,
    news: news.map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      imageUrl: a.imageUrl,
      category: a.category,
      readingMinutes: a.readingMinutes,
      url: a.url,
    })),
    groups,
  }
}
