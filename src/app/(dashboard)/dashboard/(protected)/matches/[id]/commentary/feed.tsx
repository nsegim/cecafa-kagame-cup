'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, EyeOff, Trash2, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/dashboard/ui/card'
import { Badge } from '@/components/dashboard/ui/badge'
import { Button } from '@/components/dashboard/ui/button'
import { Skeleton } from '@/components/dashboard/ui/skeleton'
import { DataTablePagination } from '@/components/dashboard/data-table/data-table-pagination'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { richTextToPlainText } from '@/lib/richText'
import { COMMENTARY_TYPES } from '@/lib/dashboard/match-options'
import type { MatchCommentary, Player, Media } from '@/payload-types'
import type { DataTableResult } from '@/components/dashboard/data-table/types'

const PAGE_SIZE = 20
const TYPE_LABELS = Object.fromEntries(COMMENTARY_TYPES.map((t) => [t.value, t.label]))

function playerName(ref: MatchCommentary['player']) {
  return ref && typeof ref === 'object' ? (ref as Player).name : null
}

export function CommentaryFeed({ matchId }: { matchId: number }) {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const queryKey = ['match-commentary', matchId, page]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      dashboardFetch<DataTableResult<MatchCommentary>>(
        `/api/dashboard/matches/${matchId}/commentary?page=${page}&pageSize=${PAGE_SIZE}`,
      ),
    placeholderData: (prev) => prev,
  })

  const toggleHidden = useMutation({
    mutationFn: ({ id, hidden }: { id: number; hidden: boolean }) =>
      dashboardFetch(`/api/dashboard/commentary/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ hidden }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['match-commentary', matchId] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update the entry.'),
  })

  const deleteEntry = useMutation({
    mutationFn: (id: number) => dashboardFetch(`/api/dashboard/commentary/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Entry deleted.')
      queryClient.invalidateQueries({ queryKey: ['match-commentary', matchId] })
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete the entry.'),
  })

  if (isLoading) {
    return (
      <div className="grid gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-40 flex-col items-center justify-center gap-2 text-center">
          <MessageSquare className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No updates posted yet — the first one appears here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3">
      {data.rows.map((entry) => {
        const text = richTextToPlainText(entry.text).trim()
        const images = (entry.images ?? []).filter((img): img is Media => typeof img === 'object')
        const scorer = playerName(entry.player)

        return (
          <Card key={entry.id} className={entry.hidden ? 'opacity-60' : undefined}>
            <CardContent className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {entry.minute != null && <span className="tabular-nums">{entry.minute}&apos;</span>}
                  <Badge variant="outline">{TYPE_LABELS[entry.type] ?? entry.type}</Badge>
                  {entry.team && <span className="capitalize">{entry.team}</span>}
                  {scorer && <span>{scorer}</span>}
                  {entry.hidden && <Badge variant="destructive">Hidden</Badge>}
                </div>
                {text && <p className="mt-1.5 text-sm">{text}</p>}
                {images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {images.map((img) => {
                      const url = img.sizes?.thumbnail?.url ?? img.url
                      return url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={img.id} src={url} alt="" className="size-14 rounded-md object-cover" />
                      ) : null
                    })}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={entry.hidden ? 'Unhide' : 'Hide'}
                  onClick={() => toggleHidden.mutate({ id: entry.id, hidden: !entry.hidden })}
                >
                  {entry.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label="Delete"
                  onClick={() => {
                    if (confirm('Delete this entry?')) deleteEntry.mutate(entry.id)
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      <DataTablePagination
        page={page}
        pageCount={data.pageCount}
        totalDocs={data.totalDocs}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  )
}
