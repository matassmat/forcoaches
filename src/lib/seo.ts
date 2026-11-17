import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { SITE } from '@/lib/site'

/**
 * Kiekvieno puslapio pavadinimas, aprašymas ir socialinių tinklų žymos.
 * Pradinės reikšmės yra `index.html`, kad jas matytų ir JavaScript
 * nevykdantys robotai; čia jos perrašomos pagal maršrutą.
 */
export function useSeo({
  title,
  description,
  noindex = false,
  image,
}: {
  title: string
  description?: string
  noindex?: boolean
  image?: string
}) {
  const { pathname } = useLocation()

  useEffect(() => {
    const fullTitle = title.includes(SITE.name) ? title : `${title} | ${SITE.name}`
    document.title = fullTitle

    const url = `${SITE.url}${pathname === '/' ? '' : pathname}`
    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', `${SITE.url}${image ?? SITE.ogImage}`)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', description)

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url
  }, [title, description, noindex, image, pathname])
}

function setMeta(attr: 'name' | 'property', key: string, value?: string) {
  if (value == null) return
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.content = value
}

/** JSON-LD blokas puslapyje. Pašalinamas išėjus iš puslapio. */
export function useJsonLd(id: string, data: object | null) {
  useEffect(() => {
    if (!data) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = `ld-${id}`
    script.text = JSON.stringify(data)
    document.head.appendChild(script)
    return () => script.remove()
  }, [id, data])
}
