import type { CollectionConfig } from 'payload'

/**
 * The photo pool for the site gallery.
 *
 * Each row points at an uploaded Media image and tags it with a category. The
 * public /gallery page filters this pool by category; the home-page mosaic is
 * an ordered pick of these images, curated in the `gallery` global.
 *
 * Alt text lives on the related Media doc (single source of truth) and is read
 * from there when the frontend renders — nothing is duplicated here.
 */
export const GALLERY_CATEGORY_OPTIONS = [
  { label: 'Action', value: 'Action' },
  { label: 'Match Day', value: 'Match Day' },
  { label: 'Trophy', value: 'Trophy' },
  { label: 'Fans', value: 'Fans' },
  { label: 'Stadium', value: 'Stadium' },
  { label: 'APR FC', value: 'APR FC' },
] as const

export const GalleryImages: CollectionConfig = {
  slug: 'gallery-images',
  labels: { singular: 'Gallery Image', plural: 'Gallery Images' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'order'],
    group: 'Content',
    description: 'Photos shown in the gallery. Tag each with a category so it lands in the right folder.',
  },
  access: {
    read: () => true,
  },
  defaultSort: 'order',
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: { description: 'Short label for this photo (shown here in the admin list only).' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: { description: 'The photo. Its alt text comes from the uploaded image.' },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      index: true,
      options: [...GALLERY_CATEGORY_OPTIONS],
      admin: { description: 'Which gallery folder this photo belongs to.' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first in the gallery grid.',
      },
    },
  ],
}
