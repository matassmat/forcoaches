-- Užklausų ribojimas.
--
-- 1. Prisijungimas: ne daugiau 5 nesėkmingų bandymų per 15 min vienam
--    el. paštui iš vieno IP adreso ir 20 per 15 min iš vieno IP iš viso.
--    Pačią slaptažodžio patikrą daro Supabase Auth, todėl ji papildomai
--    ribojama Supabase skydelyje (Authentication -> Rate Limits).
-- 2. Pakvietimo kodo tikrinimas (pasiekiamas be prisijungimo): 10 per 15 min
--    iš vieno IP, kad šešių simbolių kodų nebūtų galima spėlioti.
-- 3. Įrašų kūrimas: kiekvienai lentelei, į kurią rašo naršyklė, nustatyta
--    viršutinė riba per laiko langą vienam savininkui.

-- ── Bandymų žurnalas ──────────────────────────────────────────────────

create table if not exists public.rate_limit_hits (
  id      bigserial primary key,
  bucket  text not null,
  subject text not null,
  hit_at  timestamptz not null default now()
);

create index if not exists rate_limit_hits_lookup_idx
  on public.rate_limit_hits(bucket, subject, hit_at desc);

-- Tiesioginės prieigos nėra niekam, tik per žemiau esančias funkcijas.
alter table public.rate_limit_hits enable row level security;
revoke all on public.rate_limit_hits from anon, authenticated;

-- Kliento IP iš PostgREST antraščių (Supabase jas perduoda).
create or replace function public.request_ip()
returns text language sql stable as $$
  select coalesce(
    nullif(trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), ''),
    nullif(current_setting('request.headers', true)::json ->> 'cf-connecting-ip', ''),
    'unknown'
  );
$$;

-- Užregistruoja bandymą arba meta klaidą, jei riba pasiekta.
create or replace function public.hit_rate_limit(
  p_bucket text, p_subject text, p_max int, p_window interval
)
returns void language plpgsql security definer set search_path = public as $$
declare
  recent int;
begin
  -- Seni įrašai valomi retkarčiais, ne kiekvieną kartą.
  if random() < 0.02 then
    delete from rate_limit_hits where hit_at < now() - interval '1 day';
  end if;

  select count(*) into recent
    from rate_limit_hits
   where bucket = p_bucket and subject = p_subject and hit_at > now() - p_window;

  if recent >= p_max then
    raise exception 'Per daug bandymų. Bandykite vėl po % min.', ceil(extract(epoch from p_window) / 60)
      using errcode = 'P0001', hint = 'rate_limit';
  end if;

  insert into rate_limit_hits(bucket, subject) values (p_bucket, p_subject);
end;
$$;

revoke execute on function public.hit_rate_limit(text, text, int, interval) from public, anon, authenticated;

-- ── Prisijungimas ─────────────────────────────────────────────────────

-- Ar galima bandyti jungtis. Nieko nerašo, tik skaičiuoja nesėkmes.
create or replace function public.login_attempt_status(p_email text)
returns json language plpgsql security definer set search_path = public as $$
declare
  ip text := request_ip();
  v_subject text := lower(trim(p_email)) || '|' || ip;
  by_email int;
  by_ip int;
  oldest timestamptz;
begin
  select count(*), min(hit_at) into by_email, oldest
    from rate_limit_hits
   where bucket = 'login_fail' and subject = v_subject
     and hit_at > now() - interval '15 minutes';

  select count(*) into by_ip
    from rate_limit_hits
   where bucket = 'login_fail_ip' and rate_limit_hits.subject = ip
     and hit_at > now() - interval '15 minutes';

  if by_email >= 5 or by_ip >= 20 then
    return json_build_object(
      'allowed', false,
      'retry_after', greatest(60, ceil(extract(epoch from (coalesce(oldest, now()) + interval '15 minutes' - now()))))
    );
  end if;

  return json_build_object('allowed', true, 'remaining', 5 - by_email);
end;
$$;

-- Nesėkmingas bandymas.
create or replace function public.record_login_failure(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  ip text := request_ip();
begin
  insert into rate_limit_hits(bucket, subject)
  values ('login_fail', lower(trim(p_email)) || '|' || ip),
         ('login_fail_ip', ip);
end;
$$;

-- Sėkmingas prisijungimas nuima to el. pašto nesėkmes iš šio IP.
create or replace function public.clear_login_failures(p_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from rate_limit_hits
   where bucket = 'login_fail' and subject = lower(trim(p_email)) || '|' || request_ip();
end;
$$;

grant execute on function public.login_attempt_status(text) to anon, authenticated;
grant execute on function public.record_login_failure(text) to anon, authenticated;
grant execute on function public.clear_login_failures(text) to anon, authenticated;

-- ── Pakvietimo kodai ──────────────────────────────────────────────────

create or replace function public.check_invite_code(code text)
returns json language plpgsql volatile security definer set search_path = public as $$
begin
  perform hit_rate_limit('invite_check', request_ip(), 10, interval '15 minutes');
  return json_build_object(
    'valid', exists (select 1 from athlete_profiles ap where ap.invite_code = upper(trim(code))),
    'used',  exists (select 1 from athlete_profiles ap where ap.invite_code = upper(trim(code)) and ap.invite_used)
  );
end;
$$;

grant execute on function public.check_invite_code(text) to anon, authenticated;

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

  perform hit_rate_limit('invite_claim', auth.uid()::text, 5, interval '15 minutes');

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

-- ── Įrašų kūrimo ribos ────────────────────────────────────────────────
-- Argumentai: savininko stulpelis, daugiausia eilučių, laiko langas.
-- Ribos dešimtis kartų viršija normalų naudojimą, jos stabdo tik scenarijus
-- ir klaidas, kurios sukasi cikle.

create or replace function public.enforce_insert_rate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner_col text := tg_argv[0];
  max_rows  int := tg_argv[1]::int;
  win       interval := tg_argv[2]::interval;
  owner_val text;
  recent    int;
begin
  -- Serverio darbai (priminimai, administravimas) neribojami.
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  execute format('select ($1).%I::text', owner_col) using new into owner_val;
  if owner_val is null then
    return new;
  end if;

  execute format(
    'select count(*) from %I.%I where %I::text = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, owner_col
  ) using owner_val, win into recent;

  if recent >= max_rows then
    raise exception 'Per daug įrašų per trumpą laiką. Palaukite kelias minutes ir bandykite vėl.'
      using errcode = 'P0001', hint = 'rate_limit';
  end if;

  return new;
end;
$$;

create index if not exists food_log_athlete_created_idx on public.food_log_entries(athlete_id, created_at desc);
create index if not exists exercise_logs_athlete_created_idx on public.exercise_logs(athlete_id, created_at desc);
create index if not exists bookings_athlete_created_idx on public.bookings(athlete_id, created_at desc);
create index if not exists slots_coach_created_idx on public.available_time_slots(coach_id, created_at desc);
create index if not exists finance_coach_created_idx on public.financial_records(coach_id, created_at desc);

drop trigger if exists rate_bookings on public.bookings;
create trigger rate_bookings before insert on public.bookings
  for each row execute function public.enforce_insert_rate('athlete_id', '30', '1 hour');

drop trigger if exists rate_food_log on public.food_log_entries;
create trigger rate_food_log before insert on public.food_log_entries
  for each row execute function public.enforce_insert_rate('athlete_id', '200', '1 day');

drop trigger if exists rate_exercise_logs on public.exercise_logs;
create trigger rate_exercise_logs before insert on public.exercise_logs
  for each row execute function public.enforce_insert_rate('athlete_id', '800', '1 day');

drop trigger if exists rate_measurements on public.measurements;
create trigger rate_measurements before insert on public.measurements
  for each row execute function public.enforce_insert_rate('athlete_id', '30', '1 day');

drop trigger if exists rate_athlete_profiles on public.athlete_profiles;
create trigger rate_athlete_profiles before insert on public.athlete_profiles
  for each row execute function public.enforce_insert_rate('coach_id', '60', '1 hour');

drop trigger if exists rate_slots on public.available_time_slots;
create trigger rate_slots before insert on public.available_time_slots
  for each row execute function public.enforce_insert_rate('coach_id', '400', '1 hour');

drop trigger if exists rate_finances on public.financial_records;
create trigger rate_finances before insert on public.financial_records
  for each row execute function public.enforce_insert_rate('coach_id', '300', '1 hour');

drop trigger if exists rate_programs on public.programs;
create trigger rate_programs before insert on public.programs
  for each row execute function public.enforce_insert_rate('coach_id', '100', '1 hour');

drop trigger if exists rate_meal_plans on public.meal_plans;
create trigger rate_meal_plans before insert on public.meal_plans
  for each row execute function public.enforce_insert_rate('coach_id', '100', '1 hour');

-- Pranešimus kuria naršyklė, todėl ribojamas ir jų kiekis vienam gavėjui.
drop trigger if exists rate_notifications on public.notifications;
create trigger rate_notifications before insert on public.notifications
  for each row execute function public.enforce_insert_rate('user_id', '200', '1 hour');
