import { useMemo } from 'react'

type TokenVisualizerProps = {
  text: string
  title?: string
}

const colors = ['bg-blue-100 text-blue-900', 'bg-green-100 text-green-900', 'bg-amber-100 text-amber-900']

const tokenize = (content: string) => {
  return content.match(/\w+|[^\s\w]/g) ?? []
}

export function TokenVisualizer({ text, title = 'Token explorer' }: TokenVisualizerProps) {
  const tokens = useMemo(() => tokenize(text), [text])

  if (!text) {
    return <p className="text-sm text-slate-500">Select a file to visualize its tokens.</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white/80 p-3 text-xs leading-6 dark:border-slate-800 dark:bg-slate-900/60">
        {tokens.slice(0, 600).map((token, index) => (
          <span
            key={`${token}-${index}`}
            className={`rounded px-1 ${colors[index % colors.length]} transition`}
          >
            {token}
          </span>
        ))}
        {tokens.length > 600 && (
          <span className="rounded bg-slate-200 px-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            +{tokens.length - 600} more tokens…
          </span>
        )}
      </div>
    </div>
  )
}

