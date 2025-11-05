'use client'

let ws: WebSocket | null = null
let connected = false

// Pi WebSocket URL - can be set via environment variable for deployment
// Defaults to local development IP if not set
const PI_URL = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'

// Log which URL we're using (for debugging)
console.log('🔧 Using WebSocket URL:', PI_URL || 'Not set!')

export function connectToPi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws?.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected to Pi')
      resolve()
      return
    }

    console.log('🔌 Connecting to Pi at:', PI_URL)
    ws = new WebSocket(PI_URL)

    ws.onopen = () => {
      console.log('✅ Connected to Pi!')
      connected = true
      resolve()
    }

    ws.onerror = (error) => {
      console.error('❌ WebSocket connection error')
      // Don't reject immediately, let onclose handle it
      // This prevents the error from breaking the connection attempt
    }

    ws.onclose = () => {
      console.log('⚠️ Disconnected')
      connected = false
    }

    ws.onmessage = (event) => {
      console.log('📨 Response:', JSON.parse(event.data))
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
    console.log('URL:', PI_URL);
  };
}

export function dispenseToPi(servoId: string, medication: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || !connected) {
      console.error('❌ Cannot dispense: Not connected to Pi!')
      console.error('   WebSocket state:', ws?.readyState, 'Connected:', connected)
      reject(new Error('Not connected to Pi!'))
      return
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.error('❌ Cannot dispense: WebSocket not open!')
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
      console.error('❌ Dispense timeout - no response from Pi')
      reject(new Error('Timeout - Pi did not respond'))
    }, 10000)
    
    const originalHandler = ws.onmessage
    ws.onmessage = (event) => {
      clearTimeout(timeout)
      try {
        const response = JSON.parse(event.data)
        console.log('✅ Dispense response received:', response)
        resolve(response)
      } catch (error) {
        console.error('❌ Error parsing response:', error)
        reject(error)
      }
      ws!.onmessage = originalHandler
    }
  })
}

