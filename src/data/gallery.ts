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
  /** Cropped thumbnail for the grid/mosaic tile. */
  src: string
  /**
   * The original upload — the image exactly as it was added, at its true aspect
   * ratio and uncropped. Used by the lightbox so the full photo is visible.
   */
  full: string
  alt: string
  title: string
  category: GalleryCategory
  /** Flickr album this cover photo links to. Absent means the tile isn't clickable. */
  flickrAlbumUrl?: string
}

export function isGalleryFilter(value: string | undefined): value is GalleryFilter {
  return GALLERY_CATEGORIES.includes(value as GalleryFilter)
}
