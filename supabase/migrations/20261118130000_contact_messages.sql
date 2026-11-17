-- Žinutės iš kontaktų formos. Rašyti gali bet kas (ir neprisijungęs),
-- skaityti niekas per API: žinutes matote Supabase skydelyje
-- (Table Editor -> contact_messages). Riba: 5 žinutės per valandą iš vieno IP.

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(trim(name)) between 1 and 100),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  topic      text check (topic is null or char_length(topic) <= 60),
  message    text not null check (char_length(trim(message)) between 10 and 4000),
  ip         text,
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists contact_messages_insert on public.contact_messages;
create policy contact_messages_insert on public.contact_messages
  for insert to anon, authenticated
  with check (handled = false);

grant insert on public.contact_messages to anon, authenticated;

create or replace function public.contact_message_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.ip := request_ip();
  new.handled := false;
  perform hit_rate_limit('contact', new.ip, 5, interval '1 hour');
  return new;
end;
$$;

drop trigger if exists contact_message_guard on public.contact_messages;
create trigger contact_message_guard before insert on public.contact_messages
  for each row execute function public.contact_message_guard();
