-- Finansai. Modelis iš Tutorly `financial_records`:
-- viena lentelė abiem kryptims, o balansas skaičiuojamas iš įrašų.
--   credit — treneris gavo pinigus
--   debit  — sportininkui priskaičiuota už treniruotę
-- Balansas = credit − debit. Neigiamas reiškia skolą.

create type fin_type as enum ('credit', 'debit');
create type fin_status as enum ('paid', 'pending');

create table public.financial_records (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.users(id) on delete cascade,
  athlete_id  uuid not null references public.athlete_profiles(id) on delete cascade,
  /** Iš kurios treniruotės atsirado įrašas, jei jis sukurtas automatiškai. */
  booking_id  uuid references public.bookings(id) on delete set null,
  type        fin_type not null,
  status      fin_status not null default 'paid',
  amount      numeric(10,2) not null check (amount > 0),
  description text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

create index financial_records_coach_idx on public.financial_records(coach_id, date desc);
create index financial_records_athlete_idx on public.financial_records(athlete_id);

-- Ta pati treniruotė neturi būti apmokestinta du kartus, kad ir kiek kartų
-- treneris paspaustų „Įvyko“.
create unique index financial_records_booking_debit_idx
  on public.financial_records(booking_id)
  where booking_id is not null and type = 'debit';

alter table public.financial_records enable row level security;

-- Treneris valdo; sportininkas mato tik savo įrašus ir nieko nekeičia.
create policy fin_select on public.financial_records for select to authenticated
  using (coach_id = auth.uid() or public.is_my_athlete(athlete_id));

create policy fin_insert on public.financial_records for insert to authenticated
  with check (coach_id = auth.uid());

create policy fin_update on public.financial_records for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy fin_delete on public.financial_records for delete to authenticated
  using (coach_id = auth.uid());
