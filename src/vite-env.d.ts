/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SITE_URL?: string
  readonly VITE_CONTACT_EMAIL?: string
  readonly VITE_RESPONSE_TIME?: string
  readonly VITE_COMPANY_NAME?: string
  readonly VITE_COMPANY_CODE?: string
  readonly VITE_COMPANY_STREET?: string
  readonly VITE_COMPANY_CITY?: string
  readonly VITE_COMPANY_POSTAL?: string
  readonly VITE_COMPANY_PHONE?: string
  readonly VITE_GA_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
