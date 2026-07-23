'use client'

import { useState } from 'react'
import type { Player } from '@/payload-types'

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

function PlayerRow({ player }: { player: Player }) {
  return (
    <li className="lineup__row">
      <span className="lineup__num">{player.shirtNumber ?? '–'}</span>
      <span className="lineup__name">{player.name}</span>
      <span className="lineup__pos">{POS_LABEL[player.position] ?? player.position}</span>
    </li>
  )
}

export function Lineups({
  homeName,
  awayName,
  homePlayers,
  awayPlayers,
}: {
  homeName: string
  awayName: string
  homePlayers: Player[]
  awayPlayers: Player[]
}) {
  const [side, setSide] = useState<'home' | 'away'>('home')
  const players = side === 'home' ? homePlayers : awayPlayers
  const starting = players.slice(0, 11)
  const subs = players.slice(11)

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

      {players.length === 0 ? (
        <p className="lineup__empty">Line-up to be confirmed.</p>
      ) : (
        <>
          <ol className="lineup__list">
            {starting.map((p) => (
              <PlayerRow key={p.id} player={p} />
            ))}
          </ol>
          {subs.length > 0 && (
            <>
              <div className="lineup__subhead">Substitutes</div>
              <ol className="lineup__list lineup__list--subs">
                {subs.map((p) => (
                  <PlayerRow key={p.id} player={p} />
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </div>
  )
}
