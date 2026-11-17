/**
 * Paieška lietuviškiems pavadinimams.
 *
 * Paprastas `includes` čia neveikia: „vištiena“ nėra „vištienos“ dalis, o
 * treneris rašo vardininką. Todėl lyginami kamienai, nuo ilgesnių žodžių
 * nupjaunama galūnė.
 */

/** Nuima diakritikus, kad „pritupimai“ rastų „pritūpimai“. */
export function fold(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * Grubus kamienas: iš ilgesnio žodžio nupjaunamos dvi paskutinės raidės.
 * Ne kalbininkų sprendimas, bet paieškos laukui to pakanka -
 * „vištienos“ ir „vištiena“ abu tampa „vistien“.
 */
function stem(word: string): string {
  return word.length > 5 ? word.slice(0, word.length - 2) : word
}

/**
 * Ar pavadinimas atitinka užklausą. Kiekvienas užklausos žodis turi
 * rastis pavadinime, taip „vistiena krut“ suranda vištienos krūtinėlę.
 */
export function matches(name: string, query: string): boolean {
  const q = fold(query).trim()
  if (!q) return true

  const haystack = fold(name)
  const words = haystack.split(/[\s,.()/-]+/).filter(Boolean)

  return q.split(/\s+/).every((term) => {
    if (haystack.includes(term)) return true
    const termStem = stem(term)
    return words.some((word) => {
      const wordStem = stem(word)
      return wordStem.startsWith(termStem) || termStem.startsWith(wordStem)
    })
  })
}
