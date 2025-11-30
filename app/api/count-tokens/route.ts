import { NextResponse } from 'next/server'

const BACKEND_BASE = (process.env.BACKEND_URL ?? 'http://localhost:5000').replace(/\/$/, '')

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const incomingForm = await request.formData()
    const outboundForm = new FormData()

    for (const [key, value] of incomingForm.entries()) {
      if (typeof value === 'string') {
        outboundForm.append(key, value)
      } else {
        outboundForm.append(key, value, value.name)
      }
    }

    const response = await fetch(`${BACKEND_BASE}/api/count-tokens`, {
      method: 'POST',
      body: outboundForm,
    })

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to proxy /api/count-tokens' },
      { status: 502 },
    )
  }
}

