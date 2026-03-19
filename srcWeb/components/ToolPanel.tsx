import React from 'react'
import { Pen, Square, Circle, Minus, Type, Eraser, Hand, Palette, ArrowRight, Diamond } from 'lucide-react'
import { Tool } from '../types/whiteboard'

interface ToolPanelProps {
  tool: Tool
  onToolChange: (tool: Tool) => void
  onColorPickerToggle: () => void
  selectedCount: number
}

export function ToolPanel({ tool, onToolChange, onColorPickerToggle, selectedCount }: ToolPanelProps) {
  const tools = [
    { type: 'select' as const, icon: Hand, label: 'Select (V)' },
    { type: 'pen' as const, icon: Pen, label: 'Pen (P)' },
    { type: 'rectangle' as const, icon: Square, label: 'Rectangle (R)' },
    { type: 'circle' as const, icon: Circle, label: 'Circle (C)' },
    { type: 'diamond' as const, icon: Diamond, label: 'Diamond (D)' },
    { type: 'line' as const, icon: Minus, label: 'Line (L)' },
    { type: 'arrow' as const, icon: ArrowRight, label: 'Arrow (A)' },
    { type: 'text' as const, icon: Type, label: 'Text (T)' },
    { type: 'eraser' as const, icon: Eraser, label: 'Eraser (E)' }
  ]

  const strokeWidths = [1, 2, 4, 8, 16]
  const opacities = [0.25, 0.5, 0.75, 1]

  return (
    <div className="h-full flex flex-col items-center py-4 space-y-2 overflow-y-auto">
      {/* Tools */}
      {tools.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => onToolChange({ ...tool, type })}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
            tool.type === type
              ? 'text-white shadow-lg'
              : 'text-gray-400 hover:text-white'
          }`}
          title={label}
        >
          <Icon className="w-5 h-5" />
        </button>
      ))}

      <div className="w-8 h-px bg-gray-700 my-2" />

      {/* Color Picker Button */}
      <button
        onClick={onColorPickerToggle}
        className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 relative"
        title="Color"
      >
        <Palette className="w-5 h-5" />
        <div 
          className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-gray-600"
          style={{ backgroundColor: tool.color }}
        />
      </button>

      <div className="w-8 h-px bg-gray-700 my-2" />

      {/* Stroke Width */}
      <div className="flex flex-col items-center space-y-1">
        <div className="text-xs text-gray-500 mb-1">Size</div>
        {strokeWidths.map(width => (
          <button
            key={width}
            onClick={() => onToolChange({ ...tool, strokeWidth: width })}
            className={`w-10 h-8 rounded flex items-center justify-center transition-all duration-200 ${
              tool.strokeWidth === width
                ? 'bg-blue-600'
                : 'hover:bg-gray-800'
            }`}
            title={`${width}px`}
          >
            <div
              className="rounded-full bg-current"
              style={{
                width: Math.min(width * 2, 16),
                height: Math.min(width * 2, 16)
              }}
            />
          </button>
        ))}
      </div>

      <div className="w-8 h-px bg-gray-700 my-2" />

      {/* Opacity */}
      <div className="flex flex-col items-center space-y-1">
        <div className="text-xs text-gray-500 mb-1">Opacity</div>
        {opacities.map(opacity => (
          <button
            key={opacity}
            onClick={() => onToolChange({ ...tool, opacity })}
            className={`w-10 h-6 rounded flex items-center justify-center transition-all duration-200 text-xs ${
              tool.opacity === opacity
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800'
            }`}
            title={`${Math.round(opacity * 100)}%`}
          >
            {Math.round(opacity * 100)}%
          </button>
        ))}
      </div>

      {/* Fill toggle for shapes */}
      {(tool.type === 'rectangle' || tool.type === 'circle' || tool.type === 'diamond') && (
        <>
          <div className="w-8 h-px bg-gray-700 my-2" />
          <div className="flex flex-col items-center space-y-1">
            <div className="text-xs text-gray-500 mb-1">Fill</div>
            <button
              onClick={() => onToolChange({ 
                ...tool, 
                fill: tool.fill === 'transparent' ? tool.color : 'transparent' 
              })}
              className={`w-10 h-8 rounded border-2 transition-all duration-200 ${
                tool.fill !== 'transparent'
                  ? 'border-blue-500'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              style={{ 
                backgroundColor: tool.fill !== 'transparent' ? tool.fill : 'transparent' 
              }}
              title={tool.fill !== 'transparent' ? 'Remove fill' : 'Add fill'}
            />
          </div>
        </>
      )}

      {/* Selection info */}
      {selectedCount > 0 && (
        <>
          <div className="w-8 h-px bg-gray-700 my-2" />
          <div className="text-xs text-gray-400 text-center px-2">
            {selectedCount} selected
          </div>
        </>
      )}
    </div>
  )
}