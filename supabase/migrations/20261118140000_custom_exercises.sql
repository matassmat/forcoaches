-- Trenerio sukurti pratimai: savas pavadinimas, raumenų grupė, aprašymas
-- ir nuoroda į vaizdo įrašą (YouTube). Juos mato pats treneris ir jo
-- sportininkai, programoje jie rodomi kaip ir bibliotekos pratimai.

create table if not exists public.custom_exercises (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.users(id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 2 and 120),
  muscle       text not null default 'fullbody',
  equipment    text not null default 'other',
  video_url    text check (video_url is null or video_url ~* '^https://'),
  image_url    text check (image_url is null or image_url ~* '^https://'),
  instructions text check (instructions is null or char_length(instructions) <= 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (coach_id, name)
);

create index if not exists custom_exercises_coach_idx on public.custom_exercises(coach_id);

alter table public.custom_exercises enable row level security;

drop policy if exists custom_exercises_select on public.custom_exercises;
create policy custom_exercises_select on public.custom_exercises for select to authenticated
  using (coach_id = auth.uid() or public.my_coach_is(coach_id));

drop policy if exists custom_exercises_write on public.custom_exercises;
create policy custom_exercises_write on public.custom_exercises for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop trigger if exists custom_exercises_touch on public.custom_exercises;
create trigger custom_exercises_touch before update on public.custom_exercises
  for each row execute function public.touch_updated_at();

drop trigger if exists rate_custom_exercises on public.custom_exercises;
create trigger rate_custom_exercises before insert on public.custom_exercises
  for each row execute function public.enforce_insert_rate('coach_id', '100', '1 hour');
