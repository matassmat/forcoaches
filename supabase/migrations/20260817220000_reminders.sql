-- Priminimų žyma. Be jos kas valandą paleidžiama funkcija tą patį laišką
-- siųstų iš naujo, kol treniruotė nepraeitų.

alter table public.bookings
  add column if not exists reminder_sent_at timestamptz;

comment on column public.bookings.reminder_sent_at is
  'Kada išsiųstas priminimas. NULL — dar nesiųsta.';

-- Funkcija ieško būtent tokių eilučių, tad indeksas dalinis.
create index if not exists bookings_reminder_pending_idx
  on public.bookings(session_date)
  where status = 'confirmed' and reminder_sent_at is null;
