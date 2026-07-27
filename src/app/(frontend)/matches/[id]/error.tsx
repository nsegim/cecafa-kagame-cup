'use client'

/**
 * Without an error boundary here, a server-side failure on this route rendered
 * Next's bare production error page — which reads as "the page is blank" and
 * gives the reader nothing to act on. This keeps them on the site with a way
 * back to the fixture list.
 */
export default function MatchDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="section">
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <h1 style={{ marginBottom: 12 }}>Umukino ntiwabashije kuboneka</h1>
        <p style={{ marginBottom: 24 }}>
          Habaye ikibazo mu gutangaza amakuru y&apos;uyu mukino. Ongera ugerageze.
        </p>
        <button type="button" className="btn btn--red" onClick={reset}>
          Ongera ugerageze
        </button>
      </div>
    </section>
  )
}
