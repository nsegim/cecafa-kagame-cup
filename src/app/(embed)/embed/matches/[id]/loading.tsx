/**
 * Shown while a frame that isn't in the ISR cache yet renders. Without this the
 * host page showed an empty iframe until the render arrived or timed out, which
 * reads as a broken embed.
 */
export default function MatchEmbedLoading() {
  return (
    <div className="embed">
      <div className="embed-hero">
        <span className="skeleton skeleton--meta" />
        <div className="embed-hero__teams">
          <div className="embed-hero__team">
            <span className="skeleton skeleton--crest" />
            <span className="skeleton skeleton--name" />
          </div>
          <span className="skeleton skeleton--score" />
          <div className="embed-hero__team">
            <span className="skeleton skeleton--crest" />
            <span className="skeleton skeleton--name" />
          </div>
        </div>
      </div>
    </div>
  )
}
