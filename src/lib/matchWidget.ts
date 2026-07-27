/**
 * The self-contained JSON contract for the `<cecafa-match>` web component.
 *
 * Unlike `/matches/[id]/live` (which carries only the mid-match slice — the
 * page it feeds already rendered the crests, names and meta on the server), a
 * cross-origin widget has NO server render of its own: it starts from nothing
 * on a stranger's page. So this payload is everything the feed needs to draw
 * itself from cold — identity, meta, scoreline, feed and stats — and the
 * component simply re-fetches it to stay live.
 *
 * All editor rich text is rendered to HTML *here*, on the server, from Lexical's
 * structured nodes (never raw HTML). The component injects those strings as-is,
 * so the safety of what lands in a partner's page is decided in this file, not
 * in the browser.
 */
import type { MatchDetail, MatchEvent } from './tournament'
import { effectiveMatchStatus } from './matchStatus'
import { toMatchRow, type SideView } from './matchView'
import { matchSideStats, type MatchSideStats } from './matchStats'
import { richTextToPlainText } from './richText'
import { findYouTubeUrls } from './video'
import { matchTime } from './datetime'

export interface WidgetEvent {
  /** "45'", "HT", "FT", or "" — mirrors the match page's minute column. */
  minuteLabel: string
  type: MatchEvent['type']
  /** The auto-generated headline (GOAL!, cards, subs, whistles) as HTML, or ''. */
  captionHtml: string
  /** The editor's rich-text body as sanitised HTML, or '' when there is none. */
  bodyHtml: string
  /** YouTube embed URLs to play inline under this entry. */
  videos: string[]
  images: { url: string; width: number; height: number }[]
  /** Caption shown under a single photo ("Player · 72'"), already assembled. */
  photoCaption: string
}

export interface MatchWidgetData {
  id: number
  /** Whether the client should keep polling — live now, or kicking off soon. */
  live: boolean
  status: 'scheduled' | 'live' | 'final'
  /** "Group B", "Semi-final", … */
  metaLabel: string
  /** Local kickoff time, e.g. "18:00" — shown in place of a score before KO. */
  kickoffLabel: string
  home: WidgetSide
  away: WidgetSide
  homeScore: number
  awayScore: number
  stats: { home: MatchSideStats; away: MatchSideStats }
  events: WidgetEvent[]
  photos: string[]
}

export interface WidgetSide {
  label: string
  shortLabel: string
  crestUrl: string | null
  monogram: string
}

const STAGE_LABEL: Record<string, string> = {
  group: 'Group Stage',
  semi: 'Semi-final',
  third: 'Third-place play-off',
  final: 'Final',
}

const KICKOFF_SOON_MS = 30 * 60 * 1000

function toWidgetSide(s: SideView): WidgetSide {
  return { label: s.label, shortLabel: s.shortLabel, crestUrl: s.crestUrl, monogram: s.crestMonogram }
}

// ---- Minute + caption (kept in step with MatchCenter's eventMinuteLabel /
//      eventCaption; those return JSX for our own page, these return HTML for a
//      partner's). Any wording change must be made in both. ----

function eventMinuteLabel(e: MatchEvent): string {
  if (e.type === 'halftime') return 'HT'
  if (e.type === 'fulltime') return 'FT'
  if (e.type === 'postmatch') return ''
  return e.minute != null ? `${e.minute}'` : ''
}

function eventCaptionHtml(e: MatchEvent, homeName: string, awayName: string): string {
  const team = e.side === 'home' ? homeName : e.side === 'away' ? awayName : ''
  const t = (s: string) => esc(s)
  switch (e.type) {
    case 'goal': {
      const scorer = e.playerName ? `${e.playerName}${team ? ` — ${team}` : ''}` : team
      return `<strong>GOAL!</strong>${scorer ? ` ${t(scorer)}` : ''}. Igitego kirinjiye.`
    }
    case 'yellow':
      return `${t(e.playerName ?? '')}${team ? ` (${t(team)})` : ''} ahawe ikarita y'umuhondo.`
    case 'red':
      return `<strong>Ikarita y'umutuku.</strong> ${t(e.playerName ?? '')}${team ? ` (${t(team)})` : ''} avuye mu kibuga.`
    case 'substitution':
      return `<strong>Gusimbuza${team ? ` — ${t(team)}` : ''}.</strong> ${t(e.playerOutName ?? 'Player')} avuyemo, ${t(e.playerInName ?? 'Player')} arinjiye.`
    case 'kickoff':
      return `<strong>Umukino uratangiye!</strong>`
    case 'halftime':
      return `<strong>Ikiruhuko.</strong>`
    case 'secondhalf':
      return `<strong>Umukino urakomeje!</strong>`
    case 'fulltime':
      return `<strong>Umukino urarangiye.</strong>`
    case 'postmatch':
    case 'note':
    default:
      return ''
  }
}

// ---- Safe Lexical → HTML ----

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 1 << 1
const FORMAT_STRIKE = 1 << 2
const FORMAT_UNDERLINE = 1 << 3
const FORMAT_CODE = 1 << 4

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Only allow hrefs the browser can't be tricked by — no javascript:/data:. */
function safeHref(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const trimmed = url.trim()
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
  return null
}

type LexNode = {
  type?: string
  text?: string
  format?: number | string
  tag?: string
  listType?: string
  fields?: { url?: unknown; newTab?: boolean }
  children?: LexNode[]
}

function renderText(node: LexNode): string {
  let html = esc(node.text ?? '')
  const f = typeof node.format === 'number' ? node.format : 0
  if (f & FORMAT_CODE) html = `<code>${html}</code>`
  if (f & FORMAT_BOLD) html = `<strong>${html}</strong>`
  if (f & FORMAT_ITALIC) html = `<em>${html}</em>`
  if (f & FORMAT_UNDERLINE) html = `<u>${html}</u>`
  if (f & FORMAT_STRIKE) html = `<s>${html}</s>`
  return html
}

function renderChildren(nodes: LexNode[] | undefined): string {
  if (!Array.isArray(nodes)) return ''
  return nodes.map(renderNode).join('')
}

function renderNode(node: LexNode): string {
  if (!node || typeof node !== 'object') return ''
  switch (node.type) {
    case 'text':
      return renderText(node)
    case 'linebreak':
      return '<br>'
    case 'link':
    case 'autolink': {
      const href = safeHref(node.fields?.url)
      const inner = renderChildren(node.children)
      if (!href) return inner
      return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer nofollow">${inner}</a>`
    }
    case 'heading': {
      // Flatten to a bold paragraph — a partner's feed column is no place for a
      // real <h2> in their document outline.
      return `<p><strong>${renderChildren(node.children)}</strong></p>`
    }
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul'
      return `<${tag}>${renderChildren(node.children)}</${tag}>`
    }
    case 'listitem':
      return `<li>${renderChildren(node.children)}</li>`
    case 'quote':
      return `<blockquote>${renderChildren(node.children)}</blockquote>`
    case 'paragraph': {
      // A paragraph that is nothing but a video link is dropped — the player
      // renders below instead (mirrors MatchCenter's isBareVideoParagraph).
      const plain = richTextToPlainText(node)
      if (
        findYouTubeUrls(plain).length > 0 &&
        plain.replace(/https?:\/\/[^\s<>"']+/g, '').trim() === ''
      ) {
        return ''
      }
      const inner = renderChildren(node.children)
      return inner ? `<p>${inner}</p>` : ''
    }
    default:
      // Unknown block: render whatever text it wraps rather than dropping it.
      return renderChildren(node.children)
  }
}

function richTextToHtml(value: unknown): string {
  const root = (value as { root?: LexNode } | null | undefined)?.root
  if (!root || !Array.isArray(root.children)) return ''
  return renderChildren(root.children).trim()
}

function toWidgetEvent(e: MatchEvent, homeName: string, awayName: string): WidgetEvent {
  const minuteLabel = eventMinuteLabel(e)
  const images = (e.images ?? []).map((i) => ({ url: i.url, width: i.width, height: i.height }))
  const photoCaption = [
    e.playerName || (e.side === 'home' ? homeName : e.side === 'away' ? awayName : ''),
    minuteLabel,
  ]
    .filter(Boolean)
    .join(' · ')
  return {
    minuteLabel,
    type: e.type,
    captionHtml: eventCaptionHtml(e, homeName, awayName),
    bodyHtml: richTextToHtml(e.text),
    videos: e.videos ?? [],
    images,
    photoCaption,
  }
}

export function buildMatchWidgetData(detail: MatchDetail): MatchWidgetData {
  const { match, events, photos } = detail
  const row = toMatchRow(match)
  const status = effectiveMatchStatus(match)
  const homeScore = match.homeScore ?? 0
  const awayScore = match.awayScore ?? 0
  const { home: homeStats, away: awayStats } = matchSideStats(events, homeScore, awayScore)
  const metaLabel = match.group ? `Group ${match.group}` : (STAGE_LABEL[match.stage] ?? '')
  const live =
    status === 'live' ||
    (status === 'scheduled' && new Date(match.kickoff).getTime() - Date.now() < KICKOFF_SOON_MS)

  return {
    id: match.id,
    live,
    status,
    metaLabel,
    kickoffLabel: matchTime(match.kickoff),
    home: toWidgetSide(row.home),
    away: toWidgetSide(row.away),
    homeScore,
    awayScore,
    stats: { home: homeStats, away: awayStats },
    events: events.map((e) => toWidgetEvent(e, row.home.label, row.away.label)),
    photos,
  }
}
