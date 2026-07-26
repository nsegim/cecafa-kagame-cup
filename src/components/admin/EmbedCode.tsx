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
        ? // The iframe reports its content height out via postMessage; the paired
          // script matches the message to this iframe (by contentWindow) and sets
          // its height, so the feed shows in full with no inner scrollbar and no
          // wasted space. The `height="1720"` is only a fallback for the instant
          // before the script runs (or if a host strips it) — the frame hugs its
          // real height as soon as the listener fires.
          `<iframe src="${embedUrl}" width="100%" height="1720" style="border:0;max-width:960px;width:100%" loading="lazy" title="Live Expressions" data-cecafa-embed></iframe>
<script>(function(){if(window.__cecafaEmbedResize)return;window.__cecafaEmbedResize=1;window.addEventListener("message",function(e){var d=e.data;if(!d||d.type!=="cecafa-embed-height"||!d.height)return;var f=document.querySelectorAll("iframe[data-cecafa-embed]");for(var i=0;i<f.length;i++){if(f[i].contentWindow===e.source){f[i].style.height=d.height+"px";}}});})();</script>`
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
            Copy this and paste it into the newsletter. It shows only the Live Expressions feed — no
            site header or footer — sizes itself to fit the content (no scrollbar), and keeps
            updating itself live.
          </p>
          <textarea
            readOnly
            value={snippet}
            rows={5}
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
          <div
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}
          >
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
