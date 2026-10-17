import { Bot, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Props = {
  status: 'idle' | 'loading' | 'saving' | 'done' | 'saved' | 'error'
  analysisText?: string
  errorText?: string
  onArchive: () => void
  onRetry?: () => void
}

export function AiFeedbackCard({ status, analysisText, errorText, onArchive, onRetry }: Props) {
  return (
    <Card className="min-h-80">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold">Analiza Trenera AI</h2>
            <p className="text-xs text-muted-foreground">Gemini · indywidualna rekomendacja na kolejną sesję</p>
          </div>
        </div>

        {status === 'idle' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm font-medium">Analiza pojawi się tutaj</p>
            <p className="max-w-xs text-sm text-muted-foreground text-pretty">
              Oceń poziom energii, dodaj notatki i sfinalizuj trening, aby otrzymać rekomendacje na kolejną sesję.
            </p>
          </div>
        )}

        {status === 'loading' && (
          <div className="flex flex-1 flex-col gap-3" aria-busy="true" aria-label="Generowanie analizy">
            {[90, 75, 100, 60, 85, 70].map((w, i) => (
              <div key={i} className="h-3.5 animate-pulse rounded-full bg-secondary" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {status === 'saving' && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Trening jest zapisywany bez analizy AI…
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-1 flex-col justify-center gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">Nie udało się wygenerować analizy.</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{errorText || 'Sprawdź połączenie z siecią i klucz API Gemini, a następnie spróbuj ponownie.'}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Spróbuj ponownie
              </button>
            )}
          </div>
        )}

        {status === 'done' && (
          <article className="flex flex-1 flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm leading-relaxed text-foreground/90">{analysisText || 'Analiza została wygenerowana.'}</p>
            <button
              type="button"
              onClick={onArchive}
              className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <Check className="size-4" aria-hidden="true" />
              Zapisz w historii
            </button>
          </article>
        )}

        {status === 'saved' && (
          <article className="flex flex-1 flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Trening i ankieta zostały zapisane w historii. Analizę AI możesz pominąć.
            </p>
            <button
              type="button"
              onClick={onArchive}
              className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-secondary/50 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <Check className="size-4" aria-hidden="true" />
              Zapisz w historii i przejdź dalej
            </button>
          </article>
        )}
      </CardContent>
    </Card>
  )
}
