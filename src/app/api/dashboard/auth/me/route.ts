import { NextResponse } from 'next/server'
import { getDashboardUser } from '@/lib/dashboard/auth'

export async function GET() {
  const user = await getDashboardUser()
  if (!user) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({
    user: { id: user.id, email: user.email, roles: user.roles },
  })
}
