import React from 'react'
import type { Metadata } from 'next'
import { inter } from '@/lib/fonts'
import { DashboardProviders } from './providers'
import './globals.css'

/**
 * Independent root layout for `/dashboard/*`, mirroring the pattern already
 * used by `(embed)` and `(payload)` — each route group is its own `<html>`
 * document. This keeps Tailwind's preflight reset (and the new component
 * system) fully isolated from the public site's hand-rolled CSS in
 * `(frontend)/globals.css`.
 */
export const metadata: Metadata = {
  title: {
    default: 'Dashboard — CECAFA Kagame Cup 2026',
    template: '%s · Dashboard',
  },
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <DashboardProviders>{children}</DashboardProviders>
      </body>
    </html>
  )
}
