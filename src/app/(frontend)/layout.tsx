import React from 'react'
import type { Metadata } from 'next'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import { raleway } from '@/lib/fonts'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'
import './components.css'
import './design-fidelity.css'

const DESCRIPTION =
  'Live standings, fixtures, results and news from the CECAFA Kagame Cup 2026 in Rwanda. Twelve clubs, three groups, 24 July – 7 August.'

export const metadata: Metadata = {
  // Without a metadataBase, every relative image in an Open Graph tag resolves
  // against nothing and social cards silently render blank.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CECAFA Kagame Cup 2026 — Rwanda | IGIHE',
    // Sub-pages set a bare title and inherit the suffix.
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'CECAFA Kagame Cup 2026 — Rwanda | IGIHE',
    description: DESCRIPTION,
    url: '/',
    locale: 'rw_RW',
    images: [{ url: '/assets/cecafa-logo.png', width: 56, height: 48, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CECAFA Kagame Cup 2026 — Rwanda | IGIHE',
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

/**
 * Tournament-level structured data, emitted once site-wide.
 *
 * Individual fixtures add their own `SportsEvent` block on the match page and
 * point back at this as their `superEvent`, which is what lets search engines
 * group them as one competition rather than 22 unrelated games.
 */
const tournamentJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SportsEvent',
  name: SITE_NAME,
  sport: 'Football',
  startDate: '2026-07-24',
  endDate: '2026-08-07',
  url: SITE_URL,
  description: DESCRIPTION,
  location: {
    '@type': 'Place',
    name: 'Kigali, Rwanda',
    address: { '@type': 'PostalAddress', addressLocality: 'Kigali', addressCountry: 'RW' },
  },
  organizer: { '@type': 'Organization', name: 'CECAFA' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raleway.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(tournamentJsonLd) }}
        />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
