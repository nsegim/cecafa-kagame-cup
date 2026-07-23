import type { GlobalConfig } from 'payload'

/** Editor-controlled homepage content. */
export const Homepage: GlobalConfig = {
  slug: 'homepage',
  label: 'Match Highlights',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'matchHighlights',
      type: 'array',
      label: 'Match Highlights',
      minRows: 0,
      maxRows: 9,
      labels: { singular: 'Highlight', plural: 'Highlights' },
      admin: {
        description:
          'Featured clips shown in the Match Highlights section. Falls back to an automatic pick from match data if left empty.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'homeTeam',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "APR FC"' },
        },
        {
          name: 'awayTeam',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "Vipers SC"' },
        },
        {
          name: 'dateLabel',
          type: 'text',
          admin: { description: 'e.g. "Fri 24 Jul"' },
        },
        {
          name: 'thumbnail',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'The action photo shown on the card.' },
        },
        {
          name: 'videoUrl',
          type: 'text',
          admin: { description: 'YouTube/highlight link. Leave blank for a static card with no link.' },
        },
      ],
    },
  ],
}
