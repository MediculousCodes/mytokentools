import { Button } from '@/components/ui/button'
import type { CountTokensResponse } from '@/lib/api/token-tools'

type ReportExporterProps = {
  analysis: CountTokensResponse | null
}

const buildCsv = (analysis: CountTokensResponse) => {
  const header = 'Filename,Tokens,Words,Chars\n'
  const rows = analysis.files
    .map((file) => `${file.name},${file.token_count},${file.words},${file.chars}`)
    .join('\n')
  return header + rows
}

export function ReportExporter({ analysis }: ReportExporterProps) {
  const disabled = !analysis

  const download = (type: 'csv' | 'json') => {
    if (!analysis) return
    const blob =
      type === 'csv'
        ? new Blob([buildCsv(analysis)], { type: 'text/csv' })
        : new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = type === 'csv' ? 'token-report.csv' : 'token-report.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" disabled={disabled} onClick={() => download('csv')}>
        Export CSV
      </Button>
      <Button variant="ghost" disabled={disabled} onClick={() => download('json')}>
        Export JSON
      </Button>
    </div>
  )
}

