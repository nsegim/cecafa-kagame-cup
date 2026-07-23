import Link from 'next/link'
import Image from 'next/image'
import type { Article } from '@/lib/news'
import type { Match, Team } from '@/payload-types'
import { TeamCrest } from './TeamCrest'
import { matchTime } from '@/lib/datetime'

export interface UpcomingGroup {
  dateLabel: string
  matches: Match[]
}

function sideTeam(rel: Match['homeTeam']): Team | null {
  return rel && typeof rel !== 'number' ? (rel as Team) : null
}

function sideLabel(rel: Match['homeTeam'], placeholder?: string | null): string {
  const team = sideTeam(rel)
  return team?.shortName || team?.name || placeholder || 'TBC'
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FeaturedMain({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`} className="featured-main">
      <div className="featured-main__img">
        {article.imageUrl && (
          <Image
            src={article.imageUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 46vw"
            style={{ objectFit: 'cover' }}
          />
        )}
        {article.category && <span className="featured-main__tag">{article.category}</span>}
      </div>
      <h2 className="featured-main__title">{article.title}</h2>
      {article.excerpt && <p className="featured-main__excerpt">{article.excerpt}</p>}
    </Link>
  )
}

function FeaturedListItem({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`} className="featured-list__item">
      <h3 className="featured-list__title">{article.title}</h3>
      <div className="featured-list__img" style={{ position: 'relative' }}>
        {article.imageUrl && (
          <Image src={article.imageUrl} alt="" fill sizes="120px" style={{ objectFit: 'cover' }} />
        )}
      </div>
    </Link>
  )
}

function UpcomingRow({ match }: { match: Match }) {
  return (
    <div className="upcoming-row">
      <span className="upcoming-row__team">{sideLabel(match.homeTeam, match.homeTeamPlaceholder)}</span>
      <TeamCrest team={sideTeam(match.homeTeam)} size={32} />
      <span className="upcoming-row__time">{matchTime(match.kickoff)}</span>
      <TeamCrest team={sideTeam(match.awayTeam)} size={32} />
      <span className="upcoming-row__team">{sideLabel(match.awayTeam, match.awayTeamPlaceholder)}</span>
    </div>
  )
}

export function FeaturedGrid({
  featured,
  list,
  upcoming,
}: {
  featured: Article | null
  list: Article[]
  upcoming: UpcomingGroup[]
}) {
  return (
    <section className="section featured-grid-section">
      <div className="container featured-grid">
        {featured ? <FeaturedMain article={featured} /> : <div />}

        <div className="featured-list">
          {list.map((a) => (
            <FeaturedListItem key={a.id} article={a} />
          ))}
        </div>

        <div className="upcoming-panel">
          <div className="upcoming-panel__head">Upcoming Games</div>
          <div className="upcoming-panel__body">
            {upcoming.length === 0 ? (
              <p className="upcoming-panel__empty">No upcoming fixtures yet.</p>
            ) : (
              upcoming.map((group) => (
                <div key={group.dateLabel} className="upcoming-panel__group">
                  <h4 className="upcoming-panel__date">{group.dateLabel}</h4>
                  {group.matches.map((m) => (
                    <UpcomingRow key={m.id} match={m} />
                  ))}
                </div>
              ))
            )}
          </div>
          <Link href="/matches" className="upcoming-panel__cta">
            View all matches <ChevronIcon />
          </Link>
        </div>
      </div>
    </section>
  )
}
