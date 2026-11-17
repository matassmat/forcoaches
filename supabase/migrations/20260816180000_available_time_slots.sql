-- Laisvi laikai, kaip Tutorly.
--
-- Treneris pats sukuria konkrečius datuotus langus (galima ir pasikartojančius).
-- Sportininkas juos mato ir rezervuoja. Kai rezervacija patvirtinama, langas
-- iškerpamas, o nepanaudoti likučiai grąžinami į laisvus; atmetus — atlaisvinamas
-- ir sujungiamas su gretimais.

create table public.available_time_slots (
  id                 uuid primary key default gen_random_uuid(),
  coach_id           uuid not null references public.users(id) on delete cascade,
  date               date not null,
  start_time         time not null,
  end_time           time not null,
  is_booked          boolean not null default false,
  booked_by_athlete_id uuid references public.athlete_profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  check (end_time > start_time)
);

create index available_time_slots_coach_date_idx
  on public.available_time_slots(coach_id, date);

-- Tas pats langas neturi atsirasti du kartus — Tutorly tai gaudė kode
-- (uniqueRows pagal tutor_id_date_start_end); čia tuo pasirūpina indeksas.
create unique index available_time_slots_unique_idx
  on public.available_time_slots(coach_id, date, start_time, end_time);

alter table public.available_time_slots enable row level security;

-- Treneris valdo savo langus; jo sportininkai juos mato ir gali pažymėti
-- kaip rezervuotus (is_booked) — pačių langų kurti ar trinti negali.
create policy ats_select on public.available_time_slots for select to authenticated
  using (coach_id = auth.uid() or public.my_coach_is(coach_id));

create policy ats_insert on public.available_time_slots for insert to authenticated
  with check (coach_id = auth.uid());

create policy ats_update on public.available_time_slots for update to authenticated
  using (coach_id = auth.uid() or public.my_coach_is(coach_id))
  with check (coach_id = auth.uid() or public.my_coach_is(coach_id));

create policy ats_delete on public.available_time_slots for delete to authenticated
  using (coach_id = auth.uid());
