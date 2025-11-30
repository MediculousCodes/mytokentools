'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type AppStateContextValue = {
  uploads: File[]
  setUploads: (files: File[]) => void
  tokenizer: string
  setTokenizer: (tokenizer: string) => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploadsState] = useState<File[]>([])
  const [tokenizer, setTokenizerState] = useState('cl100k_base')

  const setUploads = useCallback((files: File[]) => {
    setUploadsState(files)
  }, [])

  const setTokenizer = useCallback((value: string) => {
    setTokenizerState(value)
  }, [])

  const value = useMemo<AppStateContextValue>(
    () => ({
      uploads,
      setUploads,
      tokenizer,
      setTokenizer,
    }),
    [uploads, setUploads, tokenizer, setTokenizer],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider')
  }

  return context
}

