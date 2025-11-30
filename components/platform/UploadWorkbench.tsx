import { type ComponentProps } from 'react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PreprocessSettings } from '@/components/platform/PreprocessSettings'

type DropzoneProps = {
  getRootProps: () => ComponentProps<'div'>
  getInputProps: () => ComponentProps<'input'>
  isDragActive: boolean
}

type UploadWorkbenchProps = DropzoneProps & {
  uploads: File[]
  totalBytes: string
  tokenizer: string
  onTokenizerChange: (value: string) => void
  onRemoveFile: (index: number) => void
  onClearQueue: () => void
  onAnalyze: () => void
  onCancel: () => void
  isAnalyzing: boolean
  uploadProgress: number
}

export function UploadWorkbench({
  getRootProps,
  getInputProps,
  isDragActive,
  uploads,
  totalBytes,
  tokenizer,
  onTokenizerChange,
  onRemoveFile,
  onClearQueue,
  onAnalyze,
  onCancel,
  isAnalyzing,
  uploadProgress,
}: UploadWorkbenchProps) {
  return (
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
          <CardDescription>.txt · .md · .zip (nested extraction supported)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-slate-500 dark:text-slate-300">
            Use the preprocessing pipeline below to normalize content before tokenizing.
          </div>
          <PreprocessSettings />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Upload queue</CardTitle>
            <CardDescription>
              {uploads.length
                ? `${uploads.length} file${uploads.length > 1 ? 's' : ''} · ${totalBytes}`
                : 'No files yet — drag something into the panel.'}
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
                    {(file.size / 1024).toFixed(1)} KB · {file.type || 'text/plain'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemoveFile(index)}>
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
                onChange={(event) => onTokenizerChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="cl100k_base">cl100k_base (GPT-4 & GPT-3.5)</option>
                <option value="p50k_base">p50k_base (Codex)</option>
                <option value="r50k_base">r50k_base (GPT-3)</option>
                <option value="gpt2">gpt2 (legacy)</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={onAnalyze} disabled={!uploads.length || isAnalyzing}>
                {isAnalyzing ? (
                  <>
                    <Spinner className="mr-2" />
                    Analyzing…
                  </>
                ) : (
                  'Analyze Files'
                )}
              </Button>
              {isAnalyzing && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={onClearQueue} disabled={!uploads.length}>
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
  )
}

