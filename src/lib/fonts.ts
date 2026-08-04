import { Inter } from 'next/font/google'
import { Raleway } from 'next/font/google'

/**
 * Raleway — the single typeface for the entire site, self-hosted at build time
 * by next/font/google (no runtime request to Google, no layout shift).
 *
 * Shared by both root layouts — `(frontend)` and `(embed)` — so the embed frame
 * renders in exactly the same face as the page it mirrors. It was declared
 * twice with identical options before; two copies of a font config is one
 * silent divergence waiting to happen.
 *
 * `--font-display` and `--font-condensed` in globals.css both resolve to this
 * one variable, so component CSS needs no per-weight knowledge.
 *
 * On the weight list: 900 earns its ~25 KB from only two live rules
 * (`.perf__stat`, `.news-card__img-fallback`) — the other three references are
 * in dead CSS. It is kept because dropping it would silently restyle those two
 * to 800, and that is a visual change, not an optimisation. Retire it together
 * with the dead-CSS sweep, when both rules can be moved to 800 deliberately.
 */
export const raleway = Raleway({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-raleway',
  display: 'swap',
  fallback: [
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ],
})

/**
 * Inter — dashboard-only UI typeface. Kept separate from `raleway` (the public
 * site's display face) because /dashboard is a data-dense operations tool, not
 * an editorial page — Inter's tighter metrics and true tabular figures read
 * better in tables, stat cards and forms at small sizes.
 */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  fallback: [
    'system-ui',
    '-apple-system',
    'Segoe UI',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ],
})
