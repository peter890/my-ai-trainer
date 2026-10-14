export type TabId = 'dashboard' | 'history' | 'exercises' | 'profile'

export type WorkoutType = 'push' | 'pull' | 'legs' | 'cardio'

export const workoutTypeMeta: Record<WorkoutType, { label: string; dot: string }> = {
  push: { label: 'Push', dot: 'bg-primary' },
  pull: { label: 'Pull', dot: 'bg-chart-2' },
  legs: { label: 'Nogi', dot: 'bg-chart-3' },
  cardio: { label: 'Cardio', dot: 'bg-chart-4' },
}

export type LoggedSet = { weight: number; reps: number; rir: number }

export type WorkoutLog = {
  date: string
  title: string
  type: WorkoutType
  duration: number
  volume: number
  energy: number
  notes?: string
  exercises: { name: string; sets: string; best: string }[]
  aiFeedback: string[]
}

const exerciseTemplates: Record<WorkoutType, WorkoutLog['exercises']> = {
  push: [
    { name: 'Wyciskanie hantli na skosie', sets: '4 × 8', best: '32 kg × 8' },
    { name: 'Wyciskanie sztangi leżąc', sets: '4 × 6', best: '80 kg × 8' },
    { name: 'Wyciskanie żołnierskie', sets: '3 × 8', best: '45 kg × 8' },
    { name: 'Wznosy bokiem na wyciągu', sets: '3 × 15', best: '10 kg × 15' },
    { name: 'Prostowanie ramion na wyciągu', sets: '3 × 12', best: '27 kg × 12' },
  ],
  pull: [
    { name: 'Podciąganie nachwytem', sets: '4 × 8', best: '+10 kg × 8' },
    { name: 'Wiosłowanie sztangą', sets: '4 × 8', best: '75 kg × 8' },
    { name: 'Ściąganie drążka wąsko', sets: '3 × 12', best: '60 kg × 12' },
    { name: 'Face pull', sets: '3 × 15', best: '22 kg × 15' },
    { name: 'Uginanie z hantlami', sets: '3 × 10', best: '16 kg × 10' },
  ],
  legs: [
    { name: 'Przysiad ze sztangą', sets: '4 × 6', best: '110 kg × 6' },
    { name: 'Martwy ciąg rumuński', sets: '3 × 8', best: '95 kg × 8' },
    { name: 'Wypychanie na suwnicy', sets: '3 × 12', best: '200 kg × 12' },
    { name: 'Uginanie nóg leżąc', sets: '3 × 12', best: '45 kg × 12' },
  ],
  cardio: [
    { name: 'Bieżnia — interwały', sets: '8 × 1 min', best: '14 km/h' },
    { name: 'Wioślarz', sets: '15 min', best: '3,2 km' },
  ],
}

const feedbackTemplates: Record<WorkoutType, string[]> = {
  push: [
    'Objętość klatki piersiowej w normie — 16 serii roboczych.',
    'Wyciskanie leżąc: podnieś ciężar o 2,5 kg w następnej sesji.',
    'Zadbaj o rozgrzewkę barków przed wyciskaniem nad głowę.',
  ],
  pull: [
    'Świetna progresja w podciąganiu (+1 powtórzenie).',
    'Wiosłowanie: utrzymaj ciężar, popraw kontrolę fazy ekscentrycznej.',
  ],
  legs: [
    'Przysiad: RIR 1 w ostatniej serii — bez zmian ciężaru.',
    'Rozważ dodatkową serię uginania nóg dla balansu tylnej taśmy.',
  ],
  cardio: ['Tętno w strefie 2 przez 70% czasu — dobra praca tlenowa.'],
}

const rawLogs: Omit<WorkoutLog, 'exercises' | 'aiFeedback'>[] = [
  { date: '2026-09-02', title: 'Push A', type: 'push', duration: 61, volume: 4020, energy: 4 },
  { date: '2026-09-04', title: 'Pull A', type: 'pull', duration: 55, volume: 3810, energy: 3 },
  { date: '2026-09-07', title: 'Nogi A', type: 'legs', duration: 66, volume: 5240, energy: 4 },
  { date: '2026-09-09', title: 'Push B', type: 'push', duration: 58, volume: 3960, energy: 3 },
  { date: '2026-09-12', title: 'Cardio', type: 'cardio', duration: 35, volume: 0, energy: 5 },
  { date: '2026-09-14', title: 'Pull B', type: 'pull', duration: 57, volume: 3890, energy: 4 },
  { date: '2026-09-16', title: 'Nogi B', type: 'legs', duration: 64, volume: 5310, energy: 3 },
  { date: '2026-09-19', title: 'Push A', type: 'push', duration: 60, volume: 4100, energy: 4 },
  { date: '2026-09-22', title: 'Pull A', type: 'pull', duration: 54, volume: 3920, energy: 4 },
  { date: '2026-09-24', title: 'Nogi A', type: 'legs', duration: 68, volume: 5420, energy: 2 },
  { date: '2026-09-28', title: 'Push B', type: 'push', duration: 59, volume: 4060, energy: 4 },
  { date: '2026-09-30', title: 'Cardio', type: 'cardio', duration: 32, volume: 0, energy: 4 },
  { date: '2026-10-01', title: 'Pull B', type: 'pull', duration: 56, volume: 3980, energy: 3 },
  { date: '2026-10-03', title: 'Nogi B', type: 'legs', duration: 65, volume: 5480, energy: 4 },
  { date: '2026-10-05', title: 'Push A', type: 'push', duration: 62, volume: 4180, energy: 5 },
  { date: '2026-10-07', title: 'Pull A', type: 'pull', duration: 58, volume: 4010, energy: 4 },
  { date: '2026-10-09', title: 'Nogi A', type: 'legs', duration: 67, volume: 5560, energy: 3 },
  { date: '2026-10-10', title: 'Cardio', type: 'cardio', duration: 30, volume: 0, energy: 5 },
  { date: '2026-10-12', title: 'Push B', type: 'push', duration: 60, volume: 4210, energy: 4 },
  {
    date: '2026-10-13',
    title: 'Pull B',
    type: 'pull',
    duration: 57,
    volume: 4090,
    energy: 3,
    notes: 'Lekkie spięcie w lewym bicepsie przy uginaniu.',
  },
]

export const workoutLogs: WorkoutLog[] = rawLogs.map((log) => ({
  ...log,
  exercises: exerciseTemplates[log.type],
  aiFeedback: feedbackTemplates[log.type],
}))

export const weightHistory = [
  { date: '17.08', weight: 85.1 },
  { date: '24.08', weight: 84.8 },
  { date: '31.08', weight: 84.6 },
  { date: '07.09', weight: 84.1 },
  { date: '14.09', weight: 83.9 },
  { date: '21.09', weight: 83.4 },
  { date: '28.09', weight: 83.2 },
  { date: '05.10', weight: 82.8 },
  { date: '12.10', weight: 82.4 },
]

export type MuscleGroup = 'Klatka' | 'Plecy' | 'Barki' | 'Nogi' | 'Ramiona' | 'Brzuch'

export const muscleGroups: MuscleGroup[] = ['Klatka', 'Plecy', 'Barki', 'Nogi', 'Ramiona', 'Brzuch']

export type Exercise = {
  id: string
  name: string
  muscle: MuscleGroup
  equipment: string
  favorite: boolean
  excluded: boolean
  custom?: boolean
}

export const initialExercises: Exercise[] = [
  { id: 'e1', name: 'Wyciskanie sztangi leżąc', muscle: 'Klatka', equipment: 'Sztanga', favorite: true, excluded: false },
  { id: 'e2', name: 'Wyciskanie hantli na skosie', muscle: 'Klatka', equipment: 'Hantle', favorite: true, excluded: false },
  { id: 'e3', name: 'Rozpiętki na bramie', muscle: 'Klatka', equipment: 'Wyciąg', favorite: false, excluded: false },
  { id: 'e4', name: 'Pompki na poręczach', muscle: 'Klatka', equipment: 'Masa ciała', favorite: false, excluded: true },
  { id: 'e5', name: 'Podciąganie nachwytem', muscle: 'Plecy', equipment: 'Drążek', favorite: true, excluded: false },
  { id: 'e6', name: 'Wiosłowanie sztangą', muscle: 'Plecy', equipment: 'Sztanga', favorite: false, excluded: false },
  { id: 'e7', name: 'Ściąganie drążka wąsko', muscle: 'Plecy', equipment: 'Wyciąg', favorite: false, excluded: false },
  { id: 'e8', name: 'Wyciskanie żołnierskie', muscle: 'Barki', equipment: 'Sztanga', favorite: false, excluded: false },
  { id: 'e9', name: 'Wznosy bokiem na wyciągu', muscle: 'Barki', equipment: 'Wyciąg', favorite: true, excluded: false },
  { id: 'e10', name: 'Face pull', muscle: 'Barki', equipment: 'Wyciąg', favorite: false, excluded: false },
  { id: 'e11', name: 'Przysiad ze sztangą', muscle: 'Nogi', equipment: 'Sztanga', favorite: true, excluded: false },
  { id: 'e12', name: 'Martwy ciąg rumuński', muscle: 'Nogi', equipment: 'Sztanga', favorite: false, excluded: false },
  { id: 'e13', name: 'Wypychanie na suwnicy', muscle: 'Nogi', equipment: 'Maszyna', favorite: false, excluded: false },
  { id: 'e14', name: 'Wykroki bułgarskie', muscle: 'Nogi', equipment: 'Hantle', favorite: false, excluded: true },
  { id: 'e15', name: 'Uginanie z hantlami', muscle: 'Ramiona', equipment: 'Hantle', favorite: false, excluded: false },
  { id: 'e16', name: 'Prostowanie ramion na wyciągu', muscle: 'Ramiona', equipment: 'Wyciąg', favorite: false, excluded: false },
  { id: 'e17', name: 'Plank', muscle: 'Brzuch', equipment: 'Masa ciała', favorite: false, excluded: false },
  { id: 'e18', name: 'Spięcia brzucha na wyciągu', muscle: 'Brzuch', equipment: 'Wyciąg', favorite: false, excluded: false },
]

export type LiveExercise = {
  id: string
  name: string
  alternatives: string[]
  note: string
  lastTime: string
  targetSets: number
  targetReps: string
  restSeconds: number
  suggested: { weight: number; reps: number }
  completedSets: LoggedSet[]
}

export const liveWorkoutPlan: LiveExercise[] = [
  {
    id: 'l1',
    name: 'Wyciskanie hantli na skosie',
    alternatives: ['Wyciskanie na maszynie Smitha (skos)'],
    note: 'Skos 30°, łopatki ściągnięte, łokcie ~45° od tułowia.',
    lastTime: '32 kg × 8, 32 kg × 8, 30 kg × 8',
    targetSets: 3,
    targetReps: '8–10',
    restSeconds: 150,
    suggested: { weight: 32, reps: 8 },
    completedSets: [
      { weight: 32, reps: 9, rir: 2 },
      { weight: 32, reps: 8, rir: 2 },
      { weight: 32, reps: 8, rir: 1 },
    ],
  },
  {
    id: 'l2',
    name: 'Wyciskanie sztangi leżąc',
    alternatives: ['Wyciskanie hantli leżąc', 'Wyciskanie na maszynie (Hammer)'],
    note: 'Skos 0°, ściągnij łopatki, stopy mocno w podłodze, sztanga do dolnej części mostka.',
    lastTime: '80 kg × 8, 80 kg × 8, 80 kg × 6',
    targetSets: 4,
    targetReps: '6–8',
    restSeconds: 180,
    suggested: { weight: 80, reps: 8 },
    completedSets: [
      { weight: 80, reps: 8, rir: 2 },
      { weight: 80, reps: 8, rir: 1 },
    ],
  },
  {
    id: 'l3',
    name: 'Wyciskanie żołnierskie',
    alternatives: ['Wyciskanie hantli siedząc', 'Wyciskanie na maszynie barkowej'],
    note: 'Napnij pośladki i brzuch, nie wyginaj odcinka lędźwiowego.',
    lastTime: '45 kg × 8, 45 kg × 7, 42,5 kg × 8',
    targetSets: 3,
    targetReps: '6–8',
    restSeconds: 150,
    suggested: { weight: 45, reps: 8 },
    completedSets: [],
  },
  {
    id: 'l4',
    name: 'Wznosy bokiem na wyciągu',
    alternatives: ['Wznosy bokiem z hantlami'],
    note: 'Prowadź ruch łokciem, kciuk lekko w dół, bez bujania.',
    lastTime: '10 kg × 15, 10 kg × 14, 10 kg × 12',
    targetSets: 3,
    targetReps: '12–15',
    restSeconds: 90,
    suggested: { weight: 10, reps: 15 },
    completedSets: [],
  },
  {
    id: 'l5',
    name: 'Prostowanie ramion na wyciągu',
    alternatives: ['Wyciskanie francuskie', 'Pompki na poręczach'],
    note: 'Łokcie przyklejone do tułowia, pełny wyprost na dole.',
    lastTime: '27 kg × 12, 27 kg × 12, 25 kg × 12',
    targetSets: 3,
    targetReps: '10–12',
    restSeconds: 90,
    suggested: { weight: 27, reps: 12 },
    completedSets: [],
  },
]

export const unfinalizedWorkout = {
  title: 'Push A',
  date: 'Dziś, 14 października',
  duration: 62,
  volume: 4250,
  sets: 19,
  exercises: 5,
  prs: 1,
}

export const aiFeedback = {
  summary:
    'Solidna sesja Push. Objętość wzrosła o 1,5% względem poprzedniego treningu Push A, a średni RIR 1,7 wskazuje na odpowiednią intensywność.',
  sections: [
    {
      title: 'Analiza objętości',
      items: [
        'Klatka piersiowa: 7 serii roboczych — w docelowym zakresie (6–10).',
        'Barki: 6 serii, w tym 3 izolowane — dobry balans przód / bok.',
        'Triceps: 3 serie bezpośrednie + praca pomocnicza w wyciskaniach.',
      ],
    },
    {
      title: 'Rekomendacja na następną sesję',
      items: [
        'Wyciskanie leżąc: 82,5 kg × 6–8 (wszystkie serie z RIR ≥ 1).',
        'Wyciskanie hantli na skosie: pozostań przy 32 kg, celuj w 10 powtórzeń.',
        'Wznosy bokiem: dodaj 4. serię zamiast podnosić ciężar.',
      ],
    },
    {
      title: 'Profilaktyka urazów',
      items: [
        'Ból nadgarstka: użyj owijek i trzymaj nadgarstek w linii z przedramieniem.',
        'Rozważ zamianę sztangi na hantle przy nawrocie dolegliwości.',
        'Zadyszka na bieżni: dodaj 2 sesje cardio w strefie 2 tygodniowo.',
      ],
    },
  ],
}

export function formatDuration(totalSeconds: number, withHours = true) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return withHours ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

export const numberFormat = new Intl.NumberFormat('pl-PL')
