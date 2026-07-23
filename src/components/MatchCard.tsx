import type { Match } from '@/payload-types'
import { TeamCrest } from './TeamCrest'
import { matchDate, matchTime } from '@/lib/datetime'
import { VENUE_LABEL, matchSide } from '@/lib/matchLabels'

export function MatchCard({ match }: { match: Match }) {
  const home = matchSide(match.homeTeam, match.homeTeamPlaceholder)
  const away = matchSide(match.awayTeam, match.awayTeamPlaceholder)
  const played = match.status === 'final' || match.status === 'live'

  return (
    <article className={`match-card ${played ? 'match-card--result' : ''}`}>
      <div className="match-card__body">
        <div className="match-card__team">
          <TeamCrest team={home.team} size={40} />
          <span className="match-card__name">{home.label}</span>
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
          <TeamCrest team={away.team} size={40} />
          <span className="match-card__name">{away.label}</span>
        </div>
      </div>

      <footer className="match-card__meta">
        <span className="match-card__venue">{VENUE_LABEL[match.venue] ?? match.venue}</span>
        {match.status === 'live' ? (
          <span className="badge badge--live">Live</span>
        ) : (
          <span className="match-card__date">
            {matchDate(match.kickoff)} {matchTime(match.kickoff)}
          </span>
        )}
      </footer>
    </article>
  )
}
