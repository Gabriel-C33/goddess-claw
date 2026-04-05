import { useState, useCallback, useRef, useEffect } from 'react'

export function useVoice() {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Initialize SpeechRecognition
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognitionRef.current = recognition
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleListening = useCallback((onResult: (text: string, isFinal: boolean) => void) => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
      return
    }

    try {
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          } else {
            interimTranscript += event.results[i][0].transcript
          }
        }
        
        if (finalTranscript || interimTranscript) {
          onResult(finalTranscript || interimTranscript, !!finalTranscript)
        }
      }

      recognitionRef.current.onerror = (e: any) => {
        console.error('Speech recognition error:', e.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current.start()
      setIsListening(true)
    } catch (e) {
      console.error('Failed to start speech recognition:', e)
      setIsListening(false)
    }
  }, [isListening])

  return { isListening, toggleListening, hasSupport: !!recognitionRef.current }
}
