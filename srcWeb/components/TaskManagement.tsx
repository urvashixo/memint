import React, { useState, useEffect } from 'react'
import { ArrowLeft, Plus, CheckSquare, Square, Play, Pause, Users, Calendar, AlertCircle, Trash2, Edit3, X, User, Clock, Target } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { BoltBadge } from './BoltBadge'

interface TaskManagementProps {
  labId: string
  labName: string
  onBack: () => void
}

interface TaskList {
  id: string
  name: string
  description: string
  color: string
  created_by: string
  created_at: string
  creator_name: string
}

interface Task {
  id: string
  task_list_id: string
  title: string
  description: string
  completed: boolean
  completed_by: string | null
  completed_at: string | null
  on_it_by: string | null
  on_it_at: string | null
  assigned_to: string | null
  created_by: string
  created_at: string
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  completed_by_name?: string
  on_it_by_name?: string
  assigned_to_name?: string
  created_by_name?: string
}

interface LabMember {
  id: string
  user_id: string
  member_name: string
}

export function TaskManagement({ labId, labName, onBack }: TaskManagementProps) {
  const { user } = useAuth()
  const [taskLists, setTaskLists] = useState<TaskList[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [labMembers, setLabMembers] = useState<LabMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateList, setShowCreateList] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<string | null>(null)

  // Form states
  const [newListName, setNewListName] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [newListColor, setNewListColor] = useState('#3B82F6')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskAssignee, setNewTaskAssignee] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]

  useEffect(() => {
    fetchData()
    const cleanup = setupRealtimeSubscriptions()
    return cleanup
  }, [labId])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchTaskLists(),
        fetchTasks(),
        fetchLabMembers()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTaskLists = async () => {
    const { data, error } = await supabase
      .from('task_lists')
      .select(`
        *,
        users!task_lists_created_by_fkey (name)
      `)
      .eq('lab_id', labId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const listsWithCreatorNames = data?.map(list => ({
      ...list,
      creator_name: list.users?.name || 'Unknown User'
    })) || []

    setTaskLists(listsWithCreatorNames)
  }

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        completed_by_user:users!tasks_completed_by_fkey (name),
        on_it_by_user:users!tasks_on_it_by_fkey (name),
        assigned_to_user:users!tasks_assigned_to_fkey (name),
        created_by_user:users!tasks_created_by_fkey (name),
        task_lists!inner (lab_id)
      `)
      .eq('task_lists.lab_id', labId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const tasksWithUserNames = data?.map(task => ({
      ...task,
      completed_by_name: task.completed_by_user?.name,
      on_it_by_name: task.on_it_by_user?.name,
      assigned_to_name: task.assigned_to_user?.name,
      created_by_name: task.created_by_user?.name
    })) || []

    setTasks(tasksWithUserNames)
  }

  const fetchLabMembers = async () => {
    const { data, error } = await supabase
      .from('lab_members')
      .select('*')
      .eq('lab_id', labId)

    if (error) throw error
    setLabMembers(data || [])
  }

  const setupRealtimeSubscriptions = () => {
    const taskListsChannel = supabase
      .channel(`task_lists:${labId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_lists',
        filter: `lab_id=eq.${labId}`
      }, () => {
        try {
          fetchTaskLists()
        } catch (error) {
          console.error('Error fetching task lists in real-time:', error)
        }
      })
      .subscribe()

    const tasksChannel = supabase
      .channel(`tasks:${labId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, async () => {
        try {
          await fetchTasks()
        } catch (error) {
          console.error('Error fetching tasks in real-time:', error)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(taskListsChannel)
      supabase.removeChannel(tasksChannel)
    }
  }

  const createTaskList = async () => {
    if (!newListName.trim()) return

    try {
      const { error } = await supabase
        .from('task_lists')
        .insert({
          lab_id: labId,
          name: newListName.trim(),
          description: newListDescription.trim(),
          color: newListColor,
          created_by: user?.id
        })

      if (error) throw error

      setNewListName('')
      setNewListDescription('')
      setNewListColor('#3B82F6')
      setShowCreateList(false)
      fetchTaskLists()
    } catch (error) {
      console.error('Error creating task list:', error)
    }
  }

  const createTask = async (taskListId: string) => {
    if (!newTaskTitle.trim()) return

    try {
      const taskData: any = {
        task_list_id: taskListId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        priority: newTaskPriority,
        created_by: user?.id
      }

      if (newTaskAssignee) {
        taskData.assigned_to = newTaskAssignee
      }

      if (newTaskDueDate) {
        taskData.due_date = new Date(newTaskDueDate).toISOString()
      }

      const { error } = await supabase
        .from('tasks')
        .insert(taskData)

      if (error) throw error

      setNewTaskTitle('')
      setNewTaskDescription('')
      setNewTaskAssignee('')
      setNewTaskPriority('medium')
      setNewTaskDueDate('')
      setShowCreateTask(null)
      fetchTasks()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const toggleTaskCompletion = async (task: Task) => {
    try {
      const updates: any = {
        completed: !task.completed
      }

      if (!task.completed) {
        updates.completed_by = user?.id
        updates.completed_at = new Date().toISOString()
        updates.on_it_by = null
        updates.on_it_at = null
      } else {
        updates.completed_by = null
        updates.completed_at = null
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const toggleOnIt = async (task: Task) => {
    try {
      const isCurrentlyOnIt = task.on_it_by === user?.id
      
      const updates: any = {
        on_it_by: isCurrentlyOnIt ? null : user?.id,
        on_it_at: isCurrentlyOnIt ? null : new Date().toISOString()
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', task.id)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const deleteTaskList = async (taskListId: string) => {
    try {
      const { error } = await supabase
        .from('task_lists')
        .delete()
        .eq('id', taskListId)

      if (error) throw error
      fetchTaskLists()
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task list:', error)
    }
  }

  const getTasksForList = (listId: string) => {
    return tasks.filter(task => task.task_list_id === listId)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertCircle
      case 'medium': return Target
      case 'low': return Clock
      default: return Clock
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-[#0F0F0F] text-white flex items-center justify-center">
        <div className="text-xl">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#0F0F0F] text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="fixed top-[90px] right-8 z-50">
            <BoltBadge />
      </div>
      <header className="border-b border-gray-800 bg-[#0F0F0F]/95 backdrop-blur-md flex-shrink-0">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to Lab
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold text-white">Task Management</h1>
              <p className="text-sm text-gray-400">
                {labName} • {taskLists.length} lists • {tasks.length} tasks
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateList(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-300"
          >
            <Plus className="w-4 h-4" />
            New List
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {taskLists.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold mb-2">No Task Lists Yet</h3>
            <p className="text-gray-400 mb-6">Create your first task list to start organizing your lab work</p>
            <button
              onClick={() => setShowCreateList(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-300"
            >
              Create First List
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {taskLists.map(list => {
              const listTasks = getTasksForList(list.id)
              const completedTasks = listTasks.filter(task => task.completed).length
              
              return (
                <div
                  key={list.id}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl overflow-hidden"
                  style={{ borderTopColor: list.color, borderTopWidth: '4px' }}
                >
                  {/* List Header */}
                  <div className="p-6 border-b border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{list.name}</h3>
                        {list.description && (
                          <p className="text-sm text-gray-400 mb-2">{list.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span>Created by {list.creator_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowCreateTask(list.id)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors duration-300"
                          title="Add Task"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        {list.created_by === user?.id && (
                          <button
                            onClick={() => deleteTaskList(list.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors duration-300"
                            title="Delete List"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            backgroundColor: list.color,
                            width: listTasks.length > 0 ? `${(completedTasks / listTasks.length) * 100}%` : '0%'
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {completedTasks}/{listTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {listTasks.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No tasks yet</p>
                        <button
                          onClick={() => setShowCreateTask(list.id)}
                          className="text-blue-400 hover:text-blue-300 text-sm mt-1 transition-colors duration-300"
                        >
                          Add your first task
                        </button>
                      </div>
                    ) : (
                      listTasks.map(task => {
                        const PriorityIcon = getPriorityIcon(task.priority)
                        const isOnIt = task.on_it_by === user?.id
                        const canEdit = task.created_by === user?.id || task.assigned_to === user?.id
                        
                        return (
                          <div
                            key={task.id}
                            className={`p-3 rounded-lg border transition-all duration-300 ${
                              task.completed
                                ? 'bg-gray-800/50 border-gray-600 opacity-75'
                                : 'bg-gray-800 border-gray-600 hover:border-gray-500'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleTaskCompletion(task)}
                                disabled={!canEdit}
                                className={`mt-0.5 transition-colors duration-300 ${
                                  canEdit ? 'hover:text-blue-400' : 'opacity-50 cursor-not-allowed'
                                }`}
                              >
                                {task.completed ? (
                                  <CheckSquare className="w-5 h-5 text-green-400" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400" />
                                )}
                              </button>

                              {/* Task Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className={`font-medium ${
                                    task.completed ? 'line-through text-gray-500' : 'text-white'
                                  }`}>
                                    {task.title}
                                  </h4>
                                  <div className="flex items-center gap-1">
                                    <PriorityIcon className={`w-3 h-3 ${getPriorityColor(task.priority)}`} />
                                    {canEdit && (
                                      <button
                                        onClick={() => deleteTask(task.id)}
                                        className="p-1 text-gray-500 hover:text-red-400 transition-colors duration-300"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {task.description && (
                                  <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                                )}

                                {/* Task Meta */}
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    {task.assigned_to_name && (
                                      <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                        {task.assigned_to_name}
                                      </span>
                                    )}
                                    {task.completed_by_name && (
                                      <span className="text-green-400">
                                        ✓ {task.completed_by_name}
                                      </span>
                                    )}
                                    {task.on_it_by_name && !task.completed && (
                                      <span className="text-orange-400">
                                        🔥 {task.on_it_by_name}
                                      </span>
                                    )}
                                  </div>

                                  {/* On It Button */}
                                  {!task.completed && canEdit && (
                                    <button
                                      onClick={() => toggleOnIt(task)}
                                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors duration-300 ${
                                        isOnIt
                                          ? 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                      }`}
                                    >
                                      {isOnIt ? (
                                        <>
                                          <Pause className="w-3 h-3" />
                                          On It
                                        </>
                                      ) : (
                                        <>
                                          <Play className="w-3 h-3" />
                                          Start
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>

                                {task.due_date && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create List Modal */}
      {showCreateList && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateList(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-8 shadow-2xl transition-all">
              <button
                onClick={() => setShowCreateList(false)}
                className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-300"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold text-white mb-6">Create Task List</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    List Name *
                  </label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter list name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newListDescription}
                    onChange={(e) => setNewListDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe this task list..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewListColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                          newListColor === color ? 'border-white scale-110' : 'border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowCreateList(false)}
                    className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:border-gray-500 hover:text-white transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTaskList}
                    disabled={!newListName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-300 disabled:cursor-not-allowed"
                  >
                    Create List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateTask(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 p-8 shadow-2xl transition-all">
              <button
                onClick={() => setShowCreateTask(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-300"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold text-white mb-6">Create Task</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe the task..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Assign To
                  </label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Assign to someone (optional)</option>
                    {labMembers.map(member => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.member_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowCreateTask(null)}
                    className="flex-1 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-medium hover:border-gray-500 hover:text-white transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createTask(showCreateTask)}
                    disabled={!newTaskTitle.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-300 disabled:cursor-not-allowed"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}