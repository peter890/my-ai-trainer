import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { createExerciseRecord, initializeExerciseCatalog, toExerciseView } from './exercise-catalog'
import { openDatabase } from './database'
import { saveExercisePreferences } from './repositories'

let databaseName = 0
const databases: Awaited<ReturnType<typeof openDatabase>>[] = []

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close()
  }
})

describe('exercise catalog', () => {
  it('seeds the built-in catalog once without inheriting mock user preferences', async () => {
    const database = await openDatabase(`exercise-catalog-test-${databaseName++}`)
    databases.push(database)

    const initial = await initializeExerciseCatalog(database)
    expect(initial.exercises).toHaveLength(18)
    expect(initial.preferences).toEqual({
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
    })

    await saveExercisePreferences(
      { favorite_exercise_ids: ['bench-press'], excluded_exercise_ids: [] },
      database,
    )
    const reopened = await initializeExerciseCatalog(database)

    const benchPress = reopened.exercises.filter((exercise) => exercise.id === 'bench-press')
    expect(benchPress).toHaveLength(1)
    expect(benchPress[0] && toExerciseView(benchPress[0], reopened.preferences).favorite).toBe(true)
    expect(reopened.exercises).toHaveLength(18)
  })

  it('maps Polish form values to validated catalog data', () => {
    expect(
      createExerciseRecord({
        id: 'custom-cable-row',
        name: 'Wiosłowanie na wyciągu',
        muscle: 'Plecy',
        equipment: 'Wyciąg',
        rest_type: 'moderate_compound',
      }),
    ).toMatchObject({
      id: 'custom-cable-row',
      category: 'back',
      equipment: 'cable',
      custom: true,
      technique_note: '',
    })
  })
})
