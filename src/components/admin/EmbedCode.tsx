'use client'

import { useMemo, useState } from 'react'
import { Button, toast, useDocumentInfo } from '@payloadcms/ui'

/**
 * Admin field that hands an editor the ready-to-paste embed for THIS match's
 * Live Expressions feed (content only — no site header/footer). They copy it
 * once and drop it into a page; the embed keeps updating itself live while the
 * match is on, so nothing has to be re-copied as goals/cards/photos are logged.
 *
 * Two methods, toggled below:
 *  - Web component (`<cecafa-match>`) — the default. Renders into the host
 *    page's own DOM (isolated via Shadow DOM), so it flows at its natural height
 *    with no iframe and no scrollbar. Best for websites.
 *  - iframe — the classic framed page. Self-sizing via a postMessage handshake.
 *    Use it where a script tag is awkward.
 *
 * Registered as a `ui` field on the Matches collection, so it renders inline in
 * the edit view. There's no id until the match is first saved, so before that
 * it shows a short hint instead of a broken snippet.
 */
type Mode = 'component' | 'iframe'

export function EmbedCode() {
  const { id } = useDocumentInfo()
  const [mode, setMode] = useState<Mode>('iframe')
  const [copied, setCopied] = useState(false)

  // Origin is only known in the browser; this is a client component so that's
  // fine. Falls back to a relative URL during the (brief) server render.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const embedUrl = id ? `${origin}/embed/matches/${id}` : ''

  const snippets = useMemo(() => {
    if (!id) return { component: '', iframe: '' }
    return {
      // Two lines, no iframe: the custom element renders the feed into the host
      // page (style-isolated by its own Shadow DOM) and polls the CORS JSON API.
      // The script derives the CECAFA origin from its own src, so nothing here
      // needs configuring.
      component: `<cecafa-match match-id="${id}"></cecafa-match>
<script src="${origin}/embed/cecafa-match.js" async></script>`,
      // The iframe reports its content height out via postMessage; the paired
      // script matches the message to this iframe (by contentWindow) and sets
      // its height. `height="1720"` is only a fallback for the instant before
      // the script runs (or if a host strips it).
      iframe: `<iframe src="${embedUrl}" width="100%" height="1720" style="border:0;max-width:960px;width:100%" loading="lazy" title="Live Expressions" data-cecafa-embed></iframe>
<script>(function(){if(window.__cecafaEmbedResize)return;window.__cecafaEmbedResize=1;window.addEventListener("message",function(e){var d=e.data;if(!d||d.type!=="cecafa-embed-height"||!d.height)return;var f=document.querySelectorAll("iframe[data-cecafa-embed]");for(var i=0;i<f.length;i++){if(f[i].contentWindow===e.source){f[i].style.height=d.height+"px";}}});})();</script>`,
    }
  }, [id, origin, embedUrl])

  const snippet = snippets[mode]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      toast.success('Embed code copied — paste it into your page.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy automatically — select the text and copy it manually.')
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.35rem 0.7rem',
    fontSize: '0.78rem',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    border: '1px solid var(--theme-elevation-150)',
    borderRadius: 'var(--style-radius-s, 4px)',
    background: active ? 'var(--theme-elevation-100)' : 'transparent',
    color: active ? 'var(--theme-elevation-800)' : 'var(--theme-elevation-500)',
  })

  return (
    <div className="field-type" style={{ marginBottom: '1.5rem' }}>
      <label className="field-label">Live Expressions embed code</label>
      {!id ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--theme-elevation-500)', margin: 0 }}>
          Save the match first — the embed code appears here once it has an ID.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.4rem', margin: '0 0 0.5rem' }}>
            <button
              type="button"
              onClick={() => setMode('component')}
              style={tabStyle(mode === 'component')}
            >
              Web component (recommended)
            </button>
            <button
              type="button"
              onClick={() => setMode('iframe')}
              style={tabStyle(mode === 'iframe')}
            >
              iframe
            </button>
          </div>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--theme-elevation-500)',
              margin: '0 0 0.5rem',
            }}
          >
            {mode === 'component'
              ? 'Paste these two lines into the web page. The feed renders straight into the page (no iframe), sizes itself to its content, and keeps updating live. Best for websites. Needs a <script> tag — if the page blocks scripts, use the iframe instead.'
              : 'Paste this into the page (or an Embed / Custom-HTML block). It shows the feed in a self-sizing frame and keeps updating live. If your page blocks <script> tags, keep ONLY the <iframe> line and delete the <script> line — the frame then uses the fixed height="…" you set (adjust it to taste; a long feed scrolls inside). Email clients strip both.'}
          </p>
          <textarea
            readOnly
            value={snippet}
            rows={mode === 'component' ? 3 : 5}
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
