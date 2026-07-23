import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { GROUPS } from './Teams'

export const VENUES = [
  { label: 'Amahoro Stadium', value: 'amahoro' },
  { label: 'Kigali Pele Stadium', value: 'pele' },
] as const

export const STAGES = [
  { label: 'Group Stage', value: 'group' },
  { label: 'Semi-Final', value: 'semi' },
  { label: 'Third Place', value: 'third' },
  { label: 'Final', value: 'final' },
] as const

/**
 * Required only while the match is live and the header button is shown for
 * it — a scheduled/final fixture, or a live one with the button hidden, has
 * no need for a destination yet. Accepts an internal path (e.g. /matches/5)
 * or a full http(s) URL for an external stream.
 */
function validateLiveMatchUrl(
  value: string | null | undefined,
  { siblingData }: { siblingData?: { status?: string; showLiveButton?: boolean } },
) {
  const isLive = siblingData?.status === 'live'
  const buttonShown = siblingData?.showLiveButton !== false
  if (!value) {
    if (isLive && buttonShown) {
      return 'A Live Match URL is required while this match is Live and the Live button is shown.'
    }
    return true
  }
  if (value.startsWith('/')) return true
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Enter a valid URL starting with http:// or https://, or an internal path starting with /.'
    }
    return true
  } catch {
    return 'Enter a valid URL (e.g. https://...) or an internal path (e.g. /matches/5).'
  }
}

/**
 * One row in a Starting XI / Substitutes array — just the player relationship
 * and this match's captain flag. Name, shirt number and position all live on
 * the Players collection already, so they're read through the relationship
 * rather than duplicated here.
 */
function lineupEntryFields(side: 'home' | 'away') {
  return [
    {
      name: 'player',
      type: 'relationship' as const,
      relationTo: 'players' as const,
      required: true,
      filterOptions: ({ data }: { data?: { homeTeam?: unknown; awayTeam?: unknown } }) => {
        const teamRef = side === 'home' ? data?.homeTeam : data?.awayTeam
        const teamId =
          teamRef && typeof teamRef === 'object' ? (teamRef as { id?: number }).id : teamRef
        return teamId ? { team: { equals: teamId } } : true
      },
    },
    {
      name: 'isCaptain',
      label: 'Captain',
      type: 'checkbox' as const,
      defaultValue: false,
    },
  ]
}

function lineupGroupFields(side: 'home' | 'away') {
  return [
    {
      name: 'coach',
      type: 'text' as const,
      admin: { description: "This team's head coach for the match (optional)." },
    },
    {
      name: 'startingXI',
      label: 'Starting XI',
      type: 'array' as const,
      labels: { singular: 'Player', plural: 'Players' },
      maxRows: 11,
      admin: {
        description: 'Up to 11 players. Drag to reorder; the order shown here is the display order.',
        initCollapsed: true,
      },
      fields: lineupEntryFields(side),
    },
    {
      name: 'substitutes',
      type: 'array' as const,
      labels: { singular: 'Player', plural: 'Players' },
      admin: {
        description: 'Bench players for this match. Drag a row here from Starting XI (or back) to move it.',
        initCollapsed: true,
      },
      fields: lineupEntryFields(side),
    },
  ]
}

/** At most one player per side may be marked captain for a given match. */
function assertSingleCaptain(
  lineup: { startingXI?: Array<{ isCaptain?: boolean | null }>; substitutes?: Array<{ isCaptain?: boolean | null }> } | undefined,
  teamLabel: string,
) {
  const captains = [...(lineup?.startingXI ?? []), ...(lineup?.substitutes ?? [])].filter(
    (entry) => entry?.isCaptain,
  ).length
  if (captains > 1) {
    throw new Error(`${teamLabel} lineup has more than one player marked Captain — only one is allowed.`)
  }
}

export const Matches: CollectionConfig = {
  slug: 'matches',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['matchNumber', 'label', 'kickoff', 'status'],
    group: 'Tournament',
    description:
      'Enter a scoreline once and set status to Final. Standings, goal difference and the best-runner-up race are all derived from this — never edited by hand.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Auto-generated for the admin list view.',
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const home = siblingData?.homeTeamPlaceholder || 'Home'
            const away = siblingData?.awayTeamPlaceholder || 'Away'
            return `M${siblingData?.matchNumber ?? '?'} — ${home} vs ${away}`
          },
        ],
      },
    },
    {
      name: 'matchNumber',
      type: 'number',
      required: true,
      unique: true,
      index: true,
      min: 1,
      max: 22,
      admin: { description: 'Official fixture number, 1–22.' },
    },
    {
      name: 'stage',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'group',
      options: [...STAGES],
    },
    {
      name: 'group',
      type: 'select',
      options: [...GROUPS],
      index: true,
      admin: {
        condition: (_, siblingData) => siblingData?.stage === 'group',
        description: 'Only group-stage matches count toward a group table.',
      },
    },
    {
      name: 'homeTeam',
      type: 'relationship',
      relationTo: 'teams',
      admin: {
        description:
          'Leave empty for knockout fixtures until the group stage resolves — the placeholder below is shown instead.',
      },
    },
    {
      name: 'awayTeam',
      type: 'relationship',
      relationTo: 'teams',
    },
    {
      name: 'homeTeamPlaceholder',
      type: 'text',
      admin: { description: 'Shown when no team is set yet, e.g. "Winner Gr. B".' },
    },
    {
      name: 'awayTeamPlaceholder',
      type: 'text',
      admin: { description: 'e.g. "Best Runner-Up".' },
    },
    {
      name: 'venue',
      type: 'select',
      required: true,
      options: [...VENUES],
    },
    {
      name: 'kickoff',
      type: 'date',
      required: true,
      index: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Local Kigali time (CAT, UTC+2).',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'scheduled',
      index: true,
      options: [
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Live', value: 'live' },
        { label: 'Final', value: 'final' },
      ],
      admin: {
        description: 'Only matches marked Final are counted in the standings.',
      },
    },
    {
      name: 'homeScore',
      type: 'number',
      min: 0,
      admin: { condition: (_, s) => s?.status === 'live' || s?.status === 'final' },
    },
    {
      name: 'awayScore',
      type: 'number',
      min: 0,
      admin: { condition: (_, s) => s?.status === 'live' || s?.status === 'final' },
    },
    {
      name: 'liveMatchUrl',
      label: 'Live Match URL',
      type: 'text',
      validate: validateLiveMatchUrl,
      admin: {
        condition: (_, s) => s?.status === 'live',
        description:
          'Where the header\'s LIVE button sends visitors while this match is live — this match\'s own page (e.g. /matches/5) or an external stream link. Required while the Live button is shown below.',
      },
    },
    {
      name: 'showLiveButton',
      label: 'Show Live Button',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (_, s) => s?.status === 'live',
        position: 'sidebar',
        description:
          'Show the site-wide header LIVE button while this match is live. Turn off to track the match live internally without surfacing the public button yet.',
      },
    },
    {
      name: 'commentary',
      type: 'array',
      label: 'Live Commentary',
      labels: { singular: 'Entry', plural: 'Entries' },
      admin: {
        description:
          'Manual updates for the Live Expressions feed — post these as the match happens (chances, saves, substitutions, general commentary). Goals and cards recorded in Player Match Stats are added to the feed automatically; you don\'t need to repeat those here.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'minute',
          type: 'number',
          min: 0,
          max: 120,
          admin: { description: 'Match minute, e.g. 62. Entries are shown in minute order on the feed.' },
        },
        {
          name: 'text',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "Good save from the keeper, corner to APR."' },
        },
        {
          name: 'hidden',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Hide this entry from the public Live Expressions feed without deleting it.',
          },
        },
      ],
    },
    {
      name: 'highlightUrl',
      type: 'text',
      admin: { description: 'YouTube link for the highlights section.' },
    },
    {
      name: 'highlightThumb',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'photos',
      type: 'array',
      label: 'Match Photos',
      labels: { singular: 'Photo', plural: 'Photos' },
      admin: {
        description:
          'Shown in the Match Photos tab and interspersed through the live commentary feed on the match page.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'homeLineup',
      label: 'Home Team Lineup',
      type: 'group',
      admin: {
        description: 'Starting XI, substitutes and coach for the home team.',
      },
      fields: lineupGroupFields('home'),
    },
    {
      name: 'awayLineup',
      label: 'Away Team Lineup',
      type: 'group',
      admin: {
        description: 'Starting XI, substitutes and coach for the away team.',
      },
      fields: lineupGroupFields('away'),
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // A final result without a scoreline would silently corrupt the standings.
        if (data?.status === 'final') {
          if (typeof data.homeScore !== 'number' || typeof data.awayScore !== 'number') {
            throw new Error(
              'A match marked Final must have both a home and away score. Standings are computed from these values.',
            )
          }
        }
        assertSingleCaptain(data?.homeLineup, 'Home team')
        assertSingleCaptain(data?.awayLineup, 'Away team')
        return data
      },
    ],
    afterChange: [
      ({ doc }) => {
        // Live commentary, scores and status need to appear immediately during a
        // live match — don't make an editor wait out the page's ISR window.
        revalidatePath(`/matches/${doc.id}`)
        revalidatePath('/matches')
        revalidatePath('/')
        // The header's LIVE button is read from this collection on every page via
        // the root layout — bust every route's cache, not just the match pages,
        // so the button appears/disappears immediately site-wide.
        revalidatePath('/', 'layout')
      },
    ],
  },
}
