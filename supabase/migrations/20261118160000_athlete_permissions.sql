-- Sportininko teisės: ką jis gali keisti pats, o ką tik treneris.
--
-- Iki šiol sportininkas per API galėjo pakeisti rezervacijos kainą ar
-- būseną, trenerio laisvus laikus ir savo kortelės kainą. Sąsajoje to nebuvo,
-- bet taisyklės turi galioti ir be jos. Be to, atšaukiant patvirtintą
-- treniruotę laikas negrįždavo į laisvus, nes sportininkui neleidžiama
-- kurti trenerio laisvų laikų. Dabar atšaukimas eina per funkciją.

-- ── Rezervacijos ──────────────────────────────────────────────────────

-- Keisti rezervacijas gali tik treneris. Sportininkas atšaukia per funkciją.
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- Sportininko sukurta rezervacija visada laukia patvirtinimo, o kaina
-- imama iš jo kortelės arba trenerio numatytosios.
create or replace function public.normalize_athlete_booking()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() = new.coach_id or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  new.status := 'pending';
  new.cancelled_by := null;
  new.cancelled_at := null;
  new.reminder_sent_at := null;
  select coalesce(ap.session_price, cp.default_session_price)
    into new.price
    from athlete_profiles ap
    left join coach_profiles cp on cp.user_id = ap.coach_id
   where ap.id = new.athlete_id;
  return new;
end;
$$;

drop trigger if exists bookings_normalize_athlete on public.bookings;
create trigger bookings_normalize_athlete before insert on public.bookings
  for each row execute function public.normalize_athlete_booking();

-- Sportininko atšaukimas: termino patikra, būsena ir laiko grąžinimas
-- į laisvus, sujungiant su gretimais langais.
create or replace function public.cancel_my_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b bookings%rowtype;
  hours_before int;
  new_start time;
  new_end time;
  prev_id uuid;
  next_id uuid;
begin
  select bk.* into b
    from bookings bk
    join athlete_profiles ap on ap.id = bk.athlete_id
   where bk.id = p_booking_id and ap.user_id = auth.uid();

  if not found then
    raise exception 'Rezervacija nerasta' using errcode = 'P0001';
  end if;
  if b.status not in ('pending', 'confirmed') then
    raise exception 'Šios treniruotės atšaukti nebegalima' using errcode = 'P0001';
  end if;

  select coalesce(cancellation_hours_before, 24) into hours_before
    from coach_profiles where user_id = b.coach_id;
  hours_before := coalesce(hours_before, 24);

  if (b.session_date + b.start_time) at time zone 'Europe/Vilnius' < now() + make_interval(hours => hours_before) then
    raise exception 'Atšaukti galima likus bent % val. iki treniruotės', hours_before using errcode = 'P0001';
  end if;

  update bookings
     set status = 'cancelled', cancelled_by = 'athlete', cancelled_at = now()
   where id = b.id;

  -- Patvirtinta treniruotė buvo iškirpta iš laisvų laikų: grąžinam.
  if b.status = 'confirmed' then
    new_start := b.start_time;
    new_end := b.end_time;

    select id, start_time into prev_id, new_start
      from available_time_slots
     where coach_id = b.coach_id and date = b.session_date and not is_booked and end_time = b.start_time
     limit 1;
    new_start := coalesce(new_start, b.start_time);

    select id, end_time into next_id, new_end
      from available_time_slots
     where coach_id = b.coach_id and date = b.session_date and not is_booked and start_time = b.end_time
     limit 1;
    new_end := coalesce(new_end, b.end_time);

    delete from available_time_slots where id in (prev_id, next_id);

    insert into available_time_slots (coach_id, date, start_time, end_time, is_booked)
    values (b.coach_id, b.session_date, new_start, new_end, false)
    on conflict (coach_id, date, start_time, end_time) do nothing;
  end if;
end;
$$;

revoke execute on function public.cancel_my_booking(uuid) from public, anon;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

-- ── Laisvi laikai ─────────────────────────────────────────────────────

drop policy if exists ats_update on public.available_time_slots;
create policy ats_update on public.available_time_slots for update to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

-- ── Sportininko kortelė ───────────────────────────────────────────────

-- Susietas sportininkas gali taisyti savo kontaktus ir tikslą, bet ne
-- kainą, vietą, trenerio pastabas, būseną ar priklausymą treneriui.
-- Nesusietos kortelės (user_id dar NULL) sportininkas per RLS nemato,
-- jas keičia tik claim_athlete_invite().
create or replace function public.protect_athlete_profile()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null or auth.uid() = old.coach_id or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if old.user_id is null then
    return new;
  end if;

  new.coach_id := old.coach_id;
  new.user_id := old.user_id;
  new.invite_code := old.invite_code;
  new.invite_used := old.invite_used;
  new.status := old.status;
  new.notes := old.notes;
  new.session_price := old.session_price;
  new.location := old.location;
  return new;
end;
$$;

drop trigger if exists athlete_profiles_protect on public.athlete_profiles;
create trigger athlete_profiles_protect before update on public.athlete_profiles
  for each row execute function public.protect_athlete_profile();
