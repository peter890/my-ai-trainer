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
import { builtInExercises } from './built-in-exercises'

let databaseName = 0
const databases: Awaited<ReturnType<typeof openDatabase>>[] = []
const testManifest = {
  hash: `sha256:${'0'.repeat(64)}`,
  exercises: builtInExercises.map(
    ({ id, name, category, equipment, rest_type, technique_note }) => ({
      id,
      name,
      category,
      equipment,
      rest_type,
      technique_note,
    }),
  ),
}

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close()
  }
})

describe('exercise catalog', () => {
  it('seeds the built-in catalog once without inheriting mock user preferences', async () => {
    const database = await openDatabase(`exercise-catalog-test-${databaseName++}`)
    databases.push(database)

    const initial = await initializeExerciseCatalog(database, testManifest)
    expect(initial.exercises).toHaveLength(builtInExercises.length)
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
    const reopened = await initializeExerciseCatalog(database, testManifest)

    const benchPress = reopened.exercises.filter((exercise) => exercise.id === 'bench-press')
    expect(benchPress).toHaveLength(1)
    expect(benchPress[0] && toExerciseView(benchPress[0], reopened.preferences).favorite).toBe(true)
    expect(reopened.exercises).toHaveLength(builtInExercises.length)
  })

  it('updates names of existing built-in exercises from the JSON catalog', async () => {
    const database = await openDatabase(`exercise-catalog-test-${databaseName++}`)
    databases.push(database)

    await database.put('exercises', {
      id: 'bench-press',
      name: 'Wyciskanie sztangi leżąc',
      active: false,
      category: 'chest',
      equipment: 'barbell',
      rest_type: 'heavy_compound',
      technique_note: 'Moja notatka.',
      custom: false,
    })

    const result = await initializeExerciseCatalog(database, testManifest)

    expect(result.exercises.find((exercise) => exercise.id === 'bench-press')).toMatchObject({
      name: 'Wyciskanie sztangi leżąc (Bench Press)',
      active: false,
      technique_note: 'Moja notatka.',
    })
  })

  it('skips writes when the catalog hash is unchanged and archives removed exercises', async () => {
    const database = await openDatabase(`exercise-catalog-test-${databaseName++}`)
    databases.push(database)

    await initializeExerciseCatalog(database, testManifest)
    await database.put('exercises', {
      ...(await database.get('exercises', 'bench-press'))!,
      active: false,
      technique_note: 'Moja notatka.',
    })

    expect(await initializeExerciseCatalog(database, testManifest)).toMatchObject({
      catalogUpdated: false,
    })
    expect(await database.get('exercises', 'bench-press')).toMatchObject({
      active: false,
      technique_note: 'Moja notatka.',
    })

    const withoutBench = {
      ...testManifest,
      hash: `sha256:${'1'.repeat(64)}`,
      exercises: testManifest.exercises.filter((exercise) => exercise.id !== 'bench-press'),
    }
    expect(await initializeExerciseCatalog(database, withoutBench)).toMatchObject({
      catalogUpdated: true,
    })
    expect(await database.get('exercises', 'bench-press')).toMatchObject({
      active: false,
      archived: true,
    })
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
