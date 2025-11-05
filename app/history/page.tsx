'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '../../src/lib/supabase'

interface HistoryItem {
  id: string
  created_at: string
  servo_number: number
  medication_name: string
  action: 'manual' | 'auto'
  status: 'success' | 'error'
  notes: string | null
}

export default function HistoryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [filter, setFilter] = useState({ action: 'all', status: 'all', servo: 'all' })
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  const fetchHistory = async () => {
    try {
      setFetching(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data, error } = await supabase
        .from('dispense_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setItems((data || []) as HistoryItem[])
    } catch (e) {
      console.error('Fetch history error:', e)
    } finally {
      setFetching(false)
    }
  }

  const filtered = items.filter(i => {
    const actionOk = filter.action === 'all' || i.action === (filter.action as any)
    const statusOk = filter.status === 'all' || i.status === (filter.status as any)
    const servoOk = filter.servo === 'all' || i.servo_number === Number(filter.servo)
    return actionOk && statusOk && servoOk
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Dispense History</h1>
        <a href="/" className="px-4 py-2 bg-blue-500 text-white rounded">Back</a>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <select className="border rounded px-3 py-2" value={filter.action} onChange={e => setFilter({ ...filter, action: e.target.value })}>
          <option value="all">All Actions</option>
          <option value="manual">Manual</option>
          <option value="auto">Auto</option>
        </select>
        <select className="border rounded px-3 py-2" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
        <select className="border rounded px-3 py-2" value={filter.servo} onChange={e => setFilter({ ...filter, servo: e.target.value })}>
          <option value="all">All Servos</option>
          <option value="1">Servo 1</option>
          <option value="2">Servo 2</option>
          <option value="3">Servo 3</option>
        </select>
        <button onClick={fetchHistory} disabled={fetching} className="px-4 py-2 bg-gray-100 rounded border">{fetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>

      <div className="bg-white rounded-lg shadow divide-y">
        {filtered.length === 0 ? (
          <div className="p-6 text-gray-500">No history yet.</div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-800">
                  Servo {item.servo_number} · {item.medication_name}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(item.created_at).toLocaleString()} · {item.action === 'manual' ? 'Manual' : 'Auto'}
                  {item.notes ? ` · ${item.notes}` : ''}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${item.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{item.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}









