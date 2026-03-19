import React from 'react'
import { AlertTriangle, Database, ExternalLink } from 'lucide-react'

interface ErrorDisplayProps {
  error: string
  pdbId?: string
  onRetry?: () => void
}

export function ErrorDisplay({ error, pdbId, onRetry }: ErrorDisplayProps) {
  const isDatasetError = error.toLowerCase().includes('dataset not found:') || 
                        error.toLowerCase().includes('ligand') ||
                        error.toLowerCase().includes('no ligand')

  if (isDatasetError) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Ligand Data Available</h3>
          <p className="text-gray-400 text-sm">
            {pdbId && `PDB ID: ${pdbId.toUpperCase()}`}
          </p>
        </div>

        {/* Main Error Message */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-lg font-semibold text-orange-300 mb-2">
                Compound Generation Not Possible
              </h4>
              <p className="text-orange-200 leading-relaxed">
                The selected protein does not have ligand data in our database. 
                Compound generation requires existing ligand information to create 
                structurally similar and optimized medicinal compounds.
              </p>
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-3">Why is ligand data needed?</h4>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
              <span>Ligands provide structural templates for compound generation</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
              <span>Our AI analyzes existing ligand-protein interactions</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
              <span>Generated compounds are optimized based on known binding patterns</span>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-300 mb-3">💡 What you can do:</h4>
          <div className="space-y-2 text-sm text-blue-200">
            <div>• Try a different PDB ID that has known ligands</div>
            <div>• Use amino acid sequence analysis for this protein</div>
            <div>• Explore binding affinity prediction with known compounds</div>
            <div>• Check the PDB database for ligand availability</div>
          </div>
        </div>

        {/* PDB Link */}
        {pdbId && (
          <div className="text-center">
            <a
              href={`https://www.rcsb.org/structure/${pdbId.toUpperCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors duration-300"
            >
              <ExternalLink className="w-4 h-4" />
              View {pdbId.toUpperCase()} on PDB
            </a>
          </div>
        )}

        {/* Retry Button */}
        {onRetry && (
          <div className="text-center">
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300"
            >
              Try Different PDB ID
            </button>
          </div>
        )}
      </div>
    )
  }

  // Generic error display
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-gradient-to-r from-red-500 to-pink-600 w-16 h-16 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Generation Failure</h3>
      </div>

      <div className="">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-lg font-semibold mb-2">
              Error Occurred
            </h4>
            <p className="leading-relaxed">
                The selected protein does not have ligand data. 
                Compound generation requires ligand information to create 
                structurally similar and optimized medicinal compounds.
              
            </p>
            <div className="space-y-2 text-sm">
            <div> </div>
            <div>• Try a different PDB ID that has known ligands</div>
            <div>• Check the PDB database for ligand availability</div>
          </div>
          </div>
        </div>
      </div>

      {onRetry && (
        <div className="text-center">

        </div>
      )}
    </div>
  )
}