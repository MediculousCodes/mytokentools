import Image from 'next/image'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function AboutPage() {
  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">About</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Why this project exists (and what it teaches).
        </h1>
        <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          myTokenTools began as a utility script and is now a full-stack system that showcases
          real-world engineering practices: modular backend services, a componentized frontend, and
          attention to UX polish.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <Image
            src="/logo.png"
            alt="myTokenTools logo"
            width={96}
            height={96}
            className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-800"
          />
          <div>
            <CardTitle>Project pillars</CardTitle>
            <CardDescription>
              • Separation of concerns between Flask logic and React UI.
              <br />• Defensive UX with hover states, skeletons, and toasts.
              <br />• Documentation-backed development so capstone reviewers can trace features to
              commits.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Built with ❤️ by a team obsessed with trustworthy tooling for AI builders. Every design
            choice—like persistent navigation and dedicated documentation views—supports clarity for
            final presentations and stakeholder demos.
          </p>
          <p>
            Have feedback? Open an issue in the repository or plug your own tokenizer services into
            the upcoming settings screen. The UI is intentionally modular so classmates or
            professors can extend it.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

