/**
 * Maisto produktų lentelė kalorijų žymėjimuisi, 100 g porcijai.
 *
 * Vietinė, o ne svetima API: sportininkas žymisi valgį salėje, dažnai su
 * prastu ryšiu, ir jam reikia lietuviškų pavadinimų, o ne prekinių ženklų.
 * Reikšmės, apibendrintos žalio/virto produkto vertės.
 */

import { matches } from '@/lib/search'

export interface Food {
  name: string
  group: FoodGroup
  /** 100 g. */
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export type FoodGroup =
  | 'meat' | 'fish' | 'dairy' | 'grain' | 'veg' | 'fruit' | 'fat' | 'sweet' | 'drink' | 'dish'

export const FOOD_GROUP_LABELS: Record<FoodGroup, string> = {
  meat: 'Mėsa, kiaušiniai',
  fish: 'Žuvis, jūros gėrybės',
  dairy: 'Pieno produktai',
  grain: 'Kruopos, duona',
  veg: 'Daržovės, ankštiniai',
  fruit: 'Vaisiai, uogos',
  fat: 'Riebalai, riešutai',
  sweet: 'Saldumynai, užkandžiai',
  drink: 'Gėrimai',
  dish: 'Patiekalai',
}

const f = (name: string, group: FoodGroup, kcal: number, protein: number, carbs: number, fat: number): Food =>
  ({ name, group, kcal, protein, carbs, fat })

export const FOODS: Food[] = [
  // ── Mėsa, kiaušiniai ──
  f('Vištienos krūtinėlė, virta', 'meat', 165, 31, 0, 3.6),
  f('Vištienos krūtinėlė, žalia', 'meat', 120, 23, 0, 2.6),
  f('Vištienos šlaunelė be odos', 'meat', 177, 24, 0, 8.5),
  f('Kalakutienos filė', 'meat', 135, 29, 0, 1.7),
  f('Kiaulienos išpjova', 'meat', 143, 26, 0, 3.5),
  f('Kiaulienos sprandinė', 'meat', 267, 17, 0, 22),
  f('Jautienos išpjova', 'meat', 158, 27, 0, 5),
  f('Jautienos faršas 5 %', 'meat', 137, 21, 0, 5),
  f('Jautienos faršas 15 %', 'meat', 215, 18, 0, 15),
  f('Kiauliena–jautiena faršas', 'meat', 250, 17, 0, 20),
  f('Kiaušinis, virtas', 'meat', 155, 13, 1.1, 11),
  f('Kiaušinio baltymas', 'meat', 52, 11, 0.7, 0.2),
  f('Kumpis, liesas', 'meat', 145, 21, 1.5, 6),
  f('Vištienos kepenėlės', 'meat', 119, 17, 0.7, 4.8),
  f('Dešrelės', 'meat', 300, 12, 3, 27),

  // ── Žuvis ──
  f('Lašiša, kepta', 'fish', 208, 20, 0, 13),
  f('Menkė', 'fish', 82, 18, 0, 0.7),
  f('Tunas konservuotas vandenyje', 'fish', 116, 26, 0, 1),
  f('Silkė', 'fish', 158, 18, 0, 9),
  f('Skumbrė', 'fish', 205, 19, 0, 14),
  f('Krevetės', 'fish', 99, 24, 0.2, 0.3),
  f('Upėtakis', 'fish', 148, 21, 0, 7),

  // ── Pieno produktai ──
  f('Varškė 5 %', 'dairy', 121, 17, 3.3, 5),
  f('Varškė 9 %', 'dairy', 159, 16, 3, 9),
  f('Varškė liesa 0 %', 'dairy', 79, 18, 1.8, 0.3),
  f('Graikiškas jogurtas 2 %', 'dairy', 73, 10, 3.6, 2),
  f('Natūralus jogurtas 3,5 %', 'dairy', 61, 3.5, 4.7, 3.3),
  f('Kefyras 2,5 %', 'dairy', 53, 3.4, 4, 2.5),
  f('Pienas 2,5 %', 'dairy', 52, 3.3, 4.8, 2.5),
  f('Pienas be riebalų', 'dairy', 34, 3.4, 5, 0.1),
  f('Fermentinis sūris', 'dairy', 350, 25, 1.5, 27),
  f('Grietinė 15 %', 'dairy', 160, 2.6, 3.6, 15),
  f('Išrūgų baltymai (milteliai)', 'dairy', 380, 78, 6, 5),
  f('Sviestas', 'dairy', 717, 0.9, 0.1, 81),

  // ── Kruopos, duona ──
  f('Ryžiai, virti', 'grain', 130, 2.7, 28, 0.3),
  f('Ryžiai rudieji, virti', 'grain', 123, 2.7, 26, 1),
  f('Grikiai, virti', 'grain', 92, 3.4, 20, 0.6),
  f('Bulvės, virtos', 'grain', 87, 2, 20, 0.1),
  f('Bulvių košė', 'grain', 88, 2, 15, 2.5),
  f('Makaronai, virti', 'grain', 131, 5, 25, 1.1),
  f('Avižinės kruopos, sausos', 'grain', 379, 13, 67, 7),
  f('Avižinė košė ant vandens', 'grain', 71, 2.5, 12, 1.5),
  f('Bolivinė balanda, virta', 'grain', 120, 4.4, 21, 1.9),
  f('Juoda duona', 'grain', 250, 8, 48, 3),
  f('Balta duona', 'grain', 265, 9, 49, 3.2),
  f('Pilno grūdo duona', 'grain', 247, 13, 41, 3.4),
  f('Kuskusas, virtas', 'grain', 112, 3.8, 23, 0.2),
  f('Blynai', 'grain', 227, 6, 28, 10),

  // ── Daržovės, ankštiniai ──
  f('Brokoliai', 'veg', 34, 2.8, 7, 0.4),
  f('Žiediniai kopūstai', 'veg', 25, 1.9, 5, 0.3),
  f('Morkos', 'veg', 41, 0.9, 10, 0.2),
  f('Pomidorai', 'veg', 18, 0.9, 3.9, 0.2),
  f('Agurkai', 'veg', 15, 0.7, 3.6, 0.1),
  f('Paprika', 'veg', 31, 1, 6, 0.3),
  f('Svogūnai', 'veg', 40, 1.1, 9, 0.1),
  f('Špinatai', 'veg', 23, 2.9, 3.6, 0.4),
  f('Salotos', 'veg', 15, 1.4, 2.9, 0.2),
  f('Cukinija', 'veg', 17, 1.2, 3.1, 0.3),
  f('Burokėliai, virti', 'veg', 44, 1.7, 10, 0.2),
  f('Kopūstai', 'veg', 25, 1.3, 6, 0.1),
  f('Avinžirniai, virti', 'veg', 164, 9, 27, 2.6),
  f('Lęšiai, virti', 'veg', 116, 9, 20, 0.4),
  f('Raudonosios pupelės, virtos', 'veg', 127, 9, 23, 0.5),
  f('Žirneliai', 'veg', 81, 5, 14, 0.4),
  f('Kukurūzai', 'veg', 96, 3.4, 21, 1.5),

  // ── Vaisiai, uogos ──
  f('Bananas', 'fruit', 89, 1.1, 23, 0.3),
  f('Obuolys', 'fruit', 52, 0.3, 14, 0.2),
  f('Apelsinas', 'fruit', 47, 0.9, 12, 0.1),
  f('Braškės', 'fruit', 32, 0.7, 7.7, 0.3),
  f('Mėlynės', 'fruit', 57, 0.7, 14, 0.3),
  f('Vynuogės', 'fruit', 69, 0.7, 18, 0.2),
  f('Kriaušė', 'fruit', 57, 0.4, 15, 0.1),
  f('Avokadas', 'fruit', 160, 2, 9, 15),
  f('Arbūzas', 'fruit', 30, 0.6, 8, 0.2),
  f('Kivi', 'fruit', 61, 1.1, 15, 0.5),
  f('Datulės', 'fruit', 282, 2.5, 75, 0.4),

  // ── Riebalai, riešutai ──
  f('Migdolai', 'fat', 579, 21, 22, 50),
  f('Graikiniai riešutai', 'fat', 654, 15, 14, 65),
  f('Žemės riešutai', 'fat', 567, 26, 16, 49),
  f('Žemės riešutų sviestas', 'fat', 588, 25, 20, 50),
  f('Saulėgrąžos', 'fat', 584, 21, 20, 51),
  f('Alyvuogių aliejus', 'fat', 884, 0, 0, 100),
  f('Saulėgrąžų aliejus', 'fat', 884, 0, 0, 100),
  f('Chia sėklos', 'fat', 486, 17, 42, 31),
  f('Linų sėmenys', 'fat', 534, 18, 29, 42),

  // ── Saldumynai, užkandžiai ──
  f('Juodasis šokoladas 70 %', 'sweet', 598, 7.8, 46, 43),
  f('Pieninis šokoladas', 'sweet', 535, 7.6, 59, 30),
  f('Baltyminis batonėlis', 'sweet', 350, 30, 35, 9),
  f('Sausainiai', 'sweet', 480, 6, 65, 21),
  f('Ledai', 'sweet', 207, 3.5, 24, 11),
  f('Medus', 'sweet', 304, 0.3, 82, 0),
  f('Bulvių traškučiai', 'sweet', 536, 7, 53, 34),
  f('Cukrus', 'sweet', 387, 0, 100, 0),

  // ── Gėrimai ──
  f('Vanduo', 'drink', 0, 0, 0, 0),
  f('Juoda kava be cukraus', 'drink', 2, 0.3, 0, 0),
  f('Apelsinų sultys', 'drink', 45, 0.7, 10, 0.2),
  f('Alus 5 %', 'drink', 43, 0.5, 3.6, 0),
  f('Sausas vynas', 'drink', 82, 0.1, 2.6, 0),
  f('Coca-Cola', 'drink', 42, 0, 10.6, 0),
  f('Coca-Cola Zero', 'drink', 0.3, 0, 0, 0),
  f('Energinis gėrimas', 'drink', 45, 0, 11, 0),

  // ── Patiekalai ──
  f('Cepelinai su mėsa', 'dish', 180, 6, 25, 6),
  f('Šaltibarščiai', 'dish', 65, 2.5, 7, 3),
  f('Kotletas keptas', 'dish', 250, 15, 8, 18),
  f('Kepta vištiena su ryžiais', 'dish', 160, 12, 18, 4),
  f('Picos gabalas', 'dish', 266, 11, 33, 10),
  f('Mėsainis', 'dish', 295, 17, 24, 14),
  f('Kebabas', 'dish', 215, 15, 17, 10),
  f('Suši (8 vnt.)', 'dish', 145, 6, 28, 1),
  f('Daržovių sriuba', 'dish', 45, 2, 7, 1),
  f('Makaronai su malta mėsa', 'dish', 165, 9, 18, 6),
  f('Baltymų kokteilis su pienu', 'dish', 110, 12, 8, 2.5),
  f('Varškė su uogomis', 'dish', 110, 14, 8, 3),
]

export function searchFoods(query: string, group?: FoodGroup | null): Food[] {
  return FOODS.filter((food) => {
    if (group && food.group !== group) return false
    return matches(food.name, query)
  })
}

/** Maistinės vertės konkrečiam kiekiui gramais. */
export function scaleFood(food: Food, grams: number) {
  const ratio = grams / 100
  return {
    kcal: Math.round(food.kcal * ratio),
    protein: Math.round(food.protein * ratio * 10) / 10,
    carbs: Math.round(food.carbs * ratio * 10) / 10,
    fat: Math.round(food.fat * ratio * 10) / 10,
  }
}
