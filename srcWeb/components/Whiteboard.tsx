import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Pen, Square, Circle, Minus, Type, Eraser, Hand, Undo, Redo, Download, Users, Palette, Settings, ZoomIn, ZoomOut, RotateCcw, Trash2, Move3D } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { DrawingElement, Point, Tool, Cursor, WhiteboardData, ViewState } from '../types/whiteboard'
import { WhiteboardCanvas } from './WhiteboardCanvas'
import { ToolPanel } from './ToolPanel'
import { ColorPicker } from './ColorPicker'
import { UserCursors } from './UserCursors'
import { BoltBadge } from './BoltBadge'

interface WhiteboardProps {
  labId: string
  labName: string
  onBack: () => void
}

export function Whiteboard({ labId, labName, onBack }: WhiteboardProps) {
  const { user } = useAuth()
  const [tool, setTool] = useState<Tool>({
    type: 'pen',
    color: '#ffffff',
    strokeWidth: 2,
    roughness: 1,
    fill: 'transparent',
    opacity: 1,
    strokeStyle: 'solid',
    fillStyle: 'hachure'
  })
  
  const [elements, setElements] = useState<DrawingElement[]>([])
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set())
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map())
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [undoStack, setUndoStack] = useState<DrawingElement[][]>([])
  const [redoStack, setRedoStack] = useState<DrawingElement[][]>([])
  const [whiteboardId, setWhiteboardId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState<Set<string>>(new Set())
  const [viewState, setViewState] = useState<ViewState>({ zoom: 1, offsetX: 0, offsetY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Point | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastCursorUpdate = useRef<number>(0)
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const channelRef = useRef<any>(null)

  // Initialize whiteboard and check permissions
  useEffect(() => {
    initializeWhiteboard()
    checkUserPermissions()
  }, [labId, user])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!whiteboardId || !user) return

    const channel = supabase.channel(`whiteboard:${whiteboardId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'whiteboards',
        filter: `id=eq.${whiteboardId}`
      }, handleWhiteboardUpdate)
      .on('broadcast', {
        event: 'cursor_move'
      }, handleCursorMove)
      .on('broadcast', {
        event: 'user_joined'
      }, handleUserJoined)
      .on('broadcast', {
        event: 'user_left'
      }, handleUserLeft)
      .on('broadcast', {
        event: 'element_added'
      }, handleElementAdded)
      .on('broadcast', {
        event: 'element_updated'
      }, handleElementUpdated)
      .on('broadcast', {
        event: 'element_deleted'
      }, handleElementDeleted)
      .subscribe()

    channelRef.current = channel

    // Announce presence
    channel.send({
      type: 'broadcast',
      event: 'user_joined',
      payload: {
        userId: user.id,
        userName: user.user_metadata?.name || user.email || 'Anonymous'
      }
    })

    return () => {
      channel.send({
        type: 'broadcast',
        event: 'user_left',
        payload: { userId: user.id }
      })
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [whiteboardId, user])

  const initializeWhiteboard = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      // Check if whiteboard exists for this lab
      const { data: existingWhiteboards, error: fetchError } = await supabase
        .from('whiteboards')
        .select('*')
        .eq('lab_id', labId)

      if (fetchError) {
        throw fetchError
      }

      if (existingWhiteboards && existingWhiteboards.length > 0) {
        // Use the first whiteboard if multiple exist
        const existingWhiteboard = existingWhiteboards[0]
        setWhiteboardId(existingWhiteboard.id)
        const data = existingWhiteboard.data as WhiteboardData
        if (data?.elements) {
          setElements(data.elements.filter(el => !el.isDeleted))
        }
        if (data?.appState) {
          setViewState({
            zoom: data.appState.zoom || 1,
            offsetX: data.appState.scrollX || 0,
            offsetY: data.appState.scrollY || 0
          })
        }
      } else {
        // Create new whiteboard
        const { data: newWhiteboard, error: createError } = await supabase
          .from('whiteboards')
          .insert({
            lab_id: labId,
            title: `${labName} Whiteboard`,
            data: { 
              elements: [], 
              version: 1,
              appState: {
                viewBackgroundColor: '#1a1a1a',
                gridSize: 20,
                zoom: 1,
                scrollX: 0,
                scrollY: 0
              }
            }
          })
          .select()
          .single()

        if (createError) throw createError
        setWhiteboardId(newWhiteboard.id)
      }
    } catch (error) {
      console.error('Error initializing whiteboard:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkUserPermissions = async () => {
    if (!user) return

    try {
      const { data: member } = await supabase
        .from('lab_members')
        .select('role')
        .eq('lab_id', labId)
        .eq('user_id', user.id)
        .single()

      setIsAdmin(member?.role === 'admin')
    } catch (error) {
      console.error('Error checking permissions:', error)
    }
  }

  const handleWhiteboardUpdate = (payload: any) => {
    const data = payload.new.data as WhiteboardData
    if (data?.elements) {
      setElements(data.elements.filter(el => !el.isDeleted))
    }
    if (data?.appState) {
      setViewState({
        zoom: data.appState.zoom || 1,
        offsetX: data.appState.scrollX || 0,
        offsetY: data.appState.scrollY || 0
      })
    }
  }

  const handleCursorMove = (payload: any) => {
    const cursor = payload.payload as Cursor
    if (cursor.userId !== user?.id) {
      setCursors(prev => new Map(prev.set(cursor.userId, cursor)))
    }
  }

  const handleUserJoined = (payload: any) => {
    setConnectedUsers(prev => new Set(prev.add(payload.payload.userId)))
  }

  const handleUserLeft = (payload: any) => {
    const userId = payload.payload.userId
    setConnectedUsers(prev => {
      const newSet = new Set(prev)
      newSet.delete(userId)
      return newSet
    })
    setCursors(prev => {
      const newMap = new Map(prev)
      newMap.delete(userId)
      return newMap
    })
  }

  const handleElementAdded = (payload: any) => {
    const element = payload.payload as DrawingElement
    if (element.userId !== user?.id) {
      setElements(prev => {
        // Check if element already exists to avoid duplicates
        const exists = prev.some(el => el.id === element.id)
        if (exists) return prev
        return [...prev, element]
      })
    }
  }

  const handleElementUpdated = (payload: any) => {
    const { elementId, updates } = payload.payload
    if (updates.userId !== user?.id) {
      setElements(prev => prev.map(el => 
        el.id === elementId ? { ...el, ...updates } : el
      ))
    }
  }

  const handleElementDeleted = (payload: any) => {
    const { elementId, userId: deletedByUserId } = payload.payload
    if (deletedByUserId !== user?.id) {
      setElements(prev => prev.filter(el => el.id !== elementId))
    }
  }

  const broadcastElementAdded = (element: DrawingElement) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'element_added',
        payload: element
      })
    }
  }

  const broadcastElementUpdated = (elementId: string, updates: Partial<DrawingElement>) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'element_updated',
        payload: { elementId, updates: { ...updates, userId: user?.id } }
      })
    }
  }

  const broadcastElementDeleted = (elementId: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'element_deleted',
        payload: { elementId, userId: user?.id }
      })
    }
  }

  const saveToDatabase = useCallback(async (newElements: DrawingElement[], newViewState?: ViewState) => {
    if (!whiteboardId) return

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce saves to avoid too many database calls
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const data: WhiteboardData = {
          elements: newElements,
          version: Date.now(),
          appState: {
            viewBackgroundColor: '#1a1a1a',
            gridSize: 20,
            zoom: newViewState?.zoom || viewState.zoom,
            scrollX: newViewState?.offsetX || viewState.offsetX,
            scrollY: newViewState?.offsetY || viewState.offsetY
          }
        }

        await supabase
          .from('whiteboards')
          .update({ data })
          .eq('id', whiteboardId)
      } catch (error) {
        console.error('Error saving whiteboard:', error)
      }
    }, 500) // 500ms debounce
  }, [whiteboardId, viewState])

  const addElement = (element: DrawingElement) => {
    const newElements = [...elements, element]
    setElements(newElements)
    setUndoStack(prev => [...prev, elements])
    setRedoStack([])
    
    // Broadcast the new element immediately
    broadcastElementAdded(element)
    
    // Save to database
    saveToDatabase(newElements)
  }

  const updateElement = (elementId: string, updates: Partial<DrawingElement>) => {
    const newElements = elements.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    )
    setElements(newElements)
    
    // Broadcast the update immediately
    broadcastElementUpdated(elementId, updates)
    
    // Save to database
    saveToDatabase(newElements)
  }

  const deleteElement = (elementId: string) => {
    const element = elements.find(el => el.id === elementId)
    if (!element) return

    // Check permissions
    if (!isAdmin && element.userId !== user?.id) {
      return // Can't delete other users' elements unless admin
    }

    const newElements = elements.filter(el => el.id !== elementId)
    setElements(newElements)
    setUndoStack(prev => [...prev, elements])
    setRedoStack([])
    
    // Broadcast the deletion immediately
    broadcastElementDeleted(elementId)
    
    // Save to database
    saveToDatabase(newElements)
  }

  const deleteSelectedElements = () => {
    if (selectedElements.size === 0) return

    const elementsToDelete = Array.from(selectedElements)
    const canDeleteAll = elementsToDelete.every(id => {
      const element = elements.find(el => el.id === id)
      return element && (isAdmin || element.userId === user?.id)
    })

    if (!canDeleteAll) return

    const newElements = elements.filter(el => !selectedElements.has(el.id))
    setElements(newElements)
    setSelectedElements(new Set())
    setUndoStack(prev => [...prev, elements])
    setRedoStack([])
    
    // Broadcast each deletion
    elementsToDelete.forEach(elementId => {
      broadcastElementDeleted(elementId)
    })
    
    saveToDatabase(newElements)
  }

  const clearAll = () => {
    if (!isAdmin) return // Only admins can clear all

    setUndoStack(prev => [...prev, elements])
    setRedoStack([])
    
    // Broadcast deletion of all elements
    elements.forEach(element => {
      broadcastElementDeleted(element.id)
    })
    
    setElements([])
    setSelectedElements(new Set())
    saveToDatabase([])
  }

  const undo = () => {
    if (undoStack.length === 0) return
    
    const previousState = undoStack[undoStack.length - 1]
    setRedoStack(prev => [...prev, elements])
    setUndoStack(prev => prev.slice(0, -1))
    setElements(previousState)
    setSelectedElements(new Set())
    saveToDatabase(previousState)
  }

  const redo = () => {
    if (redoStack.length === 0) return
    
    const nextState = redoStack[redoStack.length - 1]
    setUndoStack(prev => [...prev, elements])
    setRedoStack(prev => prev.slice(0, -1))
    setElements(nextState)
    setSelectedElements(new Set())
    saveToDatabase(nextState)
  }

  const zoomIn = () => {
    const newZoom = Math.min(viewState.zoom * 1.2, 5)
    const newViewState = { ...viewState, zoom: newZoom }
    setViewState(newViewState)
    saveToDatabase(elements, newViewState)
  }

  const zoomOut = () => {
    const newZoom = Math.max(viewState.zoom / 1.2, 0.1)
    const newViewState = { ...viewState, zoom: newZoom }
    setViewState(newViewState)
    saveToDatabase(elements, newViewState)
  }

  const resetZoom = () => {
    const newViewState = { zoom: 1, offsetX: 0, offsetY: 0 }
    setViewState(newViewState)
    saveToDatabase(elements, newViewState)
  }

  const broadcastCursor = useCallback((x: number, y: number) => {
    const now = Date.now()
    if (now - lastCursorUpdate.current < 50) return // Throttle to 20fps
    
    lastCursorUpdate.current = now
    
    if (!user || !channelRef.current) return

    const cursor: Cursor = {
      userId: user.id,
      userName: user.user_metadata?.name || user.email || 'Anonymous',
      x,
      y,
      color: tool.color,
      timestamp: now
    }

    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: cursor
    })
  }, [user, tool.color])

  const exportWhiteboard = () => {
    if (!canvasRef.current) return

    const link = document.createElement('a')
    link.download = `${labName}-whiteboard.png`
    link.href = canvasRef.current.toDataURL()
    link.click()
  }

  const getUserColor = (userId: string) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, viewState.zoom * delta))
      
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const newViewState = {
        zoom: newZoom,
        offsetX: viewState.offsetX - (mouseX * (newZoom - viewState.zoom)),
        offsetY: viewState.offsetY - (mouseY * (newZoom - viewState.zoom))
      }
      
      setViewState(newViewState)
      saveToDatabase(elements, newViewState)
    } else {
      // Pan
      const newViewState = {
        ...viewState,
        offsetX: viewState.offsetX - e.deltaX,
        offsetY: viewState.offsetY - e.deltaY
      }
      setViewState(newViewState)
      saveToDatabase(elements, newViewState)
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
      <div className="fixed top-[90px] right-8 z-50">
            <BoltBadge />
      </div>
        <div className="text-xl">Loading whiteboard...</div>
      </div>
    )
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
              Back to Lab
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div>
              <h1 className="text-xl font-bold text-white">{labName} Whiteboard</h1>
              <p className="text-sm text-gray-400">
                Collaborative drawing board • {connectedUsers.size + 1} online • Zoom: {Math.round(viewState.zoom * 100)}%
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <button
              onClick={zoomOut}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={resetZoom}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Reset Zoom"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={zoomIn}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-700" />
            {selectedElements.size > 0 && (
              <button
                onClick={deleteSelectedElements}
                className="p-2 text-red-400 hover:text-red-300 transition-colors duration-300"
                title="Delete Selected"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={exportWhiteboard}
              className="p-2 text-gray-400 hover:text-white transition-colors duration-300"
              title="Export as PNG"
            >
              <Download className="w-5 h-5" />
            </button>
            {isAdmin && (
              <button
                onClick={clearAll}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-300"
                title="Clear all (Admin only)"
              >
                Clear All
              </button>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              {connectedUsers.size + 1}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Tool Panel */}
        <div className="w-16 bg-gray-900 border-r border-gray-800 flex-shrink-0">
          <ToolPanel
            tool={tool}
            onToolChange={setTool}
            onColorPickerToggle={() => setShowColorPicker(!showColorPicker)}
            selectedCount={selectedElements.size}
          />
        </div>

        {/* Canvas Container */}
        <div 
          ref={containerRef} 
          className="flex-1 relative overflow-hidden bg-[#1a1a1a]"
          onWheel={handleWheel}
        >
          <WhiteboardCanvas
            ref={canvasRef}
            elements={elements}
            tool={tool}
            viewState={viewState}
            selectedElements={selectedElements}
            onAddElement={addElement}
            onUpdateElement={updateElement}
            onDeleteElement={deleteElement}
            onSelectElements={setSelectedElements}
            onCursorMove={broadcastCursor}
            onViewStateChange={setViewState}
            userId={user?.id || ''}
            userName={user?.user_metadata?.name || user?.email || 'Anonymous'}
            getUserColor={getUserColor}
            isAdmin={isAdmin}
          />
          
          {/* User Cursors */}
          <UserCursors 
            cursors={cursors} 
            getUserColor={getUserColor} 
            viewState={viewState}
          />
          
          {/* Color Picker */}
          {showColorPicker && (
            <div className="absolute top-4 left-20 z-10">
              <ColorPicker
                color={tool.color}
                onChange={(color) => setTool(prev => ({ ...prev, color }))}
                onClose={() => setShowColorPicker(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}