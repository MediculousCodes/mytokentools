import type { CountTokensResponse } from '@/lib/api/token-tools'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CostMatrix } from './CostMatrix'
import { FileTypeDistribution } from './FileTypeDistribution'
import { TokenVisualizer } from './TokenVisualizer'
import { BudgetWatchdog } from './BudgetWatchdog'
import { ReportExporter } from './ReportExporter'

type TokenSummaryPanelProps = {
  analysis: CountTokensResponse | null
  onCopy: () => void
  visualizerText: string
  visualizerSelection: string
  visualizerOptions: string[]
  onVisualizerChange: (fileName: string) => void
  fileTypeData: { type: string; value: number }[]
  onModelFocus: (modelName: string) => void
}

export function TokenSummaryPanel({
  analysis,
  onCopy,
  visualizerText,
  visualizerSelection,
  visualizerOptions,
  onVisualizerChange,
  fileTypeData,
  onModelFocus,
}: TokenSummaryPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Latest analysis</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Totals and per-file stats populate after each run. Copy or export the summary for reporting.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onCopy} disabled={!analysis}>
            Copy summary
          </Button>
          <ReportExporter analysis={analysis} />
        </div>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <p className="text-sm text-slate-500">
            Run an analysis to populate this section with token counts, cost estimates, and charts.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total tokens</p>
                <p className="text-3xl font-semibold text-slate-900 dark:text-white">
                  {analysis.total_tokens.toLocaleString()}
                </p>
              </div>
              <BudgetWatchdog estimatedCost={(analysis.total_tokens / 1_000_000) * 0.03} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Token explorer</p>
                  {visualizerOptions.length > 1 && (
                    <select
                      value={visualizerSelection}
                      onChange={(event) => onVisualizerChange(event.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900"
                    >
                      {visualizerOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <TokenVisualizer text={visualizerText} />
              </div>
              <FileTypeDistribution data={fileTypeData} />
            </div>

            <div className="h-64 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis.files} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="token_count" fill="#6366F1" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <CostMatrix
              totalTokens={analysis.total_tokens}
              onSelectModel={(model) => onModelFocus(model.name)}
            />

            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/40">
                  <tr>
                    <th className="px-4 py-2 text-left">Filename</th>
                    <th className="px-4 py-2 text-right">Tokens</th>
                    <th className="px-4 py-2 text-right">Words</th>
                    <th className="px-4 py-2 text-right">Chars</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.files.map((file) => (
                    <tr key={file.name} className="border-t border-slate-100 dark:border-slate-800/60">
                      <td className="px-4 py-2">{file.name}</td>
                      <td className="px-4 py-2 text-right font-mono">{file.token_count.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{file.words.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{file.chars.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

