import Image from 'next/image'
import Link from 'next/link'
import { Newsletter } from './Newsletter'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div className="site-footer__top">
          <Link href="/" className="site-footer__brand" aria-label="IGIHE — home">
            <Image
              src="/assets/IGIHE-logo.svg"
              alt="IGIHE"
              width={240}
              height={30}
              className="brand__igihe--footer"
            />
          </Link>
          <Newsletter />
        </div>
        <div className="site-footer__bottom">
          <p className="site-footer__copy">Copyright © IGIHE 2026</p>
        </div>
      </div>
    </footer>
  )
}
