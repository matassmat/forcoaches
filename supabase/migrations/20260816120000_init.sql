-- ForCoaches — pradinė schema.
--
-- Dvi rolės: treneris (coach) ir sportininkas (athlete). Sportininkas visada
-- priklauso vienam treneriui; ryšys užmezgamas per pakvietimo kodą, todėl
-- nereikia jokios viešos trenerių paieškos.
--
-- RLS principas: treneris mato tik savo sportininkų duomenis, sportininkas —
-- tik savo. Pagalbinės funkcijos yra SECURITY DEFINER, kad politikų viduje
-- daromos užklausos pačios neitų per RLS ir nesusidarytų ciklų.

create extension if not exists "pgcrypto";

-- ── Tipai ─────────────────────────────────────────────────────────────

create type user_role as enum ('coach', 'athlete');
create type athlete_status as enum ('invited', 'active', 'inactive');
create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- ── updated_at ────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Lentelės ──────────────────────────────────────────────────────────

create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  first_name  text,
  last_name   text,
  role        user_role not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.coach_profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references public.users(id) on delete cascade,
  club_name                 text,
  bio                       text,
  default_session_price     numeric(8,2) not null default 0,
  default_session_minutes   integer not null default 60,
  cancellation_hours_before integer not null default 24,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- 6 simbolių kodas be panašiai atrodančių ženklų (0/O, 1/I), nes jį dažnai
-- perskaito garsiai arba perrašo ranka.
create or replace function public.gen_invite_code()
returns text language plpgsql as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
begin
  loop
    candidate := '';
    for _ in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.athlete_profiles where invite_code = candidate);
  end loop;
  return candidate;
end;
$$;

create table public.athlete_profiles (
  id          uuid primary key default gen_random_uuid(),
  -- Užpildomas tik tada, kai sportininkas iš tikrųjų susikuria paskyrą.
  user_id     uuid unique references public.users(id) on delete set null,
  coach_id    uuid not null references public.users(id) on delete cascade,
  invite_code text not null unique,
  invite_used boolean not null default false,
  first_name  text,
  last_name   text,
  email       text,
  phone       text,
  birth_date  date,
  goal        text,
  status      athlete_status not null default 'invited',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.athlete_profiles
  alter column invite_code set default public.gen_invite_code();

create index athlete_profiles_coach_idx on public.athlete_profiles(coach_id);

create table public.availability_slots (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create index availability_slots_coach_idx on public.availability_slots(coach_id);

create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.users(id) on delete cascade,
  athlete_id   uuid not null references public.athlete_profiles(id) on delete cascade,
  session_date date not null,
  start_time   time not null,
  end_time     time not null,
  status       booking_status not null default 'pending',
  location     text,
  price        numeric(8,2),
  notes        text,
  cancelled_by user_role,
  cancelled_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_time > start_time)
);

create index bookings_coach_date_idx on public.bookings(coach_id, session_date);
create index bookings_athlete_date_idx on public.bookings(athlete_id, session_date);

-- Pigi apsauga nuo dvigubo užsirašymo: du aktyvūs įrašai tam pačiam treneriui,
-- dienai ir pradžios laikui. Persidengiančių, bet skirtingai prasidedančių
-- treniruočių tai nesugaudo — tai patikrinama generuojant laisvus langus.
create unique index bookings_no_overlap_idx
  on public.bookings(coach_id, session_date, start_time)
  where status in ('pending', 'confirmed');

create table public.measurements (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.athlete_profiles(id) on delete cascade,
  measured_on  date not null default current_date,
  weight_kg    numeric(5,2),
  body_fat_pct numeric(4,1),
  chest_cm     numeric(5,1),
  waist_cm     numeric(5,1),
  hips_cm      numeric(5,1),
  thigh_cm     numeric(5,1),
  arm_cm       numeric(5,1),
  notes        text,
  created_at   timestamptz not null default now(),
  unique (athlete_id, measured_on)
);

create index measurements_athlete_idx on public.measurements(athlete_id, measured_on desc);

create table public.programs (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.users(id) on delete cascade,
  -- NULL kartu su is_template = true reiškia dar niekam nepriskirtą šabloną.
  athlete_id  uuid references public.athlete_profiles(id) on delete cascade,
  title       text not null,
  description text,
  is_template boolean not null default false,
  starts_on   date,
  ends_on     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index programs_coach_idx on public.programs(coach_id);
create index programs_athlete_idx on public.programs(athlete_id);

create table public.program_days (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  title      text not null,
  day_order  integer not null default 0
);

create index program_days_program_idx on public.program_days(program_id, day_order);

create table public.program_exercises (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid not null references public.program_days(id) on delete cascade,
  name            text not null,
  sets            integer not null default 3,
  -- Tekstas, nes pasitaiko „8-12“ arba „iki nesėkmės“.
  reps            text not null default '10',
  weight_kg       numeric(6,2),
  rest_seconds    integer,
  notes           text,
  exercise_order  integer not null default 0
);

create index program_exercises_day_idx on public.program_exercises(program_day_id, exercise_order);

create table public.meal_plans (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.users(id) on delete cascade,
  athlete_id      uuid references public.athlete_profiles(id) on delete cascade,
  title           text not null,
  target_kcal     integer,
  target_protein_g integer,
  target_carbs_g  integer,
  target_fat_g    integer,
  notes           text,
  is_template     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index meal_plans_coach_idx on public.meal_plans(coach_id);
create index meal_plans_athlete_idx on public.meal_plans(athlete_id);

create table public.meals (
  id           uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  slot         meal_slot not null,
  title        text not null,
  kcal         integer,
  protein_g    integer,
  carbs_g      integer,
  fat_g        integer,
  recipe       text,
  meal_order   integer not null default 0
);

create index meals_plan_idx on public.meals(meal_plan_id, meal_order);

-- Realiai suvalgytas maistas — kalorijų žymėjimasis.
create table public.food_log_entries (
  id         uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athlete_profiles(id) on delete cascade,
  logged_on  date not null default current_date,
  slot       meal_slot not null,
  title      text not null,
  kcal       integer not null,
  protein_g  integer,
  carbs_g    integer,
  fat_g      integer,
  created_at timestamptz not null default now()
);

create index food_log_athlete_idx on public.food_log_entries(athlete_id, logged_on desc);

-- ── updated_at trigeriai ──────────────────────────────────────────────

create trigger users_touch            before update on public.users            for each row execute function public.touch_updated_at();
create trigger coach_profiles_touch   before update on public.coach_profiles   for each row execute function public.touch_updated_at();
create trigger athlete_profiles_touch before update on public.athlete_profiles for each row execute function public.touch_updated_at();
create trigger bookings_touch         before update on public.bookings         for each row execute function public.touch_updated_at();
create trigger programs_touch         before update on public.programs         for each row execute function public.touch_updated_at();
create trigger meal_plans_touch       before update on public.meal_plans       for each row execute function public.touch_updated_at();

-- ── Naujos paskyros ───────────────────────────────────────────────────

-- Sukuria public.users eilutę iš registracijos metaduomenų. Klientas tą patį
-- daro upsert'u kaip atsarginį variantą, tad funkcija turi būti idempotentiška.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, first_name, last_name, role, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'athlete'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  if (new.raw_user_meta_data->>'role') = 'coach' then
    insert into public.coach_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Pakvietimo kodai ──────────────────────────────────────────────────

-- Registracijos formai. Anoniminė prieiga prie athlete_profiles uždaryta,
-- tad kodo tikrinimas eina per šią funkciją — ji atsako tik apie tą vieną
-- kodą, kurį žmogus įvedė, ir neatskleidžia nei trenerio, nei sąrašo.
create or replace function public.check_invite_code(code text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'valid', exists (select 1 from athlete_profiles ap where ap.invite_code = upper(trim(code))),
    'used',  exists (select 1 from athlete_profiles ap where ap.invite_code = upper(trim(code)) and ap.invite_used)
  );
$$;

grant execute on function public.check_invite_code(text) to anon, authenticated;

-- Pririša ką tik susikūrusią paskyrą prie trenerio paruoštos sportininko
-- kortelės. SECURITY DEFINER, nes prisijungęs žmogus dar nėra tos eilutės
-- savininkas — būtent šis kvietimas jį tokiu padaro.
create or replace function public.claim_athlete_invite(
  code text,
  first_name text,
  last_name text,
  athlete_email text,
  athlete_phone text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  claimed_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Reikalinga sesija';
  end if;

  update athlete_profiles ap
     set user_id     = auth.uid(),
         invite_used = true,
         status      = 'active',
         first_name  = coalesce(nullif(trim(claim_athlete_invite.first_name), ''), ap.first_name),
         last_name   = coalesce(nullif(trim(claim_athlete_invite.last_name), ''), ap.last_name),
         email       = coalesce(nullif(trim(claim_athlete_invite.athlete_email), ''), ap.email),
         phone       = coalesce(nullif(trim(claim_athlete_invite.athlete_phone), ''), ap.phone)
   where ap.invite_code = upper(trim(claim_athlete_invite.code))
     and ap.invite_used = false
  returning ap.id into claimed_id;

  if claimed_id is null then
    raise exception 'Neteisingas arba jau panaudotas pakvietimo kodas';
  end if;

  return claimed_id;
end;
$$;

grant execute on function public.claim_athlete_invite(text, text, text, text, text) to authenticated;

-- ── Pagalbinės funkcijos politikoms ───────────────────────────────────

/** Ar athlete_profiles eilutė priklauso prisijungusiam treneriui. */
create or replace function public.owns_athlete(athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from athlete_profiles ap
     where ap.id = athlete and ap.coach_id = auth.uid()
  );
$$;

/** Ar athlete_profiles eilutė yra paties prisijungusio sportininko. */
create or replace function public.is_my_athlete(athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from athlete_profiles ap
     where ap.id = athlete and ap.user_id = auth.uid()
  );
$$;

/** Ar prisijungęs sportininkas priklauso šiam treneriui. */
create or replace function public.my_coach_is(coach uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from athlete_profiles ap
     where ap.user_id = auth.uid() and ap.coach_id = coach
  );
$$;

-- ── RLS ───────────────────────────────────────────────────────────────

alter table public.users             enable row level security;
alter table public.coach_profiles    enable row level security;
alter table public.athlete_profiles  enable row level security;
alter table public.availability_slots enable row level security;
alter table public.bookings          enable row level security;
alter table public.measurements      enable row level security;
alter table public.programs          enable row level security;
alter table public.program_days      enable row level security;
alter table public.program_exercises enable row level security;
alter table public.meal_plans        enable row level security;
alter table public.meals             enable row level security;
alter table public.food_log_entries  enable row level security;

-- users: sava eilutė + kita ryšio pusė (kad matytųsi vardai).
create policy users_select on public.users for select to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.athlete_profiles ap where ap.user_id = users.id and ap.coach_id = auth.uid())
    or public.my_coach_is(users.id)
  );

create policy users_insert on public.users for insert to authenticated
  with check (id = auth.uid());

create policy users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- coach_profiles: savininkas tvarko, jo sportininkai skaito.
create policy coach_profiles_select on public.coach_profiles for select to authenticated
  using (user_id = auth.uid() or public.my_coach_is(user_id));

create policy coach_profiles_insert on public.coach_profiles for insert to authenticated
  with check (user_id = auth.uid());

create policy coach_profiles_update on public.coach_profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- athlete_profiles: treneris valdo pilnai, sportininkas mato ir taiso savo.
create policy athlete_profiles_select on public.athlete_profiles for select to authenticated
  using (coach_id = auth.uid() or user_id = auth.uid());

create policy athlete_profiles_insert on public.athlete_profiles for insert to authenticated
  with check (coach_id = auth.uid());

create policy athlete_profiles_update on public.athlete_profiles for update to authenticated
  using (coach_id = auth.uid() or user_id = auth.uid())
  with check (coach_id = auth.uid() or user_id = auth.uid());

create policy athlete_profiles_delete on public.athlete_profiles for delete to authenticated
  using (coach_id = auth.uid());

-- availability_slots: treneris rašo, jo sportininkai skaito.
create policy availability_select on public.availability_slots for select to authenticated
  using (coach_id = auth.uid() or public.my_coach_is(coach_id));

create policy availability_write on public.availability_slots for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- bookings: abi pusės mato ir kuria; trynimas paliktas treneriui.
create policy bookings_select on public.bookings for select to authenticated
  using (coach_id = auth.uid() or public.is_my_athlete(athlete_id));

create policy bookings_insert on public.bookings for insert to authenticated
  with check (coach_id = auth.uid() or public.is_my_athlete(athlete_id));

create policy bookings_update on public.bookings for update to authenticated
  using (coach_id = auth.uid() or public.is_my_athlete(athlete_id))
  with check (coach_id = auth.uid() or public.is_my_athlete(athlete_id));

create policy bookings_delete on public.bookings for delete to authenticated
  using (coach_id = auth.uid());

-- measurements: sportininkas veda pats, treneris mato ir gali pataisyti.
create policy measurements_all on public.measurements for all to authenticated
  using (public.is_my_athlete(athlete_id) or public.owns_athlete(athlete_id))
  with check (public.is_my_athlete(athlete_id) or public.owns_athlete(athlete_id));

-- programs: kuria tik treneris, priskirtas sportininkas skaito.
create policy programs_select on public.programs for select to authenticated
  using (coach_id = auth.uid() or public.is_my_athlete(athlete_id));

create policy programs_write on public.programs for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy program_days_select on public.program_days for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id));

create policy program_days_write on public.program_days for all to authenticated
  using (exists (select 1 from public.programs p where p.id = program_id and p.coach_id = auth.uid()))
  with check (exists (select 1 from public.programs p where p.id = program_id and p.coach_id = auth.uid()));

create policy program_exercises_select on public.program_exercises for select to authenticated
  using (exists (select 1 from public.program_days d where d.id = program_day_id));

create policy program_exercises_write on public.program_exercises for all to authenticated
  using (exists (
    select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
     where d.id = program_day_id and p.coach_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
     where d.id = program_day_id and p.coach_id = auth.uid()
  ));

-- meal_plans: ta pati logika kaip programoms.
create policy meal_plans_select on public.meal_plans for select to authenticated
  using (coach_id = auth.uid() or public.is_my_athlete(athlete_id));

create policy meal_plans_write on public.meal_plans for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

create policy meals_select on public.meals for select to authenticated
  using (exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id));

create policy meals_write on public.meals for all to authenticated
  using (exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id and mp.coach_id = auth.uid()))
  with check (exists (select 1 from public.meal_plans mp where mp.id = meal_plan_id and mp.coach_id = auth.uid()));

-- food_log_entries: rašo sportininkas, treneris tik skaito.
create policy food_log_select on public.food_log_entries for select to authenticated
  using (public.is_my_athlete(athlete_id) or public.owns_athlete(athlete_id));

create policy food_log_write on public.food_log_entries for all to authenticated
  using (public.is_my_athlete(athlete_id))
  with check (public.is_my_athlete(athlete_id));
