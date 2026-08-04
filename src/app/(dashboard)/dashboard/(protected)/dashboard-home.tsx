'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Radio, CalendarClock, Newspaper, Images, Video, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/dashboard/ui/card'
import { Skeleton } from '@/components/dashboard/ui/skeleton'
import { StatCard } from '@/components/dashboard/stat-card'
import { Chart } from '@/components/dashboard/chart'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { queryKeys } from '@/lib/dashboard/query-keys'
import type { DashboardStats } from '@/lib/dashboard/stats-types'

const COMMENTARY_TYPE_LABELS: Record<string, string> = {
  note: 'Update',
  goal: 'Goal',
  yellow: 'Yellow card',
  red: 'Red card',
  substitution: 'Substitution',
  halftime: 'Half time',
  secondhalf: 'Second half',
  postmatch: 'Post-match',
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function DashboardHome({ canViewSubscribers }: { canViewSubscribers: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('forbidden') === '1') {
      toast.error("You don't have access to that page.")
      router.replace(pathname)
    }
  }, [searchParams, router, pathname])

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.stats(),
    queryFn: () => dashboardFetch<DashboardStats>('/api/dashboard/stats'),
    refetchInterval: 30_000,
  })

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Live matches now"
          icon={Radio}
          value={isLoading ? <Skeleton className="h-8 w-10" /> : (data?.liveMatchesNow ?? 0)}
        />
        <StatCard
          label="Matches today"
          icon={CalendarClock}
          value={isLoading ? <Skeleton className="h-8 w-10" /> : (data?.matchesToday ?? 0)}
        />
        <StatCard
          label="Published articles"
          icon={Newspaper}
          value={isLoading ? <Skeleton className="h-8 w-10" /> : (data?.publishedArticles ?? 0)}
        />
        <StatCard
          label="Gallery uploads (7d)"
          icon={Images}
          value={isLoading ? <Skeleton className="h-8 w-10" /> : (data?.galleryUploads7d.count ?? 0)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Live Commentary</CardTitle>
            <CardDescription>Newest Live Expressions entries across all fixtures.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : data && data.recentCommentary.length > 0 ? (
              <ul className="grid gap-3">
                {data.recentCommentary.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {COMMENTARY_TYPE_LABELS[entry.type] ?? entry.type} — {entry.matchLabel}
                      </p>
                      {entry.summary && (
                        <p className="truncate text-xs text-muted-foreground">{entry.summary}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No commentary posted yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Videos (7d)</CardTitle>
            <CardDescription>{data?.videoUploads7d.count ?? 0} added this week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : data && data.videoUploads7d.recent.length > 0 ? (
              <ul className="grid gap-2">
                {data.videoUploads7d.recent.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-sm">
                    <Video className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{v.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing added this week.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Match Photos</CardTitle>
            <CardDescription>Latest uploads across all fixtures.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full" />
                ))}
              </div>
            ) : data && data.recentPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {data.recentPhotos.map((p) =>
                  p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.url}
                      alt={p.matchLabel}
                      title={`${p.matchLabel} — ${timeAgo(p.createdAt)}`}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
            )}
          </CardContent>
        </Card>

        {canViewSubscribers && data?.subscriberGrowth ? (
          <Card>
            <CardHeader>
              <CardTitle>Subscriber growth</CardTitle>
              <CardDescription>
                <Users className="mr-1 inline size-3.5" />
                {data.subscriberGrowth.thisWeek} this week ({data.subscriberGrowth.thisWeek - data.subscriberGrowth.lastWeek >= 0 ? '+' : ''}
                {data.subscriberGrowth.thisWeek - data.subscriberGrowth.lastWeek} vs last week)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Chart data={data.subscriberGrowth.series} xKey="date" yKey="count" />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
