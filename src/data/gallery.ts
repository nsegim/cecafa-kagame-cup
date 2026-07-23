/**
 * Gallery configuration shared by client and server.
 *
 * The photos themselves now live in Payload (the `gallery-images` collection
 * and the `gallery` global) — see `src/lib/gallery.ts` for the data layer. This
 * module only holds the fixed category tabs, types and helpers, so it stays
 * safe to import from client components.
 */
export const GALLERY_CATEGORIES = [
  'All',
  'Action',
  'Match Day',
  'Trophy',
  'Fans',
  'Stadium',
  'APR FC',
] as const

export type GalleryFilter = (typeof GALLERY_CATEGORIES)[number]
export type GalleryCategory = Exclude<GalleryFilter, 'All'>

export interface GalleryImage {
  id: string
  src: string
  alt: string
  category: GalleryCategory
}

export function isGalleryFilter(value: string | undefined): value is GalleryFilter {
  return GALLERY_CATEGORIES.includes(value as GalleryFilter)
}
