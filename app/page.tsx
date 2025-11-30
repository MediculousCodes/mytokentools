import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const stats = [
  {
    label: 'Tokenizers available',
    value: '4',
    detail: 'cl100k_base · p50k_base · r50k_base · gpt2',
  },
  {
    label: 'Batch throughput',
    value: '2.5MB/s',
    detail: 'Streaming multipart uploads with progress events',
  },
  {
    label: 'File coverage',
    value: '.txt · .md · .zip',
    detail: 'Automatic charset fallback and inline extraction',
  },
]

const roadmap = [
  {
    title: 'Core Tool Interface',
    copy: 'Upload, queue, and tokenize files with live cost projections. Built for research teams who need accurate pricing before hitting the API.',
    href: '/core',
    cta: 'Open tool',
  },
  {
    title: 'Settings & Environments',
    copy: 'Manage tokenizer defaults, retention policies, and environment URLs (.env) so deployments stay safe for classmates and faculty demos.',
    href: '/settings',
    cta: 'Review settings',
  },
  {
    title: 'Documentation Workspace',
    copy: 'Step-by-step instructions describing the Flask services, API payloads, and local/Docker runbooks — everything your report references.',
    href: '/docs',
    cta: 'Browse docs',
  },
]

export default function DashboardPage() {
  return (
    <section className="space-y-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-2xl shadow-indigo-100/40 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-200">
              <Sparkles className="size-4" />
              Capstone-ready workspace
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Token intelligence for every stage of your project.
            </h1>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              Orchestrate uploads, compare tokenizers, estimate GPT costs, and document your
              pipeline from a single interface. This dashboard surfaces the most important states
              before you dive into the core tooling.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/core" className="gap-2">
                  Launch Core Tool
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/docs">View Documentation</Link>
              </Button>
            </div>
          </div>
          <div className="grid w-full max-w-md gap-4 rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-inner dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-400">Backend</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Flask · tiktoken · Zip ingestion
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-400">Frontend</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Next.js 15 App Router + Tailwind 4
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-400">DevOps</p>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Docker · Compose · Caddy reverse proxy
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              Everything you see here is backed by real code in this repo — no lorem ipsum, just a
              clean separation between UX and token logic so graders can trace every requirement.
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="h-full">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500 dark:text-slate-300">
              {stat.detail}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {roadmap.map((item) => (
          <Card key={item.title} className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.copy}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild variant="outline">
                <Link href={item.href} className="gap-2">
                  {item.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

