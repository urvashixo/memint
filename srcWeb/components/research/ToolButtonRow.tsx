import React from 'react'
import { Pill, Dna, Activity, Network, MessageSquare } from 'lucide-react'

interface ToolButtonRowProps {
  onToolAction: (toolType: string) => void
  disabled: boolean
}

export function ToolButtonRow({ onToolAction, disabled }: ToolButtonRowProps) {
  const tools = [
    {
      id: 'drug-generation',
      label: 'Compound Generation',
      icon: Pill,
      color: 'from-green-500 to-emerald-600',
      hoverColor: 'from-green-600 to-emerald-700'
    },
    {
      id: 'amino-sequence',
      label: 'Amino Acid Sequence',
      icon: Dna,
      color: 'from-blue-500 to-cyan-600',
      hoverColor: 'from-blue-600 to-cyan-700'
    },
    {
      id: 'binding-affinity',
      label: 'Binding Affinity',
      icon: Activity,
      color: 'from-purple-500 to-pink-600',
      hoverColor: 'from-purple-600 to-pink-700'
    },
    {
      id: 'graph-knowledge',
      label: 'Graph Knowledge (AQL)',
      icon: Network,
      color: 'from-orange-500 to-red-600',
      hoverColor: 'from-orange-600 to-red-700'
    }
  ]

  return (
    <div className="border-t border-gray-800 p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.id}
              onClick={() => onToolAction(tool.id)}
              disabled={disabled}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl font-medium transition-all duration-300 
                transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed
                bg-gradient-to-r ${tool.color} hover:${tool.hoverColor}
                disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50
                text-white shadow-lg hover:shadow-xl
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs text-center leading-tight">{tool.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}