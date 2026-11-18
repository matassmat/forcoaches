-- Paskyros ištrynimas paties vartotojo prašymu (BDAR 17 str.).
--
-- Treneris: ištrinama paskyra ir viskas, kas jai priklauso (sportininkų
-- kortelės, programos, planai, rezervacijos, finansai), per ON DELETE CASCADE.
--
-- Sportininkas: ištrinami jo paties įvesti sveikatos duomenys (matavimai,
-- mitybos žymėjimai, atliktos serijos) ir prisijungimas. Kortelė pas trenerį
-- lieka be kontaktų, su rezervacijų ir atsiskaitymų istorija, nes ją
-- treneris privalo turėti apskaitai.

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  my_role user_role;
begin
  if uid is null then
    raise exception 'Reikalinga sesija' using errcode = 'P0001';
  end if;

  select role into my_role from public.users where id = uid;

  if my_role = 'athlete' then
    delete from public.food_log_entries
     where athlete_id in (select id from public.athlete_profiles where user_id = uid);
    delete from public.exercise_logs
     where athlete_id in (select id from public.athlete_profiles where user_id = uid);
    delete from public.measurements
     where athlete_id in (select id from public.athlete_profiles where user_id = uid);
    update public.athlete_profiles
       set user_id = null, status = 'inactive', email = null, phone = null, birth_date = null
     where user_id = uid;
  end if;

  delete from public.notifications where user_id = uid;
  -- auth.users ištrynimas per kaskadą ištrina ir public.users bei trenerio duomenis.
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Vartotojas gali keisti savo vardą ir telefoną, bet ne rolę ar el. paštą:
-- kitaip sportininkas pats galėtų pasidaryti treneriu.
create or replace function public.protect_user_fields()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.role := old.role;
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_fields on public.users;
create trigger users_protect_fields before update on public.users
  for each row execute function public.protect_user_fields();
