'use client'

let ws: WebSocket | null = null
let connected = false

// Pi WebSocket URL - can be set via environment variable for deployment
// Defaults to local development IP if not set
const PI_URL = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'

export function connectToPi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (ws?.readyState === WebSocket.OPEN) {
      resolve()
      return
    }

    console.log('🔌 Connecting to Pi...')
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

export function dispenseToPi(servoId: string, medication: string): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!ws || !connected) {
      reject(new Error('Not connected to Pi!'))
      return
    }

    const message = JSON.stringify({
      type: 'dispense',
      servo_id: servoId,
      medication: medication
    })

    ws.send(message)
    
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000)
    
    const originalHandler = ws.onmessage
    ws.onmessage = (event) => {
      clearTimeout(timeout)
      try {
        resolve(JSON.parse(event.data))
      } catch (error) {
        reject(error)
      }
      ws!.onmessage = originalHandler
    }
  })
}

