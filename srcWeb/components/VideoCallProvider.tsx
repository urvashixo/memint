import React, { createContext, useContext } from 'react'
import { TavusVideoCall } from './TavusVideoCall'
import { usePersistentVideoCall } from '../hooks/usePersistentVideoCall'

interface VideoCallContextType {
  isOpen: boolean
  isMinimized: boolean
  openVideoCall: () => void
  closeVideoCall: () => void
  toggleMinimize: () => void
  minimizeVideoCall: () => void
  maximizeVideoCall: () => void
}

const VideoCallContext = createContext<VideoCallContextType | undefined>(undefined)

export function useVideoCall() {
  const context = useContext(VideoCallContext)
  if (context === undefined) {
    throw new Error('useVideoCall must be used within a VideoCallProvider')
  }
  return context
}

interface VideoCallProviderProps {
  children: React.ReactNode
}

export function VideoCallProvider({ children }: VideoCallProviderProps) {
  const videoCallState = usePersistentVideoCall()

  return (
    <VideoCallContext.Provider value={videoCallState}>
      {children}
      <TavusVideoCall
        isOpen={videoCallState.isOpen}
        onClose={videoCallState.closeVideoCall}
        isMinimized={videoCallState.isMinimized}
        onToggleMinimize={videoCallState.toggleMinimize}
      />
    </VideoCallContext.Provider>
  )
}