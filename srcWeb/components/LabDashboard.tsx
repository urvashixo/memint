import React, { useState, useEffect } from 'react'
import { LogOut, Plus, Users, Video, Atom, MessageSquare, CheckSquare, Bell, UserPlus, FileText, ArrowLeft, Share, Check, Settings } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { CreateLabModal } from './CreateLabModal'
import { InvitationsModal } from './InvitationsModal'
import { JoinLabModal } from './JoinLabModal'
import { BoltBadge } from './BoltBadge'
import { useVideoCall } from './VideoCallProvider'
import { InviteMembersModal } from './InviteMembersModal'
import { Whiteboard } from './Whiteboard'
import { StructureStudio } from './StructureStudio'
import { TaskManagement } from './TaskManagement'
import { Research } from './Research'
import { LabChat } from './LabChat'
import { ReportsPage } from './ReportsPage'

interface Lab {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
}

interface LabMember {
  id: string
  user_id: string
  lab_id: string
  role: 'admin' | 'member'
  joined_at: string
  user_name: string // We'll fetch this from users table
  user_email: string // Fallback if name is empty
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

interface LabDashboardProps {
  labId: string
  onBack: () => void
}

export function LabDashboard({ labId, onBack }: LabDashboardProps) {
  const [lab, setLab] = useState<Lab | null>(null)
  const [members, setMembers] = useState<LabMember[]>([])
  const [recentActivities, setRecentActivities] = useState<TaskActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [currentView, setCurrentView] = useState<'dashboard' | 'whiteboard' | 'structure' | 'tasks' | 'research' | 'reports'>('dashboard')
  const [copied, setCopied] = useState(false)
  const { user } = useAuth()
  const { isOpen: isVideoCallOpen, minimizeVideoCall } = useVideoCall()

  useEffect(() => {
    fetchLabData()
  }, [labId])

  // Minimize video call when entering lab dashboard
  useEffect(() => {
    if (isVideoCallOpen) {
      minimizeVideoCall()
    }
  }, [isVideoCallOpen, minimizeVideoCall])

  const fetchLabData = async () => {
    try {
      setLoading(true)
      
      // Fetch lab details - remove .single() and handle empty results
      const { data: labDataArray, error: labError } = await supabase
        .from('labs')
        .select('*')
        .eq('id', labId)

      if (labError) throw labError
      
      // Check if lab exists and user has access to it
      if (!labDataArray || labDataArray.length === 0) {
        throw new Error('Lab not found or you do not have permission to access this lab. Please check the lab ID or ask the lab owner to invite you.')
      }
      
      const labData = labDataArray[0]
      setLab(labData)

      // Fetch lab members with user details from users table
      const { data: membersData, error: membersError } = await supabase
        .from('lab_members')
        .select(`
          id,
          user_id,
          lab_id,
          role,
          joined_at,
          users (
            name,
            email
          )
        `)
        .eq('lab_id', labId)

      if (membersError) throw membersError

      // Transform the data to include user names
      const membersWithNames = (membersData || []).map(member => ({
        id: member.id,
        user_id: member.user_id,
        lab_id: member.lab_id,
        role: member.role,
        joined_at: member.joined_at,
        user_name: member.users?.name || member.users?.email || 'Unknown User',
        user_email: member.users?.email || ''
      }))

      setMembers(membersWithNames)

    } catch (err: any) {
      setError(err.message)
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
    // This function is not used in this component, but keeping for consistency
  }

  const handleMemberInvited = () => {
    // Refresh member list when someone is invited
    fetchLabData()
  }

  const handleBackToDashboard = () => {
    // Refresh labs and activities when returning to dashboard
    fetchLabData()
    fetchRecentActivities()
  }

  const handleShareId = async () => {
    try {
      await navigator.clipboard.writeText(labId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy lab ID:', err)
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = labId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const navigateToLabTasks = (labId: string) => {
    setCurrentView('tasks')
  }

  const isOwner = lab?.owner_id === user?.id
  const userMember = members.find(m => m.user_id === user?.id)
  const isAdmin = userMember?.role === 'admin' || isOwner

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
        <div className="text-xl">Loading lab...</div>
      </div>
    )
  }

  if (error || !lab) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
        <div className="fixed top-[90px] right-2 md:right-18 z-50">
        <BoltBadge />
        </div>
        
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-xl text-red-400 mb-4">Unable to access lab</div>
          <div className="text-gray-300 mb-6 leading-relaxed">
            {error || 'Lab not found or you do not have permission to access this lab.'}
          </div>
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 transition-colors duration-300"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Show whiteboard if selected
  if (currentView === 'whiteboard') {
    return (
      <Whiteboard
        labId={labId}
        labName={lab.name}
        onBack={() => setCurrentView('dashboard')}
      />
    )
  }

  // Show structure studio if selected
  if (currentView === 'structure') {
    return (
      <StructureStudio
        labId={labId}
        labName={lab.name}
        onBack={() => setCurrentView('dashboard')}
      />
    )
  }

  // Show task management if selected
  if (currentView === 'tasks') {
    return (
      <TaskManagement
        labId={labId}
        labName={lab.name}
        onBack={() => setCurrentView('dashboard')}
      />
    )
  }

  // Show research page if selected
  if (currentView === 'research') {
    return (
      <Research
        labId={labId}
        labName={lab.name}
        onBack={() => setCurrentView('dashboard')}
      />
    )
  }

  // Show reports page if selected
  if (currentView === 'reports') {
    return (
      <ReportsPage
        labId={labId}
        labName={lab.name}
        onBack={() => setCurrentView('dashboard')}
        isAdmin={isAdmin}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
        <div className="fixed top-[90px] right-2 md:right-24 z-50">
        <BoltBadge />
        </div>
      
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0F0F0F]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300 group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              </button>
              <div className="h-6 w-px bg-gray-700" />
              <div>
                <h1 className="hidden md:flex text-xl font-bold text-white">{lab.name}</h1>
                <p className="hidden md:flex text-sm text-gray-400">
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Reports button - visible to all members */}
              <button 
                onClick={() => setCurrentView('reports')}
                className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Reports</span>
              </button>
              
              {/* Admin-only buttons */}
              {isAdmin && (
                <>
                  <button 
                    onClick={handleShareId}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share className="w-4 h-4" />
                        <span className="hidden sm:inline">Share ID</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Invite Members</span>
                  </button>
                  <button className="hidden flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Lab info */}
        {lab.description && (
          <div className="mb-8 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3 text-white">About this lab</h2>
            <p className="text-gray-300 leading-relaxed">{lab.description}</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <button 
            onClick={() => setCurrentView('research')}
            className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-blue-400 transition-colors duration-300">
              Research
            </h3>
            <p className="text-gray-400 text-sm">
              Research In Bio Medical Field 
            </p>
          </button>

          <button 
            onClick={() => setCurrentView('structure')}
            className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-green-500 to-teal-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Atom className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-green-400 transition-colors duration-300">
              Structure Studio
            </h3>
            <p className="text-gray-400 text-sm">
              3D molecular visualization
            </p>
          </button>

          <button 
            onClick={() => setCurrentView('whiteboard')}
            className="hidden md:block group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-orange-400 transition-colors duration-300">
              Whiteboard
            </h3>
            <p className="text-gray-400 text-sm">
              Collaborative drawing board
            </p>
          </button>

          <button 
            onClick={() => setCurrentView('tasks')}
            className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-gray-600 transition-all duration-300 hover:transform hover:-translate-y-1 text-left"
          >
            <div className="bg-gradient-to-r from-pink-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <CheckSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-pink-400 transition-colors duration-300">
              Tasks
            </h3>
            <p className="text-gray-400 text-sm">
              Manage lab tasks and todos
            </p>
          </button>
        </div>

        {/* Content sections */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Lab Members - Now with scrollable content */}
          <div className=" w-[100%] md:w-full md:max-w bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-400" />
              Lab Members ({members.length})
            </h2>
            
            {/* Scrollable container */}
            <div className="h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="space-y-4 pr-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    Loading members...
                  </div>
                ) : members.length > 0 ? (
                  members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
                      <div className="hidden md:flex w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {member.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-white">{member.user_name}</div>
                        {member.user_email && member.user_email !== member.user_name && (
                          <div className="text-xs text-gray-400">{member.user_email}</div>
                        )}
                      </div>
                      <div className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full">
                        {member.role}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No members yet. Invite people to join this lab!</p>
                    {isAdmin && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="mt-4 text-blue-400 hover:text-blue-300 transition-colors duration-300"
                      >
                        Invite your first member →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Scroll indicator */}
            {members.length > 4 && (
              <div className="mt-4 text-center">
                <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                  <span>Scroll to see more members</span>
                  <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                </div>
              </div>
            )}
          </div>

          {/* Lab Chat - Replacing Recent Activity */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl overflow-hidden h-[500px]">
            <LabChat labId={labId} labName={lab.name} />
          </div>
        </div>
      </main>

      {/* Invite Members Modal */}
      <InviteMembersModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        labId={labId}
        labName={lab.name}
        onMemberInvited={handleMemberInvited}
      />
    </div>
  )
}