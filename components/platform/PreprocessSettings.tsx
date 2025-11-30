import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAppState } from '@/app/providers/app-state'

export function PreprocessSettings() {
  const { preprocess, setPreprocess } = useAppState()

  const toggle = (key: keyof typeof preprocess) => {
    setPreprocess({ ...preprocess, [key]: !preprocess[key] })
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Preprocessing</p>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">Strip HTML</Label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Remove tags before counting tokens.</p>
        </div>
        <Switch checked={preprocess.stripHtml} onCheckedChange={() => toggle('stripHtml')} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">Redact emails</Label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Replace emails with [REDACTED_EMAIL].</p>
        </div>
        <Switch checked={preprocess.redactEmails} onCheckedChange={() => toggle('redactEmails')} />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-200">Normalize whitespace</Label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Collapse spaces and trim text.</p>
        </div>
        <Switch
          checked={preprocess.normalizeWhitespace}
          onCheckedChange={() => toggle('normalizeWhitespace')}
        />
      </div>
    </div>
  )
}

