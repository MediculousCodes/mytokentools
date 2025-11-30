'use client'

import { useState } from 'react'
import { Check, Cog } from 'lucide-react'

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

      <div>
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
      </div>
    </section>
  )
}

