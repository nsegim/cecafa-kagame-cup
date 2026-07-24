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
 * Defaults to this match's own page, so editors never have to type one in —
 * see the `beforeValidate`/`afterChange` hooks below. Left free-form so a
 * custom external stream link can still be entered instead. Accepts an
 * internal path (e.g. /matches/5) or a full http(s) URL.
 */
function validateLiveMatchUrl(value: string | null | undefined) {
  if (!value) return true
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
      admin: {
        description:
          'Optional — leave blank if the player isn’t known yet. Rows with no player are ignored on the site.',
      },
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
      label: '11 babanjemo',
      type: 'array' as const,
      labels: { singular: 'Player', plural: 'Players' },
      maxRows: 11,
      admin: {
        description:
          'Up to 11 players. Drag to reorder; the order shown here is the display order.',
        initCollapsed: true,
      },
      fields: lineupEntryFields(side),
    },
    {
      name: 'substitutes',
      type: 'array' as const,
      labels: { singular: 'Player', plural: 'Players' },
      admin: {
        description:
          'Bench players for this match. Drag a row here from Starting XI (or back) to move it.',
        initCollapsed: true,
      },
      fields: lineupEntryFields(side),
    },
  ]
}

/** At most one player per side may be marked captain for a given match. */
function assertSingleCaptain(
  lineup:
    | {
        startingXI?: Array<{ isCaptain?: boolean | null }>
        substitutes?: Array<{ isCaptain?: boolean | null }>
      }
    | undefined,
  teamLabel: string,
) {
  const captains = [...(lineup?.startingXI ?? []), ...(lineup?.substitutes ?? [])].filter(
    (entry) => entry?.isCaptain,
  ).length
  if (captains > 1) {
    throw new Error(
      `${teamLabel} lineup has more than one player marked Captain — only one is allowed.`,
    )
  }
}

export const COMMENTARY_TYPES = [
  { label: 'General Update', value: 'note' },
  { label: 'Goal', value: 'goal' },
  { label: 'Yellow Card', value: 'yellow' },
  { label: 'Red Card', value: 'red' },
  { label: 'Substitution', value: 'substitution' },
  { label: 'Half Time', value: 'halftime' },
  { label: 'Second Half (Resume)', value: 'secondhalf' },
] as const

/**
 * Commentary types that belong to one side, so they require a Team. The rest
 * (a general note, or the whole-match markers Half Time / Second Half) don't.
 */
const TEAM_COMMENTARY_TYPES = ['goal', 'yellow', 'red', 'substitution']

type CommentarySiblingData = { type?: string; team?: 'home' | 'away' }

function asCommentarySiblingData(siblingData: unknown): CommentarySiblingData {
  return (siblingData as CommentarySiblingData | undefined) ?? {}
}

/** Restricts a commentary row's player picker to whichever side (Home/Away) that same row is set to. */
function commentaryPlayerFilter({
  data,
  siblingData,
}: {
  data?: { homeTeam?: unknown; awayTeam?: unknown }
  siblingData?: unknown
}) {
  const side = asCommentarySiblingData(siblingData).team
  if (!side) return true
  const teamRef = side === 'home' ? data?.homeTeam : data?.awayTeam
  const teamId = teamRef && typeof teamRef === 'object' ? (teamRef as { id?: number }).id : teamRef
  return teamId ? { team: { equals: teamId } } : true
}

function validateCommentaryTeam(value: unknown, { siblingData }: { siblingData?: unknown }) {
  if (TEAM_COMMENTARY_TYPES.includes(asCommentarySiblingData(siblingData).type ?? '') && !value) {
    return 'Select which team this is for.'
  }
  return true
}

function validateCommentaryText(value: unknown, { siblingData }: { siblingData?: unknown }) {
  if ((asCommentarySiblingData(siblingData).type ?? 'note') === 'note' && !value) {
    return 'Enter the update text.'
  }
  return true
}

function validatePlayerForCard(value: unknown, { siblingData }: { siblingData?: unknown }) {
  // The scorer is optional for a goal — a team's squad may not be loaded yet, or
  // the scorer may be unknown, and the goal must still be recordable (it counts
  // toward the score by team either way). Cards still name the player booked.
  if (['yellow', 'red'].includes(asCommentarySiblingData(siblingData).type ?? '') && !value) {
    return 'Select the player this happened to.'
  }
  return true
}

function validatePlayerOff(value: unknown, { siblingData }: { siblingData?: unknown }) {
  if (asCommentarySiblingData(siblingData).type === 'substitution' && !value) {
    return 'Select the player coming off.'
  }
  return true
}

function validatePlayerOn(value: unknown, { siblingData }: { siblingData?: unknown }) {
  if (asCommentarySiblingData(siblingData).type === 'substitution' && !value) {
    return 'Select the player coming on.'
  }
  return true
}

/** A commentary row, narrowed to just the fields the scoreline is derived from. */
type ScoringCommentaryRow = { type?: string | null; team?: string | null; hidden?: boolean | null }

/**
 * The scoreline implied by the goals logged in the Live Commentary (the "Live
 * Expressions" feed): one goal entry per side counts as one goal for that side.
 * Hidden entries are excluded, matching what the public feed shows. Returns
 * `null` when no goals are logged at all, so the caller can leave a manually
 * entered scoreline (e.g. a knockout result typed straight in) untouched.
 */
export function scoreFromGoalCommentary(
  commentary: ScoringCommentaryRow[] | null | undefined,
): { home: number; away: number } | null {
  const goals = (commentary ?? []).filter((c) => c?.type === 'goal' && !c?.hidden)
  if (goals.length === 0) return null
  return {
    home: goals.filter((c) => c.team === 'home').length,
    away: goals.filter((c) => c.team === 'away').length,
  }
}

/**
 * Whether the scoreline fields should be shown/editable in the admin. A result
 * is relevant once a match is under way — explicitly Live or Final, or simply
 * past its kickoff time even while still marked Scheduled (a match reads as live
 * by the clock before an editor flips the status). This keeps the score editable
 * exactly when there's something to record, without cluttering future fixtures.
 */
function scoreEntryVisible(
  siblingData: { status?: unknown; kickoff?: unknown } | undefined,
): boolean {
  const status = siblingData?.status
  if (status === 'live' || status === 'final') return true
  const kickoff = siblingData?.kickoff
  return typeof kickoff === 'string' && new Date(kickoff).getTime() <= Date.now()
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
      max: 99,
      admin: {
        description:
          'Official fixture number. 1–22 are the tournament fixtures; use a higher number (e.g. 99) for a test or extra match.',
      },
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
      name: 'manualScore',
      label: 'Enter result manually',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        condition: (_, s) => scoreEntryVisible(s),
        description:
          'Turn on to type the scoreline yourself below. Off (default) means goals logged in Live Commentary set the score automatically.',
      },
    },
    {
      name: 'homeScore',
      type: 'number',
      min: 0,
      admin: {
        condition: (_, s) => scoreEntryVisible(s),
        description:
          'With “Enter result manually” on, type the home score here. Otherwise it is auto-filled from goals in Live Commentary.',
      },
    },
    {
      name: 'awayScore',
      type: 'number',
      min: 0,
      admin: {
        condition: (_, s) => scoreEntryVisible(s),
        description:
          'With “Enter result manually” on, type the away score here. Otherwise it is auto-filled from goals in Live Commentary.',
      },
    },
    {
      name: 'liveMatchUrl',
      label: 'Live Match URL',
      type: 'text',
      validate: validateLiveMatchUrl,
      admin: {
        condition: (_, s) => s?.status !== 'final',
        description:
          "Where the header's LIVE button sends visitors once this match is live — defaults to this match's own page automatically, or enter an external stream link instead.",
      },
    },
    {
      name: 'showLiveButton',
      label: 'Show Live Button',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        condition: (_, s) => s?.status !== 'final',
        position: 'sidebar',
        description:
          'Show the site-wide header LIVE button once this match is live. A match automatically counts as live from its kickoff time (or you can set Status to Live yourself). Turn this off to keep the button hidden regardless.',
      },
    },
    {
      name: 'commentary',
      type: 'array',
      label: 'Live Commentary',
      labels: { singular: 'Entry', plural: 'Entries' },
      admin: {
        description:
          'Everything that happens in the match, in order. Goals, cards and substitutions post here with the matching graphic on the Live Expressions feed — no need to duplicate them in Player Match Stats. A photo can optionally be attached to any entry.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'minute',
          type: 'number',
          min: 0,
          max: 120,
          admin: {
            description: 'Match minute, e.g. 62. Entries are shown in minute order on the feed.',
          },
        },
        {
          name: 'type',
          type: 'select',
          defaultValue: 'note',
          options: [...COMMENTARY_TYPES],
          admin: {
            description: 'Determines which icon/graphic this entry shows with on the feed.',
          },
        },
        {
          name: 'team',
          label: 'Team',
          type: 'select',
          options: [
            { label: 'Home', value: 'home' },
            { label: 'Away', value: 'away' },
          ],
          validate: validateCommentaryTeam,
          admin: {
            condition: (_, s) => TEAM_COMMENTARY_TYPES.includes(s?.type),
            description: 'Which side this happened for.',
          },
        },
        {
          name: 'player',
          label: 'Player',
          type: 'relationship',
          relationTo: 'players',
          validate: validatePlayerForCard,
          filterOptions: commentaryPlayerFilter,
          admin: {
            condition: (_, s) => ['goal', 'yellow', 'red'].includes(s?.type),
            description:
              'Who scored or was booked. Optional for a goal — leave blank if the scorer isn’t known or the squad isn’t loaded; the goal still counts for the team.',
          },
        },
        {
          name: 'playerOff',
          label: 'Player Off',
          type: 'relationship',
          relationTo: 'players',
          validate: validatePlayerOff,
          filterOptions: commentaryPlayerFilter,
          admin: {
            condition: (_, s) => s?.type === 'substitution',
            description: 'Player being substituted off.',
          },
        },
        {
          name: 'playerOn',
          label: 'Player On',
          type: 'relationship',
          relationTo: 'players',
          validate: validatePlayerOn,
          filterOptions: commentaryPlayerFilter,
          admin: {
            condition: (_, s) => s?.type === 'substitution',
            description: 'Player coming on.',
          },
        },
        {
          name: 'text',
          type: 'textarea',
          validate: validateCommentaryText,
          admin: {
            rows: 5,
            description:
              'The update text — write as many lines and paragraphs as you need (press Enter for a new line; leave a blank line between paragraphs). For a goal/card/substitution this is optional extra detail on top of the automatic caption.',
          },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'Optional photo shown with this update.' },
        },
        {
          name: 'hidden',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description:
              'Hide this entry from the public Live Expressions feed without deleting it.',
          },
        },
      ],
    },
    {
      // Ready-to-paste <iframe> for this match's Live Expressions feed
      // (`/embed/matches/{id}` — content only, no header/footer). Sits right
      // after the Live Commentary it embeds. See components/admin/EmbedCode.
      name: 'embedCode',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/EmbedCode#EmbedCode',
        },
      },
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
      name: 'bulkPhotoUpload',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/admin/BulkPhotoUpload#BulkPhotoUpload',
        },
      },
    },
    {
      name: 'photos',
      type: 'array',
      label: 'Match Photos',
      labels: { singular: 'Photo', plural: 'Photos' },
      admin: {
        description:
          'Shown in the Match Photos tab and interspersed through the live commentary feed on the match page. Use “Bulk upload photos” above to add several at once.',
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
        description: '11 babanjemo, substitutes and coach for the home team.',
      },
      fields: lineupGroupFields('home'),
    },
    {
      name: 'awayLineup',
      label: 'Away Team Lineup',
      type: 'group',
      admin: {
        description: '11 babanjemo, substitutes and coach for the away team.',
      },
      fields: lineupGroupFields('away'),
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Goals logged in the Live Commentary (the "Live Expressions" feed) drive
        // the scoreline automatically, so scoring a goal there updates the
        // scoreboard and standings — an editor never has to also type the numbers.
        // Turning on `manualScore` opts out: the editor types/corrects the result
        // by hand and commentary never overrides it. When auto-scoring is on but no
        // goals are logged, the score also stays as entered.
        if (data && !data.manualScore) {
          const derived = scoreFromGoalCommentary(data.commentary)
          if (derived) {
            data.homeScore = derived.home
            data.awayScore = derived.away
          }
        }
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
        // Note: the Live Match URL is left exactly as entered. When it's blank,
        // getActiveLiveMatch() falls back to this match's own page (/matches/{id})
        // at read time — so there's no follow-up write to persist a default.
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
