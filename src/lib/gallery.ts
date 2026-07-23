/**
 * Server-side data layer for the gallery.
 *
 * Reads the photo pool (`gallery-images`) and the presentation settings
 * (`gallery` global) from Payload and maps them to the `GalleryImage` view
 * shape the components already expect, so GalleryBrowser and HomeGallery render
 * unchanged.
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
  }
}

/** Every gallery photo, ordered, for the /gallery filterable grid. */
export async function getGalleryImages(): Promise<GalleryImage[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'gallery-images',
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

/**
 * The nine tiles of the home-page mosaic, in editor order. The same photo may
 * legitimately appear more than once, so tiles are keyed by position.
 */
export async function getHomeGalleryTiles(): Promise<GalleryImage[]> {
  try {
    const payload = await getPayloadClient()
    const settings = (await payload.findGlobal({ slug: 'gallery', depth: 2 })) as GalleryGlobal
    const tiles = settings.homeTiles ?? []
    return tiles
      .map((tile, index) => {
        const ref = tile.image
        if (!ref || typeof ref === 'number') return null
        return toView(ref as GalleryImageDoc, `home-${index}`)
      })
      .filter((v): v is GalleryImage => v !== null)
  } catch (err) {
    console.error('[gallery] failed to read home mosaic:', err)
    return []
  }
}
