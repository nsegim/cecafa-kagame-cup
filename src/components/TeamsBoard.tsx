'use client'

import { useState } from 'react'
import type { Team } from '@/payload-types'
import type { GroupId, StandingRow } from '@/lib/standings'
import { StandingsTable } from './StandingsTable'
import { TeamCrest } from './TeamCrest'

const GROUPS: GroupId[] = ['A', 'B', 'C']

/** ISO-ish codes stored on teams → the country label shown on the card. */
const COUNTRY: Record<string, string> = {
  RW: 'Rwanda',
  UG: 'Uganda',
  KE: 'Kenya',
  TZ: 'Tanzania',
  ZNZ: 'Zanzibar',
  SO: 'Somalia',
  SS: 'South Sudan',
  SD: 'Sudan',
  ET: 'Ethiopia',
  DJ: 'Djibouti',
  ER: 'Eritrea',
  BI: 'Burundi',
}

function TeamCard({ team }: { team: Team }) {
  return (
    <article className="team-card">
      <div className="team-card__media">
        <span className="team-card__group">Group {team.group}</span>
      </div>
      <div className="team-card__info">
        <TeamCrest team={team} size={54} />
        <div className="team-card__text">
          <span className="team-card__country">{COUNTRY[team.country ?? ''] ?? team.country}</span>
          <span className="team-card__name">{team.name}</span>
        </div>
      </div>
    </article>
  )
}

export function TeamsBoard({
  teams,
  tables,
}: {
  teams: Team[]
  tables: Record<GroupId, StandingRow[]>
}) {
  const [filter, setFilter] = useState<'all' | GroupId>('all')
  const teamsById = new Map(teams.map((t) => [t.id, t]))
  const shown = filter === 'all' ? teams : teams.filter((t) => t.group === filter)

  return (
    <>
      <div className="teams-tabs" role="tablist" aria-label="Filter teams by group">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`teams-tab ${filter === 'all' ? 'is-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Amatsinda yose
        </button>
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={filter === g}
            className={`teams-tab ${filter === g ? 'is-active' : ''}`}
            onClick={() => setFilter(g)}
          >
            Itsinda {g}
          </button>
        ))}
      </div>

      <div className="teams-layout">
        <div className="teams-grid">
          {shown.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>

        <aside className="teams-side">
          {GROUPS.map((g) => (
            <StandingsTable key={g} group={g} rows={tables[g]} teamsById={teamsById} />
          ))}
        </aside>
      </div>
    </>
  )
}
