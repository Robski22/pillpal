'use client'

import { useAuth } from '../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../src/lib/supabase'
import { connectToPi, disconnectFromPi, isConnectedToPi, dispenseToPi, sendSmsViaPi, confirmServo2Dispense, setButtonPressCallback, setConnectionStatusCallback, updateLCDSchedules } from '../src/lib/pi-websocket'
import { formatDate, getPhilippineTime } from '../src/lib/date-utils'

interface Medication {
  id: string
  medication_name: string
  time_frame: 'morning' | 'afternoon' | 'evening'
  // Note: time is now at time frame level, not per medication
}

interface DayData {
  dayOfWeek: number // 6 = Saturday, 0 = Sunday
  name: string // "Saturday" or "Sunday"
  selectedDate: string | null // Selected date in YYYY-MM-DD format (null = not set)
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
  timeFrameRequireConfirmation: {
    morning: boolean // true = requires confirmation, false = automatic dispense
    afternoon: boolean
    evening: boolean
  }
  status: string
  servoNumber: number // All days use servo1
  lastDispensedTime?: string // Track last manual dispense time (HH:MM) for progressive scheduling
  dispensedTimeFrames?: string[] // Track which time frames have been dispensed (e.g., ['morning', 'afternoon'])
}

// Time frame definitions
const TIME_FRAMES = {
  morning: { label: 'Morning', start: '04:00', end: '10:00', default: '07:00' },
  afternoon: { label: 'Afternoon', start: '10:05', end: '16:00', default: '13:00' },
  evening: { label: 'Evening', start: '16:05', end: '00:00', default: '20:00' }
}

// Helper function to get day name from dayOfWeek (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
const getDayName = (dayOfWeek: number): string => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return dayNames[dayOfWeek] || 'Unknown'
}

// Helper function to get the next occurrence of a specific day
const getNextDayDate = (dayOfWeek: number): Date => {
  const now = getPhilippineTime()
  const currentDayOfWeek = now.getDay()
  const daysUntilTarget = (dayOfWeek - currentDayOfWeek + 7) % 7
  const nextDate = new Date(now)
  nextDate.setDate(now.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget))
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

// Map time frame to target angle
// Each time frame has a specific angle it should move to
const getAngleForTimeFrame = (dayOfWeek: number, timeFrame: 'morning' | 'afternoon' | 'evening'): number => {
  // Saturday (dayOfWeek = 6)
  if (dayOfWeek === 6) {
    if (timeFrame === 'morning') return 30
    if (timeFrame === 'afternoon') return 60
    if (timeFrame === 'evening') return 90
  }
  // Sunday (dayOfWeek = 0)
  if (dayOfWeek === 0) {
    if (timeFrame === 'morning') return 120
    if (timeFrame === 'afternoon') return 150
    if (timeFrame === 'evening') return 180
  }
  return 0 // Default (shouldn't happen)
}

// Map servo1 angle to day and time frame (for checking if already dispensed)
const getTimeFrameFromAngle = (angle: number): { dayOfWeek: number; timeFrame: 'morning' | 'afternoon' | 'evening' } | null => {
  const angleInt = Math.round(angle)
  
  // Map angles to time frames:
  // 30° = Saturday morning
  // 60° = Saturday afternoon
  // 90° = Saturday evening
  // 120° = Sunday morning
  // 150° = Sunday afternoon
  // 180° = Sunday evening
  
  if (angleInt >= 30 && angleInt < 60) {
    return { dayOfWeek: 6, timeFrame: 'morning' } // Saturday morning
  } else if (angleInt >= 60 && angleInt < 90) {
    return { dayOfWeek: 6, timeFrame: 'afternoon' } // Saturday afternoon
  } else if (angleInt >= 90 && angleInt < 120) {
    return { dayOfWeek: 6, timeFrame: 'evening' } // Saturday evening
  } else if (angleInt >= 120 && angleInt < 150) {
    return { dayOfWeek: 0, timeFrame: 'morning' } // Sunday morning
  } else if (angleInt >= 150 && angleInt < 180) {
    return { dayOfWeek: 0, timeFrame: 'afternoon' } // Sunday afternoon
  } else if (angleInt >= 180) {
    return { dayOfWeek: 0, timeFrame: 'evening' } // Sunday evening
  }
  
  return null // At 0° or invalid angle
}

// Check if a time frame has already been dispensed based on current angle
const isTimeFrameDispensedByAngle = (currentAngle: number | null, dayOfWeek: number, timeFrame: 'morning' | 'afternoon' | 'evening'): boolean => {
  if (currentAngle === null) return false
  
  const targetAngle = getAngleForTimeFrame(dayOfWeek, timeFrame)
  const angleInt = Math.round(currentAngle)
  
  // Check if current angle indicates this time frame has been dispensed
  // If servo is at or past the target angle for this time frame, it's been dispensed
  if (dayOfWeek === 6) { // Saturday
    if (timeFrame === 'morning' && angleInt >= 30) return true
    if (timeFrame === 'afternoon' && angleInt >= 60) return true
    if (timeFrame === 'evening' && angleInt >= 90) return true
  } else if (dayOfWeek === 0) { // Sunday
    if (timeFrame === 'morning' && angleInt >= 120) return true
    if (timeFrame === 'afternoon' && angleInt >= 150) return true
    if (timeFrame === 'evening' && angleInt >= 180) return true
  }
  
  return false
}

// Check if there are earlier time frames with scheduled times that haven't been dispensed
// Progressive dispense logic: can't dispense later time frames if earlier ones with schedules haven't been dispensed
const hasUndispensedEarlierTimeFrames = (
  day: DayData,
  targetTimeFrame: 'morning' | 'afternoon' | 'evening',
  currentAngle: number | null
): boolean => {
  const frameOrder: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening']
  const targetIndex = frameOrder.indexOf(targetTimeFrame)
  
  // Check all earlier time frames
  for (let i = 0; i < targetIndex; i++) {
    const earlierFrame = frameOrder[i]
    const hasMedications = (day.medications[earlierFrame] || []).length > 0
    const hasScheduledTime = day.timeFrameTimes[earlierFrame] !== null && day.timeFrameTimes[earlierFrame] !== ''
    
    // If this earlier time frame has both medications AND scheduled time, it must be dispensed first
    if (hasMedications && hasScheduledTime) {
      // Check if it's been dispensed by checking if servo angle is at or past this time frame's angle
      if (!isTimeFrameDispensedByAngle(currentAngle, day.dayOfWeek, earlierFrame)) {
        return true // Found an earlier time frame that needs to be dispensed first
      }
    }
  }
  
  return false // All earlier time frames with schedules have been dispensed (or don't exist)
}


// Check if a date matches today's date
const isDateToday = (selectedDate: string | null): boolean => {
  if (!selectedDate) return false
  
  const now = getPhilippineTime()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  
  const selected = new Date(selectedDate)
  selected.setHours(0, 0, 0, 0)
  
  return selected.getTime() === today.getTime()
}

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [piConnected, setPiConnected] = useState(false)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(true)
  // Saturday (dayOfWeek = 6) and Sunday (dayOfWeek = 0) - synced with current date
  // All use servo1 (spins 30 degrees each time)
  const [days, setDays] = useState<DayData[]>(() => {
    if (typeof window === 'undefined') {
      return [
        { 
          dayOfWeek: 6, 
          name: 'Saturday', 
          selectedDate: null,
          medications: { morning: [], afternoon: [], evening: [] },
          timeFrameTimes: { morning: null, afternoon: null, evening: null },
          timeFrameRequireConfirmation: { morning: false, afternoon: false, evening: false }, // Default: automatic dispense (OFF)
          status: 'ready', 
          servoNumber: 1,
          dispensedTimeFrames: []
        },
        { 
          dayOfWeek: 0, 
          name: 'Sunday', 
          selectedDate: null,
          medications: { morning: [], afternoon: [], evening: [] },
          timeFrameTimes: { morning: null, afternoon: null, evening: null },
          timeFrameRequireConfirmation: { morning: false, afternoon: false, evening: false }, // Default: automatic dispense (OFF)
          status: 'ready', 
          servoNumber: 1,
          dispensedTimeFrames: []
        }
      ]
    }
    
    // Sync with current date - if today is Saturday, set Saturday to today and Sunday to tomorrow
    const now = getPhilippineTime()
    const currentDayOfWeek = now.getDay() // 0 = Sunday, 6 = Saturday
    const currentDate = new Date(now)
    currentDate.setHours(0, 0, 0, 0)
    
    // Calculate Saturday and Sunday dates
    let saturdayDate: Date
    let sundayDate: Date
    
    if (currentDayOfWeek === 6) { // Today is Saturday
      saturdayDate = new Date(currentDate)
      sundayDate = new Date(currentDate)
      sundayDate.setDate(currentDate.getDate() + 1)
    } else if (currentDayOfWeek === 0) { // Today is Sunday
      saturdayDate = new Date(currentDate)
      saturdayDate.setDate(currentDate.getDate() - 1)
      sundayDate = new Date(currentDate)
    } else { // Other day - find next Saturday and Sunday
      const daysUntilSaturday = (6 - currentDayOfWeek + 7) % 7 || 7
      saturdayDate = new Date(currentDate)
      saturdayDate.setDate(currentDate.getDate() + daysUntilSaturday)
      sundayDate = new Date(saturdayDate)
      sundayDate.setDate(saturdayDate.getDate() + 1)
    }
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Don't load dates in initial state - let fetchDayDataWithUserId handle it
    // This ensures we use the correct keys (owner-specific for caregivers)
    // Dates will be set when fetchDayDataWithUserId runs after ownerUserId is resolved
    return [
      { 
        dayOfWeek: 6, 
        name: 'Saturday', 
        selectedDate: null, // Will be set by fetchDayDataWithUserId
        medications: { morning: [], afternoon: [], evening: [] },
        timeFrameTimes: { morning: null, afternoon: null, evening: null },
        timeFrameRequireConfirmation: { morning: false, afternoon: false, evening: false }, // Default: automatic dispense (OFF)
        status: 'ready', 
        servoNumber: 1,
        dispensedTimeFrames: []
      },
      { 
        dayOfWeek: 0, 
        name: 'Sunday', 
        selectedDate: null, // Will be set by fetchDayDataWithUserId
        medications: { morning: [], afternoon: [], evening: [] },
        timeFrameTimes: { morning: null, afternoon: null, evening: null },
        timeFrameRequireConfirmation: { morning: false, afternoon: false, evening: false }, // Default: automatic dispense (OFF)
        status: 'ready', 
        servoNumber: 1,
        dispensedTimeFrames: []
      }
    ]
  })
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
  const [servo2ConfirmDialog, setServo2ConfirmDialog] = useState<{ onConfirm: () => void; onCancel: () => void; isAt180?: boolean; date?: string; time?: string; timeFrame?: string } | null>(null)
  const [servo2DialogState, setServo2DialogState] = useState<{
    lastChoice: 'yes' | 'no' | null
    noCount: number
    showAfterNextDispense: boolean
  }>({
    lastChoice: null,
    noCount: 0,
    showAfterNextDispense: true
  })
  const servo2NoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const servo2ProcessingRef = useRef<boolean>(false) // Prevent double-trigger
  const [confirmationPreferenceDialog, setConfirmationPreferenceDialog] = useState<{
    dayOfWeek: number
    timeFrame: 'morning' | 'afternoon' | 'evening'
    medicationName: string
  } | null>(null)
  const [lastServo1Angle, setLastServo1Angle] = useState<number | null>(null) // Track last known servo1 angle
  const holdTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map()) // Track button hold timers per button
  const holdCompletedRef = useRef<Set<string>>(new Set()) // Track which buttons completed hold
  const physicalButtonHoldTimerRef = useRef<NodeJS.Timeout | null>(null) // Track physical button (GPIO26) hold timer
  const physicalButtonHoldStartRef = useRef<number | null>(null) // Track when physical button hold started
  const daysRef = useRef<DayData[]>([]) // Keep latest days state in ref to avoid closure issues
  // Caregiver access disabled temporarily to fix signup

  // Helper function to show notifications
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }
  
  // Helper function to create servo2 dialog config
  const createServo2DialogConfig = (isAt180: boolean, onServo2Complete: () => void, date?: string, time?: string, timeFrame?: string) => {
    return {
      isAt180: isAt180,
      date: date,
      time: time,
      timeFrame: timeFrame,
      onConfirm: async () => {
        // Prevent double-trigger
        if (servo2ProcessingRef.current) {
          console.log('⚠️ Servo2 action already in progress - ignoring duplicate trigger')
          return
        }
        
        servo2ProcessingRef.current = true
        console.log('✅ User clicked YES (or button pressed)')
        
        // Close dialog immediately to prevent double-trigger
        handleServo2DialogChoice('yes')
        setServo2ConfirmDialog(null)
        
        try {
          const servo2Response = await confirmServo2Dispense(date, time, timeFrame)
          if (servo2Response?.status === 'success') {
            if (isAt180 && servo2Response?.servo1_reset) {
              // Servo1 reset to 0° - reset angle tracking so all buttons become enabled again
              setLastServo1Angle(0)
              showNotification('Medicine dispensed! App reset - ready for next cycle.', 'success')
            } else {
              showNotification('Medicine dispensed successfully!', 'success')
            }
          } else {
            showNotification('Medicine dispense failed', 'error')
          }
        } catch (error: any) {
          console.error('❌ Error:', error)
          showNotification(`Error: ${error.message || 'Failed'}`, 'error')
        } finally {
          // Reset processing flag after completion
          servo2ProcessingRef.current = false
        }
        onServo2Complete()
      },
      onCancel: () => {
        console.log('❌ User clicked NO')
        // Store dialog info before closing (needed for retry logic)
        const currentDialog = servo2ConfirmDialog
        handleServo2DialogChoice('no', currentDialog)
        setServo2ConfirmDialog(null)
        if (isAt180) {
          showNotification('Cancelled. Servo1 will stay at 180° and Servo2 will not move.', 'info')
        } else {
          showNotification('Medicine dispense cancelled', 'info')
        }
      }
    }
  }

  // Helper function to handle servo2 dialog user choice
  const handleServo2DialogChoice = (choice: 'yes' | 'no', dialogInfo?: { date?: string; time?: string; timeFrame?: string; isAt180?: boolean; onConfirm: () => void; onCancel: () => void } | null) => {
    console.log(`✅ User chose: ${choice}, noCount: ${servo2DialogState.noCount}`)
    
    // Clear any existing NO timeout
    if (servo2NoTimeoutRef.current) {
      clearTimeout(servo2NoTimeoutRef.current)
      servo2NoTimeoutRef.current = null
    }
    
    if (choice === 'yes') {
      // YES: Show dialog after next dispense
      setServo2DialogState({
        lastChoice: 'yes',
        noCount: 0,
        showAfterNextDispense: true
      })
      console.log('✅ Next dialog will appear after next dispense')
    } else {
      // NO: Check if this is the second NO
      const newNoCount = servo2DialogState.noCount + 1
      console.log(`❌ NO count: ${newNoCount} (was ${servo2DialogState.noCount})`)
      
      if (newNoCount >= 2) {
        // Second NO: Skip this schedule and find next scheduled time
        console.log('❌ Second NO - skipping this schedule and finding next scheduled time')
        
        // Use dialog info passed as parameter (captured before dialog was closed)
        const currentDialog = dialogInfo || servo2ConfirmDialog
        if (currentDialog?.date && currentDialog?.timeFrame) {
          // Mark this schedule as dispensed (skipped) so it won't show again
          setDays(prevDays => {
            return prevDays.map(d => {
              if (d.selectedDate === currentDialog.date) {
                // Mark this time frame as dispensed
                const updatedDispensed = [...(d.dispensedTimeFrames || [])]
                const skipKey = currentDialog.timeFrame
                if (skipKey && !updatedDispensed.includes(skipKey)) {
                  updatedDispensed.push(skipKey)
                }
                return { ...d, dispensedTimeFrames: updatedDispensed }
              }
              return d
            })
          })
          
          console.log(`⏭️ Marked ${currentDialog.date} ${currentDialog.time} ${currentDialog.timeFrame} as skipped`)
          showNotification(`Skipped ${currentDialog.timeFrame}. Finding next scheduled time...`, 'info')
        }
        
        // Reset state and find next schedule
        setServo2DialogState({
          lastChoice: 'no',
          noCount: 0, // Reset count
          showAfterNextDispense: true
        })
        
        // Find next scheduled time and continue
        setTimeout(() => {
          console.log('🔍 Finding next scheduled time after skip...')
          // The auto-dispense check will find the next schedule automatically
        }, 1000)
      } else {
        // First NO: Show again after 1 minute
        setServo2DialogState({
          lastChoice: 'no',
          noCount: newNoCount,
          showAfterNextDispense: false
        })
        console.log(`❌ First NO (count: ${newNoCount}) - showing dialog again after 1 minute`)
        
        // Use dialog info passed as parameter (captured before dialog was closed)
        const currentDialog = dialogInfo || servo2ConfirmDialog
        
        if (!currentDialog) {
          console.error('❌ No dialog info available for retry')
          return
        }
        
        // Set timeout to show dialog again after 1 minute
        servo2NoTimeoutRef.current = setTimeout(() => {
          console.log('⏱️ 1 minute passed - showing dialog again')
          // Recreate the dialog with same config (but need to recreate the functions)
          if (currentDialog) {
            const retryDialogConfig = createServo2DialogConfig(
              currentDialog.isAt180 || false,
              () => {}, // onServo2Complete
              currentDialog.date,
              currentDialog.time,
              currentDialog.timeFrame
            )
            setServo2ConfirmDialog(retryDialogConfig)
            console.log('✅ Dialog reopened after 1 minute')
          }
          servo2NoTimeoutRef.current = null
        }, 60 * 1000) // 1 minute
      }
    }
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

  // Connect to Raspberry Pi on page load and monitor connection status
  useEffect(() => {
    let isMounted = true
    
    // Set up connection status callback to update UI automatically
    setConnectionStatusCallback((connected: boolean) => {
      if (isMounted) {
        console.log('📡 Connection status changed:', connected ? 'CONNECTED' : 'DISCONNECTED')
        setPiConnected(connected)
      }
    })
    
    // Initial connection attempt with aggressive retry logic
    const attemptConnection = async (retryCount = 0) => {
      try {
        console.log(`🔄 Attempting to connect to Pi... (attempt ${retryCount + 1})`)
        await connectToPi()
        if (isMounted) {
          console.log('✅ Connected to Pi!')
          setPiConnected(true)
        }
      } catch (error: any) {
        console.error(`❌ Connection attempt ${retryCount + 1} failed:`, error)
        if (isMounted) {
          setPiConnected(false)
        }
        
        // More aggressive retry: up to 5 times with faster initial retries
        if (retryCount < 5 && isMounted) {
          // Faster initial retries: 1s, 2s, 3s, then 5s, 10s
          const delays = [1000, 2000, 3000, 5000, 10000]
          const delay = delays[retryCount] || 10000
          console.log(`⏳ Retrying connection in ${delay/1000} seconds...`)
          setTimeout(() => {
            if (isMounted) {
              attemptConnection(retryCount + 1)
            }
          }, delay)
        } else if (isMounted) {
          console.log('⚠️ Initial retry attempts exhausted. Auto-reconnect will continue...')
          // Auto-reconnect will handle further attempts via onclose handler
        }
      }
    }
    
    // Start connection attempt immediately
    attemptConnection()
    
    // Also set up a periodic connection check to ensure we stay connected
    const connectionCheckInterval = setInterval(() => {
      if (isMounted && !isConnectedToPi()) {
        console.log('⚠️ Connection check: Not connected, attempting to reconnect...')
        attemptConnection(0).catch(err => console.error('Periodic reconnect failed:', err))
      }
    }, 30000) // Check every 30 seconds
    
    return () => {
      isMounted = false
      clearInterval(connectionCheckInterval)
      disconnectFromPi()
      setButtonPressCallback(null)
      setConnectionStatusCallback(null)
    }

    return () => {
      isMounted = false
      disconnectFromPi()
      setButtonPressCallback(null)
      setConnectionStatusCallback(null)
    }
  }, [])

  // Listen for button press events (GPIO26)
  useEffect(() => {
    console.log('🔧 Setting up GPIO26 button press handler')
    console.log('🔍 Current dialog state when setting up:', servo2ConfirmDialog ? 'OPEN' : 'CLOSED')
    
    // Debounce timer for button presses
    let buttonPressTimeout: NodeJS.Timeout | null = null
    
    const handleButtonPress = (pressed: boolean) => {
      console.log('🔘 handleButtonPress called with pressed:', pressed)
      if (pressed) {
        // Record when button was pressed (for hold detection)
        physicalButtonHoldStartRef.current = Date.now()
        console.log('🔘 GPIO26 button pressed - starting hold timer')
        
        // Clear any existing hold timer
        if (physicalButtonHoldTimerRef.current) {
          clearTimeout(physicalButtonHoldTimerRef.current)
          physicalButtonHoldTimerRef.current = null
        }
        
        // Start 2-second hold timer for force dispense
        physicalButtonHoldTimerRef.current = setTimeout(() => {
          console.log('✅ GPIO26 button held for 2 seconds - triggering force dispense')
          physicalButtonHoldTimerRef.current = null
          physicalButtonHoldStartRef.current = null
          handleForceDispense()
        }, 2000) // 2 seconds
        
        // Clear any pending button press
        if (buttonPressTimeout) {
          clearTimeout(buttonPressTimeout)
          buttonPressTimeout = null
        }
        
        // Debounce: wait 100ms before processing to avoid double-trigger
        buttonPressTimeout = setTimeout(() => {
          // Check if hold was already completed (force dispense triggered)
          if (!physicalButtonHoldStartRef.current) {
            console.log('⏭️ Hold completed - force dispense already triggered, skipping normal press')
            return
          }
          
          console.log('🔘 GPIO26 button pressed! (after debounce)')
          console.log('🔍 Current dialog state:', servo2ConfirmDialog ? 'OPEN' : 'CLOSED')
          console.log('🔍 Processing flag:', servo2ProcessingRef.current)
          
          // Check if already processing
          if (servo2ProcessingRef.current) {
            console.log('⚠️ Servo2 action already in progress - ignoring button press')
            return
          }
          
          // Check if dialog is open
          if (servo2ConfirmDialog) {
            console.log('✅ Dialog is open - triggering YES response')
            console.log('🔍 onConfirm function exists:', typeof servo2ConfirmDialog.onConfirm === 'function')
            // Cancel hold timer since we're doing normal action
            if (physicalButtonHoldTimerRef.current) {
              clearTimeout(physicalButtonHoldTimerRef.current)
              physicalButtonHoldTimerRef.current = null
            }
            physicalButtonHoldStartRef.current = null
            // Trigger the YES response
            try {
              servo2ConfirmDialog.onConfirm()
              console.log('✅ onConfirm called successfully')
            } catch (error) {
              console.error('❌ Error triggering onConfirm:', error)
              servo2ProcessingRef.current = false // Reset on error
            }
          } else {
            console.log('⚠️ Button pressed but no dialog is open')
            console.log('💡 Dialog will appear after next dispense')
            // If no dialog, wait for hold to complete (don't cancel timer)
          }
        }, 100) // 100ms debounce
      } else {
        // Button released
        console.log('🔘 GPIO26 button released')
        const holdDuration = physicalButtonHoldStartRef.current 
          ? Date.now() - physicalButtonHoldStartRef.current 
          : 0
        
        // Cancel hold timer if button was released before 2 seconds
        if (physicalButtonHoldTimerRef.current) {
          clearTimeout(physicalButtonHoldTimerRef.current)
          physicalButtonHoldTimerRef.current = null
          console.log(`⏱️ Hold cancelled - button released after ${holdDuration}ms`)
        }
        physicalButtonHoldStartRef.current = null
      }
    }
    
    setButtonPressCallback(handleButtonPress)
    console.log('✅ Button press callback registered')
    console.log('💡 Callback will be called when button_press message is received')
    console.log('💡 Hold button for 2 seconds to trigger force dispense')

    return () => {
      console.log('🧹 Cleaning up button press callback')
      if (buttonPressTimeout) {
        clearTimeout(buttonPressTimeout)
      }
      if (physicalButtonHoldTimerRef.current) {
        clearTimeout(physicalButtonHoldTimerRef.current)
      }
      setButtonPressCallback(null)
    }
  }, [servo2ConfirmDialog])

  // Track already executed schedules to prevent duplicates
  const executedSchedulesRef = useRef<Set<string>>(new Set())

  // Auto-sync dates on component mount and when current day changes
  useEffect(() => {
    const now = getPhilippineTime()
    const currentDayOfWeek = now.getDay()
    const currentDate = new Date(now)
    currentDate.setHours(0, 0, 0, 0)
    
    // Calculate Saturday and Sunday dates
    let saturdayDate: Date
    let sundayDate: Date
    
    if (currentDayOfWeek === 6) { // Today is Saturday
      saturdayDate = new Date(currentDate)
      sundayDate = new Date(currentDate)
      sundayDate.setDate(currentDate.getDate() + 1)
    } else if (currentDayOfWeek === 0) { // Today is Sunday
      saturdayDate = new Date(currentDate)
      saturdayDate.setDate(currentDate.getDate() - 1)
      sundayDate = new Date(currentDate)
    } else { // Other day - find next Saturday and Sunday
      const daysUntilSaturday = (6 - currentDayOfWeek + 7) % 7 || 7
      saturdayDate = new Date(currentDate)
      saturdayDate.setDate(currentDate.getDate() + daysUntilSaturday)
      sundayDate = new Date(saturdayDate)
      sundayDate.setDate(saturdayDate.getDate() + 1)
    }
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const saturdayDateStr = formatDate(saturdayDate)
    const sundayDateStr = formatDate(sundayDate)
    
    // Update dates in state and localStorage (only if not already set by user or fetchDayDataWithUserId)
    // For caregivers, use owner's user_id in the key so dates sync
    // Note: This runs after ownerUserId is resolved, so we can use the correct keys
    setDays(prevDays => {
      const updated = prevDays.map(d => {
        // Only auto-sync if no date is set AND ownerUserId is available (for caregivers)
        // fetchDayDataWithUserId will set dates from the correct keys, so we only need to handle
        // the case where dates weren't loaded from localStorage
        if (!d.selectedDate && (isOwner || ownerUserId)) {
          if (d.dayOfWeek === 6) {
            // Use owner-specific key if caregiver, otherwise regular key
            const currentOwnerUserId = isOwner ? (user?.id || '') : (ownerUserId || '')
            const storageKey = isOwner
              ? 'pillpal_selectedDate_6'
              : `pillpal_selectedDate_${currentOwnerUserId}_6`
            
            // Check if date exists in localStorage first
            const savedDate = localStorage.getItem(storageKey)
            if (savedDate) {
              return { ...d, selectedDate: savedDate }
            } else {
              // No saved date, use calculated date
              localStorage.setItem(storageKey, saturdayDateStr)
              return { ...d, selectedDate: saturdayDateStr }
            }
          } else if (d.dayOfWeek === 0) {
            // Use owner-specific key if caregiver, otherwise regular key
            const currentOwnerUserId = isOwner ? (user?.id || '') : (ownerUserId || '')
            const storageKey = isOwner
              ? 'pillpal_selectedDate_0'
              : `pillpal_selectedDate_${currentOwnerUserId}_0`
            
            // Check if date exists in localStorage first
            const savedDate = localStorage.getItem(storageKey)
            if (savedDate) {
              return { ...d, selectedDate: savedDate }
            } else {
              // No saved date, use calculated date
              localStorage.setItem(storageKey, sundayDateStr)
              return { ...d, selectedDate: sundayDateStr }
            }
          }
        }
        return d
      })
      daysRef.current = updated // Update ref
      return updated
    })
  }, [isOwner, ownerUserId, user?.id]) // Re-run if owner context changes

  // Send schedule updates to LCD display on Pi
  useEffect(() => {
    if (!piConnected || !days || days.length === 0) {
      return
    }

    // Collect all schedules from all days
    const allSchedules: Array<{time: string, medication?: string, time_frame?: string, date?: string}> = []
    
    days.forEach(day => {
      // Check each time frame (morning, afternoon, evening)
      const timeFrames: Array<'morning' | 'afternoon' | 'evening'> = ['morning', 'afternoon', 'evening']
      
      timeFrames.forEach(timeFrame => {
        const time = day.timeFrameTimes[timeFrame]
        const medications = day.medications[timeFrame]
        
        // If there's a time set and medications, add to schedules
        if (time && medications && medications.length > 0) {
          medications.forEach(med => {
            allSchedules.push({
              time: time,
              medication: med.medication_name,
              time_frame: timeFrame,
              date: day.selectedDate || undefined // Include date for LCD tracking
            })
          })
        }
      })
    })

    // Send to Pi LCD if connected
    if (allSchedules.length > 0 && isConnectedToPi()) {
      updateLCDSchedules(allSchedules)
        .then(() => {
          console.log(`📺 LCD: Sent ${allSchedules.length} schedule(s) to Pi`)
        })
        .catch((error) => {
          console.error('❌ Failed to update LCD schedules:', error)
        })
    }
  }, [days, piConnected])

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
        console.log(`🕐 Checking schedules at ${currentTime} on ${currentDate} (Day: ${getDayName(currentDayOfWeek)})`)
      }
      checkCounter++

      // Check if today's date matches any scheduled date
      const todayDate = `${year}-${month}-${day}`
      const todayDay = days.find(d => d.selectedDate === todayDate)
      if (!todayDay) {
        // Log only every 60 seconds to reduce console spam
        if (checkCounter % 60 === 0) {
          console.log(`⚠️ No schedule found for date ${todayDate}`)
          console.log(`📋 Available dates:`, days.map(d => ({ name: d.name, date: d.selectedDate })))
        }
        return
      }
      
      console.log(`✅ Found schedule for ${todayDay.name} on ${todayDate}`)
      
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
        
        // Check if the time frame's scheduled time matches current time (exact match)
        const frameTime = todayDay.timeFrameTimes[timeFrame as keyof typeof todayDay.timeFrameTimes]
        if (!frameTime) {
          if (checkCounter % 60 === 0) {
            console.log(`⏸️ No time set for ${timeFrame} on ${todayDay.name}`)
          }
          continue // No time set for this frame
        }
        
        const frameTimeHHMM = frameTime.slice(0, 5) // Get HH:MM format
        const isTimeMatch = frameTimeHHMM === currentTime
        
        if (!isTimeMatch) {
          // Log only every 60 seconds to reduce console spam
          if (checkCounter % 60 === 0 && frameTimeHHMM) {
            console.log(`⏰ Waiting for ${timeFrame} at ${frameTimeHHMM} (current: ${currentTime})`)
          }
          continue
        }
        
        console.log(`✅ TIME MATCH! ${timeFrame} scheduled for ${frameTimeHHMM}, current time: ${currentTime}`)
        console.log(`📋 Medications in ${timeFrame}:`, frameMeds.length)
        
        // Only dispense at the TOP of the minute (seconds 0-2) to avoid multiple triggers
        const currentSeconds = now.getSeconds()
        const isTopOfMinute = currentSeconds < 3
        
        if (isTopOfMinute) {
          activeTimeFrames.add(timeFrame)
          console.log(`✅ Added ${timeFrame} to active time frames (seconds: ${currentSeconds})`)
        } else {
          console.log(`⏳ Waiting for top of minute (current seconds: ${currentSeconds})`)
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
        
        console.log(`🕐 AUTO-DISPENSE: Time to dispense ${timeFrame} bundle on ${todayDay.name}! Medications: ${medicationNames}`)
        console.log(`📅 Date: ${todayDate}, Time: ${currentTime}, DayOfWeek: ${todayDay.dayOfWeek}`)
        
        // Call handleDispense with the correct dayOfWeek and timeFrame
        // This ensures auto-dispense follows the exact same flow as manual dispense
        // Use todayDay.dayOfWeek (which is 6 for Saturday or 0 for Sunday in UI)
        // Skip time window check since we're at the exact scheduled time
        try {
          await handleDispense(todayDay.dayOfWeek, timeFrame as 'morning' | 'afternoon' | 'evening', true)
          console.log(`✅ Auto-dispense triggered successfully for ${timeFrame} on ${todayDay.name}`)

        } catch (error) {
          console.error('❌ Auto-dispense error:', error)
          // Error is already handled by handleDispense, just log here
        }
        
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
  }, [days, piConnected, lastServo1Angle, servo2DialogState])

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
      
      if (!isMounted || !resolved) return
      
      // Use resolved values directly instead of state
      const resolvedOwnerUserId = resolved.ownerUserId
      const resolvedIsOwner = resolved.isOwner
      
      console.log('📊 Owner resolved:', {
        ownerUserId: resolvedOwnerUserId,
        isOwner: resolvedIsOwner,
        resolvedFromFunction: resolved
      })
      
      // Fetch data with resolved values (caregiver will see owner's data)
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

  // Refetch data when ownerUserId changes (e.g., when caregiver relationship is established)
  useEffect(() => {
    if (!user) return
    
    // If ownerUserId is not set yet, wait for it (don't return, just log)
    if (!ownerUserId) {
      console.log('⏳ Waiting for ownerUserId to be resolved...')
      return
    }
    
    console.log('🔄 ownerUserId changed, refetching data for:', ownerUserId, '(isOwner:', isOwner, ')')
    // Small delay to ensure state is fully updated
    const timer = setTimeout(() => {
      console.log('🔄 Executing fetchDayDataWithUserId with ownerUserId:', ownerUserId, 'isOwner:', isOwner)
      fetchDayDataWithUserId(ownerUserId, isOwner)
    }, 200)
    
    return () => clearTimeout(timer)
  }, [ownerUserId, isOwner, user]) // Refetch when owner/user context changes

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
          console.log('✅ User is an accepted caregiver, owner:', memberData.owner_user_id, 'status:', memberData.status)
          const result = {
            ownerUserId: memberData.owner_user_id,
            isOwner: false
          }
          setOwnerUserId(result.ownerUserId)
          setIsOwner(result.isOwner)
          console.log('✅ Set ownerUserId to:', result.ownerUserId, 'isOwner:', result.isOwner)
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
      
      // targetUserId is always the owner's ID:
      // - For caregivers: targetUserId = owner's ID (from resolveOwner)
      // - For owners: targetUserId = their own ID (from resolveOwner)
      // Always use targetUserId directly
      const effectiveUserId = targetUserId
      
      console.log('📊 Fetching day data:', {
        effectiveUserId,
        targetUserId,
        targetIsOwner,
        sessionUserId: session.user.id,
        note: targetIsOwner ? 'Owner viewing own data' : 'Caregiver viewing owner data'
      })
      
      if (!effectiveUserId) {
        console.error('❌ No effectiveUserId available!')
        return
      }
      
      // Fetch day_config for Saturday (6) and Sunday (0) (including time frame times)
      // Note: day_of_week is just for UI organization, actual scheduling uses selectedDate
      // Use effectiveUserId (owner's ID for caregivers)
      // For caregivers, we need to query with the owner's user_id
      console.log('🔍 Querying day_config with effectiveUserId:', effectiveUserId, 'targetIsOwner:', targetIsOwner)
      
      let { data: configs, error } = await supabase
        .from('day_config')
        .select('id, user_id, day_of_week, medication_name, is_active, morning_time, afternoon_time, evening_time, selected_date, morning_require_confirmation, afternoon_require_confirmation, evening_require_confirmation, created_at, updated_at')
        .eq('user_id', effectiveUserId)
        .in('day_of_week', [0, 6]) // Database: Sunday (0), Saturday (6)
      
      // Debug: Check if query returned anything
      if (!configs || configs.length === 0) {
        console.warn('⚠️ No day_config found for user_id:', effectiveUserId, 'targetIsOwner:', targetIsOwner)
        console.warn('⚠️ Session user_id:', session.user.id)
        
        // For caregivers, try querying with session user_id to see if RLS is the issue
        if (!targetIsOwner) {
          console.log('🔍 Caregiver detected - checking if RLS is blocking access...')
          const { data: testConfigs } = await supabase
            .from('day_config')
            .select('user_id, day_of_week')
            .eq('user_id', session.user.id)
            .in('day_of_week', [0, 6])
            .limit(5)
          console.log('🔍 Caregiver\'s own day_configs:', testConfigs?.length || 0, testConfigs)
          
          // Try to see what user_ids exist in day_config (for debugging - might be blocked by RLS)
          const { data: allConfigs, error: allError } = await supabase
            .from('day_config')
            .select('user_id, day_of_week')
            .in('day_of_week', [0, 6])
            .limit(10)
          if (allError) {
            console.error('🔍 Error querying all configs (likely RLS):', allError.message)
          } else {
            console.log('🔍 Sample day_config user_ids in database:', allConfigs?.map(c => ({ user_id: c.user_id, day_of_week: c.day_of_week })))
          }
        }
      }

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
            .select('id, user_id, day_of_week, medication_name, is_active, morning_time, afternoon_time, evening_time, selected_date, morning_require_confirmation, afternoon_require_confirmation, evening_require_confirmation, created_at, updated_at')
            .eq('user_id', effectiveUserId)
            .in('day_of_week', [0, 6]) // Database: Sunday (0), Saturday (6)
          
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

      console.log('✅ Found day configs:', configs?.length || 0, 'for user_id:', effectiveUserId)
      if (configs && configs.length > 0) {
        console.log('📋 Day configs details:', configs.map(c => ({
          id: c.id,
          user_id: c.user_id,
          day_of_week: c.day_of_week,
          morning_time: c.morning_time,
          afternoon_time: c.afternoon_time,
          evening_time: c.evening_time
        })))
      }

      // Always show Saturday and Sunday, even if not configured yet
      const dayData: DayData[] = []
      
      // Database day_of_week matches UI day_of_week
      const dayMapping = [
        { dbDay: 6, uiDay: 6, name: 'Saturday' },
        { dbDay: 0, uiDay: 0, name: 'Sunday' }
      ]
      
      for (const mapping of dayMapping) {
        const dayName = mapping.name
        const config = configs?.find(c => c.day_of_week === mapping.dbDay)
        
        if (config && config.is_active) {
          // Fetch medications for this day from time_frame_medications
          console.log(`📦 Fetching medications for ${dayName} (day_config_id: ${config.id}, user_id: ${config.user_id})`)
          const { data: medications, error: medsError } = await supabase
            .from('time_frame_medications')
            .select('*')
            .eq('day_config_id', config.id)
            .order('time')
          
          console.log(`📦 Found ${medications?.length || 0} medications for ${dayName}:`, medications?.map(m => ({
            id: m.id,
            medication_name: m.medication_name,
            time_frame: m.time_frame,
            day_config_id: m.day_config_id
          })))

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

          // Get confirmation preferences from day_config (default: false = automatic dispense)
          const timeFrameRequireConfirmation = {
            morning: config.morning_require_confirmation ?? false,
            afternoon: config.afternoon_require_confirmation ?? false,
            evening: config.evening_require_confirmation ?? false
          }

          // Load selectedDate from database first (for syncing between patient and caregiver)
          // Fall back to localStorage, then auto-calculate
          let selectedDateFromDB = config.selected_date || null
          
          // Auto-sync date if not in database
          const now = getPhilippineTime()
          const currentDayOfWeek = now.getDay()
          let autoDate: string | null = null
          
          if (currentDayOfWeek === 6 && mapping.uiDay === 6) { // Today is Saturday
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)
            autoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          } else if (currentDayOfWeek === 0 && mapping.uiDay === 0) { // Today is Sunday
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)
            autoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          } else if (mapping.uiDay === 6) { // Saturday - find next Saturday
            const daysUntilSaturday = (6 - currentDayOfWeek + 7) % 7 || 7
            const saturday = new Date(now)
            saturday.setDate(now.getDate() + daysUntilSaturday)
            saturday.setHours(0, 0, 0, 0)
            autoDate = `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, '0')}-${String(saturday.getDate()).padStart(2, '0')}`
          } else if (mapping.uiDay === 0) { // Sunday - find next Sunday
            const daysUntilSunday = (0 - currentDayOfWeek + 7) % 7 || 7
            const sunday = new Date(now)
            sunday.setDate(now.getDate() + daysUntilSunday)
            sunday.setHours(0, 0, 0, 0)
            autoDate = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
          }
          
          // Use database date first, then auto-calculated date
          const finalDate = selectedDateFromDB || autoDate
          
          // If no date in database but we have an auto date, save it to database
          if (!selectedDateFromDB && autoDate) {
            // Update database with auto-calculated date
            await supabase
              .from('day_config')
              .update({ selected_date: autoDate, updated_at: new Date().toISOString() })
              .eq('id', config.id)
              .then(() => {
                console.log(`💾 Saved auto-calculated date ${autoDate} to database for ${dayName}`)
              })
          }
          
          // Calculate day name from selectedDate (if available)
          let displayName = dayName
          if (finalDate) {
            try {
              const dateObj = new Date(finalDate + 'T00:00:00')
              const dayOfWeekFromDate = dateObj.getDay() // 0 = Sunday, 6 = Saturday
              displayName = getDayName(dayOfWeekFromDate)
            } catch (e) {
              // If date parsing fails, use default dayName
              displayName = dayName
            }
          }
          
          dayData.push({
            dayOfWeek: mapping.uiDay, // Use UI day_of_week (6 or 0)
            name: displayName, // Use calculated day name from selectedDate
            selectedDate: finalDate,
            medications: {
              morning: morningMeds.sort((a, b) => a.medication_name.localeCompare(b.medication_name)),
              afternoon: afternoonMeds.sort((a, b) => a.medication_name.localeCompare(b.medication_name)),
              evening: eveningMeds.sort((a, b) => a.medication_name.localeCompare(b.medication_name))
            },
            timeFrameTimes: timeFrameTimes,
            timeFrameRequireConfirmation: timeFrameRequireConfirmation,
            status: 'ready',
            servoNumber: 1, // Both use servo1
            dispensedTimeFrames: [] // Reset on fetch - will be tracked in state
          })
        } else {
          // Day not configured yet - show as empty
          // Check if there's a day_config with just a selected_date (no medications yet)
          const { data: emptyConfig } = await supabase
            .from('day_config')
            .select('id, selected_date')
            .eq('user_id', effectiveUserId)
            .eq('day_of_week', mapping.dbDay)
            .maybeSingle()
          
          let selectedDateFromDB = emptyConfig?.selected_date || null
          
          // Auto-sync date if not in database
          const now = getPhilippineTime()
          const currentDayOfWeek = now.getDay()
          let autoDate: string | null = null
          
          if (currentDayOfWeek === 6 && mapping.uiDay === 6) { // Today is Saturday
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)
            autoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          } else if (currentDayOfWeek === 0 && mapping.uiDay === 0) { // Today is Sunday
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)
            autoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          } else if (mapping.uiDay === 6) { // Saturday - find next Saturday
            const daysUntilSaturday = (6 - currentDayOfWeek + 7) % 7 || 7
            const saturday = new Date(now)
            saturday.setDate(now.getDate() + daysUntilSaturday)
            saturday.setHours(0, 0, 0, 0)
            autoDate = `${saturday.getFullYear()}-${String(saturday.getMonth() + 1).padStart(2, '0')}-${String(saturday.getDate()).padStart(2, '0')}`
          } else if (mapping.uiDay === 0) { // Sunday - find next Sunday
            const daysUntilSunday = (0 - currentDayOfWeek + 7) % 7 || 7
            const sunday = new Date(now)
            sunday.setDate(now.getDate() + daysUntilSunday)
            sunday.setHours(0, 0, 0, 0)
            autoDate = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`
          }
          
          // Use database date first, then auto-calculated date
          const finalDateEmpty = selectedDateFromDB || autoDate
          
          // If no date in database but we have an auto date, save it to database
          if (!selectedDateFromDB && autoDate && emptyConfig) {
            // Update existing day_config with auto-calculated date
            await supabase
              .from('day_config')
              .update({ selected_date: autoDate, updated_at: new Date().toISOString() })
              .eq('id', emptyConfig.id)
          } else if (!selectedDateFromDB && autoDate && !emptyConfig) {
            // Create new day_config with auto-calculated date
            await supabase
              .from('day_config')
              .insert({
                user_id: effectiveUserId,
                day_of_week: mapping.dbDay,
                medication_name: '',
                is_active: false, // Not active until medications are added
                selected_date: autoDate
              })
          }
          
          // Calculate day name from selectedDate (if available)
          let displayNameEmpty = dayName
          if (finalDateEmpty) {
            try {
              const dateObj = new Date(finalDateEmpty + 'T00:00:00')
              const dayOfWeekFromDate = dateObj.getDay() // 0 = Sunday, 6 = Saturday
              displayNameEmpty = getDayName(dayOfWeekFromDate)
            } catch (e) {
              // If date parsing fails, use default dayName
              displayNameEmpty = dayName
            }
          }
          
          dayData.push({
            dayOfWeek: mapping.uiDay, // Use UI day_of_week (6 or 0)
            name: displayNameEmpty, // Use calculated day name from selectedDate
            selectedDate: finalDateEmpty,
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
            timeFrameRequireConfirmation: { morning: false, afternoon: false, evening: false }, // Default: automatic dispense (OFF)
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
      daysRef.current = dayData // Update ref with latest data
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

  // Find the earliest/nearest scheduled time frame across all days
  // For force dispense, bypass date check and find ANY scheduled time frame
  const findEarliestScheduledTimeFrame = (bypassDateCheck: boolean = false): { dayOfWeek: number; timeFrame: 'morning' | 'afternoon' | 'evening' } | null => {
    console.log('🔍 findEarliestScheduledTimeFrame called with bypassDateCheck:', bypassDateCheck)
    
    // Use ref to get latest days state (avoids closure issues)
    const currentDays = daysRef.current.length > 0 ? daysRef.current : days
    console.log('📋 Days from ref:', daysRef.current)
    console.log('📋 Days from state:', days)
    console.log('📋 Using days:', currentDays)
    console.log('📋 Days length:', currentDays?.length || 0)
    
    if (!currentDays || currentDays.length === 0) {
      console.log('⚠️ Days array is empty!')
      return null
    }
    
    console.log('📋 Available days:', currentDays.map(d => ({
      name: d.name,
      dayOfWeek: d.dayOfWeek,
      selectedDate: d.selectedDate,
      isToday: isDateToday(d.selectedDate),
      morning: { 
        time: d.timeFrameTimes?.morning || null, 
        meds: (d.medications?.morning || []).length,
        medNames: (d.medications?.morning || []).map((m: any) => m.medication_name || m.name || 'unknown')
      },
      afternoon: { 
        time: d.timeFrameTimes?.afternoon || null, 
        meds: (d.medications?.afternoon || []).length,
        medNames: (d.medications?.afternoon || []).map((m: any) => m.medication_name || m.name || 'unknown')
      },
      evening: { 
        time: d.timeFrameTimes?.evening || null, 
        meds: (d.medications?.evening || []).length,
        medNames: (d.medications?.evening || []).map((m: any) => m.medication_name || m.name || 'unknown')
      }
    })))
    
    const now = getPhilippineTime()
    const currentTime = new Date(now)
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    const currentMinutes = currentHour * 60 + currentMinute
    
    console.log(`⏰ Current time: ${currentHour}:${String(currentMinute).padStart(2, '0')} (${currentMinutes} minutes)`)
    
    let earliestTimeFrame: { dayOfWeek: number; timeFrame: 'morning' | 'afternoon' | 'evening'; timeMinutes: number } | null = null
    
    // Check all days and time frames
    for (const day of currentDays) {
      // Skip date check only if bypassDateCheck is true (for force dispense)
      if (!bypassDateCheck && !isDateToday(day.selectedDate)) {
        console.log(`⏭️ Skipping ${day.name} - date not today (${day.selectedDate})`)
        continue
      }
      
      console.log(`✅ Checking ${day.name} (date: ${day.selectedDate}, bypassDateCheck: ${bypassDateCheck})`)
      console.log(`   Full day object:`, {
        timeFrameTimes: day.timeFrameTimes,
        medications: day.medications
      })
      
      for (const tf of ['morning', 'afternoon', 'evening'] as const) {
        // Safely access timeFrameTimes and medications
        const scheduledTime = day.timeFrameTimes?.[tf] || null
        const medications = day.medications?.[tf] || []
        const hasMedications = medications.length > 0
        
        console.log(`  ${tf}:`, {
          scheduledTime: scheduledTime,
          scheduledTimeType: typeof scheduledTime,
          scheduledTimeLength: scheduledTime?.length,
          medications: medications,
          medicationsLength: medications.length,
          hasMedications: hasMedications,
          medicationNames: medications.map((m: any) => m.medication_name || m.name || 'unknown')
        })
        
        // Check if scheduledTime is valid (not null, not empty string)
        const hasValidTime = scheduledTime !== null && scheduledTime !== '' && scheduledTime.trim() !== ''
        
        if (hasValidTime && hasMedications) {
          // Skip if this time frame was already dispensed (including skipped schedules)
          const dispensedFrames = day.dispensedTimeFrames || []
          if (dispensedFrames.includes(tf)) {
            console.log(`    ⏭️ Skipping ${tf} - already dispensed or skipped`)
            continue
          }
          
          const timeParts = scheduledTime.split(':')
          if (timeParts.length !== 2) {
            console.log(`    ⚠️ Invalid time format: ${scheduledTime}`)
            continue
          }
          
          const [hour, minute] = timeParts.map(Number)
          if (isNaN(hour) || isNaN(minute)) {
            console.log(`    ⚠️ Invalid time numbers: ${scheduledTime}`)
            continue
          }
          
          let timeMinutes = hour * 60 + minute
          
          console.log(`    ✅ Found scheduled ${tf} at ${scheduledTime} (${timeMinutes} minutes)`)
          
          // Handle evening wrap-around (16:05 to 00:00)
          if (tf === 'evening' && timeMinutes === 0) {
            timeMinutes = 1440 // Treat 00:00 as end of day (24:00)
          }
          
          // Calculate time difference (handle wrap-around)
          let timeDiff = timeMinutes - currentMinutes
          if (timeDiff < 0) {
            timeDiff += 1440 // Next day
          }
          
          console.log(`    ⏱️ Time difference: ${timeDiff} minutes`)
          
          if (!earliestTimeFrame || timeDiff < earliestTimeFrame.timeMinutes) {
            earliestTimeFrame = {
              dayOfWeek: day.dayOfWeek,
              timeFrame: tf,
              timeMinutes: timeDiff
            }
            console.log(`    🎯 New earliest: ${day.name} ${tf} (${timeDiff} minutes away)`)
          }
        } else {
          if (!hasValidTime) {
            console.log(`    ⏭️ Skipping ${tf} - no valid scheduled time (value: "${scheduledTime}")`)
          }
          if (!hasMedications) {
            console.log(`    ⏭️ Skipping ${tf} - no medications (count: ${medications.length})`)
          }
        }
      }
    }
    
    const result = earliestTimeFrame ? { dayOfWeek: earliestTimeFrame.dayOfWeek, timeFrame: earliestTimeFrame.timeFrame } : null
    console.log('🔍 Final result:', result)
    return result
  }

  // Force dispense the earliest scheduled time frame (bypasses all restrictions)
  const handleForceDispense = async () => {
    console.log('🔧 Force dispense triggered - finding earliest scheduled time frame...')
    console.log('📊 Current days state:', days)
    console.log('📊 Days ref state:', daysRef.current)
    console.log('📊 Days length:', days.length)
    
    // Use ref to get latest state (avoids stale closure issues)
    const currentDays = daysRef.current.length > 0 ? daysRef.current : days
    console.log('📊 Using days:', currentDays)
    
    if (!currentDays || currentDays.length === 0) {
      console.log('⚠️ Days array is empty or not loaded yet')
      showNotification('No schedule data loaded. Please wait a moment and try again.', 'warning')
      return
    }
    
    // Find earliest scheduled time frame (bypass all checks)
    const earliest = findEarliestScheduledTimeFrame(true) // Bypass date check
    
    console.log('🔍 Earliest scheduled time frame found:', earliest)
    
    if (!earliest) {
      console.log('⚠️ No scheduled medications found')
      console.log('📋 Available days:', currentDays.map(d => ({
        name: d.name,
        morning: { time: d.timeFrameTimes?.morning, meds: d.medications?.morning?.length || 0 },
        afternoon: { time: d.timeFrameTimes?.afternoon, meds: d.medications?.afternoon?.length || 0 },
        evening: { time: d.timeFrameTimes?.evening, meds: d.medications?.evening?.length || 0 }
      })))
      showNotification('No scheduled medications found to dispense.', 'warning')
      return
    }
    
    const day = currentDays.find(d => d.dayOfWeek === earliest.dayOfWeek)
    if (!day) {
      console.log('⚠️ Day not found for dayOfWeek:', earliest.dayOfWeek)
      return
    }
    
    console.log(`✅ Force dispensing ${day.name} ${TIME_FRAMES[earliest.timeFrame].label}...`)
    console.log(`📋 Day details:`, {
      name: day.name,
      selectedDate: day.selectedDate,
      timeFrame: earliest.timeFrame,
      scheduledTime: day.timeFrameTimes[earliest.timeFrame],
      medications: day.medications[earliest.timeFrame]?.length || 0
    })
    
    showNotification(`Force dispensing ${day.name} ${TIME_FRAMES[earliest.timeFrame].label}...`, 'info')
    
    // Call handleDispense with force flag (skip ALL checks - no connection check, no date check, no restrictions)
    await handleDispense(earliest.dayOfWeek, earliest.timeFrame, true, true)
  }

  // Helper function to perform the actual dispense
  const performDispense = async (
    dayOfWeek: number,
    targetTimeFrame: 'morning' | 'afternoon' | 'evening',
    day: DayData,
    frameMedications: Medication[],
    scheduledTime: string,
    medicationNames: string
  ) => {
    // Update UI to show dispensing
    setDays(prevDays => 
      prevDays.map(d => 
        d.dayOfWeek === dayOfWeek 
          ? { ...d, status: 'dispensing' }
          : d
      )
    )

    // Calculate target angle for this specific time frame
    const targetAngle = getAngleForTimeFrame(dayOfWeek, targetTimeFrame)
    const currentAngle = lastServo1Angle ?? 0
    
    console.log(`🎯 Time frame dispense: ${day.name} ${TIME_FRAMES[targetTimeFrame].label} → Target angle: ${targetAngle}° (Current: ${currentAngle}°)`)
    
    // Move directly to the target angle for this time frame
    const response = await dispenseToPi('servo1', medicationNames, targetAngle, day.selectedDate || undefined, scheduledTime, targetTimeFrame)
    console.log('✅ Manual dispense bundle response:', response)
    
    // Update last known servo1 angle from response
    if (response?.servo1_angle !== undefined) {
      setLastServo1Angle(response.servo1_angle)
    }
    
    return response
  }

  const handleDispense = async (dayOfWeek: number, timeFrame?: 'morning' | 'afternoon' | 'evening', skipTimeWindowCheck: boolean = false, forceDispense: boolean = false) => {
    // Check Pi connection first (skip for force dispense)
    if (!forceDispense && !piConnected) {
      showNotification('Not connected to Raspberry Pi! Make sure the server is running.', 'warning')
      return
    }
    
    // For force dispense, silently proceed even if not connected (connection will be checked when sending command)
    if (forceDispense && !piConnected) {
      console.log('⚠️ Force dispense: Pi connection status unknown, proceeding anyway')
      // Don't show notification - just proceed silently
    }

    // Declare variables outside try block so they're accessible in catch block
    let targetTimeFrame: 'morning' | 'afternoon' | 'evening' | null = timeFrame || null
    let frameMedications: Medication[] = []

    try {
      // Use ref for latest state when force dispense (avoids stale closure issues)
      const currentDays = forceDispense ? (daysRef.current.length > 0 ? daysRef.current : days) : days
      const day = currentDays.find(d => d.dayOfWeek === dayOfWeek)
      if (!day) {
        console.log('⚠️ Day not found for dayOfWeek:', dayOfWeek, 'forceDispense:', forceDispense)
        return
      }
      
      const currentTime = new Date(getPhilippineTime())
      const currentHour = currentTime.getHours()
      const currentMinute = currentTime.getMinutes()
      const currentTimeMinutes = currentHour * 60 + currentMinute
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`
      
      // If timeFrame provided, dispense that bundle; otherwise find next available bundle
      targetTimeFrame = timeFrame || null
      
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
        
        // If all time frames are dispensed, move to next day (Saturday <-> Sunday)
        if (!targetTimeFrame) {
          const nextDayOfWeek = dayOfWeek === 6 ? 0 : 6 // Saturday -> Sunday, Sunday -> Saturday
          const nextDay = currentDays.find(d => d.dayOfWeek === nextDayOfWeek)
          if (nextDay) {
            showNotification(`All time frames for ${day.name} have been dispensed. Moving to ${nextDay.name}.`, 'info')
            // Reset current day's dispensed frames and move to next day
            setDays(prevDays => {
              const updated = prevDays.map(d => 
                d.dayOfWeek === dayOfWeek 
                  ? { ...d, dispensedTimeFrames: [] }
                  : d
              )
              daysRef.current = updated // Update ref
              return updated
            })
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
      
      // Check if current time is within the scheduled time frame
      const frameInfo = TIME_FRAMES[targetTimeFrame]
      const scheduledTime = day.timeFrameTimes[targetTimeFrame]
      
      if (!scheduledTime) {
        showNotification(`No time set for ${frameInfo.label}. Please set a time first.`, 'warning')
        return
      }
      
      // Parse scheduled time
      const [scheduledHour, scheduledMin] = scheduledTime.split(':').map(Number)
      const scheduledMinutes = scheduledHour * 60 + scheduledMin
      
      // Check if current time is within the time frame window (30 min before to 30 min after scheduled time)
      // This is only for showing confirmation - we don't block dispensing
      const timeWindowStart = scheduledMinutes - 30
      const timeWindowEnd = scheduledMinutes + 30
      
      // Handle time window that wraps around midnight
      let isInTimeWindow = false
      if (timeWindowStart < 0) {
        // Window wraps around midnight (e.g., 23:30 - 00:30)
        isInTimeWindow = currentTimeMinutes >= (1440 + timeWindowStart) || currentTimeMinutes <= timeWindowEnd
      } else if (timeWindowEnd >= 1440) {
        // Window extends past midnight (e.g., 23:30 - 00:30)
        isInTimeWindow = currentTimeMinutes >= timeWindowStart || currentTimeMinutes <= (timeWindowEnd - 1440)
      } else {
        // Normal window within same day
        isInTimeWindow = currentTimeMinutes >= timeWindowStart && currentTimeMinutes <= timeWindowEnd
      }
      
      // Show confirmation dialog if outside time window (but don't block - user can still confirm)
      // Skip this check if force dispense is enabled
      if (!isInTimeWindow && !skipTimeWindowCheck && !forceDispense) {
        const confirmed = await showConfirm('OUTSIDE THE TIMEFRAME - ARE YOU SURE?')
        if (!confirmed) {
          return
        }
      }
      
      // Check if dispensing early (before scheduled time)
      let isEarlyDispense = false
      if (currentTimeMinutes < scheduledMinutes) {
        isEarlyDispense = true
      }
      
      // Get all medications in the target time frame (bundle)
      frameMedications = day.medications[targetTimeFrame] || []
      
      if (frameMedications.length === 0) {
        showNotification(`No medications in ${TIME_FRAMES[targetTimeFrame].label} to dispense!`, 'warning')
        return
      }
      
      // Check if the date matches today - only allow dispensing if date is today
      // Skip this check if force dispense is enabled
      if (!forceDispense && !isDateToday(day.selectedDate)) {
        showNotification(`Cannot dispense - date must be today. Current date: ${day.selectedDate || 'not set'}. Please sync the date first.`, 'warning')
        return
      }
      
      // Progressive dispense check: can't dispense later time frames if earlier ones with schedules haven't been dispensed
      // Skip this check if force dispense is enabled
      if (!forceDispense && hasUndispensedEarlierTimeFrames(day, targetTimeFrame, lastServo1Angle)) {
        const earlierFrames = []
        const frameOrder: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening']
        const targetIndex = frameOrder.indexOf(targetTimeFrame)
        
        for (let i = 0; i < targetIndex; i++) {
          const earlierFrame = frameOrder[i]
          const hasMedications = (day.medications[earlierFrame] || []).length > 0
          const hasScheduledTime = day.timeFrameTimes[earlierFrame] !== null && day.timeFrameTimes[earlierFrame] !== ''
          
          if (hasMedications && hasScheduledTime && !isTimeFrameDispensedByAngle(lastServo1Angle, dayOfWeek, earlierFrame)) {
            earlierFrames.push(TIME_FRAMES[earlierFrame].label)
          }
        }
        
        showNotification(`Previous medicine hasn't been dispensed yet. Please dispense ${earlierFrames.join(' and ')} first.`, 'warning')
        return
      }
      
      const medicationNames = frameMedications.map(m => m.medication_name).join(', ')

      // Check if confirmation is required for this time frame
      // Ensure targetTimeFrame is not null before checking
      if (!targetTimeFrame) {
        showNotification('No time frame selected. Please select a time frame to dispense.', 'warning')
        return
      }
      
      const requireConfirmation = day.timeFrameRequireConfirmation[targetTimeFrame] ?? false
      
      // If confirmation is required and not force dispense, show confirmation dialog
      if (requireConfirmation && !forceDispense) {
        // Store targetTimeFrame in a const to ensure it's not null in the closure
        const confirmedTimeFrame: 'morning' | 'afternoon' | 'evening' = targetTimeFrame
        return new Promise<void>((resolve) => {
          setServo2ConfirmDialog({
            onConfirm: async () => {
              setServo2ConfirmDialog(null)
              
              // Perform the actual dispense
              try {
                // Update UI to show dispensing
                setDays(prevDays => 
                  prevDays.map(d => 
                    d.dayOfWeek === dayOfWeek 
                      ? { ...d, status: 'dispensing' }
                      : d
                  )
                )

                // Calculate target angle for this specific time frame
                const targetAngle = getAngleForTimeFrame(dayOfWeek, confirmedTimeFrame)
                const currentAngle = lastServo1Angle ?? 0
                
                console.log(`🎯 Time frame dispense: ${day.name} ${TIME_FRAMES[confirmedTimeFrame].label} → Target angle: ${targetAngle}° (Current: ${currentAngle}°)`)
                
                // Move directly to the target angle for this time frame
                const response = await dispenseToPi('servo1', medicationNames, targetAngle, day.selectedDate || undefined, scheduledTime, confirmedTimeFrame)
                console.log('✅ Manual dispense bundle response:', response)
                
                // Update last known servo1 angle from response
                if (response?.servo1_angle !== undefined) {
                  setLastServo1Angle(response.servo1_angle)
                }
                
                // Continue with rest of dispense logic (SMS, status updates, etc.)
                // This will be handled by the existing code flow below
                // For now, we'll just mark as successful and let the rest of the function handle it
                if (response?.success) {
                  showNotification(`✅ Dispensed ${medicationNames} for ${TIME_FRAMES[confirmedTimeFrame].label}!`, 'success')
                  
                  // Mark this time frame as dispensed
                  setDays(prevDays => 
                    prevDays.map(d => 
                      d.dayOfWeek === dayOfWeek 
                        ? { 
                            ...d, 
                            status: 'ready',
                            dispensedTimeFrames: [...(d.dispensedTimeFrames || []), confirmedTimeFrame]
                          }
                        : d
                    )
                  )
                } else {
                  throw new Error(response?.error || 'Dispense failed')
                }
              } catch (error: any) {
                console.error('Dispense error:', error)
                showNotification(`Error: ${error?.message || 'Failed to dispense'}`, 'error')
                setDays(prevDays => 
                  prevDays.map(d => 
                    d.dayOfWeek === dayOfWeek 
                      ? { ...d, status: 'ready' }
                      : d
                  )
                )
              }
              
              resolve()
            },
            onCancel: () => {
              setServo2ConfirmDialog(null)
              showNotification('Dispense cancelled', 'info')
              resolve()
            },
            timeFrame: confirmedTimeFrame
          })
        })
      }

      // Automatic dispense (no confirmation required)
      // Update UI to show dispensing
      setDays(prevDays => 
        prevDays.map(d => 
          d.dayOfWeek === dayOfWeek 
            ? { ...d, status: 'dispensing' }
            : d
        )
      )

      // Calculate target angle for this specific time frame
      // Each time frame moves directly to its designated angle
      // Saturday: Morning=30°, Afternoon=60°, Evening=90°
      // Sunday: Morning=120°, Afternoon=150°, Evening=180°
      const targetAngle = getAngleForTimeFrame(dayOfWeek, targetTimeFrame)
      const currentAngle = lastServo1Angle ?? 0
      
      console.log(`🎯 Time frame dispense: ${day.name} ${TIME_FRAMES[targetTimeFrame].label} → Target angle: ${targetAngle}° (Current: ${currentAngle}°)`)
      
      // Move directly to the target angle for this time frame
      // If already at target, it will stay there (server handles this)
      const response = await dispenseToPi('servo1', medicationNames, targetAngle, day.selectedDate || undefined, scheduledTime, targetTimeFrame)
      console.log('✅ Manual dispense bundle response:', response)
      
      // Update last known servo1 angle from response
      if (response?.servo1_angle !== undefined) {
        setLastServo1Angle(response.servo1_angle)
      }
      
      // Check if servo1 is at 180° (needs confirmation to reset)
      const isAt180 = response?.servo1_at_180 === true
      const servo2Ready = response?.servo2_ready === true
      const requiresConfirmation = response?.requires_confirmation === true
      
      console.log('🔍 Dispense response details:', {
        status: response?.status,
        servo2_ready: servo2Ready,
        requires_confirmation: requiresConfirmation,
        servo1_at_180: isAt180,
        showAfterNextDispense: servo2DialogState.showAfterNextDispense
      })
      
      // Send SMS notification BEFORE showing confirmation dialog
      // Format: "The [medicines] for [timeframe] is/are ready to dispense"
      if (response?.status === 'success' && !forceDispense) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user && piConnected) {
            // Get owner's phone number from profiles table
            // (caregivers use owner's profile for SMS notifications)
            const effectiveUserIdForSMS = isOwner ? session.user.id : (ownerUserId || session.user.id)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('phone_number')
              .eq('id', effectiveUserIdForSMS)
              .single()

            if (profileData?.phone_number) {
              // Convert phone number to +63 format
              let phoneNumber = profileData.phone_number.trim().replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\./g, '')
              
              // Remove + if present
              if (phoneNumber.startsWith('+')) {
                phoneNumber = phoneNumber.substring(1)
              }
              
              // Remove country code 63 if present
              if (phoneNumber.startsWith('63')) {
                phoneNumber = phoneNumber.substring(2)
              }
              
              // Remove leading 0 if present (Philippine format)
              if (phoneNumber.startsWith('0')) {
                phoneNumber = phoneNumber.substring(1)
              }
              
              // Convert to +63 format (should be 10 digits now)
              if (phoneNumber.length === 10 && /^\d+$/.test(phoneNumber)) {
                phoneNumber = '+63' + phoneNumber
              } else {
                // If format is wrong, try to use as-is (server will handle conversion)
                console.warn(`⚠️ Phone number format may be incorrect: ${profileData.phone_number}`)
                phoneNumber = profileData.phone_number
              }
              
              // Format message: "The [medicines] for [timeframe] is/are ready to dispense"
              const medicationCount = frameMedications.length
              const medicationList = medicationNames
              const timeframeLabel = TIME_FRAMES[targetTimeFrame].label
              const isAre = medicationCount === 1 ? 'is' : 'are'
              
              const smsMessage = `The ${medicationList} for ${timeframeLabel} ${isAre} ready to dispense.`
              
              // Send SMS via Pi WebSocket (SIMCOM module)
              console.log(`📱 Attempting to send SMS to ${phoneNumber} (original: ${profileData.phone_number}): "${smsMessage}"`)
              const smsResult = await sendSmsViaPi([phoneNumber], smsMessage)
              console.log('📱 SMS result:', smsResult)
              
              if (smsResult?.success || smsResult?.status === 'queued') {
                console.log(`✅ SMS notification queued/sent: "${smsMessage}"`)
              } else {
                console.warn('⚠️ SMS notification failed:', smsResult)
              }
            } else {
              console.log('ℹ️ No phone number found in profile, skipping SMS notification')
            }
          }
        } catch (smsError) {
          console.error('Error sending SMS notification:', smsError)
          // Don't block dispense if SMS fails
        }
      }
      
      // Show confirmation dialog after successful dispense
      // Skip dialog if force dispense is enabled
      if (response?.status === 'success' && !forceDispense) {
        // Check if we should show dialog based on state
        if (servo2DialogState.showAfterNextDispense) {
          console.log('✅ Dispense successful, showing confirmation dialog')
          if (isAt180) {
            console.log('🔄 Servo1 is at 180° - will reset to 0° if confirmed')
          }
          
          // Create dialog config with schedule info for LCD tracking
          const dialogConfig = createServo2DialogConfig(isAt180, () => {}, day.selectedDate || undefined, scheduledTime, targetTimeFrame)
          
          // Set dialog (does NOT auto-close - user must click Yes or No or press button)
          setServo2ConfirmDialog(dialogConfig)
          console.log('✅ Dialog set - should be visible now')
        } else {
          console.log('⏭️ Skipping dialog - waiting for timeout or next dispense (user clicked NO twice)')
        }
      } else if (response?.status === 'success' && forceDispense) {
        console.log('🔧 Force dispense - skipping dialog, servo2 will move automatically')
        // For force dispense, automatically trigger servo2 movement after 1 second
        setTimeout(async () => {
          console.log('🎯 Force dispense: Automatically moving servo2 after 1 second delay')
          try {
            const servo2Response = await confirmServo2Dispense(day.selectedDate || undefined, scheduledTime, targetTimeFrame || undefined)
            if (servo2Response?.status === 'success') {
              if (isAt180 && servo2Response?.servo1_reset) {
                setLastServo1Angle(0)
                showNotification('Force dispense complete! App reset - ready for next cycle.', 'success')
              } else {
                showNotification('Force dispense complete!', 'success')
              }
            } else {
              showNotification('Force dispense failed', 'error')
            }
          } catch (error: any) {
            console.error('❌ Error in force dispense servo2:', error)
            showNotification(`Error: ${error.message || 'Failed'}`, 'error')
          }
        }, 1000)
      } else {
        console.log('⚠️ Dispense failed or no response:', response)
      }

          // Update last dispensed time and mark this time frame as dispensed
          setDays(prevDays => {
            const updated = prevDays.map(d => {
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
            daysRef.current = updated // Update ref
            return updated
          })


      // Log dispense success for each medication in bundle
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const actionType = skipTimeWindowCheck ? 'auto' : 'manual'
          const actionLabel = skipTimeWindowCheck ? 'Auto' : (isEarlyDispense ? 'Early Manual' : 'Manual')
          for (const med of frameMedications) {
            // Use owner's user_id for dispense history (caregiver dispenses are recorded under owner's account)
            const effectiveUserIdForHistory = isOwner ? session.user.id : (ownerUserId || session.user.id)
            await supabase.from('dispense_history').insert({
              user_id: effectiveUserIdForHistory,
              servo_number: 1, // Always servo1
              medication_name: med.medication_name,
              action: actionType,
              status: 'success',
              notes: `${actionLabel} dispense bundle from ${day?.name || 'dashboard'} at ${currentTimeStr} (${targetTimeFrame}) - ${medicationNames}`
            })
          }
        }
      } catch (logErr) {
        console.error('Log dispense error:', logErr)
      }

      // Send SMS notification via Pi (SIMCOM module) - Multiple recipients
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && piConnected) {
          // Get owner's phone number and emergency contact from profiles table
          // (caregivers use owner's profile for SMS notifications)
          const effectiveUserIdForSMS = isOwner ? session.user.id : (ownerUserId || session.user.id)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('phone_number, emergency_contact')
            .eq('id', effectiveUserIdForSMS)
            .single()

          // Helper function to convert phone number to +63 format
          const convertToPlus63 = (phone: string): string => {
            let phoneNum = phone.trim().replace(/\s+/g, '').replace(/-/g, '').replace(/\(/g, '').replace(/\)/g, '').replace(/\./g, '')
            
            // Remove + if present
            if (phoneNum.startsWith('+')) {
              phoneNum = phoneNum.substring(1)
            }
            
            // Remove country code 63 if present
            if (phoneNum.startsWith('63')) {
              phoneNum = phoneNum.substring(2)
            }
            
            // Remove leading 0 if present (Philippine format)
            if (phoneNum.startsWith('0')) {
              phoneNum = phoneNum.substring(1)
            }
            
            // Convert to +63 format (should be 10 digits now)
            if (phoneNum.length === 10 && /^\d+$/.test(phoneNum)) {
              return '+63' + phoneNum
            } else {
              // If format is wrong, try to use as-is (server will handle conversion)
              console.warn(`⚠️ Phone number format may be incorrect: ${phone}`)
              return phone
            }
          }
          
          // Collect all phone numbers to send SMS to
          const phoneNumbers: string[] = []
          
          // Add main phone number
          if (profileData?.phone_number) {
            phoneNumbers.push(convertToPlus63(profileData.phone_number))
          }
          
          // Extract phone number from emergency contact (format: "Name 09171234567" or just "09171234567")
          if (profileData?.emergency_contact) {
            const emergencyContact = profileData.emergency_contact.trim()
            // Try to extract phone number (look for pattern like 09XXXXXXXXX or +63XXXXXXXXX)
            const phoneMatch = emergencyContact.match(/(\+?63|0)?9\d{9}/)
            if (phoneMatch) {
              let emergencyPhone = phoneMatch[0]
              phoneNumbers.push(convertToPlus63(emergencyPhone))
            }
          }
          
          if (phoneNumbers.length > 0) {
                        const smsMessage = `${medicationNames}`
            
            // Send SMS via Pi WebSocket (SIMCOM module) to all recipients
            console.log(`📱 Attempting to send SMS to ${phoneNumbers.length} recipient(s): "${smsMessage}"`)
            console.log(`📱 Phone numbers: ${phoneNumbers.join(', ')}`)
            const smsResult = await sendSmsViaPi(phoneNumbers, smsMessage)
            console.log('📱 SMS result:', smsResult)
            
            if (smsResult?.success || smsResult?.status === 'queued') {
              console.log(`✅ SMS notification queued/sent to ${phoneNumbers.length} recipient(s):`, smsResult)
            } else {
              console.warn('⚠️ SMS notification failed:', smsResult)
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
        setDays(prevDays => {
          const updated = prevDays.map(d => 
            d.dayOfWeek === dayOfWeek 
              ? { ...d, status: 'ready' }
              : d
          )
          daysRef.current = updated // Update ref
          return updated
        })
      }, 3000)

      } catch (error: any) {
      console.error('Error dispensing bundle:', error)
      showNotification(`Error: ${error.message}`, 'error')
      // Log dispense error
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && frameMedications.length > 0) {
          const actionType = skipTimeWindowCheck ? 'auto' : 'manual'
          for (const med of frameMedications) {
            // Use owner's user_id for dispense history (caregiver dispenses are recorded under owner's account)
            const effectiveUserIdForHistory = isOwner ? session.user.id : (ownerUserId || session.user.id)
            await supabase.from('dispense_history').insert({
              user_id: effectiveUserIdForHistory,
              servo_number: 1, // Always servo1
              medication_name: med.medication_name,
              action: actionType,
              status: 'error',
              notes: error instanceof Error ? error.message : (error?.message || `${actionType} dispense bundle error`)
            })
          }
        }
      } catch (logErr) {
        console.error('Log dispense error (insert) failed:', logErr)
      }
      
      // Reset status on error
      setDays(prevDays => {
        const updated = prevDays.map(d => 
          d.dayOfWeek === dayOfWeek 
            ? { ...d, status: 'ready' }
            : d
        )
        daysRef.current = updated // Update ref
        return updated
      })
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

      // Always use ownerUserId for caregivers, current user ID for owners
      // This ensures caregivers save to the owner's account
      let effectiveUserId = isOwner ? session.user.id : (ownerUserId || session.user.id)
      
      // Safety check: if we're a caregiver but ownerUserId is not set, try to resolve it
      if (!isOwner && !ownerUserId) {
        console.log('⚠️ Caregiver detected but ownerUserId not set, resolving...')
        const resolved = await resolveOwner()
        if (resolved) {
          effectiveUserId = resolved.ownerUserId
        }
      }
      
      console.log('💾 Saving with effectiveUserId:', effectiveUserId, '(isOwner:', isOwner, ', ownerUserId:', ownerUserId, ')')

      const dayOfWeek = editingTimeFrameTime.dayOfWeek
      const timeFrame = editingTimeFrameTime.timeFrame
      const dayName = getDayName(dayOfWeek)
      const frameInfo = TIME_FRAMES[timeFrame as keyof typeof TIME_FRAMES]
      
      // UI day_of_week matches database day_of_week (6=Saturday, 0=Sunday)
      const dbDayOfWeek = dayOfWeek // Direct mapping: 6 = Saturday, 0 = Sunday

      // Validate time is within time frame range
      const medTime = timeFrameTime.slice(0, 5) // HH:MM
      const [medHour, medMin] = medTime.split(':').map(Number)
      const medMinutes = medHour * 60 + medMin
      
      const [startHour, startMin] = frameInfo.start.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const [endHour, endMin] = frameInfo.end.split(':').map(Number)
      const endMinutes = endHour * 60 + endMin
      
      // Handle evening frame that wraps around midnight (16:05 to 00:00)
      let isInRange = false
      if (timeFrame === 'evening') {
        // Evening: 16:05 (965 minutes) to 00:00 (0 minutes, wraps around)
        // Valid times: 16:05 (965) to 23:59 (1439) OR exactly 00:00 (0)
        isInRange = medMinutes >= 965 || medMinutes === 0
      } else {
        isInRange = medMinutes >= startMinutes && medMinutes <= endMinutes
      }
      
      if (!isInRange) {
        showNotification('Invalid time, try again', 'error')
        return
      }

      // Get or create day_config
      const { data: existingConfig } = await supabase
        .from('day_config')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('day_of_week', dbDayOfWeek) // Use mapped value
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

      // Always use ownerUserId for caregivers, current user ID for owners
      // This ensures caregivers save to the owner's account
      let effectiveUserId = isOwner ? session.user.id : (ownerUserId || session.user.id)
      
      // Safety check: if we're a caregiver but ownerUserId is not set, try to resolve it
      if (!isOwner && !ownerUserId) {
        console.log('⚠️ Caregiver detected but ownerUserId not set, resolving...')
        const resolved = await resolveOwner()
        if (resolved) {
          effectiveUserId = resolved.ownerUserId
        }
      }
      
      console.log('💾 Saving with effectiveUserId:', effectiveUserId, '(isOwner:', isOwner, ', ownerUserId:', ownerUserId, ')')

      const dayOfWeek = context.dayOfWeek
      const timeFrame = context.timeFrame
      const dayName = getDayName(dayOfWeek)
      
      // UI day_of_week matches database day_of_week (6=Saturday, 0=Sunday)
      const dbDayOfWeek = dayOfWeek // Direct mapping: 6 = Saturday, 0 = Sunday

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
          .select('id, is_active')
          .eq('user_id', effectiveUserId)
          .eq('day_of_week', dbDayOfWeek) // Use mapped value
          .maybeSingle()

        let dayConfigId

        if (existingConfig) {
          dayConfigId = existingConfig.id
          // Ensure is_active is true when adding medication
          if (!existingConfig.is_active) {
            const { error: updateError } = await supabase
              .from('day_config')
              .update({ is_active: true, updated_at: new Date().toISOString() })
              .eq('id', dayConfigId)
            if (updateError) {
              console.error('Error activating day_config:', updateError)
            }
          }
        } else {
          // Create new day_config
          const { data: newConfig, error: insertError } = await supabase
            .from('day_config')
            .insert({
              user_id: effectiveUserId,
              day_of_week: dbDayOfWeek, // Use mapped value (0 or 6)
              medication_name: '', // No single medication name anymore
              is_active: true
            })
            .select()
            .single()

          if (insertError) throw insertError
          dayConfigId = newConfig.id
        }

        // Save new medication to time_frame_medications table (time is at time frame level, not per medication)
       const { data: existingMed } = await supabase
          .from('time_frame_medications')
          .select('id')
          .eq('day_config_id', dayConfigId)
          .eq('time_frame', timeFrame)
          .eq('medication_name', newMedication.name.trim())
          .maybeSingle()

        if (existingMed) {
          showNotification('Error: Can\'t add, Same medication', 'error')
          setAddingMedication(null)
          setNewMedication({ name: '' })
          return
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

        // Small delay to ensure database transaction completes
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Refresh data to show the new medication
        await fetchDayData()
        
        setAddingMedication(null)
        const medicationName = newMedication.name
        setNewMedication({ name: '' })
        
        // Show confirmation preference dialog right after adding medicine
        setConfirmationPreferenceDialog({
          dayOfWeek: dayOfWeek,
          timeFrame: timeFrame as 'morning' | 'afternoon' | 'evening',
          medicationName: medicationName
        })
        
        showNotification(`${medicationName} added to ${dayName} ${TIME_FRAMES[timeFrame as keyof typeof TIME_FRAMES].label}!`, 'success')
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

  const handleDeleteAllMedications = async (dayOfWeek: number, timeFrame: 'morning' | 'afternoon' | 'evening') => {
    const day = days.find(d => d.dayOfWeek === dayOfWeek)
    if (!day) return
    
    const medications = day.medications[timeFrame]
    if (medications.length === 0) {
      showNotification(`No medications in ${TIME_FRAMES[timeFrame].label} to delete`, 'warning')
      return
    }

    const confirmed = await showConfirm(`Delete all ${medications.length} medication(s) in ${TIME_FRAMES[timeFrame].label}?`)
    if (!confirmed) return

    try {
      const session = await refreshSessionIfNeeded()
      if (!session) return

      // Always use ownerUserId for caregivers, current user ID for owners
      // This ensures caregivers save to the owner's account
      let effectiveUserId = isOwner ? session.user.id : (ownerUserId || session.user.id)
      
      // Safety check: if we're a caregiver but ownerUserId is not set, try to resolve it
      if (!isOwner && !ownerUserId) {
        console.log('⚠️ Caregiver detected but ownerUserId not set, resolving...')
        const resolved = await resolveOwner()
        if (resolved) {
          effectiveUserId = resolved.ownerUserId
        }
      }
      
      console.log('💾 Saving with effectiveUserId:', effectiveUserId, '(isOwner:', isOwner, ', ownerUserId:', ownerUserId, ')')

      // UI day_of_week matches database day_of_week (6=Saturday, 0=Sunday)
      const dbDayOfWeek = dayOfWeek // Direct mapping: 6 = Saturday, 0 = Sunday
      
      // Get day_config_id
      const { data: config } = await supabase
        .from('day_config')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('day_of_week', dbDayOfWeek) // Use mapped value
        .single()

      if (!config) {
        showNotification('Day config not found.', 'warning')
        return
      }

      // Delete all medications in this time frame
      const { error } = await supabase
        .from('time_frame_medications')
        .delete()
        .eq('day_config_id', config.id)
        .eq('time_frame', timeFrame)

      if (error) throw error

      await fetchDayData()
      showNotification(`All ${medications.length} medication(s) removed from ${TIME_FRAMES[timeFrame].label}!`, 'success')
    } catch (error: any) {
      console.error('Error deleting all medications:', error)
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

      // Always use ownerUserId for caregivers, current user ID for owners
      // This ensures caregivers save to the owner's account
      let effectiveUserId = isOwner ? session.user.id : (ownerUserId || session.user.id)
      
      // Safety check: if we're a caregiver but ownerUserId is not set, try to resolve it
      if (!isOwner && !ownerUserId) {
        console.log('⚠️ Caregiver detected but ownerUserId not set, resolving...')
        const resolved = await resolveOwner()
        if (resolved) {
          effectiveUserId = resolved.ownerUserId
        }
      }
      
      console.log('💾 Saving with effectiveUserId:', effectiveUserId, '(isOwner:', isOwner, ', ownerUserId:', ownerUserId, ')')

      // UI day_of_week matches database day_of_week (6=Saturday, 0=Sunday)
      const dbDayOfWeek = dayOfWeek // Direct mapping: 6 = Saturday, 0 = Sunday
      
      // Get day_config_id
      const { data: config } = await supabase
        .from('day_config')
        .select('id')
        .eq('user_id', effectiveUserId)
        .eq('day_of_week', dbDayOfWeek) // Use mapped value
        .single()

      if (!config) {
        showNotification('Day config not found. Please add a medication first.', 'warning')
        return
      }

      // Auto-calculate date for the next occurrence of this day
      const nextDayDate = getNextDayDate(dayOfWeek)
      const dayDate = formatDate(nextDayDate)

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

            {/* Editable Date Display */}
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Schedule Date:
              </label>
              <input
                type="date"
                value={day.selectedDate || ''}
                onChange={async (e) => {
                  const newDate = e.target.value
                  if (newDate) {
                    // Update state immediately
                    // Calculate day name from newDate
                    let newDayName = day.name
                    if (newDate) {
                      try {
                        const dateObj = new Date(newDate + 'T00:00:00')
                        const dayOfWeekFromDate = dateObj.getDay() // 0 = Sunday, 6 = Saturday
                        newDayName = getDayName(dayOfWeekFromDate)
                      } catch (e) {
                        // If date parsing fails, keep current name
                        newDayName = day.name
                      }
                    }
                    
                    setDays(prevDays => {
                      const updated = prevDays.map(d =>
                        d.dayOfWeek === day.dayOfWeek
                          ? { ...d, selectedDate: newDate, name: newDayName }
                          : d
                      )
                      daysRef.current = updated // Update ref
                      return updated
                    })
                    
                    // Save to database so it syncs between patient and caregiver
                    try {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) return
                      
                      const effectiveUserId = isOwner ? session.user.id : (ownerUserId || session.user.id)
                      
                      // Find the day_config for this day
                      const { data: dayConfig } = await supabase
                        .from('day_config')
                        .select('id')
                        .eq('user_id', effectiveUserId)
                        .eq('day_of_week', day.dayOfWeek)
                        .maybeSingle()
                      
                      if (dayConfig) {
                        // Update existing day_config
                        await supabase
                          .from('day_config')
                          .update({ 
                            selected_date: newDate,
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', dayConfig.id)
                        console.log(`💾 Saved date ${newDate} to database for ${day.name}`)
                      } else {
                        // Create new day_config with the date
                        await supabase
                          .from('day_config')
                          .insert({
                            user_id: effectiveUserId,
                            day_of_week: day.dayOfWeek,
                            medication_name: '',
                            is_active: false,
                            selected_date: newDate
                          })
                        console.log(`💾 Created day_config with date ${newDate} for ${day.name}`)
                      }
                    } catch (error) {
                      console.error('Error saving date to database:', error)
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
              />
              <p className="text-xs text-gray-500 mt-1">
                Date is automatically synced with current day, but you can edit it
              </p>
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
                        {/* Medication List - Each medication as a row */}
                        <div className="p-2 sm:p-3 border-b border-gray-100">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Medications:</span>
                            {medications.length > 0 && (
                              <button
                                onClick={() => handleDeleteAllMedications(day.dayOfWeek, timeFrame)}
                                className="text-xs px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 active:bg-red-700 transition font-medium shadow-sm"
                                title="Delete all medications"
                              >
                                Delete All
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {medications.map((med) => (
                              <div 
                                key={med.id} 
                                className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <span className="text-sm sm:text-base font-medium text-gray-800 flex-1">
                                  {med.medication_name}
                                </span>
                                <div className="flex gap-1.5 sm:gap-2">
                                  <button
                                    onClick={() => handleEditMedication(med, day.dayOfWeek, timeFrame)}
                                    className="px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 active:bg-blue-700 transition text-xs sm:text-sm font-medium shadow-sm"
                                    title="Edit medication name"
                                  >
                                     Edit
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMedication(med.id)}
                                    className="px-2 py-1.5 sm:px-3 sm:py-2 bg-red-500 text-white rounded-md hover:bg-red-600 active:bg-red-700 transition text-xs sm:text-sm font-medium shadow-sm"
                                    title="Remove"
                                  >
                                     Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Show time frame time - ONE time for entire frame */}
                        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-gray-600">
                            <span>🕐</span>
                            {day.timeFrameTimes[timeFrame] ? (
                              <span className="font-medium text-gray-800 text-xs sm:text-sm">{day.timeFrameTimes[timeFrame]}</span>
                            ) : (
                              <span className="text-gray-400 italic text-xs sm:text-sm">No time set</span>
                            )}
                          </div>
                          {day.timeFrameTimes[timeFrame] ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTimeFrameTime(day.dayOfWeek, timeFrame)
                              }}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs sm:text-sm cursor-pointer z-10 relative font-medium"
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
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded text-xs sm:text-sm cursor-pointer z-10 relative font-medium"
                              title="Set time"
                              type="button"
                            >
                              Set Time
                            </button>
                          )}
                        </div>
                        {/* Action Buttons - Compact */}
                        <div className="p-2 sm:p-2.5 flex gap-1 border-t border-gray-100">
                          <div 
                            className="flex-1 relative min-w-0"
                            onMouseDown={(e) => {
                              const buttonKey = `${day.dayOfWeek}-${timeFrame}`
                              console.log('🔘 Mouse down on dispense button wrapper:', buttonKey)
                              holdCompletedRef.current.delete(buttonKey)
                              
                              // Clear any existing timer for this button
                              const existingTimer = holdTimersRef.current.get(buttonKey)
                              if (existingTimer) {
                                clearTimeout(existingTimer)
                              }
                              
                              // Start new timer
                              console.log('⏱️ Starting 2-second hold timer for:', buttonKey)
                              const timer = setTimeout(() => {
                                console.log('✅ 2-second hold completed - triggering force dispense')
                                holdCompletedRef.current.add(buttonKey)
                                handleForceDispense()
                                holdTimersRef.current.delete(buttonKey)
                              }, 2000) // 2 seconds
                              
                              holdTimersRef.current.set(buttonKey, timer)
                            }}
                            onMouseUp={() => {
                              const buttonKey = `${day.dayOfWeek}-${timeFrame}`
                              const timer = holdTimersRef.current.get(buttonKey)
                              if (timer) {
                                clearTimeout(timer)
                                holdTimersRef.current.delete(buttonKey)
                              }
                            }}
                            onMouseLeave={() => {
                              const buttonKey = `${day.dayOfWeek}-${timeFrame}`
                              const timer = holdTimersRef.current.get(buttonKey)
                              if (timer) {
                                clearTimeout(timer)
                                holdTimersRef.current.delete(buttonKey)
                              }
                              holdCompletedRef.current.delete(buttonKey)
                            }}
                            onTouchStart={(e) => {
                              const buttonKey = `${day.dayOfWeek}-${timeFrame}`
                              console.log('🔘 Touch start on dispense button wrapper:', buttonKey)
                              holdCompletedRef.current.delete(buttonKey)
                              
                              // Clear any existing timer for this button
                              const existingTimer = holdTimersRef.current.get(buttonKey)
                              if (existingTimer) {
                                clearTimeout(existingTimer)
                              }
                              
                              // Start new timer
                              console.log('⏱️ Starting 2-second hold timer for:', buttonKey)
                              const timer = setTimeout(() => {
                                console.log('✅ 2-second hold completed - triggering force dispense')
                                holdCompletedRef.current.add(buttonKey)
                                handleForceDispense()
                                holdTimersRef.current.delete(buttonKey)
                              }, 2000) // 2 seconds
                              
                              holdTimersRef.current.set(buttonKey, timer)
                            }}
                            onTouchEnd={() => {
                              const buttonKey = `${day.dayOfWeek}-${timeFrame}`
                              const timer = holdTimersRef.current.get(buttonKey)
                              if (timer) {
                                clearTimeout(timer)
                                holdTimersRef.current.delete(buttonKey)
                              }
                            }}
                          >
                            <button
                              onClick={() => {
                                const buttonKey = `${day.dayOfWeek}-${timeFrame}`
                                // If hold was completed, don't do normal click
                                if (holdCompletedRef.current.has(buttonKey)) {
                                  holdCompletedRef.current.delete(buttonKey)
                                  return
                                }
                                handleDispense(day.dayOfWeek, timeFrame)
                              }}
                            disabled={
                              !piConnected || 
                              medications.length === 0 || 
                              !day.timeFrameTimes[timeFrame] || 
                              !isDateToday(day.selectedDate)
                            }
                            className={`w-full px-3 py-2 rounded-lg transition shadow-sm font-semibold text-xs sm:text-sm ${
                              !piConnected || 
                              medications.length === 0 || 
                              !day.timeFrameTimes[timeFrame] || 
                              !isDateToday(day.selectedDate)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                            }`}
                            title={
                              !piConnected 
                                ? 'Raspberry Pi not connected'
                                : medications.length === 0
                                ? 'No medications to dispense'
                                : !day.timeFrameTimes[timeFrame]
                                ? 'No time set for this time frame'
                                : !isDateToday(day.selectedDate)
                                ? `Date must be today to dispense. Current date: ${day.selectedDate || 'not set'}`
                                : hasUndispensedEarlierTimeFrames(day, timeFrame, lastServo1Angle)
                                ? (() => {
                                    const earlierFrames = []
                                    const frameOrder: ('morning' | 'afternoon' | 'evening')[] = ['morning', 'afternoon', 'evening']
                                    const targetIndex = frameOrder.indexOf(timeFrame)
                                    for (let i = 0; i < targetIndex; i++) {
                                      const earlierFrame = frameOrder[i]
                                      const hasMedications = (day.medications[earlierFrame] || []).length > 0
                                      const hasScheduledTime = day.timeFrameTimes[earlierFrame] !== null && day.timeFrameTimes[earlierFrame] !== ''
                                      if (hasMedications && hasScheduledTime && !isTimeFrameDispensedByAngle(lastServo1Angle, day.dayOfWeek, earlierFrame)) {
                                        earlierFrames.push(TIME_FRAMES[earlierFrame].label)
                                      }
                                    }
                                    return `Note: ${earlierFrames.join(' and ')} should be dispensed first`
                                  })()
                                : `Dispense all ${medications.length} medication(s) in ${frameInfo.label} bundle`
                            }
                          >
                            {`Dispense (${medications.length})`}
                          </button>
                          </div>
                          <button
                            onClick={() => handleAddMedication(day.dayOfWeek, timeFrame)}
                            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow-sm font-medium text-xs sm:text-sm flex-shrink-0 whitespace-nowrap"
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

       {/* Notification Toast - Mobile Optimized */}
       {notification && (
         <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-2 sm:pt-4 pointer-events-none">
           <div className={`rounded-b-lg sm:rounded-lg shadow-xl py-3 px-4 sm:py-4 sm:px-4 max-w-md mx-auto pointer-events-auto transform transition-all duration-300 ease-in-out ${
             notification.type === 'success' ? 'bg-blue-500 text-white' :
             notification.type === 'error' ? 'bg-white text-gray-800 border-b-4 border-red-500' :
             notification.type === 'warning' ? 'bg-yellow-500 text-white' :
             'bg-blue-500 text-white'
           }`}>
             <div className="flex items-center justify-between gap-3">
               <p className="font-medium text-sm sm:text-base break-words flex-1 pr-2 leading-relaxed">{notification.message}</p>
               <button
                 onClick={() => setNotification(null)}
                 className={`font-bold text-lg sm:text-xl flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full hover:bg-black hover:bg-opacity-10 transition ${
                   notification.type === 'error' ? 'text-gray-600 hover:text-gray-800' : 'text-white hover:text-gray-200'
                 }`}
                 aria-label="Close notification"
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

      {/* Confirmation Preference Dialog - Shown after adding medicine */}
      {confirmationPreferenceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">⚙️</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Dispense Preference</h3>
              <p className="text-sm text-gray-600 mb-4">
                How should <span className="font-semibold">{confirmationPreferenceDialog.medicationName}</span> be dispensed?
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 mb-1">
                    {(() => {
                      const day = days.find(d => d.dayOfWeek === confirmationPreferenceDialog.dayOfWeek)
                      const timeFrameLabel = TIME_FRAMES[confirmationPreferenceDialog.timeFrame].label
                      return `${day?.name || ''} ${timeFrameLabel}`
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">
                    {(() => {
                      const day = days.find(d => d.dayOfWeek === confirmationPreferenceDialog.dayOfWeek)
                      const requireConfirmation = day?.timeFrameRequireConfirmation[confirmationPreferenceDialog.timeFrame] ?? false
                      return requireConfirmation 
                        ? 'Confirmation required before dispensing'
                        : 'Automatic dispense at scheduled time'
                    })()}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={(() => {
                      const day = days.find(d => d.dayOfWeek === confirmationPreferenceDialog.dayOfWeek)
                      return day?.timeFrameRequireConfirmation[confirmationPreferenceDialog.timeFrame] ?? false
                    })()}
                    onChange={async (e) => {
                      const requireConfirmation = e.target.checked
                      const day = days.find(d => d.dayOfWeek === confirmationPreferenceDialog.dayOfWeek)
                      if (!day) return
                      
                      // Update local state immediately
                      setDays(prevDays => 
                        prevDays.map(d => 
                          d.dayOfWeek === confirmationPreferenceDialog.dayOfWeek
                            ? {
                                ...d,
                                timeFrameRequireConfirmation: {
                                  ...d.timeFrameRequireConfirmation,
                                  [confirmationPreferenceDialog.timeFrame]: requireConfirmation
                                }
                              }
                            : d
                        )
                      )
                      
                      // Save to database
                      try {
                        const session = await refreshSessionIfNeeded()
                        if (!session) return
                        
                        let effectiveUserId = isOwner ? session.user.id : (ownerUserId || session.user.id)
                        if (!isOwner && !ownerUserId) {
                          const resolved = await resolveOwner()
                          if (resolved) {
                            effectiveUserId = resolved.ownerUserId
                          }
                        }
                        
                        const dbDayOfWeek = confirmationPreferenceDialog.dayOfWeek
                        const updateField = `${confirmationPreferenceDialog.timeFrame}_require_confirmation`
                        
                        const { data: config } = await supabase
                          .from('day_config')
                          .select('id')
                          .eq('user_id', effectiveUserId)
                          .eq('day_of_week', dbDayOfWeek)
                          .single()
                        
                        if (config) {
                          await supabase
                            .from('day_config')
                            .update({
                              [updateField]: requireConfirmation,
                              updated_at: new Date().toISOString()
                            })
                            .eq('id', config.id)
                        }
                      } catch (error) {
                        console.error('Error saving confirmation preference:', error)
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <div className="text-2xl mr-2">ℹ️</div>
                  <div className="text-xs text-gray-700">
                    <div className="font-semibold mb-1">Toggle OFF (Default):</div>
                    <div>Medicine will dispense automatically at the scheduled time</div>
                    <div className="font-semibold mt-2 mb-1">Toggle ON:</div>
                    <div>You will be asked to confirm before dispensing</div>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setConfirmationPreferenceDialog(null)}
              className="w-full px-4 py-3 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition shadow-lg font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Servo2 Confirmation Dialog - Medicine Dispense */}
      {servo2ConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">💊</div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6">Dispense Medicine?</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={servo2ConfirmDialog.onCancel}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                No
              </button>
              <button
                onClick={servo2ConfirmDialog.onConfirm}
                className="flex-1 px-4 py-3 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition shadow-lg font-semibold"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


      


