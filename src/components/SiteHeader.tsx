import Link from 'next/link'
import Image from 'next/image'
import { getActiveLiveMatch } from '@/lib/tournament'
import { SiteNav, type NavItem } from './SiteNav'

const NAV: NavItem[] = [
  { label: 'AMAKURU', href: '/news' },
  { label: 'IMIKINO', href: '/matches' },
  { label: 'AMAKIPE', href: '/teams' },
  { label: 'URUTONDE', href: '/#standings' },
  { label: 'SURA IGIHE', href: 'https:igihe.com' },
]

export async function SiteHeader() {
  const liveMatch = await getActiveLiveMatch()

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <span className="brand">
          <Link href="/" aria-label="CECAFA Kagame Cup — IGIHE">
            <Image
              src="/assets/cecafa-logo.png"
              alt="CECAFA Kagame Cup"
              width={56}
              height={48}
              priority
              className="brand__cecafa"
            />
          </Link>
          <span className="brand__divider" aria-hidden="true" />
          <Link href="/" target="_blank">
            <Image
              src="/assets/IGIHE-logo.svg"
              alt="IGIHE"
              width={160}
              height={20}
              priority
              className="brand__igihe"
            />
          </Link>
        </span>

        <SiteNav nav={NAV} liveHref={liveMatch?.liveMatchUrl ?? null} />
      </div>
    </header>
  )
}
