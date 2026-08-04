import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getDashboardUser } from '@/lib/dashboard/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/dashboard/ui/card'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage() {
  const user = await getDashboardUser()
  if (user) redirect('/dashboard')

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">CECAFA Dashboard</CardTitle>
          <CardDescription>Sign in with your Payload account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
