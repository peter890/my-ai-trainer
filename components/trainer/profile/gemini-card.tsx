'use client'

import { useState, useSyncExternalStore } from 'react'
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Trash2 } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { testAiConnection } from '@/lib/ai'
import {
  getAiApiKeySnapshot,
  getAiProviderSnapshot,
  INVALID_AI_API_KEY_SNAPSHOT,
  removeAiApiKey,
  saveAiApiKey,
  saveAiProvider,
  subscribeToAiApiKey,
  subscribeToAiProvider,
  type AiProvider,
} from '@/lib/local-secrets'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'testing' | 'ok' | 'error'

export function GeminiCard() {
  const provider = useSyncExternalStore(
    subscribeToAiProvider,
    getAiProviderSnapshot,
    () => 'gemini' as AiProvider,
  )
  const storedApiKey = useSyncExternalStore(
    (onChange) => subscribeToAiApiKey(provider, onChange),
    () => getAiApiKeySnapshot(provider),
    () => '',
  )
  const [editedApiKey, setEditedApiKey] = useState<string>()
  const apiKey =
    editedApiKey ?? (storedApiKey === INVALID_AI_API_KEY_SNAPSHOT ? '' : storedApiKey)
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const invalidStoredKey = storedApiKey === INVALID_AI_API_KEY_SNAPSHOT
  const providerLabel = provider === 'gemini' ? 'Google Gemini' : 'OpenRouter'
  const isSaved = Boolean(storedApiKey && !invalidStoredKey && storedApiKey === apiKey)
  const visibleError = invalidStoredKey
    ? 'Nie udało się odczytać lokalnego klucza. Wprowadź go ponownie.'
    : error

  const test = async () => {
    setStatus('testing')
    setError('')
    try {
      const savedKey = saveAiApiKey(provider, apiKey)
      setEditedApiKey(savedKey)
      await testAiConnection(provider, savedKey)
      setStatus('ok')
    } catch (cause) {
      setStatus('error')
      setError(cause instanceof Error ? cause.message : `Nie udało się przetestować połączenia z ${providerLabel}.`)
    }
  }

  const removeKey = () => {
    try {
      removeAiApiKey(provider)
      setEditedApiKey('')
      setStatus('idle')
      setError('')
    } catch {
      setStatus('error')
      setError('Nie udało się usunąć klucza z lokalnej pamięci przeglądarki.')
    }
  }

  const changeProvider = (nextProvider: AiProvider) => {
    saveAiProvider(nextProvider)
    setEditedApiKey(undefined)
    setStatus('idle')
    setError('')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-semibold">
          <KeyRound className="size-4 text-primary" aria-hidden="true" />
          Dostawca AI
        </CardTitle>
        <CardDescription>Wybierz usługę i klucz używany do analiz oraz generatora planów.</CardDescription>
        <CardAction>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              status === 'ok' ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
            )}
          >
            <span className={cn('size-1.5 rounded-full', status === 'ok' ? 'bg-primary' : 'bg-muted-foreground')} aria-hidden="true" />
            {status === 'testing'
              ? 'Sprawdzanie'
              : status === 'ok'
                ? 'Połączono'
                : status === 'error'
                  ? 'Błąd połączenia'
                  : invalidStoredKey
                    ? 'Błąd ustawień'
                    : isSaved
                    ? 'Klucz zapisany'
                    : 'Nie skonfigurowano'}
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ai-provider">Usługa AI</Label>
          <Select value={provider} onValueChange={(value) => value && changeProvider(value as AiProvider)}>
            <SelectTrigger id="ai-provider" className="h-11 w-full bg-secondary/30">
              <SelectValue>{providerLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="gemini">Google Gemini</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
            </SelectContent>
          </Select>
          <Label htmlFor="ai-key">Klucz API {providerLabel}</Label>
          <div className="relative">
            <Input
              id="ai-key"
              type={visible ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setEditedApiKey(e.target.value)
                setStatus('idle')
                setError('')
              }}
              placeholder={provider === 'gemini' ? 'AIza…' : 'sk-or-v1-…'}
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
            Klucz zostaje zapisany wyłącznie lokalnie w tej przeglądarce i jest wysyłany bezpośrednio do {providerLabel}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void test()}
          disabled={!apiKey.trim() || status === 'testing'}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-secondary/50 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {status === 'testing' && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {status === 'ok' && <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />}
          {status === 'testing' ? 'Sprawdzanie…' : status === 'ok' ? 'Połączenie działa' : 'Zapisz i przetestuj'}
        </button>
        {isSaved && (
          <button
            type="button"
            onClick={removeKey}
            className="flex h-10 items-center justify-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Usuń zapisany klucz
          </button>
        )}
        {visibleError && <p role="alert" className="text-sm text-destructive">{visibleError}</p>}
      </CardContent>
    </Card>
  )
}
