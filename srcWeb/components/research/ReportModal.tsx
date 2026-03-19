import React, { useState } from 'react'
import { X, FileText, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (title: string) => Promise<void>
  isGenerating: boolean
  progress: string
}

export function ReportModal({ isOpen, onClose, onGenerate, isGenerating, progress }: ReportModalProps) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const reportTitle = title.trim() || `Research Report - ${new Date().toLocaleString()}`
      await onGenerate(reportTitle)
      setTitle('')
    } catch (err: any) {
      setError(err.message || 'Failed to generate report')
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      setTitle('')
      setError('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-8 shadow-2xl transition-all">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-300 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Generate Research Report</h2>
            <p className="text-gray-400 text-sm">
              Create a comprehensive .docx report with all your research data, insights, and analysis.
            </p>
          </div>

          {/* Progress indicator */}
          {isGenerating && (
            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span className="text-blue-300 font-medium">Generating Report...</span>
              </div>
              <div className="text-sm text-blue-200">
                {progress || 'Processing...'}
              </div>
              <div className="mt-3 w-full bg-blue-900/30 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}

          {/* Success indicator */}
          {progress.includes('successfully') && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-medium">Report Downloaded Successfully!</span>
              </div>
              <div className="text-sm text-green-200 mt-1">
                Your report has been downloaded to your device as a .docx file.
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="report-title" className="block text-sm font-medium text-gray-300 mb-2">
                Report Title (Optional)
              </label>
              <input
                type="text"
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isGenerating}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="e.g., Protein-Drug Interaction Analysis"
                maxLength={100}
              />
              <div className="mt-1 text-xs text-gray-500">
                Leave empty to use default title with timestamp
              </div>
            </div>

            {/* Report contents preview */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Report Will Include:</h4>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Generated compounds with SMILES strings</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Binding affinity predictions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Comprehensive AI analysis with all research context</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span>Conversation summary and insights</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:border-gray-500 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Generate & Download
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-blue-300 text-sm">
              <strong>Note:</strong> The report will be automatically downloaded as a .docx file to your device.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}