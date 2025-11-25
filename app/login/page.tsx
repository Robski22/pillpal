'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../src/lib/supabase'
import { useRouter } from 'next/navigation'

// Helper function to get the correct redirect URL
function getRedirectUrl(path: string = ''): string | undefined {
  if (typeof window === 'undefined') return undefined
  
  // Use environment variable if set (for production), otherwise use window.location.origin
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
  const redirectUrl = `${baseUrl}${path}`
  
  console.log('🔗 Using redirect URL:', redirectUrl)
  return redirectUrl
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [resetLoading, setResetLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('')

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if email is allowed (whitelist check)
      const emailToCheck = email.trim().toLowerCase()
      const checkResponse = await fetch('/api/check-allowed-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck })
      })
      
      const checkResult = await checkResponse.json()
      
      if (!checkResult.allowed) {
        const message = checkResult.message || 'This email is not authorized to access this application'
        setError(message)
        setAccessDeniedMessage(message)
        setShowAccessDeniedModal(true)
        setLoading(false)
        return
      }

      if (isSignUp) {
        // SIMPLE SIGNUP - No profile creation, just basic signup
        const { data, error } = await supabase.auth.signUp({
          email: emailToCheck,
          password: password,
          options: {
            emailRedirectTo: getRedirectUrl('/'), // Redirect to home page after email confirmation
          }
        })
        
        if (error) {
          console.error('Signup error:', error)
          
          // Check if it's just "email already exists"
          if (error.message?.toLowerCase().includes('already') || 
              error.message?.toLowerCase().includes('registered') ||
              error.message?.toLowerCase().includes('exists')) {
            alert(' This email already has an account!\n\nClick "Already have an account? Sign In" below.')
            setIsSignUp(false)
            setEmail(email)
            setError(null)
            return
          }
          
          // For database/trigger errors - check if user was still created
          if (data?.user) {
            // User was created! Profile might have failed, but that's OK
            if (data.session) {
              // Already signed in
              router.push('/')
              return
            } else {
              // Need email confirmation
              setShowResend(true)
              setResendCooldown(60)
              alert(' Account created! Check your email for confirmation.\n\nIf you don\'t see it, wait 60 seconds and "Resend confirmation email" .')
              return
            }
          }
          
          // Real error - show it
          setError(error.message || 'Signup failed')
          alert(` Signup failed: ${error.message || 'Unknown error'}\n\nPlease try again.`)
          return
        }
        
        // Success! User was created
        if (data.user) {
          if (data.session) {
            // Auto-signed in
            router.push('/')
          } else {
            // Need email confirmation
            setShowResend(true)
            setResendCooldown(60)
            alert(' Account created! Check your email for the confirmation link.\n\nIf you don\'t receive it, wait 60 seconds then "Resend confirmation email."')
          }
        } else {
          setError('Account creation failed')
          alert(' Account was not created. Please try again.')
        }
      } else {
        // Sign in - email already checked above, just sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: emailToCheck,
          password: password,
        })
        
        if (error) {
          // Check if it's because email doesn't exist - still block it if not allowed
          if (error.message?.toLowerCase().includes('invalid') || error.message?.toLowerCase().includes('credentials')) {
            // Don't reveal if email exists or not - just show generic error
            setError('Invalid email or password')
          } else {
            setError(error.message)
          }
          setLoading(false)
          return
        }
        
        // Double-check email is allowed after successful login (security)
        const verifyResponse = await fetch('/api/check-allowed-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToCheck })
        })
        const verifyResult = await verifyResponse.json()
        
        if (!verifyResult.allowed) {
          // Sign out if email is not allowed
          await supabase.auth.signOut()
          const message = verifyResult.message || 'This email is not authorized to access this application'
          setError(message)
          setAccessDeniedMessage(message + '\n\nYou have been signed out.')
          setShowAccessDeniedModal(true)
          setLoading(false)
          return
        }
        
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">
  {isSignUp ? 'PillPal Sign Up' : 'PillPal Login'}
</h1>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        {/* Resend confirmation email (for signup) */}
        {(isSignUp || showResend) && (
          <div className="mt-3">
            {resendCooldown > 0 ? (
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">
                  Wait {resendCooldown} seconds before resending
                </p>
                <button
                  className="text-gray-400 text-sm cursor-not-allowed"
                  disabled
                  type="button"
                >
                  Resend confirmation email ({resendCooldown}s)
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  if (!email) {
                    alert('Please enter your email first')
                    return
                  }
                  if (!password) {
                    alert('Please enter your password first')
                    return
                  }
                  try {
                    setResendLoading(true)
                    // Try resend endpoint first
                    const { error: resendError } = await supabase.auth.resend({
                      type: 'signup',
                      email: email,
                      options: {
                        emailRedirectTo: getRedirectUrl(),
                      }
                    })
                    
                    if (resendError) {
                      // If resend fails, try signUp again with the same password
                      // This will resend the confirmation email
                      const { error: signUpError } = await supabase.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                          emailRedirectTo: getRedirectUrl(),
                        }
                      })
                      
                      if (signUpError) {
                        // Check if it's just saying user already exists (that's OK)
                        if (signUpError.message?.includes('already registered') || 
                            signUpError.message?.includes('already exists') ||
                            signUpError.message?.includes('User already registered')) {
                          // User exists, email should be resent - set cooldown
                          setResendCooldown(60)
                          alert(' Confirmation email resent! Check your inbox.\n\nNote: Supabase limits how often emails can be sent. If you don\'t receive it, wait 60 seconds and try again.')
                        } else {
                          throw signUpError
                        }
                      } else {
                        setResendCooldown(60)
                        alert('  Confirmation email sent! Check your inbox.')
                      }
                    } else {
                      // Resend worked
                      setResendCooldown(60)
                      alert(' Confirmation email resent! Check your inbox.')
                    }
                  } catch (e: any) {
                    if (e.message?.includes('rate limit') || e.message?.includes('too many requests')) {
                      alert(` Too many requests. Please wait 60 seconds before trying again.\n\nSupabase limits how often confirmation emails can be sent.`)
                      setResendCooldown(60)
                    } else {
                      alert(e.message || 'Failed to resend confirmation email. Please wait 60 seconds and try again.')
                      setResendCooldown(60)
                    }
                  } finally {
                    setResendLoading(false)
                  }
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
                disabled={loading || resendLoading || resendCooldown > 0}
                type="button"
              >
                {resendLoading ? 'Sending...' : 'Resend confirmation email'}
              </button>
            )}
          </div>
        )}

        {/* Forgot password */}
        {!isSignUp && (
          <div className="mt-3">
            <button
              onClick={async () => {
                if (!email && !resetEmail) {
                  alert('Enter your email above or in the popup to reset.')
                  return
                }
                try {
                  setResetLoading(true)
                  const targetEmail = email || resetEmail
                  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
                    redirectTo: getRedirectUrl('/reset-password'),
                  })
                  if (error) throw error
                  alert('Password reset email sent. Check your inbox!')
                } catch (e: any) {
                  alert(e.message || 'Failed to send reset email')
                } finally {
                  setResetLoading(false)
                }
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
              disabled={loading || resetLoading}
              type="button"
            >
              {resetLoading ? 'Sending...' : 'Forgot password?'}
            </button>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setShowResend(false)
              setResendCooldown(0)
            }}
            className="text-blue-500 hover:text-blue-700 text-sm"
            disabled={loading}
            type="button"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>

      {/* Custom Access Denied Modal - replaces browser alert */}
      {showAccessDeniedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-700 whitespace-pre-line">{accessDeniedMessage}</p>
              <p className="text-gray-600 text-sm mt-3">Please contact the administrator if you believe this is an error.</p>
            </div>
            <button
              onClick={() => setShowAccessDeniedModal(false)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}