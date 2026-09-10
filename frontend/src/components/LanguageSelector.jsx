import React from 'react'
import { Globe, ChevronDown } from 'lucide-react'
import { useTranslation, SUPPORTED_LANGUAGES } from '../i18n'

export default function LanguageSelector({ variant = 'header' }) {
  const { language, setLanguage } = useTranslation()

  const handleChange = (e) => {
    setLanguage(e.target.value)
  }

  if (variant === 'pills') {
    return (
      <div className="language-selector-pills" role="radiogroup" aria-label="Select Language">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={language === lang.code}
            className={`lang-pill-btn ${language === lang.code ? 'active' : ''}`}
            onClick={() => setLanguage(lang.code)}
          >
            {lang.nativeName}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="language-selector-wrapper">
      <Globe size={15} className="lang-icon" aria-hidden="true" />
      <select
        className="language-selector-select"
        value={language}
        onChange={handleChange}
        aria-label="Select Language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.code.toUpperCase()})
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="lang-chevron" aria-hidden="true" />
    </div>
  )
}
