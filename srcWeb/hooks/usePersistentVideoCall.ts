import { useState, useEffect } from 'react'

interface VideoCallState {
  isOpen: boolean
  isMinimized: boolean
}

const STORAGE_KEY = 'tavus-video-call-state'

export function usePersistentVideoCall() {
  const [videoCallState, setVideoCallState] = useState<VideoCallState>({
    isOpen: false,
    isMinimized: false
  })

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setVideoCallState(parsed)
      } catch (error) {
        console.error('Error parsing video call state:', error)
      }
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videoCallState))
  }, [videoCallState])

  const openVideoCall = () => {
    setVideoCallState({ isOpen: true, isMinimized: false })
  }

  const closeVideoCall = () => {
    setVideoCallState({ isOpen: false, isMinimized: false })
  }

  const toggleMinimize = () => {
    setVideoCallState(prev => ({
      ...prev,
      isMinimized: !prev.isMinimized
    }))
  }

  const minimizeVideoCall = () => {
    setVideoCallState(prev => ({
      ...prev,
      isMinimized: true
    }))
  }

  const maximizeVideoCall = () => {
    setVideoCallState(prev => ({
      ...prev,
      isMinimized: false
    }))
  }

  return {
    isOpen: videoCallState.isOpen,
    isMinimized: videoCallState.isMinimized,
    openVideoCall,
    closeVideoCall,
    toggleMinimize,
    minimizeVideoCall,
    maximizeVideoCall
  }
}