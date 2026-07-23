'use client'

import { useState } from 'react'

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="6" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17" cy="18" r="2.6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.3 10.8L14.7 7.2M8.3 13.2L14.7 16.8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // user cancelled — no-op
      }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button type="button" className="share-btn" onClick={share}>
      <ShareIcon />
      {copied ? 'Link copied' : 'Share'}
    </button>
  )
}
