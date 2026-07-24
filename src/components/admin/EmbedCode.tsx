'use client'

import { useMemo, useState } from 'react'
import { Button, toast, useDocumentInfo } from '@payloadcms/ui'

/**
 * Admin field that hands an editor the ready-to-paste <iframe> for THIS match's
 * Live Expressions feed (the `/embed/matches/{id}` page — content only, no site
 * header/footer). They copy it once and drop it into a newsletter; the embed
 * keeps updating itself live while the match is on, so nothing has to be
 * re-copied as goals/cards/photos are logged.
 *
 * Registered as a `ui` field on the Matches collection, so it renders inline in
 * the edit view. There's no id until the match is first saved, so before that
 * it shows a short hint instead of a broken snippet.
 */
export function EmbedCode() {
  const { id } = useDocumentInfo()
  const [copied, setCopied] = useState(false)

  // Origin is only known in the browser; this is a client component so that's
  // fine. Falls back to a relative URL during the (brief) server render.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const embedUrl = id ? `${origin}/embed/matches/${id}` : ''
  const snippet = useMemo(
    () =>
      embedUrl
        ? `<iframe src="${embedUrl}" width="100%" height="720" style="border:0;max-width:960px;width:100%" loading="lazy" title="Live Expressions"></iframe>`
        : '',
    [embedUrl],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      toast.success('Embed code copied — paste it into your newsletter.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy automatically — select the text and copy it manually.')
    }
  }

  return (
    <div className="field-type" style={{ marginBottom: '1.5rem' }}>
      <label className="field-label">Live Expressions embed code</label>
      {!id ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--theme-elevation-500)', margin: 0 }}>
          Save the match first — the embed code appears here once it has an ID.
        </p>
      ) : (
        <>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--theme-elevation-500)',
              margin: '0 0 0.5rem',
            }}
          >
            Copy this and paste it into the newsletter. It shows only the Live Expressions feed —
            no site header or footer — and keeps updating itself live.
          </p>
          <textarea
            readOnly
            value={snippet}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.78rem',
              lineHeight: 1.5,
              padding: '0.6rem',
              resize: 'vertical',
              border: '1px solid var(--theme-elevation-150)',
              borderRadius: 'var(--style-radius-s, 4px)',
              background: 'var(--theme-elevation-50)',
              color: 'var(--theme-elevation-800)',
            }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
            <Button
              buttonStyle="secondary"
              icon={copied ? ['checkmark'] : undefined}
              onClick={copy}
            >
              {copied ? 'Copied' : 'Copy embed code'}
            </Button>
            <a
              href={embedUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.8rem', color: 'var(--theme-elevation-600)' }}
            >
              Preview embed ↗
            </a>
          </div>
        </>
      )}
    </div>
  )
}
