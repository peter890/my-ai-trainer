'use client'

import { useRef, useState } from 'react'
import { Download, FileUp, Loader2, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createTrainerBackup,
  deleteLocalTrainerData,
  getBackupDownloadName,
  importTrainerBackup,
  parseTrainerBackupJson,
} from '@/lib/backup'
import { cn } from '@/lib/utils'

export function BackupCard() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [warning, setWarning] = useState('')
  const [error, setError] = useState('')

  const handleExport = async () => {
    setBusy(true)
    setError('')
    setWarning('')
    setMessage('')

    try {
      const backup = await createTrainerBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = getBackupDownloadName(backup.exported_at)
      link.click()
      URL.revokeObjectURL(url)
      setMessage('Kopia zapasowa została pobrana.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się utworzyć kopii zapasowej.')
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setBusy(true)
    setError('')
    setWarning('')
    setMessage('')

    try {
      const backup = parseTrainerBackupJson(await file.text())
      const result = await importTrainerBackup(backup)
      setMessage('Dane z kopii zostały scalone z danymi lokalnymi. Nowsze rekordy zachowano według znacznika czasu.')
      setWarning(result.syncQueueWarning ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się zaimportować kopii zapasowej.')
    } finally {
      event.target.value = ''
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm(
      'Usunąć lokalny profil, ćwiczenia, plany, treningi, klucz Gemini i zapisane połączenie Drive? Kopia w Google Drive nie zostanie usunięta.',
    )
    if (!confirmed) return

    setBusy(true)
    setError('')
    setWarning('')
    setMessage('')

    try {
      await deleteLocalTrainerData()
      setMessage('Lokalne dane zostały usunięte. Kopia w Google Drive pozostała bez zmian.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się usunąć wszystkich danych lokalnych.')
    } finally {
      setBusy(false)
    }
  }

  const buttonClassName =
    'flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors disabled:cursor-wait disabled:opacity-60'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-semibold">Kopia zapasowa i dane</CardTitle>
        <CardDescription>
          Eksportuj dane do pliku JSON albo scal wcześniej utworzoną kopię. Klucz Gemini nie jest eksportowany.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={busy}
            className={cn(buttonClassName, 'border-border bg-secondary/60 text-foreground hover:bg-secondary')}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
            Eksportuj kopię
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className={cn(buttonClassName, 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15')}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileUp className="size-4" aria-hidden="true" />}
            Importuj i scal
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={(event) => void handleImport(event)}
            className="sr-only"
            aria-label="Wybierz plik kopii zapasowej"
          />
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={busy}
            className={cn(buttonClassName, 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 sm:col-span-2')}
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
            Usuń dane lokalne
          </button>
        </div>

        {message ? <p role="status" className="text-sm text-emerald-300">{message}</p> : null}
        {warning ? <p role="alert" className="text-sm text-amber-200">{warning}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
