/**
 * WebSocket Client for PillPal Raspberry Pi Communication
 */

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765'

export interface WebSocketMessage {
  type: 'dispense' | 'status' | 'ping'
  servo_id?: string
  medication?: string
  timestamp?: string
}

export interface WebSocketResponse {
  success: boolean
  error?: string
  servo_id?: string
  medication?: string
  timestamp?: string
  status?: any
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private listeners: ((event: MessageEvent) => void)[] = []

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WS_URL)
        
        this.ws.onopen = () => {
          console.log('WebSocket connected to Pi server')
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.listeners.forEach(listener => listener(event))
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.ws.onclose = () => {
          console.log('WebSocket closed')
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
            setTimeout(() => this.connect(), 3000)
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
        reject(error)
      }
    })
  }

  async send(message: WebSocketMessage): Promise<WebSocketResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected')
      return { success: false, error: 'Not connected to Pi server' }
    }

    return new Promise((resolve, reject) => {
      this.ws!.send(JSON.stringify(message))
      
      const listener = (event: MessageEvent) => {
        try {
          const response: WebSocketResponse = JSON.parse(event.data)
          resolve(response)
        } catch (error) {
          console.error('Failed to parse response:', error)
          resolve({ success: false, error: 'Invalid response format' })
        }
      }

      this.listeners.push(listener)
      
      // Remove listener after timeout
      setTimeout(() => {
        this.listeners = this.listeners.filter(l => l !== listener)
      }, 10000)
    })
  }

  async dispense(servoId: string, medication: string): Promise<WebSocketResponse> {
    return this.send({
      type: 'dispense',
      servo_id: servoId,
      medication,
      timestamp: new Date().toISOString()
    })
  }

  async getStatus(): Promise<WebSocketResponse> {
    return this.send({ type: 'status' })
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

export const wsService = new WebSocketService()





