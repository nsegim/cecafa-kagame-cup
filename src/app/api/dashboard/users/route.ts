import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

/** Dashboard accounts are a handful, not thousands — one full fetch, no pagination. Never selects password/token fields. */
export async function GET() {
  const { response } = await apiCapability('users:view')
  if (response) return response

  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: 'users',
    sort: 'email',
    limit: 200,
    depth: 0,
    select: { email: true, roles: true },
  })

  return NextResponse.json({ rows: result.docs })
}

export async function POST(request: NextRequest) {
  const { response, user } = await apiCapability('users:manage')
  if (response) return response

  const payload = await getPayloadClient()
  const body = await request.json()

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const roles = Array.isArray(body.roles) ? body.roles : []

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  if (roles.length === 0) {
    return NextResponse.json({ error: 'Select at least one role.' }, { status: 400 })
  }

  try {
    const doc = await payload.create({
      collection: 'users',
      data: { email, password, roles },
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ id: doc.id, email: doc.email, roles: doc.roles }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not create the user.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
