import React from 'react'

interface AminoAcidVisualizerProps {
  sequences: Record<string, string>
  pdbId: string
}

export function AminoAcidVisualizer({ sequences, pdbId }: AminoAcidVisualizerProps) {
  // Amino acid color mapping
  const getAminoAcidColor = (aa: string): string => {
    const upperAA = aa.toUpperCase()
    
    // Hydrophobic (A, V, L, I, P, W, F, M): 🟤
    if (['A', 'V', 'L', 'I', 'P', 'W', 'F', 'M'].includes(upperAA)) {
      return 'bg-amber-700 text-amber-100'
    }
    
    // Polar (S, T, Y, N, Q, C): 🟢
    if (['S', 'T', 'Y', 'N', 'Q', 'C'].includes(upperAA)) {
      return 'bg-green-600 text-green-100'
    }
    
    // Positive (K, R, H): 🔵
    if (['K', 'R', 'H'].includes(upperAA)) {
      return 'bg-blue-600 text-blue-100'
    }
    
    // Negative (D, E): 🔴
    if (['D', 'E'].includes(upperAA)) {
      return 'bg-red-600 text-red-100'
    }
    
    // Special (G): 🟣
    if (upperAA === 'G') {
      return 'bg-purple-600 text-purple-100'
    }
    
    // Default for unknown amino acids
    return 'bg-gray-600 text-gray-100'
  }

  // Convert three-letter amino acid codes to single letters
  const convertToSingleLetter = (sequence: string): string => {
    const threeToOne: Record<string, string> = {
      'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
      'GLU': 'E', 'GLN': 'Q', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
      'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
      'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V'
    }

    // If sequence contains three-letter codes, convert them
    if (sequence.includes('ALA') || sequence.includes('ARG') || sequence.includes('ASN')) {
      return sequence.replace(/([A-Z]{3})/g, (match) => threeToOne[match] || match)
    }
    
    // Otherwise, assume it's already single-letter codes
    return sequence
  }

  // Break sequence into blocks of 50 characters
  const formatSequence = (sequence: string): string[][] => {
    const singleLetterSeq = convertToSingleLetter(sequence)
    const blocks: string[][] = []
    
    for (let i = 0; i < singleLetterSeq.length; i += 50) {
      const block = singleLetterSeq.slice(i, i + 50).split('')
      blocks.push(block)
    }
    
    return blocks
  }

  // Get amino acid type emoji
  const getAminoAcidEmoji = (aa: string): string => {
    const upperAA = aa.toUpperCase()
    
    if (['A', 'V', 'L', 'I', 'P', 'W', 'F', 'M'].includes(upperAA)) return '🟤'
    if (['S', 'T', 'Y', 'N', 'Q', 'C'].includes(upperAA)) return '🟢'
    if (['K', 'R', 'H'].includes(upperAA)) return '🔵'
    if (['D', 'E'].includes(upperAA)) return '🔴'
    if (upperAA === 'G') return '🟣'
    
    return '⚪'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-2">PDB: {pdbId}</h4>
        <div className="text-sm text-gray-400">
          {Object.keys(sequences).length} chain{Object.keys(sequences).length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Color Legend */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h5 className="text-sm font-semibold text-white mb-3">Amino Acid Types</h5>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span>🟤</span>
            <span className="text-gray-300">Hydrophobic (A,V,L,I,P,W,F,M)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟢</span>
            <span className="text-gray-300">Polar (S,T,Y,N,Q,C)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔵</span>
            <span className="text-gray-300">Positive (K,R,H)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔴</span>
            <span className="text-gray-300">Negative (D,E)</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🟣</span>
            <span className="text-gray-300">Special (G)</span>
          </div>
        </div>
      </div>

      {/* Sequences */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(sequences).map(([chainId, sequence]) => {
          const formattedBlocks = formatSequence(sequence)
          const totalLength = convertToSingleLetter(sequence).length
          
          return (
            <div key={chainId} className="bg-gray-800 rounded-lg p-4">
              {/* Chain Header */}
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-lg font-bold text-white">
                  Chain {chainId}
                </h5>
                <div className="text-sm text-gray-400">
                  {totalLength} residues
                </div>
              </div>

              {/* Sequence Blocks */}
              <div className="space-y-3">
                {formattedBlocks.map((block, blockIndex) => (
                  <div key={blockIndex} className="space-y-2">
                    {/* Position indicator */}
                    <div className="text-xs text-gray-500 font-mono">
                      {(blockIndex * 50 + 1).toString().padStart(4, ' ')}
                    </div>
                    
                    {/* Amino acid sequence */}
                    <div className="flex flex-wrap gap-1">
                      {block.map((aa, aaIndex) => (
                        <div
                          key={aaIndex}
                          className={`
                            w-6 h-6 flex items-center justify-center text-xs font-mono font-bold rounded
                            ${getAminoAcidColor(aa)}
                            hover:scale-110 transition-transform duration-200 cursor-help
                          `}
                          title={`${aa} - ${getAminoAcidEmoji(aa)} Position: ${blockIndex * 50 + aaIndex + 1}`}
                        >
                          {aa}
                        </div>
                      ))}
                    </div>
                    
                    {/* Position indicator for end of block */}
                    <div className="text-xs text-gray-500 font-mono text-right">
                      {Math.min((blockIndex + 1) * 50, totalLength).toString().padStart(4, ' ')}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chain Statistics */}
              <div className="mt-4 pt-3 border-t border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400">Hydrophobic:</span>
                    <span className="text-amber-300 ml-1">
                      {convertToSingleLetter(sequence).split('').filter(aa => 
                        ['A', 'V', 'L', 'I', 'P', 'W', 'F', 'M'].includes(aa.toUpperCase())
                      ).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Polar:</span>
                    <span className="text-green-300 ml-1">
                      {convertToSingleLetter(sequence).split('').filter(aa => 
                        ['S', 'T', 'Y', 'N', 'Q', 'C'].includes(aa.toUpperCase())
                      ).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Positive:</span>
                    <span className="text-blue-300 ml-1">
                      {convertToSingleLetter(sequence).split('').filter(aa => 
                        ['K', 'R', 'H'].includes(aa.toUpperCase())
                      ).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Negative:</span>
                    <span className="text-red-300 ml-1">
                      {convertToSingleLetter(sequence).split('').filter(aa => 
                        ['D', 'E'].includes(aa.toUpperCase())
                      ).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}