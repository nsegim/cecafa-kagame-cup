'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/dashboard/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/dashboard/ui/tabs'

type Mode = 'component' | 'iframe'

/**
 * Dashboard-native port of src/components/admin/EmbedCode.tsx — identical
 * snippets and behavior, no backend involvement (pure client-side templating
 * off the match id and the browser's own origin).
 */
export function EmbedCodePanel({ matchId }: { matchId: number }) {
  const [mode, setMode] = useState<Mode>('iframe')
  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const embedUrl = `${origin}/embed/matches/${matchId}`

  const snippets = useMemo(
    () => ({
      component: `<cecafa-match match-id="${matchId}"></cecafa-match>\n<script src="${origin}/embed/cecafa-match.js" async></script>`,
      iframe: `<iframe src="${embedUrl}" width="100%" height="1720" style="border:0;max-width:960px;width:100%" loading="lazy" title="Live Expressions" data-cecafa-embed></iframe>\n<script>(function(){if(window.__cecafaEmbedResize)return;window.__cecafaEmbedResize=1;window.addEventListener("message",function(e){var d=e.data;if(!d||d.type!=="cecafa-embed-height"||!d.height)return;var f=document.querySelectorAll("iframe[data-cecafa-embed]");for(var i=0;i<f.length;i++){if(f[i].contentWindow===e.source){f[i].style.height=d.height+"px";}}});})();</script>`,
    }),
    [matchId, origin, embedUrl],
  )

  const snippet = snippets[mode]

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      toast.success('Embed code copied — paste it into your page.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy automatically — select the text and copy it manually.')
    }
  }

  return (
    <div className="grid gap-2">
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="component">Web component</TabsTrigger>
          <TabsTrigger value="iframe">iframe</TabsTrigger>
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        {mode === 'component'
          ? 'Renders straight into the host page (no iframe), sizes itself to content, and keeps updating live.'
          : 'Shows the feed in a self-sizing frame. If the page blocks <script> tags, keep only the <iframe> line.'}
      </p>
      <textarea
        readOnly
        value={snippet}
        rows={mode === 'component' ? 3 : 5}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-input bg-muted/40 p-2.5 font-mono text-xs leading-relaxed"
      />
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy embed code'}
        </Button>
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Preview embed <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  )
}
