import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Search, Loader2, Eye, EyeOff, Palette, Ruler, Zap, RotateCcw, Download, Info, AlertTriangle, Target, ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { BoltBadge } from './BoltBadge'

interface StructureStudioProps {
  labId: string
  labName: string
  onBack: () => void
}

declare global {
  interface Window {
    $3Dmol: any
  }
}

export function StructureStudio({ labId, labName, onBack }: StructureStudioProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<any>(null)
  const [pdbId, setPdbId] = useState('')
  const [smilesString, setSmilesString] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [proteinLoaded, setProteinLoaded] = useState(false)
  const [compoundLoaded, setCompoundLoaded] = useState(false)
  const [measurementMode, setMeasurementMode] = useState<'off' | 'protein' | 'compound' | 'both'>('off')
  const [selectedAtoms, setSelectedAtoms] = useState<any[]>([])
  const [distances, setDistances] = useState<string[]>([])
  const [showBonds, setShowBonds] = useState(true)
  const [colorScheme, setColorScheme] = useState('chain')
  const [showHBonds, setShowHBonds] = useState(false)
  const [ligandStyle, setLigandStyle] = useState('stick')
  const [proteinModel, setProteinModel] = useState<any>(null)
  const [compoundModel, setCompoundModel] = useState<any>(null)
  const [firstAtomType, setFirstAtomType] = useState<'protein' | 'compound' | null>(null)
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true) // Start collapsed on mobile

  useEffect(() => {
    // Load 3Dmol.js script
    const script = document.createElement('script')
    script.src = 'https://3dmol.csb.pitt.edu/build/3Dmol-min.js'
    script.onload = initializeViewer
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Effect to setup measurement mode when it changes
  useEffect(() => {
    if (viewer && measurementMode !== 'off') {
      setupMeasurementMode()
    }
  }, [measurementMode, viewer, proteinModel, compoundModel])

  // Effect to update styling when measurement mode or first atom type changes
  useEffect(() => {
    if (viewer) {
      if (proteinModel) {
        applyProteinStyling(proteinModel)
      }
      if (compoundModel) {
        applyLigandStyling(compoundModel)
      }
    }
  }, [measurementMode, firstAtomType, viewer, proteinModel, compoundModel, colorScheme, showBonds, ligandStyle])

  // Effect to handle hydrogen bonds display
  useEffect(() => {
    if (viewer) {
      if (showHBonds && proteinModel && compoundModel) {
        detectHydrogenBonds()
      } else {
        clearHydrogenBonds()
      }
    }
  }, [showHBonds, proteinModel, compoundModel, viewer])

  const initializeViewer = () => {
    if (viewerRef.current && window.$3Dmol) {
      const config = { backgroundColor: '#1a1a1a' }
      const newViewer = window.$3Dmol.createViewer(viewerRef.current, config)
      setViewer(newViewer)
    }
  }

  const fetchProteinStructure = async (pdbIdInput: string) => {
    if (!viewer || !pdbIdInput.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`https://files.rcsb.org/download/${pdbIdInput.toUpperCase()}.pdb`)
      
      if (!response.ok) {
        throw new Error(`PDB ID ${pdbIdInput} not found`)
      }

      const pdbData = await response.text()
      
      // Clear existing protein model
      if (proteinModel) {
        viewer.removeModel(proteinModel)
      }
      
      // Add protein model
      const model = viewer.addModel(pdbData, 'pdb')
      setProteinModel(model)
      
      // Style the protein
      applyProteinStyling(model)
      
      // Auto-zoom to fit both structures
      autoZoomToFit()
      
      setProteinLoaded(true)
      
    } catch (err: any) {
      setError(`Failed to load protein: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompoundStructure = async (smiles: string) => {
    if (!viewer || !smiles.trim()) return

    setLoading(true)
    setError('')

    try {
      // Try NIH Cactus first for SMILES to SDF conversion
      let sdfData = ''
      
      try {
        const cactusResponse = await fetch(
          `https://cactus.nci.nih.gov/chemical/structure/${encodeURIComponent(smiles)}/sdf`
        )
        
        if (cactusResponse.ok) {
          sdfData = await cactusResponse.text()
        }
      } catch (cactusError) {
        console.warn('Cactus API failed, trying PubChem...')
      }

      // Fallback to PubChem if Cactus fails
      if (!sdfData) {
        try {
          // First get CID from SMILES
          const cidResponse = await fetch(
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/cids/JSON`
          )
          
          if (cidResponse.ok) {
            const cidData = await cidResponse.json()
            const cid = cidData.IdentifierList.CID[0]
            
            // Then get SDF from CID
            const sdfResponse = await fetch(
              `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/SDF`
            )
            
            if (sdfResponse.ok) {
              sdfData = await sdfResponse.text()
            }
          }
        } catch (pubchemError) {
          throw new Error('Unable to convert SMILES to 3D structure')
        }
      }

      if (!sdfData) {
        throw new Error('No structure data received')
      }

      // Remove existing compound model
      if (compoundModel) {
        viewer.removeModel(compoundModel)
      }

      // Add compound model
      const model = viewer.addModel(sdfData, 'sdf')
      setCompoundModel(model)
      
      // Style the compound
      applyLigandStyling(model)

      // Position compound away from protein if protein is loaded
      if (proteinLoaded) {
        const atoms = model.selectedAtoms({})
        atoms.forEach((atom: any) => {
          atom.x += 20 // Offset compound position
        })
      }

      // Auto-zoom to fit both structures
      autoZoomToFit()
      
      setCompoundLoaded(true)
      
    } catch (err: any) {
      setError(`Failed to load compound: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getOpacityForMeasurementMode = (isProtein: boolean) => {
    if (measurementMode === 'off') return 1.0
    
    if (measurementMode === 'protein') {
      return isProtein ? 1.0 : 0.1
    } else if (measurementMode === 'compound') {
      return isProtein ? 0.1 : 1.0
    } else if (measurementMode === 'both') {
      // In 'both' mode, check if we have a first atom selected
      if (firstAtomType === null) {
        return 1.0 // Both visible until first selection
      } else if (firstAtomType === 'protein') {
        return isProtein ? 0.1 : 1.0 // Dim protein, keep compound visible
      } else {
        return isProtein ? 1.0 : 0.1 // Dim compound, keep protein visible
      }
    }
    
    return 1.0
  }

  const applyProteinStyling = (model: any) => {
    if (!model || !viewer) return
    
    // Clear existing styles
    model.setStyle({}, {})
    
    const opacity = getOpacityForMeasurementMode(true)
    
    // Apply base styling based on color scheme
    const cartoonStyle: any = { 
      colorscheme: colorScheme,
      opacity: opacity
    }

    // Always apply cartoon representation
    model.setStyle({}, { cartoon: cartoonStyle })

    // Add bonds for heteroatoms if enabled
    if (showBonds) {
      model.setStyle({ hetflag: true }, { 
        cartoon: cartoonStyle,
        stick: { colorscheme: 'Jmol', radius: 0.3, opacity: opacity } 
      })
    }

    // Show atoms as small spheres if in measurement mode for protein atoms
    if (measurementMode !== 'off' && (measurementMode === 'protein' || measurementMode === 'both')) {
      model.setStyle({}, { 
        cartoon: cartoonStyle,
        sphere: { 
          colorscheme: colorScheme, 
          scale: 0.2,
          opacity: opacity
        }
      })
      
      // Also apply to heteroatoms if bonds are shown
      if (showBonds) {
        model.setStyle({ hetflag: true }, { 
          cartoon: cartoonStyle,
          stick: { colorscheme: 'Jmol', radius: 0.3, opacity: opacity },
          sphere: { 
            colorscheme: 'Jmol', 
            scale: 0.2,
            opacity: opacity
          }
        })
      }
    }

    viewer.render()
  }

  const applyLigandStyling = (model: any) => {
    if (!model || !viewer) return
    
    // Clear existing styles
    model.setStyle({}, {})
    
    const opacity = getOpacityForMeasurementMode(false)
    
    // Apply base ligand style
    if (ligandStyle === 'stick') {
      model.setStyle({}, {
        stick: { colorscheme: 'Jmol', radius: 0.2, opacity: opacity }
      })
    } else if (ligandStyle === 'sphere') {
      model.setStyle({}, {
        sphere: { colorscheme: 'Jmol', scale: 0.3, opacity: opacity }
      })
    } else if (ligandStyle === 'ball-stick') {
      model.setStyle({}, {
        stick: { colorscheme: 'Jmol', radius: 0.2, opacity: opacity },
        sphere: { colorscheme: 'Jmol', scale: 0.25, opacity: opacity }
      })
    }

    // Show atoms as additional spheres if in measurement mode for compound atoms
    if (measurementMode !== 'off' && (measurementMode === 'compound' || measurementMode === 'both')) {
      if (ligandStyle === 'stick') {
        model.setStyle({}, {
          stick: { colorscheme: 'Jmol', radius: 0.2, opacity: opacity },
          sphere: { 
            colorscheme: 'Jmol', 
            scale: 0.2,
            opacity: opacity
          }
        })
      } else if (ligandStyle === 'sphere') {
        // For sphere style, just make them more visible
        model.setStyle({}, {
          sphere: { 
            colorscheme: 'Jmol', 
            scale: 0.35,
            opacity: opacity
          }
        })
      } else if (ligandStyle === 'ball-stick') {
        // Ball-stick already shows atoms, just enhance them
        model.setStyle({}, {
          stick: { colorscheme: 'Jmol', radius: 0.2, opacity: opacity },
          sphere: { 
            colorscheme: 'Jmol', 
            scale: 0.3,
            opacity: opacity
          }
        })
      }
    }

    viewer.render()
  }

  const autoZoomToFit = () => {
    if (viewer) {
      setTimeout(() => {
        viewer.zoomTo()
        viewer.render()
      }, 100)
    }
  }

  const zoomIn = () => {
    if (viewer) {
      viewer.zoom(1.2)
      viewer.render()
    }
  }

  const zoomOut = () => {
    if (viewer) {
      viewer.zoom(0.8)
      viewer.render()
    }
  }

  const isAtomFromProtein = (atom: any) => {
    // Check if atom belongs to protein model
    if (!proteinModel) return false
    const proteinAtoms = proteinModel.selectedAtoms({})
    return proteinAtoms.some((pAtom: any) => 
      Math.abs(pAtom.x - atom.x) < 0.01 && 
      Math.abs(pAtom.y - atom.y) < 0.01 && 
      Math.abs(pAtom.z - atom.z) < 0.01
    )
  }

  const isAtomClickable = (atom: any) => {
    const isProteinAtom = isAtomFromProtein(atom)
    
    if (measurementMode === 'protein') {
      return isProteinAtom
    } else if (measurementMode === 'compound') {
      return !isProteinAtom
    } else if (measurementMode === 'both') {
      if (firstAtomType === null) {
        return true // Any atom can be first
      } else if (firstAtomType === 'protein') {
        return !isProteinAtom // Only compound atoms clickable
      } else {
        return isProteinAtom // Only protein atoms clickable
      }
    }
    
    return false
  }

  // Use useCallback to create a stable reference for the atom click handler
  const handleAtomClick = useCallback((atom: any) => {
    console.log('Atom clicked:', atom, 'Clickable:', isAtomClickable(atom))
    
    if (!isAtomClickable(atom)) {
      return // Ignore clicks on non-clickable atoms
    }

    setSelectedAtoms(currentSelected => {
      if (currentSelected.length < 2) {
        const newSelected = [...currentSelected, atom]
        
        // Determine atom type for first selection in 'both' mode
        if (measurementMode === 'both' && currentSelected.length === 0) {
          const isProteinAtom = isAtomFromProtein(atom)
          setFirstAtomType(isProteinAtom ? 'protein' : 'compound')
        }
        
        // Highlight selected atom with a larger, more visible sphere
        viewer.addSphere({
          center: { x: atom.x, y: atom.y, z: atom.z },
          radius: 2.0,
          color: 'yellow',
          alpha: 0.9
        })
        
        if (newSelected.length === 2) {
          // Calculate distance
          const dist = calculateDistance(newSelected[0], newSelected[1])
          const distanceText = `${dist.toFixed(2)} Å`
          setDistances(prev => [...prev, distanceText])
          
          // Add distance label with better visibility
          const midpoint = {
            x: (newSelected[0].x + newSelected[1].x) / 2,
            y: (newSelected[0].y + newSelected[1].y) / 2,
            z: (newSelected[0].z + newSelected[1].z) / 2
          }
          
          viewer.addLabel(distanceText, {
            position: midpoint,
            backgroundColor: 'rgba(255, 255, 0, 0.9)',
            fontColor: 'black',
            fontSize: 16,
            borderThickness: 2,
            borderColor: 'black'
          })
          
          // Draw line between atoms
          viewer.addCylinder({
            start: { x: newSelected[0].x, y: newSelected[0].y, z: newSelected[0].z },
            end: { x: newSelected[1].x, y: newSelected[1].y, z: newSelected[1].z },
            radius: 0.2,
            color: 'yellow',
            alpha: 0.9
          })
          
          viewer.render()
          
          // Reset selection for next measurement
          setFirstAtomType(null)
          return []
        }
        
        viewer.render()
        return newSelected
      }
      return currentSelected
    })
  }, [viewer, measurementMode, firstAtomType, isAtomClickable])

  const setupMeasurementMode = useCallback(() => {
    if (!viewer) return
    
    console.log('Setting up measurement mode:', measurementMode)
    
    // Clear any existing click handlers
    viewer.setClickable({}, false)
    
    if (measurementMode !== 'off') {
      // Enable clicking on all atoms first
      viewer.setClickable({}, true, handleAtomClick)
      
      console.log('Measurement mode setup complete')
    }
  }, [viewer, measurementMode, handleAtomClick])

  const setMeasurementModeAndUpdate = (mode: 'off' | 'protein' | 'compound' | 'both') => {
    console.log('Changing measurement mode to:', mode)
    setMeasurementMode(mode)
    setSelectedAtoms([])
    setFirstAtomType(null)
    
    if (mode === 'off') {
      // Disable click selection
      if (viewer) {
        viewer.setClickable({}, false)
        // Clear all measurement visualizations when exiting measurement mode
        viewer.removeAllShapes()
        viewer.removeAllLabels()
        
        // Re-render the models with normal opacity and styling
        if (proteinModel) {
          applyProteinStyling(proteinModel)
        }
        if (compoundModel) {
          applyLigandStyling(compoundModel)
        }
        
        viewer.render()
      }
      setDistances([])
    }
  }

  const clearSelectedAtoms = () => {
    setSelectedAtoms([])
    setFirstAtomType(null)
    
    if (viewer) {
      // Clear all measurement visualizations
      viewer.removeAllShapes()
      viewer.removeAllLabels()
      
      // Re-render the models with normal opacity
      if (proteinModel) {
        applyProteinStyling(proteinModel)
      }
      if (compoundModel) {
        applyLigandStyling(compoundModel)
      }
      
      viewer.render()
    }
    setDistances([])
  }

  const calculateDistance = (atom1: any, atom2: any) => {
    const dx = atom1.x - atom2.x
    const dy = atom1.y - atom2.y
    const dz = atom1.z - atom2.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  const toggleBonds = () => {
    setShowBonds(!showBonds)
  }

  const changeColorScheme = (scheme: string) => {
    setColorScheme(scheme)
  }

  const changeLigandStyle = (style: string) => {
    setLigandStyle(style)
  }

  const detectHydrogenBonds = () => {
    if (!viewer || !proteinModel || !compoundModel) return

    // Enhanced hydrogen bond detection
    const proteinAtoms = proteinModel.selectedAtoms({})
    const compoundAtoms = compoundModel.selectedAtoms({})
    
    proteinAtoms.forEach((pAtom: any) => {
      if (pAtom.elem === 'N' || pAtom.elem === 'O') {
        compoundAtoms.forEach((cAtom: any) => {
          if (cAtom.elem === 'N' || cAtom.elem === 'O') {
            const dist = calculateDistance(pAtom, cAtom)
            if (dist >= 2.5 && dist <= 3.5) { // Optimal H-bond distance range
              viewer.addCylinder({
                start: { x: pAtom.x, y: pAtom.y, z: pAtom.z },
                end: { x: cAtom.x, y: cAtom.y, z: cAtom.z },
                radius: 0.1,
                color: 'cyan',
                alpha: 0.8,
                dashed: true
              })
              
              // Add H-bond label
              viewer.addLabel(`H-Bond ${dist.toFixed(1)}Å`, {
                position: {
                  x: (pAtom.x + cAtom.x) / 2,
                  y: (pAtom.y + cAtom.y) / 2,
                  z: (pAtom.z + cAtom.z) / 2
                },
                backgroundColor: 'cyan',
                fontColor: 'white',
                fontSize: 10
              })
            }
          }
        })
      }
    })
    viewer.render()
  }

  const clearHydrogenBonds = () => {
    if (!viewer) return
    
    // Clear all shapes and labels (this removes H-bonds, measurements, etc.)
    viewer.removeAllShapes()
    viewer.removeAllLabels()
    
    // Re-render the models
    if (proteinModel) {
      applyProteinStyling(proteinModel)
    }
    if (compoundModel) {
      applyLigandStyling(compoundModel)
    }
    
    viewer.render()
  }

  const resetView = () => {
    if (viewer) {
      autoZoomToFit()
    }
  }

  const clearAll = () => {
    if (viewer) {
      viewer.clear()
      viewer.render()
    }
    setProteinLoaded(false)
    setCompoundLoaded(false)
    setProteinModel(null)
    setCompoundModel(null)
    setSelectedAtoms([])
    setDistances([])
    setPdbId('')
    setSmilesString('')
    setError('')
    setMeasurementMode('off')
    setShowHBonds(false)
    setFirstAtomType(null)
  }

  const exportImage = () => {
    if (viewer) {
      const imgData = viewer.pngURI()
      const link = document.createElement('a')
      link.download = `${labName}-structure.png`
      link.href = imgData
      link.click()
    }
  }

  const getMeasurementModeDescription = () => {
    switch (measurementMode) {
      case 'protein':
        return 'Measuring distances between protein atoms only'
      case 'compound':
        return 'Measuring distances between compound atoms only'
      case 'both':
        if (firstAtomType === null) {
          return 'Click any atom to start measuring between protein and compound'
        } else if (firstAtomType === 'protein') {
          return 'Protein atom selected. Click a compound atom to measure distance.'
        } else {
          return 'Compound atom selected. Click a protein atom to measure distance.'
        }
      default:
        return ''
    }
  }

  return (
    <div className="h-screen bg-[#0F0F0F] text-white flex flex-col overflow-hidden">
      <div className="fixed top-[90px] right-8 z-50">
            <BoltBadge />
      </div>

      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0F0F0F]/95 backdrop-blur-md flex-shrink-0">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              Back
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-white">Structure Studio</h1>
              <p className="text-sm text-gray-400">
                Interactive 3D molecular visualization & analysis
              </p>
            </div>
            {/* Mobile panel toggle */}
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Toggle Control Panel"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={zoomOut}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={zoomIn}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={resetView}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Reset View"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={exportImage}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Export Image"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={clearAll}
              className="hidden md:block px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-300"
            >
              Clear All
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile overlay when panel is open - positioned behind panel */}
        {!isPanelCollapsed && (
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-20"
            onClick={() => setIsPanelCollapsed(true)}
          />
        )}

        {/* Control Panel - Collapsible on Mobile */}
        <div className={`
          ${isPanelCollapsed ? 'w-0 md:w-80' : 'w-80'} 
          bg-gray-900 border-r border-gray-800 flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out
          ${isPanelCollapsed ? 'md:block hidden' : 'block'}
          relative z-30
        `}>
          <div className="relative h-full">
            {/* Mobile collapse button */}
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="md:hidden absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white transition-colors duration-300 bg-gray-800 rounded-lg"
            >
              {isPanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className="p-6 space-y-6 h-full overflow-y-auto">
              {/* Protein Input */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-400" />
                  Load Protein
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={pdbId}
                    onChange={(e) => setPdbId(e.target.value.toUpperCase())}
                    placeholder="Enter PDB ID (e.g., 1HTM)"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => fetchProteinStructure(pdbId)}
                    disabled={loading || !pdbId.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Protein'
                    )}
                  </button>
                  {proteinLoaded && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Protein loaded
                    </div>
                  )}
                </div>
              </div>

              {/* Compound Input */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  Load Compound
                </h3>
                <div className="space-y-3">
                  <textarea
                    value={smilesString}
                    onChange={(e) => setSmilesString(e.target.value)}
                    placeholder="Enter SMILES string (e.g., CCO for ethanol)"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows={3}
                  />
                  <button
                    onClick={() => fetchCompoundStructure(smilesString)}
                    disabled={loading || !smilesString.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load Compound'
                    )}
                  </button>
                  {compoundLoaded && (
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Compound loaded
                    </div>
                  )}
                </div>
              </div>

              {/* Visualization Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-green-400" />
                  Visualization
                </h3>
                <div className="space-y-4">
                  {/* Protein Color Scheme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Protein Color Scheme
                    </label>
                    <select
                      value={colorScheme}
                      onChange={(e) => changeColorScheme(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="chain">By Chain</option>
                      <option value="spectrum">Spectrum</option>
                      <option value="residue">By Residue</option>
                      <option value="secondary">Secondary Structure</option>
                    </select>
                  </div>

                  {/* Ligand Style */}
                  {compoundLoaded && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Ligand Style
                      </label>
                      <select
                        value={ligandStyle}
                        onChange={(e) => changeLigandStyle(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="stick">Stick</option>
                        <option value="sphere">Sphere</option>
                        <option value="ball-stick">Ball & Stick</option>
                      </select>
                    </div>
                  )}

                  {/* Toggle Controls */}
                  <div className="space-y-3">
                    <button
                      onClick={toggleBonds}
                      disabled={!proteinLoaded}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        showBonds 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span>Show Bonds</span>
                      {showBonds ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setShowHBonds(!showHBonds)}
                      disabled={!proteinLoaded || !compoundLoaded}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        showHBonds 
                          ? 'bg-cyan-600 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span>H-Bonds</span>
                      <Zap className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Measurement Tools */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Ruler className="w-5 h-5 text-orange-400" />
                  Distance Measurement
                </h3>
                <div className="space-y-3">
                  {/* Measurement Mode Buttons */}
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setMeasurementModeAndUpdate('protein')}
                      disabled={!proteinLoaded}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        measurementMode === 'protein'
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Ruler className="w-4 h-4" />
                      Protein Atoms
                    </button>

                    <button
                      onClick={() => setMeasurementModeAndUpdate('compound')}
                      disabled={!compoundLoaded}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        measurementMode === 'compound'
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Ruler className="w-4 h-4" />
                      Compound Atoms
                    </button>

                    <button
                      onClick={() => setMeasurementModeAndUpdate('both')}
                      disabled={!proteinLoaded || !compoundLoaded}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        measurementMode === 'both'
                          ? 'bg-orange-600 text-white' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <Ruler className="w-4 h-4" />
                      Protein ↔ Compound
                    </button>

                    {measurementMode !== 'off' && (
                      <button
                        onClick={() => setMeasurementModeAndUpdate('off')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-300"
                      >
                        <X className="w-4 h-4" />
                        Exit Measurement
                      </button>
                    )}
                  </div>

                  {measurementMode !== 'off' && (
                    <div className="space-y-3">
                      <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                        <p className="text-orange-300 text-sm">
                          {getMeasurementModeDescription()}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                        <p className="text-yellow-300 text-sm">
                          {selectedAtoms.length} atom{selectedAtoms.length !== 1 ? 's' : ''} selected. 
                          {selectedAtoms.length === 1 && ' Click another atom to measure distance.'}
                          {selectedAtoms.length === 0 && ' Click on an atom to start measuring.'}
                        </p>
                      </div>

                      <button
                        onClick={clearSelectedAtoms}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-300"
                      >
                        <X className="w-4 h-4" />
                        Clear Measurements
                      </button>
                    </div>
                  )}

                  {distances.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Measurements:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {distances.map((distance, index) => (
                          <div key={index} className="text-sm text-gray-400 bg-gray-800 px-3 py-2 rounded">
                            Distance {index + 1}: {distance}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2 text-blue-300">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Tips:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Mouse: rotate, zoom, pan</li>
                      <li>• Use zoom buttons for precise control</li>
                      <li>• Try PDB: 1HTM (HIV protease)</li>
                      <li>• SMILES: CCO (ethanol), CC(=O)O (acetic acid)</li>
                      <li>• Choose measurement mode to focus on specific atoms</li>
                      <li>• Protein ↔ Compound mode measures between structures</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Viewer */}
        <div className="flex-1 relative z-10">
          <div
            ref={viewerRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
          
          {!proteinLoaded && !compoundLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Zap className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Structure Studio</h3>
                <p>Load a protein or compound to begin visualization</p>
                <button
                  onClick={() => setIsPanelCollapsed(false)}
                  className="md:hidden mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300"
                >
                  Open Control Panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}