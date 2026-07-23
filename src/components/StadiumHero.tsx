/**
 * Dark full-bleed hero used on sub-pages (Teams, Results). A stadium photo
 * under a navy gradient, with a small kicker over a large uppercase title.
 */
export function StadiumHero({
  kicker,
  title,
  height = 500,
}: {
  kicker?: string
  title: string
  height?: number
}) {
  return (
    <section
      className={`stadium-hero ${height === 490 ? 'stadium-hero--results' : ''}`}
      style={{ height }}
    >
      <div className="stadium-hero__overlay" />
      <div className="stadium-hero__content">
        {kicker && <span className="stadium-hero__kicker">{kicker}</span>}
        <h1 className="stadium-hero__title">{title}</h1>
      </div>
    </section>
  )
}
