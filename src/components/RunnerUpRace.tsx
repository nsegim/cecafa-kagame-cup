import type { Team } from '@/payload-types'
import type { StandingRow } from '@/lib/standings'
import { computeRunnerUpRace } from '@/lib/standings'
import type { GroupId } from '@/lib/standings'
import { TeamCrest } from './TeamCrest'

/**
 * The fourth semi-finalist. Three groups produce three runners-up but only ONE
 * advances, so this panel tracks that race — decided on points, then goal
 * difference, then goals scored. Before the group stage ends the slots read
 * "Runner-up TBC", exactly as the mockup shows on day one.
 */
export function RunnerUpRace({
  tables,
  teamsById,
  decided,
}: {
  tables: Record<GroupId, StandingRow[]>
  teamsById: Map<number, Team>
  decided: boolean
}) {
  const race = computeRunnerUpRace(tables)
  const anyPlayed = race.some((r) => r.played > 0)

  return (
    <section className="runnerup-section">
      <div className="container">
      <div className="runnerup runnerup__inner">
        <div className="runnerup__text">
          <h2 className="runnerup__title">The fourth semi-finalist</h2>
          <p className="runnerup__lead">
            Only one runner-up goes through, and it is decided across three separate groups.
            Finishing second in Group A is not the same as finishing second in Group C. We track the
            race here, all fifteen days.
          </p>
          <p className="runnerup__note">
            {decided
              ? 'Group stage complete — the best runner-up is confirmed.'
              : 'Race opens 24 July · Points, then goal difference, then goals scored'}
          </p>
        </div>

        <ol className="runnerup__list">
          {[0, 1, 2].map((idx) => {
            const row = anyPlayed ? race[idx] : undefined
            const team = row ? teamsById.get(Number(row.teamId)) : undefined
            const leader = decided && idx === 0
            return (
              <li key={idx} className="runnerup__slot">
                <span className="runnerup__rank">{idx + 1}</span>
                <span className={`runnerup__club ${leader ? 'is-leader' : ''}`}>
                  {team ? (
                    <>
                      <TeamCrest team={team} size={28} />
                      <span>{team.name}</span>
                      <span className="runnerup__from">Group {row?.group}</span>
                    </>
                  ) : (
                    <span className="runnerup__tbc">Runner-up TBC</span>
                  )}
                </span>
                <span className="runnerup__pts">{row?.points ?? 0}</span>
              </li>
            )
          })}
        </ol>
      </div>
      </div>
    </section>
  )
}
