import React, { useState } from 'react'
import { X, Activity, Loader2, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Download } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'
import { saveAs } from 'file-saver'

interface ADMEProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ADMEData {
  smiles: string
  druglikeness?: any
  pharmacokinetics?: any
  medicinal_chemistry?: any
  physicochemical_properties?: any
  lipophilicity?: any
  water_solubility?: any
  toxicity?: any
  [key: string]: any // Allow for flexible API response structure
}

export function ADMEProfileModal({ isOpen, onClose }: ADMEProfileModalProps) {
  const [smiles, setSmiles] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [admeData, setAdmeData] = useState<ADMEData | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['physicochemical']))
  const [downloadingReport, setDownloadingReport] = useState(false)

  const handleSubmit = async () => {
    if (!smiles.trim()) return

    setLoading(true)
    setError('')
    setAdmeData(null)

    try {
      const response = await fetch('https://backmedi.tech/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smiles: smiles.trim()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('ADME API Response:', data) // Debug log
      setAdmeData(data)
      
      // Auto-expand first section
      setExpandedSections(new Set(['physicochemical']))
    } catch (err: any) {
      console.error('ADME analysis error:', err)
      setError(err.message || 'Failed to analyze compound. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadADMEReport = async () => {
    if (!admeData) return

    setDownloadingReport(true)

    try {
      const structuredSections = getStructuredSections(admeData)
      
      // Create document sections
      const docSections = []

      // Title
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "ADME Profile Analysis Report",
              bold: true,
              size: 32,
              color: "2563EB"
            })
          ],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )

      // Generated date
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Generated on: ${new Date().toLocaleString()}`,
              italics: true,
              size: 20
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 }
        })
      )

      // Add each section
      structuredSections.forEach((section, index) => {
        // Section header
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${index + 1}. ${section.title}`,
                bold: true,
                size: 24
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )

        // Create table for section data
        const tableRows = [
          // Header row
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Property",
                        bold: true,
                        size: 22
                      })
                    ]
                  })
                ],
                width: { size: 50, type: WidthType.PERCENTAGE }
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Value",
                        bold: true,
                        size: 22
                      })
                    ]
                  })
                ],
                width: { size: 50, type: WidthType.PERCENTAGE }
              })
            ]
          }),
          // Data rows
          ...section.fields.map((field: any) => 
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: field.label,
                          size: 20
                        })
                      ]
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: renderValue(field.value),
                          size: 20
                        })
                      ]
                    })
                  ]
                })
              ]
            })
          )
        ]

        const table = new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })

        docSections.push(table)
        
        // Add spacing after table
        docSections.push(
          new Paragraph({
            children: [new TextRun({ text: "", size: 20 })],
            spacing: { after: 300 }
          })
        )
      })

      // Footer
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Generated by NEO, MedMint Research Assistant",
              italics: true,
              size: 18,
              color: "666666"
            })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 600 }
        })
      )

      // Create document
      const doc = new Document({
        sections: [{
          properties: {},
          children: docSections
        }]
      })

      // Generate and download
      const blob = await Packer.toBlob(doc)
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `ADME_Profile_Analysis_${timestamp}.docx`
      
      saveAs(blob, filename)

    } catch (error) {
      console.error('Error generating ADME report:', error)
      setError('Failed to generate report. Please try again.')
    } finally {
      setDownloadingReport(false)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleClose = () => {
    if (!loading && !downloadingReport) {
      setSmiles('')
      setError('')
      setAdmeData(null)
      setExpandedSections(new Set(['physicochemical']))
      onClose()
    }
  }

  const renderValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (typeof value === 'number') {
      return value.toFixed(3)
    }
    if (typeof value === 'string') {
      return value
    }
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    return String(value)
  }

  const getValueColor = (key: string, value: any) => {
    const valueStr = String(value).toLowerCase()
    
    // Color coding based on common ADME interpretation
    if (valueStr.includes('yes') && !key.toLowerCase().includes('inhibitor')) {
      return 'text-green-400'
    }
    if (valueStr.includes('no') && key.toLowerCase().includes('inhibitor')) {
      return 'text-green-400'
    }
    if (valueStr.includes('no') && !key.toLowerCase().includes('inhibitor')) {
      return 'text-red-400'
    }
    if (valueStr.includes('yes') && key.toLowerCase().includes('inhibitor')) {
      return 'text-red-400'
    }
    
    // Violation checks
    if (valueStr.includes('0 violation') || valueStr.includes('0 alert')) {
      return 'text-green-400'
    }
    if (valueStr.includes('violation') || valueStr.includes('alert')) {
      return 'text-red-400'
    }
    
    // Solubility classes
    if (valueStr.includes('highly soluble') || valueStr.includes('very soluble')) {
      return 'text-green-400'
    }
    if (valueStr.includes('soluble')) {
      return 'text-yellow-400'
    }
    
    // Absorption
    if (valueStr.includes('high') && key.toLowerCase().includes('absorption')) {
      return 'text-green-400'
    }
    if (valueStr.includes('low') && key.toLowerCase().includes('absorption')) {
      return 'text-red-400'
    }
    
    return 'text-gray-300'
  }

  const getStructuredSections = (data: ADMEData) => {
    console.log('Processing ADME data:', data) // Debug log

    const sections = [
      {
        id: 'physicochemical',
        title: 'Physicochemical Properties',
        icon: <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">PC</span></div>,
        fields: [
          { key: 'Formula', label: 'Formula', source: 'physicochemical_properties' },
          { key: 'Molecular weight', label: 'Molecular weight', source: 'physicochemical_properties' },
          { key: 'Num. heavy atoms', label: 'Num. heavy atoms', source: 'physicochemical_properties' },
          { key: 'Num. arom. heavy atoms', label: 'Num. arom. heavy atoms', source: 'physicochemical_properties' },
          { key: 'Fraction Csp3', label: 'Fraction Csp3', source: 'physicochemical_properties' },
          { key: 'Num. rotatable bonds', label: 'Num. rotatable bonds', source: 'physicochemical_properties' },
          { key: 'Num. H-bond donors', label: 'Num. H-bond donors', source: 'physicochemical_properties' },
          { key: 'Num. H-bond acceptors', label: 'Num. H-bond acceptors', source: 'physicochemical_properties' },
          { key: 'Molar Refractivity', label: 'Molar Refractivity', source: 'physicochemical_properties' },
          { key: 'TPSA', label: 'TPSA', source: 'physicochemical_properties' }
        ]
      },
      {
        id: 'lipophilicity',
        title: 'Lipophilicity',
        icon: <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">L</span></div>,
        fields: [
          { key: 'Log Po/w (iLOGP)', label: 'Log Po/w (iLOGP)', source: 'physicochemical_properties' },
          { key: 'Log Po/w (XLOGP3)', label: 'Log Po/w (XLOGP3)', source: 'physicochemical_properties' },
          { key: 'Log Po/w (WLOGP)', label: 'Log Po/w (WLOGP)', source: 'physicochemical_properties' },
          { key: 'Log Po/w (MLOGP)', label: 'Log Po/w (MLOGP)', source: 'physicochemical_properties' },
          { key: 'Log Po/w (SILICOS-IT)', label: 'Log Po/w (SILICOS-IT)', source: 'physicochemical_properties' },
          { key: 'Consensus Log Po/w\nConsensus Log Po/w', label: 'Consensus Log Po/w', source: 'physicochemical_properties' }
        ]
      },
      {
        id: 'water_solubility',
        title: 'Water Solubility',
        icon: <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">W</span></div>,
        fields: [
          { key: 'Log S (ESOL)', label: 'Log S (ESOL)', source: 'druglikeness' },
          { key: 'Log S (Ali)', label: 'Log S (Ali)', source: 'druglikeness' },
          { key: 'Log S (SILICOS-IT)', label: 'Log S (SILICOS-IT)', source: 'druglikeness' },
          { key: 'Solubility', label: 'Solubility', source: 'druglikeness' },
          { key: 'Class', label: 'Class', source: 'druglikeness' }
        ]
      },
      {
        id: 'pharmacokinetics',
        title: 'Pharmacokinetics',
        icon: <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">P</span></div>,
        fields: [
          { key: 'GI absorption', label: 'GI absorption', source: 'druglikeness' },
          { key: 'BBB permeant', label: 'BBB permeant', source: 'druglikeness' },
          { key: 'P-gp substrate', label: 'P-gp substrate', source: 'druglikeness' },
          { key: 'CYP1A2 inhibitor', label: 'CYP1A2 inhibitor', source: 'druglikeness' },
          { key: 'CYP2C19 inhibitor', label: 'CYP2C19 inhibitor', source: 'druglikeness' },
          { key: 'CYP2C9 inhibitor', label: 'CYP2C9 inhibitor', source: 'druglikeness' },
          { key: 'CYP2D6 inhibitor', label: 'CYP2D6 inhibitor', source: 'druglikeness' },
          { key: 'CYP3A4 inhibitor', label: 'CYP3A4 inhibitor', source: 'druglikeness' },
          { key: 'Log Kp (skin permeation)', label: 'Log Kp (skin permeation)', source: 'druglikeness' }
        ]
      },
      {
        id: 'druglikeness',
        title: 'Druglikeness',
        icon: <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">D</span></div>,
        fields: [
          { key: 'Lipinski', label: 'Lipinski', source: 'druglikeness' },
          { key: 'Ghose', label: 'Ghose', source: 'druglikeness' },
          { key: 'Veber', label: 'Veber', source: 'druglikeness' },
          { key: 'Egan', label: 'Egan', source: 'druglikeness' },
          { key: 'Muegge', label: 'Muegge', source: 'druglikeness' },
          { key: 'Bioavailability Score', label: 'Bioavailability Score', source: 'druglikeness' }
        ]
      },
      {
        id: 'medicinal_chemistry',
        title: 'Medicinal Chemistry',
        icon: <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"><span className="text-white text-xs font-bold">M</span></div>,
        fields: [
          { key: 'PAINS', label: 'PAINS', source: 'druglikeness' },
          { key: 'Brenk', label: 'Brenk', source: 'druglikeness' },
          { key: 'Leadlikeness', label: 'Leadlikeness', source: 'druglikeness' },
          { key: 'Synthetic accessibility', label: 'Synthetic accessibility', source: 'druglikeness' }
        ]
      }
    ]

    return sections.map(section => {
      const availableFields = section.fields.filter(field => {
        const sourceData = data[field.source]
        if (sourceData && sourceData[field.key] !== undefined && sourceData[field.key] !== null) {
          field.value = sourceData[field.key]
          return true
        }
        return false
      })

      return {
        ...section,
        fields: availableFields,
        hasData: availableFields.length > 0
      }
    }).filter(section => section.hasData)
  }

  const renderSection = (section: any, data: ADMEData) => {
    const isExpanded = expandedSections.has(section.id)

    return (
      <div key={section.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection(section.id)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors duration-200"
        >
          <div className="flex items-center gap-3">
            {section.icon}
            <h3 className="text-lg font-semibold text-white">{section.title}</h3>
            <span className="text-sm text-gray-400">({section.fields.length} properties)</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 pt-0 border-t border-gray-700">
            <div className="grid gap-3">
              {section.fields.map((field: any) => {
                const value = field.value
                
                if (value === null || value === undefined) return null

                return (
                  <div key={field.key} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                    <span className="text-sm text-gray-400">
                      {field.label}
                    </span>
                    <span className={`text-sm font-medium ${getValueColor(field.key, value)} text-right max-w-xs`}>
                      {renderValue(value)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  const structuredSections = admeData ? getStructuredSections(admeData) : []

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-2xl transition-all ${
          admeData ? 'max-w-6xl' : 'max-w-md'
        }`}>
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={loading || downloadingReport}
            className="absolute right-6 top-6 z-10 text-gray-400 hover:text-white transition-colors duration-300 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="p-8 pb-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 w-16 h-16 rounded-xl flex items-center justify-center">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">ADME Profile Analysis</h2>
                <p className="text-gray-400 text-lg">Comprehensive drug-likeness and pharmacokinetic properties</p>
              </div>
            </div>

            {/* Input Form - Only show if no results */}
            {!admeData && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="smiles-input" className="block text-lg font-medium text-gray-300 mb-4">
                    SMILES String *
                  </label>
                  <input
                    type="text"
                    id="smiles-input"
                    value={smiles}
                    onChange={(e) => setSmiles(e.target.value)}
                    disabled={loading || downloadingReport}
                    className="w-full px-6 py-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-lg"
                    placeholder="Enter SMILES string (e.g., CCO for ethanol)"
                    required
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !smiles.trim() || downloadingReport}
                  className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium text-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze'
                  )}
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          {admeData && (
            <div className="px-8 pb-8">
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Analysis completed for: <span className="font-mono">{smiles}</span></span>
                  </div>
                  <button
                    onClick={downloadADMEReport}
                    disabled={downloadingReport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors duration-300 disabled:cursor-not-allowed"
                  >
                    {downloadingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download Report
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Results Grid */}
              {structuredSections.length > 0 ? (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Left Column - 4 sections */}
                  <div className="space-y-4">
                    {structuredSections.slice(0, 4).map(section => 
                      renderSection(section, admeData)
                    )}
                  </div>

                  {/* Right Column - remaining sections */}
                  <div className="space-y-4">
                    {structuredSections.slice(4).map(section => 
                      renderSection(section, admeData)
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Raw API Response</h3>
                  <pre className="text-sm text-gray-300 overflow-auto max-h-96 bg-gray-900 p-4 rounded">
                    {JSON.stringify(admeData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Info */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>Note:</strong> ADME properties help predict how a drug will be Absorbed, Distributed, Metabolized, and Excreted in the body. 
                  Green values typically indicate favorable properties, while red values may indicate potential issues.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}