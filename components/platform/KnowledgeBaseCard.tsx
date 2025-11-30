import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { MODELS, type ModelInfo } from './CostMatrix'

type KnowledgeBaseCardProps = {
  selectedModel?: string
}

const defaultModel = MODELS[0]

export function KnowledgeBaseCard({ selectedModel }: KnowledgeBaseCardProps) {
  const target = MODELS.find((model) => model.name === selectedModel) ?? defaultModel

  return (
    <Card className="bg-white/80 dark:bg-slate-900/60">
      <CardHeader>
        <CardTitle className="text-base">Model knowledge base</CardTitle>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Context window and pricing references for quick decision-making.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-semibold">Model:</span> {target.name}
        </p>
        <p>
          <span className="font-semibold">Context window:</span> {target.context}
        </p>
        <p>
          <span className="font-semibold">Input cost:</span> ${target.inputCost.toFixed(2)} / 1M tokens
        </p>
        <p>
          <span className="font-semibold">Output cost:</span> ${target.outputCost.toFixed(2)} / 1M tokens
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          *Pricing pulled from vendor docs as of 2025. Update in `CostMatrix.tsx` as needed.
        </p>
      </CardContent>
    </Card>
  )
}

