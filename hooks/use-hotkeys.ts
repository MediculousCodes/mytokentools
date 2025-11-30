'use client'

import { useEffect } from 'react'

type HotkeyBinding = {
  combo: string
  handler: () => void
}

const normalize = (combo: string) => combo.toLowerCase().replace(/\s+/g, '')

export function useHotkeys(bindings: HotkeyBinding[]) {
  useEffect(() => {
    const normalized = bindings.map((binding) => ({
      ...binding,
      combo: normalize(binding.combo),
    }))

    const listener = (event: KeyboardEvent) => {
      const parts = []
      if (event.metaKey) parts.push('meta')
      if (event.ctrlKey) parts.push('ctrl')
      if (event.shiftKey) parts.push('shift')
      if (event.altKey) parts.push('alt')
      parts.push(event.key.toLowerCase())
      const combo = parts.join('+')

      const match = normalized.find((binding) => binding.combo === combo)
      if (match) {
        event.preventDefault()
        match.handler()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [bindings])
}

