import React, { createContext, useContext, useEffect, useState } from 'react'

export const THEMES = [
  {
    id: 'cobalt',
    name: 'Electric Cobalt',
    subtitle: 'Supaste Archetype',
    inspoRef: 'supaste-com',
    icon: '⚡',
    primary: '#087cf8',
    accent: '#38bdf8',
    bg: '#060b18',
  },
  {
    id: 'amber',
    name: 'Cyber Obsidian',
    subtitle: 'Overmind Archetype',
    inspoRef: 'overmindlab-ai',
    icon: '🔥',
    primary: '#f59e0b',
    accent: '#fbbf24',
    bg: '#07080b',
  },
  {
    id: 'emerald',
    name: 'Emerald Precision',
    subtitle: 'Aspen Archetype',
    inspoRef: 'aspensearch-com',
    icon: '🌱',
    primary: '#10b981',
    accent: '#0af474',
    bg: '#050907',
  },
  {
    id: 'monochrome',
    name: 'Swiss Studio',
    subtitle: 'Tracebit Archetype',
    inspoRef: 'tracebit-com',
    icon: '📐',
    primary: '#e14b1e',
    accent: '#f4f4f5',
    bg: '#0b0c0e',
  },
  {
    id: 'editorial',
    name: 'Warm Editorial',
    subtitle: 'Clockout Archetype',
    inspoRef: 'goclockout-app',
    icon: '📜',
    primary: '#f97316',
    accent: '#fdba74',
    bg: '#0d1017',
  },
]

const ThemeContext = createContext({
  theme: 'cobalt',
  setTheme: () => {},
  mode: 'dark',
  setMode: () => {},
  toggleMode: () => {},
  currentThemeMeta: THEMES[0],
  themes: THEMES,
})

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('learnai_theme') || 'cobalt'
    }
    return 'cobalt'
  })

  const [mode, setModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('learnai_mode') || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('learnai_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
    localStorage.setItem('learnai_mode', mode)
  }, [mode])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
  }

  const setMode = (newMode) => {
    setModeState(newMode)
  }

  const toggleMode = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const currentThemeMeta = THEMES.find((t) => t.id === theme) || THEMES[0]

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        mode,
        setMode,
        toggleMode,
        currentThemeMeta,
        themes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
