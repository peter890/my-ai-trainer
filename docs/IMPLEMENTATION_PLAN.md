# Plan wdrożenia AI Trainer (Gymini)

Plan opiera się na weryfikacji `docs/TEMPLATE_AUDIT.md` względem aktualnego kodu oraz `docs/PRD.md`. Jest to plan do wznawiania pracy: wymagania mają stałe identyfikatory i pola wyboru, a ukończenie etapu wymaga spełnienia kryteriów akceptacji.

**Postęp na 16.10.2026:** Etapy 0–3 zakończone; etap 4 jest w toku. W etapie 8 ukończono synchronizację, kopie zapasowe i testy integracji, natomiast instalacja/offline PWA oraz jej weryfikacja na przeglądarkach pozostają otwarte.

## Status i reguły kontynuacji

- `[x]` — wykonane i zweryfikowane
- `[ ]` — do wykonania
- `[!]` — wymaga decyzji lub rozwiązania blokady
- Wznawiając pracę, zacznij od pierwszego niezakończonego etapu, sprawdź kryteria akceptacji oraz zaktualizuj statusy po weryfikacji.
- Nie zastępuj istniejących komponentów prezentacyjnych bez potrzeby. Podłączaj je do typowanych danych i logiki aplikacji.
- Zależności etapów są jawne; nie rozpoczynaj integracji wymagającej niedokończonych repozytoriów lub modeli.

## Weryfikacja audytu (stan początkowy)

Wykonano kontrolę najważniejszych twierdzeń audytu na kodzie źródłowym (konfiguracja, manifest, layout, shell, ekran live i tabela serii) oraz porównanie z wymaganiami PRD. To potwierdzenie kluczowych tez, a nie ponowne pełne czytanie wszystkich ok. 3 100 linii.

| Wniosek audytu | Ocena | Uzasadnienie / konsekwencja |
|---|---|---|
| Aplikacja jest prototypem prezentacyjnym, bez persystencji i prawdziwych integracji | Potwierdzony w sprawdzonych punktach | `AppShell` przechowuje stan w `useState`, a start i koniec sesji jedynie zmieniają flagi. `LiveWorkout` importuje `liveWorkoutPlan` i nie odtwarza ani nie zapisuje sesji. Wyszukanie w `app/`, `components/` i `lib/` nie wykazało integracji IndexedDB, Drive ani działającego Gemini. |
| Stoper sesji i przerwy bazuje na `setInterval` | Potwierdzony | `components/trainer/live/live-workout.tsx` zwiększa lokalny licznik co sekundę; należy zastąpić go obliczaniem z timestampów. |
| Manifest istnieje, ale nie ma pełnej obsługi PWA/offline | Potwierdzony z zastrzeżeniem | `app/manifest.ts` deklaruje jedynie ikonę SVG i PNG 180×180; kod aplikacji nie zawiera service workera. Static export nie jest skonfigurowany w `next.config.mjs`. Sam manifest nie zapewnia działania offline. |
| Błędy TypeScript są ignorowane; telemetria i generator v0 są skonfigurowane | Potwierdzony | `next.config.mjs` ustawia `typescript.ignoreBuildErrors`; `app/layout.tsx` dodaje Analytics w produkcji i `generator: 'v0.app'`. |
| Koniec treningu nie zapisuje sesji, a przycisk końca działa bez potwierdzenia | Potwierdzony | `finishWorkout` w `components/trainer/app-shell.tsx` tylko przełącza widoki/flagi; `components/trainer/live/live-workout.tsx` wywołuje `onFinish` na ostatnim ćwiczeniu. |
| Tabela serii nie obsługuje korekty już zalogowanych serii, a edycja pól liczbowych ma problem z pustą wartością | Potwierdzony | `components/trainer/live/sets-table.tsx` tylko wyświetla zalogowane serie; `Number(value) || 0` zamienia pusty input na zero. |
| Część wymagań UX, profilu, wykresów, generatora i synchronizacji nie istnieje lub jest uproszczona | Zgodny z kontrolą; wymaga pełnego przeglądu przy implementacji | Zgodne z bieżącym kontraktem PRD i danymi w `lib/trainer-data.ts`; zachować istniejący UI i realizować brakujące zachowania etapami. |
| `force-static` jest wymagane dla `app/manifest.ts` przy static export | Potwierdzony | `next build` przerwał eksport z błędem dla `/manifest.webmanifest`; po dodaniu `export const dynamic = 'force-static'` statyczny build przeszedł. |
| PRD był poprawnym dokumentem wymagań gotowym do użycia jako źródło prawdy | Problem wykryty i naprawiony w E0.2 | Usunięto instrukcję kopiowania, zewnętrzne ogrodzenie i końcowe osierocone ogrodzenie; treść specyfikacji została zachowana i uzgodniono model Gemini. |

### Decyzje do potwierdzenia przed odpowiednim etapem

- `[x] D-01` Gemini Nano pozostaje opcjonalne i odłożone do czasu stabilnej obsługi w przeglądarkach docelowych; rdzeń będzie działał bez niego.
- `[x] D-02` Odpowiedź Gemini będzie tekstem zwięzłym (do 150 słów), zgodnie z PRD; UI zostanie dostosowane do tego kontraktu zamiast wymuszać sekcje.
- `[x] D-03` Na start zakładamy hosting w katalogu głównym domeny. Obsługa podścieżki zostanie dodana dopiero, jeśli będzie wymagana przez wdrożenie.
- `[x] D-04` OAuth użyje klienta skonfigurowanego po stronie Google; token pozostanie w pamięci, a brak konfiguracji klienta będzie jawnie komunikowany. Dane logowania nie będą potrzebne do funkcji lokalnych.
- `[x] D-05` Klucz Gemini przechowujemy wyłącznie lokalnie, poza synchronizowanymi danymi i logami; model `gemini-2.5-flash` jest definiowany tylko w `lib/config.ts` (zgodnie z aktualną listą modeli Gemini API).
- `[x] D-06` Zachowujemy pauzę treningu; aktywny czas będzie liczony z timestampów z uwzględnieniem skumulowanych pauz.

## Etapy realizacji

### Etap 0 — Uporządkowanie kontraktu i punktu startowego

Status etapu: **[x] zakończony**

- `[x] E0.1` Porównać kluczowe ryzyka audytu z aktualnym kodem i oznaczyć potwierdzone rozbieżności.
- `[x] E0.2` Oczyścić `docs/PRD.md` z instrukcji wprowadzającej i zewnętrznych ogrodzeń kodu, zachowując treść specyfikacji.
- `[x] E0.3` Rozstrzygnąć niejednoznaczności D-01–D-06 lub odnotować świadomie odłożone decyzje.
- `[x] E0.4` Przyjąć domyślnie aktualne wersje Chrome, Firefox i Safari oraz wdrożenie w katalogu głównym; konfigurację OAuth i instalowalność PWA zweryfikować na etapie integracji.

**Kryterium akceptacji:** PRD jest poprawnym Markdown, decyzje blokujące lokalny rdzeń są rozstrzygnięte, a pozostałe założenia zapisane wyżej.

### Etap 1 — Fundament projektu, typy i jakość

Zależność: etap 0 (E0.2–E0.4).
Status etapu: **[x] zakończony**

- `[x] E1.1` Zmienić nazwę paczki na `ai-trainer`, usunąć nieużywane paczki `cn` i Analytics oraz przenieść `shadcn` do `devDependencies`.
- `[x] E1.2` Usunąć `typescript.ignoreBuildErrors`; typecheck i build z kontrolą typów przechodzą.
- `[x] E1.3` Dodać skrypty typecheck, lint i test oraz konfigurację ESLint i Vitest.
- `[x] E1.4` Usunąć Analytics i `generator: 'v0.app'`, zgodnie z założeniem prywatności.
- `[x] E1.5` Skonfigurować i zweryfikować Next.js static export; dodać `force-static` dla manifestu wymaganego przez Next.js 16.
- `[x] E1.6` Dodać `lib/config.ts` z jedyną definicją `GEMINI_MODEL`; model nie jest wpisywany w komponentach.

**Kryterium akceptacji:** typecheck, lint, testy i build/eksport przechodzą; build nie ukrywa błędów typów; nie wysyła telemetrii nieprzewidzianej przez PRD.

### Etap 2 — Schematy domenowe i lokalna baza offline-first

Zależność: etap 1.
Status etapu: **w toku — schematy, repozytoria, migracja IndexedDB i testy gotowe; pozostały podłączenie pozostałych widoków i ich stany UI**

- `[x] E2.1` Zdefiniować schematy Zod w `lib/schemas.ts` dla profilu, ćwiczeń, planów, aktywnej/niesfinalizowanej sesji, treningów historycznych i ustawień.
- `[x] E2.2` Uzgodnić wersjonowany model z PRD: identyfikatory i timestampy ISO, status sesji, prawdziwe serie (`weight_kg`, `reps`, `rir`), notatki oraz analizę AI; tonaż wyliczać z serii, a nie utrzymywać jako niezależne źródło prawdy.
- `[x] E2.3a` Przenieść współdzielone formatery i metadane typów treningu do `lib/format.ts` i oprzeć typ treningu na schemacie domenowym.
- `[x] E2.3b` Przepiąć widoki z fixture’ów w `lib/trainer-data.ts` na repozytoria i usunąć dane przykładowe z przepływów produkcyjnych.
- `[x] E2.4` Utworzyć IndexedDB i typowane repozytoria dla profilu, ćwiczeń, planów i wielu treningów; dodać walidację Zod na granicach odczytu/zapisu.
- `[x] E2.5` Dodać testy jednostkowe schematów i wszystkich operacji repozytoriów; testować także trwałość po ponownym otwarciu bazy i odrzucanie uszkodzonych danych.
- `[x] E2.6a` Dodać w katalogu ćwiczeń stan ładowania, jawny komunikat błędu i ponowienie bez cichego fallbacku.
- `[x] E2.6b` Ujednolicić ładowanie/błędy/puste stany dla pozostałych widoków po podłączeniu ich do repozytoriów.

**Kryterium akceptacji:** po odświeżeniu i bez sieci dane pozostają dostępne; niepoprawne dane są jawnie odrzucane/zgłaszane; migracje i repozytoria są testowane.

### Etap 3 — Profil, ustawienia i katalog ćwiczeń

Zależność: etap 2.
Status etapu: **[x] zakończony**

- `[x] E3.1` Podłączyć formularze profilu do repozytorium: płeć, wiek, wzrost, poziom, cel, urazy/uwagi oraz historia pomiarów wagi.
- `[x] E3.2` Zapisywać klucz Gemini wyłącznie lokalnie, umożliwić jego usunięcie i testować połączenie bezpośrednio z API (klucz przesyłany nagłówkiem; brak logowania). Test automatyczny mockuje odpowiedź API; test na prawdziwym koncie wymaga klucza użytkownika.
- `[x] E3.3a` Podłączyć katalog wbudowany i dodawanie ćwiczeń własnych do IndexedDB; utrwalać preferencje ulubionych i wykluczonych.
- `[x] E3.3b` Dodać osobny stan aktywności ćwiczenia i dopiąć go do filtrowania oraz generowania planów. Migracja IndexedDB ustawia wcześniejsze ćwiczenia jako aktywne.
- `[x] E3.4a` Ujednolicić listę sprzętu zgodnie z PRD i zapisać `rest_type` dla nowych ćwiczeń.
- `[x] E3.4b` Dodać filtr sprzętu, edycję stałej notatki technicznej i pełne dane do zamiany ćwiczeń. Kandydaci do zamiany mają kompletną metadaną ćwiczenia i są ograniczeni do aktywnych, niewykluczonych ćwiczeń tej samej partii.
- `[x] E3.5a` Dodać testy walidacji i trwałości katalogu ćwiczeń oraz preferencji.
- `[x] E3.5b` Dodać walidację i testy zapisu/edycji profilu oraz wagi.

**Kryterium akceptacji:** profil i katalog przetrwają przeładowanie/offline, wartości UI odpowiadają typowanym danym, a preferencje wpływają na propozycje planu i ćwiczeń.

### Etap 4 — Plany i uruchamianie sesji

Zależność: etapy 2–3.

- `[x] E4.1` Utrwalać edytowalne plany treningowe i umożliwić rozpoczęcie sesji z wybranego planu. Generator zapisuje treningi do IndexedDB, zapisane plany można edytować, a pulpit pozwala wybrać konkretny plan do startu.
- `[x] E4.2` Zastąpić `liveWorkoutPlan` fixture’em pobieranym z planu/bazy i obsłużyć brak planu oraz pusty katalog; wznowienie wymaga jednoznacznego planu, nie tworzy ćwiczeń-placeholderów, a nieodtwarzalną sesję można zakończyć z zachowaniem zapisanych serii.
- `[x] E4.3` Uzupełniać ciężar i powtórzenia ostatnią serią bieżącej sesji lub najnowszym wykonaniem historycznym; wznowienie odtwarza zapisane serie.
- `[x] E4.4` Ustalać przerwę na podstawie `rest_type` i zapisanych ustawień profilu; umożliwiać pominięcie, korektę czasu podczas treningu i edycję domyślnych przerw w profilu.
- `[x] E4.5` Dodać i odtwarzać notatkę podczas ćwiczenia oraz umożliwić edycję/usuwanie zalogowanej serii; pola robocze pozwalają na pusty wpis, a walidacja obsługuje dziesiętne ciężary i całkowite powtórzenia.
- `[x] E4.6` Zamiana on-the-fly wybiera aktywną, niewykluczoną alternatywę tej samej partii, zmienia tylko ćwiczenie bez zapisanych serii i ładuje jego własną historię oraz sugestię Smart Fill.

**Kryterium akceptacji:** wszystkie zmiany ćwiczeń i serii aktualizują jedną sesję, są walidowane i zachowują notatki oraz wartości; brak fikcyjnych alternatyw.

### Etap 5 — Trening live odporny na przerwania

Zależność: etapy 2 i 4.

- `[x] E5.1` Utrwalać lokalny snapshot aktywnej sesji w osobnym store IndexedDB (bez synchronizacji snapshotu do Drive); po odświeżeniu odtwarzać wybrane ćwiczenie, serie, draft, pauzę oraz przerwę.
- `[x] E5.2` Wyliczać czas treningu z czasu bazowego i znacznika wznowienia, a przerwę z terminu jej zakończenia; interwał służy wyłącznie do odświeżania widoku. Po powrocie z uśpienia upływ korygują timestampy.
- `[x] E5.3` Obsłużyć start, pauzę, wznowienie i minimalizację; zakończenie treningu wymaga potwierdzenia, a przejście do kolejnego ćwiczenia go nie kończy.
- `[x] E5.4` Dodać Screen Wake Lock z obsługą braku API, widoczności karty i ponownego uzyskania blokady po powrocie; brak wsparcia nie blokuje treningu i jest komunikowany w UI.
- `[x] E5.5` Dodać opcjonalną, domyślnie włączoną wibrację po zakończeniu przerwy, możliwość wyłączenia jej w profilu oraz bezpieczną obsługę braku/odmowy API.
- `[x] E5.6` Testować wyliczanie czasu treningu/przerwy na granicach pauzy i wznowienia oraz jednokrotne wyzwalanie sygnału po upływie przerwy.

**Kryterium akceptacji:** aktywna sesja nie ginie po przeładowaniu; mierzone czasy wynikają z timestampów i pozostają prawidłowe po uśpieniu karty.

### Etap 6 — Odłożona finalizacja i analiza Gemini

Zależność: etapy 2, 3 i 5.

- `[x] E6.1` Zapisywać zakończoną sesję lokalnie jako oczekującą na finalizację i obsłużyć kolejkę wielu treningów oczekujących na pulpicie.
- `[x] E6.2` Zapisywać ankietę energii 1–5 i uwagi użytkownika z walidacją, automatycznym zapisem i możliwością późniejszego wznowienia; pozwolić zapisać trening bez analizy AI.
- `[x] E6.3` Utworzyć moduł Gemini używający modelu z `lib/config.ts`; wysyłać tylko wymagany kontekst i wyłącznie po jasnej informacji/zgodzie użytkownika.
- `[x] E6.4` Obsłużyć brak sieci, błędny/nieobecny klucz, limity i błędy API bez utraty finalizacji; udostępnić ponowienie.
- `[x] E6.5` Ujednolicić kontrakt odpowiedzi z decyzją D-02; walidować dane odpowiedzi Zod i wyświetlać w istniejącej karcie.
- `[x] E6.6` Dodać testy promptu, sanitacji kontekstu, walidacji wyniku i przepływu błędów; nigdy nie logować klucza.

**Kryterium akceptacji:** sesję da się sfinalizować offline; analiza nie jest wymagana do zapisu; odpowiedź AI jest przypisana do treningu i odporna na błędy sieci.

### Etap 7 — Historia, postępy i generator planów

Zależność: etapy 2–6.

- `[x] E7.1` Podłączyć kalendarz, listę i szczegóły do rzeczywistych treningów; obsłużyć wiele treningów jednego dnia i daty z rokiem.
- `[x] E7.2` Wyliczać streak, tygodniowe statystyki i tonaż z historii, bez wartości wpisanych na sztywno.
- `[ ] E7.3` Podłączyć wykres wagi i tonażu do pomiarów oraz sesji; dodać wykres progresji siłowej z jasno opisaną metodą obliczeń.
- `[ ] E7.4` Zastąpić lokalny generator planów prawdziwą generacją Gemini, zapisywać plan, filtrować według profilu/ulubionych/wykluczonych i umożliwić jego start.
- `[ ] E7.5` Dodać testy agregacji, granic tygodnia/miesiąca/roku, wielu sesji na dzień i obliczeń progresu.

**Kryterium akceptacji:** wszystkie statystyki i wykresy są reprodukowalne z lokalnych danych; historia działa w trybie offline.

### Etap 8 — PWA i kopia zapasowa / Google Drive

Zależność: etapy 1–3; synchronizację uruchomić dopiero po stabilizacji schematów i repozytoriów.

- `[ ] E8.1` Dodać poprawne ikony instalacyjne PNG 192×192 i 512×512, zweryfikować manifest i metadane PWA.
- `[ ] E8.2` Dodać service worker z cache zasobów aplikacji i strategią offline; nie cache’ować klucza ani wrażliwych odpowiedzi.
- `[ ] E8.3` Przetestować instalację, start offline i aktualizację service workera na docelowych przeglądarkach; potwierdzić zachowanie hostingu z D-03.
- `[x] E8.4` Zaimplementować Google OAuth i Drive AppData bez własnego backendu. Krótkotrwały access token jest przechowywany w localStorage do wygaśnięcia; po wygaśnięciu wymagane jest ponowne połączenie.
- `[x] E8.5` Synchronizować wersjonowane dane z kolejką zmian offline, wykrywaniem konfliktów i jawnymi stanami błędu/ponowienia. Synchronizacja jest uruchamiana ręcznie z profilu; błędy nie czyszczą kolejki, a konflikt nie nadpisuje repliki.
- `[x] E8.6` Dodać eksport/import kopii zapasowej oraz usuwanie danych; walidować każdy import schematem Zod. Import scala dane po ID i zachowuje nowszy rekord według `updated_at` (remisy zachowują dane lokalne); klucz Gemini nie jest eksportowany.
- `[x] E8.7` Usunąć z UI obietnice niemożliwe/nieudokumentowane przez API, m.in. dokładne wykorzystanie miejsca Drive i warunek „tylko przez Wi-Fi”. Przegląd kart profilu potwierdził, że UI nie deklaruje tych funkcji.
- `[x] E8.8` Testować OAuth, uprawnienia, brak sieci, konflikt, wylogowanie/wygaśnięcie tokenu, eksport/import i ochronę klucza.

**Kryterium akceptacji:** podstawowe funkcje działają bez logowania i połączenia; Drive jest repliką, nie jedynym źródłem danych; konflikty i błędy są widoczne, a klucz Gemini nigdy nie trafia do synchronizacji.

### Etap 9 — Dostępność, zgodność i wydanie

Zależność: etapy 1–8.

- `[ ] E9.1` Zweryfikować dostępność klawiaturą i czytnikiem ekranu, w tym semantykę siatki kalendarza i komunikaty walidacji.
- `[ ] E9.2` Dopasować kolory kart/akcentu i cele dotykowe do zatwierdzonych wymagań UX; sprawdzić wszystkie kluczowe widoki mobilne i desktopowe.
- `[ ] E9.3` Dodać testy integracyjne krytycznych ścieżek oraz testy przeglądarkowe: profil → plan → trening offline → finalizacja → historia/synchronizacja.
- `[ ] E9.4` Wykonać końcowy typecheck, lint, testy i production static export; sprawdzić PWA na urządzeniach docelowych.
- `[ ] E9.5` Usunąć pozostałe fixture’y z przepływów produkcyjnych i sprawdzić, że błędy/empty states są jawne.

**Kryterium akceptacji:** krytyczne ścieżki przechodzą testy, build statyczny jest wdrażalny, a działanie offline i prywatność są zweryfikowane na docelowych przeglądarkach.

## Proponowana kolejność wdrożenia

`E0 → E1 → E2 → E3 → E4 → E5 → E6 → E7 → E8 → E9`

Można równolegle dopracowywać widoki prezentacyjne, ale nie należy uruchamiać synchronizacji Drive przed stabilizacją wersjonowanych schematów i lokalnych repozytoriów. Najpierw należy dostarczyć wartość offline-first; OAuth/Drive i AI nie mogą blokować zapisu ani odczytu lokalnego.
