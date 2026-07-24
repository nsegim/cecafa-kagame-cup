import type { Metadata } from 'next'
import Image from 'next/image'
import { GalleryBrowser } from '@/components/GalleryBrowser'
import { isGalleryFilter } from '@/data/gallery'
import { getGalleryImages, getGalleryHero } from '@/lib/gallery'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Gallery | CECAFA Kagame Cup 2026',
  description: 'Photos from the CECAFA Kagame Cup 2026.',
}

interface GalleryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const params = await searchParams
  const requestedCategory = Array.isArray(params.category) ? params.category[0] : params.category
  const initialCategory = isGalleryFilter(requestedCategory) ? requestedCategory : 'All'

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

      <GalleryBrowser initialCategory={initialCategory} allImages={allImages} />
    </div>
  )
}
