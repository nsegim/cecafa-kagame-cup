'use client'

import { useCallback, useEffect } from 'react'
import type { GalleryImage } from '@/data/gallery'

interface GalleryLightboxProps {
  images: GalleryImage[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
}

export function GalleryLightbox({ images, index, onClose, onNavigate }: GalleryLightboxProps) {
  const count = images.length
  const image = images[index]

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + count) % count)
  }, [index, count, onNavigate])

  const goNext = useCallback(() => {
    onNavigate((index + 1) % count)
  }, [index, count, onNavigate])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, goPrev, goNext])

  if (!image) return null

  return (
    <div className="lightbox gallery-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="lightbox__close" aria-label="Close photo" onClick={onClose}>
        ✕
      </button>

      {count > 1 && (
        <button
          type="button"
          className="gallery-lightbox__nav gallery-lightbox__nav--prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
        >
          ‹
        </button>
      )}

      <div className="gallery-lightbox__frame" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} />
        <div className="gallery-lightbox__footer">
          <span className="gallery-lightbox__caption">
            {image.category} · {index + 1} / {count}
          </span>
          {image.flickrAlbumUrl && (
            <a
              className="gallery-lightbox__link"
              href={image.flickrAlbumUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Full Album
            </a>
          )}
        </div>
      </div>

      {count > 1 && (
        <button
          type="button"
          className="gallery-lightbox__nav gallery-lightbox__nav--next"
          aria-label="Next photo"
          onClick={(e) => {
            e.stopPropagation()
            goNext()
          }}
        >
          ›
        </button>
      )}
    </div>
  )
}
