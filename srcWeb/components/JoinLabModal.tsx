import React, { useState } from 'react'
import { X, UserPlus, Loader2, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface JoinLabModalProps {
  isOpen: boolean
  onClose: () => void
  onLabJoined: (labId: string) => void
}

export function JoinLabModal({ isOpen, onClose, onLabJoined }: JoinLabModalProps) {
  const [labId, setLabId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !labId.trim()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const trimmedLabId = labId.trim()

      // Check if lab exists
      const { data: labData, error: labError } = await supabase
        .from('labs')
        .select('id, name')
        .eq('id', trimmedLabId)
        .single()

      if (labError || !labData) {
        setError('Lab not found. Please check the Lab ID and try again.')
        return
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from('lab_members')
        .select('id')
        .eq('lab_id', trimmedLabId)
        .eq('user_id', user.id)
        .single()

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError
      }

      if (existingMember) {
        setError('You are already a member of this lab.')
        return
      }

      // Get user's name for the lab member record
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', user.id)
        .single()

      if (userError) throw userError

      const userName = userData?.name || userData?.email || user.email || 'Unknown User'

      // Add user as a member
      const { error: insertError } = await supabase
        .from('lab_members')
        .insert({
          user_id: user.id,
          lab_id: trimmedLabId,
          role: 'member',
          member_name: userName
        })

      if (insertError) throw insertError

      setSuccess(`Successfully joined "${labData.name}"!`)
      setLabId('')
      
      // Redirect to the lab page immediately
      onLabJoined(trimmedLabId)
      onClose()

    } catch (err: any) {
      console.error('Error joining lab:', err)
      setError(err.message || 'Failed to join lab. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setLabId('')
      setError('')
      setSuccess('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-8 shadow-2xl transition-all">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-300 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Join Lab</h2>
            <p className="text-gray-400">Enter a Lab ID to join an existing research lab</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-300">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-green-300">
                <Check className="w-4 h-4" />
                <span className="text-sm">{success}</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Lab ID field */}
            <div>
              <label htmlFor="lab-id" className="block text-sm font-medium text-gray-300 mb-2">
                Lab ID *
              </label>
              <input
                type="text"
                id="lab-id"
                value={labId}
                onChange={(e) => setLabId(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300 font-mono"
                placeholder="Enter the Lab ID"
                required
                disabled={loading}
              />
              <p className="mt-2 text-xs text-gray-500">
                Ask a lab admin for the Lab ID to join their research lab
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:border-gray-500 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !labId.trim()}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Join Lab
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>How to get a Lab ID:</strong> Ask a lab administrator to share the Lab ID with you. They can find it by clicking the "Share ID" button in their lab dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}