import { Bot, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { aiFeedback } from '@/lib/trainer-data'

type Props = {
  status: 'idle' | 'loading' | 'done'
  onArchive: () => void
}

export function AiFeedbackCard({ status, onArchive }: Props) {
  return (
    <Card className="min-h-80">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Bot className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold">Analiza Trenera AI</h2>
            <p className="text-xs text-muted-foreground">Gemini · na podstawie 20 ostatnich sesji</p>
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

        {status === 'done' && (
          <article className="flex flex-1 flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-sm leading-relaxed text-foreground/90">{aiFeedback.summary}</p>
            {aiFeedback.sections.map((section) => (
              <section key={section.title}>
                <h3 className="mb-2 text-sm font-semibold text-primary">{section.title}</h3>
                <ul className="flex flex-col gap-1.5">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
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
      </CardContent>
    </Card>
  )
}
