import type { GlobalConfig } from 'payload'

/**
 * Gallery page presentation setting — the single editable instance, so a
 * global rather than a collection.
 *
 * The gallery items themselves (and the home-page mosaic, which is simply the
 * first nine of the same list) live entirely in the `gallery-images`
 * collection — that's the one source of truth for all gallery content. This
 * global only holds the /gallery hero banner, which isn't a gallery item.
 */
export const Gallery: GlobalConfig = {
  slug: 'gallery',
  label: 'Gallery',
  admin: {
    group: 'Content',
    description: 'The banner image at the top of the /gallery page.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Banner image across the top of the /gallery page.' },
    },
  ],
}
