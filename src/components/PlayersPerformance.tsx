'use client'

import { useState } from 'react'
import Image from 'next/image'

export interface PerfRow {
  name: string
  team: string
  teamShort: string
  position: string
  played: number
  goals: number
  assists: number
  cleanSheets: number
  photoUrl?: string | null
}

type Tab = 'goals' | 'assists' | 'cleanSheets'

const TABS: { id: Tab; label: string }[] = [
  { id: 'goals', label: 'UWATSINZE BYINSHI' },
  { id: 'assists', label: 'UWATANZE ‘ASSISTS’ NYINSHI' },
  { id: 'cleanSheets', label: 'UTARINJIJWE IGITEGO' },
]

export function PlayersPerformance({ goals, assists, cleanSheets }: Record<Tab, PerfRow[]>) {
  const [tab, setTab] = useState<Tab>('goals')
  const data = { goals, assists, cleanSheets }[tab]

  // Match the mockup: Player · Position · Played · Goals · Assists. On the clean
  // sheets tab the last stat column becomes Clean Sheets. The sorted metric is
  // emphasised.
  const statCols: { key: Tab; label: string }[] =
    tab === 'cleanSheets'
      ? [{ key: 'cleanSheets', label: 'Clean Sheets' }]
      : [
          { key: 'goals', label: 'Goals' },
          { key: 'assists', label: 'Assists' },
        ]

  return (
    <section className="section" id="players">
      <div className="container">
        <div className="section-head">
          <span className="kicker">IMIBARE</span>
          <h2>Uko abakinnyi bahagaze</h2>
        </div>

        <div className="perf__tabs" role="tablist" aria-label="Performance metric">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              className={`perf__tab ${t.id === tab ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="perf__table-wrap">
          <table className="perf__table">
            <thead>
              <tr>
                <th className="perf__th-player">UMUKINNYI</th>
                <th>UMWANYA</th>
                <th className="perf__num">IMIKINO</th>
                {statCols.map((c) => (
                  <th key={c.key} className="perf__num">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={3 + statCols.length} className="perf__empty">
                    No player data yet — the leaderboard fills in once matches are played from 24
                    July.
                  </td>
                </tr>
              ) : (
                data.map((r, i) => (
                  <tr key={`${r.name}-${i}`}>
                    <td className="perf__player">
                      <span className="perf__avatar" aria-hidden="true">
                        {r.photoUrl ? (
                          <Image src={r.photoUrl} alt="" width={60} height={80} />
                        ) : (
                          r.name.slice(0, 1)
                        )}
                      </span>
                      <span className="perf__names">
                        <span className="perf__name">{r.name}</span>
                        <span className="perf__club">{r.teamShort}</span>
                      </span>
                    </td>
                    <td className="perf__pos">{r.position}</td>
                    <td className="perf__num">{r.played}</td>
                    {statCols.map((c) => (
                      <td key={c.key} className={`perf__num ${c.key === tab ? 'perf__stat' : ''}`}>
                        {r[c.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
