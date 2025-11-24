'use client'

let ws: WebSocket | null = null
let connected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
let buttonPressCallback: ((pressed: boolean) => void) | null = null
let messageHandlers: Map<string, (response: any) => void> = new Map()
let keepAliveInterval: NodeJS.Timeout | null = null
const KEEPALIVE_INTERVAL = 30000 // Send ping every 30 seconds to keep connection alive

// Fetch WebSocket URL from API at runtime (not build-time!)
async function getWebSocketUrl(): Promise<string> {
  try {
    const response = await fetch('/api/pi-url')
    const data = await response.json()
    console.log('✔ Using WebSocket URL:', data.url)
    return data.url || process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'
  } catch (error) {
    console.error('Error fetching WebSocket URL:', error)
    return process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'
  }
}

export async function connectToPi(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    if (ws?.readyState === WebSocket.OPEN) {
      console.log(' Already connected to Pi')
      resolve()
      return
    }

    // Fetch URL at runtime (not build-time!)
    const PI_URL = await getWebSocketUrl()
    console.log('🔧 Using WebSocket URL:', PI_URL)
    console.log('🔌 Connecting to Pi at:', PI_URL)

    ws = new WebSocket(PI_URL)
    reconnectAttempts = 0

    ws.onopen = () => {
      console.log(' Connected to Pi!')
      connected = true
      reconnectAttempts = 0 // Reset on successful connection
      
      // Start keepalive ping to prevent connection timeout
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
      }
      keepAliveInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            // Send ping message to keep connection alive
            ws.send(JSON.stringify({ type: 'ping' }))
            console.log('💓 Keepalive ping sent')
          } catch (error) {
            console.error('Error sending keepalive ping:', error)
          }
        } else {
          // Connection is closed, clear interval
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval)
            keepAliveInterval = null
          }
        }
      }, KEEPALIVE_INTERVAL)
      
      resolve()
    }

    ws.onerror = (error) => {
      console.error(' WebSocket connection error')
    }

    ws.onclose = (event) => {
      console.log(' Disconnected', event.code, event.reason)
      connected = false
      
      // Clear keepalive interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
      }
      
      // Auto-reconnect with fresh URL from API
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        console.log(` Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
        // Fetch fresh URL on reconnect to handle tunnel URL changes
        setTimeout(async () => {
          try {
            await connectToPi()
          } catch (error) {
            console.error('Reconnection failed:', error)
          }
        }, 3000)
      } else {
        console.error(' Max reconnection attempts reached. Please refresh the page or check the tunnel URL.')
      }
    }

    // Set up persistent message handler
    ws.onmessage = (event) => {
      try {
        // Log raw message first
        console.log('📨 Raw WebSocket message:', event.data)
        
        const response = JSON.parse(event.data)
        console.log('📨 Parsed WebSocket message:', response)
        console.log('📨 Message type:', response.type || 'NO TYPE FIELD')
        
        // ALWAYS handle button press events first (highest priority)
        // Check for button_press type regardless of other handlers
        if (response.type === 'button_press') {
          console.log('🔘 GPIO26 Button press detected in WebSocket!')
          console.log('🔍 Button press details:', response)
          if (buttonPressCallback) {
            console.log('✅ Button callback exists - calling it')
            buttonPressCallback(true)
          } else {
            console.log('⚠️ Button callback is null - button press ignored')
            console.log('💡 This means the callback was not registered or was cleared')
          }
          return // Don't process further for button presses
        }
        
        // Handle ping/pong for keepalive
        if (response.type === 'pong' || response.type === 'ping') {
          console.log('💓 Keepalive pong received')
          return // Don't process ping/pong as regular messages
        }
        
        // Handle responses with explicit type field
        if (response.type && messageHandlers.has(response.type)) {
          const handler = messageHandlers.get(response.type)!
          handler(response)
          messageHandlers.delete(response.type) // Remove one-time handler
          return
        }
        
        // Handle responses without type field (legacy format or direct responses)
        // Check if it looks like a dispense/servo2/sms response (has status field)
        if (response.status && !response.type) {
          // Try to match based on context - check registered handlers
          // For dispense responses, check if we have a 'dispense' handler waiting
          if (messageHandlers.has('dispense')) {
            console.log('📨 Handling response as dispense (no type field)')
            const handler = messageHandlers.get('dispense')!
            handler(response)
            messageHandlers.delete('dispense')
            return
          }
          // For servo2 responses
          if (messageHandlers.has('servo2_dispense')) {
            console.log('📨 Handling response as servo2_dispense (no type field)')
            const handler = messageHandlers.get('servo2_dispense')!
            handler(response)
            messageHandlers.delete('servo2_dispense')
            return
          }
          // For SMS responses
          if (messageHandlers.has('send_sms')) {
            console.log('📨 Handling response as send_sms (no type field)')
            const handler = messageHandlers.get('send_sms')!
            handler(response)
            messageHandlers.delete('send_sms')
            return
          }
        }
        
        // Log unhandled messages
        if (response.type && response.type !== 'button_press') {
          console.log('📨 Unhandled message type:', response.type)
        } else if (!response.type) {
          console.log('📨 Unhandled message (no type field):', response)
        }
      } catch (e) {
        console.log('📨 Raw message (not JSON):', event.data)
      }
    }
  })
}

export function disconnectFromPi() {
  // Clear keepalive interval
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval)
    keepAliveInterval = null
  }
  
  if (ws) {
    ws.close()
    ws = null
    connected = false
  }
}

export function isConnectedToPi(): boolean {
  return connected && ws?.readyState === WebSocket.OPEN
}

// Expose connection function globally for debugging
if (typeof window !== 'undefined') {
  (window as any).connectToPi = connectToPi;
  (window as any).checkPiConnection = () => {
    console.log('WebSocket state:', ws?.readyState);
    console.log('Connected:', connected);
  };
}

export function dispenseToPi(servoId: string, medication: string, targetAngle?: number, date?: string, time?: string, timeFrame?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || !connected) {
      console.error(' Cannot dispense: Not connected to Pi!')
      console.error('   WebSocket state:', ws?.readyState, 'Connected:', connected)
      reject(new Error('Not connected to Pi!'))
      return
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.error(' Cannot dispense: WebSocket not open!')
      console.error('   WebSocket state:', ws.readyState)
      reject(new Error('WebSocket not open!'))
      return
    }

    const message: any = {
      type: 'dispense',
      servo_id: servoId,
      medication: medication
    }
    
    if (targetAngle !== undefined) {
      message.target_angle = targetAngle
    }
    
    if (date) {
      message.date = date
    }
    
    if (time) {
      message.time = time
    }
    
    if (timeFrame) {
      message.time_frame = timeFrame
    }
    
    // Include target angle if provided (for progressive dispense logic)
    if (targetAngle !== undefined) {
      message.target_angle = targetAngle
    }

    console.log('📤 Sending dispense command:', JSON.stringify(message))
    ws.send(JSON.stringify(message))
    
    const timeout = setTimeout(() => {
      console.error(' Dispense timeout - no response from Pi')
      messageHandlers.delete('dispense')
      reject(new Error('Timeout - Pi did not respond'))
    }, 10000)
    
    // Register handler for dispense response (doesn't interfere with button press)
    messageHandlers.set('dispense', (response: any) => {
      clearTimeout(timeout)
      console.log(' Dispense response received:', response)
      resolve(response)
    })
  })
}

export function sendSmsViaPi(phoneNumber: string | string[], message: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || !connected) {
      console.error(' Cannot send SMS: Not connected to Pi!')
      reject(new Error('Not connected to Pi!'))
      return
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.error(' Cannot send SMS: WebSocket not open!')
      reject(new Error('WebSocket not open!'))
      return
    }

    // Convert single phone number to array for consistent handling
    const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber]

    const smsMessage = JSON.stringify({
      type: 'send_sms',
      phone_numbers: phoneNumbers,  // Send as array
      message: message
    })

    console.log('📤 Sending SMS via Pi:', phoneNumber)
    ws.send(smsMessage)
    
    const timeout = setTimeout(() => {
      console.error(' SMS timeout - no response from Pi')
      messageHandlers.delete('send_sms')
      reject(new Error('Timeout - Pi did not respond'))
    }, 15000) // Longer timeout for SMS (15 seconds)
    
    // Register handler for SMS response
    messageHandlers.set('send_sms', (response: any) => {
      clearTimeout(timeout)
      console.log(' SMS response received:', response)
      resolve(response)
    })
  })
}

export function confirmServo2Dispense(date?: string, time?: string, timeFrame?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || !connected) {
      console.error(' Cannot confirm servo2 dispense: Not connected to Pi!')
      reject(new Error('Not connected to Pi!'))
      return
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.error(' Cannot confirm servo2 dispense: WebSocket not open!')
      reject(new Error('WebSocket not open!'))
      return
    }

    const message: any = {
      type: 'servo2_dispense'
    }
    
    if (date) {
      message.date = date
    }
    
    if (time) {
      message.time = time
    }
    
    if (timeFrame) {
      message.time_frame = timeFrame
    }

    const messageStr = JSON.stringify(message)

    console.log('📤 Sending servo2 dispense confirmation:', messageStr)
    ws.send(messageStr)
    
    const timeout = setTimeout(() => {
      console.error(' Servo2 dispense timeout - no response from Pi')
      messageHandlers.delete('servo2_dispense')
      reject(new Error('Timeout - Pi did not respond'))
    }, 10000)
    
    // Register handler for servo2 response
    messageHandlers.set('servo2_dispense', (response: any) => {
      clearTimeout(timeout)
      console.log(' Servo2 dispense response received:', response)
      resolve(response)
    })
  })
}

export function setButtonPressCallback(callback: ((pressed: boolean) => void) | null) {
  buttonPressCallback = callback
}

export function updateLCDSchedules(schedules: Array<{time: string, medication?: string, time_frame?: string, date?: string}>): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || !connected) {
      console.error(' Cannot update LCD schedules: Not connected to Pi!')
      reject(new Error('Not connected to Pi!'))
      return
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.error(' Cannot update LCD schedules: WebSocket not open!')
      reject(new Error('WebSocket not open!'))
      return
    }

    const message = JSON.stringify({
      type: 'update_schedules',
      schedules: schedules
    })

    console.log('📤 Sending schedule update to LCD:', schedules)
    ws.send(message)
    
    const timeout = setTimeout(() => {
      console.error(' LCD schedule update timeout - no response from Pi')
      messageHandlers.delete('update_schedules')
      reject(new Error('Timeout - Pi did not respond'))
    }, 5000)
    
    // Register handler for update_schedules response
    messageHandlers.set('update_schedules', (response: any) => {
      clearTimeout(timeout)
      console.log(' LCD schedule update response received:', response)
      resolve(response)
    })
  })
}