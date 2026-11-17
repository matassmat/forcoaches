import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

// v2: ankstesnė versija tamsią temą įrašydavo pati, be žmogaus pasirinkimo,
// todėl seno rakto reikšmė nieko nesako apie tai, ko jis nori.
const STORAGE_KEY = 'forcoaches_theme_v2'

const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | undefined>(undefined)

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // localStorage gali būti uždarytas (privatus langas).
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Įrašoma tik tada, kai žmogus pats perjungia temą.
  const toggle = () => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Neišsaugojom, bet šiai sesijai tema vis tiek pritaikyta.
      }
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
