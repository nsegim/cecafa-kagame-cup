import Image from 'next/image'
import type { Team } from '@/payload-types'
import type { SideView } from '@/lib/matchView'

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
 * A club badge rendered from an already-resolved <SideView>.
 *
 * This is the variant to prefer at a server→client boundary: it needs two
 * strings and a URL rather than a whole `Team` doc (which drags its `crest`
 * Media doc and every size variant across the wire with it). See `lib/matchView`.
 */
export function CrestView({ side, size = 34 }: { side: SideView; size?: number }) {
  if (side.crestUrl) {
    return (
      <Image
        src={side.crestUrl}
        alt={`${side.label} crest`}
        width={size}
        height={size}
        className="crest crest--img"
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className="crest crest--mono"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
      aria-hidden="true"
      title={side.teamName ?? undefined}
    >
      {side.crestMonogram}
    </span>
  )
}

/**
 * A club badge. Uses the uploaded crest when present, otherwise a tidy
 * monogram tile so the layout never shows a broken image before art arrives.
 *
 * Takes a full `Team`, so it is only safe inside a server component — see
 * <CrestView> for the boundary-crossing variant.
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
