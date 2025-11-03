'use client'

import { useAuth } from '../../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'

interface Medication {
  id: string
  name: string
  time: string
  servo_number: number
}

export default function Medications() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [medications, setMedications] = useState<Medication[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    time: '',
    servo_number: 1
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchMedications()
    }
  }, [user])

  const fetchMedications = async () => {
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
      const meds = data?.map(item => ({
        id: item.id,
        name: item.medications?.name || '',
        time: '08:00', // Default time
        servo_number: item.servo_number
      })) || []

      setMedications(meds)
    } catch (error) {
      console.error('Error fetching medications:', error)
      setMedications([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingMedication) {
        // Update existing medication
        const { error: medicationError } = await supabase
          .from('medications')
          .update({
            name: formData.name
          })
          .eq('id', editingMedication.id)

        if (medicationError) throw medicationError
      } else {
        // Create new medication
        const { data: medicationData, error: medicationError } = await supabase
          .from('medications')
          .insert([
            {
              user_id: user?.id,
              name: formData.name,
              dosage: '1 tablet', // Default dosage
              instructions: 'Take as directed',
              color: 'White',
              shape: 'Round'
            }
          ])
          .select()

        if (medicationError) throw medicationError

        // Assign to servo
        if (medicationData && medicationData[0]) {
          await supabase
            .from('servo_config')
            .upsert([
              {
                user_id: user?.id,
                servo_number: formData.servo_number,
                medication_id: medicationData[0].id,
                is_active: true
              }
            ])
        }
      }

      setFormData({ name: '', time: '', servo_number: 1 })
      setShowForm(false)
      setEditingMedication(null)
      fetchMedications()
    } catch (error) {
      console.error('Error saving medication:', error)
    }
  }

  const handleEdit = (medication: Medication) => {
    setEditingMedication(medication)
    setFormData({
      name: medication.name,
      time: medication.time,
      servo_number: medication.servo_number
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this medication?')) {
      try {
        // First, delete from servo_config
        const { error: servoError } = await supabase
          .from('servo_config')
          .delete()
          .eq('id', id)

        if (servoError) throw servoError

        // Then, delete the medication
        const { error: medicationError } = await supabase
          .from('medications')
          .delete()
          .eq('id', id)

        if (medicationError) throw medicationError

        fetchMedications()
      } catch (error) {
        console.error('Error deleting medication:', error)
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
          <h1 className="text-4xl font-bold text-gray-800">My Medications</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Add Medication
            </button>
            <a
              href="/schedule"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Schedule Medications
            </a>
            <a
              href="/"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6">
              {editingMedication ? 'Edit Medication' : 'Add New Medication'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Aspirin, Vitamin D"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time to Take *
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Servo
                  </label>
                  <select
                    value={formData.servo_number}
                    onChange={(e) => setFormData({ ...formData, servo_number: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>Servo 1</option>
                    <option value={2}>Servo 2</option>
                    <option value={3}>Servo 3</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg transition-colors font-medium"
                >
                  {editingMedication ? 'Update Medication' : 'Add Medication'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingMedication(null)
                    setFormData({ name: '', time: '', servo_number: 1 })
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {medications.map((medication) => (
            <div key={medication.id} className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-800">{medication.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(medication)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(medication.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-blue-600 font-medium"><strong>Assigned to:</strong> Servo {medication.servo_number}</p>
                <p className="text-gray-600"><strong>Time:</strong> {medication.time}</p>
              </div>
            </div>
          ))}
        </div>

        {medications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No medications added yet.</p>
            <p className="text-gray-400">Click "Add Medication" to get started.</p>
          </div>
        )}
      </div>
    </main>
  )
}