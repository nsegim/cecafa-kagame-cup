'use client'

import { useEffect } from 'react'

/**
 * Reports this embed's content height to the host page so the surrounding
 * <iframe> can size itself to fit — no fixed height, no inner scrollbar.
 *
 * An iframe can't grow to its own content (the host page owns the frame's box),
 * so we measure the document height here and `postMessage` it out. The snippet
 * an editor copies (see `EmbedCode`) carries a tiny listener that matches the
 * message back to its iframe by `contentWindow` and applies the height.
 *
 * We re-measure whenever the content changes: the Live Expressions feed polls
 * for new goals/cards/photos, the tabs swap panels, and crests/photos load in
 * late — all of which change the height while the frame is open. Because the
 * embed's <html>/<body> hug their content (`height: auto` in embed.css), the
 * measurement is the intrinsic content height and never feeds back off the
 * frame height the host applies, so there's no resize loop.
 */
export function EmbedAutoResize() {
  useEffect(() => {
    // Nothing to report when we're not actually inside a frame.
    if (window.parent === window) return

    let last = 0
    let timer = 0
    const measureAndPost = () => {
      timer = 0
      const height = Math.ceil(document.documentElement.getBoundingClientRect().height)
      if (!height || height === last) return
      last = height
      window.parent.postMessage({ type: 'cecafa-embed-height', height }, '*')
    }
    // The feed and its observers can fire in bursts; a short debounce coalesces
    // them into one measurement. We use setTimeout, NOT requestAnimationFrame:
    // rAF is throttled (or skipped entirely) for a tall/offscreen iframe, which
    // would leave the scheduled flag stuck and silently stop all later updates.
    const post = () => {
      if (timer) return
      timer = window.setTimeout(measureAndPost, 80)
    }

    // Report straight away, then let the observers keep it in sync.
    measureAndPost()

    // The MutationObserver is the reliable content-change signal: appended feed
    // items, swapped tab panels and toggled classes all fire it. A ResizeObserver
    // on <body> does NOT fire for content-driven height growth in Chrome, so it's
    // only a secondary catch for width-driven reflow when the host resizes.
    const mo = new MutationObserver(post)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true })

    const ro = new ResizeObserver(post)
    ro.observe(document.body)

    // Late-loading crests/photos shift the height after their own load event.
    window.addEventListener('load', post)

    return () => {
      if (timer) clearTimeout(timer)
      mo.disconnect()
      ro.disconnect()
      window.removeEventListener('load', post)
    }
  }, [])

  return null
}
