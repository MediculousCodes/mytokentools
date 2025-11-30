'use client'

import { useEffect, useState } from 'react'

export function LatencyMonitor() {
  const [latency, setLatency] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')

  useEffect(() => {
    let mounted = true

    const ping = async () => {
      const start = performance.now()
      try {
        const response = await fetch('/health', { cache: 'no-store' })
        if (!mounted) return
        if (response.ok) {
          setLatency(Math.round(performance.now() - start))
          setStatus('ok')
        } else {
          setStatus('error')
        }
      } catch {
        if (mounted) setStatus('error')
      }
    }

    ping()
    const id = setInterval(ping, 30_000)
    return () => {
      mounted = false
      clearInterval(id)
    }
  }, [])

  const label =
    status === 'idle' ? 'Checking…' : status === 'ok' ? `${latency ?? 0} ms` : 'Offline'

  const color =
    status === 'ok'
      ? 'bg-emerald-500'
      : status === 'error'
        ? 'bg-rose-500'
        : 'bg-slate-400'

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className={`size-2 rounded-full ${color}`} />
      <span>API latency: {label}</span>
    </div>
  )
}

