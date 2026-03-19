import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, CheckCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { BoltBadge } from './BoltBadge'

interface AuthPageProps {
  onBack: () => void
}

export function AuthPage({ onBack }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showEmailSent, setShowEmailSent] = useState(false)

  const { signIn, signUp } = useAuth()

  // Check for email confirmation on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const type = urlParams.get('type')
    const tokenHash = urlParams.get('token_hash')
    
    if (type === 'signup' && tokenHash) {
      setMessage('Email confirmed successfully! You can now sign in.')
      setIsLogin(true)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (type === 'recovery' && tokenHash) {
      setMessage('Password reset confirmed! Please enter your new password.')
      setIsLogin(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await signIn(email, password)
        if (error) {
          if (error.message.includes('Email not confirmed')) {
            setError('Please check your email and click the confirmation link before signing in.')
          } else if (error.message.includes('Invalid login credentials')) {
            setError('Invalid email or password. Please check your credentials and try again.')
          } else {
            setError(error.message)
          }
        }
      } else {
        const { error } = await signUp(email, password, name)
        if (error) {
          if (error.message.includes('User already registered')) {
            setError('An account with this email already exists. Please sign in instead.')
          } else {
            setError(error.message)
          }
        } else {
          setShowEmailSent(true)
          setEmail('')
          setPassword('')
          setName('')
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await signUp(email, 'temp-password', name || 'User')
      if (error && !error.message.includes('User already registered')) {
        setError(error.message)
      } else {
        setMessage('Confirmation email sent! Please check your inbox.')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (showEmailSent) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] text-white relative overflow-hidden">
        <div className="fixed top-2 right-4 z-50">
          <BoltBadge />
        </div>

        {/* Same background as main auth page */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F0F0F] via-[#1a1a1a] to-[#0F0F0F]"></div>
        
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-[100px] animate-pulse animation-delay-1000"></div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F]/60 via-transparent to-[#0F0F0F]/60"></div>

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 z-20 flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
          Back to Home
        </button>

        {/* Email sent confirmation */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-md text-center">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
              {/* Success icon */}
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-white" />
              </div>

              <h1 className="text-2xl font-bold text-white mb-4">
                Check Your Email
              </h1>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                We've sent a confirmation link to your email address. Please click the link in the email to verify your account and complete your registration.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    <strong>Next steps:</strong>
                  </p>
                  <ul className="text-blue-200 text-sm mt-2 space-y-1 text-left">
                    <li>1. Check your email inbox</li>
                    <li>2. Click the confirmation link</li>
                    <li>3. Return here to sign in</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowEmailSent(false)
                    setIsLogin(true)
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-300"
                >
                  Back to Sign In
                </button>

                <button
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="w-full text-gray-400 hover:text-white transition-colors duration-300 text-sm"
                >
                  Didn't receive the email? Resend confirmation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white relative overflow-hidden">
      <div className="fixed top-2 right-4 z-50">
        <BoltBadge />
      </div>

      {/* Same background as hero section */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F0F0F] via-[#1a1a1a] to-[#0F0F0F]"></div>
      
      {/* Background gradient blurs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-[100px] animate-pulse animation-delay-1000"></div>
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top left protein structure */}
        <div className="absolute top-16 left-8 opacity-25 animate-float-slow">
          <svg width="140" height="140" viewBox="0 0 140 140" className="text-blue-400">
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="35" cy="35" r="10" className="animate-pulse" />
              <circle cx="70" cy="25" r="8" className="animate-pulse animation-delay-500" />
              <circle cx="105" cy="45" r="9" className="animate-pulse animation-delay-1000" />
              <circle cx="25" cy="80" r="7" className="animate-pulse animation-delay-1500" />
              <circle cx="95" cy="95" r="11" className="animate-pulse animation-delay-2000" />
              <circle cx="60" cy="105" r="8" className="animate-pulse animation-delay-2500" />
              <path d="M35 35 L70 25 L105 45 M25 80 L60 105 L95 95 M35 35 L25 80 M70 25 L60 105" className="opacity-60" />
            </g>
          </svg>
        </div>

        {/* Top right protein structure */}
        <div className="absolute top-20 right-12 opacity-22 animate-float-reverse">
          <svg width="120" height="120" viewBox="0 0 120 120" className="text-purple-400">
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="30" cy="30" r="8" className="animate-pulse animation-delay-3000" />
              <circle cx="90" cy="30" r="10" className="animate-pulse animation-delay-3500" />
              <circle cx="60" cy="60" r="9" className="animate-pulse animation-delay-4000" />
              <circle cx="30" cy="90" r="7" className="animate-pulse animation-delay-4500" />
              <circle cx="90" cy="90" r="8" className="animate-pulse animation-delay-5000" />
              <path d="M30 30 L90 30 L60 60 L30 90 L90 90 L60 60 M30 30 L30 90 M90 30 L90 90" className="opacity-50" />
            </g>
          </svg>
        </div>

        {/* Bottom left cell structure */}
        <div className="absolute bottom-24 left-16 opacity-28 animate-float-slow animation-delay-2000">
          <svg width="100" height="100" viewBox="0 0 100 100" className="text-green-400">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-40" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-60" />
            <circle cx="50" cy="50" r="12" fill="currentColor" className="opacity-70 animate-pulse" />
            <circle cx="30" cy="35" r="4" fill="currentColor" className="opacity-50 animate-pulse animation-delay-1000" />
            <circle cx="70" cy="40" r="5" fill="currentColor" className="opacity-50 animate-pulse animation-delay-1500" />
            <circle cx="35" cy="70" r="3" fill="currentColor" className="opacity-50 animate-pulse animation-delay-2000" />
            <circle cx="65" cy="65" r="4" fill="currentColor" className="opacity-50 animate-pulse animation-delay-2500" />
          </svg>
        </div>

        {/* Bottom right cell structure */}
        <div className="absolute bottom-32 right-20 opacity-24 animate-float-reverse animation-delay-3000">
          <svg width="110" height="110" viewBox="0 0 110 110" className="text-pink-400">
            <ellipse cx="55" cy="55" rx="50" ry="35" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-35" />
            <ellipse cx="55" cy="55" rx="32" ry="22" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-50" />
            <circle cx="55" cy="55" r="8" fill="currentColor" className="opacity-60 animate-pulse animation-delay-2500" />
            <circle cx="35" cy="50" r="3" fill="currentColor" className="opacity-40 animate-pulse animation-delay-3000" />
            <circle cx="75" cy="60" r="4" fill="currentColor" className="opacity-40 animate-pulse animation-delay-3500" />
            <circle cx="45" cy="70" r="2" fill="currentColor" className="opacity-40 animate-pulse animation-delay-4000" />
          </svg>
        </div>

        {/* Floating particles */}
        <div className="absolute top-32 left-32 w-3 h-3 bg-blue-400 rounded-full opacity-30 animate-float-particle"></div>
        <div className="absolute top-40 right-40 w-2 h-2 bg-purple-400 rounded-full opacity-35 animate-float-particle animation-delay-2000"></div>
        <div className="absolute bottom-40 left-40 w-2.5 h-2.5 bg-green-400 rounded-full opacity-32 animate-float-particle animation-delay-4000"></div>
        <div className="absolute bottom-48 right-32 w-2 h-2 bg-pink-400 rounded-full opacity-28 animate-float-particle animation-delay-6000"></div>
      </div>

      {/* Fade overlay to protect form readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F]/60 via-transparent to-[#0F0F0F]/60"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F0F]/40 via-transparent to-[#0F0F0F]/40"></div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 z-20 flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300 group"
      >
        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
        Back to Home
      </button>

      {/* Auth form */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Frosted glass card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8 justify-center">
              <img 
                src="/medmint-removebg-preview.png" 
                alt="MedMint" 
                className="w-10 h-10 object-contain"
              />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {isLogin ? 'Welcome Back' : 'Join MedMint'}
              </h1>
            </div>
            <p className="text-center text-gray-400 mb-8">
              {isLogin 
                ? 'Sign in to continue your research journey' 
                : 'Create your account to start researching'
              }
            </p>

            {/* Success message */}
            {message && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{message}</span>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name field (signup only) */}
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                      placeholder="Enter your full name"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300"
                    placeholder="Enter your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {/* Toggle between login/signup */}
            <div className="mt-8 text-center">
              <p className="text-gray-400">
                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError('')
                    setMessage('')
                    setEmail('')
                    setPassword('')
                    setName('')
                  }}
                  className="ml-2 text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>

            {/* Email verification help */}
            {isLogin && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleResendConfirmation}
                  disabled={loading}
                  className="text-sm text-gray-500 hover:text-gray-400 transition-colors duration-300"
                >
                  Need to resend confirmation email?
                </button>
              </div>
            )}

            {/* Email verification info */}
            {!isLogin && (
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>Email Verification Required:</strong> After creating your account, you'll receive a confirmation email. Please click the link in the email to verify your account before signing in.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}