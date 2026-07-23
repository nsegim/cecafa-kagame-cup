'use client'

import { useState } from 'react'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || state === 'sending') return
    setState('sending')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setState(res.ok ? 'done' : 'error')
      if (res.ok) setEmail('')
    } catch {
      setState('error')
    }
  }

  return (
    <div className="newsletter">
      <h2 className="newsletter__title">Subscribe Newsletter</h2>

      {state === 'done' ? (
        <p className="newsletter__thanks" role="status">
          You&apos;re in. We&apos;ll send tournament updates to your inbox.
        </p>
      ) : (
        <form className="newsletter__form" onSubmit={submit}>
          <input
            type="email"
            required
            placeholder="example@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Email address"
            className="newsletter__input"
          />
          <button type="submit" className="newsletter__btn" disabled={state === 'sending'}>
            {state === 'sending' ? 'Subscribing…' : 'Subscribe Now'}
          </button>
        </form>
      )}
      {state === 'error' && (
        <p className="newsletter__error" role="alert">
          Something went wrong — please try again.
        </p>
      )}
    </div>
  )
}
