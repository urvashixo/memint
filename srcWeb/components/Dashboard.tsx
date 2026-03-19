import React, { useState, useEffect } from 'react'
import { LogOut, Plus, Users, Video, Atom, MessageSquare, CheckSquare, Bell, UserPlus, FileText } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { CreateLabModal } from './CreateLabModal'
import { LabDashboard } from './LabDashboard'
import { InvitationsModal } from './InvitationsModal'
import { JoinLabModal } from './JoinLabModal'
import { BoltBadge } from './BoltBadge'
import { useVideoCall } from './VideoCallProvider'
import { ReportsPage } from './ReportsPage'

interface Lab {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
}

interface TaskActivity {
  id: string
  task_id: string
  lab_id: string
  user_id: string
  activity_type: string
  message: string
  created_at: string
  lab_name?: string
  task_title?: string
}

export function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInvitationsModal, setShowInvitationsModal] = useState(false)
  const [showJoinLabModal, setShowJoinLabModal] = useState(false)
  const [showReportsModal, setShowReportsModal] = useState(false)
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null)
  const [selectedReportsLabId, setSelectedReportsLabId] = useState<string | null>(null)
  const [labs, setLabs] = useState<Lab[]>([])
  const [recentActivities, setRecentActivities] = useState<TaskActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { user, signOut } = useAuth()
  const { openVideoCall } = useVideoCall()

  useEffect(() => {
    if (user) {
      fetchUserLabs()
      fetchRecentActivities()
    }
  }, [user])

  const fetchUserLabs = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Fetch labs where user is a member - ordered by joined_at DESC to show newest first
      const { data, error } = await supabase
        .from('lab_members')
        .select(`
          lab_id,
          joined_at,
          labs (
            id,
            name,
            description,
            owner_id,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false }) // Order by when user joined, newest first

      if (error) throw error

      const userLabs = data?.map(item => item.labs).filter(Boolean) || []
      setLabs(userLabs as Lab[])
    } catch (err) {
      console.error('Error fetching labs:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivities = async () => {
    if (!user) return

    try {
      // Fetch recent task activities where the logged-in user is assigned to the task
      const { data, error } = await supabase
        .from('task_activities')
        .select(`
          *,
          tasks!inner (
            title,
            assigned_to,
            task_lists!inner (
              lab_id,
              labs!inner (
                name,
                lab_members!inner (user_id)
              )
            )
          )
        `)
        .eq('tasks.assigned_to', user.id) // Only show activities for tasks assigned to the logged-in user
        .eq('tasks.task_lists.labs.lab_members.user_id', user.id) // Ensure user is a member of the lab
        .eq('activity_type', 'assigned') // Only show assignment activities
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      const activitiesWithLabInfo = data?.map(activity => ({
        ...activity,
        lab_name: activity.tasks?.task_lists?.labs?.name,
        task_title: activity.tasks?.title
      })) || []

      setRecentActivities(activitiesWithLabInfo)
    } catch (err) {
      console.error('Error fetching recent activities:', err)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const handleLabCreated = (labId: string) => {
    // Refresh the labs list
    fetchUserLabs()
    // Navigate to the new lab
    setSelectedLabId(labId)
  }

  const handleBackToDashboard = () => {
    setSelectedLabId(null)
    setSelectedReportsLabId(null)
    // Refresh labs and activities when returning to dashboard
    fetchUserLabs()
    fetchRecentActivities()
  }

  const handleInvitationAccepted = () => {
    // Refresh labs when an invitation is accepted
    fetchUserLabs()
  }

  const handleLabJoined = (labId: string) => {
    // Refresh labs when a lab is joined
    fetchUserLabs()
    // Navigate to the joined lab
    setSelectedLabId(labId)
  }

  const navigateToLabTasks = (labId: string) => {
    setSelectedLabId(labId)
    // The LabDashboard component will handle showing the tasks view
  }

  const handleReportsLabSelect = (labId: string) => {
    setSelectedReportsLabId(labId)
    setShowReportsModal(false)
  }

  // Show lab dashboard if a lab is selected
  if (selectedLabId) {
    return <LabDashboard labId={selectedLabId} onBack={handleBackToDashboard} />
  }
  // Show reports page if a reports lab is selected
  if (selectedReportsLabId) {
    const selectedLab = labs.find(lab => lab.id === selectedReportsLabId)
    // Check if user is owner of the lab (for admin permissions)
    const isAdmin = selectedLab?.owner_id === user?.id
    return (
      <ReportsPage
        labId={selectedReportsLabId}
        labName={selectedLab?.name || 'Lab'}
        onBack={handleBackToDashboard}
        isAdmin={isAdmin}
      />
    )
  }

  // Show auth page if requested
  if (showInvitationsModal) {
    return <InvitationsModal isOpen={showInvitationsModal} onClose={() => setShowInvitationsModal(false)} onInvitationAccepted={handleInvitationAccepted} />
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0F0F0F]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src="/medmint-removebg-preview.png" 
              alt="MedMint" 
              className="w-8 h-8 object-contain"
            />
            <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              MedMint
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:flex text-gray-300">Welcome, {user?.user_metadata?.name || user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="fixed top-[65px] md:top-[90px] right-2 md:right-24 z-50">
            <BoltBadge />
      </div>


      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Research Dashboard
          </h1>
          <p className="text-xl text-gray-400">
            Manage your labs, collaborate with your team, and advance your research.
          </p>
        </div>

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors duration-300">
              Create Lab
            </h3>
            <p className="text-gray-400 text-sm">
              Start a new research lab and invite collaborators
            </p>
          </button>

          <button 
            onClick={() => setShowJoinLabModal(true)}
            className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-green-500 to-teal-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-green-400 transition-colors duration-300">
              Join Lab
            </h3>
            <p className="text-gray-400 text-sm">
              Join an existing lab with a lab ID
            </p>
          </button>

          <button 
            onClick={() => setShowReportsModal(true)}
            className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-orange-400 transition-colors duration-300">
              View Reports
            </h3>
            <p className="text-gray-400 text-sm">
              Access lab reports and research documents
            </p>
          </button>

          <button 
            onClick={() => setShowInvitationsModal(true)}
            className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-pink-400 transition-colors duration-300">
              Invitations
            </h3>
            <p className="text-gray-400 text-sm">
              View and manage lab invitations
            </p>
          </button>
        </div>

        {/* Recent activity placeholder */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* My Labs - Now with scrollable content */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" />
              My Labs ({labs.length})
            </h2>
            
            {/* Scrollable container */}
            <div className="h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="space-y-4 pr-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Loading labs...
                  </div>
                ) : labs.length > 0 ? (
                  labs.map((lab) => (
                    <button
                      key={lab.id}
                      onClick={() => setSelectedLabId(lab.id)}
                      className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {lab.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors duration-300 truncate">
                            {lab.name}
                          </h3>
                          {lab.description && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                              {lab.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Created {new Date(lab.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No labs yet. Create your first lab to get started!</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                    >
                      Create your first lab →
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Scroll indicator */}
            {labs.length > 4 && (
              <div className="mt-4 text-center">
                <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>Scroll to see more labs</span>
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity - Now filtered for assigned tasks only */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Bell className="w-6 h-6 text-green-400" />
              My Assigned Tasks
            </h2>
            <div className="space-y-4 h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 cursor-pointer"
                    onClick={() => navigateToLabTasks(activity.lab_id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckSquare className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{activity.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blue-400">{activity.lab_name}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">
                            {new Date(activity.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No assigned tasks yet</p>
                  <p className="text-sm mt-2">Tasks assigned to you will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Lab Modal */}
      <CreateLabModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onLabCreated={handleLabCreated}
      />

      {/* Join Lab Modal */}
      <JoinLabModal
        isOpen={showJoinLabModal}
        onClose={() => setShowJoinLabModal(false)}
        onLabJoined={handleLabJoined}
      />

      {/* Reports Lab Selection Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportsModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-8 shadow-2xl transition-all">
              <button
                onClick={() => setShowReportsModal(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-300"
              >
                ✕
              </button>

              <div className="mb-6">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Select Lab</h2>
                <p className="text-gray-400">Choose a lab to view its reports</p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {labs.length > 0 ? (
                  labs.map((lab) => (
                    <button
                      key={lab.id}
                      onClick={() => handleReportsLabSelect(lab.id)}
                      className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {lab.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-white group-hover:text-orange-400 transition-colors duration-300 truncate">
                            {lab.name}
                          </h3>
                          {lab.description && (
                            <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                              {lab.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No labs available</p>
                    <p className="text-sm mt-2">Create or join a lab first</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invitations Modal */}
      <InvitationsModal
        isOpen={showInvitationsModal}
        onClose={() => setShowInvitationsModal(false)}
        onInvitationAccepted={handleInvitationAccepted}
      />
    </div>
  )
}