import React from 'react'
import { MessageSquare, FileText, ChevronLeft, Activity, Target } from 'lucide-react'

interface SidebarLeftProps {
  isOpen: boolean
  onToggle: () => void
  onTalkToNew: () => void
  onGenerateReport: () => void
  onADMEProfile: () => void
  onTargetPredictor: () => void
}

export function SidebarLeft({ 
  isOpen, 
  onToggle, 
  onTalkToNew, 
  onGenerateReport, 
  onADMEProfile, 
  onTargetPredictor 
}: SidebarLeftProps) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 md:z-auto
        h-full w-80 bg-gradient-to-b from-gray-900 to-gray-800 
        border-r border-gray-700 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors duration-300 md:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-white mb-6">Research Tools</h2>
          
          {/* Talk to New Button */}
          <button
            onClick={onTalkToNew}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <MessageSquare className="w-5 h-5" />
            New Conversation
          </button>

          {/* Generate Report Button */}
          <button
            onClick={onGenerateReport}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <FileText className="w-5 h-5" />
            Generate Report
          </button>

        
          {/* Info Section */}
          <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <h3 className="text-blue-300 font-medium mb-2">AI Research Assistant</h3>
            <p className="text-blue-200 text-sm">
              Use the tools below to analyze compounds, predict binding affinities, and explore molecular data with AI-powered insights.
            </p>
          </div>

          {/* Neon Accent Lines */}
          <div className="space-y-2 mt-8">
            <div className="h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
            <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent opacity-30"></div>
            <div className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-40"></div>
          </div>
        </div>
      </div>
    </>
  )
}