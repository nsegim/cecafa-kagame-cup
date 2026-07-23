import React from 'react'
import { Raleway } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import './globals.css'
import './components.css'
import './design-fidelity.css'

/**
 * Raleway — the single typeface for the entire site. Self-hosted at build
 * time by next/font/google (no runtime request to Google, no layout shift).
 * One CSS variable; `--font-display`/`--font-condensed` in globals.css both
 * resolve to it, so no component-level CSS had to change.
 */
const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-raleway',
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
})

export const metadata = {
  title: 'CECAFA Kagame Cup 2026 — Rwanda | IGIHE',
  description:
    'Live standings, fixtures, results and news from the CECAFA Kagame Cup 2026 in Rwanda. Twelve clubs, three groups, 24 July – 7 August.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raleway.variable}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
