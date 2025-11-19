'use client'

let ws: WebSocket | null = null
let connected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

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
      resolve()
    }

    ws.onerror = (error) => {
      console.error(' WebSocket connection error')
    }

    ws.onclose = () => {
      console.log(' Disconnected')
      connected = false
      
      // Auto-reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++
        console.log(` Reconnecting... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
        setTimeout(() => connectToPi(), 3000)
      }
    }

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data)
        console.log('📨 Response:', response)
      } catch (e) {
        console.log('📨 Message:', event.data)
      }
    }
  })
}

export function disconnectFromPi() {
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

export function dispenseToPi(servoId: string, medication: string): Promise<any> {
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

    const message = JSON.stringify({
      type: 'dispense',
      servo_id: servoId,
      medication: medication
    })

    console.log('📤 Sending dispense command:', message)
    ws.send(message)
    
    const timeout = setTimeout(() => {
      console.error(' Dispense timeout - no response from Pi')
      reject(new Error('Timeout - Pi did not respond'))
    }, 10000)
    
    const originalHandler = ws.onmessage
    ws.onmessage = (event) => {
      clearTimeout(timeout)
      try {
        const response = JSON.parse(event.data)
        console.log(' Dispense response received:', response)
        resolve(response)
      } catch (error) {
        console.error(' Error parsing response:', error)
        reject(error)
      }
      ws!.onmessage = originalHandler
    }
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
      reject(new Error('Timeout - Pi did not respond'))
    }, 15000) // Longer timeout for SMS (15 seconds)
    
    const originalHandler = ws.onmessage
    ws.onmessage = (event) => {
      clearTimeout(timeout)
      try {
        const response = JSON.parse(event.data)
        console.log(' SMS response received:', response)
        resolve(response)
      } catch (error) {
        console.error(' Error parsing SMS response:', error)
        reject(error)
      }
      ws!.onmessage = originalHandler
    }
  })
}

export function confirmServo2Dispense(): Promise<any> {
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

    const message = JSON.stringify({
      type: 'servo2_dispense'
    })

    console.log('📤 Sending servo2 dispense confirmation:', message)
    ws.send(message)
    
    const timeout = setTimeout(() => {
      console.error(' Servo2 dispense timeout - no response from Pi')
      reject(new Error('Timeout - Pi did not respond'))
    }, 10000)
    
    const originalHandler = ws.onmessage
    ws.onmessage = (event) => {
      clearTimeout(timeout)
      try {
        const response = JSON.parse(event.data)
        console.log(' Servo2 dispense response received:', response)
        resolve(response)
      } catch (error) {
        console.error(' Error parsing servo2 response:', error)
        reject(error)
      }
      ws!.onmessage = originalHandler
    }
  })
}