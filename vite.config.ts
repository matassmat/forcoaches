import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Vieši puslapiai, kuriuos verta indeksuoti. Programos vidus neindeksuojamas. */
const PUBLIC_ROUTES = [
  '/',
  '/pavyzdziai',
  '/pavyzdziai/treneris-sporto-klube',
  '/pavyzdziai/mitybos-ir-svorio-tikslai',
  '/pavyzdziai/pradedantieji-ir-grupes',
  '/kontaktai',
  '/privatumas',
  '/registracija',
];

/**
 * SEO failai iš aplinkos kintamųjų: robots.txt, sitemap.xml ir
 * struktūrizuoti duomenys index.html faile (juos mato ir JavaScript
 * nevykdantys robotai bei socialiniai tinklai).
 */
function seoFiles(env: Record<string, string>): Plugin {
  const site = (env.VITE_SITE_URL || 'https://forcoaches.lt').replace(/\/$/, '');

  const organization: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ForCoaches',
    url: site,
    logo: `${site}/favicon.svg`,
    ...(env.VITE_CONTACT_EMAIL ? { email: env.VITE_CONTACT_EMAIL } : {}),
  };

  const software = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ForCoaches',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: 'lt',
    url: site,
    description: 'Rezervacijos, treniruočių programos, mitybos planai ir atsiskaitymai asmeniniam treneriui ir jo sportininkams.',
  };

  // Vietos verslo žymėjimas tik tada, kai nurodytas tikras adresas.
  const local = env.VITE_COMPANY_STREET
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: env.VITE_COMPANY_NAME || 'ForCoaches',
        url: site,
        image: `${site}/og-image.png`,
        ...(env.VITE_COMPANY_PHONE ? { telephone: env.VITE_COMPANY_PHONE } : {}),
        ...(env.VITE_CONTACT_EMAIL ? { email: env.VITE_CONTACT_EMAIL } : {}),
        address: {
          '@type': 'PostalAddress',
          streetAddress: env.VITE_COMPANY_STREET,
          addressLocality: env.VITE_COMPANY_CITY || 'Vilnius',
          ...(env.VITE_COMPANY_POSTAL ? { postalCode: env.VITE_COMPANY_POSTAL } : {}),
          addressCountry: 'LT',
        },
        areaServed: { '@type': 'Country', name: 'Lietuva' },
      }
    : null;

  const jsonLd = [organization, software, local]
    .filter(Boolean)
    .map((data) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`)
    .join('\n    ');

  return {
    name: 'forcoaches-seo',
    // 'pre': pakeičiama prieš Vite HTML apdorojimą, kitaip %SITE_URL% nuorodose laikomas klaidingu adresu.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', site).replace('<!-- %JSON_LD% -->', jsonLd),
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          'Disallow: /treneris',
          'Disallow: /sportininkas',
          'Disallow: /aciu',
          'Disallow: /naujas-slaptazodis',
          '',
          `Sitemap: ${site}/sitemap.xml`,
          '',
        ].join('\n'),
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          PUBLIC_ROUTES.map((route) =>
            `  <url><loc>${site}${route === '/' ? '/' : route}</loc><lastmod>${today}</lastmod><priority>${route === '/' ? '1.0' : '0.7'}</priority></url>`
          ).join('\n') +
          '\n</urlset>\n',
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), seoFiles(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      // Vite savaime PORT kintamojo neskaito. Be šito automatinis porto
      // priskyrimas neveiktų ir serveris liptų ant užimto 5174.
      port: Number(process.env.PORT) || 5174,
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          // Bibliotekos į atskirus failus: jos keičiasi retai, todėl po kiekvieno
          // mūsų kodo pakeitimo naršyklė jų nebeatsisiunčia iš naujo.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            charts: ['recharts'],
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});
