import React, { useRef, useEffect } from 'react'
import { ChevronRight, Eye, Code, Activity, Dna, ExternalLink } from 'lucide-react'
import { ToolResult } from '../Research'
import { AminoAcidVisualizer } from './AminoAcidVisualizer'
import { CompoundVisualizer } from './CompoundVisualizer'
import { BindingAffinityVisualizer } from './BindingAffinityVisualizer'
import { GenerationTimer } from './GenerationTimer'
import { ErrorDisplay } from './ErrorDisplay'

interface SidebarRightProps {
  isOpen: boolean
  onToggle: () => void
  toolResult: ToolResult | null
  isGenerating?: boolean
  generationError?: string
  onGenerationComplete?: () => void
  onRetryGeneration?: () => void
  currentPdbId?: string
}

export function SidebarRight({ 
  isOpen, 
  onToggle, 
  toolResult, 
  isGenerating = false,
  generationError,
  onGenerationComplete,
  onRetryGeneration,
  currentPdbId
}: SidebarRightProps) {
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
      return (
        <div className="text-sm text-gray-400">
          No citations available
        </div>
      )
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

  const renderContent = () => {
    // Show generation timer when generating compounds
    if (isGenerating && !generationError) {
      return <GenerationTimer onComplete={onGenerationComplete} />
    }

    // Show error display if there's a generation error
    if (generationError) {
      return (
        <ErrorDisplay 
          error={generationError} 
          pdbId={currentPdbId}
          onRetry={onRetryGeneration}
        />
      )
    }

    if (!toolResult) {
      return (
        <div className="text-center py-16 text-gray-400">
          <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Results will appear here</p>
          <p className="text-sm mt-2">Use the tools below to start analyzing</p>
        </div>
      )
    }

    switch (toolResult.type) {
      case 'drug-generation':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Drug Generation Results
            </h3>
            
            {/* Check if we have the new format with generated_smiles */}
            {toolResult.data?.generated_smiles || toolResult.data?.pdb_id || toolResult.data?.reference_smile ? (
              <CompoundVisualizer data={toolResult.data} />
            ) : (
              /* Fallback for old format */
              <div className="space-y-4">
                {toolResult.data?.compounds && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {toolResult.data.compounds.map((compound: any, index: number) => (
                      <div key={index} className="bg-gray-800 rounded-lg p-3">
                        <div className="text-sm text-gray-300">
                          <strong>Compound {index + 1}</strong>
                        </div>
                        {compound.smiles && (
                          <div className="text-xs text-gray-400 mt-1 font-mono break-all">
                            SMILES: {compound.smiles}
                          </div>
                        )}
                        {compound.score && (
                          <div className="text-xs text-green-400 mt-1">
                            Score: {compound.score}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'amino-sequence':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Dna className="w-5 h-5 text-blue-400" />
              Amino Acid Sequence
            </h3>
            
            {/* Check if we have the new format with sequences object */}
            {toolResult.data?.sequences ? (
              <AminoAcidVisualizer 
                sequences={toolResult.data.sequences}
                pdbId={toolResult.data.pdb_id || 'Unknown'}
              />
            ) : (
              /* Fallback for old format */
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-sm font-mono text-gray-300 break-all leading-relaxed">
                  {toolResult.data?.sequence || 'No sequence data available'}
                </div>
                {toolResult.data?.length && (
                  <div className="text-sm text-gray-400 mt-3">
                    Length: {toolResult.data.length} amino acids
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'binding-affinity':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Binding Affinity
            </h3>
            
            <BindingAffinityVisualizer 
              data={toolResult.data} 
              citations={toolResult.citations}
            />
          </div>
        )

      case 'graph-knowledge':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-orange-400" />
              Citations & References
            </h3>
            
            {toolResult.citations && toolResult.citations.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <p className="text-orange-300 text-sm">
                    AQL query results with credible scientific sources.
                  </p>
                </div>
                {renderCitations(toolResult.citations)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <p className="text-orange-300 text-sm">
                    AQL query executed successfully.
                  </p>
                </div>
                
                <div className="text-sm text-gray-400">
                  Citations and references will appear here when available from the AI response.
                </div>
              </div>
            )}
          </div>
        )

      case 'chat':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              Citations & References
            </h3>
            
            {toolResult.citations && toolResult.citations.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                  <p className="text-cyan-300 text-sm">
                    AI-generated insights with credible scientific sources.
                  </p>
                </div>
                {renderCitations(toolResult.citations)}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                  <p className="text-cyan-300 text-sm">
                    AI-generated insights based on current research and molecular databases.
                  </p>
                </div>
                
                <div className="text-sm text-gray-400">
                  Citations and references will appear here when available from the AI response.
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

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
        fixed md:relative z-50 md:z-auto right-0
        h-full w-80 bg-gradient-to-b from-gray-900 to-gray-800 
        border-l border-gray-700 flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {/* Mobile Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-white transition-colors duration-300 md:hidden"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <div className="p-6 h-full overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </>
  )
}