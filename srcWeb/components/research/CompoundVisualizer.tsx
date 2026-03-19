import React, { useRef, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'

interface CompoundVisualizerProps {
  data: {
    generated_smiles?: string[]
    pdb_id?: string
    reference_smile?: string
  }
}

declare global {
  interface Window {
    $3Dmol: any
  }
}

export function CompoundVisualizer({ data }: CompoundVisualizerProps) {
  const proteinViewerRef = useRef<HTMLDivElement>(null)
  const referenceViewerRef = useRef<HTMLDivElement>(null)
  const currentCompoundViewerRef = useRef<HTMLDivElement>(null)
  
  const [currentCompoundIndex, setCurrentCompoundIndex] = useState(0)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [errorStates, setErrorStates] = useState<Record<string, string>>({})
  const [is3DmolLoaded, setIs3DmolLoaded] = useState(false)

  const { generated_smiles = [], pdb_id = '', reference_smile = '' } = data

  // Load 3Dmol.js script
  useEffect(() => {
    if (window.$3Dmol) {
      setIs3DmolLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://3dmol.csb.pitt.edu/build/3Dmol-min.js'
    script.onload = () => setIs3DmolLoaded(true)
    script.onerror = () => console.error('Failed to load 3Dmol.js')
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Initialize protein viewer
  useEffect(() => {
    if (is3DmolLoaded && pdb_id && proteinViewerRef.current) {
      initializeProteinViewer()
    }
  }, [is3DmolLoaded, pdb_id])

  // Initialize reference compound viewer
  useEffect(() => {
    if (is3DmolLoaded && reference_smile && referenceViewerRef.current) {
      initializeReferenceViewer()
    }
  }, [is3DmolLoaded, reference_smile])

  // Initialize current compound viewer
  useEffect(() => {
    if (is3DmolLoaded && generated_smiles.length > 0 && currentCompoundViewerRef.current) {
      initializeCurrentCompoundViewer()
    }
  }, [is3DmolLoaded, generated_smiles, currentCompoundIndex])

  const setLoading = (key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }))
  }

  const setError = (key: string, error: string) => {
    setErrorStates(prev => ({ ...prev, [key]: error }))
  }

  const initializeProteinViewer = async () => {
    if (!window.$3Dmol || !proteinViewerRef.current || !pdb_id) return

    setLoading('protein', true)
    setError('protein', '')

    try {
      const config = { backgroundColor: '#1a1a1a' }
      const viewer = window.$3Dmol.createViewer(proteinViewerRef.current, config)
      
      const response = await fetch(`https://files.rcsb.org/view/${pdb_id.toUpperCase()}.pdb`)
      
      if (!response.ok) {
        throw new Error(`PDB ID ${pdb_id} not found`)
      }

      const pdbData = await response.text()
      
      viewer.addModel(pdbData, 'pdb')
      viewer.setStyle({}, { cartoon: { colorscheme: 'spectrum' } })
      viewer.setStyle({ hetflag: true }, { stick: { colorscheme: 'Jmol', radius: 0.3 } })
      viewer.zoomTo()
      viewer.render()
      
    } catch (error) {
      console.error('Error loading protein:', error)
      setError('protein', error.message)
    } finally {
      setLoading('protein', false)
    }
  }

  const initializeReferenceViewer = async () => {
    if (!window.$3Dmol || !referenceViewerRef.current || !reference_smile) return

    setLoading('reference', true)
    setError('reference', '')

    try {
      const config = { backgroundColor: '#1a1a1a' }
      const viewer = window.$3Dmol.createViewer(referenceViewerRef.current, config)
      
      const response = await fetch(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(reference_smile)}/file?format=sdf`)
      
      if (!response.ok) {
        throw new Error('Failed to convert SMILES to 3D structure')
      }

      const sdfData = await response.text()
      
      viewer.addModel(sdfData, 'sdf')
      viewer.setStyle({}, { stick: { colorscheme: 'Jmol', radius: 0.2 } })
      viewer.zoomTo()
      viewer.render()
      
    } catch (error) {
      console.error('Error loading reference compound:', error)
      setError('reference', error.message)
    } finally {
      setLoading('reference', false)
    }
  }

  const initializeCurrentCompoundViewer = async () => {
    if (!window.$3Dmol || !currentCompoundViewerRef.current || generated_smiles.length === 0) return

    const smiles = generated_smiles[currentCompoundIndex]
    if (!smiles) return

    const compoundKey = `compound-${currentCompoundIndex}`
    setLoading(compoundKey, true)
    setError(compoundKey, '')

    try {
      // Clear the viewer first
      currentCompoundViewerRef.current.innerHTML = ''
      
      const config = { backgroundColor: '#1a1a1a' }
      const viewer = window.$3Dmol.createViewer(currentCompoundViewerRef.current, config)
      
      const response = await fetch(`https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/file?format=sdf`)
      
      if (!response.ok) {
        throw new Error('Failed to convert SMILES to 3D structure')
      }

      const sdfData = await response.text()
      
      viewer.addModel(sdfData, 'sdf')
      viewer.setStyle({}, { stick: { colorscheme: 'Jmol', radius: 0.2 } })
      viewer.zoomTo()
      viewer.render()
      
    } catch (error) {
      console.error(`Error loading compound ${currentCompoundIndex + 1}:`, error)
      setError(compoundKey, error.message)
    } finally {
      setLoading(compoundKey, false)
    }
  }

  const nextCompound = () => {
    if (currentCompoundIndex < generated_smiles.length - 1) {
      setCurrentCompoundIndex(prev => prev + 1)
    }
  }

  const prevCompound = () => {
    if (currentCompoundIndex > 0) {
      setCurrentCompoundIndex(prev => prev - 1)
    }
  }

  const renderViewer = (
    ref: React.RefObject<HTMLDivElement>,
    loadingKey: string,
    errorKey: string,
    height: string = 'h-64'
  ) => (
    <div className={`relative ${height} bg-[#1a1a1a] rounded border border-gray-600 overflow-hidden`}>
      <div ref={ref} className="w-full h-full" />
      
      {loadingStates[loadingKey] && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading 3D structure...</span>
          </div>
        </div>
      )}
      
      {errorStates[errorKey] && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="flex items-center gap-2 text-red-400 text-center p-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{errorStates[errorKey]}</span>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Protein Structure Viewer */}
      {pdb_id && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-4">
            Protein Structure: {pdb_id.toUpperCase()}
          </h4>
          {renderViewer(proteinViewerRef, 'protein', 'protein')}
        </div>
      )}

      {/* Generated Compounds Carousel - Single Compound View */}
      {generated_smiles.length > 0 ? (
        <div className="bg-gray-800 rounded-lg p-4">
          <h6 className="text-s font-semibold text-white mb-4">
            Generated Compounds ({generated_smiles.length})
          </h6>

          {/* Current Compound */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-white mb-2">
                Compound #{currentCompoundIndex + 1}
              </div>
              
              {renderViewer(
                currentCompoundViewerRef,
                `compound-${currentCompoundIndex}`,
                `compound-${currentCompoundIndex}`,
                'h-64'
              )}
              
              <div className="mt-3 text-xs text-gray-400 font-mono break-all bg-gray-900 p-2 rounded">
                {generated_smiles[currentCompoundIndex]}
              </div>
            </div>

            {/* Navigation Controls - Below the 3D representation */}
            {generated_smiles.length > 1 && (
              <div className="flex items-center justify-center gap-4 pt-4">
                <button
                  onClick={prevCompound}
                  disabled={currentCompoundIndex === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                
                <div className=" hidden flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {currentCompoundIndex + 1} of {generated_smiles.length}
                  </span>
                  
                  {/* Page indicators */}
                  <div className=" hidden flex gap-1">
                    {generated_smiles.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentCompoundIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          index === currentCompoundIndex 
                            ? 'bg-blue-500' 
                            : 'bg-gray-600 hover:bg-gray-500'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={nextCompound}
                  disabled={currentCompoundIndex === generated_smiles.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="text-gray-400">No compounds generated.</div>
        </div>
      )}

      {/* Reference Compound Viewer */}
      {reference_smile && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-4">
            Reference Compound
          </h4>
          
          {renderViewer(referenceViewerRef, 'reference', 'reference')}
          
          <div className="mt-3 text-xs text-gray-400 font-mono break-all bg-gray-900 p-2 rounded">
            {reference_smile}
          </div>
        </div>
      )}

      {/* Loading 3Dmol.js */}
      {!is3DmolLoaded && (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading 3D visualization library...</span>
          </div>
        </div>
      )}
    </div>
  )
}