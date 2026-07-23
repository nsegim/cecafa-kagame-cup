import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type {
  Adapter,
  GenerateURL,
  HandleDelete,
  HandleUpload,
  StaticHandler,
} from '@payloadcms/plugin-cloud-storage/types'
import { v2 as cloudinary } from 'cloudinary'
import path from 'path'

/**
 * Cloudinary storage for Payload's Media uploads.
 *
 * Built on `@payloadcms/plugin-cloud-storage` with a small Cloudinary adapter.
 * Every original AND every generated size variant (crest/thumbnail/card/hero)
 * is pushed to Cloudinary, so the frontend keeps reading `sizes.<name>.url`
 * exactly as before — the URLs simply point at `res.cloudinary.com` now.
 *
 * The plugin only activates when Cloudinary credentials are present. Without
 * them Payload falls back to local disk, which keeps the app buildable and
 * runnable in environments (CI, a fresh clone) that have no Cloudinary account.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const API_KEY = process.env.CLOUDINARY_API_KEY
const API_SECRET = process.env.CLOUDINARY_API_SECRET
const FOLDER = process.env.CLOUDINARY_FOLDER || 'cecafa'

export const cloudinaryEnabled = Boolean(CLOUD_NAME && API_KEY && API_SECRET)

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
    secure: true,
  })
}

/** Everything is stored under one folder, keyed by filename (no extension in the id). */
function publicId(prefix: string | undefined, filename: string): string {
  const withoutExt = filename.replace(path.extname(filename), '')
  return [FOLDER, prefix, withoutExt].filter(Boolean).join('/')
}

function fileExt(filename: string): string | undefined {
  const ext = path.extname(filename).replace('.', '')
  return ext || undefined
}

const cloudinaryAdapter: Adapter = ({ prefix }) => {
  const handleUpload: HandleUpload = async ({ file }) => {
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId(prefix, file.filename),
          resource_type: 'image',
          overwrite: true,
          invalidate: true,
          use_filename: false,
          unique_filename: false,
        },
        (error) => (error ? reject(error) : resolve()),
      )
      stream.end(file.buffer)
    })
  }

  const handleDelete: HandleDelete = async ({ filename, doc }) => {
    await cloudinary.uploader.destroy(publicId(doc?.prefix, filename), {
      resource_type: 'image',
      invalidate: true,
    })
  }

  const generateURL: GenerateURL = ({ filename, prefix: docPrefix }) =>
    cloudinary.url(publicId(docPrefix, filename), {
      secure: true,
      resource_type: 'image',
      format: fileExt(filename),
    })

  // Proxies /api/media/file/:filename through to Cloudinary (used by admin
  // thumbnails and any consumer that hits Payload's file endpoint directly).
  const staticHandler: StaticHandler = async (_req, { params }) => {
    const url = cloudinary.url(publicId(params.prefix, params.filename), {
      secure: true,
      resource_type: 'image',
      format: fileExt(params.filename),
    })
    const upstream = await fetch(url)
    if (!upstream.ok || !upstream.body) {
      return new Response(null, { status: 404, statusText: 'Not Found' })
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  }

  return {
    name: 'cloudinary',
    handleUpload,
    handleDelete,
    generateURL,
    staticHandler,
  }
}

/**
 * The configured storage plugin for `payload.config.ts`.
 *
 * When credentials are missing this returns a disabled plugin, so Payload keeps
 * using local disk storage and the app still boots.
 */
export const cloudinaryStorage = () =>
  cloudStoragePlugin({
    enabled: cloudinaryEnabled,
    // Keep the injected fields in the schema even when Cloudinary is off, so the
    // database shape is identical whether or not credentials are configured.
    alwaysInsertFields: true,
    collections: {
      media: {
        adapter: cloudinaryEnabled ? cloudinaryAdapter : null,
        disableLocalStorage: cloudinaryEnabled,
      },
    },
  })
