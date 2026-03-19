import React, { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

interface ChatMessage {
  id: string
  lab_id: string
  sender_id: string
  message: string
  created_at: string
  sender_name?: string
}

interface LabChatProps {
  labId: string
  labName: string
}

export function LabChat({ labId, labName }: LabChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null) 
  const channelRef = useRef<any>(null)

  useEffect(() => {
    let pollingInterval: any = null
    if (labId && user) {
      fetchMessages()
      setupRealtimeSubscription()

      // Poll every 3 seconds
    pollingInterval = setInterval(() => {
      fetchMessages()
    }, 3000)
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval)
      if (channelRef.current) {
        console.log('Cleaning up realtime subscription')
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [labId, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

const scrollToBottom = () => {
  if (!messagesContainerRef.current || !messagesEndRef.current) return

  const container = messagesContainerRef.current
  const end = messagesEndRef.current

  container.scrollTo({
    top: end.offsetTop,
    behavior: 'smooth',
  })
}
 const fetchMessages = async () => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        users!chat_messages_sender_id_fkey (
          name,
          email
        )
      `)
      .eq('lab_id', labId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    const messagesWithSenderNames = (data || []).map(msg => ({
      ...msg,
      sender_name: msg.users?.name || msg.users?.email || 'Unknown User'
    })).reverse()

    // Check if messages have changed before updating state
    const sameLength = messagesWithSenderNames.length === messages.length
    const sameContent = sameLength && messages.every((msg, i) => msg.id === messagesWithSenderNames[i].id)

    if (!sameContent) {
      setMessages(messagesWithSenderNames)
    }
  } catch (error) {
    console.error('Error fetching messages:', error)
  } finally {
    setLoading(false)
  }
}


  const setupRealtimeSubscription = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    console.log('Setting up broadcast subscription for lab:', labId)

    const channel = supabase.channel(`lab-chat-${labId}`, {
      config: {
        broadcast: { self: false }, // Don't receive your own messages via broadcast
        presence: { key: user?.id }
      }
    })

    channel
      .on('broadcast', { event: 'new-message' }, (payload) => {
        console.log('Broadcast message received:', payload.payload)

        const messageWithSender = payload.payload

        setMessages((prev) => {
          // Check for duplicates by ID
          if (prev.some(m => m.id === messageWithSender.id)) {
            console.log('Duplicate message detected, skipping')
            return prev
          }
          console.log('Adding new message to state')
          return [...prev, messageWithSender]
        })
      })
      .subscribe((status) => {
        console.log('Broadcast subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to broadcast channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription failed')
        }
      })

    channelRef.current = channel
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !user || sending) return

    const messageText = newMessage.trim()
    setNewMessage('') // Clear input immediately
    setSending(true)

    try {
      console.log('Sending message:', messageText)

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          lab_id: labId,
          sender_id: user.id,
          message: messageText,
          message_type: 'chat',
          mentions: []
        })
        .select(`
          *,
          users!chat_messages_sender_id_fkey (
            name,
            email
          )
        `)
        .single()

      if (error) {
        console.error('Error sending message:', error)
        setNewMessage(messageText) // Restore message on error
        throw error
      }

      console.log('Message sent successfully:', data)
      
      const senderName = data.users?.name || data.users?.email || user.email || 'Unknown User'

      const messageWithSender = {
        ...data,
        sender_name: senderName
      }

      // Add message to own UI immediately (since broadcast self is disabled)
      setMessages((prev) => [...prev, messageWithSender])

      // Broadcast to other users
      if (channelRef.current) {
        console.log('Broadcasting message to other users')
        channelRef.current.send({
          type: 'broadcast',
          event: 'new-message',
          payload: messageWithSender
        })
      }

    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e as any)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserColor = (userId: string) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-400">Loading chat...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <MessageSquare className="w-5 h-5 text-green-400" />
        <div>
          <h3 className="font-semibold text-white">Lab Chat</h3>
          <p className="text-xs text-gray-400">{labName} • Real-time</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        style={{ maxHeight: '500px' }}>
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm mt-2">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender_id === user?.id
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id
            const showTimestamp = index === messages.length - 1 || 
              messages[index + 1].sender_id !== message.sender_id ||
              new Date(messages[index + 1].created_at).getTime() - new Date(message.created_at).getTime() > 300000 // 5 minutes

            return (
              <div key={message.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 ${showAvatar ? 'visible' : 'invisible'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getUserColor(message.sender_id)}`}>
                    {getUserInitials(message.sender_name || 'U')}
                  </div>
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-xs ${isOwnMessage ? 'text-right' : ''}`}>
                  {/* Sender name (only for others' messages and when avatar is shown) */}
                  {!isOwnMessage && showAvatar && (
                    <div className="text-xs text-gray-400 mb-1 px-3">
                      {message.sender_name}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`inline-block px-4 py-2 rounded-2xl max-w-full break-words ${
                    isOwnMessage 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  </div>

                  {/* Timestamp */}
                  {showTimestamp && (
                    <div className={`text-xs text-gray-500 mt-1 px-3 ${isOwnMessage ? 'text-right' : ''}`}>
                      {formatTime(message.created_at)}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 disabled:opacity-50"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors duration-300 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        
        {/* Character count */}
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send • Real-time chat</span>
          <span>{newMessage.length}/1000</span>
        </div>
      </div>
    </div>
  )
}