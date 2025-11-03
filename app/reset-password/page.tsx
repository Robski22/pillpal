'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    // When redirected from email, Supabase will set a session automatically
  }, [])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password !== confirm) {
      setMessage('Passwords do not match')
      return
    }
    try {
      setUpdating(true)
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage('Password updated! You can now log in.')
    } catch (e: any) {
      setMessage(e.message || 'Failed to update password')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-6 rounded shadow w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        {message && <div className="mb-3 text-sm text-gray-700">{message}</div>}
        <form onSubmit={handleUpdate} className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm password"
            className="w-full border rounded px-3 py-2"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
          <button type="submit" disabled={updating} className="w-full bg-blue-600 text-white rounded px-4 py-2">
            {updating ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}








