/**
 * videoCacheService.js
 * ====================
 * CacheStorage service for preloaded offline emergency first-aid videos.
 * Handles cache checks, background preloading, progressive download tracking,
 * and offline blob retrieval for Nalam Connect.
 */

export const VIDEO_CACHE_NAME = 'nalam-first-aid-videos-v1'

/**
 * Check if a single video URL is cached in CacheStorage.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
export async function isVideoCached(url) {
  if (typeof caches === 'undefined') return false
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME)
    const match = await cache.match(url)
    return Boolean(match)
  } catch (err) {
    console.warn('[videoCacheService] isVideoCached error:', err)
    return false
  }
}

/**
 * Check caching status for a batch of video URLs.
 * @param {string[]} urls
 * @returns {Promise<Record<string, boolean>>}
 */
export async function getAllCachedStatuses(urls = []) {
  const result = {}
  if (typeof caches === 'undefined') {
    urls.forEach((u) => { result[u] = false })
    return result
  }

  try {
    const cache = await caches.open(VIDEO_CACHE_NAME)
    for (const url of urls) {
      const match = await cache.match(url)
      result[url] = Boolean(match)
    }
  } catch (err) {
    console.warn('[videoCacheService] getAllCachedStatuses error:', err)
    urls.forEach((u) => { result[u] = false })
  }
  return result
}

/**
 * Return playable URL for a video (object URL if cached offline, else remote URL).
 * @param {string} videoUrl
 * @returns {Promise<{ url: string, isOffline: boolean }>}
 */
export async function getPlayableVideoUrl(videoUrl) {
  if (typeof caches === 'undefined') {
    return { url: videoUrl, isOffline: false }
  }

  try {
    const cache = await caches.open(VIDEO_CACHE_NAME)
    const match = await cache.match(videoUrl)
    if (match) {
      const blob = await match.blob()
      const objectUrl = URL.createObjectURL(blob)
      return { url: objectUrl, isOffline: true }
    }
  } catch (err) {
    console.warn('[videoCacheService] getPlayableVideoUrl error:', err)
  }

  return { url: videoUrl, isOffline: false }
}

/**
 * Download a video and store it in CacheStorage with progress reporting.
 * @param {string} videoUrl
 * @param {(progress: { percent: number, loaded: number, total: number }) => void} [onProgress]
 * @param {AbortSignal} [signal]
 * @returns {Promise<boolean>}
 */
export async function downloadVideoForOffline(videoUrl, onProgress = null, signal = null) {
  if (typeof caches === 'undefined') {
    throw new Error('CacheStorage is not supported in this browser environment.')
  }

  const response = await fetch(videoUrl, { signal })
  if (!response.ok) {
    throw new Error(`Failed to download video (${response.status} ${response.statusText})`)
  }

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? parseInt(contentLength, 10) : 0

  let bodyToCache
  if (response.body && total > 0 && typeof ReadableStream !== 'undefined') {
    const reader = response.body.getReader()
    let loaded = 0
    const chunks = []

    while (true) {
      if (signal?.aborted) {
        throw new Error('Video download aborted.')
      }

      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.length

      if (onProgress) {
        const percent = Math.min(100, Math.round((loaded / total) * 100))
        onProgress({ percent, loaded, total })
      }
    }

    const blob = new Blob(chunks, { type: 'video/mp4' })
    bodyToCache = new Response(blob, {
      headers: {
        'content-type': 'video/mp4',
        'content-length': String(blob.size),
      },
    })
  } else {
    // Fallback if ReadableStream chunking is not available
    const blob = await response.blob()
    if (onProgress) {
      onProgress({ percent: 100, loaded: blob.size, total: blob.size })
    }
    bodyToCache = new Response(blob, {
      headers: {
        'content-type': 'video/mp4',
        'content-length': String(blob.size),
      },
    })
  }

  const cache = await caches.open(VIDEO_CACHE_NAME)
  await cache.put(videoUrl, bodyToCache)
  return true
}

/**
 * Remove a cached video from CacheStorage.
 * @param {string} videoUrl
 * @returns {Promise<boolean>}
 */
export async function removeCachedVideo(videoUrl) {
  if (typeof caches === 'undefined') return false
  try {
    const cache = await caches.open(VIDEO_CACHE_NAME)
    return await cache.delete(videoUrl)
  } catch (err) {
    console.warn('[videoCacheService] removeCachedVideo error:', err)
    return false
  }
}

/**
 * Automatically batch cache multiple videos sequentially in background.
 * @param {Array<{ id: string, videoUrl: string }>} videos
 * @param {(status: {
 *   activeVideoId: string | null,
 *   activePercent: number,
 *   completedCount: number,
 *   totalCount: number,
 *   isComplete: boolean,
 *   error?: string | null
 * }) => void} onUpdate
 * @param {AbortSignal} [signal]
 */
export async function autoCacheVideosBatch(videos = [], onUpdate = null, signal = null) {
  const totalCount = videos.length
  let completedCount = 0

  // 1. Initial check of what is already cached
  const statuses = await getAllCachedStatuses(videos.map((v) => v.videoUrl))
  completedCount = Object.values(statuses).filter(Boolean).length

  if (completedCount === totalCount) {
    onUpdate?.({
      activeVideoId: null,
      activePercent: 100,
      completedCount,
      totalCount,
      isComplete: true,
      error: null,
    })
    return
  }

  onUpdate?.({
    activeVideoId: null,
    activePercent: 0,
    completedCount,
    totalCount,
    isComplete: false,
    error: null,
  })

  // 2. Download missing videos one by one
  for (const video of videos) {
    if (signal?.aborted) break

    const isCached = statuses[video.videoUrl]
    if (isCached) continue

    onUpdate?.({
      activeVideoId: video.id,
      activePercent: 1,
      completedCount,
      totalCount,
      isComplete: false,
      error: null,
    })

    try {
      await downloadVideoForOffline(
        video.videoUrl,
        ({ percent }) => {
          onUpdate?.({
            activeVideoId: video.id,
            activePercent: percent,
            completedCount,
            totalCount,
            isComplete: false,
            error: null,
          })
        },
        signal
      )
      completedCount += 1
      statuses[video.videoUrl] = true
    } catch (err) {
      if (signal?.aborted) break
      console.warn(`[videoCacheService] Failed auto-caching ${video.id}:`, err)
      onUpdate?.({
        activeVideoId: video.id,
        activePercent: 0,
        completedCount,
        totalCount,
        isComplete: false,
        error: err.message,
      })
      // Continue with remaining videos
    }
  }

  onUpdate?.({
    activeVideoId: null,
    activePercent: completedCount === totalCount ? 100 : 0,
    completedCount,
    totalCount,
    isComplete: completedCount === totalCount,
    error: null,
  })
}
