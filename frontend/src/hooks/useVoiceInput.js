import { useState, useRef, useCallback, useEffect } from 'react'
import { transcribeAudio } from '../services/api'

/**
 * useVoiceInput
 * =============
 * Custom React hook for capturing patient voice input via MediaRecorder API
 * and transcribing it using Sarvam AI regional language STT services.
 *
 * State Machine:
 *   idle → listening → processing → done | error
 */
export function useVoiceInput({ defaultLanguage = 'ta-IN' } = {}) {
  const [state, setState] = useState('idle') // 'idle' | 'listening' | 'processing' | 'done' | 'error'
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const [demoMode, setDemoMode] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const streamRef = useRef(null)
  const recognitionRef = useRef(null)
  const recognitionTranscriptRef = useRef('')
  const activeLanguageRef = useRef(defaultLanguage)

  // Clean up any active audio stream tracks
  const stopMediaTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopMediaTracks()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {
          // ignore
        }
      }
    }
  }, [stopMediaTracks])

  /**
   * Start recording voice from the microphone.
   * @param {{ language?: string }} [options]
   */
  const startListening = useCallback(
    async (options = {}) => {
      const targetLang = options.language || activeLanguageRef.current || defaultLanguage
      activeLanguageRef.current = targetLang
      setError(null)
      setTranscript('')
      setDemoMode(false)
      audioChunksRef.current = []
      recognitionTranscriptRef.current = ''

      // Check browser MediaDevices support
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Voice recording is not supported in this browser.')
        setState('error')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        // Detect supported mime types for recording
        let mimeType = 'audio/webm'
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus'
          } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
            mimeType = 'audio/ogg;codecs=opus'
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4'
          }
        }

        const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
        mediaRecorderRef.current = mediaRecorder

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        // Parallel Web Speech Recognition (for live feedback / fallback if available)
        const SpeechRec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec()
            recognition.continuous = false
            recognition.interimResults = true
            recognition.lang = targetLang

            recognition.onresult = (e) => {
              const current = Array.from(e.results)
                .map((res) => res[0]?.transcript)
                .join('')
              if (current) {
                recognitionTranscriptRef.current = current
              }
            }

            recognition.onerror = () => {}
            recognition.start()
            recognitionRef.current = recognition
          } catch {
            // SpeechRecognition is optional enhancement
          }
        }

        mediaRecorder.start(250) // Collect chunks every 250ms
        setState('listening')
      } catch (err) {
        stopMediaTracks()
        let friendlyErr = 'Unable to access microphone. Please check permissions.'
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          friendlyErr = 'Microphone permission was denied. Please allow microphone access.'
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          friendlyErr = 'No microphone device was found on this system.'
        }
        setError(friendlyErr)
        setState('error')
      }
    },
    [defaultLanguage, stopMediaTracks]
  )

  /**
   * Stop recording voice and send audio to backend Sarvam STT service.
   */
  const stopListening = useCallback(async () => {
    if (state !== 'listening') return

    setState('processing')

    // Stop live speech recognition helper
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }

    const recorder = mediaRecorderRef.current
    if (!recorder) {
      setState('idle')
      return
    }

    // Wait for recorder to stop and gather final blob
    const audioBlob = await new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        resolve(blob)
      }
      try {
        recorder.stop()
      } catch {
        resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' }))
      }
    })

    stopMediaTracks()

    // Process audio blob
    try {
      const langCode = activeLanguageRef.current || defaultLanguage
      let response = null
      try {
        response = await transcribeAudio(audioBlob, langCode)
      } catch (apiErr) {
        console.warn('Backend audio transcription request failed:', apiErr)
        response = null
      }

      const browserTranscript = (recognitionTranscriptRef.current || '').trim()

      if (response && response.demo_mode === false && response.transcript?.trim()) {
        // 1. Genuine backend transcription succeeded
        setTranscript(response.transcript.trim())
        setDemoMode(false)
        setState('done')
      } else if (browserTranscript) {
        // 2. Browser SpeechRecognition captured actual speech (e.g. "I had severe vomiting")
        // Prefer real spoken words over demo fallback or failed API
        setTranscript(browserTranscript)
        setDemoMode(false)
        setState('done')
      } else if (response && response.demo_mode === true && response.transcript?.trim()) {
        // 3. Demo mode active, and browser recognition did not capture speech
        // Surface the sample as an explicit demo state
        setTranscript(response.transcript.trim())
        setDemoMode(true)
        setState('done')
      } else {
        // 4. No speech detected and no transcript available
        throw new Error('No speech recognized in recording.')
      }
    } catch (err) {
      if (recognitionTranscriptRef.current && recognitionTranscriptRef.current.trim()) {
        setTranscript(recognitionTranscriptRef.current.trim())
        setDemoMode(false)
        setState('done')
      } else {
        setError(err.message || 'Voice input unavailable. Please type your symptoms.')
        setState('error')
      }
    }
  }, [state, defaultLanguage, stopMediaTracks])

  /**
   * Reset voice input state back to idle.
   */
  const resetVoice = useCallback(() => {
    stopMediaTracks()
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
    setState('idle')
    setTranscript('')
    setError(null)
    setDemoMode(false)
    audioChunksRef.current = []
    recognitionTranscriptRef.current = ''
  }, [stopMediaTracks])

  return {
    state,
    isListening: state === 'listening',
    isProcessing: state === 'processing',
    isDone: state === 'done',
    isError: state === 'error',
    transcript,
    error,
    demoMode,
    startListening,
    stopListening,
    resetVoice,
  }
}

export default useVoiceInput
