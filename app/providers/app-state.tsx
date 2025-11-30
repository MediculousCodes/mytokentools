'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type PreprocessSettings = {
  stripHtml: boolean
  redactEmails: boolean
  normalizeWhitespace: boolean
}

export type ProjectRun = {
  id: string
  createdAt: string
  summary: string
  totalTokens: number
  tokenizer: string
}

export type Project = {
  id: string
  name: string
  createdAt: string
  runs: ProjectRun[]
}

type AppStateContextValue = {
  uploads: File[]
  setUploads: (files: File[]) => void
  tokenizer: string
  setTokenizer: (tokenizer: string) => void
  preprocess: PreprocessSettings
  setPreprocess: (settings: PreprocessSettings) => void
  budget: number
  setBudget: (value: number) => void
  projects: Project[]
  activeProjectId: string | null
  createProject: (name: string) => string
  setActiveProject: (projectId: string) => void
  addRunToProject: (projectId: string, run: ProjectRun) => void
}

const defaultPreprocess: PreprocessSettings = {
  stripHtml: false,
  redactEmails: false,
  normalizeWhitespace: true,
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

const PROJECT_STORAGE_KEY = 'mtt_projects'
const SETTINGS_STORAGE_KEY = 'mtt_settings'

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [uploads, setUploadsState] = useState<File[]>([])
  const [tokenizer, setTokenizerState] = useState('cl100k_base')
  const [preprocess, setPreprocessState] = useState<PreprocessSettings>(() => {
    if (typeof window === 'undefined') return defaultPreprocess
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return {
          ...defaultPreprocess,
          ...parsed.preprocess,
        }
      }
    } catch {
      return defaultPreprocess
    }
    return defaultPreprocess
  })
  const [budget, setBudgetState] = useState(() => {
    if (typeof window === 'undefined') return 50
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.budget ?? 50
      }
    } catch {
      return 50
    }
    return 50
  })
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = window.localStorage.getItem(PROJECT_STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = window.localStorage.getItem(PROJECT_STORAGE_KEY)
      if (stored) {
        const parsed: Project[] = JSON.parse(stored)
        return parsed[0]?.id ?? null
      }
    } catch {
      return null
    }
    return null
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        preprocess,
        budget,
      }),
    )
  }, [preprocess, budget])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  const setUploads = useCallback((files: File[]) => {
    setUploadsState(files)
  }, [])

  const setTokenizer = useCallback((value: string) => {
    setTokenizerState(value)
  }, [])

  const setPreprocess = useCallback((settings: PreprocessSettings) => {
    setPreprocessState(settings)
  }, [])

  const setBudget = useCallback((value: number) => {
    setBudgetState(value)
  }, [])

  const createProject = useCallback((name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      createdAt: new Date().toISOString(),
      runs: [],
    }
    setProjects((prev) => [newProject, ...prev])
    setActiveProjectId(newProject.id)
    return newProject.id
  }, [])

  const setActiveProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId)
  }, [])

  const addRunToProject = useCallback((projectId: string, run: ProjectRun) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? { ...project, runs: [run, ...project.runs].slice(0, 100) }
          : project,
      ),
    )
  }, [])

  const value = useMemo<AppStateContextValue>(
    () => ({
      uploads,
      setUploads,
      tokenizer,
      setTokenizer,
      preprocess,
      setPreprocess,
      budget,
      setBudget,
      projects,
      activeProjectId,
      createProject,
      setActiveProject,
      addRunToProject,
    }),
    [
      uploads,
      setUploads,
      tokenizer,
      setTokenizer,
      preprocess,
      setPreprocess,
      budget,
      setBudget,
      projects,
      activeProjectId,
      createProject,
      setActiveProject,
      addRunToProject,
    ],
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

