/**
 * JSON responses for the polled live endpoints.
 *
 * The live feed and the section widget are polled by every open tab — the match
 * feed every 15s, the embed every 60s — so these two routes are, by a wide
 * margin, the busiest thing the origin serves during a match. Three problems
 * this fixes, all measured against the previous plain `NextResponse.json`:
 *
 *  1. NO COMPRESSION. Next gzips page routes but not Route Handler responses:
 *     `/matches/5/live` came back as 66 KB with no `Content-Encoding` header at
 *     all, even when the client sent `Accept-Encoding: gzip`. At 1,000 viewers
 *     of one match that is ~4.4 MB/s of origin egress for a scoreline.
 *
 *  2. NO ETAG. A live feed changes maybe once a minute, so roughly four in five
 *     polls re-sent bytes the browser already had. A conditional request now
 *     returns an empty 304 instead.
 *
 *  3. NO SHARED CACHE. `no-store` meant every viewer's poll reached the origin.
 *     A few seconds of `s-maxage` lets the CDN collapse the whole fan-out into
 *     roughly one origin request per window, while staying well inside the
 *     poll interval so the feed is no less live than before.
 */
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'

export interface PolledJsonOptions {
  /**
   * Seconds a shared (CDN) cache may reuse this response. Keep it well under
   * the client's poll interval — the point is to absorb concurrent viewers,
   * not to delay updates.
   */
  sMaxAge: number
  /** Seconds a stale response may still be served while it revalidates behind the scenes. */
  staleWhileRevalidate: number
  /**
   * Add `Access-Control-Allow-Origin: *` so a browser on another origin can
   * `fetch()` this. Only for genuinely public, read-only payloads — it's what
   * lets the `<cecafa-match>` web component read the feed from a partner site.
   * A plain GET with only safelisted headers (incl. `If-None-Match`) triggers
   * no preflight, so no OPTIONS handler is needed.
   */
  cors?: boolean
}

/** Bodies below this compress to more bytes than they save, once headers are counted. */
const MIN_GZIP_BYTES = 1024

/**
 * Serialise `body` to JSON with conditional-request and compression handling.
 *
 * Returns a 304 with no body when the client's `If-None-Match` already matches,
 * which is the common case between updates.
 */
export function polledJson(
  req: Request,
  body: unknown,
  { sMaxAge, staleWhileRevalidate, cors }: PolledJsonOptions,
): Response {
  const json = JSON.stringify(body)
  const etag = `"${createHash('sha1').update(json).digest('base64url')}"`

  // `public` is required for a CDN to cache at all; `max-age=0` keeps the
  // browser revalidating every poll so a viewer never sees a stale score.
  const cacheControl = `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`

  const baseHeaders: Record<string, string> = {
    ETag: etag,
    'Cache-Control': cacheControl,
    // Compression is negotiated per request, so a shared cache must key on it.
    Vary: 'Accept-Encoding',
  }
  if (cors) {
    baseHeaders['Access-Control-Allow-Origin'] = '*'
    // So a cross-origin reader can see the ETag and send it back as
    // If-None-Match — otherwise the 304 fast-path never kicks in for them.
    baseHeaders['Access-Control-Expose-Headers'] = 'ETag'
  }

  if (req.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: baseHeaders })
  }

  const payload = Buffer.from(json, 'utf8')
  const acceptsGzip = (req.headers.get('accept-encoding') ?? '').includes('gzip')

  if (acceptsGzip && payload.byteLength >= MIN_GZIP_BYTES) {
    const compressed = gzipSync(payload)
    return new Response(compressed, {
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Encoding': 'gzip',
        'Content-Length': String(compressed.byteLength),
      },
    })
  }

  return new Response(payload, {
    headers: {
      ...baseHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': String(payload.byteLength),
    },
  })
}
