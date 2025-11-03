'use client'

import { useAuth } from '../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../src/lib/supabase'
import { connectToPi, disconnectFromPi, isConnectedToPi, dispenseToPi } from '../src/lib/pi-websocket'

interface Schedule {
  id: string
  time: string
  date: string
  is_daily: boolean
}

interface ServoData {
  id: number
  name: string
  medication: string
  schedules: Schedule[]
  status: string
  is_occupied: boolean
}

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [piConnected, setPiConnected] = useState(false)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(true)
  const [servos, setServos] = useState<ServoData[]>([
    { id: 1, name: 'Servo 1', medication: '', schedules: [], status: 'ready', is_occupied: false },
    { id: 2, name: 'Servo 2', medication: '', schedules: [], status: 'ready', is_occupied: false },
    { id: 3, name: 'Servo 3', medication: '', schedules: [], status: 'ready', is_occupied: false }
  ])
  const [editingServo, setEditingServo] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    medication_name: '',
    time: '',
    date: new Date().toISOString().split('T')[0], // Today's date
    is_daily: true
  })
  // Caregiver access disabled temporarily to fix signup

  // Connect to Raspberry Pi on page load
  useEffect(() => {
    connectToPi()
      .then(() => {
        console.log('✅ Connected to Pi!')
        setPiConnected(true)
      })
      .catch((error: any) => {
        console.error('❌ Could not connect to Pi:', error)
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
      // Use device's local time (not UTC)
      const now = new Date()
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
        console.log(`🕐 Checking schedules at ${currentTime} on ${currentDate}`)
      }
      checkCounter++

      // First, clean up expired one-time schedules
      for (const servo of servos) {
        if (!servo.medication) continue

        const expiredSchedules = servo.schedules.filter(schedule => 
          !schedule.is_daily && schedule.date < currentDate
        )

        // Delete expired schedules
        for (const schedule of expiredSchedules) {
          try {
            const { error } = await supabase
              .from('schedules')
              .delete()
              .eq('id', schedule.id)
            
            if (!error) {
              console.log(`🗑️ Deleted expired schedule: ${schedule.date} ${schedule.time}`)
            }
          } catch (error) {
            console.error('Error deleting expired schedule:', error)
          }
        }
      }

      // Then check for active schedules
      for (const servo of servos) {
        if (!servo.medication) continue

        const activeSchedules = servo.schedules.filter(schedule => {
          // Extract HH:MM from database time (19:18:00 -> 19:18)
          const scheduleTimeHHMM = schedule.time.slice(0, 5)
          const isTimeMatch = scheduleTimeHHMM === currentTime
          const isDateMatch = schedule.is_daily || schedule.date === currentDate
          
          // Only dispense at the TOP of the minute (seconds 0-2)
          // This ensures: if you set schedule at 7:24:01 for time "7:25", 
          // it dispenses at 7:25:00 (not 7:25:01 or 7:25:30)
          const currentSeconds = now.getSeconds()
          const isTopOfMinute = currentSeconds < 3 // Dispense within first 3 seconds (00, 01, 02)
          
          return isTimeMatch && isDateMatch && isTopOfMinute
        })

        for (const schedule of activeSchedules) {
          // Create unique key for this schedule
          const scheduleKey = `${schedule.id}-${currentDate}-${currentTime}`
          
          // Skip if already executed this minute
          if (executedSchedulesRef.current.has(scheduleKey)) {
            continue
          }
          
          // Mark as executed
          executedSchedulesRef.current.add(scheduleKey)
          
          console.log(`🕐 Time to dispense ${servo.medication} from ${servo.name}!`)
          
          // Update UI to show dispensing
          setServos(prevServos => 
            prevServos.map(s => 
              s.id === servo.id 
                ? { ...s, status: 'dispensing' }
                : s
            )
          )
          
          try {
            if (piConnected) {
              const response = await dispenseToPi(`servo${servo.id}`, servo.medication)
              console.log('✅ Auto-dispense response:', response)

              // Log auto dispense success
              try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                  await supabase.from('dispense_history').insert({
                    user_id: session.user.id,
                    servo_number: servo.id,
                    medication_name: servo.medication,
                    action: 'auto',
                    status: 'success',
                    notes: 'Scheduled auto-dispense'
                  })
                }
              } catch (logErr) {
                console.error('Log auto-dispense error:', logErr)
              }
            } else {
              console.log('⚠️ Pi not connected - would dispense', servo.medication)
              // Log attempted auto dispense when Pi offline
              try {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                  await supabase.from('dispense_history').insert({
                    user_id: session.user.id,
                    servo_number: servo.id,
                    medication_name: servo.medication,
                    action: 'auto',
                    status: 'error',
                    notes: 'Pi offline during auto-dispense'
                  })
                }
              } catch (logErr) {
                console.error('Log auto-dispense offline error:', logErr)
              }
            }
          } catch (error) {
            console.error('❌ Auto-dispense error:', error)
            // Log auto dispense error
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                await supabase.from('dispense_history').insert({
                  user_id: session.user.id,
                  servo_number: servo.id,
                  medication_name: servo.medication,
                  action: 'auto',
                  status: 'error',
                  notes: error instanceof Error ? error.message : 'Auto-dispense error'
                })
              }
            } catch (logErr) {
              console.error('Log auto-dispense error (insert) failed:', logErr)
            }
          }

          // Reset status after 3 seconds
          setTimeout(() => {
            setServos(prevServos => 
              prevServos.map(s => 
                s.id === servo.id 
                  ? { ...s, status: 'ready' }
                  : s
              )
            )
          }, 3000)
          
          // If it's a one-time schedule, delete it after dispensing
          if (!schedule.is_daily) {
            try {
              const { error } = await supabase
                .from('schedules')
                .delete()
                .eq('id', schedule.id)
              
              if (!error) {
                console.log(`🗑️ Deleted one-time schedule after dispensing: ${schedule.time} on ${schedule.date}`)
                // Refresh data to update the UI
                setTimeout(() => {
                  fetchServoData()
                }, 1000)
              }
            } catch (error) {
              console.error('❌ Error deleting one-time schedule after dispense:', error)
            }
          }
          
          // Clear the executed flag after the minute passes (prevent memory leak)
          setTimeout(() => {
            executedSchedulesRef.current.delete(scheduleKey)
          }, 120000) // 2 minutes
        }
      }

      // Refresh data to show updated schedules (only if expired schedules were found)
      if (servos.some(s => s.schedules.some(sched => !sched.is_daily && sched.date < currentDate))) {
        await fetchServoData()
      }
    }

    // Check immediately
    checkSchedules()
    
    // Check every second for exact timing (dispenses at 19:25:00, not 19:25:30)
    const interval = setInterval(checkSchedules, 1000) // 1 second

    return () => clearInterval(interval)
  }, [servos, piConnected])

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
      await fetchServoDataWithUserId(resolvedOwnerUserId, resolvedIsOwner)
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
          console.log('🔄 Caregiver relationship removed, refreshing...')
          await resolveOwner()
          if (isMounted) {
            await fetchServoData()
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
              console.error('❌ Failed to refresh session:', refreshError)
              alert('Your session has expired. Please log in again.')
              router.push('/login')
              return null
            }
            
            return refreshedSession
          } else {
            // No session to refresh, redirect to login
            alert('Your session has expired. Please log in again.')
            router.push('/login')
            return null
          }
        } else {
          throw sessionError
        }
      }
      
      if (!session?.user) {
        console.error('❌ No user session')
        alert('Not logged in. Please log in again.')
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
      console.error('❌ Session error:', error)
      // If error message contains JWT or expired, try to refresh
      if (error?.message?.includes('JWT') || error?.message?.includes('expired')) {
        try {
          // Try to get session first
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (currentSession) {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession(currentSession)
            if (refreshError || !refreshedSession) {
              alert('Your session has expired. Please log in again.')
              router.push('/login')
              return null
            }
            return refreshedSession
          } else {
            alert('Your session has expired. Please log in again.')
            router.push('/login')
            return null
          }
        } catch (refreshErr) {
          alert('Your session has expired. Please log in again.')
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
            console.log('✅ User is an accepted caregiver, owner:', retryResult.data.owner_user_id)
            const result = {
              ownerUserId: retryResult.data.owner_user_id,
              isOwner: false
            }
            setOwnerUserId(result.ownerUserId)
            setIsOwner(result.isOwner)
            return result
          } else if (retryResult.data && retryResult.data.status !== 'accepted') {
            // User has a pending/rejected relationship - treat as owner
            console.log('⚠️ User has pending caregiver invitation, but is owner for now:', currentUserId)
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
          console.log('✅ User is an accepted caregiver, owner:', memberData.owner_user_id, 'status:', memberData.status)
          const result = {
            ownerUserId: memberData.owner_user_id,
            isOwner: false
          }
          setOwnerUserId(result.ownerUserId)
          setIsOwner(result.isOwner)
          return result
        } else {
          // Relationship exists but is pending or rejected - user is still considered owner until accepted
          console.log('⚠️ User has pending/rejected caregiver invitation (status:', memberData.status, '), but is owner for now:', currentUserId)
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
      console.log('✅ User is an owner:', currentUserId)
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

  // Helper function to fetch with explicit user_id (for use after resolveOwner)
  const fetchServoDataWithUserId = async (targetUserId: string, targetIsOwner: boolean) => {
    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return
      
      console.log('📊 Fetching data with user_id:', targetUserId, '(isOwner:', targetIsOwner, ')')
      
      // RLS policies will handle caregiver access automatically
      // But we MUST query with the owner's user_id, not the caregiver's
      let { data: configs, error } = await supabase
        .from('servo_config')
        .select('*')
        .eq('user_id', targetUserId)

      if (error) {
        console.error('❌ Supabase error fetching servo_config:', error)
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
          
          // Retry the query after refresh with same targetUserId
          const retryResult = await supabase
            .from('servo_config')
            .select('*')
            .eq('user_id', targetUserId)
          
          if (retryResult.error) {
            // If still JWT error, the refresh didn't work - redirect to login
            if (retryResult.error.message?.includes('JWT') || retryResult.error.message?.includes('expired')) {
              alert('Your session has expired. Please log in again.')
              router.push('/login')
              return
            }
            alert(`Database error: ${retryResult.error.message || 'Failed to fetch data'}. Please try refreshing the page.`)
            return
          }
          
          // Use retry result
          configs = retryResult.data
          error = null
        } else {
          alert(`Database error: ${error.message || 'Failed to fetch data'}. Check console for details.`)
          return
        }
      }

      console.log('✅ Found servo configs:', configs?.length || 0)

      // Always show all 3 servos, even if not configured yet
      const servoData: ServoData[] = []
      
      // Initialize all 3 servos
      for (let i = 1; i <= 3; i++) {
        const config = configs?.find(c => c.servo_number === i)
        
        if (config) {
          // Fetch schedules for this configured servo
          const { data: schedules, error: schedulesError } = await supabase
            .from('schedules')
            .select('*')
            .eq('servo_config_id', config.id)
            .order('time')

          if (schedulesError) {
            console.error(`❌ Error fetching schedules for servo ${i}:`, schedulesError)
          }

          const schedulesList = schedules?.map((s: any) => ({
            id: s.id,
            time: s.time,
            date: s.date,
            is_daily: s.is_daily
          })) || []

          servoData.push({
            id: config.servo_number,
            name: `Servo ${config.servo_number}`,
            medication: config.medication_name || '',
            schedules: schedulesList,
            status: 'ready', // Always show as ready unless actively dispensing
            is_occupied: false // Reset to false
          })
        } else {
          // Servo not configured yet - show as empty
          servoData.push({
            id: i,
            name: `Servo ${i}`,
            medication: '',
            schedules: [],
            status: 'ready',
            is_occupied: false
          })
        }
      }

      console.log('✅ Servo data loaded:', servoData.map(s => ({
        id: s.id,
        medication: s.medication,
        schedulesCount: s.schedules.length
      })))
      
      setServos(servoData)
    } catch (error: any) {
      console.error('❌ Error fetching servo data:', error)
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      alert(`Error loading data: ${error?.message || 'Unknown error'}. Check browser console for details.`)
    }
  }

  // Main fetchServoData function - resolves owner and fetches data
  const fetchServoData = async () => {
    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return
      
      // Resolve owner to get correct user_id
      const resolved = await resolveOwner()
      if (!resolved) {
        console.error('❌ Could not resolve owner')
        return
      }
      
      // Use resolved values directly
      await fetchServoDataWithUserId(resolved.ownerUserId, resolved.isOwner)
    } catch (error: any) {
      console.error('❌ Error in fetchServoData:', error)
    }
  }

  const handleDispense = async (servoId: number) => {
    // Check Pi connection first
    if (!piConnected) {
      alert('⚠️ Not connected to Raspberry Pi! Make sure the server is running.')
      return
    }

    try {
      const servo = servos.find(s => s.id === servoId)
      const medicationName = servo?.medication || 'Medicine'

      if (!medicationName) {
        alert('Please add a medication first!')
        return
      }

      // Update UI to show dispensing
      setServos(prevServos => 
        prevServos.map(s => 
          s.id === servoId 
            ? { ...s, status: 'dispensing' }
            : s
        )
      )

      // Send command to Raspberry Pi
      const response = await dispenseToPi(`servo${servoId}`, medicationName)
      console.log('✅ Dispense response:', response)

      // Log manual dispense success
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await supabase.from('dispense_history').insert({
            user_id: session.user.id,
            servo_number: servoId,
            medication_name: medicationName,
            action: 'manual',
            status: 'success',
            notes: 'Manual dispense from dashboard'
          })
        }
      } catch (logErr) {
        console.error('Log manual-dispense error:', logErr)
      }

      // Reset status after 3 seconds
      setTimeout(() => {
        setServos(prevServos => 
          prevServos.map(s => 
            s.id === servoId 
              ? { ...s, status: 'ready' }
              : s
          )
        )
      }, 3000)

      } catch (error: any) {
      console.error('Error dispensing:', error)
      alert(`❌ Error: ${error.message}`)
      // Log manual dispense error
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await supabase.from('dispense_history').insert({
            user_id: session.user.id,
            servo_number: servoId,
            medication_name: servos.find(s => s.id === servoId)?.medication || '',
            action: 'manual',
            status: 'error',
            notes: error instanceof Error ? error.message : (error?.message || 'Manual dispense error')
          })
        }
      } catch (logErr) {
        console.error('Log manual-dispense error (insert) failed:', logErr)
      }
      
      // Reset status on error
      setServos(prevServos => 
        prevServos.map(s => 
          s.id === servoId 
            ? { ...s, status: 'ready' }
            : s
        )
      )
    }
  }

  const handleEditSchedule = (servoId: number) => {
    const servo = servos.find(s => s.id === servoId)
    setFormData({
      medication_name: servo?.medication || '',
      time: '',
      date: new Date().toISOString().split('T')[0], // Today's date
      is_daily: true
    })
    setEditingServo(servoId)
  }

  const handleCloseModal = () => {
    setEditingServo(null)
    setFormData({
      medication_name: '',
      time: '',
      date: new Date().toISOString().split('T')[0], // Today's date
      is_daily: true
    })
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      // Refresh auth session first and handle JWT expiration
      const session = await refreshSessionIfNeeded()
      if (!session) return // Already handled redirect
      
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId)
      
      if (error) {
        // Handle JWT expiration
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          const refreshedSession = await refreshSessionIfNeeded()
          if (!refreshedSession) return
          
          // Retry delete
          const retryResult = await supabase
            .from('schedules')
            .delete()
            .eq('id', scheduleId)
          
          if (retryResult.error) throw retryResult.error
        } else {
          throw error
        }
      }
      
      await fetchServoData()
    } catch (error: any) {
      console.error('Error deleting schedule:', error)
      alert(`Error deleting schedule: ${error?.message || 'Unknown error'}`)
    }
  }

  const handleSaveMedication = async () => {
    if (!editingServo) return

    // Validate medication name is required
    if (!formData.medication_name || formData.medication_name.trim() === '') {
      alert('Please enter a medication name')
      return
    }

    try {
      // Refresh auth session first and handle JWT expiration
      const session = await refreshSessionIfNeeded()
      if (!session) {
        // Already handled redirect to login
        throw new Error('No user session')
      }

      // Use ownerUserId for caregivers, or session.user.id for owners
      // This ensures both owner and caregiver edit the same medications
      let effectiveUserId = ownerUserId || session.user.id
      
      // Verify we're using the correct user_id for caregivers
      if (!isOwner && effectiveUserId === session.user.id && ownerUserId) {
        console.warn('⚠️ Caregiver is editing their own data, should use ownerUserId:', ownerUserId)
        effectiveUserId = ownerUserId
      }
      
      console.log('💾 Saving medication with user_id:', effectiveUserId, '(isOwner:', isOwner, ')')

      const { data: configs } = await supabase
        .from('servo_config')
        .select('id, medication_name')
        .eq('user_id', effectiveUserId)
        .eq('servo_number', editingServo)

      const configId = configs?.[0]?.id
      const currentMedication = configs?.[0]?.medication_name

      // Check if medication name is changing and there are existing schedules
      if (configId && currentMedication && currentMedication !== formData.medication_name.trim()) {
        const { data: existingSchedules } = await supabase
          .from('schedules')
          .select('id')
          .eq('servo_config_id', configId)

        if (existingSchedules && existingSchedules.length > 0) {
          const keepSchedules = confirm(
            `You're changing the medication from "${currentMedication}" to "${formData.medication_name}".\n\n` +
            `Do you want to keep the existing schedules? (Click OK to keep, Cancel to delete them)`
          )

          if (!keepSchedules) {
            // Delete all schedules for this servo
            await supabase
              .from('schedules')
              .delete()
              .eq('servo_config_id', configId)
            console.log('🗑️ Deleted all schedules for medication change')
          }
        }
      }

      // Save medication name (required)
      if (!configId) {
        // Create new config
        const { error } = await supabase
          .from('servo_config')
          .insert({
            user_id: effectiveUserId,
            servo_number: editingServo,
            medication_name: formData.medication_name.trim(),
            is_occupied: true
          })
        if (error) {
          console.error('Insert error:', error)
          throw error
        }
      } else {
        // Update existing config
        const { error } = await supabase
          .from('servo_config')
          .update({
            medication_name: formData.medication_name.trim(),
            is_occupied: true
          })
          .eq('id', configId)
        if (error) {
          console.error('Update error:', error)
          throw error
        }
      }

      // Add schedule ONLY if time and date are both provided (optional)
      if (formData.time && formData.date) {
        const { data: config } = await supabase
          .from('servo_config')
          .select('id')
          .eq('user_id', effectiveUserId)
          .eq('servo_number', editingServo)
          .single()

        if (config) {
          const { error: scheduleError } = await supabase
            .from('schedules')
            .insert({
              servo_config_id: config.id,
              time: formData.time,
              date: formData.date,
              is_daily: formData.is_daily
            })
          if (scheduleError) {
            console.error('Schedule insert error:', scheduleError)
            // Don't throw - allow saving medication name even if schedule fails
            console.log('⚠️ Medication saved, but schedule failed to save')
          }
        }
      }

      await fetchServoData()
      handleCloseModal()
      alert('✅ Medication saved! You can now dispense manually.')
    } catch (error: any) {
      console.error('Error saving medication:', error)
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      const errorMessage = error?.message || error?.details || 'Unknown error'
      alert(`Error saving medication: ${errorMessage}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">PillPal Dashboard</h1>
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/history')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            History
          </button>
          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            Profile
          </button>
          <button
            onClick={signOut}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Caregiver notice */}
      {!isOwner && (
        <div className="p-4 rounded-lg mb-6 bg-blue-100 text-blue-800 border-blue-300 border-2">
          👤 You are viewing as a caregiver for this account.
        </div>
      )}

      {/* Pi Connection Status */}
      <div className={`p-4 rounded-lg mb-6 ${
        piConnected 
          ? 'bg-green-100 text-green-800 border-green-300' 
          : 'bg-yellow-100 text-yellow-800 border-yellow-300'
      } border-2`}>
        {piConnected ? (
          <>✅ Connected to Raspberry Pi (192.168.1.45)</>
        ) : (
          <>⚠️ Raspberry Pi offline - Dispensing disabled</>
        )}
      </div>

      {/* Caregiver management moved to Profile page */}

      {/* Servo Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {servos.map((servo) => (
          <div key={servo.id} className="bg-white rounded-lg shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{servo.name}</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                servo.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {servo.status}
              </span>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Medication:</p>
              <p className="text-lg font-semibold text-gray-800">
                {servo.medication || 'Not assigned'}
              </p>
            </div>

            {/* Schedules */}
            {servo.schedules.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Schedules:</p>
                <div className="space-y-1">
                  {servo.schedules.map((schedule) => (
                    <div key={schedule.id} className="bg-gray-50 p-2 rounded text-sm flex justify-between items-center">
                      <div>
                        <span className="font-medium">{schedule.time}</span> - {schedule.date}
                        {schedule.is_daily && <span className="text-blue-600 ml-2">(Daily)</span>}
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleEditSchedule(servo.id)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Edit Schedule
              </button>
              <button
                onClick={() => handleDispense(servo.id)}
                disabled={!piConnected || !servo.medication || servo.medication.trim() === ''}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Dispense Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingServo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Edit Schedule - Servo {editingServo}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.medication_name}
                  onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Aspirin"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Required - Enter medication name to enable dispensing</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 text-gray-600">Schedule (Optional)</h4>
                <p className="text-xs text-gray-500 mb-3">Leave empty to save medication name only. You can add a schedule later.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_daily}
                      onChange={(e) => setFormData({ ...formData, is_daily: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <label className="text-sm">Daily (repeat at this time every day)</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMedication}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

