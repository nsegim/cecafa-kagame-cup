/**
 * Shared, request-memoized Payload local API client.
 *
 * `getPayload()` itself is cheap to call repeatedly (Payload memoizes by config
 * internally), but wrapping it in React's `cache()` de-dupes it within a single
 * render pass — if several Server Components on the same page each need the
 * client, they share one call instead of each awaiting their own.
 */
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

export const getPayloadClient = cache(async () => getPayload({ config: await config }))
