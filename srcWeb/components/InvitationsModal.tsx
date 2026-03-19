import React, { useState, useEffect } from 'react'
import { X, Mail, Check, X as XIcon, Clock, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Invitation {
  id: string
  lab_id: string
  invited_email: string
  invited_by: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  expires_at: string
  lab_name: string
  invited_by_name: string
}

interface InvitationsModalProps {
  isOpen: boolean
  onClose: () => void
  onInvitationAccepted: () => void
}

export function InvitationsModal({ isOpen, onClose, onInvitationAccepted }: InvitationsModalProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && user) {
      fetchInvitations()
    }
  }, [isOpen, user])

  const fetchInvitations = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError('')

      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invited_email', user.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvitations(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInvitationResponse = async (invitationId: string, action: 'accept' | 'reject') => {
    if (!user) return

    try {
      setProcessingId(invitationId)
      setError('')

      // Update invitation status
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', invitationId)

      if (updateError) throw updateError

      if (action === 'accept') {
        // Add user to lab as member with their name from database
        const invitation = invitations.find(inv => inv.id === invitationId)
        if (invitation) {
          // Fetch user's current name from the database
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name, email')
            .eq('id', user.id)
            .single()

          if (userError) throw userError

          // Use the name from database, or email as fallback
          const userName = userData?.name || userData?.email || user.email || 'Unknown User'
          
          const { error: memberError } = await supabase
            .from('lab_members')
            .insert({
              user_id: user.id,
              lab_id: invitation.lab_id,
              role: 'member',
              member_name: userName
            })

          if (memberError) throw memberError

          // Notify parent component to refresh labs
          onInvitationAccepted()
        }
      }

      // Remove invitation from list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))

    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleClose = () => {
    if (!loading && !processingId) {
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
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-8 shadow-2xl transition-all">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={loading || !!processingId}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-300 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Lab Invitations</h2>
            <p className="text-gray-400">Manage your pending lab invitations</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Content */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                Loading invitations...
              </div>
            ) : invitations.length > 0 ? (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {invitation.lab_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{invitation.lab_name}</h3>
                          <p className="text-sm text-gray-400">
                            Invited by {invitation.invited_by_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                        <div>
                          Sent {new Date(invitation.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleInvitationResponse(invitation.id, 'accept')}
                        disabled={!!processingId}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed"
                      >
                        {processingId === invitation.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => handleInvitationResponse(invitation.id, 'reject')}
                        disabled={!!processingId}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed"
                      >
                        {processingId === invitation.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <XIcon className="w-4 h-4" />
                        )}
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending invitations</p>
                <p className="text-sm mt-2">You'll see lab invitations here when you receive them</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {invitations.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-700">
              <button
                onClick={handleClose}
                disabled={loading || !!processingId}
                className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}