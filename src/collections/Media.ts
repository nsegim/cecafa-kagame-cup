import type { CollectionConfig } from 'payload'

/** Turns an uploaded file name into a readable label for alt/caption. */
export function labelFromFilename(filename: string): string {
  return filename
    .replace(/\.[^./\\]+$/, '') // drop the extension
    .replace(/[_-]+/g, ' ') // dashes / underscores -> spaces
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim()
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: {
        description:
          'Auto-filled from the file name on upload — edit it to best describe the image for screen readers (e.g. "APR FC club crest").',
      },
    },
    {
      name: 'caption',
      type: 'text',
      admin: {
        description: 'Auto-filled from the file name on upload — edit or clear it. Shown in galleries and articles.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      // On upload, seed alt + caption from the file name so an editor never has
      // to type them just to save — only when they're left blank, so a value the
      // editor did enter is kept. Runs on create only, so clearing or editing
      // either field later sticks (a later save won't re-fill it).
      ({ data, req, operation }) => {
        if (!data || operation !== 'create') return data
        const uploadedName =
          typeof req?.file?.name === 'string'
            ? req.file.name
            : typeof data.filename === 'string'
              ? data.filename
              : undefined
        if (uploadedName) {
          const label = labelFromFilename(uploadedName)
          if (label) {
            if (!data.alt) data.alt = label
            if (!data.caption) data.caption = label
          }
        }
        return data
      },
    ],
  },
  upload: {
    imageSizes: [
      { name: 'crest', width: 128, height: 128, position: 'centre' },
      { name: 'thumbnail', width: 400, height: 225, position: 'centre' },
      { name: 'card', width: 768, height: 432, position: 'centre' },
      { name: 'hero', width: 1600, height: 900, position: 'centre' },
    ],
    focalPoint: true,
    mimeTypes: ['image/*'],
  },
}
