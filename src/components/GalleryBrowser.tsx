'use client'

import { useMemo, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import {
  GALLERY_CATEGORIES,
  isGalleryFilter,
  type GalleryFilter,
  type GalleryImage,
} from '@/data/gallery'
import { GalleryLightbox } from '@/components/GalleryLightbox'

interface GalleryBrowserProps {
  allImages: GalleryImage[]
}

/** The URL is read once at mount and never pushed to, so there is nothing to subscribe to. */
const noSubscribe = () => () => {}

function readCategoryFromUrl(): GalleryFilter | null {
  const requested = new URLSearchParams(window.location.search).get('category')
  return requested && isGalleryFilter(requested) ? requested : null
}

/**
 * The `?category=` deep link, read from the browser rather than from
 * `searchParams`.
 *
 * The gallery page is statically rendered and shared by every visitor, so it
 * cannot vary on a query string without giving up its cache — reading
 * `searchParams` there forced the whole route dynamic (`no-store`, ~1.5s per
 * request straight to the database). This is client filter state; it belongs
 * here.
 *
 * `useSyncExternalStore` rather than a `useEffect` + `setState`: it returns the
 * server snapshot (`null`) during SSR and hydration, then the real value, with
 * no hydration mismatch and no cascading render.
 */
function useUrlCategory(): GalleryFilter | null {
  return useSyncExternalStore(
    noSubscribe,
    readCategoryFromUrl,
    () => null, // server: no URL to read
  )
}

export function GalleryBrowser({ allImages }: GalleryBrowserProps) {
  const urlCategory = useUrlCategory()
  // Null until the visitor picks a folder themselves, at which point their
  // choice takes over from whatever the incoming link asked for.
  const [chosenCategory, setChosenCategory] = useState<GalleryFilter | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const selectedCategory: GalleryFilter = chosenCategory ?? urlCategory ?? 'All'

  const images = useMemo(
    () =>
      selectedCategory === 'All'
        ? allImages
        : allImages.filter((image) => image.category === selectedCategory),
    [selectedCategory, allImages],
  )

  function selectCategory(category: GalleryFilter) {
    setChosenCategory(category)
    setOpenIndex(null)

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
        className={`gallery-detail ${selectedCategory === 'All' ? '' : 'gallery-detail--filtered'}`}
        aria-label={`${selectedCategory} photos`}
      >
        <div className="gallery-detail__grid">
          {images.map((image, index) => (
            <figure
              key={image.id}
              className={`gallery-detail__item gallery-detail__item--${index + 1}`}
            >
              <button
                type="button"
                className="gallery-detail__trigger"
                onClick={() => setOpenIndex(index)}
                aria-label={`View photo: ${image.title || image.alt || image.category}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 900px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                />
                <span className="media-overlay">
                  <span className="media-overlay__title">{image.title || image.category}</span>
                </span>
              </button>
              <figcaption>{image.category}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {openIndex !== null && (
        <GalleryLightbox
          images={images}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
          onNavigate={setOpenIndex}
        />
      )}
    </>
  )
}
