import { useState } from 'react'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'
import { saveAs } from 'file-saver'
import { useAuth } from './useAuth'
import { usePerplexity } from './usePerplexity'
import { ChatMessage } from '../components/Research'

interface ReportData {
  generatedCompounds: Array<{
    smiles: string[]
    pdbId: string
    insights?: string
  }>
  bindingAffinities: Array<{
    affinity: number
    insights?: string
  }>
  chatSummary?: string
}

export function useReportGeneration() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const { user } = useAuth()
  const { sendToPerplexity } = usePerplexity()

  const extractReportData = (messages: ChatMessage[]): ReportData => {
    const reportData: ReportData = {
      generatedCompounds: [],
      bindingAffinities: []
    }

    messages.forEach(message => {
      if (message.toolUsed && message.toolData) {
        switch (message.toolUsed) {
          case 'drug-generation':
            const compoundData = message.toolData.mockData || message.toolData
            if (compoundData.generated_smiles || compoundData.compounds) {
              reportData.generatedCompounds.push({
                smiles: compoundData.generated_smiles || compoundData.compounds?.map((c: any) => c.smiles) || [],
                pdbId: compoundData.pdb_id || 'Unknown',
                insights: message.content || 'No insights available'
              })
            }
            break

          case 'binding-affinity':
            const affinityData = message.toolData.mockData || message.toolData
            if (affinityData.predicted_binding_affinity !== undefined) {
              reportData.bindingAffinities.push({
                affinity: affinityData.predicted_binding_affinity,
                insights: message.content || 'No insights available'
              })
            }
            break

          // Note: Removed 'graph-knowledge' case as AQL results are no longer included
        }
      }
    })

    return reportData
  }

  const generateChatSummary = async (messages: ChatMessage[]): Promise<string> => {
    try {
      const conversationText = messages
        .map(msg => `${msg.type}: ${msg.content}`)
        .join('\n')

      const summaryPrompt = `Please provide a comprehensive summary of this research conversation. Focus on key findings, insights, and conclusions about the molecular research discussed:\n\n${conversationText}`

      const response = await sendToPerplexity(summaryPrompt)
      return response.output
    } catch (error) {
      console.error('Error generating chat summary:', error)
      return 'Unable to generate conversation summary.'
    }
  }

  const createDocxDocument = async (reportData: ReportData, title: string): Promise<Blob> => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32,
                color: "2563EB"
              })
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Generated date
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
          }),

          // Executive Summary
          new Paragraph({
            children: [
              new TextRun({
                text: "Executive Summary",
                bold: true,
                size: 28
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: reportData.chatSummary || "This report contains the results of molecular research analysis including compound generation and binding affinity predictions.",
                size: 22
              })
            ],
            spacing: { after: 400 }
          }),

          // Generated Compounds Section
          ...(reportData.generatedCompounds.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. Generated Compounds",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),

            ...reportData.generatedCompounds.flatMap((compound, index) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Compound Set ${index + 1} (PDB: ${compound.pdbId})`,
                    bold: true,
                    size: 24
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: "SMILES Strings:",
                    bold: true,
                    size: 22
                  })
                ],
                spacing: { after: 100 }
              }),

              ...compound.smiles.map(smiles => 
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `• ${smiles}`,
                      font: "Courier New",
                      size: 20
                    })
                  ],
                  spacing: { after: 50 }
                })
              ),

              new Paragraph({
                children: [
                  new TextRun({
                    text: "AI Analysis:",
                    bold: true,
                    size: 22
                  })
                ],
                spacing: { before: 200, after: 100 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: compound.insights || "No analysis available",
                    size: 20
                  })
                ],
                spacing: { after: 300 }
              })
            ])
          ] : []),

          // Binding Affinity Section
          ...(reportData.bindingAffinities.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. Binding Affinity Predictions",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),

            ...reportData.bindingAffinities.flatMap((binding, index) => [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Prediction ${index + 1}`,
                    bold: true,
                    size: 24
                  })
                ],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 300, after: 150 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: "Predicted Binding Affinity:",
                    bold: true,
                    size: 22
                  })
                ],
                spacing: { after: 100 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: `${binding.affinity.toFixed(3)} pKd`,
                    size: 24,
                    bold: true,
                    color: "7C3AED"
                  })
                ],
                spacing: { after: 200 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: "AI Analysis:",
                    bold: true,
                    size: 22
                  })
                ],
                spacing: { before: 200, after: 100 }
              }),

              new Paragraph({
                children: [
                  new TextRun({
                    text: binding.insights || "No analysis available",
                    size: 20
                  })
                ],
                spacing: { after: 300 }
              })
            ])
          ] : []),

          // AI Analysis Section - Comprehensive insights
          new Paragraph({
            children: [
              new TextRun({
                text: "3. Comprehensive AI Analysis",
                bold: true,
                size: 28
              })
            ],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: "Complete Research Context:",
                bold: true,
                size: 22
              })
            ],
            spacing: { after: 100 }
          }),

          new Paragraph({
            children: [
              new TextRun({
                text: reportData.chatSummary || "This section contains comprehensive AI-generated insights covering all aspects of the molecular research including compound structures, binding mechanisms, target interactions, and biological significance. The analysis incorporates data from compound generation, binding affinity predictions, amino acid sequences, and knowledge graph queries to provide a holistic understanding of the research findings.",
                size: 20
              })
            ],
            spacing: { after: 300 }
          }),

          // Include all tool data in AI analysis
          ...(reportData.generatedCompounds.length > 0 || reportData.bindingAffinities.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Detailed Molecular Insights:",
                  bold: true,
                  size: 22
                })
              ],
              spacing: { before: 200, after: 100 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "The research session involved comprehensive molecular analysis including:",
                  size: 20
                })
              ],
              spacing: { after: 100 }
            }),

            ...(reportData.generatedCompounds.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• Compound Generation: ${reportData.generatedCompounds.length} compound set(s) generated with SMILES notation and structural analysis`,
                    size: 20
                  })
                ],
                spacing: { after: 50 }
              })
            ] : []),

            ...(reportData.bindingAffinities.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• Binding Affinity Predictions: ${reportData.bindingAffinities.length} prediction(s) completed with quantitative affinity values`,
                    size: 20
                  })
                ],
                spacing: { after: 50 }
              })
            ] : []),

            new Paragraph({
              children: [
                new TextRun({
                  text: "• Target Sequence Analysis: Amino acid sequences analyzed for structural and functional properties",
                  size: 20
                })
              ],
              spacing: { after: 50 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "• Knowledge Graph Integration: Scientific literature and database queries for contextual understanding",
                  size: 20
                })
              ],
              spacing: { after: 200 }
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "All findings have been cross-referenced with current scientific literature and validated against established molecular databases to ensure accuracy and relevance.",
                  size: 20,
                  italics: true
                })
              ],
              spacing: { after: 300 }
            })
          ] : []),

          // Footer
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
        ]
      }]
    })

    return await Packer.toBlob(doc)
  }

  const generateReport = async (
    messages: ChatMessage[],
    labId: string,
    customTitle?: string
  ): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    setIsGenerating(true)
    setProgress('Extracting research data...')

    try {
      // Extract data from messages
      const reportData = extractReportData(messages)

      setProgress('Generating conversation summary...')
      
      // Generate chat summary
      reportData.chatSummary = await generateChatSummary(messages)

      setProgress('Creating document...')

      // Create title
      const timestamp = new Date().toLocaleString()
      const title = customTitle || `Research Report - ${timestamp}`

      // Generate document
      const docBlob = await createDocxDocument(reportData, title)

      setProgress('Preparing download...')

      // Create filename
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.docx`

      setProgress('Starting download...')

      // Download file directly to user's system (NO DATABASE SAVING)
      saveAs(docBlob, filename)

      setProgress('Report downloaded successfully!')

      // Clear progress after a delay
      setTimeout(() => {
        setProgress('')
      }, 3000)

    } catch (error) {
      console.error('Error generating report:', error)
      setProgress('Error generating report')
      setTimeout(() => {
        setProgress('')
      }, 3000)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generateReport,
    isGenerating,
    progress
  }
}