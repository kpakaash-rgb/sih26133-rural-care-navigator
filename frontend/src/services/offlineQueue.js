/**
 * offlineQueue.js
 * ===============
 * IndexedDB-backed resilient offline request queue for Nalam Connect.
 * Stores pending consultation requests created while disconnected,
 * with fallback to localStorage if IndexedDB is blocked.
 */

const DB_NAME = 'nalam_connect_offline_db'
const DB_VERSION = 1
const STORE_NAME = 'pending_consultations'
const LOCAL_STORAGE_FALLBACK_KEY = 'nalam_offline_consultation_queue'

let dbPromise = null

function openDatabase() {
  if (dbPromise) return dbPromise

  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null)
  }

  dbPromise = new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('status', 'status', { unique: false })
          store.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        console.warn('IndexedDB failed to open, falling back to localStorage:', request.error)
        resolve(null)
      }
    } catch (err) {
      console.warn('Error opening IndexedDB, falling back to localStorage:', err)
      resolve(null)
    }
  })

  return dbPromise
}

// Fallback localStorage helpers
function getLocalStorageQueue() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalStorageQueue(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE_FALLBACK_KEY, JSON.stringify(items))
  } catch (err) {
    console.error('Failed to save to localStorage fallback queue:', err)
  }
}

/**
 * Enqueue a new consultation request into local storage.
 * @param {object} payload - Consultation booking payload details
 * @returns {Promise<object>} The stored queue item with generated id & metadata
 */
export async function enqueueRequest(payload) {
  const item = {
    id: `consult_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
    status: 'saved_offline',
    retryCount: 0,
    lastError: null,
    remoteId: null,
    submittedAt: null,
  }

  const db = await openDatabase()
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.add(item)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } else {
    const queue = getLocalStorageQueue()
    queue.push(item)
    saveLocalStorageQueue(queue)
  }

  // Notify listeners that queue changed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: { action: 'enqueue', item } }))
  }

  return item
}

/**
 * Get all requests that have not yet been successfully submitted.
 * @returns {Promise<Array<object>>}
 */
export async function getPendingRequests() {
  const all = await getAllRequests()
  return all.filter((item) => item.status !== 'submitted')
}

/**
 * Get all consultation requests in the queue (sorted newest first).
 * @returns {Promise<Array<object>>}
 */
export async function getAllRequests() {
  const db = await openDatabase()
  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => {
        const results = req.result || []
        results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        resolve(results)
      }
      req.onerror = () => reject(req.error)
    })
  } else {
    const items = getLocalStorageQueue()
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return items
  }
}

/**
 * Get a single queue item by id.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getRequest(id) {
  const db = await openDatabase()
  if (db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result || null)
      req.onerror = () => reject(req.error)
    })
  } else {
    const items = getLocalStorageQueue()
    return items.find((i) => i.id === id) || null
  }
}

/**
 * Update the state or metadata of a queued consultation request.
 * @param {string} id
 * @param {object} updates - Fields to merge (e.g. status, lastError, retryCount)
 */
export async function updateRequest(id, updates) {
  const db = await openDatabase()
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const getReq = store.get(id)
      getReq.onsuccess = () => {
        const existing = getReq.result
        if (!existing) return resolve(null)
        const updated = { ...existing, ...updates }
        const putReq = store.put(updated)
        putReq.onsuccess = () => resolve(updated)
        putReq.onerror = () => reject(putReq.error)
      }
      getReq.onerror = () => reject(getReq.error)
    })
  } else {
    const queue = getLocalStorageQueue()
    const index = queue.findIndex((i) => i.id === id)
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates }
      saveLocalStorageQueue(queue)
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: { action: 'update', id, updates } }))
  }
}

/**
 * Mark a consultation request as successfully submitted to the server.
 * @param {string} id
 * @param {object} [remoteResponse={}]
 */
export async function markSubmitted(id, remoteResponse = {}) {
  await updateRequest(id, {
    status: 'submitted',
    remoteId: remoteResponse.id || null,
    submittedAt: new Date().toISOString(),
    lastError: null,
  })
}

/**
 * Remove a request completely from the offline queue.
 * @param {string} id
 */
export async function removeRequest(id) {
  const db = await openDatabase()
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } else {
    const queue = getLocalStorageQueue().filter((i) => i.id !== id)
    saveLocalStorageQueue(queue)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: { action: 'remove', id } }))
  }
}

/**
 * Clear all submitted items or entire queue.
 */
export async function clearAllRequests() {
  const db = await openDatabase()
  if (db) {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.clear()
      req.onsuccess = () => resolve(true)
      req.onerror = () => reject(req.error)
    })
  } else {
    saveLocalStorageQueue([])
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-queue-updated', { detail: { action: 'clear' } }))
  }
}
