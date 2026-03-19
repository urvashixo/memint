import React from 'react'
import { Cursor, ViewState } from '../types/whiteboard'

interface UserCursorsProps {
  cursors: Map<string, Cursor>
  getUserColor: (userId: string) => string
  viewState: ViewState
}

export function UserCursors({ cursors, getUserColor, viewState }: UserCursorsProps) {
  return (
    <>
      {Array.from(cursors.values()).map(cursor => {
        // Transform cursor position based on view state
        const screenX = cursor.x * viewState.zoom + viewState.offsetX
        const screenY = cursor.y * viewState.zoom + viewState.offsetY
        
        return (
          <div
            key={cursor.userId}
            className="absolute pointer-events-none z-10 transition-all duration-100"
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(-2px, -2px)'
            }}
          >
            {/* Cursor dot */}
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: getUserColor(cursor.userId) }}
            />
            
            {/* User name label */}
            <div
              className="absolute top-4 left-0 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap max-w-[120px] truncate"
              style={{ backgroundColor: getUserColor(cursor.userId) }}
            >
              {cursor.userName}
            </div>
          </div>
        )
      })}
    </>
  )
}