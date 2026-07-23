import type { CollectionConfig } from 'payload'

/**
 * One row per player per match. The Top Scorer / Top Assists / Clean Sheets
 * tables on the homepage are aggregated from these rows at request time —
 * there is deliberately no stored "top scorers" table to drift out of sync.
 */
export const PlayerMatchStats: CollectionConfig = {
  slug: 'player-match-stats',
  labels: {
    singular: 'Player Match Stat',
    plural: 'Player Match Stats',
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['player', 'match', 'goals', 'assists', 'cleanSheet'],
    group: 'Tournament',
    description: 'Record what each player did in a given match.',
  },
  access: {
    read: () => true,
  },
  indexes: [
    {
      fields: ['player', 'match'],
      unique: true,
    },
  ],
  fields: [
    {
      name: 'player',
      type: 'relationship',
      relationTo: 'players',
      required: true,
      index: true,
    },
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      required: true,
      index: true,
    },
    {
      name: 'goals',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'assists',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'cleanSheet',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Goalkeepers and defenders who finished a match without conceding.',
      },
    },
    {
      name: 'minutes',
      type: 'number',
      min: 0,
      max: 120,
    },
    {
      name: 'yellowCards',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      max: 2,
      admin: {
        description: 'Feeds CECAFA fair-play points (tiebreaker 6). Record every card.',
      },
    },
    {
      name: 'redCards',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      max: 1,
    },
  ],
}
