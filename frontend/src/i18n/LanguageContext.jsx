import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { translations } from './translations'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeName: 'English' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeName: 'मराठी' },
]

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  languages: SUPPORTED_LANGUAGES,
})

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('rcn_language')
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'mr')) {
        return saved
      }
    } catch {
      // Ignore localStorage access errors
    }
    return 'en'
  })

  const setLanguage = useCallback((langCode) => {
    if (langCode === 'en' || langCode === 'hi' || langCode === 'mr') {
      setLanguageState(langCode)
      try {
        localStorage.setItem('rcn_language', langCode)
      } catch {
        // Ignore localStorage error
      }
    }
  }, [])

  // Lookup helper with English fallback and parameter interpolation
  const t = useCallback((path, params = {}) => {
    if (!path || typeof path !== 'string') return ''

    const keys = path.split('.')
    let current = translations[language]

    // 1. Try current language
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        current = undefined
        break
      }
    }

    // 2. Fall back to English if missing
    if (current === undefined && language !== 'en') {
      let fallback = translations.en
      for (const key of keys) {
        if (fallback && typeof fallback === 'object' && key in fallback) {
          fallback = fallback[key]
        } else {
          fallback = undefined
          break
        }
      }
      current = fallback
    }

    // 3. Fall back to path if still missing
    if (current === undefined) {
      return path
    }

    // 4. Parameter interpolation e.g. "Wait: {min} min"
    if (typeof current === 'string' && params && typeof params === 'object') {
      return current.replace(/\{(\w+)\}/g, (match, paramName) => {
        return paramName in params ? String(params[paramName]) : match
      })
    }

    return current
  }, [language])

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    languages: SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t])

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}

export const useLanguage = useTranslation

export default LanguageContext
