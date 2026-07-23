import Image from 'next/image'
import type { Team } from '@/payload-types'

const FLAG: Record<string, string> = {
  RW: '🇷🇼',
  UG: '🇺🇬',
  KE: '🇰🇪',
  TZ: '🇹🇿',
  ZNZ: '🇹🇿', // Zanzibar competes under Tanzania's flag
  SO: '🇸🇴',
  SS: '🇸🇸',
  SD: '🇸🇩',
}

export function flagFor(country?: string | null): string {
  return (country && FLAG[country]) || '🏳️'
}

function mediaUrl(crest: Team['crest']): string | null {
  if (!crest || typeof crest === 'number') return null
  const sizeUrl = crest.sizes?.crest?.url
  return sizeUrl || crest.url || null
}

/**
 * A club badge. Uses the uploaded crest when present, otherwise a tidy
 * monogram tile so the layout never shows a broken image before art arrives.
 */
export function TeamCrest({
  team,
  size = 34,
}: {
  team: Pick<Team, 'name' | 'shortName' | 'country' | 'crest'> | null | undefined
  size?: number
}) {
  const url = team ? mediaUrl(team.crest) : null

  if (url && team) {
    return (
      <Image
        src={url}
        alt={`${team.name} crest`}
        width={size}
        height={size}
        className="crest crest--img"
        style={{ width: size, height: size }}
      />
    )
  }

  const label = team?.shortName || team?.name?.slice(0, 3).toUpperCase() || '—'
  return (
    <span
      className="crest crest--mono"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
      aria-hidden="true"
      title={team?.name}
    >
      {label}
    </span>
  )
}
