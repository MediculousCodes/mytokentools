'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import ThemeToggle from '@/app/components/ThemeToggle'
import { AppStateProvider } from '@/app/providers/app-state'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: 'Home', description: 'Project overview' },
  { href: '/core', label: 'Core Tool', description: 'Upload & analyze' },
  { href: '/settings', label: 'Settings', description: 'Environment prefs' },
  { href: '/docs', label: 'Docs', description: 'Architecture & API' },
  { href: '/about', label: 'About', description: 'Team & credits' },
]

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <AppStateProvider>
      <div className="relative min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>

        <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                <Image
                  src="/logo.png"
                  alt="myTokenTools logo"
                  width={48}
                  height={48}
                  className="pointer-events-none"
                  priority
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-600">
                  Page Selectors
                </p>
                <h1 className="text-xl font-semibold">myTokenTools Platform</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Multi-surface interface for token-aware product teams.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <span className="font-semibold">Status:</span> Production-ready API
              </div>
              <ThemeToggle />
            </div>
          </div>
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-6 pb-5">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'group relative flex flex-col rounded-2xl border px-4 py-3 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
                  isActive(item.href)
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-md dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-100'
                    : 'border-transparent bg-transparent text-slate-500 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-900',
                )}
              >
                <span className="text-xs uppercase tracking-wide text-slate-400 group-aria-[current=page]:text-indigo-400">
                  {item.description}
                </span>
                <span className="text-base font-semibold">{item.label}</span>
              </Link>
            ))}
          </nav>
        </header>

        <main id="app-main" className="mx-auto max-w-6xl px-6 py-10">
          {children}
        </main>

        <footer className="mt-16 border-t border-slate-200 bg-white/80 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} myTokenTools — Built for capstone excellence.</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Flask · Next.js 15 · Tailwind CSS · Docker
            </p>
          </div>
        </footer>
      </div>
    </AppStateProvider>
  )
}

