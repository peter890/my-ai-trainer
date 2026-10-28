import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { openDatabase } from './database'
import {
  createTrainerBackup,
  importTrainerBackup,
  mergeBackupData,
  parseTrainerBackupJson,
  TrainerBackupSchema,
  type TrainerBackup,
} from './backup'
import { saveAiApiKey } from './local-secrets'
import { getExercises, getProfile, saveExercise, saveProfile } from './repositories'

const localTimestamp = '2026-10-14T18:30:00.000Z'
const importTimestamp = '2099-10-15T18:30:00.000Z'
const tieTimestamp = '2100-10-16T18:30:00.000Z'

function createProfile(updatedAt: string, weight: number) {
  return {
    version: '1.0' as const,
    updated_at: updatedAt,
    profile: {
      gender: 'female' as const,
      age: 28,
      height_cm: 170,
      weight_history: [{ date: '2026-10-14', weight_kg: weight }],
      experience_level: 'beginner' as const,
      primary_goal: 'strength' as const,
      injuries_notes: '',
    },
    exercise_preferences: {
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
      custom_exercises: [],
    },
    settings: {
      rest_timer_defaults: {
        heavy_compound: 180,
        moderate_compound: 120,
        isolation: 60,
        isometric: 45,
      },
      rest_timer_signal: 'vibrate' as const,
    },
  }
}

function createExercise(id: string, updatedAt: string, name = id) {
  return {
    id,
    updated_at: updatedAt,
    name,
    active: true,
    category: 'chest' as const,
    equipment: 'barbell' as const,
    rest_type: 'heavy_compound' as const,
    technique_note: '',
    custom: false,
  }
}

function createBackup(data: TrainerBackup['data'], exportedAt = importTimestamp): TrainerBackup {
  return TrainerBackupSchema.parse({
    format: 'ai-trainer-backup',
    version: '1.0',
    exported_at: exportedAt,
    data,
  })
}

let databaseName = 0
const databases: Awaited<ReturnType<typeof openDatabase>>[] = []

afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

describe('trainer backup', () => {
  it('rejects malformed JSON, unknown fields and duplicate record IDs', () => {
    expect(() => parseTrainerBackupJson('{')).toThrow('nie zawiera poprawnego JSON')
    expect(() =>
      parseTrainerBackupJson(
        JSON.stringify({
          format: 'ai-trainer-backup',
          version: '1.0',
          exported_at: importTimestamp,
          data: { exercises: [], plans: [], workouts: [], gemini_api_key: 'must-not-export' },
        }),
      ),
    ).toThrow()

    expect(() =>
      TrainerBackupSchema.parse({
        format: 'ai-trainer-backup',
        version: '1.0',
        exported_at: importTimestamp,
        data: {
          exercises: [
            createExercise('same-id', localTimestamp),
            createExercise('same-id', importTimestamp),
          ],
          plans: [],
          workouts: [],
        },
      }),
    ).toThrow('nie mogą się powtarzać')
  })

  it('merges records by ID using updated_at and keeps local data on timestamp ties', () => {
    const local = {
      profile: createProfile(localTimestamp, 70),
      exercises: [
        createExercise('newer-local', importTimestamp, 'Local wins'),
        createExercise('tie', tieTimestamp, 'Tie stays local'),
      ],
      plans: [],
      workouts: [],
    }
    const backup = createBackup({
      profile: createProfile(importTimestamp, 72),
      exercises: [
        createExercise('newer-local', localTimestamp, 'Older import'),
        createExercise('tie', tieTimestamp, 'Tie import'),
        createExercise('newer-import', importTimestamp, 'Imported'),
      ],
      plans: [],
      workouts: [],
    })

    const merged = mergeBackupData(local, backup)

    expect(merged.profile?.profile.weight_history).toEqual([
      { date: '2026-10-14', weight_kg: 72 },
    ])
    expect(merged.exercises).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'newer-local', name: 'Local wins' }),
        expect.objectContaining({ id: 'tie', name: 'Tie stays local' }),
        expect.objectContaining({ id: 'newer-import', name: 'Imported' }),
      ]),
    )
    expect(merged.exercises).toHaveLength(3)
  })

  it('merges weight history without duplicating dates and prefers the newer profile entry', () => {
    const local = {
      profile: {
        ...createProfile(localTimestamp, 70),
        profile: {
          ...createProfile(localTimestamp, 70).profile,
          weight_history: [
            { date: '2026-10-14', weight_kg: 70 },
            { date: '2026-10-15', weight_kg: 71 },
          ],
        },
      },
      exercises: [],
      plans: [],
      workouts: [],
    }
    const importedProfile = {
      ...createProfile(importTimestamp, 72),
      profile: {
        ...createProfile(importTimestamp, 72).profile,
        weight_history: [
          { date: '2026-10-14', weight_kg: 72 },
          { date: '2026-10-16', weight_kg: 73 },
        ],
      },
    }
    const backup = createBackup({
      profile: importedProfile,
      exercises: [],
      plans: [],
      workouts: [],
    })

    const merged = mergeBackupData(local, backup)

    expect(merged.profile?.profile.weight_history).toEqual([
      { date: '2026-10-14', weight_kg: 72 },
      { date: '2026-10-15', weight_kg: 71 },
      { date: '2026-10-16', weight_kg: 73 },
    ])
  })

  it('exports and imports through IndexedDB while preserving local-only records', async () => {
    const database = await openDatabase(`backup-test-${databaseName++}`)
    databases.push(database)
    await saveProfile(createProfile(localTimestamp, 70), database)
    await saveExercise(createExercise('local-only', localTimestamp), database)

    const secrets = createMemoryStorage()
    saveAiApiKey('gemini', 'test-gemini-secret-never-export', secrets)
    const exported = await createTrainerBackup(database)
    expect(JSON.stringify(exported)).not.toContain('test-gemini-secret-never-export')
    expect(exported.data.exercises).toHaveLength(1)

    const backup = createBackup({
      profile: createProfile(importTimestamp, 72),
      exercises: [
        createExercise('local-only', importTimestamp, 'Updated exercise'),
        createExercise('import-only', importTimestamp),
      ],
      plans: [],
      workouts: [],
    })

    function createMemoryStorage(): Storage {
      const store = new Map<string, string>()
      return {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => {
          store.set(key, value)
        },
        removeItem: (key) => {
          store.delete(key)
        },
        clear: () => store.clear(),
        key: (index) => Array.from(store.keys())[index] ?? null,
        get length() {
          return store.size
        },
      } as Storage
    }
    await importTrainerBackup(backup, database)

    await expect(getProfile(database)).resolves.toMatchObject({
      profile: { weight_history: [{ date: '2026-10-14', weight_kg: 72 }] },
    })
    const exercises = await getExercises(database)
    expect(exercises).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'local-only', name: 'Updated exercise' }),
        expect.objectContaining({ id: 'import-only' }),
      ]),
    )
    expect(exercises).toHaveLength(2)
  })
})
