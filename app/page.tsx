'use client'

import { useAuth } from '../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../src/lib/supabase'
import { connectToPi, disconnectFromPi, isConnectedToPi, dispenseToPi, sendSmsViaPi } from '../src/lib/pi-websocket'
import { getNearestSaturday, getNearestSunday, formatDate, getPhilippineTime } from '../src/lib/date-utils'

interface Medication {
  id: string
  medication_name: string
  time_frame: 'morning' | 'afternoon' | 'evening'
  // Note: time is now at time frame level, not per medication
}

interface DayData {
  dayOfWeek: number // 0 = Sunday, 6 = Saturday
  name: string // "Saturday" or "Sunday"
  medications: {
    morning: Medication[]
    afternoon: Medication[]
    evening: Medication[]
  }
  timeFrameTimes: {
    morning: string | null // Time for morning frame (e.g., "08:00")
    afternoon: string | null // Time for afternoon frame
    evening: string | null // Time for evening frame
  }
  status: string
  servoNumber: number // 1 for Saturday, 2 for Sunday (for Pi server mapping)
  lastDispensedTime?: string // Track last manual dispense time (HH:MM) for progressive scheduling
  dispensedTimeFrames?: string[] // Track which time frames have been dispensed (e.g., ['morning', 'afternoon'])
}

// Time frame definitions
const TIME_FRAMES = {
  morning: { label: 'Morning', start: '05:00', end: '12:00', default: '08:00' },
  afternoon: { label: 'Afternoon', start: '12:01', end: '19:00', default: '14:00' },
  evening: { label: 'Evening', start: '19:01', end: '03:00', default: '21:00' }
}

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [piConnected, setPiConnected] = useState(false)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(true)
  // Saturday (dayOfWeek = 6) and Sunday (dayOfWeek = 0)
  // Both use servo1 (spins 30 degrees each time)
  const [days, setDays] = useState<DayData[]>([
    { 
      dayOfWeek: 6, 
      name: 'Saturday', 
      medications: { morning: [], afternoon: [], evening: [] },
      timeFrameTimes: { morning: null, afternoon: null, evening: null },
      status: 'ready', 
      servoNumber: 1,
      dispensedTimeFrames: []
    },
    { 
      dayOfWeek: 0, 
      name: 'Sunday', 
      medications: { morning: [], afternoon: [], evening: [] },
      timeFrameTimes: { morning: null, afternoon: null, evening: null },
      status: 'ready', 
      servoNumber: 1,
      dispensedTimeFrames: []
    }
  ])
  const [editingDay, setEditingDay] = useState<number | null>(null) // dayOfWeek (6 or 0)
  const [editingTimeFrame, setEditingTimeFrame] = useState<'morning' | 'afternoon' | 'evening' | null>(null)
  const [addingMedication, setAddingMedication] = useState<{ dayOfWeek: number; timeFrame: string } | null>(null)
  const [editingMedication, setEditingMedication] = useState<{ id: string; name: string; dayOfWeek: number; timeFrame: string } | null>(null)
  const [editingTimeFrameTime, setEditingTimeFrameTime] = useState<{ dayOfWeek: number; timeFrame: string } | null>(null)
  const [newMedication, setNewMedication] = useState({
    name: ''
  })
  const [timeFrameTime, setTimeFrameTime] = useState('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; onCancel: () => void } | null>(null)
  // Caregiver access disabled temporarily to fix signup

  // Helper function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Helper function to show confirm dialog
  const showConfirm = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmDialog({
        message,
        onConfirm: () => {
          setConfirmDialog(null)
          resolve(true)
        },
        onCancel: () => {
          setConfirmDialog(null)
          resolve(false)
        }
      })
    })
  }

  // Check for password reset hash fragment and redirect to reset-password page
  useEffect(() => {
    // Check if there's a hash fragment in the URL (from password reset email)
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')
      
      if (type === 'recovery') {
        // This is a password reset link - redirect to reset-password page with the hash
        const hash = window.location.hash
        router.replace(`/reset-password${hash}`)
        return
      }
    }
  }, [router])

  // Connect to Raspberry Pi on page load
  useEffect(() => {
    connectToPi()
      .then(() => {
        console.log(' Connected to Pi!')
        setPiConnected(true)
      })
      .catch((error: any) => {
        console.error(' Could not connect to Pi:', error)
        setPiConnected(false)
      })

    return () => {
      disconnectFromPi()
    }
  }, [])

  // Track already executed schedules to prevent duplicates
  const executedSchedulesRef = useRef<Set<string>>(new Set())

  // Automatic scheduling system - check every second
  useEffect(() => {
    let checkCounter = 0
    
    const checkSchedules = async () => {
      // Use Philippine time
      const now = getPhilippineTime()
      const currentDayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
      
      // Get local time in HH:MM format (e.g., "19:25")
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${hours}:${minutes}`
      
      // Get local date in YYYY-MM-DD format
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const currentDate = `${year}-${month}-${day}`

      // Log only every 60 seconds to reduce console spam
      if (checkCounter % 60 === 0) {
        console.log(`🕐 Checking schedules at ${currentTime} on ${currentDate} (Day: ${currentDayOfWeek === 6 ? 'Saturday' : currentDayOfWeek === 0 ? 'Sunday' : 'Weekday'})`)
      }
      checkCounter++

      // Check for active schedules - only on Saturday (6) or Sunday (0)
      if (currentDayOfWeek !== 6 && currentDayOfWeek !== 0) {
        return // Not Saturday or Sunday, skip checking
      }

      // Find the day data for today (Saturday or Sunday)
      const todayDay = days.find(d => d.dayOfWeek === currentDayOfWeek)
      if (!todayDay) return
      
      // Get all medications for today (from all time frames)
      const allMedications = [
        ...todayDay.medications.morning,
        ...todayDay.medications.afternoon,
        ...todayDay.medications.evening
      ]
      
      if (allMedications.length === 0) return // No medications configured

      // Progressive scheduling: Skip medications if already dispensed manually
      // Get last dispensed time for this day
      const lastDispensedTime = todayDay.lastDispensedTime
      
      // Find active time frames - group medications by time frame and check if any medication in that frame matches current time
      // Each time frame is a BUNDLE - all medications in that frame dispense together
      const activeTimeFrames = new Set<string>()
      
      // Group medications by time frame
      const medicationsByFrame: { [key: string]: Medication[] } = {
        morning: todayDay.medications.morning,
        afternoon: todayDay.medications.afternoon,
        evening: todayDay.medications.evening
      }
      
      // Check each time frame
      for (const [timeFrame, frameMeds] of Object.entries(medicationsByFrame)) {
        if (frameMeds.length === 0) continue // No medications in this frame
        
        // Progressive logic: Skip if this time frame was already dispensed
        if (lastDispensedTime) {
          const [lastHour, lastMin] = lastDispensedTime.split(':').map(Number)
          const lastMinutes = lastHour * 60 + lastMin
          
          // Determine which time frame the last dispense was in
          let lastFrame = ''
          if (lastMinutes >= 300 && lastMinutes <= 720) lastFrame = 'morning'
          else if (lastMinutes >= 721 && lastMinutes <= 1140) lastFrame = 'afternoon'
          else if (lastMinutes >= 1141 || lastMinutes <= 180) lastFrame = 'evening'
          
          // Skip if this time frame is earlier than last dispensed
          const frameOrder = { morning: 1, afternoon: 2, evening: 3 }
          if (frameOrder[timeFrame as keyof typeof frameOrder] < frameOrder[lastFrame as keyof typeof frameOrder]) {
            continue // Skip - this time frame was already done
          }
        }
        
        // Check if the time frame's scheduled time matches current time
        const frameTime = todayDay.timeFrameTimes[timeFrame as keyof typeof todayDay.timeFrameTimes]
        if (!frameTime) continue // No time set for this frame
        
        const frameTimeHHMM = frameTime.slice(0, 5)
        const isTimeMatch = frameTimeHHMM === currentTime
        
        if (!isTimeMatch) continue
        
        // Check if current time is within this time frame
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const currentTimeMinutes = currentHour * 60 + currentMinute
        
        let isInTimeFrame = false
        if (timeFrame === 'morning') {
          isInTimeFrame = currentTimeMinutes >= 300 && currentTimeMinutes <= 720
        } else if (timeFrame === 'afternoon') {
          isInTimeFrame = currentTimeMinutes >= 721 && currentTimeMinutes <= 1140
        } else if (timeFrame === 'evening') {
          isInTimeFrame = currentTimeMinutes >= 1141 || currentTimeMinutes <= 180
        }
        
        // Only dispense at the TOP of the minute (seconds 0-2)
        const currentSeconds = now.getSeconds()
        const isTopOfMinute = currentSeconds < 3
        
        if (isInTimeFrame && isTopOfMinute) {
          activeTimeFrames.add(timeFrame)
        }
      }

      // Dispense ALL medications in each active time frame (bundled together)
      for (const timeFrame of activeTimeFrames) {
        const frameKey = `${timeFrame}-${currentDate}-${currentTime}`
        
        // Skip if already executed this minute
        if (executedSchedulesRef.current.has(frameKey)) {
          continue
        }
        
        // Mark as executed
        executedSchedulesRef.current.add(frameKey)
        
        // Get ALL medications in this time frame (bundle)
        const frameMedications = medicationsByFrame[timeFrame]
        const medicationNames = frameMedications.map(m => m.medication_name).join(', ')
        
        console.log(`🕐 Time to dispense ${timeFrame} bundle on ${todayDay.name}! Medications: ${medicationNames}`)
        
        // Update UI to show dispensing
        setDays(prevDays => 
          prevDays.map(d => 
            d.dayOfWeek === currentDayOfWeek 
              ? { ...d, status: 'dispensing', lastDispensedTime: currentTime }
              : d
          )
        )
        
        try {
          if (piConnected) {
            // Dispense ALL medications in this time frame bundle
            // Servo spins once for the entire bundle
            const response = await dispenseToPi('servo1', medicationNames)
            console.log(' Auto-dispense bundle response:', response)

            // Log auto dispense success for each medication in bundle
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                // Log each medication separately for history
                for (const med of frameMedications) {
                  await supabase.from('dispense_history').insert({
                    user_id: session.user.id,
                    servo_number: todayDay.servoNumber,
                    medication_name: med.medication_name,
                    action: 'auto',
                    status: 'success',
                    notes: `Scheduled auto-dispense bundle on ${todayDay.name} (${timeFrame}) - ${medicationNames}`
                  })
                }
              }
            } catch (logErr) {
              console.error('Log auto-dispense error:', logErr)
            }

            // Send SMS notification for auto-dispense via Pi (SIMCOM module) - Multiple recipients
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user && piConnected) {
                // Get user's phone number and emergency contact from profiles table
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('phone_number, emergency_contact')
                  .eq('id', session.user.id)
                  .single()

                // Collect all phone numbers to send SMS to
                const phoneNumbers: string[] = []
                
                // Add main phone number
                if (profileData?.phone_number) {
                  phoneNumbers.push(profileData.phone_number)
                }
                
                // Extract phone number from emergency contact
                if (profileData?.emergency_contact) {
                  const emergencyContact = profileData.emergency_contact.trim()
                  const phoneMatch = emergencyContact.match(/(\+?63|0)?9\d{9}/)
                  if (phoneMatch) {
                    let emergencyPhone = phoneMatch[0]
                    if (!emergencyPhone.startsWith('0') && !emergencyPhone.startsWith('+63')) {
                      emergencyPhone = '0' + emergencyPhone
                    }
                    phoneNumbers.push(emergencyPhone)
                  }
                }

                if (phoneNumbers.length > 0) {
                                    const smsMessage = `${medicationNames}`
                  
                  // Send SMS via Pi WebSocket (SIMCOM module) to all recipients
                  const smsResult = await sendSmsViaPi(phoneNumbers, smsMessage)
                  
                  if (smsResult.success) {
                    console.log(` SMS notification sent via SIMCOM (auto-dispense) to ${phoneNumbers.length} recipient(s):`, smsResult)
                  } else {
                    console.warn(' SMS notification failed (auto-dispense):', smsResult)
                  }
                } else {
                  console.log('ℹ️ No phone numbers found in profile, skipping SMS notification')
                }
              } else if (!piConnected) {
                console.log('ℹ️ Pi not connected, skipping SMS notification')
              }
            } catch (smsErr) {
              console.error('Error sending SMS notification (auto-dispense):', smsErr)
              // Don't block the dispense if SMS fails
            }
          } else {
            console.log(' Pi not connected - would dispense bundle:', medicationNames)
            // Log attempted auto dispense when Pi offline
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                for (const med of frameMedications) {
                  await supabase.from('dispense_history').insert({
                    user_id: session.user.id,
                    servo_number: todayDay.servoNumber,
                    medication_name: med.medication_name,
                    action: 'auto',
                    status: 'error',
                    notes: 'Pi offline during auto-dispense bundle'
                  })
                }
              }
            } catch (logErr) {
              console.error('Log auto-dispense offline error:', logErr)
            }
          }
        } catch (error) {
          console.error(' Auto-dispense bundle error:', error)
          // Log auto dispense error
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              for (const med of frameMedications) {
                await supabase.from('dispense_history').insert({
                  user_id: session.user.id,
                  servo_number: todayDay.servoNumber,
                  medication_name: med.medication_name,
                  action: 'auto',
                  status: 'error',
                  notes: error instanceof Error ? error.message : 'Auto-dispense bundle error'
                })
              }
            }
          } catch (logErr) {
            console.error('Log auto-dispense error (insert) failed:', logErr)
          }
        }

        // Reset status after 3 seconds
        setTimeout(() => {
          setDays(prevDays => 
            prevDays.map(d => 
              d.dayOfWeek === currentDayOfWeek 
                ? { ...d, status: 'ready' }
                : d
            )
          )
        }, 3000)
        
        // Clear the executed flag after the minute passes (prevent memory leak)
        setTimeout(() => {
          executedSchedulesRef.current.delete(frameKey)
        }, 120000) // 2 minutes
      }
    }

    // Check immediately
    checkSchedules()
    
    // Check every second for exact timing (dispenses at 19:25:00, not 19:25:30)
    const interval = setInterval(checkSchedules, 1000) // 1 second

    return () => clearInterval(interval)
  }, [days, piConnected])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    
    let isMounted = true
    
    // Always resolve owner first, then fetch data
    const initializeData = async () => {
      console.log('🔄 Initializing data for user:', user.id)
      
      // Resolve owner and get the resolved values directly (don't rely on state)
      const resolved = await resolveOwner()
      
      if (!isMounted) return
      
      // Use resolved values directly instead of state
      const resolvedOwnerUserId = resolved?.ownerUserId || ownerUserId || user.id
      const resolvedIsOwner = resolved?.isOwner ?? isOwner ?? true
      
      console.log('📊 Owner resolved:', {
        ownerUserId: resolvedOwnerUserId,
        isOwner: resolvedIsOwner,
        resolvedFromFunction: resolved
      })
      
      // Fetch data with resolved values
      await fetchDayDataWithUserId(resolvedOwnerUserId, resolvedIsOwner)
    }
    
    initializeData()
    
    // Periodic check for caregivers (only if already determined as caregiver)
    const checkInterval = setInterval(async () => {
      if (!user || !isMounted) return
      
      const session = await refreshSessionIfNeeded()
      if (!session) return
      
      // Only check if we're already a caregiver (to see if relationship was removed)
      if (!isOwner && ownerUserId && ownerUserId !== session.user.id) {
        const { data: memberData } = await supabase
          .from('account_members')
          .select('owner_user_id')
          .eq('member_user_id', session.user.id)
          .eq('status', 'accepted')
          .maybeSingle()
        
        // If relationship no longer exists, refresh to reset to owner mode
        if (!memberData && isMounted) {
          console.log(' Caregiver relationship removed, refreshing...')
          await resolveOwner()
          if (isMounted) {
            await fetchDayData()
          }
        }
      }
    }, 5000) // Check every 5 seconds
    
    return () => {
      isMounted = false
      clearInterval(checkInterval)
    }
  }, [user]) // Only depend on user, not ownerUserId or isOwner

  // Helper function to refresh session and handle JWT expiration
  const refreshSessionIfNeeded = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        // Try to refresh the session if it's expired
        if (sessionError.message?.includes('JWT') || sessionError.message?.includes('expired')) {
          console.log('🔄 JWT expired, attempting to refresh session...')
          // refreshSession requires the current session object
          if (session) {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession(session)
            
            if (refreshError || !refreshedSession) {
              console.error(' Failed to refresh session:', refreshError)
              showNotification('Your session has expired. Please log in again.', 'error')
              router.push('/login')
              return null
            }
            
            return refreshedSession
          } else {
            // No session to refresh, redirect to login
            showNotification('Your session has expired. Please log in again.', 'error')
            router.push('/login')
            return null
          }
        } else {
          throw sessionError
        }
      }
      
      if (!session?.user) {
        console.error(' No user session')
        showNotification('Not logged in. Please log in again.', 'error')
        router.push('/login')
        return null
      }
      
      // Check if session is expired by checking the JWT exp claim
      if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000)
        const now = new Date()
        // If expires within next 5 minutes, refresh proactively
        if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
          console.log('🔄 Session expiring soon, refreshing...')
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession(session)
          if (!refreshError && refreshedSession) {
            return refreshedSession
          }
        }
      }
      
      return session
    } catch (error: any) {
      console.error(' Session error:', error)
      // If error message contains JWT or expired, try to refresh
      if (error?.message?.includes('JWT') || error?.message?.includes('expired')) {
        try {
          // Try to get session first
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (currentSession) {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession(currentSession)
            if (refreshError || !refreshedSession) {
              showNotification('Your session has expired. Please log in again.', 'error')
              router.push('/login')
              return null
            }
            return refreshedSession
          } else {
            showNotification('Your session has expired. Please log in again.', 'error')
            router.push('/login')
            return null
          }
        } catch (refreshErr) {
          showNotification('Your session has expired. Please log in again.', 'error')
          router.push('/login')
          return null
        }
      }
      throw error
    }
  }

  const resolveOwner = async (): Promise<{ ownerUserId: string; isOwner: boolean } | null> => {
    try {
      // Refresh session first to avoid JWT expiration
      const session = await refreshSessionIfNeeded()
      if (!session) {
        // Already handled redirect to login
        return null
      }
      
      const currentUserId = session.user.id
      if (!currentUserId) return null

      // Check if user is owner or caregiver
      // Use maybeSingle() to handle cases where user might have pending invitations
      const { data: memberData, error: memberError } = await supabase
        .from('account_members')
        .select('owner_user_id, status')
        .eq('member_user_id', currentUserId)
        .maybeSingle()

      // Handle JWT expiration in account_members query
      if (memberError) {
        if (memberError.message?.includes('JWT') || memberError.message?.includes('expired')) {
          console.log('🔄 JWT expired in resolveOwner, refreshing...')
          const refreshedSession = await refreshSessionIfNeeded()
          if (!refreshedSession) return null
          
          // Retry the query
          const retryResult = await supabase
            .from('account_members')
            .select('owner_user_id, status')
            .eq('member_user_id', currentUserId)
            .maybeSingle()
          
          if (retryResult.error && retryResult.error.code !== 'PGRST116') {
            // PGRST116 means no rows found, which is fine (user is owner, not caregiver)
            console.error('Error querying account_members after refresh:', retryResult.error)
            // Fall through to assume owner
          } else if (retryResult.data && retryResult.data.status === 'accepted') {
            // User is an accepted caregiver
            console.log(' User is an accepted caregiver, owner:', retryResult.data.owner_user_id)
            const result = {
              ownerUserId: retryResult.data.owner_user_id,
              isOwner: false
            }
            setOwnerUserId(result.ownerUserId)
            setIsOwner(result.isOwner)
            return result
          } else if (retryResult.data && retryResult.data.status !== 'accepted') {
            // User has a pending/rejected relationship - treat as owner
            console.log(' User has pending caregiver invitation, but is owner for now:', currentUserId)
            const result = {
              ownerUserId: currentUserId,
              isOwner: true
            }
            setOwnerUserId(result.ownerUserId)
            setIsOwner(result.isOwner)
            return result
          }
        } else if (memberError.code === 'PGRST116') {
          // No rows found - user is an owner (not a caregiver)
          const result = {
            ownerUserId: currentUserId,
            isOwner: true
          }
          setOwnerUserId(result.ownerUserId)
          setIsOwner(result.isOwner)
          return result
        } else {
          console.error('Error querying account_members:', memberError)
          // Fall through to assume owner
        }
      } else if (memberData && memberData.owner_user_id) {
        // User has a relationship - check if it's accepted
        if (memberData.status === 'accepted') {
          // Relationship exists and is accepted - user is an active caregiver
          console.log(' User is an accepted caregiver, owner:', memberData.owner_user_id, 'status:', memberData.status)
          const result = {
            ownerUserId: memberData.owner_user_id,
            isOwner: false
          }
          setOwnerUserId(result.ownerUserId)
          setIsOwner(result.isOwner)
          return result
        } else {
          // Relationship exists but is pending or rejected - user is still considered owner until accepted
          console.log(' User has pending/rejected caregiver invitation (status:', memberData.status, '), but is owner for now:', currentUserId)
          const result = {
            ownerUserId: currentUserId,
            isOwner: true
          }
          setOwnerUserId(result.ownerUserId)
          setIsOwner(result.isOwner)
          return result
        }
      }

      // Default: user is an owner
      console.log(' User is an owner:', currentUserId)
      const result = {
        ownerUserId: currentUserId,
        isOwner: true
      }
      setOwnerUserId(result.ownerUserId)
      setIsOwner(result.isOwner)
      return result
    } catch (e: any) {
      console.error('resolveOwner error:', e)
      // On error, assume user is owner
      const session = await refreshSessionIfNeeded()
      if (session?.user) {
        const result = {
          ownerUserId: session.user.id,
          isOwner: true
        }
        setOwnerUserId(result.ownerUserId)
        setIsOwner(result.isOwner)
        return result
      } else {
        setOwnerUserId(null)
        setIsOwner(false)
        return null
      }
    }
  }

  // Caregiver management moved to Profile page

  // Helper function to fetch day data with explicit user_id
  const fetchDayDataWithUserId = async (targetUserId: string, targetIsOwner: boolean) => {
    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return
      
      console.log('📊 Fetching day data with user_id:', targetUserId, '(isOwner:', targetIsOwner, ')')
      
      // Fetch day_config for Saturday (6) and Sunday (0) (including time frame times)
      let { data: configs, error } = await supabase
        .from('day_config')
        .select('id, user_id, day_of_week, medication_name, is_active, morning_time, afternoon_time, evening_time, created_at, updated_at')
        .eq('user_id', targetUserId)
        .in('day_of_week', [6, 0]) // Saturday and Sunday only

      if (error) {
        console.error('❌ Supabase error fetching day_config:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Handle JWT expiration in database query
        if (error.message?.includes('JWT') || error.message?.includes('expired') || error.code === 'PGRST301') {
          console.log('🔄 JWT expired during query, refreshing session...')
          const refreshedSession = await refreshSessionIfNeeded()
          if (!refreshedSession) return // Already handled redirect
          
          // Retry the query after refresh
          const retryResult = await supabase
            .from('day_config')
            .select('id, user_id, day_of_week, medication_name, is_active, morning_time, afternoon_time, evening_time, created_at, updated_at')
            .eq('user_id', targetUserId)
            .in('day_of_week', [6, 0])
          
          if (retryResult.error) {
            if (retryResult.error.message?.includes('JWT') || retryResult.error.message?.includes('expired')) {
              showNotification('Your session has expired. Please log in again.', 'error')
              router.push('/login')
              return
            }
            showNotification(`Database error: ${retryResult.error.message || 'Failed to fetch data'}. Please try refreshing the page.`, 'error')
            return
          }
          
          configs = retryResult.data
          error = null
        } else {
          showNotification(`Database error: ${error.message || 'Failed to fetch data'}. Check console for details.`, 'error')
          return
        }
      }

      console.log('✅ Found day configs:', configs?.length || 0)

      // Always show Saturday and Sunday, even if not configured yet
      const dayData: DayData[] = []
      
      // Initialize Saturday (6) and Sunday (0)
      for (const dayOfWeek of [6, 0]) {
        const dayName = dayOfWeek === 6 ? 'Saturday' : 'Sunday'
        const config = configs?.find(c => c.day_of_week === dayOfWeek)
        
        if (config && config.is_active) {
          // Fetch medications for this day from time_frame_medications
          const { data: medications, error: medsError } = await supabase
            .from('time_frame_medications')
            .select('*')
            .eq('day_config_id', config.id)
            .order('time')

          if (medsError) {
            console.error(`❌ Error fetching medications for ${dayName}:`, medsError)
          }

          // Group medications by time frame
          const morningMeds: Medication[] = []
          const afternoonMeds: Medication[] = []
          const eveningMeds: Medication[] = []

          medications?.forEach((med: any) => {
            const medication: Medication = {
              id: med.id,
              medication_name: med.medication_name,
              time_frame: med.time_frame
            }
            
            if (med.time_frame === 'morning') {
              morningMeds.push(medication)
            } else if (med.time_frame === 'afternoon') {
              afternoonMeds.push(medication)
            } else if (med.time_frame === 'evening') {
              eveningMeds.push(medication)
            }
          })

          // Get time frame times from day_config
          const timeFrameTimes = {
            morning: config.morning_time ? config.morning_time.slice(0, 5) : null,
            afternoon: config.afternoon_time ? config.afternoon_time.slice(0, 5) : null,
            evening: config.evening_time ? config.evening_time.slice(0, 5) : null
          }

          dayData.push({
            dayOfWeek: config.day_of_week,
            name: dayName,
            medications: {
              morning: morningMeds.sort((a, b) => a.medication_name.localeCompare(b.medication_name)),
              afternoon: afternoonMeds.sort((a, b) => a.medication_name.localeCompare(b.medication_name)),
              evening: eveningMeds.sort((a, b) => a.medication_name.localeCompare(b.medication_name))
            },
            timeFrameTimes: timeFrameTimes,
            status: 'ready',
            servoNumber: 1, // Both use servo1
            dispensedTimeFrames: [] // Reset on fetch - will be tracked in state
          })
        } else {
          // Day not configured yet - show as empty
          dayData.push({
            dayOfWeek: dayOfWeek,
            name: dayName,
            medications: {
              morning: [],
              afternoon: [],
              evening: []
            },
            timeFrameTimes: {
              morning: null,
              afternoon: null,
              evening: null
            },
            status: 'ready',
            servoNumber: 1,
            dispensedTimeFrames: []
          })
        }
      }

      console.log('✅ Day data loaded:', dayData.map(d => ({
        dayOfWeek: d.dayOfWeek,
        name: d.name,
        morningCount: d.medications.morning.length,
        afternoonCount: d.medications.afternoon.length,
        eveningCount: d.medications.evening.length
      })))
      
      setDays(dayData)
    } catch (error: any) {
      console.error('❌ Error fetching day data:', error)
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      showNotification(`Error loading data: ${error?.message || 'Unknown error'}. Check browser console for details.`, 'error')
    }
  }

  // Main fetchDayData function - resolves owner and fetches data
  const fetchDayData = async () => {
    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return
      
      // Resolve owner to get correct user_id
      const resolved = await resolveOwner()
      if (!resolved) {
        console.error(' Could not resolve owner')
        return
      }
      
      // Use resolved values directly
      await fetchDayDataWithUserId(resolved.ownerUserId, resolved.isOwner)
    } catch (error: any) {
      console.error(' Error in fetchDayData:', error)
    }
  }

  const handleDispense = async (dayOfWeek: number, timeFrame?: 'morning' | 'afternoon' | 'evening') => {
    // Check Pi connection first
    if (!piConnected) {
      showNotification('Not connected to Raspberry Pi! Make sure the server is running.', 'warning')
      return
    }

    // Declare variables outside try block so they're accessible in catch block
    let targetTimeFrame: 'morning' | 'afternoon' | 'evening' | null = timeFrame || null
    let frameMedications: Medication[] = []

    try {
      const day = days.find(d => d.dayOfWeek === dayOfWeek)
      if (!day) return
      
      const currentTime = new Date(getPhilippineTime())
      const currentHour = currentTime.getHours()
      const currentMinute = currentTime.getMinutes()
      const currentTimeMinutes = currentHour * 60 + currentMinute
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      
      // If timeFrame provided, dispense that bundle; otherwise find next available bundle
      targetTimeFrame = timeFrame || null
      let isEarlyDispense = false
      
      // TEMPORARILY DISABLED FOR TESTING - Check if this time frame was already dispensed (ONCE PER TIME FRAME LIMIT)
      // const dispensedFrames = day.dispensedTimeFrames || []
      // if (targetTimeFrame && dispensedFrames.includes(targetTimeFrame)) {
      //   alert(` ${TIME_FRAMES[targetTimeFrame].label} bundle has already been dispensed for ${day.name}. Each time frame can only be dispensed once per day.`)
      //   return
      // }
      
      if (!targetTimeFrame) {
        // TEMPORARILY DISABLED FOR TESTING - Find next available time frame (progressive) - skip already dispensed ones
        const frameOrder = ['morning', 'afternoon', 'evening'] as const
        
        // TEMPORARILY: Just use the first time frame with medications
        for (const frame of frameOrder) {
          const frameMeds = day.medications[frame] || []
          if (frameMeds.length > 0) {
            targetTimeFrame = frame
            break
          }
        }
        
        // ORIGINAL CODE (commented for testing):
        // // Find first time frame that hasn't been dispensed
        // const dispensedFrames = day.dispensedTimeFrames || []
        // for (const frame of frameOrder) {
        //   if (!dispensedFrames.includes(frame)) {
        //     targetTimeFrame = frame
        //     break
        //   }
        // }
        
        // If all time frames are dispensed, move to next day
        if (!targetTimeFrame) {
          const nextDayOfWeek = dayOfWeek === 6 ? 0 : 6 // Saturday -> Sunday, Sunday -> Saturday
          const nextDay = days.find(d => d.dayOfWeek === nextDayOfWeek)
          if (nextDay) {
            showNotification(`All time frames for ${day.name} have been dispensed. Moving to ${nextDay.name}.`, 'info')
            // Reset current day's dispensed frames and move to next day
            setDays(prevDays => 
              prevDays.map(d => 
                d.dayOfWeek === dayOfWeek 
                  ? { ...d, dispensedTimeFrames: [] }
                  : d
              )
            )
            // Try to dispense morning of next day
            if (nextDay.medications.morning.length > 0) {
              await handleDispense(nextDayOfWeek, 'morning')
            } else {
              showNotification(`No medications configured for ${nextDay.name} Morning.`, 'warning')
            }
            return
          }
        }
      }
      
      // TEMPORARILY DISABLED FOR TESTING - All time frame restrictions disabled
      if (!targetTimeFrame) {
        showNotification('No time frame selected. Please select a time frame to dispense.', 'warning')
        return
      }
      
      // Define frameInfo for use in alerts (even though checks are disabled)
      const frameInfo = TIME_FRAMES[targetTimeFrame]
      
      // TEMPORARILY DISABLED FOR TESTING - Skip all time frame checks
      let isInTimeFrame = true // Always allow for testing
      let isInEarlyWindow = false
      // isEarlyDispense already declared at line 893
      
      // ORIGINAL CODE (commented for testing):
      // const frameInfo = TIME_FRAMES[targetTimeFrame]
      // const [startHour, startMin] = frameInfo.start.split(':').map(Number)
      // const startMinutes = startHour * 60 + startMin
      // const earlyDispenseWindow = startMinutes - 30 // 30 minutes before
      // 
      // // Determine if current time is within the time frame or early dispense window
      // let isInTimeFrame = false
      // let isInEarlyWindow = false
      // 
      // if (targetTimeFrame === 'morning') {
      //   // Morning: 5:00 (300 min) to 12:00 (720 min)
      //   isInTimeFrame = currentTimeMinutes >= 300 && currentTimeMinutes <= 720
      //   // Early window: 30 min before 5:00 = 4:30 (270 min) to 4:59 (299 min)
      //   isInEarlyWindow = currentTimeMinutes >= 270 && currentTimeMinutes < 300
      // } else if (targetTimeFrame === 'afternoon') {
      //   // Afternoon: 12:01 (721 min) to 19:00 (1140 min)
      //   isInTimeFrame = currentTimeMinutes >= 721 && currentTimeMinutes <= 1140
      //   // Early window: 30 min before 12:01 = 11:31 (691 min) to 12:00 (720 min)
      //   isInEarlyWindow = currentTimeMinutes >= 691 && currentTimeMinutes < 721
      // } else if (targetTimeFrame === 'evening') {
      //   // Evening: 19:01 (1141 min) to 23:59 (1439 min) OR 0:00 (0 min) to 3:00 (180 min)
      //   isInTimeFrame = currentTimeMinutes >= 1141 || currentTimeMinutes <= 180
      //   // Early window: 30 min before 19:01 = 18:31 (1111 min) to 19:00 (1140 min)
      //   // OR 30 min before 0:00 (wraps around) = 23:30 (1410 min) to 23:59 (1439 min)
      //   isInEarlyWindow = (currentTimeMinutes >= 1111 && currentTimeMinutes < 1141) || 
      //                     (currentTimeMinutes >= 1410 && currentTimeMinutes <= 1439)
      // }
      
      // TEMPORARILY DISABLED FOR TESTING - Check if trying to dispense a time frame that's already passed (progressive check)
      // const lastDispensedTime = day.lastDispensedTime
      // if (lastDispensedTime) {
      //   const [lastHour, lastMin] = lastDispensedTime.split(':').map(Number)
      //   const lastMinutes = lastHour * 60 + lastMin
      //   
      //   let lastFrame = ''
      //   if (lastMinutes >= 300 && lastMinutes <= 720) lastFrame = 'morning'
      //   else if (lastMinutes >= 721 && lastMinutes <= 1140) lastFrame = 'afternoon'
      //   else if (lastMinutes >= 1141 || lastMinutes <= 180) lastFrame = 'evening'
      //   
      //   const frameOrder = { morning: 1, afternoon: 2, evening: 3 }
      //   // If trying to dispense an earlier time frame that was already done, block it
      //   if (frameOrder[targetTimeFrame] < frameOrder[lastFrame as keyof typeof frameOrder]) {
      //     alert(` ${TIME_FRAMES[targetTimeFrame].label} bundle was already dispensed. Next is ${lastFrame === 'morning' ? 'Afternoon' : 'Evening'}.`)
      //     return
      //   }
      // }
      
      // TEMPORARILY DISABLED FOR TESTING - Skip all restrictions
      // Original code commented out - allow dispensing anytime for SMS testing
      // if (!isInTimeFrame && !isInEarlyWindow) {
      //   const nextFrameStart = frameInfo.start
      //   alert(` ${TIME_FRAMES[targetTimeFrame].label} time frame hasn't started yet.\n\nTime frame: ${frameInfo.start} - ${frameInfo.end}\nCurrent time: ${currentTimeStr}\n\nYou can dispense early starting 30 minutes before the time frame (30 min before ${nextFrameStart}).`)
      //   return
      // }
      // 
      // if (isInEarlyWindow) {
      //   isEarlyDispense = true
      //   const confirmMessage = ` Early Dispense Warning\n\nYou are dispensing ${TIME_FRAMES[targetTimeFrame].label} bundle 30 minutes before the time frame starts.\n\nTime frame: ${frameInfo.start} - ${frameInfo.end}\nCurrent time: ${currentTimeStr}\n\nAre you sure you want to dispense early?`
      //   if (!confirm(confirmMessage)) {
      //     return // User cancelled
      //   }
      // }
      
      // Get all medications in the target time frame (bundle)
      frameMedications = day.medications[targetTimeFrame] || []
      
      if (frameMedications.length === 0) {
        showNotification(`No medications in ${TIME_FRAMES[targetTimeFrame].label} to dispense!`, 'warning')
        return
      }
      
      const medicationNames = frameMedications.map(m => m.medication_name).join(', ')

      // Update UI to show dispensing
      setDays(prevDays => 
        prevDays.map(d => 
          d.dayOfWeek === dayOfWeek 
            ? { ...d, status: 'dispensing' }
            : d
        )
      )

      // Dispense ALL medications in the time frame bundle (servo spins once)
      const response = await dispenseToPi('servo1', medicationNames)
      console.log('✅ Manual dispense bundle response:', response)

          // Update last dispensed time and mark this time frame as dispensed
          setDays(prevDays => 
            prevDays.map(d => {
              if (d.dayOfWeek === dayOfWeek && targetTimeFrame) {
                const updatedDispensedFrames = [...(d.dispensedTimeFrames || []), targetTimeFrame]
                return { 
                  ...d, 
                  status: 'dispensing', 
                  lastDispensedTime: currentTimeStr,
                  dispensedTimeFrames: updatedDispensedFrames
                }
              }
              return d
            })
          )

      // Log manual dispense success for each medication in bundle
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          for (const med of frameMedications) {
            await supabase.from('dispense_history').insert({
              user_id: session.user.id,
              servo_number: 1, // Always servo1
              medication_name: med.medication_name,
              action: 'manual',
              status: 'success',
              notes: `${isEarlyDispense ? 'Early ' : ''}Manual dispense bundle from ${day?.name || 'dashboard'} at ${currentTimeStr} (${targetTimeFrame}) - ${medicationNames}`
            })
          }
        }
      } catch (logErr) {
        console.error('Log manual-dispense error:', logErr)
      }

      // Send SMS notification via Pi (SIMCOM module) - Multiple recipients
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && piConnected) {
          // Get user's phone number and emergency contact from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone_number, emergency_contact')
            .eq('id', session.user.id)
            .single()

          // Collect all phone numbers to send SMS to
          const phoneNumbers: string[] = []
          
          // Add main phone number
          if (profileData?.phone_number) {
            phoneNumbers.push(profileData.phone_number)
          }
          
          // Extract phone number from emergency contact (format: "Name 09171234567" or just "09171234567")
          if (profileData?.emergency_contact) {
            const emergencyContact = profileData.emergency_contact.trim()
            // Try to extract phone number (look for pattern like 09XXXXXXXXX or +63XXXXXXXXX)
            const phoneMatch = emergencyContact.match(/(\+?63|0)?9\d{9}/)
            if (phoneMatch) {
              let emergencyPhone = phoneMatch[0]
              // Normalize format (ensure starts with 0 or +63)
              if (!emergencyPhone.startsWith('0') && !emergencyPhone.startsWith('+63')) {
                emergencyPhone = '0' + emergencyPhone
              }
              phoneNumbers.push(emergencyPhone)
            }
          }

          if (phoneNumbers.length > 0) {
                        const smsMessage = `${medicationNames}`
            
            // Send SMS via Pi WebSocket (SIMCOM module) to all recipients
            const smsResult = await sendSmsViaPi(phoneNumbers, smsMessage)
            
            if (smsResult.success) {
              console.log(` SMS notification sent via SIMCOM to ${phoneNumbers.length} recipient(s):`, smsResult)
            } else {
              console.warn(' SMS notification failed:', smsResult)
            }
          } else {
            console.log('ℹ️ No phone numbers found in profile, skipping SMS notification')
          }
        } else if (!piConnected) {
          console.log('ℹ️ Pi not connected, skipping SMS notification')
        }
      } catch (smsErr) {
        console.error('Error sending SMS notification:', smsErr)
        // Don't block the dispense if SMS fails
      }

      // Reset status after 3 seconds
      setTimeout(() => {
        setDays(prevDays => 
          prevDays.map(d => 
            d.dayOfWeek === dayOfWeek 
              ? { ...d, status: 'ready' }
              : d
          )
        )
      }, 3000)

      } catch (error: any) {
      console.error('Error dispensing bundle:', error)
      showNotification(`Error: ${error.message}`, 'error')
      // Log manual dispense error
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && frameMedications.length > 0) {
          for (const med of frameMedications) {
            await supabase.from('dispense_history').insert({
              user_id: session.user.id,
              servo_number: 1, // Always servo1
              medication_name: med.medication_name,
              action: 'manual',
              status: 'error',
              notes: error instanceof Error ? error.message : (error?.message || 'Manual dispense bundle error')
            })
          }
        }
      } catch (logErr) {
        console.error('Log manual-dispense error (insert) failed:', logErr)
      }
      
      // Reset status on error
      setDays(prevDays => 
        prevDays.map(d => 
          d.dayOfWeek === dayOfWeek 
            ? { ...d, status: 'ready' }
            : d
        )
      )
    }
  }

  const handleAddMedication = (dayOfWeek: number, timeFrame: 'morning' | 'afternoon' | 'evening') => {
    setAddingMedication({ dayOfWeek, timeFrame })
    setEditingMedication(null)
    setEditingTimeFrameTime(null)
    setNewMedication({
      name: ''
    })
  }

  const handleEditMedication = (medication: Medication, dayOfWeek: number, timeFrame: 'morning' | 'afternoon' | 'evening') => {
    setEditingMedication({
      id: medication.id,
      name: medication.medication_name,
      dayOfWeek,
      timeFrame
    })
    setAddingMedication(null)
    setEditingTimeFrameTime(null)
    setNewMedication({
      name: medication.medication_name
    })
  }

  const handleEditTimeFrameTime = (dayOfWeek: number, timeFrame: 'morning' | 'afternoon' | 'evening') => {
    const day = days.find(d => d.dayOfWeek === dayOfWeek)
    const currentTime = day?.timeFrameTimes[timeFrame] || TIME_FRAMES[timeFrame].default
    setEditingTimeFrameTime({ dayOfWeek, timeFrame })
    setAddingMedication(null)
    setEditingMedication(null)
    setTimeFrameTime(currentTime)
  }

  const handleSaveTimeFrameTime = async () => {
    if (!editingTimeFrameTime) return

    if (!timeFrameTime || timeFrameTime.trim() === '') {
      showNotification('Please enter a time', 'warning')
      return
    }

    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return

      let effectiveUserId = ownerUserId || session.user.id
      if (!isOwner && effectiveUserId === session.user.id && ownerUserId) {
        effectiveUserId = ownerUserId
      }

      const dayOfWeek = editingTimeFrameTime.dayOfWeek
      const timeFrame = editingTimeFrameTime.timeFrame
      const dayName = dayOfWeek === 6 ? 'Saturday' : 'Sunday'
      const frameInfo = TIME_FRAMES[timeFrame as keyof typeof TIME_FRAMES]

      // Validate time is within time frame range
      const medTime = timeFrameTime.slice(0, 5) // HH:MM
      const [medHour, medMin] = medTime.split(':').map(Number)
      const medMinutes = medHour * 60 + medMin
      
      const [startHour, startMin] = frameInfo.start.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const [endHour, endMin] = frameInfo.end.split(':').map(Number)
      const endMinutes = endHour * 60 + endMin
      
      // Handle evening frame that wraps around midnight
      let isInRange = false
      if (timeFrame === 'evening') {
        isInRange = medMinutes >= 1141 || medMinutes <= 180
      } else {
        isInRange = medMinutes >= startMinutes && medMinutes <= endMinutes
      }
      
      if (!isInRange) {
        showNotification(`Invalid Time: "${timeFrameTime.slice(0, 5)}" is outside the allowed range for ${frameInfo.label}. Allowed time range: ${frameInfo.start} - ${frameInfo.end}`, 'error')
        return
      }

      // Get or create day_config
      const { data: existingConfig } = await supabase
        .from('day_config')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('day_of_week', dayOfWeek)
        .maybeSingle()

      let dayConfigId

      if (existingConfig) {
        dayConfigId = existingConfig.id
      } else {
        // Create new day_config
        const { data: newConfig, error: insertError } = await supabase
          .from('day_config')
          .insert({
            user_id: effectiveUserId,
            day_of_week: dayOfWeek,
            medication_name: '',
            is_active: true
          })
          .select()
          .single()

        if (insertError) throw insertError
        dayConfigId = newConfig.id
      }

      // Update time for this time frame
      const updateData: any = {}
      if (timeFrame === 'morning') {
        updateData.morning_time = timeFrameTime
      } else if (timeFrame === 'afternoon') {
        updateData.afternoon_time = timeFrameTime
      } else if (timeFrame === 'evening') {
        updateData.evening_time = timeFrameTime
      }
      updateData.updated_at = new Date().toISOString()

      const { error: updateError } = await supabase
        .from('day_config')
        .update(updateData)
        .eq('id', dayConfigId)

      if (updateError) {
        console.error(`Error updating time frame time:`, updateError)
        throw updateError
      }

      await fetchDayData()
      setEditingTimeFrameTime(null)
      setTimeFrameTime('')
      showNotification(`${frameInfo.label} time set to ${timeFrameTime.slice(0, 5)} for ${dayName}!`, 'success')
    } catch (error: any) {
      console.error('Error saving time frame time:', error)
      showNotification(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const handleSaveMedication = async () => {
    const isEditing = editingMedication !== null
    const context = isEditing ? editingMedication : addingMedication
    if (!context) return

    if (!newMedication.name || newMedication.name.trim() === '') {
      showNotification('Please enter a medication name', 'warning')
      return
    }

    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return

      let effectiveUserId = ownerUserId || session.user.id
      if (!isOwner && effectiveUserId === session.user.id && ownerUserId) {
        effectiveUserId = ownerUserId
      }

      const dayOfWeek = context.dayOfWeek
      const timeFrame = context.timeFrame
      const dayName = dayOfWeek === 6 ? 'Saturday' : 'Sunday'

      if (isEditing) {
        // Update existing medication (name only, time is at time frame level)
        const { error: updateError } = await supabase
          .from('time_frame_medications')
          .update({
            medication_name: newMedication.name.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', editingMedication.id)

        if (updateError) {
          console.error(`Error updating medication:`, updateError)
          throw updateError
        }

        await fetchDayData()
        setEditingMedication(null)
        setNewMedication({ name: '' })
        showNotification(`${newMedication.name} updated in ${dayName} ${TIME_FRAMES[timeFrame as keyof typeof TIME_FRAMES].label}!`, 'success')
      } else {
        // Get or create day_config for new medication
        const { data: existingConfig } = await supabase
          .from('day_config')
          .select('id')
          .eq('user_id', effectiveUserId)
          .eq('day_of_week', dayOfWeek)
          .maybeSingle()

        let dayConfigId

        if (existingConfig) {
          dayConfigId = existingConfig.id
        } else {
          // Create new day_config
          const { data: newConfig, error: insertError } = await supabase
            .from('day_config')
            .insert({
              user_id: effectiveUserId,
              day_of_week: dayOfWeek,
              medication_name: '', // No single medication name anymore
              is_active: true
            })
            .select()
            .single()

          if (insertError) throw insertError
          dayConfigId = newConfig.id
        }

        // Save new medication to time_frame_medications table (time is at time frame level, not per medication)
        const { error: medError } = await supabase
          .from('time_frame_medications')
          .insert({
            day_config_id: dayConfigId,
            time_frame: timeFrame,
            medication_name: newMedication.name.trim(),
            time: '00:00' // Placeholder - actual time is stored in day_config.time_frame_time
          })

        if (medError) {
          console.error(`Error saving medication:`, medError)
          throw medError
        }

        await fetchDayData()
        setAddingMedication(null)
        setNewMedication({ name: '' })
       showNotification(`${newMedication.name} added to ${dayName} ${TIME_FRAMES[timeFrame as keyof typeof TIME_FRAMES].label}!`, 'success')
      }
    } catch (error: any) {
      console.error('Error saving medication:', error)
      showNotification(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const handleRemoveMedication = async (medicationId: string) => {
    const confirmed = await showConfirm('Remove this medication?')
    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('time_frame_medications')
        .delete()
        .eq('id', medicationId)

      if (error) throw error

      await fetchDayData()
      showNotification('Medication removed!', 'success')
    } catch (error: any) {
      console.error('Error removing medication:', error)
      showNotification(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const handleCopyToOtherFrames = async (dayOfWeek: number, sourceTimeFrame: 'morning' | 'afternoon' | 'evening') => {
    const day = days.find(d => d.dayOfWeek === dayOfWeek)
    if (!day) return

    const sourceMedications = day.medications[sourceTimeFrame]
    if (sourceMedications.length === 0) {
      showNotification(`No medications in ${TIME_FRAMES[sourceTimeFrame].label} to copy`, 'warning')
      return
    }

    const confirmed = await showConfirm(`Copy ${sourceMedications.length} medication(s) from ${TIME_FRAMES[sourceTimeFrame].label} to the other time frames?`)
    if (!confirmed) {
      return
    }

    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return

      let effectiveUserId = ownerUserId || session.user.id
      if (!isOwner && effectiveUserId === session.user.id && ownerUserId) {
        effectiveUserId = ownerUserId
      }

      // Get day_config_id
      const { data: config } = await supabase
        .from('day_config')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('day_of_week', dayOfWeek)
        .single()

      if (!config) {
        showNotification('Day config not found. Please add a medication first.', 'warning')
        return
      }

      // Auto-calculate dates
      const nearestSaturday = getNearestSaturday()
      const nearestSunday = getNearestSunday()
      const dayDate = dayOfWeek === 6 ? formatDate(nearestSaturday) : formatDate(nearestSunday)

      // Copy to other time frames
      const targetFrames = (['morning', 'afternoon', 'evening'] as const).filter(tf => tf !== sourceTimeFrame)

      for (const targetFrame of targetFrames) {
        for (const med of sourceMedications) {
          // Check if already exists (time is at time frame level, not per medication)
          const { data: existing } = await supabase
            .from('time_frame_medications')
            .select('id')
            .eq('day_config_id', config.id)
            .eq('time_frame', targetFrame)
            .eq('medication_name', med.medication_name)
            .maybeSingle()

          if (!existing) {
            // Insert new medication
            await supabase
              .from('time_frame_medications')
              .insert({
                day_config_id: config.id,
                time_frame: targetFrame,
                medication_name: med.medication_name,
                time: '00:00' // Placeholder - actual time is stored in day_config.time_frame_time
              })
          }
        }
      }

      await fetchDayData()
      showNotification(`Copied ${sourceMedications.length} medication(s) to ${targetFrames.map(tf => TIME_FRAMES[tf].label).join(' and ')}!`, 'success')
    } catch (error: any) {
      console.error('Error copying medications:', error)
      showNotification(`Error: ${error?.message || 'Unknown error'}`, 'error')
    }
  }

  const handleCloseModal = () => {
    setAddingMedication(null)
    setEditingMedication(null)
    setEditingTimeFrameTime(null)
    setNewMedication({ name: '' })
    setTimeFrameTime('')
  }


  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8 pb-4 sm:pb-8">
      {/* Header - More compact on mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-8">
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800">PillPal Dashboard</h1>
        <div className="flex flex-wrap gap-1.5 sm:gap-3 md:gap-4">
          <button
            onClick={() => router.push('/history')}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base text-gray-700 hover:bg-gray-100 rounded transition"
          >
            History
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base text-gray-700 hover:bg-gray-100 rounded transition"
          >
            Profile
          </button>
          <button
            onClick={signOut}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base bg-red-500 text-white rounded hover:bg-red-600 transition whitespace-nowrap"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Caregiver notice */}
      {!isOwner && (
        <div className="p-2 sm:p-4 rounded-lg mb-2 sm:mb-6 bg-blue-100 text-blue-800 border-blue-300 border text-xs sm:text-base">
          👤 You are viewing as a caregiver for this account.
        </div>
      )}

      {/* Pi Connection Status */}
      <div className={`p-2 sm:p-4 rounded-lg mb-3 sm:mb-6 text-xs sm:text-base ${
        piConnected 
          ? 'bg-green-100 text-green-800 border-green-300' 
          : 'bg-yellow-100 text-yellow-800 border-yellow-300'
      } border`}>
        {piConnected ? (
          <> Connected to Raspberry Pi</>
        ) : (
          <> Raspberry Pi offline - Dispensing disabled</>
        )}
      </div>

      {/* Caregiver management moved to Profile page */}

      {/* Day Cards - Saturday and Sunday */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="bg-white rounded-lg shadow-md sm:shadow-lg p-3 sm:p-6 border">
            <div className="flex justify-between items-center mb-2 sm:mb-4">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800">{day.name}</h2>
              <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm ${
                day.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {day.status}
              </span>
            </div>

            {/* Time Frames with Multiple Medications - Enhanced UI */}
            <div className="mb-4 sm:mb-6 space-y-3">
              {(['morning', 'afternoon', 'evening'] as const).map((timeFrame) => {
                const medications = day.medications[timeFrame]
                const frameInfo = TIME_FRAMES[timeFrame]
                const frameColors = {
                  morning: 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200',
                  afternoon: 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200',
                  evening: 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200'
                }
                const frameIconColors = {
                  morning: 'text-yellow-600',
                  afternoon: 'text-blue-600',
                  evening: 'text-purple-600'
                }
                
                return (
                  <div key={timeFrame} className={`${frameColors[timeFrame]} p-3 sm:p-4 rounded-lg border-2 shadow-sm`}>
                    <div className="flex justify-between items-center mb-2 sm:mb-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`text-base sm:text-lg ${frameIconColors[timeFrame]}`}>
                          {timeFrame === 'morning' ? '🌅' : timeFrame === 'afternoon' ? '☀️' : '🌙'}
                        </span>
                        <div>
                          <span className="font-bold text-sm sm:text-base text-gray-800">{frameInfo.label}</span>
                          <span className="text-xs text-gray-600 ml-1 sm:ml-2">({frameInfo.start} - {frameInfo.end})</span>
                        </div>
                      </div>
                      {medications.length > 0 && (
                        <button
                          onClick={() => handleCopyToOtherFrames(day.dayOfWeek, timeFrame)}
                          className="text-xs px-2 sm:px-3 py-1 sm:py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition shadow-sm font-medium"
                          title="Copy to other time frames"
                        >
                           Copy
                        </button>
                      )}
                    </div>
                    
                    {medications.length > 0 ? (
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        {/* Medication Names - Compact List */}
                        <div className="p-2.5 sm:p-3 border-b border-gray-100">
                          <div className="flex items-start gap-2 mb-2">
                            <span className="text-xs text-gray-500 font-medium mt-0.5">Medications:</span>
                            <div className="flex-1 flex flex-wrap gap-1.5 sm:gap-2">
                              {medications.map((med, index) => (
                                <div key={med.id} className="flex items-center gap-1.5 group">
                                  <span className="text-sm sm:text-base font-medium text-gray-800">
                                    {med.medication_name}
                                    {index < medications.length - 1 && <span className="text-gray-400">,</span>}
                                  </span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleEditMedication(med, day.dayOfWeek, timeFrame)}
                                      className="px-1 py-0.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded text-xs"
                                      title="Edit medication name"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMedication(med.id)}
                                      className="px-1 py-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded text-xs"
                                      title="Remove"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Show time frame time - ONE time for entire frame */}
                          <div className="flex items-center justify-between gap-2 text-xs pt-2">
                            <div className="flex items-center gap-2 text-gray-600">
                              <span>🕐</span>
                              {day.timeFrameTimes[timeFrame] ? (
                                <span className="font-medium text-gray-800">{day.timeFrameTimes[timeFrame]}</span>
                              ) : (
                                <span className="text-gray-400 italic">No time set</span>
                              )}
                            </div>
                            {day.timeFrameTimes[timeFrame] ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditTimeFrameTime(day.dayOfWeek, timeFrame)
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs cursor-pointer z-10 relative"
                                title="Edit time"
                                type="button"
                              >
                                 Edit Time
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditTimeFrameTime(day.dayOfWeek, timeFrame)
                                }}
                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs cursor-pointer z-10 relative"
                                title="Set time"
                                type="button"
                              >
                                 Set Time
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons - Compact */}
                        <div className="p-2 sm:p-2.5 flex gap-2">
                          <button
                            onClick={() => handleDispense(day.dayOfWeek, timeFrame)}
                            disabled={!piConnected}
                            className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition shadow-sm font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed text-xs sm:text-sm"
                            title={`Dispense all ${medications.length} medication(s) in ${frameInfo.label} bundle`}
                          >
                             Dispense ({medications.length})
                          </button>
                          <button
                            onClick={() => handleAddMedication(day.dayOfWeek, timeFrame)}
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm font-medium text-xs sm:text-sm"
                            title="Add medication"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                        <div className="text-center text-sm text-gray-400 italic mb-3">
                          No medications added yet
                        </div>
                        <button
                          onClick={() => handleAddMedication(day.dayOfWeek, timeFrame)}
                          className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm font-medium text-xs sm:text-sm"
                        >
                          + Add Medication
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
          </div>
        ))}
      </div>

      {/* Add/Edit Medication Modal - Enhanced UI */}
      {(addingMedication || editingMedication) && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">
                {(addingMedication || editingMedication)?.timeFrame === 'morning' ? '🌅' : (addingMedication || editingMedication)?.timeFrame === 'afternoon' ? '☀️' : '🌙'}
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {editingMedication ? 'Edit Medication' : 'Add Medication'}
                </h3>
                <p className="text-sm text-gray-500">
                  {days.find(d => d.dayOfWeek === (addingMedication || editingMedication)?.dayOfWeek)?.name || 'Day'} • {TIME_FRAMES[(addingMedication || editingMedication)?.timeFrame as keyof typeof TIME_FRAMES].label}
                </p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newMedication.name}
                  onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                  placeholder="e.g., Aspirin, Vitamin D"
                  required
                />
              </div>

                <p className="text-xs text-gray-500 mt-1">
                  Note: Time is set per time frame, not per medication. All medications in this time frame will dispense at the same time.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMedication}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-semibold"
              >
                {editingMedication ? ' Update Medication' : ' Add Medication'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Time Frame Time Modal */}
      {editingTimeFrameTime && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">
                {editingTimeFrameTime.timeFrame === 'morning' ? '🌅' : editingTimeFrameTime.timeFrame === 'afternoon' ? '☀️' : '🌙'}
              </span>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
                  Set {TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].label} Time
                </h3>
                <p className="text-sm text-gray-500">
                  {days.find(d => d.dayOfWeek === editingTimeFrameTime.dayOfWeek)?.name || 'Day'}
                </p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Time <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    (Range: {TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].start} - {TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].end})
                  </span>
                </label>
                <input
                  type="time"
                  value={timeFrameTime}
                  onChange={(e) => setTimeFrameTime(e.target.value)}
                  min={TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].start}
                  max={TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].end}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                
                />
                <div className="mt-2 p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 flex items-center gap-1.5">
                    <span></span>
                    <span>Allowed time range: <span className="font-bold">{TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].start}</span> - <span className="font-bold">{TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].end}</span></span>
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    All medications in {TIME_FRAMES[editingTimeFrameTime.timeFrame as keyof typeof TIME_FRAMES].label} will dispense at this time.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-gray-200 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTimeFrameTime}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-semibold"
              >
                 Set Time
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 pointer-events-none">
          <div className={`rounded-lg shadow-lg p-4 max-w-md pointer-events-auto transform transition-all duration-300 ease-in-out ${
            notification.type === 'success' ? 'bg-blue-500 text-white' :
            notification.type === 'error' ? 'bg-white text-gray-800 border-2 border-red-500' :
            notification.type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className={`font-bold text-xl ${
                  notification.type === 'error' ? 'text-gray-600 hover:text-gray-800' : 'text-white hover:text-gray-200'
                }`}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Confirm</h3>
            <p className="text-gray-700 mb-6">{confirmDialog.message}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-lg font-semibold"
              >
                Confirm
              </button>
              <button
                onClick={confirmDialog.onCancel}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


