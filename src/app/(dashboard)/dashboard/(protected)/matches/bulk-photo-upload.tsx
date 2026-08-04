'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'

/**
 * Dashboard-native port of src/components/admin/BulkPhotoUpload.tsx. Same
 * "select many, upload once" UX, but posts every file in one multipart
 * request to /api/dashboard/matches/[id]/photos, which uploads to Media and
 * attaches each as its own match-photos row server-side — the original made
 * two client round trips per file (POST /api/media, then POST
 * /api/match-photos); this collapses both into one request per batch.
 */
export function BulkPhotoUpload({ matchId }: { matchId: number }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const queryClient = useQueryClient()

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (files.length === 0) {
      toast.error('Please choose image files only.')
      return
    }

    const formData = new FormData()
    for (const file of files) formData.append('files', file)

    setProgress(0)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/dashboard/matches/${matchId}/photos`, true)
    xhr.withCredentials = true
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setProgress(null)
      if (inputRef.current) inputRef.current.value = ''
      try {
        const res = JSON.parse(xhr.responseText) as { succeeded: number; failed: number }
        if (res.succeeded > 0 && res.failed === 0) {
          toast.success(`${res.succeeded} photo${res.succeeded > 1 ? 's' : ''} added.`)
        } else if (res.succeeded > 0) {
          toast.warning(`${res.succeeded} added, ${res.failed} failed.`)
        } else {
          toast.error('All uploads failed — nothing was added.')
        }
        queryClient.invalidateQueries({ queryKey: ['matches', matchId] })
      } catch {
        toast.error('Upload finished but the response could not be read.')
      }
    }
    xhr.onerror = () => {
      setProgress(null)
      toast.error('Network error during upload.')
    }
    xhr.send(formData)
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={progress !== null}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-4" />
        {progress !== null ? `Uploading… ${progress}%` : 'Bulk upload photos'}
      </Button>
      <span className="text-xs text-muted-foreground">Select multiple images to upload together.</span>
    </div>
  )
}
