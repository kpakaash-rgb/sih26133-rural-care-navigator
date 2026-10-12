import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from '../i18n'
import { FIRST_AID_VIDEOS, VIDEO_CATEGORIES } from '../data/firstAidVideosData'
import {
  getAllCachedStatuses,
  downloadVideoForOffline,
  removeCachedVideo,
  getPlayableVideoUrl,
  autoCacheVideosBatch,
} from '../services/videoCacheService'

export default function FirstAidVideoLibrary({ onSelectGuide = null }) {
  const { language, t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cachedStatuses, setCachedStatuses] = useState({})
  const [downloadProgress, setDownloadProgress] = useState({}) // { [videoId]: percent }
  const [downloadErrors, setDownloadErrors] = useState({}) // { [videoId]: errorMessage }
  const [activeTranscriptLang, setActiveTranscriptLang] = useState(language === 'ta' ? 'ta' : 'en')
  const [playableUrls, setPlayableUrls] = useState({}) // { [videoId]: { url, isOffline } }
  const [playbackErrors, setPlaybackErrors] = useState({}) // { [videoId]: true }

  // Batch auto-caching state
  const [batchStatus, setBatchStatus] = useState({
    isAutoCaching: false,
    activeVideoId: null,
    activePercent: 0,
    completedCount: 0,
    totalCount: FIRST_AID_VIDEOS.length,
    isComplete: false,
    error: null,
  })

  const isAutoCachingStartedRef = useRef(false)
  const abortControllerRef = useRef(null)

  // Sync transcript tab when app language changes
  useEffect(() => {
    setActiveTranscriptLang(language === 'ta' ? 'ta' : 'en')
  }, [language])

  // Helper to resolve localized text from object
  const getLocalized = useCallback((obj, lang = language) => {
    if (!obj) return ''
    if (typeof obj === 'string') return obj
    return obj[lang] || obj.en || Object.values(obj)[0] || ''
  }, [language])

  // Refresh status of all videos from CacheStorage
  const refreshCacheStatuses = useCallback(async () => {
    const urls = FIRST_AID_VIDEOS.map((v) => v.videoUrl)
    const statuses = await getAllCachedStatuses(urls)
    setCachedStatuses(statuses)

    // Resolve playable object URLs for cached items
    const resolved = {}
    for (const video of FIRST_AID_VIDEOS) {
      const res = await getPlayableVideoUrl(video.videoUrl)
      resolved[video.id] = res
    }
    setPlayableUrls(resolved)

    const cachedCount = Object.values(statuses).filter(Boolean).length
    return { statuses, cachedCount }
  }, [])

  // Auto-cache missing videos in background on initial online visit
  const startAutoCache = useCallback(async () => {
    if (isAutoCachingStartedRef.current) return
    isAutoCachingStartedRef.current = true

    // 1. Check existing cache
    const { cachedCount } = await refreshCacheStatuses()

    if (cachedCount === FIRST_AID_VIDEOS.length) {
      // All 3 videos are already cached; no network downloads needed!
      setBatchStatus({
        isAutoCaching: false,
        activeVideoId: null,
        activePercent: 100,
        completedCount: FIRST_AID_VIDEOS.length,
        totalCount: FIRST_AID_VIDEOS.length,
        isComplete: true,
        error: null,
      })
      return
    }

    // 2. Check online status
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
    if (!isOnline) {
      setBatchStatus({
        isAutoCaching: false,
        activeVideoId: null,
        activePercent: 0,
        completedCount: cachedCount,
        totalCount: FIRST_AID_VIDEOS.length,
        isComplete: false,
        error: t('firstAid.offlineInitRequired') || 'Initial caching requires an internet connection.',
      })
      isAutoCachingStartedRef.current = false
      return
    }

    // 3. Begin background auto-caching of missing videos
    setBatchStatus((prev) => ({
      ...prev,
      isAutoCaching: true,
      error: null,
    }))

    abortControllerRef.current = new AbortController()

    try {
      await autoCacheVideosBatch(
        FIRST_AID_VIDEOS,
        (update) => {
          setBatchStatus({
            isAutoCaching: !update.isComplete,
            activeVideoId: update.activeVideoId,
            activePercent: update.activePercent,
            completedCount: update.completedCount,
            totalCount: update.totalCount,
            isComplete: update.isComplete,
            error: update.error || null,
          })

          if (update.activeVideoId && typeof update.activePercent === 'number') {
            setDownloadProgress((prev) => ({
              ...prev,
              [update.activeVideoId]: update.activePercent,
            }))
          }

          // If a video just finished, update cache statuses
          if (update.activePercent === 100 && update.activeVideoId) {
            refreshCacheStatuses()
          }
        },
        abortControllerRef.current.signal
      )

      await refreshCacheStatuses()
    } catch (err) {
      console.warn('[FirstAidVideoLibrary] Auto-cache batch error:', err)
      setBatchStatus((prev) => ({
        ...prev,
        isAutoCaching: false,
        error: err.message,
      }))
    }
  }, [refreshCacheStatuses, t])

  // Mount effect: check cache and trigger auto-cache
  useEffect(() => {
    refreshCacheStatuses()
    startAutoCache()

    // Listen to online event to resume auto-caching if initial attempt was offline
    const handleOnlineResume = () => {
      isAutoCachingStartedRef.current = false
      startAutoCache()
    }

    window.addEventListener('online', handleOnlineResume)

    return () => {
      window.removeEventListener('online', handleOnlineResume)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [refreshCacheStatuses, startAutoCache])

  // Filter videos by selected category
  const filteredVideos = useMemo(() => {
    if (selectedCategory === 'all') return FIRST_AID_VIDEOS
    return FIRST_AID_VIDEOS.filter((v) => v.categoryKey === selectedCategory)
  }, [selectedCategory])

  // Manual retry handler for failed video downloads
  const handleRetryDownload = async (video) => {
    const videoId = video.id
    setDownloadErrors((prev) => ({ ...prev, [videoId]: null }))
    setDownloadProgress((prev) => ({ ...prev, [videoId]: 1 }))

    try {
      await downloadVideoForOffline(
        video.videoUrl,
        ({ percent }) => {
          setDownloadProgress((prev) => ({ ...prev, [videoId]: Math.max(1, percent) }))
        }
      )

      await refreshCacheStatuses()
      setDownloadProgress((prev) => {
        const copy = { ...prev }
        delete copy[videoId]
        return copy
      })
    } catch (err) {
      console.error(`Retry download failed for ${video.id}:`, err)
      setDownloadErrors((prev) => ({
        ...prev,
        [videoId]: err.message || 'Download failed. Please check connection.',
      }))
      setDownloadProgress((prev) => {
        const copy = { ...prev }
        delete copy[videoId]
        return copy
      })
    }
  }

  // Handle removal of offline cached copy
  const handleRemove = async (video) => {
    const confirmMsg = t('firstAid.confirmRemove') || 'Remove offline video from this device?'
    if (!window.confirm(confirmMsg)) return

    await removeCachedVideo(video.videoUrl)
    await refreshCacheStatuses()
    isAutoCachingStartedRef.current = false
  }

  const allCached = batchStatus.completedCount === FIRST_AID_VIDEOS.length && batchStatus.isComplete
  const activeVideo = FIRST_AID_VIDEOS.find((v) => v.id === batchStatus.activeVideoId)

  return (
    <div className="efa-video-library">
      {/* Automatic Offline Preload Status Banner */}
      <section className="efa-autocache-banner" aria-live="polite">
        {batchStatus.isAutoCaching ? (
          <div className="efa-autocache-loading-box">
            <div className="efa-autocache-info-row">
              <span className="efa-autocache-pulse" aria-hidden="true">⚡</span>
              <div className="efa-autocache-text-wrap">
                <strong className="efa-autocache-title">
                  {t('firstAid.preparingOfflineVideos') || 'Preparing offline videos... Caching for emergency use'}
                </strong>
                <span className="efa-autocache-detail">
                  {activeVideo ? getLocalized(activeVideo.title) : 'First-Aid Videos'} —{' '}
                  {batchStatus.activePercent}% ({batchStatus.completedCount}/{batchStatus.totalCount} completed)
                </span>
              </div>
            </div>
            {/* Live Progress Bar */}
            <div className="efa-progress-track" style={{ marginTop: '8px' }}>
              <div
                className="efa-progress-fill"
                style={{
                  width: `${Math.round(
                    ((batchStatus.completedCount * 100 + batchStatus.activePercent) /
                      (batchStatus.totalCount * 100)) *
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : allCached ? (
          <div className="efa-autocache-success-box">
            <span className="efa-autocache-success-icon" aria-hidden="true">✓</span>
            <span className="efa-autocache-success-text">
              {t('firstAid.allVideosCached') ||
                'All 3 demonstration videos are verified and ready for 100% offline use.'}
            </span>
          </div>
        ) : batchStatus.error ? (
          <div className="efa-autocache-notice-box">
            <span className="efa-autocache-notice-icon" aria-hidden="true">ℹ️</span>
            <div className="efa-autocache-notice-text">
              <span>{batchStatus.error}</span>
            </div>
          </div>
        ) : null}
      </section>

      {/* Video Category Filter Chips */}
      <div className="efa-categories-scroller" role="tablist" aria-label="Video category filter">
        {VIDEO_CATEGORIES.map((cat) => {
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

      {/* Videos List Grid */}
      <div className="efa-video-grid">
        {filteredVideos.map((video) => {
          const isCached = Boolean(cachedStatuses[video.videoUrl])
          const progress = downloadProgress[video.id]
          const isDownloading =
            (batchStatus.isAutoCaching && batchStatus.activeVideoId === video.id) ||
            typeof progress === 'number'
          const displayPercent =
            batchStatus.activeVideoId === video.id ? batchStatus.activePercent : progress || 0
          const error = downloadErrors[video.id]
          const playbackErr = playbackErrors[video.id]
          const playable = playableUrls[video.id] || { url: video.videoUrl, isOffline: isCached }

          const enTranscript = video.transcripts?.en
          const taTranscript = video.transcripts?.ta
          const currentTranscript = activeTranscriptLang === 'ta' ? taTranscript : enTranscript

          return (
            <article key={video.id} className="efa-video-card">
              {/* Card Header: Icon, Title, Category & Offline Badge */}
              <div className="efa-video-header">
                <div className="efa-video-title-row">
                  <span className="efa-video-icon" aria-hidden="true">{video.icon}</span>
                  <div>
                    <h2 className="efa-video-title">{getLocalized(video.title)}</h2>
                    <div className="efa-video-meta">
                      <span className="efa-video-category-tag">
                        {t('firstAid.category') || 'Category'}: {getLocalized(video.category)}
                      </span>
                      {video.duration && (
                        <span className="efa-video-duration-tag">
                          ⏱ {video.duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Verified Offline Status Indicator Badge */}
                <div className="efa-video-status-badge">
                  {isCached ? (
                    <span className="efa-badge-offline" title="Verified in device offline storage">
                      ⚡ {t('firstAid.availableOffline') || 'Available Offline'}
                    </span>
                  ) : isDownloading ? (
                    <span className="efa-badge-downloading">
                      ⏳ {t('firstAid.downloading') || 'Downloading'} {displayPercent}%
                    </span>
                  ) : (
                    <span className="efa-badge-online" title="Ready to auto-cache once online">
                      🌐 {t('firstAid.onlineOnly') || 'Preparing...'}
                    </span>
                  )}
                </div>
              </div>

              {/* Video Player */}
              <div className="efa-video-player-container">
                <video
                  key={`${video.id}-${isCached ? 'cached' : 'stream'}`}
                  className="efa-video-element"
                  controls
                  playsInline
                  preload="metadata"
                  src={playable.url}
                  onError={() => {
                    setPlaybackErrors((prev) => ({ ...prev, [video.id]: true }))
                  }}
                  onLoadedData={() => {
                    setPlaybackErrors((prev) => ({ ...prev, [video.id]: false }))
                  }}
                >
                  <p>
                    Your browser does not support HTML5 video.{' '}
                    <a href={video.videoUrl} download>Download {video.fileName}</a>
                  </p>
                </video>

                {playbackErr && (
                  <div className="efa-video-missing-alert" role="alert">
                    <span className="efa-alert-icon">ℹ️</span>
                    <div>
                      <strong>MP4 file location:</strong>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                        Ensure <code>{video.fileName}</code> exists in{' '}
                        <code>frontend/public/first-aid/videos/{video.fileName}</code>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Summary Description */}
              <p className="efa-video-summary">{getLocalized(video.summary)}</p>

              {/* Progress Bar (Visible while downloading) */}
              {isDownloading && !isCached && (
                <div className="efa-download-progress-box">
                  <div className="efa-progress-labels">
                    <span>{t('firstAid.downloading') || 'Saving for offline playback...'}</span>
                    <span>{displayPercent}%</span>
                  </div>
                  <div className="efa-progress-track">
                    <div
                      className="efa-progress-fill"
                      style={{ width: `${displayPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message if download fails */}
              {error && (
                <div className="efa-video-error-alert" role="alert">
                  <span>⚠️ {error}</span>
                  <button
                    type="button"
                    className="efa-alert-close-btn"
                    onClick={() => setDownloadErrors((prev) => ({ ...prev, [video.id]: null }))}
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Action / Verified State Bar */}
              <div className="efa-video-actions-bar">
                {isCached ? (
                  <div className="efa-saved-actions-group">
                    <span className="efa-saved-verified-text">
                      ✓ {t('firstAid.availableOffline') || 'Saved on this device (Plays Offline)'}
                    </span>
                    <button
                      type="button"
                      className="efa-remove-btn"
                      onClick={() => handleRemove(video)}
                      title="Remove from device to free space"
                      aria-label="Remove offline copy"
                    >
                      🗑 {t('firstAid.removeBtn') || 'Remove Offline Copy'}
                    </button>
                  </div>
                ) : error ? (
                  <button
                    type="button"
                    className="efa-download-btn"
                    onClick={() => handleRetryDownload(video)}
                    aria-label={`Retry caching ${getLocalized(video.title)}`}
                  >
                    <span>🔄</span>
                    <span>{t('firstAid.retryDownload') || 'Retry Download'}</span>
                  </button>
                ) : isDownloading ? (
                  <span className="efa-saved-verified-text" style={{ color: '#0284c7' }}>
                    ⏳ {t('firstAid.downloading') || 'Caching in background...'} ({displayPercent}%)
                  </span>
                ) : (
                  <span className="efa-saved-verified-text" style={{ color: '#64748b' }}>
                    ⏳ {t('firstAid.preparingOfflineVideos') || 'Queued for offline caching'}
                  </span>
                )}

                {/* Link to Step-by-Step Guide if available */}
                {onSelectGuide && (
                  <button
                    type="button"
                    className="efa-text-guide-link"
                    onClick={() => onSelectGuide(video.id)}
                  >
                    <span>📋</span>
                    <span>{t('firstAid.stepByStepTitle') || 'View Text Guide'}</span>
                  </button>
                )}
              </div>

              {/* Video Transcripts Section */}
              <div className="efa-transcript-section">
                <div className="efa-transcript-header">
                  <h3 className="efa-transcript-title">
                    <span>📝</span>
                    <span>{t('firstAid.transcriptTitle') || 'Video Transcript'}</span>
                  </h3>

                  {/* English & Tamil Language Tabs */}
                  <div className="efa-transcript-lang-tabs" role="tablist" aria-label="Transcript Language">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTranscriptLang === 'en'}
                      className={`efa-transcript-lang-btn ${activeTranscriptLang === 'en' ? 'active' : ''}`}
                      onClick={() => setActiveTranscriptLang('en')}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTranscriptLang === 'ta'}
                      className={`efa-transcript-lang-btn ${activeTranscriptLang === 'ta' ? 'active' : ''}`}
                      onClick={() => setActiveTranscriptLang('ta')}
                    >
                      தமிழ்
                    </button>
                  </div>
                </div>

                <div className="efa-transcript-body">
                  {currentTranscript ? (
                    <div className="efa-transcript-content">
                      {Array.isArray(currentTranscript) ? (
                        <ol className="efa-transcript-steps">
                          {currentTranscript.map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                        </ol>
                      ) : (
                        <p>{currentTranscript}</p>
                      )}
                    </div>
                  ) : (
                    <p className="efa-transcript-unavailable">
                      ℹ️ {t('firstAid.transcriptNotAvailable') || 'Transcript not available.'}
                    </p>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
