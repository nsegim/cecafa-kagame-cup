import type { CollectionConfig, FilterOptions, PayloadRequest, Validate } from 'payload'
import { revalidatePath } from 'next/cache'
import { richTextHasContent } from '../lib/richText'
import { COMMENTARY_TYPES } from './Matches'

/**
 * One Live Expressions entry — a goal, card, substitution, whistle marker, or
 * an editor's own words and photos.
 *
 * WHY THIS IS A COLLECTION AND NOT AN ARRAY ON `matches`.
 *
 * It used to be `matches.commentary`, an array field. Payload stores array
 * fields as child tables and replaces them wholesale on every parent save, so
 * adding one line during a live game meant: load the whole match (499 KB for a
 * busy fixture), PATCH the entire document back, and let Postgres wipe and
 * re-insert every commentary row, every photo row and ~169 relationship rows in
 * one transaction. The cost grew with the match — entry 58 was far dearer than
 * entry 1, precisely when editors type fastest.
 *
 * It also lost data. The admin submits the whole form, so the array was
 * replaced entire: two editors on one match (a commentator and a photographer,
 * the normal setup) each saved an array missing the other's newest entry, and
 * the second save silently erased the first. As separate rows there is nothing
 * to collide over — each entry is its own INSERT.
 *
 * Ordering is by `sequence`, assigned on create, so entries posted in the same
 * minute keep the order they were written in. The public feed sorts on minute
 * first and falls back to this (see `orderMatchFeed`).
 */

const TEAM_COMMENTARY_TYPES = ['goal', 'yellow', 'red', 'substitution']
const TEXT_COMMENTARY_TYPES = ['note', 'postmatch']

type CommentaryData = {
  type?: string | null
  team?: 'home' | 'away' | null
  match?: unknown
  images?: unknown
}

function asCommentary(data: unknown): CommentaryData {
  return (data as CommentaryData | undefined) ?? {}
}

/**
 * Restricts the player picker to the squad of whichever side this entry is for.
 *
 * On the array this could read `data.homeTeam` straight off the match form. A
 * standalone entry only knows its `match`, so the fixture is looked up to find
 * the two sides. Returning `true` on any miss leaves the picker unfiltered
 * rather than empty — an editor is never blocked by this.
 */
const commentaryPlayerFilter: FilterOptions = async ({ data, req }) => {
  const entry = asCommentary(data)
  if (!entry.team || !entry.match) return true
  const matchId =
    typeof entry.match === 'object' ? (entry.match as { id?: number }).id : Number(entry.match)
  if (!matchId) return true
  try {
    const match = await req.payload.findByID({
      collection: 'matches',
      id: matchId,
      depth: 0,
    })
    const teamRef = entry.team === 'home' ? match.homeTeam : match.awayTeam
    const teamId =
      teamRef && typeof teamRef === 'object' ? (teamRef as { id?: number }).id : teamRef
    return teamId ? { team: { equals: teamId } } : true
  } catch {
    return true
  }
}

const validateTeam: Validate = (value, { data }) => {
  if (TEAM_COMMENTARY_TYPES.includes(asCommentary(data).type ?? '') && !value) {
    return 'Select which team this is for.'
  }
  return true
}

const validateText: Validate = (value, { data }) => {
  const row = asCommentary(data)
  // A photo can be the whole update — a dressing-room shot at the interval, a
  // trophy lift after the whistle — so an entry carrying images needs no words.
  const hasImages = Array.isArray(row.images) ? row.images.length > 0 : Boolean(row.images)
  if (
    TEXT_COMMENTARY_TYPES.includes(row.type ?? 'note') &&
    !richTextHasContent(value) &&
    !hasImages
  ) {
    return 'Enter the update text, or attach a photo.'
  }
  return true
}

const validatePlayerForCard: Validate = (value, { data }) => {
  // The scorer is optional for a goal — the squad may not be loaded yet, and the
  // goal still counts for the team. Cards always name the player booked.
  if (['yellow', 'red'].includes(asCommentary(data).type ?? '') && !value) {
    return 'Select the player this happened to.'
  }
  return true
}

const validatePlayerOff: Validate = (value, { data }) =>
  asCommentary(data).type === 'substitution' && !value
    ? 'Select the player coming off.'
    : true

const validatePlayerOn: Validate = (value, { data }) =>
  asCommentary(data).type === 'substitution' && !value ? 'Select the player coming on.' : true

/** The id of the match an entry belongs to, however the relationship is shaped. */
function matchIdOf(doc: { match?: unknown }): number | null {
  const ref = doc?.match
  if (ref == null) return null
  if (typeof ref === 'object') return (ref as { id?: number }).id ?? null
  return Number(ref) || null
}

/**
 * Recompute the parent match's scoreline from its goal entries, and refresh the
 * pages that show it.
 *
 * The scoreline has always been derived from goal commentary (an editor scores
 * a goal on the feed and the scoreboard follows). That derivation used to live
 * in the match's own `beforeValidate`, reading the array it was saved with.
 * With entries as their own rows, the trigger moves here: whenever an entry is
 * created, edited or deleted, the parent is brought back into agreement.
 *
 * `manualScore` still wins — an editor who typed a result by hand keeps it.
 */
async function syncMatchScore(matchId: number, req: PayloadRequest) {
  // EVERY nested call passes `req`. Without it Payload opens a SEPARATE database
  // transaction, which then waits for a lock the caller's own transaction is
  // still holding — the insert deadlocks against itself and the write hangs
  // until something times out. `req` makes these join the caller's transaction.
  const match = (await req.payload.findByID({
    collection: 'matches',
    id: matchId,
    depth: 0,
    req,
  })) as { manualScore?: boolean | null; homeScore?: number | null; awayScore?: number | null }

  if (match?.manualScore) return

  const goals = await req.payload.find({
    collection: 'match-commentary',
    where: {
      match: { equals: matchId },
      type: { equals: 'goal' },
      hidden: { not_equals: true },
    },
    limit: 500,
    depth: 0,
    pagination: false,
    req,
  })

  const rows = goals.docs as { team?: string | null }[]
  // No goals logged at all leaves whatever is stored alone, so a knockout result
  // typed straight in isn't wiped by an empty feed.
  if (rows.length === 0) return

  const home = rows.filter((r) => r.team === 'home').length
  const away = rows.filter((r) => r.team === 'away').length
  if (home === match.homeScore && away === match.awayScore) return

  await req.payload.update({
    collection: 'matches',
    id: matchId,
    data: { homeScore: home, awayScore: away },
    depth: 0,
    req,
  })
}

function revalidateMatch(matchId: number | null) {
  try {
    if (matchId) {
      revalidatePath(`/matches/${matchId}`)
      revalidatePath(`/embed/matches/${matchId}`)
    }
    revalidatePath('/matches')
    revalidatePath('/')
    revalidatePath('/embed/section')
  } catch {
    // Not inside a Next request (a seed or import script) — nothing to bust.
  }
}

export const MatchCommentary: CollectionConfig = {
  slug: 'match-commentary',
  labels: { singular: 'Live Commentary Entry', plural: 'Live Commentary' },
  admin: {
    useAsTitle: 'summary',
    defaultColumns: ['match', 'minute', 'type', 'summary', 'hidden'],
    group: 'Tournament',
    description:
      'Everything that happens in a match, in order. Each entry saves on its own, so two people can post to the same match at once without overwriting each other.',
    listSearchableFields: ['summary'],
  },
  access: {
    read: () => true,
  },
  defaultSort: 'sequence',
  indexes: [{ fields: ['match', 'sequence'] }],
  fields: [
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      required: true,
      index: true,
      // `maxDepth: 0` — return the id, never the fixture itself. At depth 1 each
      // entry populated its whole parent match (~55 KB), so reading one match's
      // 58 entries pulled 3.5 MB, and its 194 photos pulled 11.2 MB — the parent
      // document repeated once per child row. Nothing reads it: the caller
      // already knows which match it queried.
      maxDepth: 0,
      admin: { description: 'Which fixture this entry belongs to.' },
    },
    {
      name: 'summary',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Auto-generated for the admin list view.',
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const row = asCommentary(data)
            const minute = (data as { minute?: number | null })?.minute
            const label =
              COMMENTARY_TYPES.find((t) => t.value === (row.type ?? 'note'))?.label ?? 'Update'
            return minute != null ? `${minute}' ${label}` : label
          },
        ],
      },
    },
    {
      name: 'sequence',
      type: 'number',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Posting order within the match. Entries sharing a minute are shown newest-first by this.',
      },
      hooks: {
        beforeChange: [
          async ({ value, operation, data, req }) => {
            if (operation !== 'create' || typeof value === 'number') return value
            const matchId = matchIdOf(asCommentary(data))
            if (!matchId) return 0
            // One cheap indexed read to land after the match's current last entry.
            // `req` is passed so this joins the caller's transaction rather than
            // opening its own and contending with the insert it belongs to.
            const last = await req.payload.find({
              collection: 'match-commentary',
              where: { match: { equals: matchId } },
              sort: '-sequence',
              limit: 1,
              depth: 0,
              req,
            })
            const top = (last.docs[0] as { sequence?: number } | undefined)?.sequence ?? 0
            return top + 1
          },
        ],
      },
    },
    {
      name: 'minute',
      type: 'number',
      min: 0,
      max: 120,
      admin: {
        condition: (_, s) => s?.type !== 'postmatch',
        description:
          'Match minute, e.g. 62. Always optional — an entry with no minute lands wherever the match has reached, above the entries already there.',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'note',
      index: true,
      options: [...COMMENTARY_TYPES],
      admin: { description: 'Determines which icon/graphic this entry shows with on the feed.' },
    },
    {
      name: 'team',
      label: 'Team',
      type: 'select',
      options: [
        { label: 'Home', value: 'home' },
        { label: 'Away', value: 'away' },
      ],
      validate: validateTeam,
      admin: {
        condition: (_, s) => TEAM_COMMENTARY_TYPES.includes(s?.type),
        description: 'Which side this happened for.',
      },
    },
    {
      name: 'player',
      label: 'Player',
      type: 'relationship',
      relationTo: 'players',
      maxDepth: 1,
      validate: validatePlayerForCard,
      filterOptions: commentaryPlayerFilter,
      admin: {
        condition: (_, s) => ['goal', 'yellow', 'red'].includes(s?.type),
        description:
          'Who scored or was booked. Optional for a goal — the goal still counts for the team.',
      },
    },
    {
      name: 'playerOff',
      label: 'Player Off',
      type: 'relationship',
      relationTo: 'players',
      maxDepth: 1,
      validate: validatePlayerOff,
      filterOptions: commentaryPlayerFilter,
      admin: {
        condition: (_, s) => s?.type === 'substitution',
        description: 'Player being substituted off.',
      },
    },
    {
      name: 'playerOn',
      label: 'Player On',
      type: 'relationship',
      relationTo: 'players',
      maxDepth: 1,
      validate: validatePlayerOn,
      filterOptions: commentaryPlayerFilter,
      admin: {
        condition: (_, s) => s?.type === 'substitution',
        description: 'Player coming on.',
      },
    },
    {
      name: 'text',
      type: 'richText',
      validate: validateText,
      admin: {
        description:
          'The update text. Paste a YouTube link on its own line and it plays right here on the feed.',
      },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Optional photos for this update, shown here on the feed in this order.',
      },
    },
    {
      name: 'hidden',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Hide this entry from the public feed without deleting it.',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, context }) => {
        const matchId = matchIdOf(doc)
        // The bulk migration sets this: it inserts hundreds of entries and syncs
        // each match's score once at the end instead of after every single row.
        if (matchId && !context?.skipScoreSync) {
          try {
            await syncMatchScore(matchId, req)
          } catch (err) {
            // A scoreline that failed to refresh must not fail the editor's save —
            // the entry itself is the thing they cannot afford to lose.
            console.error(`[match-commentary] score sync failed for match ${matchId}:`, err)
          }
        }
        revalidateMatch(matchId)
      },
    ],
    afterDelete: [
      async ({ doc, req, context }) => {
        const matchId = matchIdOf(doc)
        // The bulk migration sets this: it inserts hundreds of entries and syncs
        // each match's score once at the end instead of after every single row.
        if (matchId && !context?.skipScoreSync) {
          try {
            await syncMatchScore(matchId, req)
          } catch (err) {
            console.error(`[match-commentary] score sync failed for match ${matchId}:`, err)
          }
        }
        revalidateMatch(matchId)
      },
    ],
  },
}
