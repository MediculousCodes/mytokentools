import { NextResponse } from 'next/server'

const fallbackBase =
  process.env.NODE_ENV === 'production' ? 'http://token-counter-backend:5000' : 'http://localhost:5000'

const BACKEND_BASE = (process.env.BACKEND_URL?.trim() || fallbackBase).replace(/\/$/, '')

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const response = await fetch(`${BACKEND_BASE}/compare_tokenizers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await response.text()

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to proxy /compare_tokenizers' },
      { status: 502 },
    )
  }
}

