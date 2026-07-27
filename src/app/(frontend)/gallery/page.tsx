import type { Metadata } from 'next'
import Image from 'next/image'
import { GalleryBrowser } from '@/components/GalleryBrowser'
import { getGalleryImages, getGalleryHero } from '@/lib/gallery'

export const revalidate = 300

const DESCRIPTION = 'Photos from the CECAFA Kagame Cup 2026.'

export const metadata: Metadata = {
  title: 'Gallery',
  description: DESCRIPTION,
  alternates: { canonical: '/gallery' },
  openGraph: { title: 'Gallery', description: DESCRIPTION, url: '/gallery' },
}

/**
 * Deliberately takes NO `searchParams`.
 *
 * Reading `searchParams` opts a route into dynamic rendering, which silently
 * disables the `revalidate` above — this page was being re-rendered from the
 * database on every single request (`Cache-Control: private, no-store`, ~1.5s
 * at the origin), with no CDN or ISR cache in front of it. That is the same
 * shape that returns a Cloudflare 524 when the origin is under load.
 *
 * The `?category=` deep link still works: it is pure client filter state, and
 * <GalleryBrowser> reads it from `window.location` on mount (it already writes
 * it back there with `history.replaceState`). The page itself never needs it.
 */
export default async function GalleryPage() {
  const [allImages, heroImage] = await Promise.all([getGalleryImages(), getGalleryHero()])

  return (
    <div className="gallery-page">
      <section className="gallery-hero" aria-labelledby="gallery-title">
        <Image
          className="gallery-hero__image"
          src={heroImage}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: 'cover' }}
        />
        <span className="gallery-hero__overlay" aria-hidden="true" />
        <h1 id="gallery-title">Amafoto</h1>
      </section>

      <GalleryBrowser allImages={allImages} />
    </div>
  )
}
