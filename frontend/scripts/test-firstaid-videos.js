/**
 * test-firstaid-videos.js
 * =======================
 * End-to-end verification suite for the Preloaded Offline First-Aid Video Library.
 */

import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

test('Video Library: Catalog data integrity and display details', async () => {
  const { FIRST_AID_VIDEOS, VIDEO_CATEGORIES } = await import('../src/data/firstAidVideosData.js')

  assert.strictEqual(FIRST_AID_VIDEOS.length, 3, 'Must define exactly 3 preloaded videos')

  const choking = FIRST_AID_VIDEOS.find((v) => v.id === 'choking')
  const burns = FIRST_AID_VIDEOS.find((v) => v.id === 'burns')
  const cpr = FIRST_AID_VIDEOS.find((v) => v.id === 'cpr')

  assert.ok(choking, 'Choking video exists')
  assert.ok(burns, 'Burns video exists')
  assert.ok(cpr, 'CPR video exists')

  // Check required display details
  assert.strictEqual(choking.title.en, 'First Aid for Choking')
  assert.strictEqual(choking.category.en, 'Choking')
  assert.strictEqual(choking.videoUrl, '/first-aid/videos/choking.mp4')
  assert.strictEqual(choking.fileName, 'choking.mp4')

  assert.strictEqual(burns.title.en, 'First Aid for Burns')
  assert.strictEqual(burns.category.en, 'Burns')
  assert.strictEqual(burns.videoUrl, '/first-aid/videos/burns.mp4')
  assert.strictEqual(burns.fileName, 'burns.mp4')

  assert.strictEqual(cpr.title.en, 'CPR Demonstration')
  assert.strictEqual(cpr.category.en, 'CPR')
  assert.strictEqual(cpr.videoUrl, '/first-aid/videos/cpr.mp4')
  assert.strictEqual(cpr.fileName, 'cpr.mp4')

  // Transcripts optional and non-fabricated
  for (const v of [choking, burns, cpr]) {
    assert.ok('transcripts' in v, `${v.id} has transcripts container`)
    assert.ok('en' in v.transcripts, `${v.id} has English transcript slot`)
    assert.ok('ta' in v.transcripts, `${v.id} has Tamil transcript slot`)
  }

  // Categories
  assert.strictEqual(VIDEO_CATEGORIES.length, 4, 'Categories: All, Choking, Burns, CPR')
})

test('Video Cache Service: Exports and cache naming', async () => {
  const service = await import('../src/services/videoCacheService.js')
  assert.strictEqual(service.VIDEO_CACHE_NAME, 'nalam-first-aid-videos-v1')
  assert.strictEqual(typeof service.isVideoCached, 'function')
  assert.strictEqual(typeof service.getAllCachedStatuses, 'function')
  assert.strictEqual(typeof service.getPlayableVideoUrl, 'function')
  assert.strictEqual(typeof service.downloadVideoForOffline, 'function')
  assert.strictEqual(typeof service.removeCachedVideo, 'function')
  assert.strictEqual(typeof service.autoCacheVideosBatch, 'function', 'autoCacheVideosBatch is exported')
})

test('Vite PWA Config: Workbox runtime caching for video assets', () => {
  const viteConfig = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf-8')
  assert.ok(viteConfig.includes('nalam-first-aid-videos-v1'), 'Cache storage name matches service')
  assert.ok(viteConfig.includes('first-aid\\/videos'), 'Runtime caching pattern for first-aid videos exists')
  assert.ok(viteConfig.includes('CacheFirst'), 'CacheFirst strategy used for offline video playback')
  assert.ok(viteConfig.includes('ignored:'), 'Vite watch ignores large video files to avoid Windows file locks')
})

test('Multilingual Translations: Video library and auto-caching keys present in all languages', async () => {
  const { translations } = await import('../src/i18n/translations.js')

  for (const lang of ['en', 'ta', 'hi', 'mr']) {
    const fa = translations[lang].firstAid
    assert.ok(fa, `firstAid translations exist for ${lang}`)
    assert.ok(fa.videoLibraryTitle, `videoLibraryTitle exists in ${lang}`)
    assert.ok(fa.guidesTab, `guidesTab exists in ${lang}`)
    assert.ok(fa.videosTab, `videosTab exists in ${lang}`)
    assert.ok(fa.availableOffline, `availableOffline exists in ${lang}`)
    assert.ok(fa.onlineOnly, `onlineOnly exists in ${lang}`)
    assert.ok(fa.downloadBtn, `downloadBtn exists in ${lang}`)
    assert.ok(fa.transcriptNotAvailable, `transcriptNotAvailable exists in ${lang}`)
    assert.ok(fa.preparingOfflineVideos, `preparingOfflineVideos exists in ${lang}`)
    assert.ok(fa.allVideosCached, `allVideosCached exists in ${lang}`)
    assert.ok(fa.offlineInitRequired, `offlineInitRequired exists in ${lang}`)
    assert.ok(fa.retryDownload, `retryDownload exists in ${lang}`)
  }

  // Verify English and Tamil specific texts
  assert.strictEqual(translations.en.firstAid.transcriptNotAvailable, 'Transcript not available.')
  assert.strictEqual(translations.ta.firstAid.transcriptNotAvailable, 'உரை விளக்கம் தற்போது கிடைக்கவில்லை.')
})

test('Component Integration: EmergencyFirstAid renders video library', () => {
  const efaSource = fs.readFileSync(path.join(root, 'src/pages/patient/EmergencyFirstAid.jsx'), 'utf-8')
  assert.ok(efaSource.includes('FirstAidVideoLibrary'), 'Imports FirstAidVideoLibrary')
  assert.ok(efaSource.includes('efa-mode-nav-tabs'), 'Renders mode navigation tabs')
  assert.ok(efaSource.includes('viewMode'), 'Manages viewMode state')

  const compIndex = fs.readFileSync(path.join(root, 'src/components/index.js'), 'utf-8')
  assert.ok(compIndex.includes('FirstAidVideoLibrary'), 'Exported from components index')
})

test('Real MP4 Assets: All three video files exist with valid sizes', () => {
  const targetDir = path.join(root, 'public/first-aid/videos')
  assert.ok(fs.existsSync(targetDir), 'public/first-aid/videos directory exists')

  const chokingPath = path.join(targetDir, 'choking.mp4')
  const burnsPath = path.join(targetDir, 'burns.mp4')
  const cprPath = path.join(targetDir, 'cpr.mp4')

  assert.ok(fs.existsSync(chokingPath), 'choking.mp4 exists')
  assert.ok(fs.existsSync(burnsPath), 'burns.mp4 exists')
  assert.ok(fs.existsSync(cprPath), 'cpr.mp4 exists')

  const chokingStat = fs.statSync(chokingPath)
  const burnsStat = fs.statSync(burnsPath)
  const cprStat = fs.statSync(cprPath)

  assert.ok(chokingStat.size > 1_000_000, `choking.mp4 size is valid (${chokingStat.size} bytes)`)
  assert.ok(burnsStat.size > 1_000_000, `burns.mp4 size is valid (${burnsStat.size} bytes)`)
  assert.ok(cprStat.size > 1_000_000, `cpr.mp4 size is valid (${cprStat.size} bytes)`)
})

