import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Header from '../../components/Header'
import { useTranslation } from '../../i18n'
import { SCREENS } from '../../utils/constants'
import { FIRST_AID_TOPICS, CATEGORIES } from '../../data/firstAidData'
import { synthesizeSpeech } from '../../services/api'
import FirstAidVideoLibrary from '../../components/FirstAidVideoLibrary'
import '../../styles/emergencyFirstAid.css'

export default function EmergencyFirstAid({ onNavigate, initialTopicId = null }) {
  const { language, t } = useTranslation()
  const [topics, setTopics] = useState(FIRST_AID_TOPICS)
  const [selectedTopicId, setSelectedTopicId] = useState(initialTopicId)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('guides') // 'guides' | 'videos'
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioStatusMessage, setAudioStatusMessage] = useState(null)

  const audioRef = useRef(null)
  const abortControllerRef = useRef(null)
  const speechSessionRef = useRef({ cancelled: false, activeUtterance: null })

  const ttsSupported = typeof window !== 'undefined' && ('speechSynthesis' in window || typeof Audio !== 'undefined')

  // Stop all active audio (both SpeechSynthesis and HTML5 Audio) and abort in-flight requests
  const stopAllAudio = useCallback(() => {
    speechSessionRef.current.cancelled = true
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsPlayingAudio(false)
    setIsLoadingAudio(false)
  }, [])

  // 1. Offline Content Guarantee: Load from static endpoint, fallback to bundled data
  useEffect(() => {
    let isMounted = true
    fetch('/first-aid/content.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTopics(data)
        }
      })
      .catch(() => {
        // Fallback already loaded synchronously from FIRST_AID_TOPICS
      })

    return () => {
      isMounted = false
      stopAllAudio()
    }
  }, [stopAllAudio])

  // Stop audio on language change
  const prevLangRef = useRef(language)
  useEffect(() => {
    if (prevLangRef.current !== language) {
      prevLangRef.current = language
      if (isPlayingAudio || isLoadingAudio) {
        stopAllAudio()
      }
    }
  }, [language, isPlayingAudio, isLoadingAudio, stopAllAudio])

  // Safely select/deselect a topic and reset audio playback
  const handleSelectTopic = useCallback((id) => {
    stopAllAudio()
    setAudioStatusMessage(null)
    setSelectedTopicId(id)
  }, [stopAllAudio])

  // Helper to get localized string with fallback to English
  const getLocalized = useCallback((obj, lang = language) => {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    return obj[lang] || obj.en || Object.values(obj)[0] || ''
  }, [language])

  // Active selected topic
  const activeTopic = useMemo(() => {
    if (!selectedTopicId) return null
    return topics.find((t) => t.id === selectedTopicId) || null
  }, [topics, selectedTopicId])

  // Filtered topics based on search and category
  const filteredTopics = useMemo(() => {
    return topics.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false
      }

      // Search query filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const title = getLocalized(item.title).toLowerCase()
      const titleEn = (item.title?.en || '').toLowerCase()
      const summary = getLocalized(item.summary).toLowerCase()

      const warningsMatch = (item.warnings || []).some((w) =>
        getLocalized(w).toLowerCase().includes(q)
      )

      const stepsMatch = (item.steps || []).some((s) => {
        const stepTitle = getLocalized(s.title).toLowerCase()
        const stepText = getLocalized(s.text).toLowerCase()
        const doNot = getLocalized(s.doNot).toLowerCase()
        return stepTitle.includes(q) || stepText.includes(q) || doNot.includes(q)
      })

      return (
        title.includes(q) ||
        titleEn.includes(q) ||
        summary.includes(q) ||
        warningsMatch ||
        stepsMatch
      )
    })
  }, [topics, selectedCategory, searchQuery, getLocalized])

  // Detect available browser SpeechSynthesis voice for target locale
  const findBrowserVoice = useCallback((targetLocale) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
    const voices = window.speechSynthesis.getVoices()
    if (!voices || voices.length === 0) return null
    const baseCode = targetLocale.split('-')[0].toLowerCase()
    return (
      voices.find(
        (v) =>
          v.lang &&
          (v.lang.toLowerCase() === targetLocale.toLowerCase() ||
            v.lang.replace('_', '-').toLowerCase() === targetLocale.toLowerCase())
      ) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(baseCode)) ||
      null
    )
  }, [])

  // Build concise, structured speech chunks from topic details
  const getTopicSpeechChunks = useCallback(
    (topic, lang) => {
      if (!topic) return []
      const title = getLocalized(topic.title, lang)
      const summary = getLocalized(topic.summary, lang)
      const redFlagsHeader = t('firstAid.redFlagsTitle') || 'Emergency Red Flags'

      const chunks = []
      if (title || summary) {
        chunks.push(`${title}. ${summary}.`.trim())
      }

      if (topic.warnings && topic.warnings.length > 0) {
        const warningsJoined = topic.warnings
          .map((w, idx) => `${idx + 1}. ${getLocalized(w, lang)}`)
          .join('. ')
        chunks.push(`${redFlagsHeader}: ${warningsJoined}.`.trim())
      }

      if (topic.steps && topic.steps.length > 0) {
        topic.steps.forEach((s, idx) => {
          const stepNum =
            t('firstAid.stepNum', { number: s.stepNumber || idx + 1 }) ||
            `Step ${s.stepNumber || idx + 1}`
          const stepTitle = getLocalized(s.title, lang)
          const stepText = getLocalized(s.text, lang)
          const doNotText = s.doNot
            ? `${t('firstAid.whatNotToDo') || 'Do not'}: ${getLocalized(s.doNot, lang)}.`
            : ''
          const chunk = `${stepNum}: ${stepTitle}. ${stepText}. ${doNotText}`.trim()
          if (chunk) chunks.push(chunk)
        });
      }

      return chunks
    },
    [getLocalized, t]
  )

  // Browser SpeechSynthesis playback (chunk-by-chunk to prevent 15-second browser cutoff)
  const playBrowserSpeechChunks = useCallback((chunks, targetLocale, voice) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    synth.cancel()

    speechSessionRef.current.cancelled = false
    setIsPlayingAudio(true)
    setIsLoadingAudio(false)
    setAudioStatusMessage(null)

    let currentIdx = 0
    const speakNextChunk = () => {
      if (speechSessionRef.current.cancelled || currentIdx >= chunks.length) {
        setIsPlayingAudio(false)
        return
      }

      const utterance = new SpeechSynthesisUtterance(chunks[currentIdx])
      utterance.lang = targetLocale
      utterance.rate = 0.9
      utterance.pitch = 1.0
      if (voice) {
        utterance.voice = voice
      }
      speechSessionRef.current.activeUtterance = utterance

      utterance.onend = () => {
        if (!speechSessionRef.current.cancelled) {
          currentIdx++
          speakNextChunk()
        }
      }

      utterance.onerror = (evt) => {
        console.warn('SpeechSynthesis playback error:', evt)
        if (!speechSessionRef.current.cancelled) {
          setIsPlayingAudio(false)
        }
      }

      synth.speak(utterance)
    }

    speakNextChunk()
  }, [])

  // Sarvam AI online TTS playback (chunk-by-chunk with HTML5 Audio)
  const playSarvamAudioChunks = useCallback(
    async (chunks, targetLocale) => {
      speechSessionRef.current.cancelled = false
      setIsLoadingAudio(true)
      setAudioStatusMessage(null)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        // Synthesize chunk 0 first for low latency
        const firstRes = await synthesizeSpeech({
          text: chunks[0],
          language: targetLocale,
        })

        if (speechSessionRef.current.cancelled || controller.signal.aborted) {
          setIsLoadingAudio(false)
          return
        }

        setIsLoadingAudio(false)
        setIsPlayingAudio(true)

        const playBuffer = (base64Data, mimeType = 'audio/wav') => {
          return new Promise((resolve, reject) => {
            if (speechSessionRef.current.cancelled) {
              resolve()
              return
            }
            const audio = new Audio(`data:${mimeType};base64,${base64Data}`)
            audioRef.current = audio
            audio.onended = () => resolve()
            audio.onerror = (e) => reject(e)
            audio.play().catch(reject)
          })
        }

        await playBuffer(firstRes.audio_base64, firstRes.mime_type || 'audio/wav')

        for (let i = 1; i < chunks.length; i++) {
          if (speechSessionRef.current.cancelled || controller.signal.aborted) break

          const res = await synthesizeSpeech({
            text: chunks[i],
            language: targetLocale,
          })

          if (speechSessionRef.current.cancelled || controller.signal.aborted) break
          await playBuffer(res.audio_base64, res.mime_type || 'audio/wav')
        }

        if (!speechSessionRef.current.cancelled) {
          setIsPlayingAudio(false)
        }
      } catch (err) {
        console.warn('Sarvam TTS error:', err)
        stopAllAudio()
        if (!controller.signal.aborted) {
          setAudioStatusMessage(
            t('firstAid.voiceError') ||
              'Audio playback is temporarily unavailable. Please follow the instructions below.'
          )
        }
        throw err
      } finally {
        setIsLoadingAudio(false)
      }
    },
    [stopAllAudio, t]
  )

  // Hybrid Read-Aloud logic: Prefer Sarvam TTS for Tamil, browser voice where available, clear offline notice
  const handleToggleReadAloud = useCallback(async () => {
    setAudioStatusMessage(null)

    // Stop if currently active or loading
    if (isPlayingAudio || isLoadingAudio) {
      stopAllAudio()
      return
    }

    if (!activeTopic) return
    stopAllAudio()

    const chunks = getTopicSpeechChunks(activeTopic, language)
    if (chunks.length === 0) return

    const langMap = {
      ta: 'ta-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      en: 'en-IN',
    }
    const targetLang = langMap[language] || 'en-IN'
    const matchedVoice = findBrowserVoice(targetLang)
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    // 1. For Tamil when online, prefer the high-quality backend Sarvam Tamil TTS
    if (language === 'ta' && isOnline) {
      try {
        await playSarvamAudioChunks(chunks, targetLang)
        return
      } catch (err) {
        console.warn('Sarvam Tamil TTS playback failed, checking browser voice fallback:', err)
        if (matchedVoice) {
          playBrowserSpeechChunks(chunks, targetLang, matchedVoice)
          return
        }
        return
      }
    }

    // 2. For English or languages with native browser voice, use browser voice directly
    if (matchedVoice) {
      playBrowserSpeechChunks(chunks, targetLang, matchedVoice)
      return
    }

    // 3. If offline and no browser voice available: clear fallback notice (never pretend audio is playing)
    if (!isOnline) {
      setIsPlayingAudio(false)
      setIsLoadingAudio(false)
      setAudioStatusMessage(
        t('firstAid.offlineVoiceUnavailable') ||
          'Voice read-aloud requires an internet connection on this device. Emergency instructions are available offline below.'
      )
      return
    }

    // 4. Online Sarvam AI TTS fallback for other regional languages without browser voice
    try {
      await playSarvamAudioChunks(chunks, targetLang)
    } catch {
      // Error message already handled in playSarvamAudioChunks
    }
  }, [
    isPlayingAudio,
    isLoadingAudio,
    activeTopic,
    language,
    getTopicSpeechChunks,
    findBrowserVoice,
    playBrowserSpeechChunks,
    playSarvamAudioChunks,
    stopAllAudio,
    t,
  ])

  // Handle Back Button navigation
  const handleBack = () => {
    if (selectedTopicId) {
      handleSelectTopic(null)
    } else if (onNavigate) {
      onNavigate(SCREENS.HOME)
    }
  }

  const handleCall108 = () => {
    window.location.href = 'tel:108'
  }

  // Urgency badge renderer
  const renderUrgencyBadge = (urgency) => {
    if (urgency === 'call_immediately') {
      return (
        <span className="efa-urgency-badge immediate">
          ⚠️ {t('firstAid.urgencyImmediate') || 'Call 108 Immediately'}
        </span>
      )
    }
    if (urgency === 'seek_care') {
      return (
        <span className="efa-urgency-badge urgent">
          🏥 {t('firstAid.urgencySeekCare') || 'Seek Medical Care'}
        </span>
      )
    }
    return (
      <span className="efa-urgency-badge monitor">
        🩺 {t('firstAid.urgencySelfManage') || 'First Aid & Monitor'}
      </span>
    )
  }

  return (
    <div className="efa-container">
      {/* Top Standard Header */}
      <Header
        title={t('firstAid.screenTitle') || 'Emergency First Aid Guide'}
        showBack
        onBack={handleBack}
        showLogo
        rightAction={
          <button
            type="button"
            className="sos-btn-header"
            onClick={handleCall108}
            aria-label="Call 108 Ambulance"
          >
            108
          </button>
        }
      />

      <main className="efa-content">
        {/* ========================================================
            DETAIL VIEW
        ======================================================== */}
        {activeTopic ? (
          <div className="efa-detail-wrapper">
            {/* Topic Header Card */}
            <article className="efa-detail-header-card">
              <div className="efa-detail-top-nav">
                <button
                  type="button"
                  className="efa-back-btn"
                  onClick={() => handleSelectTopic(null)}
                >
                  ← {t('firstAid.backToTopics') || 'Back to Topics'}
                </button>
                {renderUrgencyBadge(activeTopic.urgency)}
              </div>

              <div className="efa-detail-hero">
                <div className="efa-detail-icon" aria-hidden="true">
                  {activeTopic.icon}
                </div>
                <div className="efa-detail-heading">
                  <h1 className="efa-detail-title">{getLocalized(activeTopic.title)}</h1>
                  <p className="efa-detail-summary">{getLocalized(activeTopic.summary)}</p>
                </div>
              </div>

              {/* Action Buttons: Read Aloud + Call 108 */}
              <div className="efa-detail-actions">
                <button
                  type="button"
                  className="efa-btn-call-direct"
                  onClick={handleCall108}
                  aria-label="Call 108 Ambulance"
                >
                  🚨 {t('firstAid.call108Now') || 'Call 108 Ambulance'}
                </button>

                {['choking', 'burns', 'heart_attack', 'unconsciousness'].includes(activeTopic.id) && (
                  <button
                    type="button"
                    className="efa-text-guide-link"
                    style={{ background: '#0284c7', color: '#ffffff', borderColor: '#0284c7' }}
                    onClick={() => {
                      stopAllAudio()
                      setSelectedTopicId(null)
                      setViewMode('videos')
                    }}
                  >
                    <span>🎥</span>
                    <span>{t('firstAid.watchVideo') || 'Watch Video Demonstration'}</span>
                  </button>
                )}

                {ttsSupported && (
                  <button
                    type="button"
                    className={`efa-btn-read-aloud ${isPlayingAudio ? 'playing' : ''} ${isLoadingAudio ? 'loading' : ''}`}
                    onClick={handleToggleReadAloud}
                    aria-label={
                      isLoadingAudio
                        ? (t('firstAid.loadingAudio') || 'Loading Audio')
                        : isPlayingAudio
                        ? (t('firstAid.stopReading') || 'Stop Audio')
                        : (t('firstAid.readAloud') || 'Read Aloud')
                    }
                  >
                    {isLoadingAudio ? (
                      <>⏳ {t('firstAid.loadingAudio') || 'Loading Audio...'}</>
                    ) : isPlayingAudio ? (
                      <>⏹ {t('firstAid.stopReading') || 'Stop Audio'}</>
                    ) : (
                      <>🔊 {t('firstAid.readAloud') || 'Read Aloud'}</>
                    )}
                  </button>
                )}
              </div>

              {/* Informative notice for offline voice fallback or network errors */}
              {audioStatusMessage && (
                <div className="efa-audio-notice" role="status" aria-live="polite">
                  <span className="efa-audio-notice-icon" aria-hidden="true">ℹ️</span>
                  <span className="efa-audio-notice-text">{audioStatusMessage}</span>
                  <button
                    type="button"
                    className="efa-audio-notice-close"
                    onClick={() => setAudioStatusMessage(null)}
                    aria-label="Dismiss notice"
                  >
                    ✕
                  </button>
                </div>
              )}
            </article>

            {/* Red Flag Warnings Box */}
            {activeTopic.warnings && activeTopic.warnings.length > 0 && (
              <section className="efa-warnings-box" aria-label="Emergency Warnings">
                <div className="efa-warnings-header">
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <h2 className="efa-warnings-title">
                    {t('firstAid.redFlagsTitle') || 'Emergency Red Flags (Call 108 Now)'}
                  </h2>
                </div>
                <ul className="efa-warnings-list">
                  {activeTopic.warnings.map((warning, wIdx) => (
                    <li key={wIdx}>{getLocalized(warning)}</li>
                  ))}
                </ul>
              </section>
            )}

            {/* Step-by-Step Action Cards */}
            <section className="efa-steps-section">
              <h2 className="efa-steps-header">
                <span>📋</span>
                <span>{t('firstAid.stepByStepTitle') || 'Step-by-Step Action Plan'}</span>
              </h2>

              {activeTopic.steps &&
                activeTopic.steps.map((step, sIdx) => (
                  <article key={sIdx} className="efa-step-card">
                    <div className="efa-step-badge-row">
                      <span className="efa-step-number-badge">
                        {t('firstAid.stepNum', { number: step.stepNumber || sIdx + 1 }) ||
                          `Step ${step.stepNumber || sIdx + 1}`}
                      </span>
                    </div>

                    <h3 className="efa-step-title">{getLocalized(step.title)}</h3>
                    <p className="efa-step-text">{getLocalized(step.text)}</p>

                    {/* What NOT to do Box */}
                    {step.doNot && (
                      <div className="efa-donot-box">
                        <span className="efa-donot-icon" aria-hidden="true">🚫</span>
                        <div className="efa-donot-content">
                          <div className="efa-donot-label">
                            {t('firstAid.whatNotToDo') || 'What NOT To Do'}
                          </div>
                          <p className="efa-donot-text">{getLocalized(step.doNot)}</p>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
            </section>

            {/* Disclaimer */}
            <footer className="efa-disclaimer">
              {t('firstAid.disclaimer') ||
                'This guide provides emergency stabilization steps while waiting for professional medical assistance. Always call 108 in critical emergencies.'}
            </footer>
          </div>
        ) : (
          /* ========================================================
              TOPIC SELECTION / DIRECTORY VIEW
          ======================================================== */
          <div className="efa-directory-wrapper">
            {/* Top Red Emergency Bar */}
            <section className="efa-hero-bar">
              <div className="efa-hero-info">
                <div className="efa-hero-icon-box" aria-hidden="true">
                  🚑
                </div>
                <div>
                  <h1 className="efa-hero-title">
                    {t('firstAid.screenTitle') || 'Emergency First Aid Guide'}
                  </h1>
                  <p className="efa-hero-subtitle">
                    {t('firstAid.subtitle') || 'Instant offline life-saving instructions'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="efa-hero-call-btn"
                onClick={handleCall108}
                aria-label="Call 108 Ambulance"
              >
                <span>📞</span>
                <span>{t('firstAid.callAmbulanceBtn') || 'Call 108 Ambulance'}</span>
              </button>
            </section>

            {/* View Mode Switcher: Step-by-Step Guides vs Video Demonstration Library */}
            <nav className="efa-mode-nav-tabs" role="tablist" aria-label="First aid section">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'guides'}
                className={`efa-mode-tab-btn ${viewMode === 'guides' ? 'active' : ''}`}
                onClick={() => setViewMode('guides')}
              >
                <span>📋</span>
                <span>{t('firstAid.guidesTab') || 'First Aid Guides'}</span>
                <span className="efa-tab-count-pill">{topics.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'videos'}
                className={`efa-mode-tab-btn ${viewMode === 'videos' ? 'active' : ''}`}
                onClick={() => setViewMode('videos')}
              >
                <span>🎥</span>
                <span>{t('firstAid.videosTab') || 'Video Demonstrations (3)'}</span>
                <span className="efa-tab-count-pill">3</span>
              </button>
            </nav>

            {viewMode === 'videos' ? (
              /* Preloaded Offline First-Aid Video Demonstration Library */
              <FirstAidVideoLibrary
                onSelectGuide={(guideTopicId) => {
                  handleSelectTopic(guideTopicId)
                  setViewMode('guides')
                }}
              />
            ) : (
              /* Existing Text-Based First Aid Topics Directory */
              <>
                {/* Offline Ready Badge Row */}
                <div className="efa-offline-badge-row">
                  <span className="efa-offline-pill">
                    <span className="efa-pulse-dot" />
                    {t('firstAid.offlineReadyBadge') || '100% Offline • Works Without Internet'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                    {filteredTopics.length} {t('firstAid.allCategories') || 'Topics'}
                  </span>
                </div>

                {/* Search Input */}
                <div className="efa-search-wrapper">
                  <span className="efa-search-icon" aria-hidden="true">🔍</span>
                  <input
                    type="text"
                    className="efa-search-input"
                    placeholder={t('firstAid.searchPlaceholder') || 'Search emergency (e.g. Snake bite, Burns)...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search emergency topic"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="efa-search-clear"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Category Filter Pills */}
                <div className="efa-categories-scroller" role="tablist" aria-label="Category filter">
                  {CATEGORIES.map((cat) => {
                    const isActive = selectedCategory === cat.id
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={`efa-category-chip ${isActive ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                      >
                        <span>{cat.icon}</span>
                        <span>{getLocalized(cat.label)}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Topics Grid */}
                {filteredTopics.length > 0 ? (
                  <div className="efa-grid">
                    {filteredTopics.map((topic) => (
                      <article
                        key={topic.id}
                        className="efa-topic-card"
                        tabIndex={0}
                        role="button"
                        onClick={() => handleSelectTopic(topic.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleSelectTopic(topic.id)
                          }
                        }}
                      >
                        <div className="efa-card-top">
                          <div className="efa-card-icon" aria-hidden="true">
                            {topic.icon}
                          </div>
                          <div className="efa-card-info">
                            <h2 className="efa-card-title">{getLocalized(topic.title)}</h2>
                            <p className="efa-card-summary">{getLocalized(topic.summary)}</p>
                          </div>
                        </div>

                        <div className="efa-card-footer">
                          {renderUrgencyBadge(topic.urgency)}
                          <span className="efa-view-action">
                            {t('common.viewAll') || 'Steps'} →
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="efa-empty-state">
                    <div className="efa-empty-icon" aria-hidden="true">🩹</div>
                    <p className="efa-empty-text">
                      {t('firstAid.noTopicsFound', { query: searchQuery }) ||
                        `No emergency topics matching "${searchQuery}"`}
                    </p>
                    <button
                      type="button"
                      className="efa-back-btn"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedCategory('all')
                      }}
                    >
                      {t('firstAid.clearSearch') || 'Clear Filters'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Bottom Disclaimer */}
            <footer className="efa-disclaimer">
              {t('firstAid.disclaimer') ||
                'This guide provides emergency stabilization steps while waiting for professional medical assistance. Always call 108 in critical emergencies.'}
            </footer>
          </div>
        )}
      </main>
    </div>
  )
}
