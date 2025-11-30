type ModelInfo = {
  name: string
  context: string
  inputCost: number
  outputCost: number
}

const MODELS: ModelInfo[] = [
  { name: 'GPT-4o', context: '128K', inputCost: 5, outputCost: 15 },
  { name: 'Claude 3.5 Sonnet', context: '200K', inputCost: 3, outputCost: 15 },
  { name: 'Gemini 1.5 Pro', context: '1M', inputCost: 1.25, outputCost: 5 },
]

type CostMatrixProps = {
  totalTokens: number
  onSelectModel?: (model: ModelInfo) => void
}

export function CostMatrix({ totalTokens, onSelectModel }: CostMatrixProps) {
  const costs = MODELS.map((model) => ({
    ...model,
    estimated: Number(((totalTokens / 1_000_000) * model.inputCost).toFixed(4)),
  }))
  const cheapest = costs.reduce((acc, model) => (model.estimated < acc.estimated ? model : acc), costs[0])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Multi-model matrix</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Input cost calculated for {totalTokens.toLocaleString()} tokens.
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-left">Context</th>
              <th className="px-3 py-2 text-right">Input $/1M</th>
              <th className="px-3 py-2 text-right">Output $/1M</th>
              <th className="px-3 py-2 text-right">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((model) => (
              <tr
                key={model.name}
                className={`border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-900/30 ${
                  model.name === cheapest.name ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : ''
                }`}
                onClick={() => onSelectModel?.(model)}
              >
                <td className="px-3 py-2 font-medium">{model.name}</td>
                <td className="px-3 py-2">{model.context}</td>
                <td className="px-3 py-2 text-right">${model.inputCost.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">${model.outputCost.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-semibold">${model.estimated.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type { ModelInfo }
export { MODELS }

