'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [updating, setUpdating] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Handle the hash fragment from Supabase redirect
    const handleAuthRedirect = async () => {
      try {
        // Check if there's a hash fragment in the URL (from email link)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')

        if (accessToken && type === 'recovery') {
          // Exchange the access token for a session
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          })

          if (error) {
            console.error('Error setting session:', error)
            setMessage('Invalid or expired reset link. Please request a new one.')
            setLoading(false)
            return
          }

          // Clear the hash from URL
          window.history.replaceState({}, '', '/reset-password')
          setMessage('Please enter your new password below.')
        } else {
          // Check if user is already authenticated (session exists)
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) {
            setMessage('No reset link found. Please request a password reset from the login page.')
          }
        }
      } catch (error: any) {
        console.error('Error handling auth redirect:', error)
        setMessage('Error processing reset link. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    handleAuthRedirect()
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password !== confirm) {
      setMessage('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }
    try {
      setUpdating(true)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage('✅ Password updated successfully! Redirecting to login...')
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (e: any) {
      setMessage(e.message || 'Failed to update password')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded shadow w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
          <p className="text-gray-600">Processing reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-6 rounded shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        {message && (
          <div className={`mb-3 text-sm p-3 rounded ${
            message.includes('✅') || message.includes('Please enter')
              ? 'bg-green-50 text-green-700'
              : message.includes('Error') || message.includes('Invalid') || message.includes('No reset')
              ? 'bg-red-50 text-red-700'
              : 'bg-yellow-50 text-yellow-700'
          }`}>
            {message}
          </div>
        )}
        <form onSubmit={handleUpdate} className="space-y-3">
          <input
            type="password"
            placeholder="New password (min 6 characters)"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm password"
            className="w-full border rounded px-3 py-2"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={6}
          />
          <button 
            type="submit" 
            disabled={updating || loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {updating ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}










