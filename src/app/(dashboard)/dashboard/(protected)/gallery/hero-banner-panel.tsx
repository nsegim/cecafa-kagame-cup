'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ImageOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/dashboard/ui/card'
import { Button } from '@/components/dashboard/ui/button'
import { Skeleton } from '@/components/dashboard/ui/skeleton'
import { dashboardFetch } from '@/lib/dashboard/api-client'
import type { Gallery } from '@/payload-types'

function heroUrl(image: Gallery['heroImage']) {
  if (!image || typeof image !== 'object') return null
  return image.sizes?.hero?.url ?? image.url ?? null
}

export function HeroBannerPanel({ canManage }: { canManage: boolean }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['gallery-global'],
    queryFn: () => dashboardFetch<Gallery>('/api/dashboard/gallery-global'),
  })

  const saveMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.set('heroImage', file)
      const res = await fetch('/api/dashboard/gallery-global', { method: 'PATCH', credentials: 'include', body: form })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Could not update the banner.')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Gallery banner updated.')
      queryClient.invalidateQueries({ queryKey: ['gallery-global'] })
      setPreview(null)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update the banner.'),
  })

  const currentUrl = preview ?? (data ? heroUrl(data.heroImage) : null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gallery banner</CardTitle>
        <CardDescription>The image across the top of the public /gallery page.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        {isLoading ? (
          <Skeleton className="h-20 w-36 rounded-lg" />
        ) : (
          <span className="flex h-20 w-36 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {currentUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageOff className="size-5 text-muted-foreground" />
            )}
          </span>
        )}
        {canManage && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setPreview(URL.createObjectURL(file))
                saveMutation.mutate(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              {saveMutation.isPending ? 'Uploading…' : 'Change banner'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
