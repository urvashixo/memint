import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes - using recommended pattern to avoid deadlocks
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Use setTimeout to avoid deadlocks as recommended by Supabase
      setTimeout(async () => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Handle user profile creation after signup
        if (event === 'SIGNED_UP' && session?.user) {
          try {
            // Check if user profile already exists
            const { data: existingUsers } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)

            // Only create profile if it doesn't exist
            if (!existingUsers || existingUsers.length === 0) {
              await supabase.from('users').insert({
                id: session.user.id,
                email: session.user.email!,
                name: session.user.user_metadata?.name || '',
              })
            }
          } catch (error) {
            console.error('Error creating user profile:', error)
          }
        }
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    // Note: User profile creation is now handled in the onAuthStateChange callback
    // to avoid potential race conditions and deadlocks

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  const signOut = async () => {
    return await supabase.auth.signOut()
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }
}