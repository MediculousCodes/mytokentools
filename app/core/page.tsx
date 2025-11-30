"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FileRejection } from 'react-dropzone'
import { useDropzone } from 'react-dropzone'

import { useAppState, type ProjectRun } from '@/app/providers/app-state'
import { useToast } from '@/hooks/use-toast'
import {
  analyzeText,
  batchTokenize,
  compareTokenizers,
  countTokensFromFiles,
  type CountTokensResponse,
} from '@/lib/api/token-tools'
import { UploadWorkbench } from '@/components/platform/UploadWorkbench'
import { TokenSummaryPanel } from '@/components/platform/TokenSummaryPanel'
import { KnowledgeBaseCard } from '@/components/platform/KnowledgeBaseCard'
import { ProjectManager } from '@/components/platform/ProjectManager'
import { ChatCalcTab } from '@/components/platform/ChatCalcTab'
import { DiffToolTab } from '@/components/platform/DiffToolTab'
import { CommandPalette } from '@/components/platform/CommandPalette'
import { useHotkeys } from '@/hooks/use-hotkeys'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const ACCEPTED_TYPES = {
  'text/plain': ['.txt', '.md'],
  'application/zip': ['.zip'],
  'application/x-zip-compressed': ['.zip'],
}

const COMPARISON_ENCODINGS = ['cl100k_base', 'p50k_base', 'r50k_base', 'gpt2']

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

const detectFileType = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return 'other'
  if (['md', 'markdown'].includes(ext)) return 'markdown'
  if (['js', 'ts', 'tsx', 'py', 'java', 'cs', 'go'].includes(ext)) return 'code'
  if (['json', 'yaml', 'yml', 'csv'].includes(ext)) return 'data'
  if (['zip'].includes(ext)) return 'archive'
  return 'text'
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

const preprocessText = (text: string, settings: ReturnType<typeof useAppState>['preprocess']) => {
  let result = text
  if (settings.stripHtml) {
    result = result.replace(/<[^>]*>/g, ' ')
  }
  if (settings.redactEmails) {
    result = result.replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      '[REDACTED_EMAIL]',
    )
  }
  if (settings.normalizeWhitespace) {
    result = result.replace(/\s+/g, ' ').trim()
  }
  return result
}

const preprocessFile = async (
  file: File,
  settings: ReturnType<typeof useAppState>['preprocess'],
) => {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.zip')) return file
  try {
    const text = await file.text()
    const processed = preprocessText(text, settings)
    if (processed === text) return file
    return new File([processed], file.name, { type: file.type || 'text/plain' })
  } catch {
    return file
  }
}

export default function CoreToolPage() {
  const {
    uploads,
    setUploads,
    tokenizer,
    setTokenizer,
    preprocess,
    projects,
    activeProjectId,
    createProject,
    addRunToProject,
  } = useAppState()
  const { toast } = useToast()

  const [analysis, setAnalysis] = useState<CountTokensResponse | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [controller, setController] = useState<AbortController | null>(null)

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

  const [inputRate, setInputRate] = useState(0.03)
  const [outputRate, setOutputRate] = useState(0.06)

  const [selectedTab, setSelectedTab] = useState('overview')
  const [commandOpen, setCommandOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const [visualizerFile, setVisualizerFile] = useState('')
  const [visualizerText, setVisualizerText] = useState('')

  const ensureProjectId = useCallback(() => {
    if (activeProjectId) return activeProjectId
    return createProject(`Project ${projects.length + 1}`)
  }, [activeProjectId, createProject, projects.length])

  const saveRunToProject = useCallback(
    (payload: CountTokensResponse) => {
      const projectId = ensureProjectId()
      const summary = payload.files
        .slice(0, 3)
        .map((file) => `${file.name}: ${file.token_count.toLocaleString()} tokens`)
        .join(', ')
      const run: ProjectRun = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        summary,
        totalTokens: payload.total_tokens,
        tokenizer,
      }
      addRunToProject(projectId, run)
    },
    [addRunToProject, ensureProjectId, tokenizer],
  )

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
    setUploads(uploads.filter((_, idx) => idx !== index))
  }

  const handleClearQueue = () => {
    setUploads([])
    setAnalysis(null)
    setCompareResult(null)
    setBatchRows([])
    setChunks([])
  }

  const handleAnalyze = useCallback(async () => {
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
      const processedFiles = await Promise.all(
        uploads.map((file) => preprocessFile(file, preprocess)),
      )
      const result = await countTokensFromFiles({
        files: processedFiles,
        encoding: tokenizer,
        onProgress: setUploadProgress,
        signal: abortController.signal,
      })
      setAnalysis(result)
      saveRunToProject(result)
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
  }, [uploads, preprocess, tokenizer, toast, saveRunToProject])

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
      const processed = await preprocessFile(file, preprocess)
      const text = await processed.text()
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
      const texts = await Promise.all(
        uploads.map(async (file) => {
          const processed = await preprocessFile(file, preprocess)
          return processed.text()
        }),
      )
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
      const processed = await preprocessFile(file, preprocess)
      const text = await processed.text()
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

  const totalBytes = useMemo(
    () => uploads.reduce((sum, file) => sum + file.size, 0),
    [uploads],
  )

  useEffect(() => {
    if (!uploads.length) {
      setVisualizerFile('')
      setVisualizerText('')
      return
    }
    if (!visualizerFile || !uploads.some((file) => file.name === visualizerFile)) {
      setVisualizerFile(uploads[0].name)
    }
  }, [uploads, visualizerFile])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!visualizerFile) {
        setVisualizerText('')
        return
      }
      const file = uploads.find((f) => f.name === visualizerFile)
      if (!file) return
      const processed = await preprocessFile(file, preprocess)
      const text = await processed.text()
      if (!cancelled) setVisualizerText(text)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [visualizerFile, uploads, preprocess])

  const fileTypeData = useMemo(() => {
    if (!analysis) return []
    const map = new Map<string, number>()
    analysis.files.forEach((file) => {
      const type = detectFileType(file.name)
      map.set(type, (map.get(type) ?? 0) + 1)
    })
    return Array.from(map.entries()).map(([type, value]) => ({ type, value }))
  }, [analysis])

  const visualizerOptions = uploads.map((file) => file.name)

  useEffect(() => {
    if (uploads.length && !compareFileName) {
      setCompareFileName(uploads[0].name)
    }
    if (uploads.length && !chunkFileName) {
      setChunkFileName(uploads[0].name)
    }
  }, [uploads, compareFileName, chunkFileName])

  const commandOptions = [
    { value: 'overview', label: 'Overview' },
    { value: 'compare', label: 'Compare' },
    { value: 'batch', label: 'Batch' },
    { value: 'pricing', label: 'Pricing' },
    { value: 'api', label: 'API playground' },
    { value: 'chunking', label: 'Chunking' },
    { value: 'chat', label: 'Chat Calc' },
    { value: 'diff', label: 'Diff Tool' },
    { value: 'projects', label: 'Projects' },
  ]

  useHotkeys([
    { combo: 'meta+enter', handler: handleAnalyze },
    { combo: 'ctrl+enter', handler: handleAnalyze },
    { combo: 'meta+k', handler: () => setCommandOpen(true) },
    { combo: 'ctrl+k', handler: () => setCommandOpen(true) },
  ])

  return (
    <>
      <section className="space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Core Tool Interface</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Upload, tokenize, compare, and document — all in one workspace.
          </h1>
          <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            This page powers project workspaces, advanced charts, and reporting-grade exports for your
            token analysis.
          </p>
        </header>

        <UploadWorkbench
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
          uploads={uploads}
          totalBytes={formatBytes(totalBytes)}
          tokenizer={tokenizer}
          onTokenizerChange={setTokenizer}
          onRemoveFile={handleRemoveFile}
          onClearQueue={handleClearQueue}
          onAnalyze={handleAnalyze}
          onCancel={() => controller?.abort()}
          isAnalyzing={isAnalyzing}
          uploadProgress={uploadProgress}
        />

        <div className="grid gap-6 lg:grid-cols-[3fr,1fr]">
          <TokenSummaryPanel
            analysis={analysis}
            onCopy={handleCopySummary}
            visualizerText={visualizerText}
            visualizerSelection={visualizerFile}
            visualizerOptions={visualizerOptions}
            onVisualizerChange={setVisualizerFile}
            fileTypeData={fileTypeData}
            onModelFocus={setSelectedModel}
          />
          <KnowledgeBaseCard selectedModel={selectedModel} />
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="batch">Batch</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="chunking">Chunking</TabsTrigger>
            <TabsTrigger value="chat">Chat Calc</TabsTrigger>
            <TabsTrigger value="diff">Diff</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="compare">
            <Card className="mt-4">
              <CardHeader className="space-y-4 lg:flex lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle>Tokenizer comparison</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Run the same text through {COMPARISON_ENCODINGS.length} encodings.
                  </p>
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Send all queued files to /batch_tokenize for quick stats.
                  </p>
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
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Combine the latest analysis with current GPT input/output rates.
                </p>
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
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    POST /analyze with any ad-hoc text snippet.
                  </p>
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
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg: items-center lg:justify-between">
                <div>
                  <CardTitle>Chunking simulator</CardTitle>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Visualize chunk boundaries before sending content to a vector database.
                  </p>
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
                  <p className="text-sm text-slate-500">Generate chunks to preview the sliding window results.</p>
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

          <TabsContent value="chat">
            <ChatCalcTab tokenizer={tokenizer} />
          </TabsContent>

          <TabsContent value="diff">
            <DiffToolTab analysis={analysis} />
          </TabsContent>

          <TabsContent value="projects">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Project workspaces</CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Organize runs into enterprise-ready workspaces.
                </p>
              </CardHeader>
              <CardContent>
                <ProjectManager />
              </CardContent>
            </Card>
          </TabsContent>

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
        </Tabs>
      </section>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        options={commandOptions}
        onSelect={setSelectedTab}
      />
    </>
  )
}

