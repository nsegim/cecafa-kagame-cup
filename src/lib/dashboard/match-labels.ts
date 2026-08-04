import { getPayloadClient } from '@/lib/payload'

/** Resolves a relationship field's id whether Payload returned it populated or bare. */
export function matchIdOf(ref: unknown): number | null {
  if (ref == null) return null
  return typeof ref === 'object' ? ((ref as { id?: number }).id ?? null) : Number(ref) || null
}

/** Batch-resolves match labels at depth 0 — used wherever a `match` relationship is kept unpopulated to stay cheap. */
export async function matchLabelsFor(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  ids: number[],
) {
  if (ids.length === 0) return new Map<number, string>()
  const res = await payload.find({
    collection: 'matches',
    where: { id: { in: ids } },
    limit: ids.length,
    depth: 0,
  })
  return new Map(res.docs.map((m) => [m.id, m.label ?? `Match ${m.id}`]))
}
