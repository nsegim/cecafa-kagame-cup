import type { CollectionConfig } from 'payload'

export const POSITIONS = [
  { label: 'Goalkeeper (GK)', value: 'GK' },
  { label: 'Centre-Back (CB)', value: 'CB' },
  { label: 'Left-Back (LB)', value: 'LB' },
  { label: 'Right-Back (RB)', value: 'RB' },
  { label: 'Defensive Midfielder (CDM)', value: 'CDM' },
  { label: 'Central Midfielder (CM)', value: 'CM' },
  { label: 'Attacking Midfielder (CAM)', value: 'CAM' },
  { label: 'Left Winger (LW)', value: 'LW' },
  { label: 'Right Winger (RW)', value: 'RW' },
  { label: 'Striker (ST)', value: 'ST' },
] as const

export const Players: CollectionConfig = {
  slug: 'players',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'team', 'position'],
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
    },
    {
      name: 'team',
      type: 'relationship',
      relationTo: 'teams',
      required: true,
      index: true,
    },
    {
      name: 'position',
      type: 'select',
      required: true,
      options: [...POSITIONS],
    },
    {
      name: 'shirtNumber',
      type: 'number',
      min: 1,
      max: 99,
    },
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
