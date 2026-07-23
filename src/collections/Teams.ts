import type { CollectionConfig } from 'payload'

export const COUNTRIES = [
  { label: 'Rwanda', value: 'RW' },
  { label: 'Uganda', value: 'UG' },
  { label: 'Kenya', value: 'KE' },
  { label: 'Tanzania', value: 'TZ' },
  { label: 'Zanzibar', value: 'ZNZ' },
  { label: 'Somalia', value: 'SO' },
  { label: 'South Sudan', value: 'SS' },
  { label: 'Sudan', value: 'SD' },
] as const

export const GROUPS = [
  { label: 'Group A', value: 'A' },
  { label: 'Group B', value: 'B' },
  { label: 'Group C', value: 'C' },
] as const

export const Teams: CollectionConfig = {
  slug: 'teams',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'group', 'country'],
    group: 'Tournament',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Full club name, e.g. "Gor Mahia FC"' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'URL identifier, e.g. "gor-mahia"' },
    },
    {
      name: 'shortName',
      type: 'text',
      required: true,
      admin: { description: 'Abbreviation for tight layouts, e.g. "GOR"' },
    },
    {
      name: 'country',
      type: 'select',
      required: true,
      options: [...COUNTRIES],
    },
    {
      name: 'group',
      type: 'select',
      required: true,
      index: true,
      options: [...GROUPS],
    },
    {
      name: 'crest',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Club badge — square PNG with transparency preferred.' },
    },
    {
      name: 'drawOfLotsRank',
      type: 'number',
      admin: {
        position: 'sidebar',
        description:
          'CECAFA tiebreaker 7. Leave empty. Only fill this in if officials physically draw lots to separate teams level on every other criterion — lower number ranks higher.',
      },
    },
  ],
}
