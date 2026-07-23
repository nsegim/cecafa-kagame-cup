import type { CollectionConfig } from 'payload'
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
      name: 'highlightUrl',
      type: 'text',
      admin: { description: 'YouTube link for the highlights section.' },
    },
    {
      name: 'highlightThumb',
      type: 'upload',
      relationTo: 'media',
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
        return data
      },
    ],
  },
}
