import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

/**
 * One photo from a match, for the Match Photos tab.
 *
 * Split out of `matches.photos` for the same reason Live Commentary was — see
 * `MatchCommentary` for the full account. Photos were the LARGER half of the
 * problem: one fixture had 194 entries, and because a populated Media document
 * weighs ~1.4 KB, that array alone accounted for 269 KB of the 499 KB an editor
 * loaded (and re-saved) every time they touched the match.
 *
 * As rows they are paginated by the admin, uploaded one at a time by the bulk
 * uploader, and deleting one no longer rewrites the other 193.
 */

function matchIdOf(doc: { match?: unknown }): number | null {
  const ref = doc?.match
  if (ref == null) return null
  if (typeof ref === 'object') return (ref as { id?: number }).id ?? null
  return Number(ref) || null
}

function revalidateMatch(matchId: number | null) {
  try {
    if (matchId) {
      revalidatePath(`/matches/${matchId}`)
      revalidatePath(`/embed/matches/${matchId}`)
    }
    revalidatePath('/matches')
  } catch {
    // Not inside a Next request (a seed or import script) — nothing to bust.
  }
}

export const MatchPhotos: CollectionConfig = {
  slug: 'match-photos',
  labels: { singular: 'Match Photo', plural: 'Match Photos' },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['match', 'image', 'sequence'],
    group: 'Tournament',
    description:
      'Photos shown in a match’s Match Photos tab. Newest-added appear first on the site.',
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
      maxDepth: 1,
      admin: { description: 'Which fixture this photo belongs to.' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'sequence',
      type: 'number',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Upload order within the match.',
      },
      hooks: {
        beforeChange: [
          async ({ value, operation, data, req }) => {
            if (operation !== 'create' || typeof value === 'number') return value
            const matchId = matchIdOf(data as { match?: unknown })
            if (!matchId) return 0
            // `req` is passed so this joins the caller's transaction rather than
            // opening its own and contending with the insert it belongs to.
            const last = await req.payload.find({
              collection: 'match-photos',
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
  ],
  hooks: {
    afterChange: [({ doc }) => revalidateMatch(matchIdOf(doc))],
    afterDelete: [({ doc }) => revalidateMatch(matchIdOf(doc))],
  },
}
