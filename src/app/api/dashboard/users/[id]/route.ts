import { NextResponse, type NextRequest } from 'next/server'
import { apiCapability } from '@/lib/dashboard/auth'
import { getPayloadClient } from '@/lib/payload'

async function countSuperAdmins(payload: Awaited<ReturnType<typeof getPayloadClient>>) {
  const res = await payload.count({
    collection: 'users',
    where: { roles: { contains: 'super_admin' } },
  })
  return res.totalDocs
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { response, user } = await apiCapability('users:manage')
  if (response) return response

  const { id } = await params
  const payload = await getPayloadClient()
  const body = await request.json()
  const roles = Array.isArray(body.roles) ? body.roles : undefined

  if (!roles || roles.length === 0) {
    return NextResponse.json({ error: 'Select at least one role.' }, { status: 400 })
  }

  // Prevent locking everyone out: never let the last super_admin demote themselves.
  if (String(user.id) === id && !roles.includes('super_admin')) {
    const superAdmins = await countSuperAdmins(payload)
    if (superAdmins <= 1) {
      return NextResponse.json(
        { error: "You're the last Super Admin — promote another account first." },
        { status: 400 },
      )
    }
  }

  try {
    const doc = await payload.update({
      collection: 'users',
      id,
      data: { roles },
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ id: doc.id, email: doc.email, roles: doc.roles })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not update the user.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { response, user } = await apiCapability('users:manage')
  if (response) return response

  const { id } = await params

  if (String(user.id) === id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 })
  }

  const payload = await getPayloadClient()

  try {
    const target = await payload.findByID({ collection: 'users', id, depth: 0 })
    if (target.roles?.includes('super_admin')) {
      const superAdmins = await countSuperAdmins(payload)
      if (superAdmins <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last Super Admin.' }, { status: 400 })
      }
    }

    await payload.delete({ collection: 'users', id })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete the user.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
