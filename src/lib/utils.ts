import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Klasių sujungimas su Tailwind konfliktų sprendimu.
 *
 * Paprastas sujungimas eilute buvo tikra klaida: komponento bazėje esantis
 * `overflow-hidden` ir per `className` paduotas `overflow-y-auto` abu likdavo
 * klasėje, o kuris laimės, spręsdavo CSS eilės tvarka. Dėl to modalas
 * nesislinkdavo ir nulipdavo už ekrano krašto. twMerge palieka paskutinį.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** Skaičius lietuviškai: tarpas tarp tūkstančių, kablelis dešimtainėms. */
export const formatNum = (value: number, digits = 0) =>
  new Intl.NumberFormat('lt-LT', { maximumFractionDigits: digits }).format(value)
