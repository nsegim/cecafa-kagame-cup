import { NextResponse } from 'next/server'
import { getDashboardUser } from '@/lib/dashboard/auth'
import { can } from '@/lib/dashboard/permissions'
import { getPayloadClient } from '@/lib/payload'
import { matchIdOf, matchLabelsFor } from '@/lib/dashboard/match-labels'
import type { GalleryImage, Video, MatchCommentary, MatchPhoto } from '@/payload-types'

const DAY_MS = 24 * 60 * 60 * 1000
const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000 // Africa/Kigali is UTC+2, no DST

function mediaThumb(media: unknown): string | null {
  if (!media || typeof media !== 'object') return null
  const m = media as { url?: string | null; sizes?: { thumbnail?: { url?: string | null } } }
  return m.sizes?.thumbnail?.url ?? m.url ?? null
}

/** Today's [start, end) as UTC instants for the Kigali calendar day — matches are scheduled in local time. */
function kigaliToday() {
  const kigaliNow = new Date(Date.now() + KIGALI_OFFSET_MS)
  const y = kigaliNow.getUTCFullYear()
  const m = kigaliNow.getUTCMonth()
  const d = kigaliNow.getUTCDate()
  return {
    start: new Date(Date.UTC(y, m, d) - KIGALI_OFFSET_MS),
    end: new Date(Date.UTC(y, m, d + 1) - KIGALI_OFFSET_MS),
  }
}

function bucketByDay(dates: Date[], days: number, from: Date) {
  const buckets = new Map<string, number>()
  for (let i = 0; i < days; i++) {
    buckets.set(new Date(from.getTime() + i * DAY_MS).toISOString().slice(0, 10), 0)
  }
  for (const date of dates) {
    const key = date.toISOString().slice(0, 10)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return Array.from(buckets, ([date, count]) => ({ date, count }))
}

export async function GET() {
  const user = await getDashboardUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await getPayloadClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * DAY_MS)
  const { start: todayStart, end: todayEnd } = kigaliToday()
  const canViewSubscribers = can(user, 'subscribers:view')

  const [
    liveMatchesNow,
    matchesToday,
    publishedArticles,
    galleryCount,
    galleryRecent,
    videoCount,
    videoRecent,
    commentaryRecent,
    photosRecent,
    subscribersRecent,
  ] = await Promise.all([
    payload.count({ collection: 'matches', where: { status: { equals: 'live' } } }),
    payload.count({
      collection: 'matches',
      where: {
        kickoff: { greater_than_equal: todayStart.toISOString(), less_than: todayEnd.toISOString() },
      },
    }),
    payload.count({ collection: 'articles', where: { visibility: { equals: 'visible' } } }),
    payload.count({
      collection: 'gallery-images',
      where: { createdAt: { greater_than_equal: sevenDaysAgo.toISOString() } },
    }),
    payload.find({ collection: 'gallery-images', sort: '-createdAt', limit: 5, depth: 1 }),
    payload.count({
      collection: 'videos',
      where: { createdAt: { greater_than_equal: sevenDaysAgo.toISOString() } },
    }),
    payload.find({ collection: 'videos', sort: '-createdAt', limit: 5, depth: 1 }),
    payload.find({ collection: 'match-commentary', sort: '-createdAt', limit: 6, depth: 0 }),
    payload.find({ collection: 'match-photos', sort: '-createdAt', limit: 6, depth: 1 }),
    canViewSubscribers
      ? payload.find({
          collection: 'subscribers',
          where: { createdAt: { greater_than_equal: fourteenDaysAgo.toISOString() } },
          limit: 0,
          depth: 0,
          sort: '-createdAt',
        })
      : null,
  ])

  const activityMatchIds = [
    ...commentaryRecent.docs.map((d) => matchIdOf((d as MatchCommentary).match)),
    ...photosRecent.docs.map((d) => matchIdOf((d as MatchPhoto).match)),
  ].filter((id): id is number => id != null)
  const matchLabels = await matchLabelsFor(payload, Array.from(new Set(activityMatchIds)))

  let subscriberGrowth: {
    thisWeek: number
    lastWeek: number
    series: { date: string; count: number }[]
  } | null = null

  if (subscribersRecent) {
    const createdDates = subscribersRecent.docs.map((d) => new Date(d.createdAt))
    const thisWeek = createdDates.filter((d) => d >= sevenDaysAgo).length
    const lastWeek = createdDates.filter((d) => d >= fourteenDaysAgo && d < sevenDaysAgo).length
    subscriberGrowth = {
      thisWeek,
      lastWeek,
      series: bucketByDay(
        createdDates.filter((d) => d >= sevenDaysAgo),
        7,
        sevenDaysAgo,
      ),
    }
  }

  return NextResponse.json({
    liveMatchesNow: liveMatchesNow.totalDocs,
    matchesToday: matchesToday.totalDocs,
    publishedArticles: publishedArticles.totalDocs,
    galleryUploads7d: {
      count: galleryCount.totalDocs,
      recent: galleryRecent.docs.map((d) => {
        const doc = d as GalleryImage
        return { id: doc.id, title: doc.title, url: mediaThumb(doc.image) }
      }),
    },
    videoUploads7d: {
      count: videoCount.totalDocs,
      recent: videoRecent.docs.map((d) => {
        const doc = d as Video
        return { id: doc.id, title: doc.title, url: mediaThumb(doc.thumbnail) }
      }),
    },
    subscriberGrowth,
    recentCommentary: commentaryRecent.docs.map((d) => {
      const doc = d as MatchCommentary
      const matchId = matchIdOf(doc.match)
      return {
        id: doc.id,
        matchId,
        matchLabel: matchId ? (matchLabels.get(matchId) ?? `Match ${matchId}`) : 'Unknown match',
        type: doc.type,
        summary: doc.summary,
        createdAt: doc.createdAt,
      }
    }),
    recentPhotos: photosRecent.docs.map((d) => {
      const doc = d as MatchPhoto
      const matchId = matchIdOf(doc.match)
      return {
        id: doc.id,
        matchId,
        matchLabel: matchId ? (matchLabels.get(matchId) ?? `Match ${matchId}`) : 'Unknown match',
        url: mediaThumb(doc.image),
        createdAt: doc.createdAt,
      }
    }),
  })
}
