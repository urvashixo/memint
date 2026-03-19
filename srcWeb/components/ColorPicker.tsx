import React from 'react'
import { X } from 'lucide-react'

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  onClose: () => void
}

export function ColorPicker({ color, onChange, onClose }: ColorPickerProps) {
  const colors = [
    // Whites and grays
    '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', 
    '#6c757d', '#495057', '#343a40', '#212529', '#000000',
    
    // Reds
    '#ff6b6b', '#ee5a52', '#ff8787', '#ffa8a8', '#ffc9c9', '#ffe3e3',
    
    // Greens
    '#51cf66', '#40c057', '#69db7c', '#8ce99a', '#a9e34b', '#c0eb75',
    
    // Blues
    '#339af0', '#228be6', '#74c0fc', '#a5d8ff', '#d0ebff', '#e7f5ff',
    
    // Purples
    '#9775fa', '#845ef7', '#b197fc', '#d0bfff', '#e5dbff', '#f3f0ff',
    
    // Yellows
    '#ffd43b', '#fab005', '#ffe066', '#ffec99', '#fff3bf', '#fff9db',
    
    // Oranges
    '#ff922b', '#fd7e14', '#ffa94d', '#ffc078', '#ffd8a8', '#ffe8cc',
    
    // Pinks
    '#e64980', '#d6336c', '#f06595', '#f783ac', '#faa2c1', '#fcc2d7'
  ]

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-2xl min-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">Color Picker</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Color palette */}
      <div className="grid grid-cols-6 gap-2 mb-4">
        {colors.map(c => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`w-8 h-8 rounded border-2 transition-all duration-200 hover:scale-110 ${
              color === c 
                ? 'border-blue-500 scale-110 shadow-lg' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      {/* Custom color input */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-400 mb-2">Custom Color</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-8 rounded border border-gray-600 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 px-3 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="#ffffff"
            />
          </div>
        </div>

        {/* Recent colors */}
        <div>
          <label className="block text-xs text-gray-400 mb-2">Recent Colors</label>
          <div className="flex gap-1">
            {['#ffffff', '#ff6b6b', '#51cf66', '#339af0', '#ffd43b'].map(c => (
              <button
                key={c}
                onClick={() => onChange(c)}
                className="w-6 h-6 rounded border border-gray-600 hover:border-gray-500 transition-colors duration-200"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}