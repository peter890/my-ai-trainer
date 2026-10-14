'use client'

import { useState } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'testing' | 'ok'

export function GeminiCard() {
  const [apiKey, setApiKey] = useState('')
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  const test = () => {
    if (!apiKey.trim()) return
    setStatus('testing')
    setTimeout(() => setStatus('ok'), 1200)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-primary" aria-hidden="true" />
          Klucz API Gemini
        </CardTitle>
        <CardDescription>Wymagany do analiz po treningu i generatora planów.</CardDescription>
        <CardAction>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              status === 'ok' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
            )}
          >
            <span className={cn('size-1.5 rounded-full', status === 'ok' ? 'bg-primary' : 'bg-muted-foreground')} aria-hidden="true" />
            {status === 'ok' ? 'Połączono' : 'Nie skonfigurowano'}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gemini-key">Klucz API</Label>
          <div className="relative">
            <Input
              id="gemini-key"
              type={visible ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setStatus('idle')
              }}
              placeholder="AIza…"
              autoComplete="off"
              spellCheck={false}
              className="h-11 pr-11 font-mono"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Ukryj klucz' : 'Pokaż klucz'}
              className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Klucz wygenerujesz w Google AI Studio. Nigdy nie udostępniaj go innym osobom.
          </p>
        </div>

        <button
          type="button"
          onClick={test}
          disabled={!apiKey.trim() || status === 'testing'}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {status === 'testing' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {status === 'ok' && <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />}
          {status === 'testing' ? 'Sprawdzanie…' : status === 'ok' ? 'Połączenie działa' : 'Zapisz i przetestuj'}
        </button>
      </CardContent>
    </Card>
  )
}
