'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MatchRow } from '@/lib/matchView'
import { effectiveMatchStatus } from '@/lib/matchStatus'
import { CrestView } from './TeamCrest'
import { VENUE_LABEL } from '@/lib/matchLabels'
import { matchDate, matchTime, matchDateParts } from '@/lib/datetime'

export interface FeaturedMatch {
  label: string
  match: MatchRow
  imageUrl: string | null
}

function VenueIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="7" width="20" height="10" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 3V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function FeaturedBanner({ featured }: { featured: FeaturedMatch | null }) {
  if (!featured) return null
  const { match, label, imageUrl } = featured
  const played = effectiveMatchStatus(match) !== 'scheduled'

  return (
    <div
      className="match-banner"
      style={
        imageUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0, 20, 45, 0.35), rgba(0, 20, 45, 0.55)), url(${imageUrl})`,
            }
          : undefined
      }
    >
      <span className="match-banner__ribbon">{label}</span>

      <div className="match-banner__teams">
        <div className="match-banner__team">
          <CrestView side={match.home} size={70} />
          <span className="match-banner__name">{match.home.label}</span>
        </div>

        {played ? (
          <div className="match-card__score">
            <span className="match-card__score-num">{match.homeScore ?? 0}</span>
            <span className="match-card__score-sep">-</span>
            <span className="match-card__score-num">{match.awayScore ?? 0}</span>
          </div>
        ) : (
          <div className="match-banner__vs">—</div>
        )}

        <div className="match-banner__team">
          <span className="match-banner__name">{match.away.label}</span>
          <CrestView side={match.away} size={70} />
        </div>
      </div>

      <div className="match-banner__meta">
        <span className="match-banner__meta-item">
          <VenueIcon /> {VENUE_LABEL[match.venue] ?? match.venue}
        </span>
        <span className="match-banner__meta-item">
          <CalendarIcon /> {matchDate(match.kickoff)} {matchTime(match.kickoff)}
        </span>
      </div>
    </div>
  )
}

function MatchListRow({ match }: { match: MatchRow }) {
  const played = effectiveMatchStatus(match) !== 'scheduled'
  const { day, month, year } = matchDateParts(match.kickoff)

  return (
    <div className="match-row">
      <div className="match-row__date">
        <span className="match-row__day">{day}</span>
        <span className="match-row__month">{month}</span>
        <span className="match-row__year">{year}</span>
      </div>

      <div className="match-card__body match-row__body">
        <div className="match-card__team">
          <CrestView side={match.home} size={50} />
          <span className="match-card__name">{match.home.label}</span>
        </div>

        {played ? (
          <div className="match-card__score">
            <span className="match-card__score-num">{match.homeScore ?? 0}</span>
            <span className="match-card__score-sep">-</span>
            <span className="match-card__score-num">{match.awayScore ?? 0}</span>
          </div>
        ) : (
          <div className="match-card__vs">-</div>
        )}

        <div className="match-card__team match-card__team--away">
          <CrestView side={match.away} size={50} />
          <span className="match-card__name">{match.away.label}</span>
        </div>
      </div>

      <span className="match-row__venue">
        <VenueIcon /> {(VENUE_LABEL[match.venue] ?? match.venue).toUpperCase()}
      </span>

      <Link href={`/matches/${match.id}`} className="btn btn--red match-row__preview">
        IBYEREKEYE UMUKINO
      </Link>
    </div>
  )
}

/**
 * Fixtures and results, split across two tabs.
 *
 * Takes <MatchRow> rather than Payload `Match` docs on purpose: this is a
 * client component, so every prop is serialised into the page twice (SSR HTML
 * + Flight payload). Passing the raw `depth: 2` docs put 1.25 MB of Media
 * metadata, lineups and rich text into `/matches` to render a list of names and
 * scorelines. See `lib/matchView` for the full account.
 */
export function MatchesTabs({
  upcoming,
  previous,
  featuredUpcoming,
  featuredPrevious,
}: {
  upcoming: MatchRow[]
  previous: MatchRow[]
  featuredUpcoming: FeaturedMatch | null
  featuredPrevious: FeaturedMatch | null
}) {
  const [tab, setTab] = useState<'upcoming' | 'previous'>('previous')
  const rows = tab === 'upcoming' ? upcoming : previous
  const featured = tab === 'upcoming' ? featuredUpcoming : featuredPrevious

  return (
    <section className="section">
      <div className="container">
        <div className="matches-tabs" role="tablist" aria-label="Matches">
          <button
            type="button"
            role="tab"
            id="matches-tab-upcoming"
            aria-selected={tab === 'upcoming'}
            aria-controls="matches-panel"
            className={`matches-tabs__tab ${tab === 'upcoming' ? 'is-active' : ''}`}
            onClick={() => setTab('upcoming')}
          >
            Imikino iteganyijwe
          </button>
          <button
            type="button"
            role="tab"
            id="matches-tab-previous"
            aria-selected={tab === 'previous'}
            aria-controls="matches-panel"
            className={`matches-tabs__tab ${tab === 'previous' ? 'is-active' : ''}`}
            onClick={() => setTab('previous')}
          >
            Imikino iheruka
          </button>
        </div>

        <div
          id="matches-panel"
          role="tabpanel"
          aria-labelledby={tab === 'upcoming' ? 'matches-tab-upcoming' : 'matches-tab-previous'}
        >
          <div className="matches-label">
            {tab === 'upcoming' ? 'Imikino iteganyijwe' : 'Imikino iheruka'}
          </div>

          <FeaturedBanner featured={featured} />

          <div className="matches-list">
            {rows.length === 0 ? (
              <p className="perf__empty">No {tab} matches yet.</p>
            ) : (
              rows.map((m) => <MatchListRow key={m.id} match={m} />)
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
