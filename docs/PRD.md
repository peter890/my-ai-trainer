# Dokument Specyfikacji Wymagań (PRD)
## Nazwa Projektu: AI Trainer (Gymini) – Progressive Web App

---

## 1. Przegląd Projektu i Wizja

### 1.1. Podsumowanie
AI Trainer (Gymini) to lekka, responsywna aplikacja webowa typu Single Page Application (SPA) stworzona w technologii Progressive Web App (PWA). Zastępuje ona tradycyjne papierowe oraz excelowe dzienniki treningowe zautomatyzowanym interfejsem działającym w trybie offline-first. Aplikacja integruje API Google Gemini, pełniącego rolę autonomicznego Trenera Personalnego.

### 1.2. Problem Biznesowy
* Ręczne zapisywanie treningu na siłowni jest uciążliwe, wybija z rytmu i wymaga powtarzalnego wprowadzania tych samych danych.
* Ręczne kopiowanie danych sesji do ChatGPT lub Gemini po treningu jest czasochłonne i pozbawione ustrukturyzowanego kontekstu w dłuższej perspektywie.
* Standardowe aplikacje fitness pobierają wysokie opłaty subskrypcyjne, wymagają rozbudowanych serwerów backendowych i nie zapewniają pełnej prywatności danych.

### 1.3. Główna Wartość i Filary Trenera Personalnego
Aplikacja odpowiada bezpośrednio 5 głównym filarom roli żywego Trenera Personalnego:
1. Ocena i Ustalanie Celów: Śledzenie profilu biometrycznego (waga, wzrost, wiek, płeć, cele, kontuzje i wykluczenia).
2. Tworzenie i Modyfikacja Planów: Automatyczne generowanie i dostosowywanie programu na podstawie celów, sprzętu i wyników historycznych.
3. Prowadzenie Treningu (Na żywo): Klonowanie serii (Smart Fill), stoper przerw oraz zamiana ćwiczeń w przypadku zajętego sprzętu.
4. Odpowiedzialność i Wsparcie Po Treningu: Odłożona finalizacja sesji w domu, ocena zmęczenia/RPE oraz notatki dotyczące bólu i kondycji.
5. Monitorowanie Postępów i Historia: Wizualny kalendarz regularności, wykresy siły oraz zautomatyzowane raporty od AI po sesji.

---

## 2. Architektura Systemu i Stos Technologiczny

* Frontend: React / Next.js (TypeScript), Tailwind CSS, shadcn/ui, Lucide Icons.
* Architektura: 100% Serverless / Client-Side Only (Brak własnej infrastruktury serwerowej).
* Przechowywanie Danych i Autoryzacja: Google OAuth 2.0 + Google Drive REST API (Folder AppData dla plików JSON).
* Baza Lokalna (Offline): IndexedDB (dla pełnej niezawodności na siłowni bez zasięgu).
* Silnik AI: Gemini API z własnym kluczem API użytkownika; identyfikator aktualnie wspieranego modelu jest centralnie konfigurowany w `lib/config.ts`. Obsługa lokalnego Gemini Nano jest opcjonalna.

---

## 3. Wymagania Funkcjonalne i Moduły Systemu

### MODUŁ 1: Uwierzytelnianie i Synchronizacja Danych
* 1.1. Logowanie Google (OAuth 2.0): Bezpieczne logowanie przez konto Google z zapisem tokenu w pamięci przeglądarki.
* 1.2. Synchronizacja z Google Drive AppData: Odczyt i zapis plików user_profile.json oraz workouts_history.json bezpośrednio w ukrytym folderze aplikacji na Google Drive użytkownika.
* 1.3. Działanie Offline-First: Pełna obsługa rejestracji treningu działa offline za pomocą IndexedDB. Synchronizacja z Google Drive oraz zapytania do Gemini API wykonują się automatycznie po odzyskaniu połączenia z siecią.

### MODUŁ 2: Profil Użytkownika i Dane Biometryczne
* 2.1. Statyczne Dane Biometryczne: Płeć, Wiek, Wzrost (cm), Poziom zaawansowania (Początkujący/Średniozaawansowany/Zaawansowany), Główny cel (Hipertrofia, Siła, Redukcja, Wytrzymałość).
* 2.2. Śledzenie Wagi i Postępów: Szybkie zapisywanie wagi z datą oraz wykres liniowy łączący wagę ciała z całkowitym tonażem treningowym.
* 2.3. Ustawienia AI: Pole do wprowadzenia prywatnego GEMINI_API_KEY (zapisywanego w localStorage) oraz przełącznik między chmurą Gemini API a lokalnym Gemini Nano.

### MODUŁ 3: Baza Ćwiczeń i Preferencje Treningowe
* 3.1. Katalog Ćwiczeń: Wbudowana baza podzielona na partie mięśniowe i tagi sprzętu (Sztanga, Hantle, Wyciąg, Maszyna, Kalistenika, Kardio) z opcją dodawania własnych ćwiczeń.
* 3.2. Filtrowanie i Wykluczenia: Przełączniki stanu dla każdego ćwiczenia (Ulubione, Aktywne, Wykluczone - np. z powodu kontuzji lub braku sprzętu).
* 3.3. Wskazówki Techniczne: Możliwość dodania stałej notatki technicznej do ćwiczenia (np. "Skos 30°, schowaj łopatki"), wyświetlanej automatycznie podczas treningu.

### MODUŁ 4: Dziennik Treningu na Żywo (Live Workout)
* 4.1. Stoper Sesji i Screen Wake Lock: Przycisk "Start Treningu" zapisuje czas rozpoczęcia. Pasek z czasem trwania jest stale widoczny. System używa Screen Wake Lock API, aby ekran nie wygaszał się podczas sesji.
* 4.2. Smart Fill (Zatwierdzanie serii jednym kliknięciem): Automatyczne podpowiadanie Ciężaru (kg) i Powtórzeń w kolejnej serii na podstawie poprzedniej serii lub ostatniego treningu. Kliknięcie przycisku [+] zatwierdza serię i uruchamia stoper.
* 4.3. Inteligentny Stoper Przerw: Automatyczny czas przerwy dopasowany do typu ćwiczenia (Ciężkie wielostawowe: 180s, Złożone: 120s, Izolowane: 60-90s) z przyciskami +30s, -30s, Pomiń oraz sygnałem po zakończeniu.
* 4.4. Zamiana Ćwiczenia On-the-Fly: Przycisk "Zamień ćwiczenie" sugeruje alternatywę na tę samą partię mięśniową (gdy sprzęt jest zajęty) i wczytuje dla niej historię.
* 4.5. Rejestracja Zmęczenia (RIR/RPE): Opcjonalne zaznaczanie powtórzeń w zapasie przy serii oraz notatki do ćwiczenia (np. ból nadgarstka, zadyszka).

### MODUŁ 5: Odłożona Finalizacja i Analiza Post-Workout przez AI
* 5.1. Odłożone Zakończenie Sesji: Przycisk "Zakończ sesję na siłowni" zatrzymuje stoper i zapisuje dane lokalnie, pozwalając na dokończenie podsumowania w domu.
* 5.2. Ankieta Końcowa w Domu: Ocena poziomu energii/zmęczenia (skala 1-5) oraz pole tekstowe na ogólne uwagi z treningu.
* 5.3. Automatyczna Analiza AI (Gemini): Wysyłanie zestawienia sesji, profilu biometrycznego i historii treningów do Gemini API. Wyświetlanie karty z wnioskami i zaleceniami na kolejny trening.

### MODUŁ 6: Kalendarz, Historia i Generator Planów
* 6.1. Widok Kalendarza: Widok miesiąca z oznaczonymi dniami treningowymi (budowanie nawyku/streak). Kliknięcie w dzień otwiera historyczne wyniki i analizę AI.
* 6.2. Generator Planów Treningowych: Opcja wygenerowania przez Gemini gotowego podziału treningowego (np. Push/Pull/Legs) dostosowanego do ulubionych ćwiczeń i profilu.

---

## 4. Projekt Interfejsu i Responsywność (RWD / UX)

* Filozofia UX: Mobile-First, Thumb-Friendly (łatwa obsługa jedną ręką na siłowni), domyślny Dark Mode.
* Adaptacyjność RWD:
  * Ekran Mobilny (< 768px): Układ jednokolumnowy, dolny pasek nawigacji z dużymi elementami klikalnymi.
  * Ekran Tablet / Desktop (≥ 768px): Układ wielokolumnowy, zwijane menu boczne, widok podzielony (kalendarz/baza po lewej, szczegóły i wykresy po prawej).
* Kolorystyka: Tło Slate/Zinc (#09090b), zielony akcent Emerald (#10b981) dla głównych akcji, ciemnoszare karty (#18181b) z delikatną ramką.

---

## 5. Specyfikacja Schematów Danych (JSON)

### 5.1. Plik `user_profile.json`
```json
{
  "version": "1.0",
  "updated_at": "2026-10-14T18:30:00Z",
  "profile": {
    "gender": "male",
    "age": 30,
    "height_cm": 180,
    "weight_history": [
      { "date": "2026-10-01", "weight_kg": 82.5 },
      { "date": "2026-10-14", "weight_kg": 81.8 }
    ],
    "experience_level": "intermediate",
    "primary_goal": "hypertrophy"
  },
  "exercise_preferences": {
    "excluded_exercise_ids": ["deadlift", "behind_neck_press"],
    "favorite_exercise_ids": ["bench_press", "pull_up", "incline_dumbbell_press"],
    "custom_exercises": [
      {
        "id": "custom_cable_fly",
        "name": "Rozpiętki na wyciągu dolnym",
        "category": "chest",
        "equipment": "cable"
      }
    ]
  },
  "settings": {
    "rest_timer_defaults": {
      "heavy_compound": 180,
      "moderate_compound": 120,
      "isolation": 60
    }
  }
}

```

Klucz API Gemini jest ustawieniem wyłącznie lokalnym. Nie jest częścią `user_profile.json`, kopii zapasowej ani danych synchronizowanych z Google Drive.

### 5.2. Plik `workouts_history.json`

```json
{
  "version": "1.0",
  "workouts": [
    {
      "id": "w_20261014_1830",
      "start_time": "2026-10-14T18:30:00Z",
      "end_time": "2026-10-14T19:35:00Z",
      "duration_minutes": 65,
      "status": "completed",
      "plan_name": "Push A",
      "readiness_energy_score": 4,
      "exercises": [
        {
          "exercise_id": "bench_press",
          "exercise_name": "Wyciskanie sztangi na ławce poziomej",
          "sets": [
            { "set_number": 1, "weight_kg": 80.0, "reps": 8, "rir": 2 },
            { "set_number": 2, "weight_kg": 80.0, "reps": 8, "rir": 1 },
            { "set_number": 3, "weight_kg": 80.0, "reps": 6, "rir": 0 }
          ],
          "note_during_workout": "Lekki ból w prawym nadgarstku przy 3. serii"
        }
      ],
      "post_workout_user_notes": "Zadyszka na bieżni. Nadgarstek bolał lekko przy wyciskaniu.",
      "ai_analysis": {
        "generated_at": "2026-10-14T20:10:00Z",
        "feedback_text": "Dobra objętość! Ze względu na ból nadgarstka, na następnym treningu zamień sztangę na hantle z chwytem neutralnym. Zmniejsz prędkość na bieżni o 0.5 km/h."
      }
    }
  ]
}

```

---

## 6. Konstrukcja Promptu dla Gemini API

Po sfinalizowaniu treningu aplikacja wysyła do skonfigurowanego modelu Gemini zapytanie skonstruowane według poniższego wzorca:

```text
[PROMPT SYSTEMOWY]
Jesteś doświadczonym Trenerem Personalnym. Przeanalizuj wykonany trening użytkownika i podaj zwięzły, konkretny feedback oraz zalecenia na kolejny trening. Odpowiadaj krótko, w punktach (maksymalnie 150 słów).

[KONTEKST UŻYTKOWNIKA]
- Płeć: {gender} | Wiek: {age} | Wzrost: {height_cm}cm | Waga: {current_weight_kg}kg
- Cel: {primary_goal} | Poziom: {experience_level}
- Wykluczone ćwiczenia: {excluded_exercise_ids}

[OSTATNIE TRENINGI (HISTORIA 3 SESJI)]
{last_3_workout_summaries}

[DZISIEJSZY TRENING]
Nazwa: {plan_name} | Czas: {duration_minutes} min
Poziom energii: {readiness_energy_score}/5
Wykonane ćwiczenia i serie:
{exercises_and_sets_detail}

[UWAGI UŻYTKOWNIKA PO TRENINGU]
"{post_workout_user_notes}"

[ZADANIE]
1. Oceń progresję i objętość treningową.
2. Odnieś się do notatek dotyczących bólu, kontuzji lub zadyszki (dostosuj ciężary/ćwiczenia na przyszłość).
3. Podaj konkretne wskazówki do wdrożenia na następnym treningu.

```

---

## 7. Plan Wdrożenia i Wskazówki dla Copilota

1. Faza 1: Szablon UI (Eksport z v0.dev) – Skonfigurowanie projektu React/Next.js z Tailwind CSS i shadcn/ui oraz zaimportowanie widoków.
2. Faza 2: Stan Lokalny i Rejestrator Offline – Zaimplementowanie stanu React (useReducer/Zustand) dla aktywnego treningu, logiki Smart Fill, Screen Wake Lock API oraz stopera przerw.
3. Faza 3: Logowanie i Google Drive – Integracja biblioteki @react-oauth/google i napisanie modułu lib/googleDrive.ts do obsługi AppData API w trybie offline-first.
4. Faza 4: Integracja Gemini API – Stworzenie modułu lib/gemini.ts łączącego formularz końcowy z odpowiedzą AI.