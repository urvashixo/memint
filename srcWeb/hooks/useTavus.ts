import { useState, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

interface TavusConfig {
  personaId: string
  apiKey: string
  baseUrl: string
}

interface LabContext {
  id: string
  name: string
  recentMessages: Array<{
    message: string
    sender_name: string
    created_at: string
  }>
}

interface UserContext {
  user: {
    id: string
    email: string
    name: string
  }
  labs: LabContext[]
}

const TAVUS_CONFIG: TavusConfig = {
  personaId: 'p223c8cc9b8d',
  apiKey: '',
  baseUrl: 'https://qilolquvzxnfjsfpsetv.supabase.co/functions/v1'
}

export function useTavus() {
  const { user } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [userContext, setUserContext] = useState<UserContext | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (user) {
      fetchUserContext()
    }
  }, [user])

  const fetchUserContext = async () => {
    if (!user) return

    try {
      // Get user's labs
      const { data: labMemberships, error: labError } = await supabase
        .from('lab_members')
        .select(`
          lab_id,
          labs (
            id,
            name
          )
        `)
        .eq('user_id', user.id)

      if (labError) throw labError

      const labs = labMemberships?.map(membership => membership.labs).filter(Boolean) || []

      // Get recent messages from this week for each lab
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      const labsWithMessages: LabContext[] = []

      for (const lab of labs) {
        if (!lab) continue

        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select(`
            message,
            created_at,
            users!chat_messages_sender_id_fkey (
              name
            )
          `)
          .eq('lab_id', lab.id)
          .gte('created_at', oneWeekAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(50)

        if (messagesError) {
          console.error('Error fetching messages for lab:', lab.id, messagesError)
          continue
        }

        const recentMessages = messages?.map(msg => ({
          message: msg.message,
          sender_name: msg.users?.name || 'Unknown User',
          created_at: msg.created_at
        })) || []

        labsWithMessages.push({
          id: lab.id,
          name: lab.name,
          recentMessages
        })
      }

      setUserContext({
        user: {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || user.email || 'Unknown User'
        },
        labs: labsWithMessages
      })
    } catch (error) {
      console.error('Error fetching user context:', error)
    }
  }

  const createConversation = async () => {
    if (!userContext) {
      setError('User context not loaded')
      return null
    }

    try {
      setIsLoading(true)
      setError(null)

      // Create context string for the custom greeting
      const labSummary = userContext.labs.length > 0 
        ? `You're currently working on ${userContext.labs.length} lab${userContext.labs.length !== 1 ? 's' : ''}: ${userContext.labs.map(l => l.name).join(', ')}.`
        : 'You don\'t have any active labs yet.'

      const totalMessages = userContext.labs.reduce((total, lab) => total + lab.recentMessages.length, 0)
      const messageSummary = totalMessages > 0 
        ? ` I can see ${totalMessages} recent message${totalMessages !== 1 ? 's' : ''} from your labs this week.`
        : ' No recent messages this week.'

      // Direct API call to Tavus
      const response = await fetch('https://qilolquvzxnfjsfpsetv.supabase.co/functions/v1/tavus-create', {
        method: 'POST',
        headers: {
          'x-api-key': TAVUS_CONFIG.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          persona_id: TAVUS_CONFIG.personaId,
          conversation_name: `Research Session - ${userContext.user.name}`,
          custom_greeting: `Hello ${userContext.user.name}! I'm Neo, your AI research assistant for reMedi. ${labSummary}${messageSummary} How can I help you with your research today?`,
          properties: {
            max_call_duration: 3600,
            participant_left_timeout: 300,
            participant_absent_timeout: 60,
            enable_recording: false,
            enable_transcription: true,
            language: "english"
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Tavus API Error:', errorData)
        throw new Error(`Failed to create conversation: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      console.log('Conversation created:', data)
      setConversationId(data.conversation_id)
      return data.conversation_id
    } catch (err: any) {
      console.error('Error creating conversation:', err)
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const startCall = async () => {
    try {
      setIsLoading(true)
      setError(null)

      let convId = conversationId
      if (!convId) {
        convId = await createConversation()
        if (!convId) return
      }

      // Get user media for screen sharing capability
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      localStreamRef.current = stream

      // Create peer connection with better configuration
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10
      })

      peerConnectionRef.current = peerConnection

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream)
      })

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0]
        }
      }

      // Start the conversation with direct API call
      const startResponse = await fetch('https://qilolquvzxnfjsfpsetv.supabase.co/functions/v1/tavus-start', {
        method: 'POST',
        headers: {
          'x-api-key': TAVUS_CONFIG.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
      conversation_id: convId  // ✅ this is required
  })
      })

      if (!startResponse.ok) {
        const errorData = await startResponse.text()
        console.error('Start conversation error:', errorData)
        throw new Error(`Failed to start conversation: ${startResponse.status} ${errorData}`)
      }

      const startData = await startResponse.json()
      console.log('Conversation started:', startData)
      
      // Handle WebRTC signaling here
      // This would typically involve exchanging offers/answers with Tavus
      // For now, we'll simulate the connection
      
      setIsConnected(true)
    } catch (err: any) {
      console.error('Error starting call:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const endCall = async () => {
    try {
      if (conversationId) {
        await fetch(`${TAVUS_CONFIG.baseUrl}/v2/conversations/${conversationId}/end`, {
          method: 'POST',
          headers: {
            'x-api-key': TAVUS_CONFIG.apiKey,
          }
        })
      }

      // Clean up local resources
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        localStreamRef.current = null
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }

      setIsConnected(false)
      setConversationId(null)
    } catch (err: any) {
      console.error('Error ending call:', err)
      setError(err.message)
    }
  }

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      })

      if (peerConnectionRef.current && localStreamRef.current) {
        // Replace video track with screen share
        const videoTrack = screenStream.getVideoTracks()[0]
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )

        if (sender) {
          await sender.replaceTrack(videoTrack)
        }

        // Handle screen share end
        videoTrack.onended = () => {
          // Switch back to camera
          if (localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0]
            if (sender && cameraTrack) {
              sender.replaceTrack(cameraTrack)
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error starting screen share:', err)
      setError(err.message)
    }
  }

  return {
    isConnected,
    isLoading,
    error,
    conversationId,
    userContext,
    videoRef,
    startCall,
    endCall,
    startScreenShare,
    createConversation
  }
}