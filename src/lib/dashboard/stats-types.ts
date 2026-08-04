export interface DashboardStats {
  liveMatchesNow: number
  matchesToday: number
  publishedArticles: number
  galleryUploads7d: { count: number; recent: { id: number; title: string; url: string | null }[] }
  videoUploads7d: { count: number; recent: { id: number; title: string; url: string | null }[] }
  subscriberGrowth: { thisWeek: number; lastWeek: number; series: { date: string; count: number }[] } | null
  recentCommentary: {
    id: number
    matchId: number | null
    matchLabel: string
    type: string
    summary: string | null
    createdAt: string
  }[]
  recentPhotos: {
    id: number
    matchId: number | null
    matchLabel: string
    url: string | null
    createdAt: string
  }[]
}
