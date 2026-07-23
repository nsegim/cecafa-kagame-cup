'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import {
  GALLERY_CATEGORIES,
  type GalleryFilter,
  type GalleryImage,
} from '@/data/gallery'

interface GalleryBrowserProps {
  initialCategory: GalleryFilter
  allImages: GalleryImage[]
}

export function GalleryBrowser({ initialCategory, allImages }: GalleryBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<GalleryFilter>(initialCategory)

  const images = useMemo(
    () =>
      selectedCategory === 'All'
        ? allImages
        : allImages.filter((image) => image.category === selectedCategory),
    [selectedCategory, allImages],
  )

  function selectCategory(category: GalleryFilter) {
    setSelectedCategory(category)

    const url = new URL(window.location.href)
    if (category === 'All') url.searchParams.delete('category')
    else url.searchParams.set('category', category)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  return (
    <>
      <nav className="gallery-filter" aria-label="Gallery folders">
        <div className="container gallery-filter__inner">
          <div className="gallery-filter__folders" role="tablist" aria-label="Photo category">
            {GALLERY_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category}
                className={`gallery-filter__folder ${
                  selectedCategory === category ? 'is-active' : ''
                }`}
                onClick={() => selectCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <span className="gallery-filter__count" aria-live="polite">
            {images.length} {images.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>
      </nav>

      <section
        className={`gallery-detail ${
          selectedCategory === 'All' ? '' : 'gallery-detail--filtered'
        }`}
        aria-label={`${selectedCategory} photos`}
      >
        <div className="gallery-detail__grid">
          {images.map((image, index) => {
            const photo = (
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 900px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
              />
            )

            return (
              <figure
                key={image.id}
                className={`gallery-detail__item gallery-detail__item--${index + 1}`}
              >
                {image.flickrAlbumUrl ? (
                  <a
                    className="gallery-detail__trigger"
                    href={image.flickrAlbumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${image.alt || image.category} album on Flickr`}
                  >
                    {photo}
                  </a>
                ) : (
                  photo
                )}
                <figcaption>{image.category}</figcaption>
              </figure>
            )
          })}
        </div>

        <button type="button" className="gallery-cta gallery-cta--load">
          Load More
        </button>
      </section>
    </>
  )
}
