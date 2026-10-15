# Audyt szablonu v0 (ai-trainer-pwa-development)

Stan na 14.10.2026. Przejrzałem cały kod ręcznie (ok. 3 100 linii). **Nie udało się uruchomić `tsc` ani `next build`** (w moim środowisku nie ma dostępu do rejestru npm), więc ewentualne błędy typów nie są sprawdzone. Tym ważniejsze jest wyłączenie `ignoreBuildErrors` (patrz sekcja 4).

## 1. Podsumowanie

Szablon to **kompletny, dobrze zrobiony prototyp UI** (Next.js 16, React 19, Tailwind 4, shadcn/ui na `@base-ui/react`, Recharts), po polsku, mobile-first, z dolną nawigacją i zwijanym sidebarem. Ma 4 zakładki (Dziś, Historia, Ćwiczenia, Profil) i osobny pełnoekranowy widok treningu na żywo. Wizualnie pokrywa większość PRD.

**Niczego tu nie ma „pod spodem":** zero persystencji, zero API, zero service workera. Cały stan to `useState` + jeden plik z danymi testowymi `lib/trainer-data.ts`, a „AI", „synchronizacja" i „test klucza" to `setTimeout`. Praca polega więc na **podpięciu istniejących komponentów do danych**, a nie na przepisywaniu UI. Rekomenduję zachować komponenty prezentacyjne bez zmian wyglądu.

## 2. Mapa ekranów na moduły PRD

| Plik | Co to jest | Moduł PRD | Stan |
|---|---|---|---|
| `app-shell.tsx` | Szkielet: zakładki w `useState`, sidebar, bottom nav, pływający pasek „Trening w toku" | wszystkie | UI gotowe, stan tylko w pamięci |
| `dashboard/dashboard-view.tsx` | Ekran „Dziś" | 4, 5, 6 | złożony z poniższych kart |
| `dashboard/quick-start-card.tsx` | Start treningu (na stałe „Push A") | 4.1 | mock (`liveWorkoutPlan`) |
| `dashboard/post-workout-finalization.tsx` | Ankieta: energia 1–5 + notatki, symulowane AI | 5.1, 5.2, 5.3 | UI gotowe, `setTimeout` zamiast AI |
| `dashboard/ai-feedback-card.tsx` | Karta wniosków AI (3 sekcje) | 5.3 | pokazuje stały obiekt `aiFeedback` |
| `dashboard/streak-card.tsx`, `weekly-stats-card.tsx`, `weight-trend-card.tsx` | Streak, statystyki tygodnia, trend wagi | 6.1, 2.2 | streak „12 tygodni" i statystyki wpisane na sztywno |
| `live/*` (6 plików) | Trening na żywo: nagłówek ze stoperem, karta ćwiczenia, tabela serii ze Smart Fill, stoper przerw, kolejka ćwiczeń | 4.1–4.5 | UI bardzo dobre, logika uproszczona (sekcja 5) |
| `history/*` (4 pliki) | Kalendarz miesiąca, lista, szczegóły treningu, wykres wagi | 6.1 | działa na `workoutLogs` (mock) |
| `exercises/exercise-catalog.tsx` | Katalog: szukaj, partia, ulubione/wykluczone | 3.1, 3.2 | stan lokalny, 18 ćwiczeń |
| `exercises/add-exercise-card.tsx` | Dodawanie własnego ćwiczenia | 3.1 | działa na stanie lokalnym |
| `exercises/plan-generator.tsx` | Generator planu (cel, poziom, dni, czas) | 6.2 | **lokalny algorytm + `setTimeout`, bez Gemini** |
| `profile/biometrics-card.tsx` | Płeć, wiek, wzrost, waga | 2.1 | mock (`'29'`, `'182'`), brak części pól |
| `profile/weight-history-card.tsx` | Dodawanie wagi | 2.2 | stan lokalny |
| `profile/gemini-card.tsx` | Klucz API | 2.3 | bez zapisu, test klucza to `setTimeout` |
| `profile/drive-sync-card.tsx` | Synchronizacja Drive | 1.2 | w całości atrapa |
| `weight-chart.tsx` | Wykres wagi (Recharts) | 2.2 | tylko waga, bez tonażu |

## 3. Dane testowe do usunięcia/zastąpienia

- `lib/trainer-data.ts`: `workoutLogs` (20 treningów od 02.09 do 13.10.2026), `weightHistory` (9 wpisów, etykiety `'17.08'` bez roku), `initialExercises` (18), `liveWorkoutPlan` (5 ćwiczeń z gotowymi seriami), `unfinalizedWorkout`, `aiFeedback`. Te same pliki eksportują też użyteczne helpery: `formatDuration`, `numberFormat`, `workoutTypeMeta` (zostawić, ale przenieść do `lib/format.ts`).
- Wpisane na sztywno w komponentach:
    - `live/live-workout.tsx`: `index = 1`, `elapsed = 42:15`, `rest = {84, 180}`, `draft = 80 kg × 8`.
    - `dashboard/post-workout-finalization.tsx`: notatki „Ból nadgarstka…" wstępnie wpisane; `setTimeout(…, 1800)`.
    - `dashboard/streak-card.tsx`: „12 tygodni", tablica `week`. `weekly-stats-card.tsx`: „12 550 kg", „+4%".
    - `history/calendar-card.tsx`: `TODAY = '2026-10-14'`. `history-view.tsx`: `month: 9`, `selected: '2026-10-13'`.
    - `profile/biometrics-card.tsx`: wiek `'29'`, wzrost `'182'`.
    - `profile/drive-sync-card.tsx`: e-mail `kamil.nowak@gmail.com`, „24 MB / 15 GB", „dziś, 07:42".
    - `app-shell.tsx`: `hasUnfinalized = true`; tytuł „Push A" na pasku treningu.
    - `quick-start-card.tsx`: tytuł „Push A" i liczba ćwiczeń z `liveWorkoutPlan`.

## 4. Konfiguracja projektu: do naprawy

1. **`next.config.mjs`: `typescript.ignoreBuildErrors: true`.** Ukrywa błędy typów. Usunąć i naprawić to, co wyjdzie. Brak `output: 'export'`.
2. **Brak service workera.** Jest tylko `app/manifest.ts`, więc aplikacja nie działa offline (core PRD).
3. **Manifest niekompletny:** brak ikon PNG 192×192 i 512×512 (jest `icon.svg` i `apple-icon.png` 180 px), więc Chrome najpewniej nie uzna aplikacji za instalowalną. Przy `output: 'export'` do `manifest.ts` trzeba dodać `export const dynamic = 'force-static'`. `start_url: '/'` bez wariantu na podścieżkę, jeśli hosting będzie w podkatalogu.
4. **`@vercel/analytics`** jest w `layout.tsx` (tylko w produkcji). To telemetria, której PRD nie przewiduje (aplikacja ma być „w pełni prywatna"). Usunąć, wraz z `generator: 'v0.app'` w metadanych.
5. **`package.json`:** nazwa `my-project`; zależność `cn` (zbędna paczka, jest własny `lib/utils.ts`); `shadcn` powinien być w `devDependencies`; brak skryptów `lint`, `typecheck`, `test`; brak ESLint/Prettier/Vitest/Playwright. `packageManager: pnpm@12.3.4` — **sprawdź, czy ta wersja pnpm istnieje u Ciebie**, bo przy braku corepacka instalacja potrafi się wywalić na pobieraniu managera.
6. **Brakujące zależności z planu:** `zustand`, `idb`, `zod`, `react-hook-form`, `serwist`.

## 5. Logika treningu na żywo: rozbieżności z PRD

Ekran jest najlepszą częścią szablonu wizualnie, ale ma kilka decyzji sprzecznych z założeniami PRD:

| # | Problem | Gdzie | Konsekwencja |
|---|---|---|---|
| 1 | Stoper sesji i przerw to `setInterval`, który co sekundę robi `s + 1` / `remaining - 1` | `live-workout.tsx` | po zablokowaniu ekranu lub przełączeniu karty czas „stoi" i się rozjeżdża. Trzeba liczyć z `start_time`/`rest_end_at` |
| 2 | Brak persystencji stanu | `live-workout.tsx` | odświeżenie strony kasuje trening (wymaganie offline-first) |
| 3 | Brak Screen Wake Lock | — | ekran zgaśnie podczas serii |
| 4 | Brak sygnału po przerwie (dźwięk/wibracja) | `rest-timer.tsx` | PRD 4.3 wymaga sygnału; tylko tekst „Czas na kolejną serię!" |
| 5 | **Brak pola notatki do ćwiczenia** (`note_during_workout`) | — | PRD 4.5. W UI jest tylko stała „Notatka techniczna" (tylko do odczytu, tekst na sztywno w `liveWorkoutPlan`) |
| 6 | Smart Fill to tylko etykieta | `sets-table.tsx` | wartości biorą się z `suggested` na sztywno albo z ostatniej serii przy zmianie ćwiczenia; brak podpowiedzi z historii (PRD 4.2) |
| 7 | „Zamień" **cyklicznie przełącza tablicę `alternatives` wpisaną na sztywno**, nazwa zmienia się tylko wizualnie; serie i historia zostają od poprzedniego ćwiczenia | `live-workout.tsx` (`swaps`) | PRD 4.4 wymaga alternatywy z tej samej partii i wczytania jej historii |
| 8 | Nie da się dodać ćwiczenia w trakcie sesji ani edytować/usunąć zalogowanej serii | `sets-table.tsx` | literówka w ciężarze = trwały błąd |
| 9 | „Zakończ" w nagłówku **kończy trening jednym kliknięciem, bez potwierdzenia**; ostatnie ćwiczenie też woła `onFinish` | `live-workout-header.tsx`, `live-workout.tsx` | grozi przypadkowym zakończeniem w środku serii. Poza tym `finishWorkout` w `app-shell.tsx` tylko ustawia flagę, niczego nie zapisuje |
| 10 | Przycisk pauzy zatrzymuje oba liczniki, ale PRD pauzy nie przewiduje | `live-workout.tsx` | zostawić, ale zapisywać skumulowany czas pauzy; do decyzji |
| 11 | Pole liczbowe: `Number(e.target.value) \|\| 0` | `sets-table.tsx` `Stepper` | nie da się wyczyścić pola ani wpisać „2,5" z przecinkiem (przy kasowaniu skacze na 0) |
| 12 | Cele, przerwy i serie to dane „planu" na sztywno (`targetSets`, `restSeconds`) | `trainer-data.ts` | przerwy powinny wynikać z `rest_type` ćwiczenia i ustawień |
| 13 | Typ `LoggedSet` = `{weight, reps, rir}` (w PRD: `weight_kg`, `set_number`, `rir`) | `trainer-data.ts` | patrz sekcja 6 |

## 6. Niezgodność modelu danych z PRD (sekcja 5)

| Szablon | PRD / plan | Uwaga |
|---|---|---|
| `WorkoutLog.date`, `title`, `type`, `duration`, `volume`, `energy` | `id`, `start_time`, `end_time`, `duration_minutes`, `plan_name`, `readiness_energy_score`, `status` | brak `id`, `status`, `updated_at`; `volume` powinien być liczony z serii, nie przechowywany |
| `WorkoutLog.exercises: {name, sets: '4 × 8', best: '32 kg × 8'}` | `exercises[].sets[]` z `weight_kg`, `reps`, `rir`, plus `note_during_workout` | w historii są tylko ciągi znaków; trzeba przepisać na prawdziwe serie i formatować w UI |
| `WorkoutLog.aiFeedback: string[]` | `ai_analysis: {generated_at, feedback_text}` | patrz uwaga niżej |
| `aiFeedback` (3 sekcje z tytułami i listami) | `feedback_text` — jeden tekst, ≤150 słów w punktach | **UI kart AI zakłada 3 sekcje, a prompt z PRD zwraca jeden tekst.** Decyzja: uprościć kartę do listy punktów z `feedback_text` (rekomendowane) albo zmienić prompt na ustrukturyzowany JSON |
| `Exercise {id:'e1', muscle, equipment: 'Sztanga', favorite, excluded, custom}` | `id` jako slug, `category`, `equipment` jako enum, `excluded_exercise_ids`, `favorite_exercise_ids` | wystarczy mapper; zachować polskie etykiety w UI. Brak `rest_type` i notatki technicznej |
| `equipmentOptions` w `add-exercise-card.tsx`: dodatkowo `Kettlebell`, w danych `Drążek`; brak `Kardio` | Sztanga, Hantle, Wyciąg, Maszyna, Kalistenika, Kardio | ujednolicić listę |
| `muscleGroups`: Klatka, Plecy, Barki, Nogi, Ramiona, Brzuch | PRD „partie mięśniowe" bez listy | OK, rozważyć rozbicie Ramion na Biceps/Triceps |
| `weightHistory: {date:'17.08', weight}` | `{date:'2026-10-14', weight_kg}` | etykiety bez roku psują wykres na przełomie lat |

## 7. Brakujące względem PRD

**Ekrany/funkcje, których nie ma w ogóle:**
- Logowanie Google i stan zalogowania (jest tylko atrapa w karcie Drive) — Moduł 1.1.
- Wskaźnik online/offline i stanu synchronizacji — 1.3.
- Biometria: **brak pól „Główny cel", „Poziom zaawansowania" i „Kontuzje/uwagi"** (jest tylko płeć, wiek, wzrost, waga) — 2.1. Cel i poziom występują dopiero w generatorze planów.
- Przełącznik Gemini API / Gemini Nano — 2.3 (karta ma tylko pole na klucz).
- Filtr po sprzęcie w katalogu (jest po partii i statusie) — 3.1.
- Edycja stałej notatki technicznej ćwiczenia — 3.3.
- Wykres siły dla ćwiczenia (np. szac. 1RM) — 6.1 (w całym kodzie nie ma nic o progresji siły).
- Wykres łączący wagę z tonażem — 2.2 (jest tylko waga).
- Start treningu z wygenerowanego planu; zapis planu — 6.2.
- Lista wielu niesfinalizowanych sesji (jest jedna zmienna `hasUnfinalized`) — 5.1.
- Szczegóły dnia z wieloma treningami: `logsByDate` to `Map<data, 1 trening>`, więc **dwa treningi jednego dnia nadpisują się**.
- Zgoda/informacja o danych wysyłanych do Gemini (pomysł z planu, nie PRD).
- Eksport/import kopii zapasowej, usuwanie danych (z planu).

**Do usunięcia, bo nie da się zrobić w PWA:** przełącznik „Tylko przez Wi-Fi" w `drive-sync-card.tsx` (Network Information API nie działa w Safari/Firefox) oraz pasek „Wykorzystane miejsce 24 MB / 15 GB" (zakres `drive.appdata` nie daje dostępu do informacji o pojemności Dysku).

## 8. Zgodność wizualna z sekcją 4 PRD

- Tło `#09090b`: **zgodne**. Dark mode wymuszony klasą `dark`: zgodne.
- **Karty `#111113`, PRD wymaga `#18181b`** (`globals.css`, `--card`). Poprawić.
- **Akcent `oklch(0.79 0.18 158)` jest jaśniejszy niż Emerald `#10b981`** (≈ `oklch(0.70 0.15 163)`). Do decyzji, czy zostawić szablonowy kolor, czy dopasować do PRD.
- Układ: dolna nawigacja poniżej 768 px i zwijany sidebar od 768 px — **zgodne**; widok dwukolumnowy w historii od `lg` (1024 px) zamiast 768 px.
- Dostępność: bardzo dobrze (aria-label, `sr-only`, `aria-pressed`, `aria-current`). Drobiazg: `role="grid"` w kalendarzu bez `row`/`gridcell`.
- **Cele dotykowe poniżej 48 px (wymóg Thumb-Friendly):** przyciski +/- w `Stepper` mają 44 px szerokości, przyciski RIR `h-10` (40 px), przyciski stopera `h-11` (44 px). Główny przycisk „Zaloguj serię" (`h-14`) i pola (`h-12`) są OK.

## 9. Co zostawić bez zmian (wartość szablonu)

`components/ui/*`, `navigation.tsx`, `rest-timer.tsx` (wygląd), `exercise-card.tsx`, `exercise-queue.tsx`, `calendar-card.tsx`, `weight-chart.tsx`, `workout-detail.tsx`, szkielet `app-shell.tsx`. Zmieniają się głównie **źródła danych i obsługa zdarzeń**, nie markup.

## 10. Rekomendowana kolejność

1. Sprzątanie konfiguracji (sekcja 4) i modele zod zgodne z PRD (sekcja 6).
2. IndexedDB + repozytoria, potem **wyciągnięcie danych z komponentów** widok po widoku (Profil → Ćwiczenia → Historia → Dziś).
3. Przepisanie logiki `live-workout.tsx` na store (Zustand) z timestampami i persystencją, bez zmiany wyglądu (sekcja 5).
4. Dopiero potem Drive i Gemini.