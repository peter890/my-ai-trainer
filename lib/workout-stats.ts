import { WorkoutDashboardStatsSchema, type Workout, type WorkoutDashboardStats } from './schemas'

const weekdayLabels = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  return weekStart
}

export function calculateWorkoutDashboardStats(
  workouts: Workout[],
  now = new Date(),
): WorkoutDashboardStats {
  const loggedWorkouts = workouts.filter(
    (workout): workout is Workout & { end_time: string } =>
      workout.status !== 'in_progress' && Boolean(workout.end_time),
  )
  const workoutDates = loggedWorkouts.map((workout) => ({
    workout,
    date: new Date(workout.start_time),
  }))
  const currentWeekStart = getWeekStart(now)
  const currentWeekStartKey = getLocalDateKey(currentWeekStart)
  const currentWeekDates = new Set<string>()
  const weeksWithWorkouts = new Set<string>()
  const currentWeekWorkouts = workoutDates
    .filter(({ date }) => {
      const weekStart = getWeekStart(date)
      const weekKey = getLocalDateKey(weekStart)
      weeksWithWorkouts.add(weekKey)
      const dateKey = getLocalDateKey(date)
      if (weekKey === currentWeekStartKey) currentWeekDates.add(dateKey)
      return weekKey === currentWeekStartKey
    })
    .map(({ workout }) => workout)

  let streakWeeks = 0
  const streakWeekStart = new Date(currentWeekStart)
  while (weeksWithWorkouts.has(getLocalDateKey(streakWeekStart))) {
    streakWeeks += 1
    streakWeekStart.setDate(streakWeekStart.getDate() - 7)
  }

  const totalDurationMs = currentWeekWorkouts.reduce(
    (total, workout) =>
      total + Math.max(0, Date.parse(workout.end_time) - Date.parse(workout.start_time) - workout.paused_duration_ms),
    0,
  )
  const currentWeek: WorkoutDashboardStats['current_week'] = {
    workout_count: currentWeekWorkouts.length,
    volume_kg: currentWeekWorkouts.reduce(
      (total, workout) =>
        total +
        workout.exercises.reduce(
          (exerciseTotal, exercise) =>
            exerciseTotal +
            exercise.sets.reduce((setTotal, set) => setTotal + set.weight_kg * set.reps, 0),
          0,
        ),
      0,
    ),
    duration_minutes: Math.round(totalDurationMs / 60000),
    set_count: currentWeekWorkouts.reduce(
      (total, workout) =>
        total + workout.exercises.reduce((exerciseTotal, exercise) => exerciseTotal + exercise.sets.length, 0),
      0,
    ),
  }

  const weekActivity = weekdayLabels.map((label, index) => {
    const date = new Date(currentWeekStart)
    date.setDate(currentWeekStart.getDate() + index)
    const dateKey = getLocalDateKey(date)
    return {
      date: dateKey,
      label,
      has_workout: currentWeekDates.has(dateKey),
      is_today: dateKey === getLocalDateKey(now),
    }
  })

  return WorkoutDashboardStatsSchema.parse({
    streak_weeks: streakWeeks,
    current_week: currentWeek,
    week_activity: weekActivity,
  })
}
