# ForCoaches

Platforma sporto klubų asmeniniams treneriams: rezervacijos, progreso sekimas
(svoris, apimtys), treniruočių programos ir mitybos planai su kalorijų
žymėjimusi.

Stack: **Vite + React 18 + TypeScript + Tailwind + Supabase**.

## Paleidimas

```bash
npm install
```

Nukopijuokite `.env.example` į `.env` ir įrašykite Supabase raktus:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev
```

Kitos komandos: `npm run build`, `npm run typecheck`, `npm run lint`.

## Duomenų bazė

Schema — `supabase/migrations/20260816120000_init.sql`. Ją galima paleisti
Supabase Dashboard → SQL Editor, arba per CLI:

```bash
npx supabase db push
```

## Rolės

| Rolė | Kelias | Ką gali |
|---|---|---|
| `coach` (treneris) | `/treneris` | Sportininkai, darbo laikas, programos, mitybos planai |
| `athlete` (sportininkas) | `/sportininkas` | Rezervacija, savo matavimai, programa, kalorijų žymėjimasis |

Sportininkas registruojasi tik su **pakvietimo kodu**, kurį jam duoda treneris —
viešos trenerių paieškos nėra. Kodas tikrinamas per `check_invite_code()`, o
paskyra prie trenerio prirašoma per `claim_athlete_invite()`; abi funkcijos yra
`SECURITY DEFINER`, todėl anoniminės prieigos prie lentelių neprireikia.

## Struktūra

```
src/
  components/ui/     bendri UI elementai (Radix + Tailwind)
  components/        AppShell, ProtectedRoute, AuthLayout, Reveal, ThemeToggle…
  contexts/          AuthContext (sesija, rolė), ThemeContext (šviesi/tamsi)
  lib/               supabase klientas, motion parametrai, duomenų užklausos
  pages/             Landing, Login, SignUp
  pages/coach/       trenerio sritis
  pages/athlete/     sportininko sritis
  types/             domeno tipai
supabase/migrations/ schema ir RLS
```

## Animacijos

Visos trukmės ir kreivės — dviejose vietose, kurias reikia keisti kartu:
`src/index.css` (`--ease-*`, `--dur-*`) ir `src/lib/motion.ts` (Framer Motion
CSS kintamųjų neskaito).

Taisyklės, kurių laikomasi:

- animuojami tik `transform` ir `opacity` (GPU, be perskaičiavimo);
- išėjimas ~75 % nuo atsiradimo trukmės;
- `MotionConfig reducedMotion="user"` + CSS `prefers-reduced-motion` blokas —
  sistemos nustatymas išjungia judesį visoje sąsajoje.

## Rezervacijos

Modelis paimtas iš Tutorly: `available_time_slots` su `is_booked`, treneris
skelbia konkrečius datuotus laikus (galima pasikartojančius per savaitės dienas
iki pasirinktos datos).

Skirtumas nuo Tutorly — sportininkas rezervuoja ne visą paskelbtą intervalą, o
treniruotės ilgio ruožą iš jo (`bookableWindows`). Todėl 09:00–12:00 duoda tris
valandinius langus, o ne vieną trijų valandų. Būtent dėl to reikia perkeltos
Tutorly logikos:

- **`removeBookedRangeKeepRemainder`** — patvirtinus 10:00–11:00 iš 09:00–12:00
  lango, jis perkerpamas į 09:00–10:00 ir 11:00–12:00.
- **`mergeAdjacentSlots`** — sujungia besiliečiančius laisvus langus ir išmeta
  nulinio ilgio gabalėlius, kad jie nesikauptų.
- **`restoreSlotRange`** — atšaukus patvirtintą treniruotę laikas grąžinamas ir
  sujungiamas.

Iš Tutorly perimta ir svarbi smulkmena: Postgres `time` per PostgREST grįžta kaip
`HH:MM:SS`, o formos duoda `HH:MM`. Lyginant kaip eilutes tai tyliai nesutampa,
todėl viskas verčiama į minutes (`src/lib/time.ts`).

## Pratimų katalogas

`src/data/exercises.ts` — apie 110 pratimų lietuvių kalba. Taksonomija (raumenų
grupės, inventorius, mechanika, lygis) paimta iš viešo
[free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain,
873 pratimai), bet pavadinimai nėra mašininis vertimas: atrinkti dažniausiai
naudojami ir pavadinti taip, kaip vadinami Lietuvos salėse. Treneris gali įrašyti
ir savo pratimą.

## Finansai

Modelis iš Tutorly `financial_records`: viena lentelė abiem kryptims —
`credit` (gauta) ir `debit` (priskaičiuota) — o balansas skaičiuojamas iš
įrašų, ne laikomas atskirai. Todėl jis niekada neišsiderina su istorija.

Pažymėjus treniruotę „Įvyko“, priskaičiavimas sukuriamas automatiškai.
Unikalus indeksas ant `booking_id` neleidžia to padaryti du kartus, kad ir
kiek kartų mygtukas būtų paspaustas.

## Pranešimai

`notifications` lentelė su realtime — varpelis atsinaujina be perkrovimo.
Siunčiama: naujas prašymas treneriui, patvirtinimas ir atmetimas su priežastimi
sportininkui, atšaukimas treneriui.

El. pašto pranešimų dar nėra — tam reikia savo SMTP (pvz. Resend); Supabase
įmontuotas turi kelių laiškų per valandą ribą.

## Migracijos

Paleisti iš eilės Supabase SQL Editor:

| # | Failas | Ką prideda |
|---|---|---|
| 1 | `20260816120000_init.sql` | Bazinė schema, rolės, RLS |
| 2 | `20260816180000_available_time_slots.sql` | Laisvi laikai |
| 3 | `20260817120000_athlete_details.sql` | Sportininko kaina ir vieta |
| 4 | `20260817140000_meal_media.sql` | Patiekalų nuotraukos, ingredientai, gramai |
| 5 | `20260817160000_finances.sql` | Finansai |
| 6 | `20260817180000_notifications.sql` | Pranešimai su realtime |
| 7 | `20260817200000_exercise_logs.sql` | Atliktų serijų istorija |
| 8 | `20260817220000_reminders.sql` | Priminimų žyma |

## Priminimai el. paštu

`supabase/functions/send-reminders` siunčia laišką dieną prieš treniruotę.
Reikia:

1. Resend paskyros ir patvirtinto domeno
2. Secrets: `RESEND_API_KEY`, `REMINDER_FROM`
3. Įdiegimo: `npx supabase functions deploy send-reminders`
4. Cron, kuris ją kviečia kas valandą

Išsiuntimas žymimas `bookings.reminder_sent_at`, todėl tas pats laiškas
neišeina du kartus.

## Ką dar reikia padaryti

Veikia visi skyriai:

- **Sportininkai** — kūrimas su pakvietimo kodu, sąrašas, kortelė su matavimais,
  šalinimas su patvirtinimu.
- **Rezervacijos** — kalendorius, laisvi laikai su pasikartojimu, prašymai,
  patvirtinimas su lango perkirpimu, atmetimas su priežastimi, atšaukimas.
- **Progresas** — 7 rodikliai, grafikas, pokytis, istorijos lentelė.
- **Programos** — dienos, pratimai iš katalogo, šablonai ir jų priskyrimas.
- **Mityba** — planai su normomis, valgiaraštis, kalorijų žymėjimasis su dienos
  suvestine.
- **Nustatymai** — anketa, kaina, trukmė, atšaukimo terminas, slaptažodis.

Liko prieš pardavimą:

1. **El. pašto pranešimai ir priminimai** — reikia savo SMTP (Resend) ir
   suplanuotos funkcijos priminimams prieš treniruotę.
2. **Confirm email atgal į ĮJUNGTA** — dabar išjungtas testavimui.
3. **Atliktų serijų istorija** — dabar žymėjimasis gyvena tik naršyklėje.
4. **Sportininko finansų vaizdas** — jis savo balanso dar nemato.
5. **Domenas, SEO, privatumo politika, sutikimo juosta.**
6. **UI stilius** — laukiama krypties.
