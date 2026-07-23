'use client'

import { useState } from 'react'

export function CommentForm({ postId }: { postId: number }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [content, setContent] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !content || state === 'sending') return
    setState('sending')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, authorName: name, authorEmail: email, content }),
      })
      const data = (await res.json()) as { ok: boolean; message?: string }
      if (data.ok) {
        setState('done')
        setName('')
        setEmail('')
        setContent('')
      } else {
        setError(data.message ?? 'Something went wrong.')
        setState('error')
      }
    } catch {
      setError('Something went wrong.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div className="comment-form">
        <h2 className="comment-form__title">Leave a Comment</h2>
        <p className="comment-form__thanks" role="status">
          Thanks — your comment has been submitted. Comments are reviewed by the IGIHE newsroom
          before they appear.
        </p>
      </div>
    )
  }

  return (
    <div className="comment-form">
      <h2 className="comment-form__title">Leave a Comment</h2>
      <p className="comment-form__notice">
        Your email address will not be published. Required fields are marked *
      </p>

      <form onSubmit={submit}>
        <label className="comment-form__field comment-form__field--full">
          <span>Comment</span>
          <textarea
            required
            rows={3}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>

        <div className="comment-form__row">
          <label className="comment-form__field">
            <span>Name *</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="comment-form__field">
            <span>Email *</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
        </div>

        {state === 'error' && (
          <p className="comment-form__error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--red" disabled={state === 'sending'}>
          {state === 'sending' ? 'Posting…' : 'Post Comment'}
        </button>
      </form>
    </div>
  )
}
