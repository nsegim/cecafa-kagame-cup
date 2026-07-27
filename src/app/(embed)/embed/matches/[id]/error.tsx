'use client'

/**
 * A failed embed renders inside someone else's page, where Next's bare error
 * output looks like a broken iframe. Keep it inside the `.embed` card and give
 * the reader a way through to the real match page.
 */
export default function MatchEmbedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="embed">
      <div className="embed-body-inner" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <p style={{ marginBottom: 16 }}>
          Amakuru y&apos;uyu mukino ntabashije kuboneka muri iki gihe.
        </p>
        <button type="button" className="btn btn--red" onClick={reset}>
          Ongera ugerageze
        </button>
      </div>
    </div>
  )
}
