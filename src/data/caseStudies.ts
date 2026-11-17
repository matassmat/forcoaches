/**
 * Darbo pavyzdžiai. Tai tipiniai scenarijai, kaip treneris naudoja
 * programą, o ne tikrų klientų atsiliepimai: juose nėra vardų ir sugalvotų
 * rezultatų. Kai turėsite tikrų istorijų su leidimu jas skelbti, keiskite
 * šiuos įrašus jomis.
 */

export interface CaseStudy {
  slug: string
  title: string
  who: string
  summary: string
  before: string[]
  setup: { title: string; text: string }[]
  week: string[]
  features: { label: string; href: string }[]
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'treneris-sporto-klube',
    title: 'Treneris sporto klube su 15 nuolatinių klientų',
    who: 'Asmeninis treneris, dirbantis vienoje salėje, 25-30 treniruočių per savaitę',
    summary: 'Kaip rezervacijų žinutes pakeisti laisvais laikais, kuriuos klientai užsiima patys, ir matyti, kas už ką sumokėjo.',
    before: [
      'Laikai derinami per „Messenger“: kiekvienai treniruotei 3-6 žinutės.',
      'Kas kiek treniruočių liko iš paketo, skaičiuojama užrašuose.',
      'Programos siunčiamos nuotraukomis, klientas jas pameta.',
    ],
    setup: [
      { title: 'Laisvi laikai', text: 'Kalendoriuje nutempiami darbo langai ir pakartojami 4 savaitėms į priekį. Klientas mato tik tai, kas laisva.' },
      { title: 'Kortelės ir kainos', text: 'Kiekvienam klientui įrašoma treniruotės kaina ir vieta. Įvykusi treniruotė pati tampa priskaičiavimu finansuose.' },
      { title: 'Programos', text: 'Trys šablonai (pradedantiesiems, jėgai, metimui) priskiriami klientams ir pakoreguojami svoriai.' },
    ],
    week: [
      'Pirmadienį treneris peržiūri rezervacijų prašymus ir patvirtina vienu paspaudimu.',
      'Salėje klientas atsidaro programą telefone ir žymisi atliktas serijas su svoriu.',
      'Penktadienį skiltyje „Finansai“ matosi, kas turi neapmokėtų treniruočių.',
    ],
    features: [
      { label: 'Rezervacijos', href: '/#rezervacijos' },
      { label: 'Programos', href: '/#programos' },
    ],
  },
  {
    slug: 'mitybos-ir-svorio-tikslai',
    title: 'Trenerė, dirbanti su svorio metimo tikslais',
    who: 'Trenerė, kurios klientės dažniausiai siekia numesti svorio ir išmokti valgyti reguliariai',
    summary: 'Kaip sudaryti mitybos planą iš lietuviškų produktų, matyti kalorijas ir progresą be atskirų programėlių.',
    before: [
      'Klientės kalorijas skaičiuoja skirtingose programėlėse, rezultatai siunčiami ekrano nuotraukomis.',
      'Matavimai užrašomi kas kartą kitur, kryptis nematoma.',
    ],
    setup: [
      { title: 'Normos', text: 'Skaičiuoklė pagal svorį, ūgį, amžių ir aktyvumą pasiūlo kalorijas ir makro normas, trenerė jas pakoreguoja.' },
      { title: 'Valgiaraštis', text: 'Valgiai sudedami iš produktų su gramais arba paimami iš receptų bibliotekos su nuotraukomis.' },
      { title: 'Matavimai', text: 'Kartą per savaitę klientė įveda svorį ir apimtis, grafike matosi kryptis, o ne vienas blogas rytas.' },
    ],
    week: [
      'Klientė žymisi valgius: ieško produkto, nuskenuoja brūkšninį kodą arba pažymi valgį iš trenerės plano.',
      'Dienos suvestinėje matosi, kiek kalorijų ir baltymų dar liko.',
      'Trenerė sportininkės kortelėje mato matavimų kreivę ir koreguoja normas.',
    ],
    features: [
      { label: 'Mityba', href: '/#mityba' },
      { label: 'Progresas', href: '/#progresas' },
    ],
  },
  {
    slug: 'pradedantieji-ir-grupes',
    title: 'Treneris, ruošiantis pradedančiuosius',
    who: 'Treneris, kurio klientai salėje pirmą kartą ir dažnai nežino pratimų pavadinimų',
    summary: 'Kaip programa su nuotraukomis ir atlikimo aprašymais sumažina klausimų „o kaip šitą daryti?“.',
    before: [
      'Tarp treniruočių klientai pamiršta, kaip atliekamas pratimas.',
      'Svoriai neužrašomi, todėl kitą kartą pradedama nuo nulio.',
    ],
    setup: [
      { title: 'Pratimai su nuotraukomis', text: 'Iš 873 pratimų bibliotekos parenkami pratimai su pradinės ir galinės padėties nuotraukomis bei aprašymu.' },
      { title: 'Svoriai ir poilsis', text: 'Kiekvienam pratimui nurodomos serijos, kartojimai, svoris ir poilsis tarp serijų.' },
    ],
    week: [
      'Klientas salėje paspaudžia pratimą ir pamato, kaip jį atlikti.',
      'Pažymėtos serijos išsaugomos, kitą treniruotę matosi, kokį svorį kėlė praėjusį kartą.',
    ],
    features: [
      { label: 'Programos', href: '/#programos' },
      { label: 'Rezervacijos', href: '/#rezervacijos' },
    ],
  },
]
