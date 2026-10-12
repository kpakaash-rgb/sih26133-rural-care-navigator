/**
 * syncService.js
 * ==============
 * Reconnection & Background synchronization service for Nalam Connect.
 * Automatically synchronizes queued consultation requests when connectivity is restored,
 * and allows manual sync from the UI.
 */

import { getPendingRequests, updateRequest, markSubmitted } from './offlineQueue.js'
import { bookAppointment } from './api.js'

let isSyncInProgress = false
const syncListeners = new Set()

export function subscribeSyncState(listener) {
  syncListeners.add(listener)
  return () => syncListeners.delete(listener)
}

function notifySyncListeners(state) {
  for (const listener of syncListeners) {
    try {
      listener(state)
    } catch (e) {
      console.error('Error in sync listener:', e)
    }
  }
}

/**
 * Synchronize all pending consultation requests with the backend API.
 * @returns {Promise<{ total: number, synced: number, failed: number }>}
 */
export async function syncPendingConsultations({ apiBookAppointment = bookAppointment } = {}) {
  if (isSyncInProgress) {
    return { total: 0, synced: 0, failed: 0, inProgress: true }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { total: 0, synced: 0, failed: 0, offline: true }
  }

  isSyncInProgress = true
  notifySyncListeners({ isSyncing: true })

  let synced = 0
  let failed = 0
  let pendingItems = []

  try {
    pendingItems = await getPendingRequests()
    if (pendingItems.length === 0) {
      isSyncInProgress = false
      notifySyncListeners({ isSyncing: false, synced: 0, total: 0 })
      return { total: 0, synced: 0, failed: 0 }
    }

    for (const item of pendingItems) {
      // Mark item as actively syncing
      await updateRequest(item.id, { status: 'syncing' })

      try {
        const payload = item.payload || {}
        // Prepare API parameters matching backend route requirements
        const apiPayload = {
          facility_id: payload.facility_id || payload.facilityId || 1,
          service_id: payload.service_id || payload.serviceId || 1,
          availability_slot_id: payload.availability_slot_id || payload.slotId || 1,
        }

        const response = await apiBookAppointment(apiPayload)
        await markSubmitted(item.id, response || {})
        synced++
      } catch (err) {
        failed++
        const errorMsg = err.message || 'Network sync error'
        const isConflict =
          err.status === 409 ||
          errorMsg.toLowerCase().includes('already') ||
          errorMsg.toLowerCase().includes('conflict')

        await updateRequest(item.id, {
          status: isConflict ? 'failed' : 'pending_sync',
          retryCount: (item.retryCount || 0) + 1,
          lastError: isConflict
            ? 'Slot is no longer available. Please choose another time.'
            : errorMsg,
        })
      }
    }
  } catch (err) {
    console.error('Unexpected error during offline queue synchronization:', err)
  } finally {
    isSyncInProgress = false
    notifySyncListeners({
      isSyncing: false,
      synced,
      failed,
      total: pendingItems.length,
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('offline-sync-completed', {
          detail: { synced, failed, total: pendingItems.length },
        })
      )
    }
  }

  return { total: pendingItems.length, synced, failed }
}

// Auto-sync listener on window 'online' event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Short delay to allow socket/network stack to stabilize
    setTimeout(() => {
      syncPendingConsultations()
    }, 1200)
  })
}

export const triggerSyncNow = syncPendingConsultations
export default syncPendingConsultations
