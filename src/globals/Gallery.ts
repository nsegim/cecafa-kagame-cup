import type { GlobalConfig } from 'payload'

/**
 * Gallery presentation settings — the single editable instance, so a global
 * rather than a collection.
 *
 *  - `heroImage`  the banner photo at the top of the /gallery page.
 *  - `homeTiles`  the ordered 9-tile mosaic on the home page. It references
 *                 Gallery Images and intentionally allows the same photo to
 *                 appear more than once, matching the approved home layout.
 */
export const Gallery: GlobalConfig = {
  slug: 'gallery',
  label: 'Gallery',
  admin: {
    group: 'Content',
    description: 'The gallery hero banner and the home-page photo mosaic.',
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
    {
      name: 'homeTiles',
      type: 'array',
      label: 'Home Page Mosaic Tiles',
      labels: { singular: 'Tile', plural: 'Tiles' },
      maxRows: 9,
      admin: {
        description:
          'The nine photos in the home-page "Photo Gallery" mosaic, in order. The same photo may be used in more than one tile.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'gallery-images',
          required: true,
        },
      ],
    },
  ],
}
