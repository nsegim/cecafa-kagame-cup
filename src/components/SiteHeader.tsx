import Link from 'next/link'
import Image from 'next/image'

const NAV = [
  { label: 'News', href: '/news' },
  { label: 'Matches', href: '/matches' },
  { label: 'Teams', href: '/teams' },
  { label: 'Standings', href: '/#standings' },
]

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand" aria-label="CECAFA Kagame Cup — IGIHE">
          <Image
            src="/assets/cecafa-logo.png"
            alt="CECAFA Kagame Cup"
            width={56}
            height={48}
            priority
            className="brand__cecafa"
          />
          <span className="brand__divider" aria-hidden="true" />
          <Image
            src="/assets/IGIHE-logo.svg"
            alt="IGIHE"
            width={160}
            height={20}
            priority
            className="brand__igihe"
          />
        </Link>

        <div className="site-header__navigation">
          <nav className="site-nav" aria-label="Primary">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="site-nav__link">
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/news" className="site-header__cta">
            {'LIVE  NEWS'}
          </Link>
        </div>
      </div>
    </header>
  )
}
