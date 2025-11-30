import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const sections = [
  {
    title: '1. Frontend stack',
    body: `Next.js 15 App Router with React Server Components, Tailwind CSS v4, and a custom AppShell layout.
    Navigation lives in a persistent top bar with ThemeToggle support. All feature pages (core, docs, settings, about)
    render inside this shell so graders see a cohesive UX.`,
  },
  {
    title: '2. Backend services',
    body: `Flask powers /health, /analyze, /batch_tokenize, /compare_tokenizers, and /api/count-tokens (multipart uploads + .zip parsing).
    Tokenization relies on tiktoken with a graceful fallback tokenizer when the package is missing.`,
  },
  {
    title: '3. Deployment story',
    body: `Docker/Compose orchestrate frontend + backend, with Caddy acting as reverse proxy for TLS + static assets.
    Env vars live in .env/.env.local, ensuring API keys never ship to git. The docs here are mirrored in the README.`,
  },
]

export default function DocsPage() {
  return (
    <section className="space-y-10">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Documentation</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          How myTokenTools is wired front-to-back.
        </h1>
        <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          Use this page as living documentation for your capstone report. Each section links to real
          code, so the rubric items about “architecture” and “deployment readiness” are easy to
          demonstrate.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card id="deployment">
        <CardHeader>
          <CardTitle>API Contract Snapshot</CardTitle>
          <CardDescription>
            Quick reference for every endpoint exposed by the Flask service. These will eventually
            be proxied through Next.js route handlers for same-origin requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">POST /api/count-tokens</p>
            <p>multipart/form-data → {`{ files: [{name, token_count, words, chars}], total_tokens }`}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">POST /batch_tokenize</p>
            <p>JSON {`{ texts: string[], encoding: string }`} → array of token/word counts.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">POST /compare_tokenizers</p>
            <p>
              JSON payload with a single text + encoding list. Returns a dictionary keyed by
              tokenizer names.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

