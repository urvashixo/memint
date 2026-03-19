import React, { useState, useEffect } from 'react'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  Maximize2, 
  Minimize2, 
  X,
  Volume2,
  VolumeX,
  Bot,
  Sparkles,
  Zap
} from 'lucide-react'
import { useTavus } from '../hooks/useTavus'

interface TavusVideoCallProps {
  isOpen: boolean
  onClose: () => void
  isMinimized: boolean
  onToggleMinimize: () => void
}

export function TavusVideoCall({ isOpen, onClose, isMinimized, onToggleMinimize }: TavusVideoCallProps) {
  const {
    isConnected,
    isLoading,
    error,
    videoRef,
    startCall,
    endCall,
    startScreenShare,
    userContext
  } = useTavus()

  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const handleStartCall = async () => {
    await startCall()
  }

  const handleEndCall = async () => {
    await endCall()
    onClose()
  }

  const handleScreenShare = async () => {
    await startScreenShare()
    setIsScreenSharing(true)
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
    // In a real implementation, you would disable/enable the video track
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
    // In a real implementation, you would disable/enable the audio track
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }

  if (!isOpen) return null

  return (
    <div className={`
      fixed z-[9999] bg-gray-900 border-2 border-gray-700 shadow-2xl overflow-hidden
      transition-all duration-500 ease-in-out backdrop-blur-none
      ${isMinimized 
        ? 'bottom-6 right-6 w-96 h-64 rounded-2xl' 
        : 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[750px] rounded-3xl'
      }
    `} style={{ 
      imageRendering: 'crisp-edges',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale'
    }}>
      
      {/* Header */}
      <div className="relative flex items-center justify-between p-6 bg-gray-800 border-b-2 border-gray-700">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-4 h-4 bg-green-400 rounded-full shadow-lg shadow-green-400/50"></div>
            {isConnected && (
              <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bot className="w-7 h-7 text-blue-400" />
              <Zap className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-xl tracking-tight">
                {isConnected ? 'Connected to Neo' : 'Neo AI Assistant'}
              </h3>
              <p className="text-gray-400 text-sm font-medium">
                {isConnected ? 'Ready to help with your research' : 'Your AI research companion'}
              </p>
            </div>
          </div>
          {isScreenSharing && (
            <div className="flex items-center gap-2 bg-blue-500/20 border-2 border-blue-500/40 text-blue-300 px-4 py-2 rounded-full text-sm font-semibold">
              <Monitor className="w-4 h-4" />
              Screen Sharing
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMinimize}
            className="p-3 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition-all duration-200 hover:scale-105 border border-gray-600 hover:border-gray-500"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-200 hover:scale-105 border border-gray-600 hover:border-red-500/50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video Area */}
      <div className="relative flex-1 bg-gray-900" style={{ minHeight: isMinimized ? '150px' : '500px' }}>
        {!isConnected ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-8">
            {/* Animated Neo Avatar */}
            <div className="relative mb-8">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 border-4 border-white/20">
                <Bot className="w-14 h-14 text-white" />
              </div>
              <div className="absolute -top-3 -right-3">
                <Sparkles className="w-10 h-10 text-yellow-400 animate-pulse" />
              </div>
              <div className="absolute inset-0 w-28 h-28 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-full animate-ping opacity-20"></div>
            </div>

            <div className="text-center max-w-lg">
              <h3 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                Ready to talk to Neo?
              </h3>
              <p className="text-gray-300 text-xl leading-relaxed mb-8 font-medium">
                Start a video conversation with your AI research assistant. Neo has access to your lab data and recent activity.
              </p>
              
              {/* User Context Preview */}
              {userContext && (
                <div className="bg-gray-800 border-2 border-gray-600 rounded-2xl p-6 mb-8 text-left shadow-xl">
                  <h4 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Context Available:
                  </h4>
                  <div className="space-y-3 text-base text-gray-300">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span><strong>User:</strong> {userContext.user.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span><strong>Labs:</strong> {userContext.labs.length} active lab{userContext.labs.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <span><strong>Recent Messages:</strong> {userContext.labs.reduce((total, lab) => total + lab.recentMessages.length, 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mb-8 p-6 bg-red-500/20 border-2 border-red-500/40 rounded-2xl text-red-300 text-base max-w-2xl backdrop-blur-none shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <X className="w-5 h-5" />
                  <span className="font-bold text-lg">Connection Error</span>
                </div>
                <p className="leading-relaxed">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleStartCall}
              disabled={isLoading}
              className="group relative overflow-hidden bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 disabled:cursor-not-allowed transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 border-2 border-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-4">
                {isLoading ? (
                  <>
                    <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connecting to Neo...
                  </>
                ) : (
                  <>
                    <Video className="w-7 h-7" />
                    Start Video Call
                  </>
                )}
              </div>
            </button>
          </div>
        ) : (
          <>
            {/* Main Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={isMuted}
              className="w-full h-full object-cover"
              style={{ 
                imageRendering: 'crisp-edges',
                filter: 'contrast(1.1) brightness(1.05)'
              }}
            />
            
            {/* Video Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            
            {/* Status Indicators */}
            <div className="absolute top-6 left-6 flex gap-3">
              {!isVideoEnabled && (
                <div className="bg-red-500 backdrop-blur-sm text-white px-4 py-3 rounded-full text-sm font-bold border-2 border-red-400">
                  <VideoOff className="w-4 h-4 inline mr-2" />
                  Video Off
                </div>
              )}
              {!isAudioEnabled && (
                <div className="bg-red-500 backdrop-blur-sm text-white px-4 py-3 rounded-full text-sm font-bold border-2 border-red-400">
                  <MicOff className="w-4 h-4 inline mr-2" />
                  Mic Off
                </div>
              )}
            </div>

            {/* Neo Status */}
            <div className="absolute top-6 right-6">
              <div className="bg-green-500 backdrop-blur-sm text-white px-5 py-3 rounded-full text-sm font-bold flex items-center gap-2 border-2 border-green-400 shadow-lg">
                <Bot className="w-4 h-4" />
                Neo is listening
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {isConnected && (
        <div className="relative p-6 bg-gray-800 border-t-2 border-gray-700">
          <div className="flex items-center justify-center gap-4">
            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-2xl transition-all duration-200 transform hover:scale-105 border-2 font-semibold ${
                isVideoEnabled 
                  ? 'bg-gray-700 text-white hover:bg-gray-600 border-gray-600 shadow-lg' 
                  : 'bg-red-500 text-white hover:bg-red-600 border-red-400 shadow-lg shadow-red-500/25'
              }`}
              title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>

            {/* Audio Toggle */}
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-2xl transition-all duration-200 transform hover:scale-105 border-2 font-semibold ${
                isAudioEnabled 
                  ? 'bg-gray-700 text-white hover:bg-gray-600 border-gray-600 shadow-lg' 
                  : 'bg-red-500 text-white hover:bg-red-600 border-red-400 shadow-lg shadow-red-500/25'
              }`}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            {/* Screen Share */}
            <button
              onClick={handleScreenShare}
              className={`p-4 rounded-2xl transition-all duration-200 transform hover:scale-105 border-2 font-semibold ${
                isScreenSharing 
                  ? 'bg-blue-500 text-white hover:bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/25' 
                  : 'bg-gray-700 text-white hover:bg-gray-600 border-gray-600 shadow-lg'
              }`}
              title="Share screen"
            >
              <Monitor className="w-6 h-6" />
            </button>

            {/* Volume Toggle */}
            <button
              onClick={toggleMute}
              className="p-4 bg-gray-700 text-white hover:bg-gray-600 border-2 border-gray-600 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="p-4 bg-red-500 text-white hover:bg-red-600 border-2 border-red-400 rounded-2xl transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/25 font-semibold"
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}