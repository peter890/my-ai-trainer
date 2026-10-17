import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createExerciseRecord,
  filterExercisesByEquipment,
  getExerciseAlternatives,
  filterExercisesForPlan,
  initializeExerciseCatalog,
  toExerciseView,
} from './exercise-catalog'
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
    expect(initial.exercises.every((exercise) => exercise.active)).toBe(true)
    expect(initial.preferences).toMatchObject({
      excluded_exercise_ids: [],
      favorite_exercise_ids: [],
      updated_at: expect.any(String),
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

  it('keeps inactive exercises out of generated plan candidates', () => {
    const preferences = { favorite_exercise_ids: [], excluded_exercise_ids: [] }
    const available = toExerciseView(
      {
        id: 'active',
        name: 'Aktywne',
        active: true,
        category: 'chest',
        equipment: 'barbell',
        rest_type: 'heavy_compound',
        technique_note: '',
        custom: false,
      },
      preferences,
    )
    const inactive = { ...available, id: 'inactive', active: false }
    const excluded = { ...available, id: 'excluded', excluded: true }

    expect(filterExercisesForPlan([available, inactive, excluded], true).map(({ id }) => id)).toEqual([
      'active',
    ])
    expect(filterExercisesForPlan([available, inactive, excluded], false).map(({ id }) => id)).toEqual([
      'active',
      'excluded',
    ])
  })

  it('returns full active, non-excluded alternatives from the same muscle group', () => {
    const preferences = { favorite_exercise_ids: [], excluded_exercise_ids: [] }
    const selected = toExerciseView(
      {
        id: 'selected',
        name: 'Wybrane',
        active: true,
        category: 'chest',
        equipment: 'barbell',
        rest_type: 'heavy_compound',
        technique_note: 'Utrzymaj łopatki ściągnięte.',
        custom: false,
      },
      preferences,
    )
    const alternative = {
      ...selected,
      id: 'alternative',
      name: 'Alternatywa',
      equipment: 'Hantle',
      restType: 'moderate_compound' as const,
      techniqueNote: 'Kontroluj opuszczanie.',
    }
    const inactive = { ...selected, id: 'inactive', active: false }
    const excluded = { ...selected, id: 'excluded', excluded: true }
    const differentMuscle = { ...selected, id: 'back', muscle: 'Plecy' as const }

    expect(
      getExerciseAlternatives(
        [selected, alternative, inactive, excluded, differentMuscle],
        'selected',
      ),
    ).toEqual([alternative])
    expect(getExerciseAlternatives([selected], 'missing')).toEqual([])
  })

  it('filters the catalog by equipment without changing the unfiltered collection', () => {
    const barbell = {
      id: 'barbell',
      name: 'Sztanga',
      active: true,
      muscle: 'Klatka' as const,
      equipment: 'Sztanga',
      restType: 'heavy_compound' as const,
      techniqueNote: '',
      favorite: false,
      excluded: false,
    }
    const dumbbell = { ...barbell, id: 'dumbbell', equipment: 'Hantle' }

    expect(filterExercisesByEquipment([barbell, dumbbell], 'Sztanga')).toEqual([barbell])
    expect(filterExercisesByEquipment([barbell, dumbbell], 'all')).toEqual([barbell, dumbbell])
  })
})
