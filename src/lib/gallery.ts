/**
 * Server-side data layer for the gallery.
 *
 * `gallery-images` is the single source of truth for every gallery section —
 * the /gallery grid and the home-page mosaic both read the same ordered,
 * visible list; the mosaic is simply its first nine items. Adding, editing,
 * deleting, reordering, or hiding an item there updates both places
 * automatically, with no separate curation step.
 */
import { getPayloadClient } from '@/lib/payload'
import type {
  GalleryImage as GalleryImageDoc,
  Gallery as GalleryGlobal,
  Media,
} from '@/payload-types'
import type { GalleryCategory, GalleryImage } from '@/data/gallery'

/** Local fallback so the gallery hero is never blank before an editor sets one. */
const DEFAULT_HERO = '/design/gallery-hero.jpg'

function imageSrc(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return img.sizes?.card?.url || img.sizes?.hero?.url || img.url || null
}

function heroSrc(img: number | Media | null | undefined): string | null {
  if (!img || typeof img === 'number') return null
  return img.sizes?.hero?.url || img.url || null
}

function imageAlt(img: number | Media | null | undefined): string {
  if (!img || typeof img === 'number') return ''
  return img.alt ?? ''
}

function toView(doc: GalleryImageDoc, id: string): GalleryImage | null {
  const src = imageSrc(doc.image)
  if (!src) return null
  return {
    id,
    src,
    alt: imageAlt(doc.image),
    category: doc.category as GalleryCategory,
    flickrAlbumUrl: doc.flickrAlbumUrl ?? undefined,
  }
}

/** Every visible gallery album, ordered, for the /gallery filterable grid. */
export async function getGalleryImages(): Promise<GalleryImage[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'gallery-images',
      where: { visible: { not_equals: false } },
      sort: 'order',
      limit: 200,
      depth: 1,
    })
    return (res.docs as GalleryImageDoc[])
      .map((doc) => toView(doc, String(doc.id)))
      .filter((v): v is GalleryImage => v !== null)
  } catch (err) {
    console.error('[gallery] failed to read gallery images:', err)
    return []
  }
}

/** The /gallery hero banner URL, falling back to the approved local asset. */
export async function getGalleryHero(): Promise<string> {
  try {
    const payload = await getPayloadClient()
    const settings = (await payload.findGlobal({ slug: 'gallery', depth: 1 })) as GalleryGlobal
    return heroSrc(settings.heroImage) ?? DEFAULT_HERO
  } catch {
    return DEFAULT_HERO
  }
}

/** The nine-tile home-page mosaic — the first nine items of the same list `getGalleryImages` returns. */
export async function getHomeGalleryTiles(): Promise<GalleryImage[]> {
  const images = await getGalleryImages()
  return images.slice(0, 9)
}
