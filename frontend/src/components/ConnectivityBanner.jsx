import React, { useState, useEffect } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { getPendingRequests } from '../services/offlineQueue'
import { syncPendingConsultations, subscribeSyncState } from '../services/syncService'
import { useTranslation } from '../i18n'

export default function ConnectivityBanner({ showSyncButton = true }) {
  const { isOnline, reconnectedRecently } = useOnlineStatus()
  const { t } = useTranslation()
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  // Listen to offline queue updates and sync state
  useEffect(() => {
    let isMounted = true

    const updatePendingCount = () => {
      getPendingRequests()
        .then((items) => {
          if (isMounted) setPendingCount(items.length)
        })
        .catch(() => {})
    }

    updatePendingCount()

    const handleQueueChange = () => updatePendingCount()
    window.addEventListener('offline-queue-updated', handleQueueChange)
    window.addEventListener('offline-sync-completed', handleQueueChange)

    const unsubscribe = subscribeSyncState((state) => {
      if (isMounted) {
        setIsSyncing(Boolean(state.isSyncing))
        updatePendingCount()
      }
    })

    return () => {
      isMounted = false
      window.removeEventListener('offline-queue-updated', handleQueueChange)
      window.removeEventListener('offline-sync-completed', handleQueueChange)
      unsubscribe()
    }
  }, [])

  const handleManualSync = async () => {
    if (isSyncing || !isOnline) return
    await syncPendingConsultations()
  }

  // If online, fully synced, and not recently reconnected: hide banner
  if (isOnline && !reconnectedRecently && !isSyncing) {
    return null
  }

  // Offline Mode Banner (Amber / Slate)
  if (!isOnline) {
    return (
      <aside
        className="connectivity-banner offline"
        role="status"
        aria-live="polite"
        style={{
          backgroundColor: '#fffbeb',
          borderBottom: '1.5px solid #fde68a',
          color: '#92400e',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.86rem',
          fontWeight: 600,
          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
          position: 'sticky',
          top: 0,
          zIndex: 90,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }} aria-hidden="true">
            ⚡
          </span>
          <span>
            {t('connectivity.offlineBanner') ||
              'You are offline. Requests and triage are saved locally on your device.'}
          </span>
        </div>

        {pendingCount > 0 && (
          <span
            style={{
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              color: '#b45309',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              marginLeft: '8px',
            }}
          >
            {pendingCount}{' '}
            {t('connectivity.pendingPill') || 'pending'}
          </span>
        )}
      </aside>
    )
  }

  // Reconnected / Syncing Banner (Emerald / Blue)
  return (
    <aside
      className="connectivity-banner reconnected"
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: '#ecfdf5',
        borderBottom: '1.5px solid #a7f3d0',
        color: '#065f46',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.86rem',
        fontWeight: 600,
        position: 'sticky',
        top: 0,
        zIndex: 90,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '16px',
            display: 'inline-block',
            animation: isSyncing ? 'spin 1.5s linear infinite' : 'none',
          }}
          aria-hidden="true"
        >
          🔄
        </span>
        <span>
          {isSyncing
            ? t('connectivity.syncingBanner') || 'Syncing pending offline requests with server...'
            : t('connectivity.reconnectedBanner') || 'Back online — syncing pending requests...'}
        </span>
      </div>

      {showSyncButton && pendingCount > 0 && !isSyncing && (
        <button
          type="button"
          onClick={handleManualSync}
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.76rem',
            fontWeight: 700,
            cursor: 'pointer',
            marginLeft: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          {t('connectivity.syncNow') || 'Sync Now'}
        </button>
      )}
    </aside>
  )
}
