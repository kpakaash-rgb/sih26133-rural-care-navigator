import { useState, useEffect, useRef } from 'react'

/**
 * useOnlineStatus
 * ===============
 * Reactive hook tracking browser network connectivity.
 * Also tracks disconnection timestamps and a temporary reconnected indicator
 * for smooth user feedback.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true
  })
  const [wasOfflineSince, setWasOfflineSince] = useState(null)
  const [reconnectedRecently, setReconnectedRecently] = useState(false)
  const reconnectedTimerRef = useRef(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setWasOfflineSince(null)
      setReconnectedRecently(true)

      if (reconnectedTimerRef.current) {
        clearTimeout(reconnectedTimerRef.current)
      }
      reconnectedTimerRef.current = setTimeout(() => {
        setReconnectedRecently(false)
      }, 4500)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOfflineSince(new Date())
      setReconnectedRecently(false)
      if (reconnectedTimerRef.current) {
        clearTimeout(reconnectedTimerRef.current)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (reconnectedTimerRef.current) {
        clearTimeout(reconnectedTimerRef.current)
      }
    }
  }, [])

  return { isOnline, wasOfflineSince, reconnectedRecently }
}

export default useOnlineStatus
