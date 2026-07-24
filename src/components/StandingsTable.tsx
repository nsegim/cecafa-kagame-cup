import type { Team } from '@/payload-types'
import type { GroupId, StandingRow } from '@/lib/standings'
import { TeamCrest } from './TeamCrest'

export function StandingsTable({
  group,
  rows,
  teamsById,
}: {
  group: GroupId
  rows: StandingRow[]
  teamsById: Map<number, Team>
}) {
  return (
    <div className="standings">
      <div className="standings__head">
        <span className="standings__group">Itsinda {group}</span>
        <span className="standings__cols">
          <span>W</span>
          <span>D</span>
          <span>L</span>
          <span>GD</span>
          <span className="standings__pts-h">PTS</span>
        </span>
      </div>

      <ol className="standings__body">
        {rows.map((r) => {
          const team = teamsById.get(Number(r.teamId))
          return (
            <li key={String(r.teamId)} className="standings__row">
              <span className="standings__team">
                <TeamCrest team={team} size={26} />
                <span className="standings__name">{team?.shortName ?? r.name}</span>
                {r.requiresDrawOfLots && (
                  <span
                    className="standings__lots"
                    title="Level on all criteria — awaiting drawing of lots"
                  >
                    ⚖
                  </span>
                )}
              </span>
              <span className="standings__cols">
                <span>{r.won}</span>
                <span>{r.drawn}</span>
                <span>{r.lost}</span>
                <span
                  className={r.goalDifference > 0 ? 'is-pos' : r.goalDifference < 0 ? 'is-neg' : ''}
                >
                  {r.goalDifference > 0 ? '+' : ''}
                  {r.goalDifference}
                </span>
                <span className="standings__pts">{r.points}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
