'use client'

import { useCallback, useEffect, useState } from 'react'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import type { MatchEvent, FeedImage } from '@/lib/tournament'
import { richTextHasContent, richTextToPlainText } from '@/lib/richText'
import { findYouTubeUrls } from '@/lib/video'
import Image from 'next/image'

/**
 * A YouTube video an editor linked in a commentary entry, played inline on the
 * feed. Deliberately no autoplay: a match can end up with several of these down
 * the page, and they must not all start on their own.
 *
 * The wrapper is a `<span>` (displayed as a block in CSS), not a `<div>`, so it
 * stays valid where it renders — inside the rich text's own `<p>` elements.
 */
function YouTubeEmbed({ url }: { url: string }) {
  return (
    <span className="commentary__video">
      <iframe
        src={url}
        title="Video"
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </span>
  )
}

/**
 * Whether a paragraph is nothing but the video link(s) it carries — the usual
 * case, an editor pasting a URL on its own line. Those paragraphs are dropped:
 * the player renders below, and showing the raw URL above its own video is just
 * noise. A link written into a sentence keeps its text and stays a link.
 */
function isBareVideoParagraph(node: unknown): boolean {
  const text = richTextToPlainText(node)
  if (findYouTubeUrls(text).length === 0) return false
  return text.replace(/https?:\/\/[^\s<>"']+/g, '').trim() === ''
}

const commentaryConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  paragraph: (args) => {
    if (isBareVideoParagraph(args.node)) return null
    // A converter is allowed to be a plain node rather than a function, so the
    // default has to be called only when it actually is one.
    const fallback = defaultConverters.paragraph
    return typeof fallback === 'function' ? fallback(args) : fallback
  },
})

type Tab = 'live' | 'stats' | 'photos'

/**
 * Full-screen lightbox for the commentary photos — click any photo to open it,
 * arrow keys / on-screen arrows to move between the images of that same entry,
 * Escape or a click outside to close. Reuses the site's `.lightbox` /
 * `.gallery-lightbox__*` styles. Inside the embed iframe it covers the iframe
 * viewport (the most a framed page can do).
 */
function PhotoLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[]
  index: number
  onClose: () => void
  onNavigate: (i: number) => void
}) {
  const count = images.length
  const goPrev = useCallback(
    () => onNavigate((index - 1 + count) % count),
    [index, count, onNavigate],
  )
  const goNext = useCallback(() => onNavigate((index + 1) % count), [index, count, onNavigate])

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

  const src = images[index]
  if (!src) return null

  return (
    <div className="lightbox gallery-lightbox" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="lightbox__close" aria-label="Funga" onClick={onClose}>
        ✕
      </button>
      {count > 1 && (
        <button
          type="button"
          className="gallery-lightbox__nav gallery-lightbox__nav--prev"
          aria-label="Ifoto ibanza"
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
        <img src={src} alt="" />
        {count > 1 && (
          <div className="gallery-lightbox__footer">
            <span className="gallery-lightbox__caption">
              {index + 1} / {count}
            </span>
          </div>
        )}
      </div>
      {count > 1 && (
        <button
          type="button"
          className="gallery-lightbox__nav gallery-lightbox__nav--next"
          aria-label="Ifoto ikurikira"
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

export interface MatchCenterProps {
  events: MatchEvent[]
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  homeStats: { goals: number; yellows: number; reds: number }
  awayStats: { goals: number; yellows: number; reds: number }
  photos: string[]
}

function EventIcon({ type }: { type: MatchEvent['type'] }) {
  if (type === 'goal')
    return <span className="commentary__icon commentary__icon--goal" aria-hidden="true" />
  if (type === 'yellow')
    return <span className="commentary__icon commentary__icon--yellow" aria-hidden="true" />
  if (type === 'red')
    return <span className="commentary__icon commentary__icon--red" aria-hidden="true" />
  if (type === 'substitution')
    return <span className="commentary__icon commentary__icon--substitution" aria-hidden="true" />
  return <span className="commentary__icon commentary__icon--whistle" aria-hidden="true" />
}

/**
 * What goes in the minute column. The whistle markers show a label rather than
 * a number — a half doesn't reliably end on 45 or 90 once stoppage time is
 * played, so "HT"/"FT" is both shorter and always right. Post-match updates
 * happen after the clock has stopped, so they carry no minute at all.
 */
function eventMinuteLabel(e: MatchEvent): string {
  if (e.type === 'halftime') return 'HT'
  if (e.type === 'fulltime') return 'FT'
  if (e.type === 'postmatch') return ''
  return e.minute != null ? `${e.minute}'` : ''
}

/**
 * The auto-generated caption line for an event (GOAL!, cards, subs, whistle
 * markers). Returns `null` for a plain 'note', whose whole content is the
 * editor's rich text — rendered separately below the caption by <RichText>.
 * The editor's optional extra detail is no longer inlined here; it renders as
 * its own rich-text block under the caption.
 */
function eventCaption(e: MatchEvent, homeName: string, awayName: string): React.ReactNode {
  const team = e.side === 'home' ? homeName : e.side === 'away' ? awayName : ''
  switch (e.type) {
    case 'goal': {
      // The scorer is optional — fall back to just the team when it's unknown.
      const scorer = e.playerName ? `${e.playerName}${team ? ` — ${team}` : ''}` : team
      return (
        <>
          <strong>GOAL!</strong>
          {scorer ? ` ${scorer}` : ''}. Igitego kirinjiye.
        </>
      )
    }
    case 'yellow':
      return (
        <>
          {e.playerName}
          {team ? ` (${team})` : ''} ahawe ikarita y'umuhondo.
        </>
      )
    case 'red':
      return (
        <>
          <strong>Ikarita y'umutuku.</strong> {e.playerName}
          {team ? ` (${team})` : ''} avuye mu kibuga.
        </>
      )
    case 'substitution':
      return (
        <>
          <strong>Gusimbuza{team ? ` — ${team}` : ''}.</strong> {e.playerOutName ?? 'Player'}{' '}
          avuyemo, {e.playerInName ?? 'Player'} arinjiye.
        </>
      )
    case 'kickoff':
      return (
        <>
          <strong>Umukino uratangiye!</strong>
        </>
      )
    case 'halftime':
      return (
        <>
          <strong>Ikiruhuko.</strong>
        </>
      )
    case 'secondhalf':
      return (
        <>
          <strong>Umukino urakomeje!</strong>
        </>
      )
    case 'fulltime':
      return (
        <>
          <strong>Umukino urarangiye.</strong>
        </>
      )
    // A post-match update is the editor's own words, like a plain note — the
    // full-time whistle right below it already marks that the match is over.
    case 'postmatch':
    case 'note':
    default:
      return null
  }
}

function StatRow({ label, home, away }: { label: string; home: number; away: number }) {
  return (
    <div className="matchstat">
      <span className="matchstat__val">{home}</span>
      <span className="matchstat__label">{label}</span>
      <span className="matchstat__val">{away}</span>
    </div>
  )
}

/**
 * A single Live Expressions photo. The whole image is always shown at its real
 * aspect ratio — never cropped — inside a fixed-height frame. A blurred, darkened
 * copy of the same photo fills whatever room the aspect ratio leaves behind it
 * (for landscapes and portraits alike), so it reads as design rather than empty
 * bands.
 */
function PhotoFrame({ image, onOpen }: { image: FeedImage; onOpen: () => void }) {
  return (
    <button type="button" className="commentary__photo-frame" onClick={onOpen} aria-label="Fungura ifoto">
      <span
        aria-hidden
        className="commentary__photo-blur"
        style={{ backgroundImage: `url("${image.url}")` }}
      />
      <Image
        src={image.url}
        alt=""
        fill
        sizes="(max-width: 900px) 100vw, 800px"
        className="commentary__photo-img"
        // `contain` shows the whole photo at its real aspect ratio — never cropped.
        style={{ objectFit: 'contain', objectPosition: 'center' }}
      />
    </button>
  )
}

export function MatchCenter({
  events,
  homeName,
  awayName,
  homeStats,
  awayStats,
  photos,
}: MatchCenterProps) {
  const [tab, setTab] = useState<Tab>('live')
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

  return (
    <div className="matchcenter">
      <div className="matchcenter__tabs" role="tablist" aria-label="Match detail">
        {(
          [
            ['live', `UKO UMUKINO URI KUGENDA`],
            ['stats', `Imibare y'umukino`],
            ['photos', `Amafoto y'umukino`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`matchcenter__tab ${tab === key ? 'is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'live' && (
        <div className="commentary">
          {events.length === 0 ? (
            <p className="perf__empty">Ubusesenguzi bw'umukino buraza umukino nutangira.</p>
          ) : (
            events.map((e, i) => {
              // Photos are shown exactly where the editor attached them — on this
              // entry, in the order they set. One entry can carry several.
              const images = e.images ?? []
              const imageUrls = images.map((img) => img.url)
              const minuteLabel = eventMinuteLabel(e)
              // Who/when a single photo is captioned with. Entries that belong
              // to neither side (a general note, a post-match wrap-up) name no
              // one, and carry no caption at all without a minute either.
              const photoCaption = [
                e.playerName || (e.side === 'home' ? homeName : e.side === 'away' ? awayName : ''),
                minuteLabel,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <div className="commentary__group" key={i}>
                  <div className="commentary__entry">
                    <span className="commentary__min">{minuteLabel}</span>
                    <EventIcon type={e.type} />
                    <div className="commentary__text">
                      {(() => {
                        const caption = eventCaption(e, homeName, awayName)
                        return caption ? <p className="commentary__caption">{caption}</p> : null
                      })()}
                      {richTextHasContent(e.text) && (
                        <div className="commentary__richtext">
                          <RichText
                            data={e.text as DefaultTypedEditorState}
                            converters={commentaryConverters}
                          />
                          {(e.videos ?? []).map((url) => (
                            <YouTubeEmbed key={url} url={url} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {images.length === 1 && (
                    <figure className="commentary__photo">
                      <PhotoFrame
                        image={images[0]}
                        onOpen={() => setLightbox({ images: imageUrls, index: 0 })}
                      />
                      {photoCaption && <figcaption>{photoCaption}</figcaption>}
                    </figure>
                  )}
                  {images.length > 1 && (
                    <div className="commentary__photos">
                      {images.map((photo, j) => (
                        <PhotoFrame
                          key={j}
                          image={photo}
                          onOpen={() => setLightbox({ images: imageUrls, index: j })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {tab === 'stats' && (
        <div className="matchstats">
          <div className="matchstats__head">
            <span>{homeName}</span>
            <span>{awayName}</span>
          </div>
          <StatRow label="Ibitego" home={homeStats.goals} away={awayStats.goals} />
          <StatRow label="Amakarita y'umuhondo" home={homeStats.yellows} away={awayStats.yellows} />
          <StatRow label="Amakarita y'umutuku" home={homeStats.reds} away={awayStats.reds} />
        </div>
      )}

      {tab === 'photos' && (
        <div className="matchphotos">
          {photos.length === 0 ? (
            <p className="perf__empty"></p>
          ) : (
            photos.map((src, i) => (
              <button
                type="button"
                key={i}
                className="matchphotos__img"
                style={{ position: 'relative', display: 'block' }}
                onClick={() => setLightbox({ images: photos, index: i })}
                aria-label="Fungura ifoto"
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 320px"
                  style={{ objectFit: 'cover' }}
                />
              </button>
            ))
          )}
        </div>
      )}

      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(i) => setLightbox({ images: lightbox.images, index: i })}
        />
      )}
    </div>
  )
}
