import React, { useState } from 'react'
import { X, Target, Loader2, AlertCircle, CheckCircle, ExternalLink, Download } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'
import { saveAs } from 'file-saver'

interface TargetPredictorModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PredictedTarget {
  chembl: string
  gene: string
  probability: string
  target: string
  target_class: string
  uniprot: string
}

interface TargetPredictionData {
  count: number
  predicted_targets: PredictedTarget[]
  smiles: string
  success: boolean
}

export function TargetPredictorModal({ isOpen, onClose }: TargetPredictorModalProps) {
  const [smiles, setSmiles] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [targetData, setTargetData] = useState<TargetPredictionData | null>(null)
  const [downloadingReport, setDownloadingReport] = useState(false)

  const handleSubmit = async () => {
    if (!smiles.trim()) return

    setLoading(true)
    setError('')
    setTargetData(null)

    try {
      console.log('Sending request to predict targets for SMILES:', smiles.trim())
      
      const response = await fetch('https://backmedi.tech/predict-targets', {
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
      console.log('Target Prediction API Response:', data)
      
      // Check if the response has the expected structure
      if (data && typeof data === 'object') {
        // Check for success field or assume success if we have the expected data structure
        if (data.success === true || (data.count !== undefined && data.predicted_targets && Array.isArray(data.predicted_targets))) {
          setTargetData(data)
        } else if (data.success === false) {
          throw new Error(data.message || 'Target prediction failed')
        } else {
          // If no explicit success field but we have data, assume success
          if (data.predicted_targets && Array.isArray(data.predicted_targets)) {
            setTargetData({
              ...data,
              success: true // Add success field if missing
            })
          } else {
            throw new Error('Invalid response format from target prediction service')
          }
        }
      } else {
        throw new Error('Invalid response from target prediction service')
      }
    } catch (err: any) {
      console.error('Target prediction error:', err)
      setError(err.message || 'Failed to predict targets. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTargetReport = async () => {
    if (!targetData) return

    setDownloadingReport(true)

    try {
      // Create document sections
      const docSections = []

      // Title
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Target Prediction Analysis Report",
              bold: true,
              size: 32,
              color: "7C3AED"
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

      // Summary
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Summary",
              bold: true,
              size: 24
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      )

      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Total predicted targets: ${targetData.count}`,
              size: 20
            })
          ],
          spacing: { after: 300 }
        })
      )

      // Targets table
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Predicted Targets",
              bold: true,
              size: 24
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 }
        })
      )

      // Create table for targets
      const tableRows = [
        // Header row
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Target", bold: true, size: 20 })] })],
              width: { size: 25, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Gene", bold: true, size: 20 })] })],
              width: { size: 15, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Probability", bold: true, size: 20 })] })],
              width: { size: 15, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Class", bold: true, size: 20 })] })],
              width: { size: 25, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "UniProt", bold: true, size: 20 })] })],
              width: { size: 20, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        // Data rows
        ...targetData.predicted_targets.map(target => 
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: target.target, size: 18 })] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: target.gene, size: 18 })] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `${(parseFloat(target.probability) * 100).toFixed(1)}%`, size: 18 })] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: target.target_class, size: 18 })] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: target.uniprot, size: 18 })] })]
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
      const filename = `Target_Prediction_Analysis_${timestamp}.docx`
      
      saveAs(blob, filename)

    } catch (error) {
      console.error('Error generating target prediction report:', error)
      setError('Failed to generate report. Please try again.')
    } finally {
      setDownloadingReport(false)
    }
  }

  const handleClose = () => {
    if (!loading && !downloadingReport) {
      setSmiles('')
      setError('')
      setTargetData(null)
      onClose()
    }
  }

  const getProbabilityColor = (probability: string) => {
    const prob = parseFloat(probability)
    if (prob >= 0.7) return 'text-green-400'
    if (prob >= 0.4) return 'text-yellow-400'
    if (prob >= 0.2) return 'text-orange-400'
    return 'text-red-400'
  }

  const getProbabilityBadge = (probability: string) => {
    const prob = parseFloat(probability)
    if (prob >= 0.7) return 'bg-green-500/20 text-green-300 border-green-500/30'
    if (prob >= 0.4) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    if (prob >= 0.2) return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    return 'bg-red-500/20 text-red-300 border-red-500/30'
  }

  const openChEMBL = (chemblId: string) => {
    window.open(`https://www.ebi.ac.uk/chembl/target_report_card/${chemblId}/`, '_blank')
  }

  const openUniProt = (uniprotId: string) => {
    window.open(`https://www.uniprot.org/uniprot/${uniprotId}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-2xl transition-all ${
          targetData ? 'max-w-7xl' : 'max-w-md'
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
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 w-16 h-16 rounded-xl flex items-center justify-center">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Target Predictor</h2>
                <p className="text-gray-400 text-lg">Predict molecular targets for compounds using AI</p>
              </div>
            </div>

            {/* Input Form - Only show if no results */}
            {!targetData && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="target-smiles" className="block text-lg font-medium text-gray-300 mb-4">
                    SMILES String *
                  </label>
                  <input
                    type="text"
                    id="target-smiles"
                    value={smiles}
                    onChange={(e) => setSmiles(e.target.value)}
                    disabled={loading || downloadingReport}
                    className="w-full px-6 py-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-mono text-lg"
                    placeholder="Enter SMILES string (e.g., CC(=O)OC1=CC=CC=C1C(=O)O for aspirin)"
                    required
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !smiles.trim() || downloadingReport}
                  className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium text-lg transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Predicting Targets...
                    </>
                  ) : (
                    'Predict Targets'
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
          {targetData && (
            <div className="px-8 pb-8">
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">
                      Prediction completed: <span className="font-bold">{targetData.count} targets</span> found for <span className="font-mono">{smiles}</span>
                    </span>
                  </div>
                  <button
                    onClick={downloadTargetReport}
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

              {/* Targets Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">Predicted Targets</h3>
                  <div className="text-sm text-gray-400">
                    Sorted by probability (highest first)
                  </div>
                </div>

                <div className="grid gap-4">
                  {targetData.predicted_targets.map((target, index) => {
                    const probabilityPercent = (parseFloat(target.probability) * 100).toFixed(1)
                    
                    return (
                      <div
                        key={`${target.chembl}-${index}`}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors duration-200"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Target Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="flex-1">
                                <h4 className="text-lg font-semibold text-white mb-1">
                                  {target.target}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                                  <span className="font-mono bg-gray-700 px-2 py-1 rounded">
                                    {target.gene}
                                  </span>
                                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                                    {target.target_class}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Probability Badge */}
                              <div className={`px-3 py-2 rounded-lg border text-center min-w-[80px] ${getProbabilityBadge(target.probability)}`}>
                                <div className="text-lg font-bold">
                                  {probabilityPercent}%
                                </div>
                                <div className="text-xs opacity-75">
                                  probability
                                </div>
                              </div>
                            </div>

                            {/* External Links */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openChEMBL(target.chembl)}
                                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors duration-200"
                              >
                                <ExternalLink className="w-3 h-3" />
                                ChEMBL: {target.chembl}
                              </button>
                              <button
                                onClick={() => openUniProt(target.uniprot)}
                                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors duration-200"
                              >
                                <ExternalLink className="w-3 h-3" />
                                UniProt: {target.uniprot}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-purple-300 text-sm">
                  <strong>Note:</strong> Target predictions are based on structural similarity and machine learning models. 
                  Higher probabilities indicate stronger confidence in the prediction. Click the external links to view detailed information about each target.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}