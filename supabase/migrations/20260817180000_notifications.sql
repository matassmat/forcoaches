-- Pranešimai sistemos viduje. Modelis iš Tutorly `notifications`.
--
-- El. paštui reikia savo SMTP, o šie veikia iš karto: treneris pamato naują
-- prašymą, sportininkas — patvirtinimą ar atšaukimą.

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  message    text,
  is_read    boolean not null default false,
  /** Laisvi duomenys nuorodai: rezervacijos id, data ir pan. */
  data       jsonb,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where not is_read;

alter table public.notifications enable row level security;

-- Skaityti ir žymėti gali tik adresatas.
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Rašyti gali bet kuris prisijungęs, bet tik susijusiam žmogui: treneris savo
-- sportininkui, sportininkas savo treneriui. Kitaip bet kas galėtų siųsti
-- pranešimus bet kam.
create policy notifications_insert on public.notifications for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.athlete_profiles ap
       where ap.coach_id = auth.uid() and ap.user_id = notifications.user_id
    )
    or public.my_coach_is(notifications.user_id)
  );

-- Realtime, kad varpelis atsinaujintų be perkrovimo.
alter publication supabase_realtime add table public.notifications;
