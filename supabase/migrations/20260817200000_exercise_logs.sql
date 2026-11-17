-- Atliktos serijos. Iki šiol žymėjimasis gyveno tik naršyklėje ir dingdavo
-- perkrovus puslapį — istorijos nebuvo, todėl nesimatė ir progreso pratime.

create table public.exercise_logs (
  id                  uuid primary key default gen_random_uuid(),
  athlete_id          uuid not null references public.athlete_profiles(id) on delete cascade,
  program_exercise_id uuid not null references public.program_exercises(id) on delete cascade,
  performed_on        date not null default current_date,
  set_number          smallint not null check (set_number between 1 and 50),
  reps                smallint,
  weight_kg           numeric(6,2),
  created_at          timestamptz not null default now()
);

create index exercise_logs_athlete_idx
  on public.exercise_logs(athlete_id, performed_on desc);
create index exercise_logs_exercise_idx
  on public.exercise_logs(program_exercise_id, performed_on desc);

-- Ta pati serija tą pačią dieną yra vienas įrašas: paspaudus dar kartą jis
-- atnaujinamas arba trinamas, o ne dubliuojamas.
create unique index exercise_logs_unique_set_idx
  on public.exercise_logs(athlete_id, program_exercise_id, performed_on, set_number);

alter table public.exercise_logs enable row level security;

-- Žymisi sportininkas, treneris mato.
create policy exercise_logs_select on public.exercise_logs for select to authenticated
  using (public.is_my_athlete(athlete_id) or public.owns_athlete(athlete_id));

create policy exercise_logs_write on public.exercise_logs for all to authenticated
  using (public.is_my_athlete(athlete_id))
  with check (public.is_my_athlete(athlete_id));
