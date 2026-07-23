import Link from 'next/link'
import Image from 'next/image'

const NAV = [
  { label: 'AMAKURU', href: '/news' },
  { label: 'IMIKINO', href: '/matches' },
  { label: 'AMAKIPE', href: '/teams' },
  { label: 'URUTONDE', href: '/#standings' },
]

export function SiteHeader() {
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
          <Link href="https://igihe.com" target="_blank">
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

        <div className="site-header__navigation">
          <nav className="site-nav" aria-label="Primary">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="site-nav__link">
                {item.label}
              </Link>
            ))}
          </nav>

          <Link href="/news" className="site-header__cta">
            {'AMAKURU Y’AKO KANYA'}
          </Link>
        </div>
      </div>
    </header>
  )
}
