'use client'

import { useEffect } from 'react'
import { youtubeEmbedUrl } from '@/lib/video'

export function VideoLightbox({ videoUrl, onClose }: { videoUrl: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const embedUrl = youtubeEmbedUrl(videoUrl)

  return (
    <div className="lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="lightbox__close" aria-label="Close video" onClick={onClose}>
        ✕
      </button>
      <div className="lightbox__frame" onClick={(e) => e.stopPropagation()}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title="Match highlight video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={videoUrl} controls autoPlay />
        )}
      </div>
    </div>
  )
}
