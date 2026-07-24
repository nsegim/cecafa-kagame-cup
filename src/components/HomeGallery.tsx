'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { GalleryImage } from '@/data/gallery'
import { GalleryLightbox } from '@/components/GalleryLightbox'

export function HomeGallery({ tiles }: { tiles: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="home-gallery" aria-labelledby="home-gallery-title">
      <div className="container home-gallery__inner">
        <header className="home-gallery__heading">
          <span className="home-gallery__kicker">AMAFOTO</span>
          <span className="home-gallery__rule" aria-hidden="true" />
          <h2 id="home-gallery-title">Ububiko bw&apos;Amafoto</h2>
        </header>

        <div className="home-gallery__grid">
          {tiles.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setOpenIndex(index)}
              className={`home-gallery__tile home-gallery__tile--${index + 1}`}
              aria-label={`View photo: ${image.title || image.alt || image.category}`}
              style={{ position: 'relative' }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 900px) 50vw, 25vw"
                style={{ objectFit: 'cover' }}
              />
              <span className="media-overlay">
                <span className="media-overlay__title">{image.title || image.category}</span>
              </span>
            </button>
          ))}
        </div>

        <Link href="/gallery" className="gallery-cta">
          REBA YOSE
        </Link>
      </div>

      {openIndex !== null && (
        <GalleryLightbox
          images={tiles}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </section>
  )
}
