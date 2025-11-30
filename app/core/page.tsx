import Link from 'next/link'
import { UploadCloud, ShieldCheck, Workflow } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const phases = [
  {
    title: '1 · Intake & Validation',
    description:
      'Drag-and-drop zone accepts .txt, .md, and .zip files. We inspect MIME, size, and charset before letting anything hit the backend.',
    icon: UploadCloud,
  },
  {
    title: '2 · Tokenization Pipeline',
    description:
      'Files move into a multipart FormData queue that streams to the Flask `/api/count-tokens` endpoint with progress events.',
    icon: Workflow,
  },
  {
    title: '3 · Reporting & Costing',
    description:
      'Results render as insight cards, charts, and CSV-ready tables. Every call is wrapped in retry logic and surfaced via toast notifications.',
    icon: ShieldCheck,
  },
]

export default function CoreToolPage() {
  return (
    <section className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Core Tool Interface</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Ready-to-wire canvas for uploads, queues, and token analysis.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          This page will host the full interactive workflow next. For now it visualizes the
          structure: dropzone surface, live queue, status timeline, and insight cards that plug into
          the Flask backend.
        </p>
      </header>

      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-10 dark:border-slate-700 dark:bg-slate-900/40">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Upload Workspace
            </p>
            <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-white/70 p-8 text-center text-slate-500 shadow-inner dark:border-indigo-500/40 dark:bg-slate-950/40">
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                Drag files here or tap to browse
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Supports .txt, .md, and .zip (nested text extraction)
              </p>
              <div className="mt-8 grid gap-3">
                <Skeleton className="h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Live Queue (coming next)</CardTitle>
                <CardDescription>
                  Files move through validation → upload → tokenize → reporting. This timeline
                  component syncs with the backend job status.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[0, 1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
                  >
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <Skeleton className="h-3 w-48 rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {phases.map((phase) => (
          <Card key={phase.title}>
            <CardHeader className="space-y-4">
              <phase.icon className="size-10 rounded-xl bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200" />
              <CardTitle>{phase.title}</CardTitle>
              <CardDescription>{phase.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/">Back to overview</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/docs">Review API contracts</Link>
        </Button>
      </div>
    </section>
  )
}

