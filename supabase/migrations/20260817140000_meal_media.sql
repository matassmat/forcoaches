-- Valgiaraštis be nuotraukų ir ingredientų sportininkui nieko nesako.

alter table public.meals
  add column if not exists image_url text,
  add column if not exists ingredients text,
  add column if not exists source_id text;

comment on column public.meals.image_url is 'Patiekalo nuotrauka (TheMealDB arba trenerio nuoroda).';
comment on column public.meals.ingredients is 'Ingredientai su kiekiais, po vieną eilutėje.';
comment on column public.meals.source_id is 'TheMealDB idMeal, jei valgis paimtas iš receptų bibliotekos.';

-- Sportininko žymėjimuisi praverčia porcijos dydis: tas pats patiekalas,
-- bet 150 g ir 300 g yra skirtingos kalorijos.
alter table public.food_log_entries
  add column if not exists grams numeric(7,1);

comment on column public.food_log_entries.grams is 'Suvalgytas kiekis gramais, jei žinomas.';
