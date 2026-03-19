import React, { useState } from 'react'
import { X, UserPlus, Mail, Loader2, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface InviteMembersModalProps {
  isOpen: boolean
  onClose: () => void
  labId: string
  labName: string
  onMemberInvited: () => void
}

export function InviteMembersModal({ isOpen, onClose, labId, labName, onMemberInvited }: InviteMembersModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !email.trim()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const inviteEmail = email.trim().toLowerCase()

      // Simple query to check if user exists
      const { data: existingUsers, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', inviteEmail)

      if (userError) {
        throw new Error('Error checking user: ' + userError.message)
      }

      if (!existingUsers || existingUsers.length === 0) {
        setError('No user found with this email address. The user must create an account first.')
        return
      }

      const existingUser = existingUsers[0]

      // Check if user is already a member
      const { data: existingMembers, error: memberError } = await supabase
        .from('lab_members')
        .select('*')
        .eq('lab_id', labId)
        .eq('user_id', existingUser.id)

      if (memberError) {
        throw new Error('Error checking membership: ' + memberError.message)
      }

      if (existingMembers && existingMembers.length > 0) {
        setError('This user is already a member of the lab')
        return
      }

      // Check if there's already a pending invitation
      const { data: existingInvitations, error: invitationError } = await supabase
        .from('invitations')
        .select('*')
        .eq('lab_id', labId)
        .eq('invited_email', inviteEmail)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())

      if (invitationError) {
        throw new Error('Error checking invitations: ' + invitationError.message)
      }

      if (existingInvitations && existingInvitations.length > 0) {
        setError('There is already a pending invitation for this email')
        return
      }

      // Get user's name for the invitation
      const userName = user.user_metadata?.name || user.email || 'Unknown User'

      // Create invitation with lab name and inviter name
      const { error: inviteError } = await supabase
        .from('invitations')
        .insert({
          lab_id: labId,
          invited_email: inviteEmail,
          invited_by: user.id,
          status: 'pending',
          lab_name: labName,
          invited_by_name: userName
        })

      if (inviteError) throw inviteError

      setSuccess(`Invitation sent to ${email}`)
      setEmail('')
      onMemberInvited()

      // Auto-close after success
      setTimeout(() => {
        setSuccess('')
        onClose()
      }, 2000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setEmail('')
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
            <h2 className="text-2xl font-bold text-white mb-2">Invite Members</h2>
            <p className="text-gray-400">Invite new members to join "{labName}"</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg text-green-300 text-sm flex items-center gap-2">
              <Check className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field */}
            <div>
              <label htmlFor="invite-email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="invite-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-300"
                  placeholder="Enter email address"
                  required
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                The person must already have an account to receive the invitation
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
                disabled={loading || !email.trim()}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Send Invitation
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> Invitations expire after 7 days. The invited person must have an existing account to accept the invitation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}