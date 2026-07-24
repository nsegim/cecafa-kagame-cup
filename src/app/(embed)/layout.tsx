import React from 'react'
import { Raleway } from 'next/font/google'
// The embed reuses the exact site stylesheets so the Live Expressions feed
// looks identical to the match page, then layers `embed.css` on top to strip
// the header/footer chrome and compact the scoreboard for a newsletter frame.
import '../(frontend)/globals.css'
import '../(frontend)/components.css'
import '../(frontend)/design-fidelity.css'
import './embed.css'

/**
 * Separate root layout for the `/embed/*` routes. This route group deliberately
 * does NOT render <SiteHeader>/<SiteFooter> — an embedded Live Expressions feed
 * must be content only, so it drops cleanly into a newsletter <iframe>.
 *
 * Next.js allows one root layout per route group as long as there's no shared
 * top-level app/layout.tsx (there isn't — `(frontend)` and `(payload)` are each
 * their own root), so this is a fully independent <html> document.
 */
const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-raleway',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
})

export const metadata = {
  title: 'Live Expressions — CECAFA Kagame Cup 2026',
  // Embed URLs are meant to live inside a host page, not to be indexed as
  // standalone pages competing with the real match page.
  robots: { index: false, follow: false },
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raleway.variable}>
      <body className="embed-body">{children}</body>
    </html>
  )
}
