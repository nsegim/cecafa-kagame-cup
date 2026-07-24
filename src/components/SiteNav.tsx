'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export interface NavItem {
  label: string
  href: string
}

/**
 * The header's navigation + LIVE button. On wide screens it's the inline nav
 * exactly as before; below the header breakpoint the inline links/button are
 * hidden by CSS and a hamburger toggles a drop-down menu instead (the old
 * layout crammed all links onto one overflowing row on phones).
 *
 * Client component so the toggle can hold open/closed state. It's given only
 * the plain nav items and the (already-resolved) LIVE href, so nothing
 * non-serialisable crosses the server→client boundary.
 */
export function SiteNav({ nav, liveHref }: { nav: NavItem[]; liveHref: string | null }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close the menu on Escape or a click/tap outside it.
  useEffect(() => {
    if (!open) return
    const onDocPointer = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('touchstart', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('touchstart', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div className="site-header__navigation" ref={rootRef}>
      <nav className="site-nav" aria-label="Primary">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="site-nav__link">
            {item.label}
          </Link>
        ))}
      </nav>

      {liveHref && (
        <a href={liveHref} className="site-header__cta">
          {'LIVE'}
        </a>
      )}

      <button
        type="button"
        className={`site-header__burger ${open ? 'is-open' : ''}`}
        aria-label={open ? 'Funga menu' : 'Fungura menu'}
        aria-expanded={open}
        aria-controls="site-mobile-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="site-header__burger-bar" />
        <span className="site-header__burger-bar" />
        <span className="site-header__burger-bar" />
      </button>

      <div id="site-mobile-menu" className={`site-mobile-menu ${open ? 'is-open' : ''}`} hidden={!open}>
        <nav className="site-mobile-menu__nav" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="site-mobile-menu__link"
              onClick={close}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {liveHref && (
          <a href={liveHref} className="site-mobile-menu__cta" onClick={close}>
            {'LIVE'}
          </a>
        )}
      </div>
    </div>
  )
}
