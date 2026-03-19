import React, { forwardRef, useEffect, useRef, useImperativeHandle, useCallback, useState } from 'react'
import rough from 'roughjs'
import { DrawingElement, Point, Tool, ViewState, BoundingBox } from '../types/whiteboard'

interface WhiteboardCanvasProps {
  elements: DrawingElement[]
  tool: Tool
  viewState: ViewState
  selectedElements: Set<string>
  onAddElement: (element: DrawingElement) => void
  onUpdateElement: (id: string, updates: Partial<DrawingElement>) => void
  onDeleteElement: (id: string) => void
  onSelectElements: (elements: Set<string>) => void
  onCursorMove: (x: number, y: number) => void
  onViewStateChange: (viewState: ViewState) => void
  userId: string
  userName: string
  getUserColor: (userId: string) => string
  isAdmin: boolean
}

export const WhiteboardCanvas = forwardRef<HTMLCanvasElement, WhiteboardCanvasProps>(
  ({
    elements,
    tool,
    viewState,
    selectedElements,
    onAddElement,
    onUpdateElement,
    onDeleteElement,
    onSelectElements,
    onCursorMove,
    onViewStateChange,
    userId,
    userName,
    getUserColor,
    isAdmin
  }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const contextRef = useRef<CanvasRenderingContext2D | null>(null)
    const roughCanvasRef = useRef<any>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState<Point | null>(null)
    const [lastPoint, setLastPoint] = useState<Point | null>(null)
    const [isErasing, setIsErasing] = useState(false)
    const [showTextInput, setShowTextInput] = useState(false)
    const [textInputPosition, setTextInputPosition] = useState<Point>({ x: 0, y: 0 })
    const [textInputValue, setTextInputValue] = useState('')

    useImperativeHandle(ref, () => canvasRef.current!)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      // Set up canvas
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      context.scale(window.devicePixelRatio, window.devicePixelRatio)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.imageSmoothingEnabled = true

      contextRef.current = context
      roughCanvasRef.current = rough.canvas(canvas)

      // Handle resize
      const handleResize = () => {
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * window.devicePixelRatio
        canvas.height = rect.height * window.devicePixelRatio
        canvas.style.width = `${rect.width}px`
        canvas.style.height = `${rect.height}px`
        context.scale(window.devicePixelRatio, window.devicePixelRatio)
        redraw()
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    const redraw = useCallback(() => {
      const context = contextRef.current
      const roughCanvas = roughCanvasRef.current
      if (!context || !roughCanvas) return

      const canvas = context.canvas
      
      // Clear canvas
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.fillStyle = '#1a1a1a'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.restore()

      // Apply transformations
      context.save()
      context.translate(viewState.offsetX, viewState.offsetY)
      context.scale(viewState.zoom, viewState.zoom)

      // Draw grid
      drawGrid(context)

      // Draw all elements
      elements.forEach(element => {
        const isSelected = selectedElements.has(element.id)
        drawElement(context, roughCanvas, element, isSelected)
      })

      // Draw current element being drawn
      if (currentElement) {
        drawElement(context, roughCanvas, currentElement, false)
      }

      context.restore()
    }, [elements, currentElement, selectedElements, viewState])

    useEffect(() => {
      redraw()
    }, [redraw])

    const drawGrid = (context: CanvasRenderingContext2D) => {
      const gridSize = 20
      const canvas = context.canvas
      
      context.strokeStyle = '#2a2a2a'
      context.lineWidth = 0.5
      context.globalAlpha = 0.3

      const startX = Math.floor(-viewState.offsetX / viewState.zoom / gridSize) * gridSize
      const startY = Math.floor(-viewState.offsetY / viewState.zoom / gridSize) * gridSize
      const endX = startX + (canvas.width / viewState.zoom) + gridSize
      const endY = startY + (canvas.height / viewState.zoom) + gridSize

      context.beginPath()
      for (let x = startX; x < endX; x += gridSize) {
        context.moveTo(x, startY)
        context.lineTo(x, endY)
      }
      for (let y = startY; y < endY; y += gridSize) {
        context.moveTo(startX, y)
        context.lineTo(endX, y)
      }
      context.stroke()
      context.globalAlpha = 1
    }

    const drawElement = (context: CanvasRenderingContext2D, roughCanvas: any, element: DrawingElement, isSelected: boolean) => {
      context.save()
      context.globalAlpha = element.opacity || 1
      context.strokeStyle = element.color
      context.fillStyle = element.fill || 'transparent'
      context.lineWidth = element.strokeWidth

      // Set line dash for stroke style
      if (element.strokeStyle === 'dashed') {
        context.setLineDash([10, 5])
      } else if (element.strokeStyle === 'dotted') {
        context.setLineDash([2, 3])
      } else {
        context.setLineDash([])
      }

      switch (element.type) {
        case 'pen':
          drawPenStroke(context, element)
          break
        case 'rectangle':
          drawRectangle(roughCanvas, element)
          break
        case 'circle':
          drawCircle(roughCanvas, element)
          break
        case 'line':
          drawLine(roughCanvas, element)
          break
        case 'arrow':
          drawArrow(context, element)
          break
        case 'diamond':
          drawDiamond(roughCanvas, element)
          break
        case 'text':
          drawText(context, element)
          break
      }

      // Draw selection outline (no resize handles)
      if (isSelected) {
        drawSelectionOutline(context, element)
      }

      context.restore()
    }

    const drawPenStroke = (context: CanvasRenderingContext2D, element: DrawingElement) => {
      if (element.points.length < 2) return

      context.beginPath()
      context.moveTo(element.points[0].x, element.points[0].y)

      // Use quadratic curves for smoother lines
      for (let i = 1; i < element.points.length - 1; i++) {
        const current = element.points[i]
        const next = element.points[i + 1]
        const cpx = (current.x + next.x) / 2
        const cpy = (current.y + next.y) / 2
        context.quadraticCurveTo(current.x, current.y, cpx, cpy)
      }

      // Draw the last point
      if (element.points.length > 1) {
        const lastPoint = element.points[element.points.length - 1]
        context.lineTo(lastPoint.x, lastPoint.y)
      }

      context.stroke()
    }

    const drawRectangle = (roughCanvas: any, element: DrawingElement) => {
      if (element.points.length < 2) return

      const [start, end] = element.points
      const width = end.x - start.x
      const height = end.y - start.y

      const options = {
        stroke: element.color,
        strokeWidth: element.strokeWidth,
        roughness: element.roughness || 1,
        seed: element.seed || 1,
        fillStyle: element.fillStyle || 'hachure',
        fill: element.fill === 'transparent' ? undefined : element.fill
      }

      roughCanvas.rectangle(start.x, start.y, width, height, options)
    }

    const drawCircle = (roughCanvas: any, element: DrawingElement) => {
      if (element.points.length < 2) return

      const [start, end] = element.points
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))

      const options = {
        stroke: element.color,
        strokeWidth: element.strokeWidth,
        roughness: element.roughness || 1,
        seed: element.seed || 1,
        fillStyle: element.fillStyle || 'hachure',
        fill: element.fill === 'transparent' ? undefined : element.fill
      }

      roughCanvas.circle(start.x, start.y, radius * 2, options)
    }

    const drawLine = (roughCanvas: any, element: DrawingElement) => {
      if (element.points.length < 2) return

      const [start, end] = element.points

      const options = {
        stroke: element.color,
        strokeWidth: element.strokeWidth,
        roughness: element.roughness || 1,
        seed: element.seed || 1
      }

      roughCanvas.line(start.x, start.y, end.x, end.y, options)
    }

    const drawArrow = (context: CanvasRenderingContext2D, element: DrawingElement) => {
      if (element.points.length < 2) return

      const [start, end] = element.points
      const angle = Math.atan2(end.y - start.y, end.x - start.x)
      const arrowLength = 15
      const arrowAngle = Math.PI / 6

      // Draw line
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
      context.stroke()

      // Draw arrowhead
      context.beginPath()
      context.moveTo(end.x, end.y)
      context.lineTo(
        end.x - arrowLength * Math.cos(angle - arrowAngle),
        end.y - arrowLength * Math.sin(angle - arrowAngle)
      )
      context.moveTo(end.x, end.y)
      context.lineTo(
        end.x - arrowLength * Math.cos(angle + arrowAngle),
        end.y - arrowLength * Math.sin(angle + arrowAngle)
      )
      context.stroke()
    }

    const drawDiamond = (roughCanvas: any, element: DrawingElement) => {
      if (element.points.length < 2) return

      const [start, end] = element.points
      const centerX = (start.x + end.x) / 2
      const centerY = (start.y + end.y) / 2
      const width = Math.abs(end.x - start.x)
      const height = Math.abs(end.y - start.y)

      const points = [
        [centerX, start.y],
        [end.x, centerY],
        [centerX, end.y],
        [start.x, centerY]
      ]

      const options = {
        stroke: element.color,
        strokeWidth: element.strokeWidth,
        roughness: element.roughness || 1,
        seed: element.seed || 1,
        fillStyle: element.fillStyle || 'hachure',
        fill: element.fill === 'transparent' ? undefined : element.fill
      }

      roughCanvas.polygon(points, options)
    }

    const drawText = (context: CanvasRenderingContext2D, element: DrawingElement) => {
      if (!element.text || element.points.length === 0) return

      // Use handwritten font
      const fontSize = element.fontSize || 20
      context.font = `${fontSize}px "Kalam", "Comic Sans MS", cursive`
      context.fillStyle = element.color
      context.textBaseline = 'top'
      
      const lines = element.text.split('\n')
      const lineHeight = fontSize * 1.3
      
      lines.forEach((line, index) => {
        context.fillText(line, element.points[0].x, element.points[0].y + index * lineHeight)
      })
    }

    const drawSelectionOutline = (context: CanvasRenderingContext2D, element: DrawingElement) => {
      const bounds = getElementBounds(element)
      if (!bounds) return

      context.save()
      context.strokeStyle = '#4285f4'
      context.lineWidth = 2 / viewState.zoom
      context.setLineDash([5 / viewState.zoom, 5 / viewState.zoom])
      context.strokeRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10)
      context.restore()
    }

    const getElementBounds = (element: DrawingElement): BoundingBox | null => {
      if (element.points.length === 0) return null

      if (element.type === 'text' && element.text) {
        const fontSize = element.fontSize || 20
        const lines = element.text.split('\n')
        const maxLineLength = Math.max(...lines.map(line => line.length))
        const approximateCharWidth = fontSize * 0.6 // Approximate character width
        const lineHeight = fontSize * 1.3

        return {
          x: element.points[0].x,
          y: element.points[0].y,
          width: Math.max(maxLineLength * approximateCharWidth, 100), // Minimum width
          height: lines.length * lineHeight
        }
      }

      const xs = element.points.map(p => p.x)
      const ys = element.points.map(p => p.y)
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const minY = Math.min(...ys)
      const maxY = Math.max(...ys)

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    }

    const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

      // Convert screen coordinates to canvas coordinates
      const canvasX = (clientX - rect.left - viewState.offsetX) / viewState.zoom
      const canvasY = (clientY - rect.top - viewState.offsetY) / viewState.zoom

      return { x: canvasX, y: canvasY }
    }

    const getElementAtPoint = (point: Point): DrawingElement | null => {
      // Check elements in reverse order (top to bottom)
      for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i]
        if (isPointInElement(point, element)) {
          return element
        }
      }
      return null
    }

    const isPointInElement = (point: Point, element: DrawingElement): boolean => {
      const bounds = getElementBounds(element)
      if (!bounds) return false

      const padding = Math.max(element.strokeWidth / 2, 5)
      return (
        point.x >= bounds.x - padding &&
        point.x <= bounds.x + bounds.width + padding &&
        point.y >= bounds.y - padding &&
        point.y <= bounds.y + bounds.height + padding
      )
    }

    const showTextInputDialog = (position: Point) => {
      setTextInputPosition(position)
      setTextInputValue('')
      setShowTextInput(true)
    }

    const handleTextInputSubmit = () => {
      if (textInputValue.trim()) {
        const newElement: DrawingElement = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'text',
          points: [textInputPosition],
          color: tool.color,
          strokeWidth: tool.strokeWidth,
          userId,
          userName,
          timestamp: Date.now(),
          text: textInputValue.trim(),
          fontSize: 20,
          opacity: tool.opacity
        }

        onAddElement(newElement)
      }
      
      setShowTextInput(false)
      setTextInputValue('')
    }

    const handleTextInputCancel = () => {
      setShowTextInput(false)
      setTextInputValue('')
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      const point = getPointFromEvent(e)
      onCursorMove(point.x, point.y)

      if (tool.type === 'select') {
        const elementAtPoint = getElementAtPoint(point)
        
        if (elementAtPoint) {
          // Handle selection
          if (!e.shiftKey) {
            onSelectElements(new Set([elementAtPoint.id]))
          } else {
            const newSelection = new Set(selectedElements)
            if (newSelection.has(elementAtPoint.id)) {
              newSelection.delete(elementAtPoint.id)
            } else {
              newSelection.add(elementAtPoint.id)
            }
            onSelectElements(newSelection)
          }

          // Start dragging for selected elements
          setIsDragging(true)
          setDragStart(point)
        } else if (!e.shiftKey) {
          onSelectElements(new Set())
        }
        return
      }

      if (tool.type === 'eraser') {
        setIsErasing(true)
        const elementAtPoint = getElementAtPoint(point)
        if (elementAtPoint) {
          // Check permissions
          if (isAdmin || elementAtPoint.userId === userId) {
            onDeleteElement(elementAtPoint.id)
          }
        }
        return
      }

      if (tool.type === 'text') {
        const elementAtPoint = getElementAtPoint(point)
        
        // If clicking on existing text element, edit it
        if (elementAtPoint && elementAtPoint.type === 'text') {
          if (isAdmin || elementAtPoint.userId === userId) {
            setTextInputPosition(point)
            setTextInputValue(elementAtPoint.text || '')
            setShowTextInput(true)
            // Store the element ID for updating
            setTimeout(() => {
              const input = document.getElementById('text-input') as HTMLInputElement
              if (input) {
                input.focus()
                input.select()
                // Store element ID in a data attribute for later use
                input.setAttribute('data-element-id', elementAtPoint.id)
              }
            }, 10)
            return
          }
        }

        // Create new text element
        showTextInputDialog(point)
        return
      }

      setIsDrawing(true)
      setLastPoint(point)

      const newElement: DrawingElement = {
        id: `${Date.now()}-${Math.random()}`,
        type: tool.type,
        points: [point],
        color: tool.color,
        strokeWidth: tool.strokeWidth,
        userId,
        userName,
        timestamp: Date.now(),
        roughness: tool.roughness,
        fill: tool.fill,
        opacity: tool.opacity,
        strokeStyle: tool.strokeStyle,
        fillStyle: tool.fillStyle,
        seed: Math.floor(Math.random() * 1000)
      }

      setCurrentElement(newElement)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
      const point = getPointFromEvent(e)
      onCursorMove(point.x, point.y)

      if (isDragging && dragStart && selectedElements.size > 0) {
        const deltaX = point.x - dragStart.x
        const deltaY = point.y - dragStart.y

        selectedElements.forEach(elementId => {
          const element = elements.find(el => el.id === elementId)
          if (element && (isAdmin || element.userId === userId)) {
            const newPoints = element.points.map(p => ({
              x: p.x + deltaX,
              y: p.y + deltaY
            }))
            onUpdateElement(elementId, { points: newPoints })
          }
        })

        setDragStart(point)
        return
      }

      if (isErasing) {
        const elementAtPoint = getElementAtPoint(point)
        if (elementAtPoint) {
          // Check permissions
          if (isAdmin || elementAtPoint.userId === userId) {
            onDeleteElement(elementAtPoint.id)
          }
        }
        return
      }

      if (!isDrawing || !currentElement) return

      if (tool.type === 'pen') {
        // Smooth line drawing with distance threshold
        if (lastPoint) {
          const distance = Math.sqrt(
            Math.pow(point.x - lastPoint.x, 2) + 
            Math.pow(point.y - lastPoint.y, 2)
          )

          if (distance > 2) { // Minimum distance for smoother lines
            const updatedElement = {
              ...currentElement,
              points: [...currentElement.points, point]
            }
            setCurrentElement(updatedElement)
            setLastPoint(point)
          }
        }
      } else {
        // For shapes, update the end point
        const updatedElement = {
          ...currentElement,
          points: [currentElement.points[0], point]
        }
        setCurrentElement(updatedElement)
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        setDragStart(null)
        return
      }

      if (isErasing) {
        setIsErasing(false)
        return
      }

      if (!isDrawing || !currentElement) return

      setIsDrawing(false)
      onAddElement(currentElement)
      setCurrentElement(null)
      setLastPoint(null)
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
      if (tool.type === 'select') {
        const point = getPointFromEvent(e)
        const elementAtPoint = getElementAtPoint(point)
        
        if (elementAtPoint && elementAtPoint.type === 'text') {
          if (isAdmin || elementAtPoint.userId === userId) {
            setTextInputPosition(point)
            setTextInputValue(elementAtPoint.text || '')
            setShowTextInput(true)
            // Store the element ID for updating
            setTimeout(() => {
              const input = document.getElementById('text-input') as HTMLInputElement
              if (input) {
                input.focus()
                input.select()
                input.setAttribute('data-element-id', elementAtPoint.id)
              }
            }, 10)
          }
        }
      }
    }

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (showTextInput) return // Don't handle shortcuts while text input is open

        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedElements.size > 0) {
            selectedElements.forEach(id => {
              const element = elements.find(el => el.id === id)
              if (element && (isAdmin || element.userId === userId)) {
                onDeleteElement(id)
              }
            })
            onSelectElements(new Set())
          }
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedElements, elements, isAdmin, userId, onDeleteElement, onSelectElements, showTextInput])

    const getCursor = () => {
      if (isDragging) return 'grabbing'
      
      switch (tool.type) {
        case 'eraser':
          return 'grab'
        case 'select':
          return 'default'
        case 'text':
          return 'text'
        default:
          return 'crosshair'
      }
    }

    return (
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: getCursor() }}
        />
        
        {/* Text Input Popup */}
        {showTextInput && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 shadow-2xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">Add Text</h3>
              <textarea
                id="text-input"
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg text-white p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 handwritten"
                placeholder="Enter your text here..."
                style={{ fontSize: '16px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault()
                    const input = e.target as HTMLTextAreaElement
                    const elementId = input.getAttribute('data-element-id')
                    
                    if (elementId) {
                      // Update existing element
                      onUpdateElement(elementId, { text: textInputValue.trim() })
                    } else {
                      // Create new element
                      handleTextInputSubmit()
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    handleTextInputCancel()
                  }
                }}
                autoFocus
              />
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-400">
                  Press Ctrl+Enter to add text, Esc to cancel
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleTextInputCancel}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const input = document.getElementById('text-input') as HTMLTextAreaElement
                      const elementId = input?.getAttribute('data-element-id')
                      
                      if (elementId) {
                        // Update existing element
                        onUpdateElement(elementId, { text: textInputValue.trim() })
                        setShowTextInput(false)
                        setTextInputValue('')
                      } else {
                        // Create new element
                        handleTextInputSubmit()
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300"
                  >
                    Add Text
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

WhiteboardCanvas.displayName = 'WhiteboardCanvas'