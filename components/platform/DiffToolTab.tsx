import { useMemo, useState } from 'react'

import type { CountTokensResponse } from '@/lib/api/token-tools'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type DiffToolTabProps = {
  analysis: CountTokensResponse | null
}

export function DiffToolTab({ analysis }: DiffToolTabProps) {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')

  const diff = useMemo(() => {
    if (!analysis) return null
    const a = analysis.files.find((file) => file.name === left)
    const b = analysis.files.find((file) => file.name === right)
    if (!a || !b) return null
    return {
      tokens: a.token_count - b.token_count,
      costDelta: (a.token_count - b.token_count) / 1_000_000 * 0.03,
    }
  }, [analysis, left, right])

  if (!analysis) {
    return <p className="text-sm text-slate-500">Run an analysis before comparing files.</p>
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Diff tool</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs uppercase text-slate-500">File A</p>
          <Select value={left} onValueChange={setLeft}>
            <SelectTrigger>
              <SelectValue placeholder="Select file" />
            </SelectTrigger>
            <SelectContent>
              {analysis.files.map((file) => (
                <SelectItem key={file.name} value={file.name}>
                  {file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase text-slate-500">File B</p>
          <Select value={right} onValueChange={setRight}>
            <SelectTrigger>
              <SelectValue placeholder="Select file" />
            </SelectTrigger>
            <SelectContent>
              {analysis.files.map((file) => (
                <SelectItem key={file.name} value={file.name}>
                  {file.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {diff && (
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
            <p>
              Token difference: <span className="font-semibold">{diff.tokens.toLocaleString()}</span>
            </p>
            <p>
              Cost delta (@$0.03 / 1M):{' '}
              <span className="font-semibold">${diff.costDelta.toFixed(4)}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

