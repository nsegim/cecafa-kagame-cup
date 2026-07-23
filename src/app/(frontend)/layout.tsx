import React from 'react'
import { Inter, Bebas_Neue } from 'next/font/google'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'
import './fonts.css'
import './globals.css'
import './components.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// Condensed display face used for button labels in the design.
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas' })

export const metadata = {
  title: 'CECAFA Kagame Cup 2026 — Rwanda | IGIHE',
  description:
    'Live standings, fixtures, results and news from the CECAFA Kagame Cup 2026 in Rwanda. Twelve clubs, three groups, 24 July – 7 August.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable}`}>
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
