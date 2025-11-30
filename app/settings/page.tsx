'use client'

import { useState } from 'react'
import { Check, Cog, Database } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppState } from '@/app/providers/app-state'

const TOKENIZERS = [
  { value: 'cl100k_base', label: 'cl100k_base (GPT-4/3.5)' },
  { value: 'p50k_base', label: 'p50k_base (Codex)' },
  { value: 'r50k_base', label: 'r50k_base (GPT-3)' },
  { value: 'gpt2', label: 'gpt2 (legacy)' },
]

export default function SettingsPage() {
  const { tokenizer, setTokenizer } = useAppState()
  const [apiUrl, setApiUrl] = useState('http://localhost:5000')
  const [autoPurge, setAutoPurge] = useState(true)

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Settings</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Configure how myTokenTools talks to the Flask backend.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          These preferences are stored locally for now. In Step 3 we will sync them with API routes
          and typed env variables.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Cog className="size-10 rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200" />
              <div>
                <CardTitle>Tokenizer Defaults</CardTitle>
                <CardDescription>Choose which encoding to apply to uploads by default.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Preferred encoding
            </label>
            <div className="grid gap-3">
              {TOKENIZERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTokenizer(option.value)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                    tokenizer === option.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-100'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span>{option.label}</span>
                  {tokenizer === option.value && <Check className="size-4" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="size-10 rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200" />
              <div>
                <CardTitle>Environment Targets</CardTitle>
                <CardDescription>Document the upstream Flask URL and retention policy.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Backend base URL
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800"
                value={apiUrl}
                onChange={(event) => setApiUrl(event.target.value)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Will be stored in `.env.local` as <code>NEXT_PUBLIC_API_BASE_URL</code>.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Auto purge uploads
                </p>
                <p className="text-xs text-slate-500">
                  Delete temporary files from storage 24 hours after processing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoPurge((prev) => !prev)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  autoPurge ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block size-5 transform rounded-full bg-white transition-transform ${
                    autoPurge ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">Save to .env template</Button>
              <Button asChild>
                <a href="/docs#deployment">Open deployment guide</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

