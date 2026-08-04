import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Teams } from './collections/Teams'
import { Matches } from './collections/Matches'
import { MatchCommentary } from './collections/MatchCommentary'
import { MatchPhotos } from './collections/MatchPhotos'
import { Players } from './collections/Players'
import { PlayerMatchStats } from './collections/PlayerMatchStats'
import { Subscribers } from './collections/Subscribers'
import { Articles } from './collections/Articles'
import { GalleryImages } from './collections/GalleryImages'
import { Videos } from './collections/Videos'
import { Gallery } from './globals/Gallery'
import { cloudinaryStorage } from './storage/cloudinary'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    // /admin access itself is gated on Users' own `access.admin` (see
    // src/collections/Users.ts) — the custom /dashboard is now the primary
    // interface, /admin stays live only as a super_admin fallback.
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— CECAFA Kagame Cup 2026',
    },
  },
  collections: [
    Users,
    Media,
    Teams,
    Matches,
    MatchCommentary,
    MatchPhotos,
    Players,
    PlayerMatchStats,
    Articles,
    GalleryImages,
    Videos,
    Subscribers,
  ],
  globals: [Gallery],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.NEW_DB_DATABASE_URL || '',
    },
  }),
  sharp,
  localization: {
    locales: ['en'],
    fallback: true,
    defaultLocale: 'en',
  },
  plugins: [cloudinaryStorage()],
})
