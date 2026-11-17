-- Sportininko kortelei trūko to, ko treneriui reikia kasdien: individualios
-- treniruotės kainos ir įprastos vietos. Pastabos (notes) jau buvo, tik
-- nebuvo naudojamos sąsajoje.

alter table public.athlete_profiles
  add column if not exists session_price numeric(8,2),
  add column if not exists location text;

comment on column public.athlete_profiles.session_price is
  'Individuali šio sportininko treniruotės kaina. NULL — imama trenerio numatytoji.';
comment on column public.athlete_profiles.location is
  'Įprasta treniruočių vieta, iš kurios užpildomas naujos treniruotės laukas.';
