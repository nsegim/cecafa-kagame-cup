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
            width={48}
            height={48}
            className="brand__cecafa"
          />
          <span className="brand__divider" aria-hidden="true" />
          <Image src="/assets/IGIHE-logo.svg" alt="IGIHE" width={132} height={17} className="brand__igihe" />
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="site-nav__link">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/news" className="btn btn--red site-header__cta">
          LIVE NEWS
        </Link>
      </div>
    </header>
  )
}
