import { z } from 'zod'

export const GenderSchema = z.enum(['male', 'female', 'other'])
export const ExperienceLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'])
export const PrimaryGoalSchema = z.enum(['hypertrophy', 'strength', 'weight_loss', 'endurance'])
export const MuscleGroupSchema = z.enum(['chest', 'back', 'shoulders', 'legs', 'arms', 'abs'])
export const EquipmentSchema = z.enum([
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'calisthenics',
  'cardio',
])
export const RestTypeSchema = z.enum(['heavy_compound', 'moderate_compound', 'isolation', 'cardio'])
export const RestTimerSignalSchema = z.enum(['none', 'vibrate']).default('vibrate')
export const WorkoutTypeSchema = z.enum(['push', 'pull', 'legs', 'cardio'])
export const WorkoutStatusSchema = z.enum(['in_progress', 'pending_finalization', 'completed'])
export const EntityIdSchema = z.string().trim().min(1).max(100)
export const WorkoutLogSchema = z
  .object({
    id: EntityIdSchema,
    date: z.iso.date(),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    title: z.string().trim().min(1).max(120),
    type: WorkoutTypeSchema,
    duration: z.number().int().nonnegative(),
    volume: z.number().nonnegative(),
    energy: z.number().int().min(1).max(5),
    notes: z.string().optional(),
    exercises: z.array(
      z
        .object({
          name: z.string().trim().min(1).max(120),
          sets: z.string().max(80),
          best: z.string().max(80),
        })
        .strict(),
    ),
    aiFeedback: z.array(z.string().max(4000)),
  })
  .strict()
export const WeeklyWorkoutStatsSchema = z
  .object({
    workout_count: z.number().int().nonnegative(),
    volume_kg: z.number().nonnegative(),
    duration_minutes: z.number().int().nonnegative(),
    set_count: z.number().int().nonnegative(),
  })
  .strict()
export const WorkoutDashboardStatsSchema = z
  .object({
    streak_weeks: z.number().int().nonnegative(),
    current_week: WeeklyWorkoutStatsSchema,
    week_activity: z
      .array(
        z
          .object({
            date: z.iso.date(),
            label: z.string().min(1).max(4),
            has_workout: z.boolean(),
            is_today: z.boolean(),
          })
          .strict(),
      )
      .length(7),
  })
  .strict()

const IsoDateSchema = z.iso.date()
const IsoDateTimeSchema = z.iso.datetime()

export const WeightEntrySchema = z
  .object({
    date: IsoDateSchema,
    weight_kg: z.number().positive().max(1000),
  })
  .strict()

export const ExerciseSchema = z
  .object({
    id: EntityIdSchema,
    updated_at: IsoDateTimeSchema.optional(),
    name: z.string().trim().min(1).max(120),
    active: z.boolean().default(true),
    category: MuscleGroupSchema,
    equipment: EquipmentSchema,
    rest_type: RestTypeSchema,
    technique_note: z.string().max(2000).default(''),
    custom: z.boolean().default(false),
  })
  .strict()

export const CustomExerciseSchema = ExerciseSchema.extend({
  custom: z.literal(true),
}).strict()

export const ExercisePreferencesSchema = z
  .object({
    updated_at: IsoDateTimeSchema.optional(),
    excluded_exercise_ids: z.array(EntityIdSchema),
    favorite_exercise_ids: z.array(EntityIdSchema),
  })
  .strict()
  .superRefine((preferences, context) => {
    const excluded = new Set(preferences.excluded_exercise_ids)
    if (preferences.favorite_exercise_ids.some((id) => excluded.has(id))) {
      context.addIssue({
        code: 'custom',
        message: 'Ćwiczenie nie może być jednocześnie ulubione i wykluczone.',
        path: ['favorite_exercise_ids'],
      })
    }
  })

export const ProfileDocumentSchema = z
  .object({
    version: z.literal('1.0'),
    updated_at: IsoDateTimeSchema,
    profile: z
      .object({
        gender: GenderSchema,
        age: z.number().int().min(13).max(120),
        height_cm: z.number().positive().max(300),
        weight_history: z.array(WeightEntrySchema),
        experience_level: ExperienceLevelSchema,
        primary_goal: PrimaryGoalSchema,
        injuries_notes: z.string().max(4000).default(''),
      })
      .strict(),
    exercise_preferences: z
      .object({
        excluded_exercise_ids: z.array(z.string().min(1).max(100)),
        favorite_exercise_ids: z.array(z.string().min(1).max(100)),
        custom_exercises: z.array(CustomExerciseSchema),
      })
      .strict(),
    settings: z
      .object({
        rest_timer_defaults: z
          .object({
            heavy_compound: z.number().int().min(1).max(3600),
            moderate_compound: z.number().int().min(1).max(3600),
            isolation: z.number().int().min(1).max(3600),
          })
          .strict(),
          rest_timer_signal: RestTimerSignalSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((document, context) => {
    const { excluded_exercise_ids: excluded, favorite_exercise_ids: favorite } =
      document.exercise_preferences
    for (const [field, values] of Object.entries({
      excluded_exercise_ids: excluded,
      favorite_exercise_ids: favorite,
    })) {
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: 'custom',
          message: 'Identyfikatory ćwiczeń nie mogą się powtarzać.',
          path: ['exercise_preferences', field],
        })
      }
    }

    if (favorite.some((id) => excluded.includes(id))) {
      context.addIssue({
        code: 'custom',
        message: 'Ćwiczenie nie może być jednocześnie ulubione i wykluczone.',
        path: ['exercise_preferences', 'favorite_exercise_ids'],
      })
    }
  })

export const LoggedSetSchema = z
  .object({
    set_number: z.number().int().positive(),
    weight_kg: z.number().min(0).max(2000),
    reps: z.number().int().positive().max(1000),
    rir: z.number().int().min(0).max(4).optional(),
  })
  .strict()

export const PlanExerciseSchema = z
  .object({
    exercise_id: z.string().min(1).max(100),
    order: z.number().int().nonnegative(),
    target_sets: z.number().int().positive().max(100),
    target_reps: z.string().trim().min(1).max(30),
    rest_type: RestTypeSchema,
  })
  .strict()

export const WorkoutPlanSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().trim().min(1).max(120),
    type: WorkoutTypeSchema,
    exercises: z.array(PlanExerciseSchema).min(1),
    created_at: IsoDateTimeSchema,
    updated_at: IsoDateTimeSchema,
  })
  .strict()

export const WorkoutExerciseSchema = z
  .object({
    exercise_id: z.string().min(1).max(100),
    exercise_name: z.string().trim().min(1).max(120),
    sets: z.array(LoggedSetSchema),
    note_during_workout: z.string().max(4000).default(''),
  })
  .strict()

export const AiAnalysisFeedbackSchema = z.string().trim().min(1).max(4000).superRefine((text, context) => {
  const wordCount = text.match(/\S+/g)?.length ?? 0
  if (wordCount > 150) {
    context.addIssue({
      code: 'custom',
      message: 'Analiza AI nie może przekraczać 150 słów.',
    })
  }
})

export const AiAnalysisSchema = z
  .object({
    generated_at: IsoDateTimeSchema,
    feedback_text: AiAnalysisFeedbackSchema,
  })
  .strict()

export const WorkoutSchema = z
  .object({
    id: z.string().min(1).max(100),
    updated_at: IsoDateTimeSchema.optional(),
    start_time: IsoDateTimeSchema,
    end_time: IsoDateTimeSchema.optional(),
    status: WorkoutStatusSchema,
    plan_id: z.string().min(1).max(100).optional(),
    plan_name: z.string().trim().min(1).max(120),
    paused_at: IsoDateTimeSchema.optional(),
    paused_duration_ms: z.number().int().nonnegative().default(0),
    readiness_energy_score: z.number().int().min(1).max(5).optional(),
    exercises: z.array(WorkoutExerciseSchema),
    post_workout_user_notes: z.string().max(4000).optional(),
    ai_analysis: AiAnalysisSchema.optional(),
  })
  .strict()
  .superRefine((workout, context) => {
    if (workout.status !== 'in_progress' && !workout.end_time) {
      context.addIssue({
        code: 'custom',
        message: 'Zakończony trening musi mieć czas zakończenia.',
        path: ['end_time'],
      })
    }

    if (workout.status === 'in_progress' && workout.end_time) {
      context.addIssue({
        code: 'custom',
        message: 'Aktywny trening nie może mieć czasu zakończenia.',
        path: ['end_time'],
      })
    }

    if (workout.end_time && Date.parse(workout.end_time) < Date.parse(workout.start_time)) {
      context.addIssue({
        code: 'custom',
        message: 'Czas zakończenia nie może poprzedzać czasu rozpoczęcia.',
        path: ['end_time'],
      })
    }

    if (workout.paused_at && workout.status !== 'in_progress') {
      context.addIssue({
        code: 'custom',
        message: 'Tylko aktywny trening może być wstrzymany.',
        path: ['paused_at'],
      })
    }
  })

export const LiveSessionSnapshotSchema = z
  .object({
    workout_id: EntityIdSchema,
    plan_id: EntityIdSchema,
    exercise_ids: z.array(EntityIdSchema).min(1).max(100),
    exercise_index: z.number().int().nonnegative().max(99),
    draft: z
      .object({
        weight: z.string().max(20),
        reps: z.string().max(10),
        rir: z.number().int().min(0).max(4),
      })
      .strict(),
    paused: z.boolean(),
    elapsed_ms: z.number().int().nonnegative(),
    rest_remaining_ms: z.number().int().nonnegative(),
    rest_total_ms: z.number().int().nonnegative(),
    updated_at: IsoDateTimeSchema,
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (snapshot.exercise_index >= snapshot.exercise_ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Bieżące ćwiczenie nie istnieje w zapisanej sesji.',
        path: ['exercise_index'],
      })
    }
  })

export type Gender = z.infer<typeof GenderSchema>
export type ExperienceLevel = z.infer<typeof ExperienceLevelSchema>
export type PrimaryGoal = z.infer<typeof PrimaryGoalSchema>
export type MuscleGroup = z.infer<typeof MuscleGroupSchema>
export type Equipment = z.infer<typeof EquipmentSchema>
export type RestType = z.infer<typeof RestTypeSchema>
export type WorkoutType = z.infer<typeof WorkoutTypeSchema>
export type WorkoutStatus = z.infer<typeof WorkoutStatusSchema>
export type WorkoutLog = z.infer<typeof WorkoutLogSchema>
export type WeeklyWorkoutStats = z.infer<typeof WeeklyWorkoutStatsSchema>
export type WorkoutDashboardStats = z.infer<typeof WorkoutDashboardStatsSchema>
export type WeightEntry = z.infer<typeof WeightEntrySchema>
export type Exercise = z.infer<typeof ExerciseSchema>
export type ExerciseInput = z.input<typeof ExerciseSchema>
export type CustomExercise = z.infer<typeof CustomExerciseSchema>
export type ExercisePreferences = z.infer<typeof ExercisePreferencesSchema>
export type ExercisePreferencesInput = z.input<typeof ExercisePreferencesSchema>
export type ProfileDocument = z.infer<typeof ProfileDocumentSchema>
export type ProfileDocumentInput = z.input<typeof ProfileDocumentSchema>
export type LoggedSet = z.infer<typeof LoggedSetSchema>
export type PlanExercise = z.infer<typeof PlanExerciseSchema>
export type WorkoutPlan = z.infer<typeof WorkoutPlanSchema>
export type WorkoutPlanInput = z.input<typeof WorkoutPlanSchema>
export type WorkoutExercise = z.infer<typeof WorkoutExerciseSchema>
export type AiAnalysis = z.infer<typeof AiAnalysisSchema>
export type Workout = z.infer<typeof WorkoutSchema>
export type WorkoutInput = z.input<typeof WorkoutSchema>
export type LiveSessionSnapshot = z.infer<typeof LiveSessionSnapshotSchema>
