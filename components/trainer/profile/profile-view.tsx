'use client'

import { useEffect, useState } from 'react'
import { getProfile, PROFILE_DATA_EVENT, saveProfile } from '@/lib/repositories'
import type { ExperienceLevel, Gender, PrimaryGoal, ProfileDocument } from '@/lib/schemas'
import { BiometricsCard } from './biometrics-card'
import { WeightHistoryCard } from './weight-history-card'
import { AiProviderCard } from './ai-provider-card'
import { DriveSyncCard } from './drive-sync-card'
import { BackupCard } from './backup-card'
import { RestSettingsCard } from './rest-settings-card'
import { ProfileSection } from './profile-section'

const defaultProfileDocument: ProfileDocument = {
  version: '1.0',
  updated_at: '2026-10-14T18:30:00.000Z',
  profile: {
    gender: 'male',
    weight_history: [],
    experience_level: 'intermediate',
    primary_goal: 'hypertrophy',
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
    rest_timer_signal: 'vibrate',
  },
}

function formatDisplayDate(date: string) {
  const parsed = new Date(`${date}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return parsed.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

export function ProfileView({ required = false }: { required?: boolean }) {
  const [profile, setProfile] = useState<ProfileDocument>(defaultProfileDocument)
  const [profileDirty, setProfileDirty] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')

  const loadProfile = async () => {
    setStatus('loading')
    setError('')

    try {
      const document = await getProfile()
      setProfile(document ?? defaultProfileDocument)
      setProfileDirty(false)
      setStatus('ready')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać profilu.')
      setStatus('error')
    }
  }

  useEffect(() => {
    let active = true

    void getProfile().then((document) => {
      if (!active) return
      setProfile(document ?? defaultProfileDocument)
      setProfileDirty(false)
      setStatus('ready')
    }).catch((cause: unknown) => {
      if (!active) return
      setError(cause instanceof Error ? cause.message : 'Nie udało się wczytać profilu.')
      setStatus('error')
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleProfileDataChange = () => {
      void loadProfile()
    }

    window.addEventListener(PROFILE_DATA_EVENT, handleProfileDataChange)
    return () => window.removeEventListener(PROFILE_DATA_EVENT, handleProfileDataChange)
  }, [])

  useEffect(() => {
    if (status !== 'ready' || !profileDirty) return

    let active = true
    const timeout = window.setTimeout(() => {
      void saveProfile({
        ...profile,
        updated_at: new Date().toISOString(),
      }).then(() => {
        if (active) {
          setSaveError('')
          setProfileDirty(false)
        }
      }).catch((cause: unknown) => {
        if (active) {
          setSaveError(cause instanceof Error ? cause.message : 'Nie udało się zapisać profilu.')
        }
      })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [profile, profileDirty, status])

  const updateProfile = (updater: (current: ProfileDocument) => ProfileDocument) => {
    setProfile(updater)
    setProfileDirty(true)
  }

  const currentWeight = profile.profile.weight_history.at(-1)?.weight_kg ?? 0
  const weights = profile.profile.weight_history.map((entry) => ({
    date: formatDisplayDate(entry.date),
    weight: Number(entry.weight_kg.toFixed(1)),
  }))

  const addWeight = (weight: number) => {
    updateProfile((current) => {
      const nextHistory = [
        ...current.profile.weight_history,
        {
          date: new Date().toISOString().slice(0, 10),
          weight_kg: Number(weight.toFixed(1)),
        },
      ].slice(-12)

      return {
        ...current,
        updated_at: new Date().toISOString(),
        profile: {
          ...current.profile,
          weight_history: nextHistory,
        },
      }
    })
  }

  const handleGenderChange = (gender: Gender) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      profile: {
        ...current.profile,
        gender,
      },
    }))
  }

  const handleAgeChange = (age: number | undefined) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      profile: {
        ...current.profile,
        ...(age === undefined ? { age: undefined } : { age: Math.min(Math.max(age, 13), 120) }),
      },
    }))
  }

  const handleHeightChange = (height: number | undefined) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      profile: {
        ...current.profile,
        ...(height === undefined ? { height_cm: undefined } : { height_cm: Math.min(Math.max(height, 1), 300) }),
      },
    }))
  }

  const handleExperienceLevelChange = (experienceLevel: ExperienceLevel) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      profile: { ...current.profile, experience_level: experienceLevel },
    }))
  }

  const handlePrimaryGoalChange = (primaryGoal: PrimaryGoal) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      profile: { ...current.profile, primary_goal: primaryGoal },
    }))
  }

  const handleInjuriesNotesChange = (injuriesNotes: string) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      profile: { ...current.profile, injuries_notes: injuriesNotes },
    }))
  }

  const handleRestTimerChange = (key: keyof ProfileDocument['settings']['rest_timer_defaults'], seconds: number) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      settings: {
        ...current.settings,
        rest_timer_defaults: {
          ...current.settings.rest_timer_defaults,
          [key]: seconds,
        },
      },
    }))
  }

  const handleRestTimerSignalChange = (signal: ProfileDocument['settings']['rest_timer_signal']) => {
    updateProfile((current) => ({
      ...current,
      updated_at: new Date().toISOString(),
      settings: { ...current.settings, rest_timer_signal: signal },
    }))
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Profil i ustawienia</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dane biometryczne, integracja AI i synchronizacja.</p>
        </div>
        <p role="status" className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Wczytywanie profilu…
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Profil i ustawienia</h1>
          <p className="mt-1 text-sm text-muted-foreground">Dane biometryczne, integracja AI i synchronizacja.</p>
        </div>
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Nie udało się wczytać profilu.</p>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => void loadProfile()} className="mt-3 underline underline-offset-2">
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Profil i ustawienia</h1>
        <p className="mt-1 text-sm text-muted-foreground">Dane biometryczne, integracja AI i synchronizacja.</p>
      </div>

      <div className="flex flex-col gap-3">
        {required ? (
          <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
            Uzupełnij wiek i wzrost przed rozpoczęciem treningu planowanego. Pozostałe funkcje aplikacji pozostają dostępne.
          </p>
        ) : null}
        <ProfileSection
          title="Dane biometryczne"
          description="Płeć, wiek, wzrost i dane używane do dopasowania treningu."
          defaultOpen={required}
        >
          <BiometricsCard
            gender={profile.profile.gender}
            age={profile.profile.age}
            height={profile.profile.height_cm}
            experienceLevel={profile.profile.experience_level}
            primaryGoal={profile.profile.primary_goal}
            injuriesNotes={profile.profile.injuries_notes}
            onGenderChange={handleGenderChange}
            onAgeChange={handleAgeChange}
            onHeightChange={handleHeightChange}
            onExperienceLevelChange={handleExperienceLevelChange}
            onPrimaryGoalChange={handlePrimaryGoalChange}
            onInjuriesNotesChange={handleInjuriesNotesChange}
          />
        </ProfileSection>
        <ProfileSection
          title="Masa ciała i postępy"
          description="Dodawaj pomiary i obserwuj zmianę w czasie."
        >
          <WeightHistoryCard weights={weights} onAdd={addWeight} />
        </ProfileSection>
        <ProfileSection
          title="Ustawienia treningu"
          description="Domyślne przerwy i sygnał końca odpoczynku."
        >
          <RestSettingsCard
            values={profile.settings.rest_timer_defaults}
            onChange={handleRestTimerChange}
            signal={profile.settings.rest_timer_signal}
            onSignalChange={handleRestTimerSignalChange}
          />
        </ProfileSection>
        <ProfileSection
          title="Sztuczna inteligencja"
          description="Dostawca AI i lokalny klucz API."
        >
          <AiProviderCard />
        </ProfileSection>
        <ProfileSection
          title="Synchronizacja i dane"
          description="Google Drive, import, eksport i usuwanie danych."
        >
          <div className="flex flex-col gap-3">
            <DriveSyncCard />
            <BackupCard />
          </div>
        </ProfileSection>
      </div>
      {saveError ? (
        <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Nie udało się zapisać zmian profilu: {saveError}
        </p>
      ) : null}
    </div>
  )
}
