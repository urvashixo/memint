import React, { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { SidebarLeft } from './research/SidebarLeft'
import { SidebarRight } from './research/SidebarRight'
import { ChatWindow } from './research/ChatWindow'
import { ToolButtonRow } from './research/ToolButtonRow'
import { InputModal } from './research/InputModal'
import { ReportModal } from './research/ReportModal'
import { ADMEProfileModal } from './research/ADMEProfileModal'
import { TargetPredictorModal } from './research/TargetPredictorModal'
import { usePerplexity } from '../hooks/usePerplexity'
import { useResponsiveSidebar } from '../hooks/useResponsiveSidebar'
import { useReportGeneration } from '../hooks/useReportGeneration'
import { BoltBadge } from './BoltBadge'

interface ResearchProps {
  labId: string
  labName: string
  onBack: () => void
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: number
  toolUsed?: string
  toolData?: any
  citations?: string[]
}

export interface ToolResult {
  type: 'drug-generation' | 'amino-sequence' | 'binding-affinity' | 'graph-knowledge' | 'chat'
  data: any
  rawResponse?: any
  citations?: string[]
}

export function Research({ labId, labName, onBack }: ResearchProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentToolResult, setCurrentToolResult] = useState<ToolResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showModal, setShowModal] = useState<string | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showADMEModal, setShowADMEModal] = useState(false)
  const [showTargetModal, setShowTargetModal] = useState(false)
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [currentPdbId, setCurrentPdbId] = useState<string | null>(null)
  
  const { leftSidebarOpen, rightSidebarOpen, toggleLeftSidebar, toggleRightSidebar } = useResponsiveSidebar()
  const { sendToPerplexity, isPerplexityLoading } = usePerplexity()
  const { generateReport, isGenerating: isGeneratingReport, progress } = useReportGeneration()

  // Clear messages when component unmounts (route change)
  useEffect(() => {
    return () => {
      setMessages([])
      setCurrentToolResult(null)
      setIsGenerating(false)
      setGenerationError(null)
      setCurrentPdbId(null)
    }
  }, [])

  const handleUserMessage = async (content: string, toolUsed?: string, toolData?: any) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: Date.now(),
      toolUsed,
      toolData
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Send to Perplexity with context
      const context = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      const perplexityResponse = await sendToPerplexity(content, context, toolData)
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: perplexityResponse.output,
        timestamp: Date.now(),
        citations: perplexityResponse.citations
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update right sidebar based on tool used
      if (toolUsed && toolData) {
        setCurrentToolResult({
          type: toolUsed as any,
          data: toolData,
          rawResponse: toolData,
          citations: perplexityResponse.citations
        })
      } else {
        // For regular chat and binding affinity, show citations
        setCurrentToolResult({
          type: 'chat',
          data: { response: perplexityResponse.output },
          rawResponse: perplexityResponse.output,
          citations: perplexityResponse.citations
        })
      }
    } catch (error) {
      console.error('Error processing message:', error)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleToolAction = (toolType: string) => {
    setShowModal(toolType)
  }

  const handleModalSubmit = async (toolType: string, data: any) => {
    setShowModal(null)
    setIsLoading(true)

    // Clear previous generation state
    setGenerationError(null)
    setCurrentPdbId(null)

    try {
      let response
      let userPrompt = ''
      let result

      switch (toolType) {
        case 'drug-generation':
          userPrompt = `Generate drug compounds for PDB ID: ${data.pdb_id}`
          setCurrentPdbId(data.pdb_id)
          
          // Start generation timer
          setIsGenerating(true)
          setCurrentToolResult(null) // Clear previous results
          
          try {
            response = await fetch('https://backmedi.tech/generate-compounds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pdb_id: data.pdb_id })
            })
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            result = await response.json()
            
            // Check for dataset error
            if (result.error && result.error.toLowerCase().includes('dataset not found')) {
              setGenerationError(result.error)
              setIsGenerating(false)
              setIsLoading(false)
              return
            }
            
            // Success - stop timer and show results
            setIsGenerating(false)
            
          } catch (fetchError) {
            console.error('API fetch error:', fetchError)
            
            // Check if it's a dataset error
            if (fetchError.message.includes('dataset not found') || 
                fetchError.message.includes('ligand')) {
              setGenerationError('Dataset not found: The selected protein does not have ligand data available for compound generation.')
              setIsGenerating(false)
              setIsLoading(false)
              return
            } else {
              setGenerationError('Backend service unavailable. This is a demo showing how the tool would work.')
              result = {
                error: 'Backend service unavailable',
                message: 'The drug generation service is currently unavailable. This is a demo showing how the tool would work.',
                mockData: {
                  compounds: [
                    { smiles: 'CCO', name: 'Ethanol', score: 0.85 },
                    { smiles: 'CC(C)O', name: 'Isopropanol', score: 0.72 },
                    { smiles: 'CCCCO', name: 'Butanol', score: 0.68 }
                  ],
                  pdb_id: data.pdb_id
                }
              }
              // Stop timer and show mock results
              setIsGenerating(false)
            }
          }
          break

        case 'amino-sequence':
          userPrompt = `Get amino acid sequence for PDB ID: ${data.pdb_id}`
          try {
            response = await fetch(`https://backmedi.tech/pdb-sequence?pdb_id=${data.pdb_id}`)
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            result = await response.json()
          } catch (fetchError) {
            console.error('API fetch error:', fetchError)
            result = {
              error: 'Backend service unavailable',
              message: 'The sequence retrieval service is currently unavailable. This is a demo showing how the tool would work.',
              mockData: {
                sequence: 'MKTVRQERLKSIVRILERSKEPVSGAQLAEELSVSRQVIVQDIAYLRSLGYNIVATPRGYVLAGG',
                pdb_id: data.pdb_id,
                length: 63
              }
            }
          }
          break

        case 'binding-affinity':
          userPrompt = `Predict binding affinity for SMILES: ${data.smile} and target sequence: ${data.target_sequence.substring(0, 50)}...`
          try {
            response = await fetch('https://backmedi.tech/predict-binding-affinity', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                smile: data.smile, 
                target_sequence: data.target_sequence 
              })
            })
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            result = await response.json()
          } catch (fetchError) {
            console.error('API fetch error:', fetchError)
            result = {
              error: 'Backend service unavailable',
              message: 'The binding affinity prediction service is currently unavailable. This is a demo showing how the tool would work.',
              mockData: {
                predicted_binding_affinity: 4.958944797515869,
                confidence: 0.78,
                smiles: data.smile,
                target_sequence: data.target_sequence,
                units: 'pKd'
              }
            }
          }
          break

        case 'graph-knowledge':
          userPrompt = `Graph knowledge query: ${data.query}`
          try {
            response = await fetch('https://backmedi.tech/text-to-aql', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: data.query })
            })
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            result = await response.json()
          } catch (fetchError) {
            console.error('API fetch error:', fetchError)
            result = {
              error: 'Backend service unavailable',
              message: 'The graph knowledge service is currently unavailable. This is a demo showing how the tool would work.',
              mockData: {
                aql_query: `FOR doc IN collection FILTER doc.name LIKE "%${data.query}%" RETURN doc`,
                results: [
                  { name: 'Sample Result 1', type: 'protein', id: 'P001' },
                  { name: 'Sample Result 2', type: 'compound', id: 'C001' }
                ],
                query: data.query
              }
            }
          }
          break

        default:
          throw new Error('Unknown tool type')
      }

      // Handle the user message and tool result
      await handleUserMessage(userPrompt, toolType, result)
      
    } catch (error) {
      console.error('Tool action error:', error)
      if (toolType === 'drug-generation') {
        setGenerationError(error.message)
        setIsGenerating(false)
      } else {
        await handleUserMessage(`Error with ${toolType}: ${error.message}`, toolType, { error: error.message })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerationComplete = () => {
    // This is called when timer completes, but we don't need it since results come immediately
    setIsGenerating(false)
  }

  const handleRetryGeneration = () => {
    setGenerationError(null)
    setCurrentPdbId(null)
    setShowModal('drug-generation')
  }

  const handleGenerateReport = async (title: string) => {
    try {
      await generateReport(messages, labId, title)
    } catch (error) {
      console.error('Error generating report:', error)
      throw error
    }
  }

  const isDisabled = isLoading || isPerplexityLoading

  return (
    <div className="h-screen bg-[#0F0F0F] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="fixed top-[90px] md:top-[10px] right-8 z-50">
        <BoltBadge />
      </div>
      
      <header className="border-b border-gray-800 bg-[#0F0F0F]/95 backdrop-blur-md flex-shrink-0">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Lab
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-white">Research Assistant</h1>
              <p className="text-sm text-gray-400">
                {labName} • AI-powered research tools and LLM
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:hidden">
            <button
              onClick={toggleLeftSidebar}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
            >
              ☰
            </button>
            <button
              onClick={toggleRightSidebar}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
            >
              📊
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <SidebarLeft 
          isOpen={leftSidebarOpen}
          onToggle={toggleLeftSidebar}
          onTalkToNew={() => {
            setMessages([])
            setCurrentToolResult(null)
            setIsGenerating(false)
            setGenerationError(null)
            setCurrentPdbId(null)
          }}
          onGenerateReport={() => setShowReportModal(true)}
          onADMEProfile={() => setShowADMEModal(true)}
          onTargetPredictor={() => setShowTargetModal(true)}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow 
            messages={messages}
            isLoading={isDisabled}
            onSendMessage={(content) => handleUserMessage(content)}
          />
          
          <ToolButtonRow 
            onToolAction={handleToolAction}
            disabled={isDisabled}
          />
        </div>

        {/* Right Sidebar */}
        <SidebarRight 
          isOpen={rightSidebarOpen}
          onToggle={toggleRightSidebar}
          toolResult={currentToolResult}
          isGenerating={isGenerating}
          generationError={generationError}
          onGenerationComplete={handleGenerationComplete}
          onRetryGeneration={handleRetryGeneration}
          currentPdbId={currentPdbId}
        />
      </div>

      {/* Modals */}
      <InputModal
        isOpen={showModal === 'drug-generation'}
        onClose={() => setShowModal(null)}
        onSubmit={(data) => handleModalSubmit('drug-generation', data)}
        title="Compound Generation"
        fields={[
          { name: 'pdb_id', label: 'PDB ID', type: 'text', placeholder: 'e.g., 1HTM', required: true }
        ]}
      />

      <InputModal
        isOpen={showModal === 'amino-sequence'}
        onClose={() => setShowModal(null)}
        onSubmit={(data) => handleModalSubmit('amino-sequence', data)}
        title="Amino Acid Sequence"
        fields={[
          { name: 'pdb_id', label: 'PDB ID', type: 'text', placeholder: 'e.g., 1HTM', required: true }
        ]}
      />

      <InputModal
        isOpen={showModal === 'binding-affinity'}
        onClose={() => setShowModal(null)}
        onSubmit={(data) => handleModalSubmit('binding-affinity', data)}
        title="Binding Affinity Prediction"
        fields={[
          { name: 'smile', label: 'SMILES', type: 'text', placeholder: 'e.g., CCO', required: true, className: 'overflow-x-auto' },
          { name: 'target_sequence', label: 'Target Sequence', type: 'textarea', placeholder: 'e.g., MKVLYNLV...', required: true }
        ]}
      />

      <InputModal
        isOpen={showModal === 'graph-knowledge'}
        onClose={() => setShowModal(null)}
        onSubmit={(data) => handleModalSubmit('graph-knowledge', data)}
        title="Graph Knowledge (AQL)"
        fields={[
          { name: 'query', label: 'Query', type: 'textarea', placeholder: 'Enter your AQL query...', required: true }
        ]}
      />

      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onGenerate={handleGenerateReport}
        isGenerating={isGeneratingReport}
        progress={progress}
      />

      <ADMEProfileModal
        isOpen={showADMEModal}
        onClose={() => setShowADMEModal(false)}
      />

      <TargetPredictorModal
        isOpen={showTargetModal}
        onClose={() => setShowTargetModal(false)}
      />
    </div>
  )
}