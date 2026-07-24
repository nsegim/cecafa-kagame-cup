import type { CollectionConfig } from 'payload'

/**
 * The video pool for the homepage Highlights carousel — newest first.
 *
 * Kept generic (a title, not a forced "Team A vs Team B") because not every
 * video is match footage — press conferences, training clips and interviews
 * belong here too. When this collection is empty, the homepage falls back to
 * an automatic pick from match highlight data (see getHighlightCards in
 * src/app/(frontend)/page.tsx).
 */
export const Videos: CollectionConfig = {
  slug: 'videos',
  labels: { singular: 'Video', plural: 'Videos' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'visible', 'createdAt'],
    group: 'Content',
    description: 'Clips shown in the homepage Highlights carousel, newest-added first.',
  },
  access: {
    read: () => true,
  },
  defaultSort: '-createdAt',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'e.g. "APR FC vs Vipers SC — Extended Highlights" or "Press Conference Ahead of CECAFA".' },
    },
    {
      name: 'dateLabel',
      label: 'Date Label',
      type: 'text',
      admin: { description: 'Optional short label shown under the title, e.g. "Fri 24 Jul".' },
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'The preview photo shown on the card.' },
    },
    {
      name: 'videoUrl',
      label: 'Video URL',
      type: 'text',
      admin: { description: 'YouTube/highlight link. Leave blank for a static card with no link.' },
    },
    {
      name: 'visible',
      label: 'Visible',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Show this video in the Highlights carousel. Uncheck to hide it without deleting it.',
      },
    },
  ],
}
