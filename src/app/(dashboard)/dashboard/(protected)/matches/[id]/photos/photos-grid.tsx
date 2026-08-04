'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, ImageOff } from 'lucide-react'
import { Skeleton } from '@/components/dashboard/ui/skeleton'
import { DataTablePagination } from '@/components/dashboard/data-table/data-table-pagination'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import { BulkPhotoUpload } from '../../bulk-photo-upload'
import type { MatchPhoto, Media } from '@/payload-types'
import type { DataTableResult } from '@/components/dashboard/data-table/types'

const PAGE_SIZE = 24

function thumbUrl(image: MatchPhoto['image']): string | null {
  if (!image || typeof image !== 'object') return null
  const media = image as Media
  return media.sizes?.thumbnail?.url ?? media.url ?? null
}

export function PhotosGrid({ matchId, canManage }: { matchId: number; canManage: boolean }) {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const queryKey = ['match-photos', matchId, page]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      dashboardFetch<DataTableResult<MatchPhoto>>(
        `/api/dashboard/matches/${matchId}/photos?page=${page}&pageSize=${PAGE_SIZE}`,
      ),
    placeholderData: (prev) => prev,
  })

  async function remove(photoId: number) {
    if (!confirm('Remove this photo from the match?')) return
    try {
      await dashboardFetch(`/api/dashboard/photos/${photoId}`, { method: 'DELETE' })
      toast.success('Photo removed.')
      queryClient.invalidateQueries({ queryKey: ['match-photos', matchId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the photo.')
    }
  }

  return (
    <div className="grid gap-4">
      {canManage && (
        <div className="rounded-xl border border-border bg-card p-4">
          <BulkPhotoUpload matchId={matchId} />
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : data && data.rows.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {data.rows.map((photo) => {
              const url = thumbUrl(photo.image)
              return (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="size-5" />
                    </div>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => remove(photo.id)}
                      className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-md bg-background/80 text-destructive opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
            <ImageOff className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">No photos uploaded yet</p>
            {canManage && (
              <p className="text-sm text-muted-foreground">Use the uploader above to add some.</p>
            )}
          </div>
        )}

        {data && data.totalDocs > 0 && (
          <DataTablePagination
            page={page}
            pageCount={data.pageCount}
            totalDocs={data.totalDocs}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        )}
      </div>

      {!canManage && (
        <p className="text-xs text-muted-foreground">
          Read-only — your role can view photos but not upload or remove them.
        </p>
      )}
    </div>
  )
}
