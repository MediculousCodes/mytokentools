import { useMemo } from 'react'

import { useAppState } from '@/app/providers/app-state'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type BudgetWatchdogProps = {
  estimatedCost: number
}

export function BudgetWatchdog({ estimatedCost }: BudgetWatchdogProps) {
  const { budget, setBudget } = useAppState()
  const progress = useMemo(() => {
    if (!budget) return 0
    return Math.min(100, Math.round((estimatedCost / budget) * 100))
  }, [budget, estimatedCost])

  const isOverBudget = budget > 0 && estimatedCost > budget

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Budget watchdog</p>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>$</span>
          <Input
            type="number"
            min={0}
            step="1"
            value={budget}
            onChange={(event) => setBudget(Number(event.target.value) || 0)}
            className="w-24"
          />
        </div>
      </div>
      <Progress value={progress} />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Estimated spend {isNaN(estimatedCost) ? '$0.00' : `$${estimatedCost.toFixed(2)}`} / ${budget.toFixed(2)}
      </p>
      {isOverBudget && (
        <Alert variant="destructive">
          <AlertTitle>Budget exceeded</AlertTitle>
          <AlertDescription>
            Analysis cost ${estimatedCost.toFixed(2)} is above your budget target of ${budget.toFixed(2)}.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

