import React from 'react'
import { ExternalLink, Dna, Atom } from 'lucide-react'

interface BindingAffinityVisualizerProps {
  data: {
    predicted_binding_affinity?: number
    binding_affinity?: number
    affinity?: number
    confidence?: number
    smiles?: string
    target_sequence?: string
    units?: string
    error?: string
    message?: string
    mockData?: any
  }
  citations?: string[]
}

export function BindingAffinityVisualizer({ data, citations }: BindingAffinityVisualizerProps) {
  const handleCitationClick = (citation: string) => {
    // Clean the citation string by removing angle brackets and trimming
    let url = citation.trim().replace(/^<+|>+$/g, '')
    
    // If it doesn't start with http/https, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }
    
    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const renderCitations = (citations: string[] = []) => {
    if (!citations || citations.length === 0) {
      return null
    }

    return (
      <div className="space-y-2">
        {citations.map((citation, index) => {
          // Clean up the citation URL
          const cleanUrl = citation.trim().replace(/^<+|>+$/g, '')
          const displayUrl = cleanUrl.length > 60 ? cleanUrl.substring(0, 60) + '...' : cleanUrl
          
          return (
            <button
              key={index}
              onClick={() => handleCitationClick(citation)}
              className="w-full flex items-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 group text-left"
            >
              <ExternalLink className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-300 group-hover:text-white truncate">
                  [{index + 1}] {displayUrl}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Click to open in new tab
                </div>
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  // Extract the actual data (handle both direct data and mockData)
  const actualData = data.mockData || data
  
  // Get the binding affinity value
  const bindingAffinity = actualData.predicted_binding_affinity || 
                         actualData.binding_affinity || 
                         actualData.affinity

  // Format the binding affinity value
  const formatBindingAffinity = (value: number): string => {
    if (value === undefined || value === null) return 'N/A'
    return value.toFixed(3)
  }

  // Get confidence percentage
  const confidencePercent = actualData.confidence ? Math.round(actualData.confidence * 100) : null

  // Truncate long sequences for display
  const truncateSequence = (sequence: string, maxLength: number = 100): string => {
    if (!sequence) return ''
    if (sequence.length <= maxLength) return sequence
    return sequence.substring(0, maxLength) + '...'
  }

  return (
    <div className="space-y-4">
      {/* Main Binding Affinity Score */}
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-3xl font-bold text-purple-400 mb-2">
          {formatBindingAffinity(bindingAffinity)}
        </div>
        <div className="text-sm text-gray-400">
          Predicted Binding Affinity
          {actualData.units && ` (${actualData.units})`}
        </div>
      </div>

      {/* Confidence Score */}
      {confidencePercent !== null && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Confidence</span>
            <span className="text-sm text-purple-300">{confidencePercent}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Input Data Summary */}
      <div className="space-y-3">
        {/* SMILES */}
        {actualData.smiles && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Atom className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-white">Compound (SMILES)</span>
            </div>
            <div className="text-xs text-gray-300 font-mono break-all bg-gray-900 p-2 rounded">
              {actualData.smiles}
            </div>
          </div>
        )}

        {/* Target Sequence */}
        {actualData.target_sequence && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Dna className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Target Sequence</span>
            </div>
            <div className="text-xs text-gray-300 font-mono break-all bg-gray-900 p-2 rounded">
              {truncateSequence(actualData.target_sequence)}
            </div>
            {actualData.target_sequence.length > 100 && (
              <div className="text-xs text-gray-500 mt-2">
                Length: {actualData.target_sequence.length} amino acids (truncated for display)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interpretation Guide */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-purple-300 mb-2">Interpretation</h5>
        <div className="text-xs text-purple-200 space-y-1">
          <p>• Higher values indicate stronger binding affinity</p>
          <p>• Values typically range from 0-15 for drug-like compounds</p>
          <p>• Consider confidence score when interpreting results</p>
        </div>
      </div>

      {/* Error Message */}
      {data.error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-red-300 text-sm">
            <strong>Service Unavailable:</strong> {data.message || data.error}
          </div>
          {data.mockData && (
            <div className="text-red-200 text-xs mt-2">
              Showing demo data for illustration purposes.
            </div>
          )}
        </div>
      )}

      {/* Citations */}
      {citations && citations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white">Citations & References</h4>
          {renderCitations(citations)}
        </div>
      )}
    </div>
  )
}