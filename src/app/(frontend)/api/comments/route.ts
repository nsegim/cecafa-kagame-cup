import { NextResponse } from 'next/server'
import { postComment } from '@/lib/news'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  let body: { postId?: number; authorName?: string; authorEmail?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request' }, { status: 400 })
  }

  const postId = Number(body.postId)
  const authorName = String(body.authorName ?? '').trim()
  const authorEmail = String(body.authorEmail ?? '')
    .trim()
    .toLowerCase()
  const content = String(body.content ?? '').trim()

  if (!postId || !authorName || !content || !EMAIL_RE.test(authorEmail)) {
    return NextResponse.json({ ok: false, message: 'Please fill in all fields.' }, { status: 400 })
  }

  const result = await postComment({ postId, authorName, authorEmail, content })
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
