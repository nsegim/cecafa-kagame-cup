'use client'

import { useCallback, useRef, useState } from 'react'
import { Button, toast, useForm } from '@payloadcms/ui'

/**
 * Admin-only bulk uploader for a match's "Match Photos" (the Live Expressions
 * feed). Registered as a `ui` field directly above the existing `photos` array
 * — it doesn't replace the per-row upload, it adds a "select many, upload once"
 * path on top of it.
 *
 * Files upload to the Media collection concurrently. One failure never cancels
 * the others (Promise.allSettled), progress is shown per file, and every
 * successful upload is appended to the `photos` array in the current edit
 * session via `addFieldRow`, so they save atomically with the rest of the form.
 */

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

interface UploadItem {
  key: string
  name: string
  progress: number
  status: UploadStatus
  error?: string
}

/** POST one file to Payload's Media REST endpoint, reporting upload progress. */
function uploadToMedia(file: File, onProgress: (pct: number) => void): Promise<number> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    // `alt` is required on Media — derive a sensible default from the filename.
    const alt = file.name.replace(/\.[^.]+$/, '').trim() || 'Match photo'
    form.append('_payload', JSON.stringify({ alt }))

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/media', true)
    xhr.withCredentials = true // send the admin auth cookie

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText)
          const id: unknown = res?.doc?.id ?? res?.id
          if (typeof id === 'number' || typeof id === 'string') resolve(Number(id))
          else reject(new Error('Upload succeeded but no media id was returned'))
        } catch {
          reject(new Error('Could not parse the server response'))
        }
      } else {
        let message = `Upload failed (HTTP ${xhr.status})`
        try {
          const res = JSON.parse(xhr.responseText)
          message = res?.errors?.[0]?.message || message
        } catch {
          /* keep the generic message */
        }
        reject(new Error(message))
      }
    }
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(form)
  })
}

export function BulkPhotoUpload() {
  const { addFieldRow } = useForm()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<UploadItem[]>([])
  const [busy, setBusy] = useState(false)

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
      if (files.length === 0) {
        toast.error('Please choose image files only.')
        return
      }

      const startItems: UploadItem[] = files.map((f, i) => ({
        key: `${Date.now()}-${i}-${f.name}`,
        name: f.name,
        progress: 0,
        status: 'pending',
      }))
      setItems(startItems)
      setBusy(true)

      const patch = (key: string, next: Partial<UploadItem>) =>
        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...next } : it)))

      // Fire every upload at once; each settles independently.
      const results = await Promise.allSettled(
        files.map((file, i) => {
          const { key } = startItems[i]
          patch(key, { status: 'uploading' })
          return uploadToMedia(file, (pct) => patch(key, { progress: pct }))
            .then((mediaId) => {
              patch(key, { status: 'success', progress: 100 })
              return mediaId
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : 'Upload failed'
              patch(key, { status: 'error', error: message })
              throw err
            })
        }),
      )

      // Append each successful upload as a new row on the `photos` array.
      let added = 0
      for (const result of results) {
        if (result.status === 'fulfilled') {
          addFieldRow({
            path: 'photos',
            schemaPath: 'photos',
            subFieldState: {
              image: { value: result.value, initialValue: result.value, valid: true },
            },
          })
          added += 1
        }
      }

      const failed = results.length - added
      if (added > 0 && failed === 0) {
        toast.success(`${added} photo${added > 1 ? 's' : ''} added — Save the match to keep them.`)
      } else if (added > 0) {
        toast.warning(`${added} added, ${failed} failed. Save to keep the successful ones.`)
      } else {
        toast.error('All uploads failed — nothing was added.')
      }

      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    },
    [addFieldRow],
  )

  return (
    <div className="field-type" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button
          buttonStyle="secondary"
          icon={['plus']}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? 'Uploading…' : 'Bulk upload photos'}
        </Button>
        <span style={{ fontSize: '0.8rem', color: 'var(--theme-elevation-500)' }}>
          Select multiple images — they upload together and are added to Match Photos below.
        </span>
      </div>

      {items.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: '0.75rem 0 0',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {items.map((it) => (
            <li key={it.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span
                style={{
                  flex: '0 0 40%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.8rem',
                }}
                title={it.name}
              >
                {it.name}
              </span>
              <span
                aria-hidden
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--theme-elevation-100)',
                  overflow: 'hidden',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${it.progress}%`,
                    transition: 'width 120ms linear',
                    background:
                      it.status === 'error'
                        ? 'var(--theme-error-500)'
                        : it.status === 'success'
                          ? 'var(--theme-success-500)'
                          : 'var(--theme-success-400, #3b82f6)',
                  }}
                />
              </span>
              <span
                style={{
                  flex: '0 0 5.5rem',
                  textAlign: 'right',
                  fontSize: '0.75rem',
                  color:
                    it.status === 'error' ? 'var(--theme-error-500)' : 'var(--theme-elevation-600)',
                }}
                title={it.error}
              >
                {it.status === 'error'
                  ? 'Failed'
                  : it.status === 'success'
                    ? 'Done'
                    : `${it.progress}%`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
