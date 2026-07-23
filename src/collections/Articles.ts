import type { CollectionConfig } from 'payload'

/**
 * External news links, curated by the newsroom.
 *
 * Articles are NOT written or stored here — IGIHE keeps publishing in its own
 * newsroom. This collection only controls WHICH external stories surface on the
 * site, in what order, and whether they are visible. Clicking an article on the
 * frontend sends the reader to `externalUrl`.
 *
 * The shape returned to the frontend is mapped in `src/lib/news.ts` to the
 * existing `Article` interface, so the news components stay untouched.
 */

/** Kebab-case a headline into a URL slug (used only for the internal redirect route). */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 96)
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: { singular: 'Article', plural: 'Articles' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'featured', 'visibility', 'publishDate'],
    group: 'Content',
    description:
      'External news links shown on the site. Editors control the image, headline, blurb, destination URL, ordering and visibility — clicking a card opens the external story.',
  },
  access: {
    // Public sees only visible articles; authenticated staff see everything.
    read: ({ req }) => {
      if (req.user) return true
      return { visibility: { equals: 'visible' } }
    },
  },
  defaultSort: '-publishDate',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'The headline shown on the news card.' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Auto-generated from the title. Used only for the internal link that redirects to the external URL.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => value || (data?.title ? slugify(data.title) : value),
        ],
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'Card image (16:9 works best).' },
    },
    {
      name: 'shortDescription',
      type: 'textarea',
      required: true,
      admin: { description: 'One or two sentences — the excerpt shown under the headline.' },
    },
    {
      name: 'externalUrl',
      type: 'text',
      required: true,
      validate: (value: string | string[] | null | undefined) => {
        if (!value || typeof value !== 'string') return 'An external URL is required.'
        try {
          const url = new URL(value)
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return 'URL must start with http:// or https://'
          }
          return true
        } catch {
          return 'Enter a valid URL, e.g. https://igihe.com/…'
        }
      },
      admin: { description: 'Where the reader is taken when they click the article.' },
    },
    {
      name: 'category',
      type: 'text',
      admin: {
        description: 'Optional tag shown on the card, e.g. "Analysis", "Interview".',
      },
    },
    {
      name: 'readingMinutes',
      type: 'number',
      min: 1,
      defaultValue: 3,
      admin: {
        position: 'sidebar',
        description: 'Approximate read time shown as "X min read".',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Featured articles lead the news sections.',
      },
    },
    {
      name: 'displayOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first (within the same featured group).',
      },
    },
    {
      name: 'visibility',
      type: 'select',
      required: true,
      defaultValue: 'visible',
      options: [
        { label: 'Visible', value: 'visible' },
        { label: 'Hidden', value: 'hidden' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Hide an article without deleting it.',
      },
    },
    {
      name: 'publishDate',
      type: 'date',
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Shown as the article date and used for ordering.',
      },
    },
  ],
}
