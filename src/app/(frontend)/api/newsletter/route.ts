import { getPayloadClient } from '@/lib/payload'
import { NextResponse } from 'next/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let email = ''
  try {
    const body = await req.json()
    email = String(body?.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }

  const payload = await getPayloadClient()

  // Quietly succeed if already subscribed — no need to leak who is on the list.
  const existing = await payload.find({
    collection: 'subscribers',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (existing.docs.length > 0) {
    return NextResponse.json({ ok: true, already: true })
  }

  await payload.create({ collection: 'subscribers', data: { email, source: 'homepage' } })
  return NextResponse.json({ ok: true })
}
