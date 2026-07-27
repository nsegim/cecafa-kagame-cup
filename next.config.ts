import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/**
 * Scope the image optimiser to OUR Cloudinary account rather than all of
 * `res.cloudinary.com`. With `/**` any third party could point our optimiser at
 * their own Cloudinary assets and bill the transformations to this origin.
 * Falls back to the open pattern when the cloud name isn't configured, since
 * Payload also falls back to local disk storage in that case.
 */
const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME
const cloudinaryPathname = cloudinaryCloudName ? `/${cloudinaryCloudName}/**` : '/**'

/**
 * Baseline security headers for every route that is NOT an embed.
 *
 * Note on framing: the previous comment here assumed unlisted routes "keep the
 * platform's default (unframed)". There is no such default — Next sets neither
 * `X-Frame-Options` nor `frame-ancestors`, so the whole site, admin included,
 * was framable by anyone. `frame-ancestors 'self'` is the actual fix.
 */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // One year, deliberately WITHOUT `includeSubDomains` or `preload` — this app
  // may be served from a subdomain of a wider estate, and neither of those is
  // ours to switch on for the parent domain.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP second, original last. Next only negotiates WebP by
    // default; AVIF typically saves another 20-30% on photographic content,
    // which is most of what this site serves.
    formats: ['image/avif', 'image/webp'],
    localPatterns: [
      {
        pathname: '/assets/**',
      },
      {
        pathname: '/design/**',
      },
      // Payload media served from local disk (the fallback when a file wasn't
      // uploaded to Cloudinary) comes back as `/api/media/file/<name>`. Without
      // this, <Image> throws on any such URL and takes the whole page down —
      // e.g. a homepage featured article whose image is a local upload.
      {
        pathname: '/api/media/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: cloudinaryPathname,
      },
    ],
  },
  async headers() {
    return [
      // The `/embed/*` Live Expressions frames are meant to be embedded on other
      // sites (a newsletter, IGIHE pages, partner sites), so they must not be
      // frame-blocked. `frame-ancestors *` opts these routes into being iframed
      // anywhere. To restrict embedding to specific hosts later, replace `*`
      // with a space-separated allowlist, e.g.
      // "'self' https://igihe.com https://*.igihe.com".
      //
      // They still get the non-framing hardening below.
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
          ...securityHeaders.filter((h) => h.key !== 'Content-Security-Policy'),
        ],
      },
      // Everything that is not an embed.
      {
        source: '/((?!embed/).*)',
        headers: securityHeaders,
      },
    ]
  },
  // Only consulted by the webpack builder. This project builds and dev-serves on
  // Turbopack (which resolves TS extensions natively), so this block is inert
  // today — it is kept solely so a `--webpack` fallback still resolves Payload's
  // `.js`-suffixed ESM imports. Do not add new config here expecting it to run.
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
