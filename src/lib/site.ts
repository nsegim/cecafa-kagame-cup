/**
 * The site's own public origin.
 *
 * Needed by anything that has to emit an ABSOLUTE url — `metadataBase`, the
 * sitemap, robots.txt, Open Graph tags and the JSON-LD blocks. Relative paths
 * are fine everywhere else and should stay relative.
 *
 * ⚠️ SET `NEXT_PUBLIC_SITE_URL` IN THE DEPLOYED ENVIRONMENT. The fallback below
 * is a placeholder, not a real deployment target — if it ships unset, search
 * engines will be handed canonical URLs and a sitemap pointing at the wrong
 * host, which is worse than having none. There is no way to detect the public
 * origin at build time, so this has to be configured.
 */
const FALLBACK_ORIGIN = 'https://kagamecup.igihe.com'

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configured) return FALLBACK_ORIGIN
  // Tolerate a value entered without a scheme, and drop any trailing slash so
  // callers can safely concatenate paths.
  const withScheme = /^https?:\/\//.test(configured) ? configured : `https://${configured}`
  return withScheme.replace(/\/+$/, '')
}

export const SITE_URL = resolveSiteUrl()

export const SITE_NAME = 'CECAFA Kagame Cup 2026'

/** Absolute URL for a site-relative path, e.g. `absoluteUrl('/matches/5')`. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}
