/**
 * Shown while a match page that isn't in the ISR cache yet renders on the
 * server. Previously there was no boundary here, so a slow render meant the
 * browser sat on a blank white page until it either arrived or timed out.
 * Mirrors the real hero's layout so the swap isn't jarring.
 */
export default function MatchDetailLoading() {
  return (
    <section className="match-hero">
      <div className="match-hero__overlay" />
      <div className="match-hero__content">
        <span className="skeleton skeleton--meta" />
        <div className="match-hero__teams">
          <div className="match-hero__team">
            <span className="skeleton skeleton--crest" />
            <span className="skeleton skeleton--name" />
          </div>
          <span className="skeleton skeleton--score" />
          <div className="match-hero__team">
            <span className="skeleton skeleton--crest" />
            <span className="skeleton skeleton--name" />
          </div>
        </div>
      </div>
    </section>
  )
}
