'use client'

import { useState } from 'react'
import type { LineupPlayerEntry, TeamLineup } from '@/lib/tournament'

const POS_LABEL: Record<string, string> = {
  GK: 'GK',
  CB: 'DF',
  LB: 'DF',
  RB: 'DF',
  CDM: 'MF',
  CM: 'MF',
  CAM: 'MF',
  LW: 'FW',
  RW: 'FW',
  ST: 'FW',
}

function PlayerRow({ entry }: { entry: LineupPlayerEntry }) {
  const { player, isCaptain } = entry
  return (
    <li className="lineup__row">
      <span className="lineup__num">{player.shirtNumber ?? '–'}</span>
      <span className="lineup__name">
        {player.name}
        {isCaptain ? ' (C)' : ''}
      </span>
      <span className="lineup__pos">{POS_LABEL[player.position] ?? player.position}</span>
    </li>
  )
}

export function Lineups({
  homeName,
  awayName,
  homeLineup,
  awayLineup,
}: {
  homeName: string
  awayName: string
  homeLineup: TeamLineup | null
  awayLineup: TeamLineup | null
}) {
  const [side, setSide] = useState<'home' | 'away'>('home')

  // Nothing entered for either team yet — hide the section rather than show
  // an empty placeholder card.
  if (!homeLineup && !awayLineup) return null

  const lineup = side === 'home' ? homeLineup : awayLineup
  const starting = lineup?.startingXI ?? []
  const subs = lineup?.substitutes ?? []

  return (
    <div className="sidecard">
      <div className="sidecard__head">Starting XI</div>
      <div className="lineup__toggle" role="tablist" aria-label="Choose team">
        <button
          type="button"
          role="tab"
          aria-selected={side === 'home'}
          className={`lineup__team ${side === 'home' ? 'is-active' : ''}`}
          onClick={() => setSide('home')}
        >
          {homeName}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={side === 'away'}
          className={`lineup__team ${side === 'away' ? 'is-active' : ''}`}
          onClick={() => setSide('away')}
        >
          {awayName}
        </button>
      </div>

      {starting.length === 0 ? (
        <p className="lineup__empty">Line-up to be confirmed.</p>
      ) : (
        <>
          <ol className="lineup__list">
            {starting.map((entry) => (
              <PlayerRow key={entry.player.id} entry={entry} />
            ))}
          </ol>
          {subs.length > 0 && (
            <>
              <div className="lineup__subhead">Substitutes</div>
              <ol className="lineup__list lineup__list--subs">
                {subs.map((entry) => (
                  <PlayerRow key={entry.player.id} entry={entry} />
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </div>
  )
}
