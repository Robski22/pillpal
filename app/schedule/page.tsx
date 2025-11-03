'use client'

import { useAuth } from '../../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'

interface ServoSchedule {
  id: string
  servo_number: number
  medication_name: string
  time: string
  is_active: boolean
}

export default function Schedule() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [servoSchedules, setServoSchedules] = useState<ServoSchedule[]>([])
  const [editingServo, setEditingServo] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    medication_name: '',
    time: ''
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchServoSchedules()
    }
  }, [user])

  const fetchServoSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('servo_config')
        .select(`
          *,
          medications(*)
        `)
        .eq('user_id', user?.id)
        .order('servo_number', { ascending: true })

      if (error) throw error

      // Transform data to match our interface
      const schedules = data?.map(item => ({
        id: item.id,
        servo_number: item.servo_number,
        medication_name: item.medications?.name || '',
        time: '08:00', // Default time
        is_active: item.is_active
      })) || []

      setServoSchedules(schedules)
    } catch (error) {
      console.error('Error fetching servo schedules:', error)
    }
  }

  const handleEditServo = (servoNumber: number) => {
    const existingSchedule = servoSchedules.find(s => s.servo_number === servoNumber)
    if (existingSchedule) {
      setFormData({
        medication_name: existingSchedule.medication_name,
        time: existingSchedule.time
      })
    } else {
      setFormData({
        medication_name: '',
        time: '08:00'
      })
    }
    setEditingServo(servoNumber)
  }

  const handleSaveServo = async () => {
    try {
      if (!editingServo) return

      // First, create or update medication
      const { data: medicationData, error: medicationError } = await supabase
        .from('medications')
        .upsert([
          {
            user_id: user?.id,
            name: formData.medication_name,
            dosage: '1 tablet',
            instructions: 'Take as directed',
            color: 'White',
            shape: 'Round'
          }
        ])
        .select()

      if (medicationError) throw medicationError

      // Then, create or update servo config
      const { error: servoError } = await supabase
        .from('servo_config')
        .upsert([
          {
            user_id: user?.id,
            servo_number: editingServo,
            medication_id: medicationData?.[0]?.id,
            is_active: true
          }
        ])

      if (servoError) throw servoError

      setEditingServo(null)
      setFormData({
        medication_name: '',
        time: '08:00'
      })
      fetchServoSchedules()
    } catch (error) {
      console.error('Error saving servo schedule:', error)
    }
  }

  const handleDeleteSchedule = async (servoNumber: number) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      try {
        const schedule = servoSchedules.find(s => s.servo_number === servoNumber)
        if (schedule) {
          // Delete from servo_config
          const { error: servoError } = await supabase
            .from('servo_config')
            .delete()
            .eq('id', schedule.id)

          if (servoError) throw servoError

          fetchServoSchedules()
        }
      } catch (error) {
        console.error('Error deleting schedule:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Servo Scheduling</h1>
          <div className="flex space-x-4">
            <a
              href="/"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map((servoNumber) => {
            const schedule = servoSchedules.find(s => s.servo_number === servoNumber)
            return (
              <div key={servoNumber} className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Servo {servoNumber}</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditServo(servoNumber)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      {schedule ? 'Edit' : 'Set'}
                    </button>
                    {schedule && (
                      <button
                        onClick={() => handleDeleteSchedule(servoNumber)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                
                {schedule ? (
                  <div className="space-y-2">
                    <p className="text-gray-600"><strong>Medicine:</strong> {schedule.medication_name}</p>
                    <p className="text-gray-600"><strong>Time:</strong> {schedule.time}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      schedule.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {schedule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-500">No schedule set for this servo</p>
                )}
              </div>
            )
          })}
        </div>

        {editingServo && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">
              Schedule Servo {editingServo}
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveServo(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    value={formData.medication_name}
                    onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Aspirin, Vitamin D"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-colors font-medium"
                >
                  Save Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setEditingServo(null)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}