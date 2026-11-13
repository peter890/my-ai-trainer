import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const sourcePath = new URL('../data/exercises.json', import.meta.url)
const outputPath = new URL('../public/exercise-catalog-manifest.json', import.meta.url)
const source = JSON.parse(await readFile(sourcePath, 'utf8'))

if (!Array.isArray(source)) {
  throw new Error('data/exercises.json must contain an array')
}

const exercises = source
  .map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    equipment: exercise.equipment,
    rest_type: exercise.rest_type,
    technique_note: exercise.technique_note ?? '',
  }))
  .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0))

if (
  exercises.some(
    (exercise) =>
      typeof exercise.id !== 'string' ||
      typeof exercise.name !== 'string' ||
      typeof exercise.category !== 'string' ||
      typeof exercise.equipment !== 'string' ||
      typeof exercise.rest_type !== 'string' ||
      typeof exercise.technique_note !== 'string',
  )
) {
  throw new Error('data/exercises.json contains an invalid exercise')
}

const canonical = JSON.stringify(exercises)
const hash = `sha256:${createHash('sha256').update(canonical).digest('hex')}`
const manifest = `${JSON.stringify({ hash, exercises }, null, 2)}\n`

await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(outputPath, manifest)
