'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FileRejection } from 'react-dropzone'
import { useDropzone } from 'react-dropzone'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useAppState } from '@/app/providers/app-state'
import { useToast } from '@/hooks/use-toast'
import {
  analyzeText,
  batchTokenize,
  compareTokenizers,
  countTokensFromFiles,
  type CountTokensResponse,
  type TokenFileStat,
} from '@/lib/api/token-tools'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'

const ACCEPTED_TYPES = {
  'text/plain': ['.txt', '.md'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
}

const TXT_MAX_BYTES = 10 * 1024 * 1024
const HISTORY_STORAGE_KEY = 'mtt_history_v3'
const COMPARISON_ENCODINGS = ['cl100k_base', 'p50k_base', 'r50k_base', 'gpt2']

type HistoryEntry = {
  id: string
  createdAt: string
  tokenizer: string
  totalTokens: number
  files: TokenFileStat[]
}

type BatchRow = {
  fileName: string
  status: 'Pending' | 'Done' | 'Error'
  token_count?: number
  word_count?: number
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const estimateCost = (tokens: number, ratePerMillion = 0.03) =>
  (tokens / 1_000_000) * ratePerMillion

const createHistoryId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `run-${Date.now()}`

export default function CoreToolPage() {
  const { uploads, setUploads, tokenizer, setTokenizer } = useAppState()
  const { toast } = useToast()

  const [analysis, setAnalysis] = useState<CountTokensResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [controller, setController] = useState<AbortController | null>(null)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [compareFileName, setCompareFileName] = useState<string>('')
  const [compareResult, setCompareResult] = useState<Record<string, number | string> | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [batchLoading, setBatchLoading] = useState(false)

  const [apiText, setApiText] = useState('Hello world! Paste any prompt or transcript here.')
  const [apiResponse, setApiResponse] = useState<{ token_count: number; word_count: number } | null>(
    null,
  )
  const [apiLoading, setApiLoading] = useState(false)

  const [chunkFileName, setChunkFileName] = useState<string>('')
  const [chunkSize, setChunkSize] = useState(200)
  const [chunkOverlap, setChunkOverlap] = useState(20)
  const [chunks, setChunks] = useState<string[]>([])
  const [chunkLoading, setChunkLoading] = useState(false)

  const [inputRate, setInputRate] = useState(0.03) // $0.03 per 1M tokens (GPT-4 Turbo input)
  const [outputRate, setOutputRate] = useState(0.06)

  useEffect(() => {
    if (uploads.length && !compareFileName) {
      setCompareFileName(uploads[0].name)
    }
    if (uploads.length && !chunkFileName) {
      setChunkFileName(uploads[0].name)
    }
  }, [uploads, compareFileName, chunkFileName])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (saved) {
        setHistory(JSON.parse(saved))
      }
    } catch {
      setHistory([])
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
  }, [history])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    onDrop: (acceptedFiles, rejectedFiles) => handleIncomingFiles(acceptedFiles, rejectedFiles),
  })

  const handleIncomingFiles = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        toast({
          title: 'Some files were rejected',
          description: 'Only .txt, .md, or .zip files are supported.',
          variant: 'destructive',
        })
      }

      if (!accepted.length) return

      const valid: File[] = []
      accepted.forEach((file) => {
        const lower = file.name.toLowerCase()
        const isZip = lower.endsWith('.zip')
        const isTxtLike = lower.endsWith('.txt') || lower.endsWith('.md')
        if (!isZip && !isTxtLike) {
          toast({
            title: 'Unsupported file',
            description: `${file.name} is not a supported format.`,
            variant: 'destructive',
          })
          return
        }
        if (isTxtLike && file.size > TXT_MAX_BYTES) {
          toast({
            title: 'File too large',
            description: `${file.name} exceeds the ${formatBytes(TXT_MAX_BYTES)} limit for text files.`,
            variant: 'destructive',
          })
          return
        }
        valid.push(file)
      })

      if (valid.length) {
        setUploads([...uploads, ...valid])
        toast({
          title: `${valid.length} file${valid.length > 1 ? 's' : ''} added`,
          description: 'Ready when you are — click “Analyze Files” to run the pipeline.',
        })
      }
    },
    [setUploads, toast, uploads],
  )

  const handleRemoveFile = (index: number) => {
    const next = uploads.filter((_, idx) => idx !== index)
    setUploads(next)
  }

  const handleClearQueue = () => {
    setUploads([])
    setAnalysis(null)
    setCompareResult(null)
    setBatchRows([])
  }

  const pushHistory = useCallback(
    (payload: CountTokensResponse) => {
      const entry: HistoryEntry = {
        id: createHistoryId(),
        createdAt: new Date().toISOString(),
        tokenizer,
        totalTokens: payload.total_tokens,
        files: payload.files,
      }
      setHistory((prev) => [entry, ...prev].slice(0, 25))
    },
    [tokenizer],
  )

  const handleAnalyze = async () => {
    if (!uploads.length) {
      toast({
        title: 'No files queued',
        description: 'Add at least one .txt, .md, or .zip file to run an analysis.',
        variant: 'destructive',
      })
      return
    }

    const abortController = new AbortController()
    setController(abortController)
    setIsAnalyzing(true)
    setUploadProgress(0)
    setAnalysis(null)

    try {
      const result = await countTokensFromFiles({
        files: uploads,
        encoding: tokenizer,
        onProgress: setUploadProgress,
        signal: abortController.signal,
      })
      setAnalysis(result)
      pushHistory(result)
      toast({
        title: 'Analysis complete',
        description: `${result.total_tokens.toLocaleString()} tokens processed.`,
      })
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        toast({
          title: 'Upload cancelled',
          description: 'The request was aborted.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Analysis failed',
          description: (error as Error).message || 'Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setIsAnalyzing(false)
      setUploadProgress(0)
      setController(null)
    }
  }

  const handleCompare = async () => {
    if (!compareFileName) {
      toast({
        title: 'Select a file',
        description: 'Choose a queued file to run tokenizer comparisons.',
        variant: 'destructive',
      })
      return
    }
    const file = uploads.find((item) => item.name === compareFileName)
    if (!file) {
      toast({
        title: 'File unavailable',
        description: 'Ensure the file is still queued.',
        variant: 'destructive',
      })
      return
    }

    setCompareLoading(true)
    try {
      const text = await file.text()
      const response = await compareTokenizers(text, COMPARISON_ENCODINGS)
      setCompareResult(response.results)
      toast({ title: 'Comparison ready', description: 'Token counts by encoding generated.' })
    } catch (error) {
      toast({
        title: 'Compare failed',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setCompareLoading(false)
    }
  }

  const handleBatch = async () => {
    if (!uploads.length) {
      toast({
        title: 'No files queued',
        description: 'Upload files before running batch tokenization.',
        variant: 'destructive',
      })
      return
    }

    setBatchLoading(true)
    setBatchRows(uploads.map((file) => ({ fileName: file.name, status: 'Pending' })))

    try {
      const texts = await Promise.all(uploads.map((file) => file.text()))
      const response = await batchTokenize(texts, tokenizer)
      const rows = uploads.map((file, index) => ({
        fileName: file.name,
        status: 'Done' as const,
        ...response.results[index],
      }))
      setBatchRows(rows)
      toast({ title: 'Batch complete', description: 'All files tokenized successfully.' })
    } catch (error) {
      setBatchRows((prev) =>
        prev.map((row) => ({
          ...row,
          status: 'Error',
        })),
      )
      toast({
        title: 'Batch failed',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setBatchLoading(false)
    }
  }

  const handleApiCall = async () => {
    if (!apiText.trim()) {
      toast({
        title: 'Enter some text',
        description: 'The API playground needs input text to tokenize.',
        variant: 'destructive',
      })
      return
    }
    setApiLoading(true)
    try {
      const response = await analyzeText(apiText, tokenizer)
      setApiResponse({ token_count: response.token_count, word_count: response.word_count })
      toast({ title: 'Tokenized', description: 'API response captured below.' })
    } catch (error) {
      toast({
        title: 'API call failed',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setApiLoading(false)
    }
  }

  const handleGenerateChunks = async () => {
    if (!chunkFileName) {
      toast({
        title: 'Select a file',
        description: 'Choose a queued file to simulate chunking.',
        variant: 'destructive',
      })
      return
    }
    const file = uploads.find((item) => item.name === chunkFileName)
    if (!file) {
      toast({
        title: 'File unavailable',
        description: 'Ensure the file is still queued.',
        variant: 'destructive',
      })
      return
    }
    if (chunkSize <= 0 || chunkOverlap < 0) {
      toast({
        title: 'Invalid chunk settings',
        description: 'Chunk size must be positive and overlap cannot be negative.',
        variant: 'destructive',
      })
      return
    }

    setChunkLoading(true)
    try {
      const text = await file.text()
      const words = text.split(/\s+/).filter(Boolean)
      const slices: string[] = []
      const step = Math.max(chunkSize - chunkOverlap, 1)
      for (let i = 0; i < words.length; i += step) {
        const chunk = words.slice(i, i + chunkSize).join(' ')
        slices.push(chunk)
      }
      setChunks(slices)
      toast({
        title: 'Chunks generated',
        description: `${slices.length} chunk${slices.length === 1 ? '' : 's'} created.`,
      })
    } catch (error) {
      toast({
        title: 'Chunking failed',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setChunkLoading(false)
    }
  }

  const handleCopySummary = async () => {
    if (!analysis) return
    const summary =
      `Total tokens: ${analysis.total_tokens}\n` +
      analysis.files.map((file) => `${file.name}: ${file.token_count}`).join('\n')
    try {
      await navigator.clipboard.writeText(summary)
      toast({ title: 'Copied summary', description: 'Ready to paste into your report.' })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Clipboard access was blocked.',
        variant: 'destructive',
      })
    }
  }

  const handleClearHistory = () => {
    setHistory([])
    toast({ title: 'History cleared', description: 'Local analysis history removed.' })
  }

  const totalBytes = useMemo(
    () => uploads.reduce((sum, file) => sum + file.size, 0),
    [uploads],
  )

  return (
    <section className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Core Tool Interface</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Upload, tokenize, compare, and document — all in one workspace.
        </h1>
        <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
          This page wraps the entire pipeline: drag files into the queue, kick off token counts, and
          explore supporting tools for pricing, API testing, and documentation.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card
          {...getRootProps()}
          className={cn(
            'cursor-pointer border-dashed px-8 py-10 text-center transition-colors dark:bg-slate-900/50 dark:border-slate-800 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/5',
            isDragActive
              ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/20'
              : 'border-slate-200 bg-white/70',
          )}
        >
          <input {...getInputProps()} />
          <CardHeader>
            <CardTitle>Drop files anywhere in this surface</CardTitle>
            <CardDescription>.txt · .md · .zip (nested text extraction supported)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-500">
              Tip: ZIP uploads keep folder context in the final report. Plain text files have a{' '}
              {formatBytes(TXT_MAX_BYTES)} limit for stability.
            </p>
            <div className="grid gap-3">
              <Skeleton className="h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
              <Skeleton className="h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload queue</CardTitle>
              <CardDescription>
                {uploads.length
                  ? `${uploads.length} file${uploads.length > 1 ? 's' : ''} · ${formatBytes(totalBytes)}`
                  : 'No files yet — drop something in the panel to the left.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {uploads.length === 0 && (
                <p className="text-sm text-slate-500">Your files will appear here with metadata.</p>
              )}
              {uploads.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
                >
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(file.size)} · {file.type || 'text/plain'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRemoveFile(index)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controls</CardTitle>
              <CardDescription>Pick an encoding and run the tokenizer pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-slate-500">
                  Encoding / tokenizer
                </label>
                <select
                  value={tokenizer}
                  onChange={(event) => setTokenizer(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="cl100k_base">cl100k_base (GPT-4 & GPT-3.5)</option>
                  <option value="p50k_base">p50k_base (Codex)</option>
                  <option value="r50k_base">r50k_base (GPT-3)</option>
                  <option value="gpt2">gpt2 (legacy)</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAnalyze} disabled={!uploads.length || isAnalyzing}>
                  {isAnalyzing ? (
                    <>
                      <Spinner className="mr-2" />
                      Analyzing…
                    </>
                  ) : (
                    'Analyze Files'
                  )}
                </Button>
                {isAnalyzing && controller && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => controller.abort()}
                    disabled={!isAnalyzing}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={handleClearQueue} disabled={!uploads.length}>
                  Clear Queue
                </Button>
              </div>
              {isAnalyzing && (
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Latest analysis</CardTitle>
            <CardDescription>
              Totals and per-file stats populate after each run. Copy the summary for quick documentation.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleCopySummary} disabled={!analysis}>
            Copy summary
          </Button>
        </CardHeader>
        <CardContent>
          {!analysis && (
            <p className="text-sm text-slate-500">
              Run an analysis to populate this section with token counts, cost estimates, and charts.
            </p>
          )}
          {analysis && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total tokens</p>
                  <p className="text-3xl font-semibold text-slate-900 dark:text-white">
                    {analysis.total_tokens.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Estimated GPT-4 input cost</p>
                  <p className="text-3xl font-semibold text-emerald-600 dark:text-emerald-300">
                    ${estimateCost(analysis.total_tokens).toFixed(4)}
                  </p>
                </div>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
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
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="batch">Batch</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="chunking">Chunking</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {!analysis && (
            <p className="mt-4 text-sm text-slate-500">
              Run an analysis to populate the overview charts and table above.
            </p>
          )}
          {analysis && (
            <p className="mt-4 text-sm text-slate-500">
              Overview data is already visualized above — use other tabs for specialized tools.
            </p>
          )}
        </TabsContent>

        <TabsContent value="compare">
          <Card className="mt-4">
            <CardHeader className="space-y-4 lg:flex lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Tokenizer comparison</CardTitle>
                <CardDescription>
                  Run the same text through {COMPARISON_ENCODINGS.length} encodings to show drift.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={compareFileName}
                  onChange={(event) => setCompareFileName(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="">Select file</option>
                  {uploads.map((file) => (
                    <option key={file.name} value={file.name}>
                      {file.name}
                    </option>
                  ))}
                </select>
                <Button onClick={handleCompare} disabled={!uploads.length || compareLoading}>
                  {compareLoading ? (
                    <>
                      <Spinner className="mr-2" /> Comparing…
                    </>
                  ) : (
                    'Compare'
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!compareResult && (
                <p className="text-sm text-slate-500">
                  Select a file from your queue to see how each tokenizer interprets it.
                </p>
              )}
              {compareResult && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-2 text-left">Encoding</th>
                        <th className="px-4 py-2 text-right">Token count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(compareResult).map(([encoding, count]) => (
                        <tr key={encoding} className="border-b border-slate-100 dark:border-slate-800/60">
                          <td className="px-4 py-2 font-mono">{encoding}</td>
                          <td className="px-4 py-2 text-right">
                            {typeof count === 'number' ? count.toLocaleString() : count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card className="mt-4">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Batch tokenization</CardTitle>
                <CardDescription>Send all queued files to /batch_tokenize for quick stats.</CardDescription>
              </div>
              <Button onClick={handleBatch} disabled={!uploads.length || batchLoading}>
                {batchLoading ? (
                  <>
                    <Spinner className="mr-2" /> Processing…
                  </>
                ) : (
                  `Process ${uploads.length || 0} file${uploads.length === 1 ? '' : 's'}`
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {!uploads.length && (
                <p className="text-sm text-slate-500">Upload files to enable the batch process.</p>
              )}
              {!!uploads.length && (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-4 py-2 text-left">Filename</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-right">Tokens</th>
                        <th className="px-4 py-2 text-right">Words</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map((row) => (
                        <tr key={row.fileName} className="border-b border-slate-100 dark:border-slate-800/60">
                          <td className="px-4 py-2">{row.fileName}</td>
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                'rounded-full px-2 py-1 text-xs font-medium',
                                row.status === 'Done'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : row.status === 'Error'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-slate-100 text-slate-500',
                              )}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            {row.token_count ? row.token_count.toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {row.word_count ? row.word_count.toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Pricing estimator</CardTitle>
              <CardDescription>
                Combine the latest analysis with current GPT input/output rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    Input cost ($ / 1M tokens)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inputRate}
                    onChange={(event) => setInputRate(parseFloat(event.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    Output cost ($ / 1M tokens)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={outputRate}
                    onChange={(event) => setOutputRate(parseFloat(event.target.value) || 0)}
                  />
                </div>
              </div>
              {!analysis && (
                <p className="text-sm text-slate-500">
                  Run an analysis to feed real token counts into this estimator.
                </p>
              )}
              {analysis && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Input cost</p>
                    <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-300">
                      ${estimateCost(analysis.total_tokens, inputRate).toFixed(4)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Output cost</p>
                    <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-300">
                      ${estimateCost(analysis.total_tokens, outputRate).toFixed(4)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card className="mt-4">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>API playground</CardTitle>
                <CardDescription>POST /analyze with any ad-hoc text snippet.</CardDescription>
              </div>
              <Button onClick={handleApiCall} disabled={apiLoading}>
                {apiLoading ? (
                  <>
                    <Spinner className="mr-2" />
                    Tokenizing…
                  </>
                ) : (
                  'Tokenize text'
                )}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea rows={6} value={apiText} onChange={(event) => setApiText(event.target.value)} />
              {apiResponse && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">JSON Response</p>
                  <pre className="mt-2 overflow-x-auto text-xs text-slate-600 dark:text-slate-300">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chunking">
          <Card className="mt-4">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Chunking simulator</CardTitle>
                <CardDescription>
                  Visualize chunk boundaries before sending content to a vector database.
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={chunkFileName}
                  onChange={(event) => setChunkFileName(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <option value="">Select file</option>
                  {uploads.map((file) => (
                    <option key={file.name} value={file.name}>
                      {file.name}
                    </option>
                  ))}
                </select>
                <Button onClick={handleGenerateChunks} disabled={!uploads.length || chunkLoading}>
                  {chunkLoading ? (
                    <>
                      <Spinner className="mr-2" /> Generating…
                    </>
                  ) : (
                    'Generate chunks'
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    Chunk size (words)
                  </label>
                  <Input
                    type="number"
                    min={10}
                    value={chunkSize}
                    onChange={(event) => setChunkSize(Number(event.target.value))}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-500">
                    Overlap (words)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={chunkOverlap}
                    onChange={(event) => setChunkOverlap(Number(event.target.value))}
                  />
                </div>
              </div>
              {!chunks.length && (
                <p className="text-sm text-slate-500">
                  Generate chunks to preview the sliding window results.
                </p>
              )}
              <div className="grid gap-4 max-h-[400px] overflow-y-auto pr-4">
                {chunks.map((chunk, index) => (
                  <div
                    key={`${index}-${chunk.slice(0, 10)}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300"
                  >
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">
                      Chunk {index + 1}
                    </p>
                    {chunk}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="mt-4">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Analysis history</CardTitle>
                <CardDescription>Last 25 runs are stored locally for quick recall.</CardDescription>
              </div>
              <Button variant="outline" onClick={handleClearHistory} disabled={!history.length}>
                Clear history
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!history.length && (
                <p className="text-sm text-slate-500">
                  Run an analysis to capture history in this timeline.
                </p>
              )}
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                      {entry.tokenizer}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {entry.files.length} file{entry.files.length === 1 ? '' : 's'} ·{' '}
                    {entry.totalTokens.toLocaleString()} tokens
                  </p>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    {entry.files.slice(0, 3).map((file) => (
                      <p key={file.name}>
                        {file.name}: {file.token_count.toLocaleString()} tokens
                      </p>
                    ))}
                    {entry.files.length > 3 && <p>+{entry.files.length - 3} more…</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}

