'use client'

import { useDocumentInfo } from '@payloadcms/ui'

/**
 * Signposts the two collections that hold this match's live content.
 *
 * Live Commentary and Match Photos used to be array fields sitting right here in
 * the match form. They are now their own collections — each entry saves on its
 * own instead of rewriting the entire match (see `MatchCommentary`) — which
 * makes them fast and safe for two people to work on at once, but also moves
 * them out of this screen. These links put them one click away, pre-filtered to
 * this fixture, so the editing path is no longer than it was.
 */
export function MatchContentLinks() {
  const { id } = useDocumentInfo()

  if (!id) {
    return (
      <div className="field-type" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-500)', margin: 0 }}>
          Save this match once, then Live Commentary and Match Photos can be added.
        </p>
      </div>
    )
  }

  const filtered = (slug: string) =>
    `/admin/collections/${slug}?where[or][0][and][0][match][equals]=${id}`

  return (
    <div className="field-type" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <a className="btn btn--style-primary btn--size-small" href={filtered('match-commentary')}>
          Live Commentary for this match
        </a>
        <a className="btn btn--style-secondary btn--size-small" href={filtered('match-photos')}>
          Match Photos for this match
        </a>
      </div>
      <p
        style={{
          fontSize: '0.8rem',
          color: 'var(--theme-elevation-500)',
          margin: '0.5rem 0 0',
        }}
      >
        Each entry saves on its own — no need to save the whole match, and two people can post at
        the same time without overwriting each other.
      </p>
    </div>
  )
}
