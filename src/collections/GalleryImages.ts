import type { CollectionConfig } from 'payload'

/**
 * The Flickr album pool for the site gallery.
 *
 * Each row is a cover photo + a link out to the full Flickr album, tagged with
 * a category. The public /gallery page filters this pool by category and
 * renders only the cover photo; clicking a tile redirects to `flickrAlbumUrl`
 * instead of opening anything on-site. The home-page mosaic is a separate,
 * ordered pick of these rows curated in the `gallery` global.
 *
 * Alt text for the cover photo lives on the related Media doc (single source
 * of truth) and is read from there when the frontend renders.
 */
export const GALLERY_CATEGORY_OPTIONS = [
  { label: 'Action', value: 'Action' },
  { label: 'Match Day', value: 'Match Day' },
  { label: 'Trophy', value: 'Trophy' },
  { label: 'Fans', value: 'Fans' },
  { label: 'Stadium', value: 'Stadium' },
  { label: 'APR FC', value: 'APR FC' },
] as const

/** Requires a well-formed http(s) URL when a value is given; empty is allowed. */
function validateFlickrAlbumUrl(value: string | null | undefined) {
  if (!value) return true
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Enter a valid URL starting with http:// or https://.'
    }
    return true
  } catch {
    return 'Enter a valid URL (e.g. https://www.flickr.com/photos/username/albums/...).'
  }
}

export const GalleryImages: CollectionConfig = {
  slug: 'gallery-images',
  labels: { singular: 'Gallery Album', plural: 'Gallery Albums' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'visible', 'order'],
    group: 'Content',
    description:
      'Gallery albums shown on /gallery. Each entry is a cover photo that redirects to its Flickr album when clicked.',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'Album title (shown here in the admin list only — not displayed on the public site).' },
    },
    {
      name: 'image',
      label: 'Cover Image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'The preview photo shown on the /gallery grid. Its alt text comes from the uploaded image.' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      index: true,
      options: [...GALLERY_CATEGORY_OPTIONS],
      admin: { description: 'Which gallery folder this album belongs to.' },
    },
    {
      name: 'flickrAlbumUrl',
      label: 'Flickr Album URL',
      type: 'text',
      validate: validateFlickrAlbumUrl,
      admin: {
        description:
          'The Flickr album this cover photo links to. Visitors are redirected here when they click the gallery item. Leave blank to keep the cover photo on the grid but not clickable.',
      },
    },
    {
      name: 'description',
      label: 'Short Description',
      type: 'textarea',
      admin: {
        description: 'Optional internal note about this album (not shown on the public site).',
      },
    },
    {
      name: 'visible',
      label: 'Visible',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
        description: 'Show this album on the public /gallery page. Uncheck to hide it without deleting it.',
      },
    },
    {
      name: 'order',
      label: 'Display Order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in the gallery grid.',
      },
    },
  ],
}
