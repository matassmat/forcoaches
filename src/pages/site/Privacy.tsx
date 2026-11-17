import { Link } from 'react-router-dom'
import { Breadcrumbs, MarketingPage } from '@/components/marketing/SiteChrome'
import { openCookieSettings } from '@/components/CookieConsent'
import { useSeo } from '@/lib/seo'
import { SITE } from '@/lib/site'

const UPDATED = '2026 m. lapkričio 18 d.'

export function Privacy() {
  useSeo({
    title: 'Privatumo politika',
    description: 'Kokius duomenis ForCoaches tvarko, kam jie reikalingi, kiek laiko saugomi ir kokias teises turite.',
  })

  const c = SITE.company
  const controller = [
    c.legalName || SITE.name,
    c.code && `įmonės kodas ${c.code}`,
    [c.street, c.postalCode, c.city].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ')

  return (
    <MarketingPage>
      <article className="mx-auto max-w-3xl px-6 py-14 sm:py-20">
        <Breadcrumbs items={[{ label: 'Privatumo politika' }]} />

        <h1 className="display-lg text-foreground">Privatumo politika</h1>
        <p className="mt-3 text-sm text-muted-foreground">Atnaujinta {UPDATED}</p>

        <div className="mt-10 space-y-10 text-[15px] leading-7 text-muted-foreground [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:space-y-1.5">
          <section>
            <h2>1. Kas tvarko duomenis</h2>
            <p>
              Duomenų valdytojas: <strong>{controller}</strong>
              {SITE.contactEmail && <>, el. paštas <a className="link-underline text-foreground" href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a></>}.
            </p>
            <p className="mt-3">
              Sportininko duomenis (matavimus, mitybos žymėjimus, atliktas serijas) į sistemą įveda treneris arba pats
              sportininkas. Tokiu atveju duomenų valdytojas yra treneris, o ForCoaches juos tvarko trenerio vardu kaip
              duomenų tvarkytojas.
            </p>
          </section>

          <section>
            <h2>2. Kokius duomenis renkame ir kodėl</h2>
            <ul>
              <li><strong>Paskyra:</strong> vardas, pavardė, el. paštas, telefonas (nebūtinas), slaptažodžio maiša. Reikia, kad galėtumėte prisijungti (sutarties vykdymas).</li>
              <li><strong>Treniruočių duomenys:</strong> rezervacijos, programos, atliktos serijos, kūno matavimai, mitybos planai ir žymėjimai. Tai paslaugos esmė (sutarties vykdymas). Svoris ir kūno apimtys yra sveikatos duomenys, juos įvedate savo noru ir galite bet kada ištrinti.</li>
              <li><strong>Atsiskaitymų apskaita:</strong> trenerio įvesti mokėjimai ir priskaičiavimai. Kortelių ar banko duomenų nerenkame.</li>
              <li><strong>Kontaktų forma:</strong> vardas, el. paštas, žinutė ir IP adresas. Naudojame tik atsakymui ir apsaugai nuo šlamšto (teisėtas interesas).</li>
              <li><strong>Saugumo žurnalai:</strong> nesėkmingų prisijungimų skaičius ir IP adresas, kad apsaugotume paskyras nuo slaptažodžių spėliojimo (teisėtas interesas). Saugoma iki 24 valandų.</li>
              <li><strong>Analitika:</strong> tik jei sutinkate su slapukais. Google Analytics mato aplankytus viešus puslapius, naršyklę ir apytikslę vietovę. Programos vidaus (trenerio ir sportininko sričių) nematuojame.</li>
            </ul>
          </section>

          <section>
            <h2>3. Kas dar gauna duomenis</h2>
            <ul>
              <li><strong>Supabase Inc.</strong>: duomenų bazė, prisijungimas ir failų saugykla.</li>
              <li><strong>Resend Inc.</strong>: priminimų apie treniruotes el. laiškai (gauna vardą, el. paštą, treniruotės laiką).</li>
              <li><strong>Google Ireland Ltd.</strong>: analitika (tik gavus sutikimą) ir šriftai.</li>
              <li><strong>Open Food Facts</strong>: nuskenavus prekės brūkšninį kodą, išsiunčiamas tik pats kodas, jokių asmens duomenų.</li>
            </ul>
            <p className="mt-3">
              Kai kurie tvarkytojai yra už Europos ekonominės erdvės ribų. Tokiu atveju duomenys perduodami pagal Europos
              Komisijos standartines sutarčių sąlygas. Duomenų neparduodame ir reklamai nenaudojame.
            </p>
          </section>

          <section>
            <h2>4. Kiek laiko saugome</h2>
            <ul>
              <li>Paskyros ir treniruočių duomenys: kol paskyra aktyvi. Ištrynus paskyrą, duomenys ištrinami per 30 dienų.</li>
              <li>Kontaktų formos žinutės: 12 mėnesių nuo atsakymo.</li>
              <li>Saugumo žurnalai: iki 24 valandų.</li>
              <li>Analitikos duomenys: 14 mėnesių (Google Analytics nustatymas).</li>
            </ul>
          </section>

          <section>
            <h2>5. Slapukai</h2>
            <p>
              Būtinieji: prisijungimo sesija ir temos pasirinkimas. Jie laikomi naršyklės saugykloje ir be jų prisijungti
              neįmanoma. Analitikos slapukai (<code className="code text-sm">_ga</code>, <code className="code text-sm">_ga_*</code>) įrašomi tik sutikus.{' '}
              <button type="button" onClick={openCookieSettings} className="link-underline text-foreground">Keisti slapukų nustatymus</button>
            </p>
          </section>

          <section>
            <h2>6. Jūsų teisės</h2>
            <p>Turite teisę susipažinti su savo duomenimis, juos ištaisyti, ištrinti, apriboti tvarkymą, gauti juos perkeliamu formatu ir nesutikti su tvarkymu teisėto intereso pagrindu. Sutikimą su analitika galite atšaukti bet kada.</p>
            <p className="mt-3">
              Prašymą parašykite <Link to="/kontaktai" className="link-underline text-foreground">kontaktų formoje</Link>
              {SITE.contactEmail && <> arba el. paštu {SITE.contactEmail}</>}. Atsakome per {SITE.responseTime}, o įstatymo
              nustatytas terminas yra vienas mėnuo. Jei manote, kad duomenys tvarkomi neteisėtai, galite kreiptis į
              Valstybinę duomenų apsaugos inspekciją (vdai.lrv.lt).
            </p>
          </section>

          <section>
            <h2>7. Saugumas</h2>
            <p>
              Ryšys šifruojamas (HTTPS). Kiekvienas vartotojas mato tik jam skirtus įrašus: tai užtikrina duomenų bazės
              eilučių lygio prieigos taisyklės, ne vien programos sąsaja. Slaptažodžiai saugomi tik kaip maiša, prisijungimo
              bandymų skaičius ribojamas.
            </p>
          </section>
        </div>
      </article>
    </MarketingPage>
  )
}
