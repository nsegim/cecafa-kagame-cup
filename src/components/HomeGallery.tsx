import Link from 'next/link'
import Image from 'next/image'
import type { GalleryImage } from '@/data/gallery'

export function HomeGallery({ tiles }: { tiles: GalleryImage[] }) {
  return (
    <section className="home-gallery" aria-labelledby="home-gallery-title">
      <div className="container home-gallery__inner">
        <header className="home-gallery__heading">
          <span className="home-gallery__kicker">Media</span>
          <span className="home-gallery__rule" aria-hidden="true" />
          <h2 id="home-gallery-title">Photo Gallery</h2>
        </header>

        <div className="home-gallery__grid">
          {tiles.map((image, index) => (
            <Link
              key={image.id}
              href={`/gallery?category=${encodeURIComponent(image.category)}`}
              className={`home-gallery__tile home-gallery__tile--${index + 1}`}
              aria-label={`View ${image.category} gallery`}
              style={{ position: 'relative' }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 900px) 50vw, 25vw"
                style={{ objectFit: 'cover' }}
              />
            </Link>
          ))}
        </div>

        <Link href="/gallery" className="gallery-cta">
          View All
        </Link>
      </div>
    </section>
  )
}
