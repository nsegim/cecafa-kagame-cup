# CECAFA Kagame Cup 2026 — Next.js Performance & Architecture Audit

Audited: 2026-07-27 · Next.js 16.2.7 (Turbopack) · React 19.2.6 · Payload 3.86.0 · Postgres

All numbers below were **measured**, not estimated: a clean `yarn build` plus a
`next start` origin on port 3111 against the production Postgres (via the dev SSH tunnel).

---

## 0. Measured baseline

### Build output

```
Route (app)                  Revalidate  Expire   Rendering
/                                   5m      1y    ○ Static
/matches                            5m      1y    ○ Static
/news                               5m      1y    ○ Static
/teams                              5m      1y    ○ Static
/matches/[id]                       2m      1y    ● SSG (22 paths)
/embed/matches/[id]                 2m      1y    ● SSG (22 paths)
/embed/section                      1m      1y    ○ Static
/gallery                             —       —    ƒ Dynamic   ← problem
/news/[slug]                         —       —    ƒ Dynamic
/matches/[id]/live                   —       —    ƒ Dynamic
/embed/section/data                  —       —    ƒ Dynamic
```

### Payload weight per page

| Page | HTML raw | HTML gzip | of which RSC flight | Client JS (gzip) | CSS (gzip) |
|---|---:|---:|---:|---:|---:|
| `/` | 101 KB | 13 KB | 41 KB (41%) | 194 KB | 14 KB |
| **`/matches`** | **1273 KB** | **85 KB** | **1252 KB (98%)** | 194 KB | 14 KB |
| `/teams` | 51 KB | 6 KB | 26 KB (52%) | 194 KB | 14 KB |
| `/news` | 30 KB | 6 KB | 17 KB (55%) | 194 KB | 14 KB |
| `/matches/5` | 343 KB | — | — | 194 KB | 14 KB |

### Runtime endpoints

| Endpoint | Response | Compressed? | Cache-Control | Origin time |
|---|---:|---|---|---:|
| `/matches/5/live` | 66 KB | **No** | `no-store` | ~2.0–2.5 s |
| `/matches/3/live` | 37 KB | **No** | `no-store` | ~2.0 s |
| `/gallery` | 36 KB | yes | `private, no-cache, no-store, max-age=0` | 1.57 s |
| `/matches` (cached) | 1.3 MB | yes | `s-maxage=300, SWR` | 0.03 s (HIT) |

### Data volumes (production DB)

matches 22 · teams 12 · players 304 · player-match-stats **9** · articles 18 ·
gallery-images 10 · videos 14 · media **918**

> Consequence: **this is not an index-starved database.** Every table is tiny.
> The database cost in this app comes entirely from *over-fetching* (`depth: 2`
> relation hydration) and from *uncached* request paths, not from missing indexes.
> Recommendations below reflect that honestly.

---

## 1. Critical findings

### C-1 — `/matches` ships a 1.27 MB RSC payload (98% of the page is discarded data)

**Severity:** Critical
**Files:** `src/app/(frontend)/matches/page.tsx`, `src/components/MatchesTabs.tsx`, `src/lib/tournament.ts:59-63`

**What happens.** `getTournamentData()` fetches matches at `depth: 2`. That
hydrates, for all 22 fixtures: both teams, each team's `crest` Media doc with all
four size variants, both lineups (up to 40 `Player` docs with their `photo` Media
docs), every commentary entry's `player`/`playerOff`/`playerOn` docs, every
attached `images[]` Media doc, and the full Lexical rich-text tree of every note.
`MatchesTabs` is a `'use client'` component, so **every byte of that object graph
is serialised across the server→client boundary** — once into the SSR HTML and
again into the Flight payload.

Token census of the emitted `matches.html`:

```
3690 × "filename"   3690 × "filesize"   3690 × "mimeType"
3691 × "url"        3693 × "width"      3695 × "height"
 738 × "sizes"       738 × "focalX"      738 × "thumbnailURL"
 425 × "children"    366 × "text"        264 × "textFormat"   ← Lexical trees
```

**Why it matters.** 1.27 MB raw / 85 KB gzip. Parsing and hydrating that JSON on a
mid-range Android phone on 3G is seconds of blocked main thread — it lands
directly on INP and LCP. The page renders **nothing** from 95%+ of it: the tab UI
only needs id, two labels, two crest URLs, two scores, kickoff, venue and status.

**Fix.** Map to a lean DTO on the server and hand *that* to the client component.

```ts
// src/lib/matchView.ts  (new)
import type { Match, Team } from '@/payload-types'

export interface MatchRow {
  id: number
  kickoff: string
  /** Raw status; the client re-derives 'live' from kickoff so it stays correct after ISR. */
  status: Match['status']
  venue: string
  homeScore: number | null
  awayScore: number | null
  home: SideView
  away: SideView
}
export interface SideView { name: string; shortName: string; crestUrl: string | null }

function side(rel: Match['homeTeam'], placeholder?: string | null): SideView {
  const t = rel && typeof rel !== 'number' ? (rel as Team) : null
  const crest = t?.crest
  return {
    name: t?.name ?? placeholder ?? 'TBC',
    shortName: t?.shortName ?? placeholder ?? 'TBC',
    crestUrl:
      crest && typeof crest !== 'number' ? (crest.sizes?.crest?.url ?? crest.url ?? null) : null,
  }
}

export function toMatchRow(m: Match): MatchRow {
  return {
    id: m.id,
    kickoff: m.kickoff,
    status: m.status,
    venue: m.venue,
    homeScore: m.homeScore ?? null,
    awayScore: m.awayScore ?? null,
    home: side(m.homeTeam, m.homeTeamPlaceholder),
    away: side(m.awayTeam, m.awayTeamPlaceholder),
  }
}
```

Then in `matches/page.tsx` pass `upcoming.map(toMatchRow)` / `previous.map(toMatchRow)`,
and change `MatchesTabs`/`MatchListRow`/`FeaturedBanner` to take `MatchRow`.
`TeamCrest` needs a sibling that accepts `SideView` (or accept
`{ name, shortName, crestUrl }` directly) — it currently re-derives the URL from a
full `Team`.

Keep `effectiveMatchStatus` **on the client**: it depends on `Date.now()`, and
computing it server-side would freeze "live" into the 5-minute ISR cache. Give it
`{ status, kickoff }`, which the DTO already carries.

**Expected improvement.** 1273 KB → **~12 KB** raw (≈99%), 85 KB → ~5 KB gzip.
Removes ~1.2 MB of JSON parse + hydration work from the fixtures page.
This is by far the largest single win available.

---

### C-2 — `/gallery` is fully dynamic and uncacheable; every hit is an origin render

**Severity:** Critical
**Files:** `src/app/(frontend)/gallery/page.tsx:7,14-23`

`export const revalidate = 300` is declared, but the page also awaits
`searchParams`, which opts the route into dynamic rendering. `revalidate` does not
apply. Verified response header:

```
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
time=1.57s
```

Every single request runs `getGalleryImages()` (200-row query, `depth: 1`) plus
`findGlobal('gallery')` against the origin, with no CDN cache in front of it.

**Why it matters.** This is the exact failure mode already documented for
`/matches/[id]`: an uncached dynamic segment on an origin that intermittently
stalls 20–40 s returns a Cloudflare **524** instead of a page. `/gallery` is
currently the only public page with this shape.

**Fix.** The `?category=` param is pure client-side filter state —
`GalleryBrowser` already re-derives it with `useMemo` and writes it back with
`history.replaceState`. The server does not need it.

```tsx
// src/app/(frontend)/gallery/page.tsx
export const revalidate = 300
// remove the GalleryPageProps interface and the searchParams argument entirely

export default async function GalleryPage() {
  const [allImages, heroImage] = await Promise.all([getGalleryImages(), getGalleryHero()])
  return (
    <div className="gallery-page">
      {/* …hero unchanged… */}
      <GalleryBrowser initialCategory="All" allImages={allImages} />
    </div>
  )
}
```

To preserve deep-linkable `?category=`, read it once on the client instead:

```tsx
// src/components/GalleryBrowser.tsx — inside the component
const [selectedCategory, setSelectedCategory] = useState<GalleryFilter>(initialCategory)
useEffect(() => {
  const q = new URLSearchParams(window.location.search).get('category')
  if (isGalleryFilter(q ?? undefined)) setSelectedCategory(q as GalleryFilter)
}, [])
```

**Trade-off:** a shared `?category=Trophy` link paints "All" for one frame before
the effect runs. If that is unacceptable, the alternative is to keep the page
static and move the filter into a real route segment (`/gallery/[category]`) with
`generateStaticParams` — more work, no flash, still fully cacheable.

**Expected improvement.** 1.57 s origin render → CDN/ISR hit (~5 ms), and removes
the only remaining 524-prone public route.

---

### C-3 — `/matches/[id]/live` is uncompressed, uncached, full-payload, and polled every 15 s per viewer

**Severity:** Critical (during live matches)
**Files:** `src/app/(frontend)/matches/[id]/live/route.ts`, `src/components/LiveMatchProvider.tsx:14,46`

Measured: `/matches/5/live` returns **66 KB** and — verified with
`Accept-Encoding: gzip, br` — comes back with **no `Content-Encoding` header at
all**. Next compresses page routes (`/matches` returns `Content-Encoding: gzip`)
but not this Route Handler's `NextResponse.json`. Origin time ~2.0–2.5 s per call.

Each viewer polls this every 15 s. Per 1,000 concurrent viewers of one match:
- **~4.4 MB/s** sustained egress from the origin, uncompressed;
- **~66 req/s**, each running `findByID(depth: 2)` + a `player-match-stats` query;
- zero cache hits — `dynamic = 'force-dynamic'` + `Cache-Control: no-store`.

The payload is also *entire*: the full event list, every Lexical rich-text tree,
and every photo URL are re-sent on every tick even when nothing changed.

**Fixes, in order of value:**

**(a) Compress it.** Cheapest fix, ~75% off the wire immediately.

```ts
import { gzipSync } from 'node:zlib'

const json = JSON.stringify(body)
const accepts = _req.headers.get('accept-encoding') ?? ''
if (accepts.includes('gzip')) {
  return new Response(gzipSync(json), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'Cache-Control': 'no-store',
    },
  })
}
return new Response(json, {
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})
```

(If Cloudflare is configured to compress origin responses, verify that first —
it may already cover this hop, but the origin→CDN leg stays uncompressed either way.)

**(b) Add an ETag so unchanged ticks cost 0 bytes of body.** A live feed changes
maybe once a minute; four of every five polls return identical data.

```ts
import { createHash } from 'node:crypto'

const etag = `"${createHash('sha1').update(json).digest('base64url')}"`
if (_req.headers.get('if-none-match') === etag) {
  return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'no-store' } })
}
// …include ETag in the 200 response headers
```

`fetch()` in `LiveMatchProvider` sends `If-None-Match` automatically when
`cache: 'no-store'` is replaced with `cache: 'no-cache'` (revalidate, don't skip).

**(c) Let the CDN absorb the fan-out.** `no-store` means every viewer's poll
reaches the origin. A 5-second shared cache collapses 1,000 viewers into
~0.2 req/s at the origin while keeping the feed effectively real-time:

```ts
'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=25'
```

**(d) Trim `depth`.** `getMatchDetail` uses `depth: 2` but the live slice needs
only commentary players' *names* and image URLs. A `depth: 1` variant for the poll
path would cut both query time and payload.

**Expected improvement.** (a)+(b)+(c) together: ~66 KB × 66 req/s → **~0.2 req/s
at the origin and ~4 KB on the ~20% of ticks that actually changed**. This is the
difference between the site holding up during the final and not.

The same three fixes apply verbatim to `/embed/section/data`
(`src/app/(embed)/embed/section/data/route.ts`), which is polled every 60 s by
*every* iframe embedded across IGIHE — potentially a much larger fan-out than the
match page itself.

---

### C-4 — Fair-play tiebreaker is silently always zero, and its query is 100% wasted

**Severity:** Critical (correctness) / High (performance)
**File:** `src/lib/tournament.ts:59-77`

```ts
payload.find({ collection: 'player-match-stats', limit: 2000, depth: 0 }),
// …
for (const s of cardsRes.docs as PlayerMatchStat[]) {
  const player = s.player
  if (typeof player === 'number') continue   // ← depth:0 makes this ALWAYS true
  …
}
```

At `depth: 0` Payload returns `player` as a numeric id, so the guard `continue`s
on **every** row. `fairPlayByTeam` is always empty, so every `TeamRef` gets
`fairPlayPoints: 0`. CECAFA tiebreaker **criterion 6 never applies**, and any tie
that should be settled on cards instead falls through to `requiresDrawOfLots`.
The in-code comment (`depth 0 gives ids; need team — skip`) shows the author saw
the symptom but not that it disables the feature.

Meanwhile the query itself still runs on every `getTournamentData()` call — which
is every render of `/`, `/matches` and `/teams` — and `getLeaderboards()` fetches
the *same collection again* at `depth: 2` on the homepage. Two full scans, one of
which produces nothing.

**Fix.** Fetch once, at the depth that actually resolves `player.team`, and share it.

```ts
// src/lib/tournament.ts
import { cache } from 'react'

/** All player-match-stat rows with player→team resolved. One query per request. */
const getPlayerMatchStats = cache(async (): Promise<PlayerMatchStat[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'player-match-stats',
    limit: 5000,
    depth: 2, // player -> team
  })
  return res.docs as PlayerMatchStat[]
})
```

Then in `getTournamentData`, replace the third `Promise.all` entry with
`getPlayerMatchStats()`; the existing loop body now works unchanged and fair play
starts counting. In `getLeaderboards`, replace the inline `payload.find` with
`await getPlayerMatchStats()`. Because both are wrapped in React `cache()`, the
homepage now issues **one** stats query instead of two.

**Expected improvement.** Restores a documented tournament rule; removes one full
collection scan per page render on three routes.

---

## 2. High findings

### H-1 — 645 KB of client JS (194 KB gzip) on every page, including pages with almost no interactivity

**Severity:** High
**Files:** 22 files carry `'use client'`

Every route loads an identical ~194 KB gzip JS baseline. React 19 + the Next App
Router runtime accounts for roughly half; the rest is the app's own client tree.
Several of these components have no reason to be client components:

| Component | Client state | Verdict |
|---|---|---|
| `MatchesTabs` | one `useState<'upcoming'\|'previous'>` | **Split.** Extract the tab buttons into a tiny client shell; render both panels as server-rendered children and toggle with CSS/`hidden`. Removes the biggest serialisation boundary in the app (see C-1). |
| `TeamsBoard` | one `useState<'all'\|GroupId>` | **Split.** Same pattern. It currently receives all 12 `Team` docs (with crest Media) *plus* all three standings tables across the boundary — 26 KB of the 51 KB `/teams` page. |
| `PlayersPerformance` | one `useState<Tab>` | **Split.** Three tables, one tab. Server-render all three, toggle with CSS. |
| `Lineups` | one `useState<'home'\|'away'>` | **Split.** Two lists, one toggle. |
| `Highlights` | pagination + lightbox | Keep client, but `VideoLightbox` should be `next/dynamic` — it is only mounted after a click. |
| `HomeGallery` / `GalleryBrowser` | lightbox | Keep client, but `GalleryLightbox` should be `next/dynamic`. |
| `MatchCenter` | tabs + lightbox | Keep client (it consumes live context), but see H-2. |
| `SiteNav` | menu open/close | Correct as-is — genuinely interactive, tiny. |

The general pattern to apply:

```tsx
// TabShell.tsx  — the only client code needed
'use client'
export function TabShell({ tabs, panels }: { tabs: string[]; panels: React.ReactNode[] }) {
  const [i, setI] = useState(0)
  return (
    <>
      <div role="tablist">{tabs.map((t, n) => (
        <button key={t} role="tab" aria-selected={n === i} aria-controls={`p${n}`}
                onClick={() => setI(n)}>{t}</button>
      ))}</div>
      {panels.map((p, n) => (
        <div key={n} id={`p${n}`} role="tabpanel" hidden={n !== i}>{p}</div>
      ))}
    </>
  )
}
```

Server components pass *rendered JSX* as `panels` — React streams it as part of
the server tree, so the underlying data never crosses the boundary as JSON.

**Expected improvement.** ~30–50 KB gzip off the shared bundle, and — combined
with C-1 — it is what makes the 1.2 MB `/matches` payload structurally impossible
to reintroduce.

---

### H-2 — The Lexical rich-text renderer is in the shared client bundle

**Severity:** High
**File:** `src/components/MatchCenter.tsx:4`

```ts
import { RichText } from '@payloadcms/richtext-lexical/react'
```

`MatchCenter` is a client component reached from `/matches/[id]` and
`/embed/matches/[id]`. `RichText` is a full Lexical node-type dispatcher and pulls
a substantial dependency tree into the browser — to render what are, in practice,
short paragraphs of commentary.

**Fix (best).** Serialise the Lexical tree to HTML **on the server** in
`getMatchDetail`, and send a string. The feed content is authored by trusted
editors, but you must still sanitise, because commentary is the one field that
becomes markup:

```ts
// server side, in lib/tournament.ts
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html'
// …
text: c.text ? await convertLexicalToHTML({ data: c.text }) : null,
```

and in `MatchCenter`, `<div dangerouslySetInnerHTML={{ __html: e.html }} />`.

**Fix (cheaper, no server change).** Lazy-load it, so it is fetched only when a
feed entry actually has rich text:

```tsx
const RichText = dynamic(
  () => import('@payloadcms/richtext-lexical/react').then((m) => m.RichText),
  { ssr: false },
)
```

**Trade-off.** The server-HTML route removes the dependency from the browser
entirely and shrinks the `/live` payload too (HTML string ≪ Lexical JSON tree),
but requires a sanitiser and gives up client-side link/embed behaviour if any is
relied on. The lazy route is zero-risk and still removes it from first load.

---

### H-3 — 93 KB of global CSS on every page, ~22% of it dead, ~148 selectors defined twice

**Severity:** High
**Files:** `src/app/(frontend)/components.css` (45 KB), `design-fidelity.css` (47 KB), `globals.css` (5 KB)

Measured:
- 569 class selectors across the three files; **126 (22%) appear in no `.tsx` file.**
- **148 selectors are defined in both `components.css` and `design-fidelity.css`**, with
  `design-fidelity.css` layered second to win. 18 `!important` declarations.
- Everything is imported in `layout.tsx`, so all of it loads on every route
  (14 KB gzip — not catastrophic, but all render-blocking).

The dead 22% is a coherent block: `.article__*`, `.article-body`, `.related-card__*`,
`.comment*`, `.comment-form__*`, `.approved-article*`, `.page-hero__*`, `.match-strip`,
`.strip-section`. These are the styles for a full on-site article page with comments
that **no longer exists** — `/news/[slug]` is now a redirect stub. ~10 KB of CSS
maintained for a deleted feature.

**Fix.**
1. Delete the dead blocks (grep the list in §7 below).
2. Fold `design-fidelity.css` into `components.css`. Two files where the second
   exists only to override the first is a standing correctness hazard: any edit to
   `components.css` silently does nothing for 148 selectors. This is the same class
   of bug already recorded for the `!important` overrides.
3. Move route-specific CSS (`.gallery-*`, `.match-*`, `.perf__*`) into per-route
   `.module.css` or a route-level `import`, so `/news` stops downloading gallery styles.

**Expected improvement.** ~25 KB raw / ~4 KB gzip off every page, plus a large
reduction in "why isn't my CSS applying" maintenance cost.

---

### H-4 — 5.9 MB of unreferenced images and 280 KB of unused fonts in `public/`

**Severity:** High (repo/deploy weight), Low (runtime)
**Directories:** `public/design/` (8.1 MB), `public/fonts/` (280 KB)

> **Correction.** An earlier draft of this finding claimed only `gallery-hero.jpg`
> was referenced in `public/design/`. That was wrong — the scan missed
> `src/seed/content.ts`, which names 15 of these files as seed content for the
> initial gallery and news rows, and one `content: url('/design/article-hero.jpg')`
> in `design-fidelity.css`. The corrected figures are below.

Of 41 files in `public/design/`, **25 (5.7 MB) are referenced nowhere** in `src/`
or `scripts/`: `player-1..5.png` (2.8 MB alone), `article-gallery-*`,
`article-keeper/stadium/team`, `related-1..2`, `comment-avatar`, `author`,
`results-crest-*`, `results-feature`, `icon-calendar`, `icon-stadium`,
`match-action`, `match-ball`, `home-feature`, `home-side`, `highlight`. These
are mockup leftovers from the on-site article page that no longer exists.

The other 16 **must be kept** — they are the seed corpus (`gallery-*.jpg`,
`news-*.jpg`) plus `article-hero.jpg` (live CSS reference) and `gallery-hero.jpg`
(the gallery hero fallback).

`public/fonts/` contains three `avant-garde*.otf`, eight `VisbyRoundCF-*.woff2`
and a README. There is **no `@font-face` rule anywhere in the codebase**, and the
README points at `src/app/(frontend)/fonts.css` — **a file that does not exist.**
That whole mechanism was replaced by Raleway via `next/font/google`. All 280 KB is
dead. These are also licensed commercial typefaces being served publicly at
`/fonts/*.otf`, which is exposure with no upside.

`public/assets/hero-stadium.jpg` (132 KB) is also unreferenced.

**Fix.** Delete the 25 unused `public/design` files, all of `public/fonts/`, and
`public/assets/hero-stadium.jpg` — keeping every file named by `src/seed/content.ts`.

**Expected improvement.** 8.9 MB → 2.9 MB `public/`. Faster deploys and container
builds; no runtime change (these were never requested by any page).

---

### H-5 — News, gallery and video edits take up to 5 minutes to appear

**Severity:** High (editorial UX during a live tournament)
**Files:** `src/collections/Articles.ts`, `GalleryImages.ts`, `Videos.ts`, `globals/Gallery.ts`

`Matches` has an `afterChange` hook that calls `revalidatePath` (correctly wrapped
in try/catch for script contexts). **No other collection has one.** Publishing an
article, adding a gallery album or a highlight video is invisible until the 300 s
ISR window lapses on `/`, `/news` and `/gallery`.

**Fix.** Add the same hook to each:

```ts
// Articles.ts
import { revalidatePath } from 'next/cache'
// …
hooks: {
  afterChange: [() => { try { revalidatePath('/'); revalidatePath('/news') } catch {} }],
  afterDelete: [() => { try { revalidatePath('/'); revalidatePath('/news') } catch {} }],
},
```

`GalleryImages` + `Gallery` global → `revalidatePath('/')` and `revalidatePath('/gallery')`.
`Videos` → `revalidatePath('/')` and `revalidatePath('/embed/section')`.

**Better long-term:** switch to `revalidateTag`. `Matches.afterChange` currently
calls `revalidatePath('/', 'layout')`, which invalidates **every route on the
site** on every commentary keystroke-save during a live match — including
`/gallery`, `/news` and all 22 embed frames that have nothing to do with that
match. Tagging `getTournamentData` / `getMatchDetail` / `fetchLatestNews` and
revalidating the specific tag is both more precise and cheaper.

---

### H-6 — No sitemap, no robots.txt, no `metadataBase`, no Open Graph, no structured data

**Severity:** High (SEO)
**Files:** none exist — this is a gap, not a defect

Confirmed absent: `sitemap.ts`, `robots.ts`, `opengraph-image`, `metadataBase`,
`openGraph`/`twitter` metadata, `alternates.canonical`, any JSON-LD, `favicon.ico`,
`manifest.ts`. For a tournament site whose entire value is being found for
"CECAFA Kagame Cup 2026" and per-fixture searches, this is the single largest
non-performance gap.

**Fix.**

```ts
// src/app/(frontend)/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kagamecup.igihe.com'),
  title: {
    default: 'CECAFA Kagame Cup 2026 — Rwanda | IGIHE',
    template: '%s | CECAFA Kagame Cup 2026',
  },
  description: '…',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CECAFA Kagame Cup 2026',
    locale: 'rw_RW',
    images: ['/assets/cecafa-logo.png'],
  },
  twitter: { card: 'summary_large_image' },
}
```

```ts
// src/app/(frontend)/sitemap.ts
import type { MetadataRoute } from 'next'
import { getAllMatchIds } from '@/lib/tournament'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kagamecup.igihe.com'
  const ids = await getAllMatchIds()
  return [
    { url: base, changeFrequency: 'hourly', priority: 1 },
    { url: `${base}/matches`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/teams`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/news`, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${base}/gallery`, changeFrequency: 'daily', priority: 0.6 },
    ...ids.map((id) => ({ url: `${base}/matches/${id}`, changeFrequency: 'hourly' as const, priority: 0.7 })),
  ]
}
```

```ts
// src/app/(frontend)/robots.ts
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://kagamecup.igihe.com'
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/embed/'] }],
    sitemap: `${base}/sitemap.xml`,
  }
}
```

Add `SportsEvent` JSON-LD to `/matches/[id]` — this is what produces rich fixture
results in Google:

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  '@context': 'https://schema.org', '@type': 'SportsEvent',
  name: `${home.label} vs ${away.label}`,
  startDate: match.kickoff,
  eventStatus: displayStatus === 'final'
    ? 'https://schema.org/EventScheduled' : 'https://schema.org/EventScheduled',
  location: { '@type': 'Place', name: VENUE_LABEL[match.venue] ?? match.venue,
              address: { '@type': 'PostalAddress', addressLocality: 'Kigali', addressCountry: 'RW' } },
  competitor: [
    { '@type': 'SportsTeam', name: home.label },
    { '@type': 'SportsTeam', name: away.label },
  ],
  superEvent: { '@type': 'SportsEvent', name: 'CECAFA Kagame Cup 2026' },
})}} />
```

The `(embed)` layout already sets `robots: { index: false }` — correct, keep it.

---

### H-7 — Images bypass `next/image` in seven places

**Severity:** High
**Files:** `NewsCard.tsx:27`, `LatestNews.tsx:13`, `Highlights.tsx:26`, `MatchesTabs.tsx:50`,
`MatchCenter.tsx:236`, `SectionEmbed.tsx:118,144`, plus raw `<img>` in
`GalleryLightbox.tsx:63`, `MatchCenter.tsx:74`, `SectionEmbed.tsx:30,103`

These load Cloudinary originals through CSS `background-image` or bare `<img>`:
no responsive `srcset`, no AVIF/WebP negotiation, no lazy-loading hints, no
intrinsic dimensions (so they contribute to CLS). On `/` alone this is ~11 news
card images at the 768×432 `card` variant.

**Fix.** For the card patterns, wrap in a positioned container and use `fill`:

```tsx
// NewsCard.tsx
<div className="news-card__img" style={{ position: 'relative' }}>
  {article.imageUrl && (
    <Image src={article.imageUrl} alt="" fill sizes="(max-width: 900px) 100vw, 33vw"
           style={{ objectFit: 'cover' }} />
  )}
  {article.category && <span className="news-card__tag">{article.category}</span>}
</div>
```

The two lightbox `<img>` tags are legitimately hard to convert (unknown intrinsic
size, full-viewport) — at minimum add `loading="lazy"` and `decoding="async"`.
The `SectionEmbed` ones are inside an iframe on third-party pages where
`next/image` optimisation still works (same origin) — convert those too.

Also enable AVIF, which Next does not do by default:

```ts
// next.config.ts
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [{
    protocol: 'https',
    hostname: 'res.cloudinary.com',
    pathname: `/${process.env.CLOUDINARY_CLOUD_NAME}/**`, // scope to your account, not /**
  }],
}
```

**Expected improvement.** 30–50% fewer image bytes on `/` and `/news`, and
measurable CLS improvement from intrinsic sizing.

---

### H-8 — `yarn lint` fails: 7 errors

**Severity:** High (DX / CI)

```
src/app/(frontend)/matches/[id]/page.tsx:93   error  react-hooks/purity — Date.now() during render
src/app/(embed)/embed/matches/[id]/page.tsx:91 error  react-hooks/purity — Date.now() during render
src/components/MatchCenter.tsx:207,213,338     error  react/no-unescaped-entities
src/components/PlayersPerformance.tsx:81       error  react/no-unescaped-entities
src/app/(frontend)/matches/[id]/page.tsx:125   error  react/no-unescaped-entities
src/scripts/import-gor-mahia-players.ts:19   warning  unused 'readFileSync'
```

The two `react-hooks/purity` errors are not cosmetic: computing `pollEnabled` from
`Date.now()` inside a server component that is **prerendered at build time** bakes
a build-time decision into the ISR cache. A fixture built 3 hours before kickoff
ships `pollEnabled: false`, and stays that way until `revalidate` (120 s) lapses
after someone requests it — the live feed can start up to two minutes late.

**Fix.** Move the decision to the client, where `Date.now()` is evaluated at
mount time:

```tsx
// page.tsx — pass the raw inputs, not the verdict
<LiveMatchProvider matchId={match.id} initial={initialLive} kickoff={match.kickoff}>

// LiveMatchProvider.tsx
const KICKOFF_SOON_MS = 30 * 60 * 1000
useEffect(() => {
  if (initial.status === 'final') return
  const soon = new Date(kickoff).getTime() - Date.now() < KICKOFF_SOON_MS
  if (initial.status !== 'live' && !soon) return
  // …existing polling loop
}, [matchId, pollMs, kickoff, initial.status])
```

This also fixes the lint error and removes the `enabled` prop entirely.

---

## 3. Medium findings

### M-1 — Dead code: `RunnerUpRace`, `lib/bracket.ts`, and the bracket computation

**Severity:** Medium · **Files:** `src/components/RunnerUpRace.tsx`, `src/lib/bracket.ts`, `src/lib/tournament.ts:95`

`RunnerUpRace` is imported by **nothing** (verified: zero references). `computeBracket`
is called only from `getTournamentData`, and the resulting `bracket` field is
**never read by any consumer** — grep for `.bracket` returns only its own definition.
So `computeBracket()` runs on every render of `/`, `/matches` and `/teams` and its
output is discarded.

Delete `RunnerUpRace.tsx` and `lib/bracket.ts`; drop `bracket` from `TournamentData`.
Keep `groupStageComplete` only if something consumes it — currently nothing does either.

> If the bracket/runner-up panel is *planned* rather than abandoned, say so and I'll
> leave it; the placement question was already flagged as an open item previously.

### M-2 — Dead UI: a "Load more" button in the gallery that does nothing

**Severity:** Medium (user-facing) · **File:** `src/components/GalleryBrowser.tsx:94-96`

```tsx
<button type="button" className="gallery-cta gallery-cta--load">
  Reba izindi
</button>
```

No `onClick`, no handler, no pagination. A visitor clicking it gets silence.
`getGalleryImages()` already returns all (up to 200) images and `GalleryBrowser`
renders all of them, so there is nothing to load. **Remove the button**, or wire it
to genuine pagination if the album count is expected to exceed a screenful.

Related: two empty paragraph elements render nothing —
`Lineups.tsx:79` `<p className="lineup__empty"></p>` and
`MatchCenter.tsx:420` `<p className="perf__empty"></p>`. Delete both.

### M-3 — `@payloadcms/plugin-cloud-storage` is imported but not declared in `package.json`

**Severity:** Medium (build fragility) · **Files:** `package.json`, `src/storage/cloudinary.ts:1`

`src/storage/cloudinary.ts` imports `@payloadcms/plugin-cloud-storage`, which is
resolved only as a transitive dependency of `@payloadcms/storage-vercel-blob`.
Meanwhile `@payloadcms/storage-vercel-blob` itself is **never imported anywhere** —
the `.env` comment confirms Vercel Blob is no longer used.

So the app's media pipeline currently depends on a package that is only present
because of a package it doesn't use. Removing the unused dependency would break
the build.

**Fix.**

```bash
yarn add @payloadcms/plugin-cloud-storage@3.86.0
yarn remove @payloadcms/storage-vercel-blob
```

### M-4 — `/news/[slug]` is a dynamic DB round-trip for what is only a redirect

**Severity:** Medium · **File:** `src/app/(frontend)/news/[slug]/page.tsx`

Every click on a news card hits the origin, queries `articles` by slug at
`depth: 1`, then 307s to the external URL. `revalidate = 300` is declared but the
route builds as `ƒ Dynamic`.

With 18 articles, prerendering all of them is nearly free:

```tsx
export async function generateStaticParams() {
  const articles = await fetchLatestNews({ limit: 200 })
  return articles.map((a) => ({ slug: a.slug }))
}
```

**Better still:** the cards already have `article.url`. Have `NewsCard` and
`LatestNews` link directly to the external URL with `target="_blank"` (which
`FeaturedGrid` already does), and the `/news/[slug]` hop disappears entirely.

**Trade-off:** you lose the internal URL as a click-tracking point. If that
matters, keep the route and prerender it.

### M-5 — `fetchLatestNews` offset pagination over-fetches unboundedly

**Severity:** Medium (latent) · **Files:** `src/lib/news.ts:59-72`, `src/app/(frontend)/api/news/route.ts:10`

```ts
limit: offset + limit,          // fetch everything up to the offset…
…
return res.docs.slice(offset, offset + limit).map(toArticle)   // …then throw most away
```

`offset` in the route handler is clamped at the bottom (`Math.max(0, …)`) but not
at the top, so `/api/news?offset=200000` sends `limit: 200024` to Postgres.
Harmless today (18 rows, measured 1.4 s / 15-byte response) but it is a real
amplification vector as the article count grows.

**Fix.** Use Payload's native pagination and clamp the input:

```ts
// lib/news.ts
const res = await payload.find({
  collection: 'articles',
  where: { visibility: { equals: 'visible' } },
  sort: ['-featured', 'displayOrder', '-publishDate'],
  limit,
  page: Math.floor(offset / limit) + 1,
  depth: 1,
})
return (res.docs as ArticleDoc[]).map(toArticle)
```

```ts
// api/news/route.ts
const offset = Math.min(500, Math.max(0, Number(searchParams.get('offset') ?? 0) || 0))
```

Also add caching to the route — the news list changes rarely:

```ts
return NextResponse.json({ articles }, {
  headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
})
```

### M-6 — `/api/newsletter` has no rate limiting or origin check

**Severity:** Medium (security) · **File:** `src/app/(frontend)/api/newsletter/route.ts`

`Subscribers.access.create` is `() => true` and the route does no throttling, so
anyone can insert unlimited rows with a loop. The existing-email check correctly
avoids leaking membership (returns `{ ok: true, already: true }` either way) —
good. But there is no CSRF/origin guard and no cap.

**Fix (minimum):**

```ts
const origin = req.headers.get('origin')
const allowed = process.env.NEXT_PUBLIC_SITE_URL
if (origin && allowed && !origin.startsWith(allowed)) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
if (email.length > 254) {
  return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
}
```

Plus a simple in-memory or Redis token bucket keyed on IP
(`req.headers.get('x-forwarded-for')`). If Cloudflare fronts this, a WAF rate-limit
rule on `/api/newsletter` is the cheaper answer and needs no code.

### M-7 — No security headers beyond the deliberate embed CSP

**Severity:** Medium · **File:** `next.config.ts:26-35`

The `frame-ancestors *` header on `/embed/:path*` is correct and well-documented.
But the comment states that "every other route keeps the platform's default
(unframed)" — **there is no such default.** Next.js sets no `X-Frame-Options` and
no `frame-ancestors`, so `/`, `/matches`, `/news`, `/teams`, `/gallery` **and
`/admin`** are all framable by any site.

Also absent: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

**Fix.**

```ts
async headers() {
  return [
    {
      source: '/embed/:path*',
      headers: [{ key: 'Content-Security-Policy', value: 'frame-ancestors *' }],
    },
    {
      // Everything that is NOT /embed/*
      source: '/((?!embed).*)',
      headers: [
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    },
  ]
}
```

Verify the `/admin` route still loads — Payload's admin UI is same-origin so
`frame-ancestors 'self'` is safe, but test it.

### M-8 — Dead `webpack` config; build runs on Turbopack

**Severity:** Medium (DX) · **File:** `next.config.ts:36-44`

The build output reads `▲ Next.js 16.2.7 (Turbopack)`, so the `webpack()` hook
setting `resolve.extensionAlias` never executes. If those aliases matter, they
belong under `turbopack.resolveExtensions`; if not (and the build passes without
them), delete the block. Leaving dead config that *looks* load-bearing is a trap
for the next person.

The build also logs `⨯ turbopackServerFastRefresh` under "Experiments (use with
caution)" — worth confirming that is intentional and not inherited from a template.

### M-9 — `SiteHeader` IGIHE logo links to `/` in a new tab

**Severity:** Medium (UX bug) · **File:** `src/components/SiteHeader.tsx:31`

```tsx
<Link href="/" target="_blank">   {/* IGIHE logo */}
```

Clicking the IGIHE brand mark opens **this site's own homepage** in a new tab.
`SiteNav` has a separate "SURA IGIHE" link that correctly goes to
`https://igihe.com/index.php`. This is almost certainly meant to be the same URL.

Also: `target="_blank"` without `rel="noopener noreferrer"` here and on
`LatestNews.tsx:64`. (Modern browsers imply `noopener` for `target="_blank"`, so
this is hygiene rather than a live vulnerability.)

### M-10 — 918 media rows for ~46 content items

**Severity:** Medium (storage/cost) · Collection: `media`

918 Media documents back 22 matches, 10 gallery albums, 14 videos, 18 articles,
12 team crests and 304 player photos. Each generates four derivative sizes on
Cloudinary. A large share is almost certainly orphaned uploads from the bulk-photo
workflow (an already-noted 404 symptom).

**Fix.** A one-off audit script: for each `media` doc, check whether any row in
`matches` (`photos[].image`, `commentary[].images`, `highlightThumb`), `articles`
(`featuredImage`), `gallery-images` (`image`), `videos` (`thumbnail`), `teams`
(`crest`), `players` (`photo`) or the `gallery` global (`heroImage`) references it.
Report, review by hand, then delete. **Do not automate the delete** — a false
positive destroys an editor's asset.

---

## 4. Low findings

### L-1 — Tab widgets are not keyboard-accessible

**Severity:** Low · **Files:** `MatchesTabs`, `TeamsBoard`, `PlayersPerformance`, `MatchCenter`, `Lineups`, `GalleryBrowser`

All six use `role="tablist"` + `role="tab"` + `aria-selected`, but none provide:
- `aria-controls` pointing at a `role="tabpanel"` (there are no tabpanels at all);
- arrow-key navigation between tabs;
- `tabIndex={-1}` on inactive tabs (roving tabindex).

A screen-reader user is told "tab, 1 of 3, selected" and then finds no associated
panel. The `TabShell` component sketched in H-1 fixes all six at once — build the
roving-tabindex + arrow handling into it.

`MatchesTabs.tsx:157,165` also omits `type="button"` on its two tab buttons
(harmless outside a form, but inconsistent with every other tab in the codebase).

### L-2 — Lightboxes have no focus management

**Severity:** Low · **Files:** `GalleryLightbox.tsx`, `VideoLightbox.tsx`, `MatchCenter.tsx` (`PhotoLightbox`)

All three set `role="dialog" aria-modal="true"` and handle Escape correctly, and
they lock body scroll — good. But none:
- move focus into the dialog on open,
- trap Tab within it,
- restore focus to the trigger on close,
- carry an `aria-label` naming the dialog.

Keyboard users tab straight out of the "modal" into the page behind it.

**Fix.** One shared hook used by all three:

```ts
function useDialogFocus(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return
      const f = ref.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [ref])
}
```

Add `tabIndex={-1}` and `aria-label` to each dialog root.

### L-3 — `next/font` loads six Raleway weights; two are barely used

**Severity:** Low · **File:** `src/app/(frontend)/layout.tsx:15-21` (and the identical block in `(embed)/layout.tsx`)

Declared: `['400','500','600','700','800','900']` → 5 emitted woff2 files, ~128 KB.
Actual CSS usage: `700` × 62, `800` × 22, `600` × 15, `500` × 12, **`900` × 5**, `400` × 1
(plus 400 as the implicit body default, so 400 is genuinely needed).

Dropping `900` (and folding those five rules into `800`) saves ~25 KB of font
payload. `display: 'swap'` and the explicit fallback stack are already correct —
no FOIT, minimal CLS. Good as-is otherwise.

Minor: the Raleway config is duplicated verbatim across the two root layouts.
Extract it to `src/lib/fonts.ts` and import in both.

### L-4 — No `loading.tsx` / Suspense outside `/matches/[id]`

**Severity:** Low · Only `src/app/(frontend)/matches/[id]/loading.tsx` exists.

Because the other public routes are static/SSG, they serve instantly and don't
need one — this is mostly fine. Two exceptions worth covering:
- `/gallery`, while it remains dynamic (C-2 removes the need);
- a root `src/app/(frontend)/not-found.tsx` and `error.tsx` — currently a 404 or an
  unhandled render error anywhere outside `/matches/[id]` falls through to Next's
  bare default page, which is exactly the "the site looks broken" outcome the
  existing match-page boundary was added to prevent.

### L-5 — `next.config.ts` `localPatterns` points at a retired path

**Severity:** Low · **File:** `next.config.ts:11-13`

`{ pathname: '/api/media/file/**' }` was for local-disk Payload media. Media now
lives on Cloudinary. Harmless, but it widens the optimiser's allowed input surface
for no reason. Remove it unless the local-disk fallback path is still exercised.

### L-6 — Missing indexes (noted for completeness; not currently a bottleneck)

**Severity:** Low

`articles.visibility`, `gallery-images.visible` and `videos.visible` are filtered
on but unindexed; `articles.publishDate`/`featured`/`displayOrder` are sorted on
but unindexed; `videos` has no index at all.

At 18 / 10 / 14 rows Postgres will sequential-scan these regardless, and adding
indexes would change nothing measurable. **Do not add them for performance.** The
one worth adding on correctness/consistency grounds is a composite index matching
the articles sort, and only if the article count is expected to grow past a few
hundred:

```ts
// Articles.ts
indexes: [{ fields: ['visibility', 'featured', 'displayOrder', 'publishDate'] }],
```

Note that adding this requires the auto-push boot against the DB (this project
runs without migrations), not just `generate:types`.

### L-7 — `.env` labelling is inverted and hazardous

**Severity:** Low (operational) · **File:** `.env`

The active `NEW_DB_DATABASE_URL` is annotated as the *legacy* Neon database, while
the entry described as the real production Postgres is commented out. `.env` is
correctly gitignored and untracked (verified), and the values are not exposed —
but the comments say the opposite of what the file does. Someone acting on the
comments will point the app at the wrong database.

Fix the comments to match reality, and delete the confirmed-dead
`BLOB_READ_WRITE_TOKEN` and legacy `IGIHE_WP_BASE` entries.

### L-8 — Positives worth keeping

Not everything needs fixing. These are done well and should not be "optimised" away:

- **GraphQL introspection is blocked in production** (verified: `__schema` query
  rejected) and `/api/graphql-playground` returns 404. Good.
- **`generateStaticParams` on both match routes** — this is what keeps `/matches/[id]`
  off the 524 path, and the code comment explaining why is exactly right.
- **`React.cache()` on `getPayloadClient`, `getMatchDetail`, `getAllMatchIds`,
  `getActiveLiveMatch`** — correct request-level dedupe, and `getMatchDetail`'s
  `includeOtherMatches: false` for the poll path is a genuinely thoughtful optimisation.
- **`Promise.all` fan-out** in `HomePage`, `getTournamentData`, `getSectionData`,
  `GalleryPage`, `getMatchDetail` — no sequential-await waterfalls anywhere.
- **Per-query `.catch()` degradation** in `getMatchDetail` — a failed sidebar query
  degrades the page instead of throwing it away.
- **`lib/standings.ts`** — pure, well-documented, and the recursive tiebreaker
  resolution is genuinely correct where a flat comparator would be wrong.
- **The `matchStatus.ts` / `matchStats.ts` split** — keeping Payload SDK imports out
  of client-reachable modules is precisely the right instinct.
- **Newsletter membership non-disclosure** — returns the same shape whether or not
  the email already exists.
- **`display: 'swap'` + explicit fallback stack** on the font — no FOIT, minimal CLS.

---

## 5. Rendering strategy — per route

| Route | Today | Should be | Why |
|---|---|---|---|
| `/` | Static, `revalidate 300` | ✅ keep | Correct. |
| `/matches` | Static, `revalidate 300` | ✅ keep rendering, **fix the payload** | See C-1. |
| `/teams` | Static, `revalidate 300` | ✅ keep, split `TeamsBoard` | See H-1. |
| `/news` | Static, `revalidate 300` | ✅ keep | Correct. |
| `/gallery` | **Dynamic** | **Static, `revalidate 300`** | See C-2. |
| `/matches/[id]` | SSG + `revalidate 120` | ✅ keep | Correct, and deliberately so. |
| `/news/[slug]` | Dynamic | SSG, or remove the hop | See M-4. |
| `/embed/section` | Static, `revalidate 60` | ✅ keep | Correct. |
| `/embed/matches/[id]` | SSG + `revalidate 120` | ✅ keep | Correct. |
| `/matches/[id]/live` | Dynamic, `no-store` | Dynamic + `s-maxage=5` + ETag + gzip | See C-3. |
| `/embed/section/data` | Dynamic, `no-store` | Dynamic + `s-maxage=30` + ETag + gzip | See C-3. |

**Partial Prerendering:** not recommended here. PPR earns its keep when a mostly-static
page has a genuinely per-request hole. After C-2, no public route has one — the
live data all arrives via client polling, which is the right choice for a scoreboard
(it survives CDN caching, PPR does not help it).

---

## 6. Caching strategy — recommended durations

| Layer | Target | Recommendation |
|---|---|---|
| ISR — `/`, `/news`, `/teams` | 300 s | Keep. Add `revalidatePath` hooks (H-5) so editors don't wait. |
| ISR — `/matches` | 300 s | Keep. |
| ISR — `/matches/[id]`, `/embed/matches/[id]` | 120 s | Keep. |
| ISR — `/gallery` | — | **Add 300 s** (C-2). |
| ISR — `/embed/section` | 60 s | Keep. |
| Route handler — `/matches/[id]/live` | `no-store` | **`s-maxage=5, swr=25`** + ETag + gzip. |
| Route handler — `/embed/section/data` | `no-store` | **`s-maxage=30, swr=60`** + ETag + gzip. |
| Route handler — `/api/news` | none | **`s-maxage=60, swr=300`**. |
| React `cache()` | already used | Extend to `getPlayerMatchStats` (C-4). |
| Invalidation | `revalidatePath` on Matches only | **Move to `revalidateTag`**; add hooks to Articles/Gallery/Videos. |
| Redis | not present | **Not warranted.** Data is tiny; ISR + CDN covers it. Revisit only if the live-poll fan-out (C-3) proves insufficient after the s-maxage fix. |
| CDN | Cloudflare | The recorded "CF caches nothing" symptom is consistent with `/gallery` being `no-store` and the poll endpoints being `no-store`. Fixing C-2 + C-3 should be re-measured before any further CDN work. |

---

## 7. Dead-code removal checklist

**Files to delete outright**
- `src/components/RunnerUpRace.tsx` — zero references
- `src/lib/bracket.ts` — output never consumed
- `public/fonts/` — no `@font-face` anywhere (280 KB, licensed fonts)
- `public/design/*` except `gallery-hero.jpg` — 33 files, ~7.7 MB
- `public/assets/hero-stadium.jpg` — unreferenced

**Code to remove**
- `GalleryBrowser.tsx:94-96` — the no-op "Reba izindi" button
- `Lineups.tsx:79`, `MatchCenter.tsx:420` — empty `<p>` elements
- `next.config.ts:36-44` — the dead `webpack()` block
- `next.config.ts:11-13` — the retired `localPatterns` entry
- `lib/tournament.ts` — `bracket` / `computeBracket` from `TournamentData`
- `scripts/import-gor-mahia-players.ts:19` — unused `readFileSync` import
- `package.json` — `@payloadcms/storage-vercel-blob` (and add `plugin-cloud-storage`)

**CSS blocks to remove** (all unreferenced in any `.tsx`)
`.article__*` · `.article-body` · `.article__tag*` · `.share-btn` · `.related-*` ·
`.comment*` · `.comment-form__*` · `.approved-article*` · `.page-hero*` ·
`.match-strip` · `.strip-section*` · `.match-card__meta|venue|date` ·
`.brand__mark|sub` · `.brand--light` · `.highlight-card__soon` · `.webp`
— 126 dead selectors in total; ~10 KB.

---

## 8. Scores

| Dimension | Score | Basis |
|---|---:|---|
| Initial page load | **52** | Static/SSG is right, but `/matches` ships 1.27 MB and `/gallery` is uncached at 1.57 s. |
| Bundle size | **48** | 194 KB gzip JS on every page; Lexical renderer in the shared client bundle; 22 client components where ~8 would do. |
| Rendering efficiency | **58** | No waterfalls, good `Promise.all` and `cache()` use — undercut by huge client boundaries and `Date.now()` in render. |
| Database efficiency | **55** | No N+1, correct batching, but blanket `depth: 2`, one entirely wasted full scan, and a duplicated stats query on `/`. |
| API efficiency | **38** | Uncompressed 66 KB poll response, no ETag, no shared cache, ~2 s origin time, full payload every tick. |
| Caching | **60** | ISR windows are sensible and `generateStaticParams` is correctly applied — but `/gallery` escapes it, three collections have no invalidation, and `revalidatePath('/', 'layout')` is a sledgehammer. |
| SEO | **30** | Titles and descriptions exist and embeds are correctly `noindex`. No sitemap, robots, `metadataBase`, OG, canonical or structured data. |
| Accessibility | **58** | Semantic HTML, real `<table>`, alt text, `aria-live`, `aria-label` on icon buttons, good contrast — but no tabpanels, no keyboard tab nav, no focus trapping in three dialogs. |
| Security | **68** | GraphQL introspection blocked, playground 404s, secrets gitignored, access control declared per collection, membership non-disclosure — but no security headers, whole site framable, no rate limiting. |
| Maintainability | **50** | Genuinely excellent comments and a clean lib/collections split — against 93 KB of CSS with 148 duplicated selectors, 22% dead CSS, dead components, and a failing `yarn lint`. |
| Scalability | **45** | Fine at rest; the live-poll path is the constraint. 1,000 concurrent viewers of one match = ~66 origin req/s and ~4.4 MB/s uncompressed egress. |

### Overall: **51 / 100**

The architecture is sound — the rendering strategy is deliberate, the data layer is
well-factored, and the hard problem (CECAFA tiebreakers) is solved correctly. The
score is dragged down by a small number of specific, fixable defects, three of
which (C-1, C-2, C-3) account for most of the gap. **Fixing the four Critical items
alone should move this to roughly 72–75.**

---

## 9. Prioritised roadmap

### 1 — Quick wins (< 30 minutes each)

| # | Task | Impact |
|---|---|---|
| Q1 | **C-2** — drop `searchParams` from `/gallery` | Removes the last uncacheable public route; 1.57 s → ~5 ms |
| Q2 | **C-3(a)** — gzip the two poll route handlers | ~75% off the hottest endpoint's wire size |
| Q3 | **C-4** — share one `player-match-stats` query at `depth: 2` | Fixes a broken tournament rule; −1 query on 3 routes |
| Q4 | **H-4** — delete `public/design/*` (bar one) and `public/fonts/` | 8.9 MB → 0.6 MB |
| Q5 | **M-1/M-2** — delete `RunnerUpRace`, `bracket.ts`, the no-op gallery button, empty `<p>`s | Removes discarded per-render computation and a broken control |
| Q6 | **H-8** — fix the 7 lint errors | Unblocks CI; fixes the late-polling bug |
| Q7 | **M-9** — point the IGIHE logo at igihe.com | Fixes a visible UX bug |
| Q8 | **M-3** — declare `plugin-cloud-storage`, drop `storage-vercel-blob` | Removes a build-breaking latent dependency |

### 2 — High-impact improvements (half a day to two days)

| # | Task | Impact |
|---|---|---|
| B1 | **C-1** — lean `MatchRow` DTO for `/matches` | **1273 KB → ~12 KB.** The single biggest win in the codebase. |
| B2 | **C-3(b,c)** — ETag + `s-maxage=5` on `/matches/[id]/live` and `/embed/section/data` | ~66 req/s → ~0.2 req/s at the origin under load |
| B3 | **H-6** — sitemap, robots, `metadataBase`, OG, canonical, `SportsEvent` JSON-LD | The largest single SEO gap; rich fixture results in search |
| B4 | **H-2** — server-render or lazy-load the Lexical `RichText` | Removes a heavy dependency from the shared client bundle |
| B5 | **H-5** — `afterChange` revalidation on Articles / GalleryImages / Videos / Gallery | Editors stop waiting 5 minutes during a live tournament |
| B6 | **H-7** — convert the 7 `background-image` cards to `next/image`; enable AVIF | 30–50% fewer image bytes on `/` and `/news`; better CLS |
| B7 | **M-7** — security headers on non-embed routes | Closes site-wide clickjacking, adds HSTS/nosniff/referrer policy |

### 3 — Architectural improvements (multi-day)

| # | Task | Impact |
|---|---|---|
| A1 | **H-1** — build a shared `TabShell` and convert `MatchesTabs`, `TeamsBoard`, `PlayersPerformance`, `Lineups` to server components with a client shell | ~30–50 KB gzip off the shared bundle; makes C-1's regression structurally impossible; fixes L-1 for all six widgets at once |
| A2 | **H-3** — merge `design-fidelity.css` into `components.css`, delete the 126 dead selectors, split route-specific CSS into modules | ~25 KB raw off every page; eliminates the 148-selector override hazard |
| A3 | Migrate `revalidatePath` → `revalidateTag` with tags on `getTournamentData` / `getMatchDetail` / `fetchLatestNews` / `getGalleryImages` | Stops one commentary save from invalidating all 40+ routes |
| A4 | **M-10** — orphaned-media audit script (report only; manual deletion) | Reclaims Cloudinary storage; resolves known 404s |
| A5 | **L-2** — shared focus-trap hook across the three lightboxes | Real keyboard accessibility for modal content |

### 4 — Nice to have

- **L-3** — drop Raleway weight 900; extract the shared font config to `lib/fonts.ts` (~25 KB)
- **M-4** — prerender or eliminate `/news/[slug]`
- **M-5** — native Payload pagination in `fetchLatestNews`; clamp `offset`; cache `/api/news`
- **M-6** — rate-limit `/api/newsletter` (or a Cloudflare WAF rule)
- **M-8** — remove the dead `webpack()` block; verify the `turbopackServerFastRefresh` experiment
- **L-4** — root `not-found.tsx` and `error.tsx`
- **L-5** — remove the retired `localPatterns` entry
- **L-7** — correct the inverted `.env` comments; drop dead env vars
- **H-7 (cont.)** — scope `remotePatterns` to the Cloudinary cloud name rather than `/**`

---

## 10. Implementation status

A second pass implemented most of the roadmap. Verified with a clean `yarn build`
plus `npx tsc --noEmit` after every step.

### Measured before → after

| Page | HTML raw | HTML gzip | RSC flight |
|---|---|---|---|
| **`/matches`** | 1273 KB → **43 KB** | 85 KB → **6 KB** | 1252 KB → **20 KB** |
| `/gallery` | dynamic, `no-store`, 1.57 s | → **Static, `revalidate 300`**, 39 KB | — |
| `/` | 101 KB → 113 KB | 13 KB → 14 KB | 41 KB → 45 KB |
| `/news` | 30 KB → 51 KB | 6 KB → 8 KB | 17 KB → 18 KB |

`/` and `/news` grew slightly: `next/image` emits `srcset`/`sizes` markup where a
CSS `background-image` emitted one URL. That is a few KB of HTML traded for
responsive, AVIF-negotiated, lazy-loaded images — a clear net win on the wire.

Other measured results: `public/` **8.9 MB → 2.9 MB**; `yarn lint` **8 problems → 3**
(all three remaining are in a file owned by a concurrent session, see below).

### Done

| Item | What landed |
|---|---|
| **C-1** | `lib/matchView.ts` + `CrestView`; `/matches` no longer serialises `depth: 2` docs |
| **C-2** | `/gallery` drops `searchParams`; `?category=` read client-side via `useSyncExternalStore` |
| **C-3** | `lib/jsonResponse.ts` — gzip + ETag/304 + `s-maxage` on both poll routes; clients switched `no-store` → `no-cache` so conditional requests actually fire |
| **H-5** | `afterChange`/`afterDelete` revalidation on Articles, GalleryImages, Videos, Gallery global |
| **H-6** | `metadataBase`, OG/Twitter, canonicals, title template, `sitemap.ts`, `robots.ts`, tournament + per-fixture `SportsEvent` JSON-LD |
| **H-7** | `NewsCard` + `LatestNews` converted to `next/image`; AVIF enabled; Cloudinary `remotePatterns` scoped to our cloud name |
| **H-8** | `Date.now()` moved out of render into `LiveMatchProvider` (also fixes the late-poll bug); entity escapes; unused import |
| **H-4 / M-2** | 30 dead assets removed; no-op gallery "Reba izindi" button and two empty `<p>`s deleted |
| **M-3** | `@payloadcms/plugin-cloud-storage` declared; unused `@payloadcms/storage-vercel-blob` removed |
| **M-7** | CSP `frame-ancestors`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS |
| **L-3 (part)** | Font config deduplicated into `lib/fonts.ts` |

### Two bugs found while implementing

1. **`images.localPatterns` rejected the gallery hero fallback.** The config
   allowed only `/api/media/file/**` and `/assets/**`, but `getGalleryHero()`
   falls back to `/design/gallery-hero.jpg` and renders it through `next/image`.
   When `localPatterns` is set, a non-matching local path is refused by the
   optimiser — so the fallback hero would 400 whenever no banner was uploaded.
   Fixed by allowing `/design/**`.

2. **`robots.ts` must live at the app root when there are multiple root layouts.**
   Placed in `src/app/(frontend)/`, it silently produced no route (verified: 404,
   and absent from the build manifest) while `sitemap.ts` in the same directory
   worked fine. Moved to `src/app/robots.ts`; both now build and serve.

### Not done, and why

- **H-2** (Lexical `RichText` out of the client bundle), **A2** (CSS merge/dead-CSS
  sweep), **C-4** (the always-zero fair-play tiebreaker), and the `MatchCenter`
  lint errors all require editing `src/lib/tournament.ts`, `src/components/MatchCenter.tsx`
  or `src/app/(frontend)/components.css`. **Those files were being actively
  rewritten by a concurrent session** during this work (an inline-YouTube-in-commentary
  feature). They were left untouched rather than risk clobbering that work.
- **H-1 / A1** (server-component split behind a `TabShell`) is the remaining large
  win — ~30–50 KB gzip off every page, and it fixes L-1 for all six tab widgets.
  Deliberately deferred: it is an architectural change, not a quick fix.
- **Raleway weight 900** was kept. It is still used by two live rules
  (`.perf__stat`, `.news-card__img-fallback`), so dropping it would restyle them —
  a visual change, not an optimisation. Retire it with the dead-CSS sweep.
- **`Highlights.tsx` image conversion** was skipped: `.highlight-card__pitch` has a
  static-positioned `.highlight-card__play` child that would paint *under* an
  absolutely-positioned `fill` image. It needs a paired `z-index` rule in
  `components.css` — the concurrent-session file.

### Still needs your decision

1. **`RunnerUpRace` / `lib/bracket.ts` (M-1)** — zero references, and
   `computeBracket()` runs on every render with its output never read. Abandoned
   (delete) or planned (wire up)? Left in place pending your answer.
2. **`/gallery` deep links (C-2)** — implemented as a client-side read, so a shared
   `?category=Trophy` link paints "All" for one frame before switching. If that is
   not acceptable, the alternative is a real `/gallery/[category]` segment with
   `generateStaticParams`.

### Required before deploy

**Set `NEXT_PUBLIC_SITE_URL`.** Canonical URLs, Open Graph, the sitemap and
robots.txt all need the real public origin, and it cannot be detected at build
time. It currently falls back to the placeholder `https://kagamecup.igihe.com` in
`src/lib/site.ts`. See the new entry in `.env.example`.
