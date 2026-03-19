import React, { useState, useEffect } from 'react'
import { Clock, Loader2, AlertCircle } from 'lucide-react'

interface GenerationTimerProps {
  onComplete?: () => void
  duration?: number // in seconds, default 20 minutes
}

export function GenerationTimer({ onComplete, duration = 1200 }: GenerationTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsActive(false)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, timeLeft, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progressPercentage = ((duration - timeLeft) / duration) * 100

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Generating Compounds</h3>
        <p className="text-gray-400 text-sm">
          Average generation takes around 20 minutes
        </p>
      </div>

      {/* Timer Display */}
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-4xl font-bold text-blue-400 mb-2">
          {formatTime(timeLeft)}
        </div>
        <div className="text-sm text-gray-400 mb-4">
          Time remaining
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-500">
          {Math.round(progressPercentage)}% complete
        </div>
      </div>

      {/* Status Indicator */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
          <span className="text-blue-300 font-medium">Processing...</span>
        </div>
        <div className="text-sm text-blue-200">
          Our AI is analyzing the protein structure and generating optimized medicinal compounds. 
          This process involves complex molecular modeling and may take some time.
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-white mb-3">💡 While you wait:</h4>
        <div className="space-y-2 text-sm text-gray-400">
          <div>• Review your protein structure data</div>
          <div>• Prepare for binding affinity analysis</div>
          <div>• Check out other research tools</div>
          <div>• Explore amino acid sequences</div>
        </div>
      </div>
    </div>
  )
}