import { useState } from 'react'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { analyzeText } from '@/lib/api/token-tools'
import { useToast } from '@/hooks/use-toast'

type ChatCalcTabProps = {
  tokenizer: string
}

export function ChatCalcTab({ tokenizer }: ChatCalcTabProps) {
  const { toast } = useToast()
  const [messagesInput, setMessagesInput] = useState(
    JSON.stringify([{ role: 'user', content: 'Hello model!' }], null, 2),
  )
  const [result, setResult] = useState<{ tokens: number; overhead: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const calculate = async () => {
    setIsLoading(true)
    try {
      const parsed = JSON.parse(messagesInput)
      if (!Array.isArray(parsed)) throw new Error('JSON must be an array of messages.')
      const normalized = parsed
        .map((msg) => `${msg.role ?? 'user'}: ${Array.isArray(msg.content) ? msg.content.join(' ') : msg.content}`)
        .join('\n')
      const response = await analyzeText(normalized, tokenizer)
      const overhead = parsed.length * 4 + 2 // simple approximation
      setResult({ tokens: response.token_count + overhead, overhead })
    } catch (error) {
      toast({
        title: 'Chat calculation failed',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Chat protocol calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          rows={8}
          value={messagesInput}
          onChange={(event) => setMessagesInput(event.target.value)}
          placeholder='[{"role":"user","content":"Hello"}]'
        />
        <Button onClick={calculate} disabled={isLoading}>
          {isLoading ? (
            <>
              <Spinner className="mr-2" /> Calculating…
            </>
          ) : (
            'Compute tokens'
          )}
        </Button>
        {result && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
            <p>Total tokens (with overhead): {result.tokens.toLocaleString()}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Includes {result.overhead} protocol tokens (+4 per message, +2 end of sequence).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

