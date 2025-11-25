'use client'

let ws: WebSocket | null = null
let connected = false
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = Infinity // Keep trying to reconnect forever
let buttonPressCallback: ((pressed: boolean) => void) | null = null
let connectionStatusCallback: ((connected: boolean) => void) | null = null
let messageHandlers: Map<string, (response: any) => void> = new Map()
let keepAliveInterval: NodeJS.Timeout | null = null
const KEEPALIVE_INTERVAL = 10000 // Send ping every 10 seconds to keep connection alive (very frequent to prevent 1-minute timeout)
let connectionCheckInterval: NodeJS.Timeout | null = null
const CONNECTION_CHECK_INTERVAL = 5000 // Check connection every 5 seconds (very frequent to catch disconnections quickly)
let urlRefreshInterval: NodeJS.Timeout | null = null
const URL_REFRESH_INTERVAL = 60000 // Check for URL changes every 60 seconds
let currentUrl: string | null = null

// Verify Pi unique ID with server
async function verifyPiUniqueId(piUniqueId: string): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.email) {
      console.warn('⚠️ No user session for Pi ID verification')
      return
    }

    const response = await fetch('/api/verify-pi-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pi_unique_id: piUniqueId,
        user_email: session.user.email
      })
    })

    const result = await response.json()
    
    if (result.verified) {
      console.log('✅ Pi unique ID verified successfully')
    } else {
      console.error('❌ Pi unique ID verification failed:', result.error)
      // Optionally disconnect if verification fails
      // if (ws) ws.close()
    }
  } catch (error) {
    console.error('❌ Error verifying Pi ID:', error)
  }
}

// Normalize WebSocket URL - remove trailing slashes and ensure proper format
function normalizeWebSocketUrl(url: string): string {
  if (!url) return url
  // Remove trailing slashes
  let normalized = url.trim().replace(/\/+$/, '')
  // Ensure it starts with ws:// or wss://
  if (!normalized.startsWith('ws://') && !normalized.startsWith('wss://')) {
    console.warn('⚠️ Invalid WebSocket URL format, adding ws:// prefix')
    normalized = 'ws://' + normalized
  }
  return normalized
}

// Fetch WebSocket URL from API at runtime (not build-time!)
async function getWebSocketUrl(): Promise<string> {
  try {
    // Add cache-busting to ensure we get the latest URL
    const response = await fetch('/api/pi-url?' + new Date().getTime(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    let url = data.url || process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'
    
    // Normalize the URL (remove trailing slashes, etc.)
    url = normalizeWebSocketUrl(url)
    
    // Validate URL format
    if (!url || url === 'ws://192.168.1.45:8765') {
      console.warn('⚠️ No valid URL from API, using fallback')
    }
    
    console.log('✔ Using WebSocket URL:', url)
    return url
  } catch (error) {
    console.error('❌ Error fetching WebSocket URL:', error)
    let fallbackUrl = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'
    return normalizeWebSocketUrl(fallbackUrl)
  }
}

// Check if URL has changed and reconnect if needed
async function checkUrlAndReconnectIfNeeded() {
  try {
    let newUrl = await getWebSocketUrl()
    newUrl = normalizeWebSocketUrl(newUrl)
    if (currentUrl && newUrl !== currentUrl && ws && ws.readyState === WebSocket.OPEN) {
      console.log('🔄 Tunnel URL changed! Reconnecting with new URL...')
      console.log('   Old URL:', currentUrl)
      console.log('   New URL:', newUrl)
      // Close current connection and reconnect with new URL
      if (ws) {
        ws.close()
      }
      // Reconnection will happen automatically via onclose handler
    }
    currentUrl = newUrl
  } catch (error) {
    console.error('Error checking URL:', error)
  }
}

export async function connectToPi(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    // Close existing connection if it exists and is not open
    if (ws && ws.readyState !== WebSocket.OPEN) {
      try {
        ws.close()
      } catch (e) {
        // Ignore errors when closing
      }
      ws = null
    }
    
    if (ws?.readyState === WebSocket.OPEN) {
      console.log('✅ Already connected to Pi')
      resolve()
      return
    }

    // Fetch URL at runtime (not build-time!)
    let PI_URL: string
    try {
      PI_URL = await getWebSocketUrl()
      if (!PI_URL || PI_URL === 'ws://192.168.1.45:8765') {
        console.warn('⚠️ No valid URL from API, using fallback')
        PI_URL = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'
        PI_URL = normalizeWebSocketUrl(PI_URL)
      }
    } catch (error) {
      console.error('❌ Error fetching WebSocket URL, using fallback:', error)
      // Use fallback URL instead of rejecting
      PI_URL = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || 'ws://192.168.1.45:8765'
      PI_URL = normalizeWebSocketUrl(PI_URL)
      console.log('🔧 Using fallback WebSocket URL:', PI_URL)
    }
    
    // Ensure URL is normalized (no trailing slashes)
    const originalUrl = PI_URL
    PI_URL = normalizeWebSocketUrl(PI_URL)
    
    // Debug: Show if URL was changed
    if (originalUrl !== PI_URL) {
      console.log('🔧 URL normalized:', originalUrl, '→', PI_URL)
    }
    
    currentUrl = PI_URL
    console.log('🔧 Using WebSocket URL:', PI_URL)
    console.log('🔌 Connecting to Pi at:', PI_URL)
    console.log('🔍 URL length:', PI_URL.length, 'Ends with /:', PI_URL.endsWith('/'))

    // Set connection timeout (reduced from 10s to 5s for faster feedback)
    let connectionTimeout: NodeJS.Timeout | null = setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        console.error('⏱️ Connection timeout after 5 seconds')
        console.error('   Attempted URL:', PI_URL)
        if (ws) {
          ws.close()
        }
        reject(new Error(`Connection timeout to ${PI_URL}`))
      }
    }, 5000)

    try {
      console.log('🚀 Creating WebSocket with normalized URL:', PI_URL)
      ws = new WebSocket(PI_URL)
    } catch (error) {
      console.error('❌ Failed to create WebSocket:', error)
      reject(new Error(`Failed to create WebSocket: ${error}`))
      return
    }
    reconnectAttempts = 0

    ws.onopen = async () => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
        connectionTimeout = null
      }
      console.log('✅ Connected to Pi!')
      
      // Verify Pi unique ID (if configured)
      try {
        // Get current user email
        const { createClient } = await import('@supabase/supabase-js')
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email) {
          // Request Pi unique ID from server
          ws.send(JSON.stringify({ type: 'get_pi_id' }))
          console.log('🔍 Requesting Pi unique ID for verification...')
        }
      } catch (error) {
        console.warn('⚠️ Could not verify Pi ID:', error)
        // Continue anyway - verification is optional
      }
      
      connected = true
      reconnectAttempts = 0 // Reset on successful connection
      
      // Notify connection status change
      if (connectionStatusCallback) {
        connectionStatusCallback(true)
      }
      
      // Start keepalive ping to prevent connection timeout
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
      }
      keepAliveInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            // Send ping message to keep connection alive
            // Note: Server may not support ping, but sending it helps keep the connection active
            ws.send(JSON.stringify({ type: 'ping' }))
            // Don't log every ping to reduce console noise
            // console.log('💓 Keepalive ping sent')
          } catch (error) {
            console.error('Error sending keepalive ping:', error)
            // If ping fails, connection might be dead - trigger reconnect
            if (ws) {
              ws.close()
            }
          }
        } else {
          // Connection is closed, clear interval
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval)
            keepAliveInterval = null
          }
        }
      }, KEEPALIVE_INTERVAL)
      
      // Start connection health check (more frequent to catch disconnections quickly)
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval)
      }
      connectionCheckInterval = setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          console.log('⚠️ Connection health check failed - reconnecting...')
          connected = false
          if (connectionStatusCallback) {
            connectionStatusCallback(false)
          }
          if (ws) {
            try {
              ws.close()
            } catch (e) {
              // Ignore errors
            }
            ws = null
          }
          // Reconnect immediately
          connectToPi().catch(err => console.error('Health check reconnect failed:', err))
        } else {
          // Connection is healthy - ensure status is correct
          if (!connected) {
            connected = true
            if (connectionStatusCallback) {
              connectionStatusCallback(true)
            }
          }
        }
      }, CONNECTION_CHECK_INTERVAL)
      
      // Start URL refresh check to detect tunnel URL changes
      if (urlRefreshInterval) {
        clearInterval(urlRefreshInterval)
      }
      urlRefreshInterval = setInterval(() => {
        checkUrlAndReconnectIfNeeded().catch(err => console.error('URL check failed:', err))
      }, URL_REFRESH_INTERVAL)
      
      resolve()
    }

    ws.onerror = (error) => {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout)
        connectionTimeout = null
      }
      const errorMsg = `WebSocket connection error to ${PI_URL}. This usually means: 1) The server is not running, 2) The URL is incorrect, 3) Network/firewall issues, or 4) The tunnel is down.`
      console.error('❌', errorMsg)
      console.error('   Attempted URL:', PI_URL)
      console.error('   URL ends with /:', PI_URL.endsWith('/'))
      console.error('   Error details:', error)
      console.error('   WebSocket readyState:', ws?.readyState)
      reject(new Error(errorMsg))
    }

    ws.onclose = (event) => {
      const closeReason = event.code === 1006 
        ? 'Abnormal closure (connection failed or server unreachable)'
        : event.code === 1000
        ? 'Normal closure'
        : `Code ${event.code}`
      console.log(` Disconnected: ${closeReason}`, event.code, event.reason || 'No reason provided')
      connected = false
      
      // Notify connection status change
      if (connectionStatusCallback) {
        connectionStatusCallback(false)
      }
      
      // Clear keepalive interval
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        keepAliveInterval = null
      }
      
      // Clear connection check interval
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval)
        connectionCheckInterval = null
      }
      
      // Clear URL refresh interval
      if (urlRefreshInterval) {
        clearInterval(urlRefreshInterval)
        urlRefreshInterval = null
      }
      
      // Auto-reconnect with fresh URL from API (infinite retries, faster initial retry)
      reconnectAttempts++
      // Faster initial retries: 1s, 2s, 3s, then exponential backoff
      const delay = reconnectAttempts <= 3 
        ? reconnectAttempts * 1000 
        : Math.min(3000 + ((reconnectAttempts - 3) * 1000), 30000)
      console.log(`🔄 Reconnecting... (attempt ${reconnectAttempts}, delay: ${delay}ms)`)
      // Fetch fresh URL on reconnect to handle tunnel URL changes
      setTimeout(async () => {
        try {
          console.log(`🔄 Attempting reconnection ${reconnectAttempts}...`)
          await connectToPi()
          console.log(`✅ Reconnection ${reconnectAttempts} successful!`)
        } catch (error) {
          console.error(`❌ Reconnection ${reconnectAttempts} failed:`, error)
          // Will retry again on next onclose event
        }
      }, delay)
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
          console.log('Keepalive pong received')
          return // Don't process ping/pong as regular messages
        }
        
        // Handle Pi unique ID response
        if (response.type === 'pi_id') {
          const piUniqueId = response.pi_unique_id
          if (piUniqueId) {
            console.log('🔍 Received Pi unique ID:', piUniqueId)
            // Verify Pi ID with server
            verifyPiUniqueId(piUniqueId).catch(err => {
              console.warn('⚠️ Pi ID verification failed:', err)
            })
          }
          return
        }
        
        // Handle error responses for ping (server doesn't support ping, that's okay)
        if (response.status === 'error' && response.message && response.message.includes('ping')) {
          // Server doesn't support ping messages - that's fine, connection is still alive
          console.log('Server doesn\'t support ping (connection still alive)')
          return // Ignore this error, connection is working
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
  
  // Clear connection check interval
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval)
    connectionCheckInterval = null
  }
  
  // Clear URL refresh interval
  if (urlRefreshInterval) {
    clearInterval(urlRefreshInterval)
    urlRefreshInterval = null
  }
  
  if (ws) {
    ws.close()
    ws = null
    connected = false
  }
  
  // Reset reconnect attempts when manually disconnecting
  reconnectAttempts = 0
  currentUrl = null
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
    console.log('Current URL:', currentUrl);
  };
  (window as any).testPiUrl = async () => {
    try {
      const url = await getWebSocketUrl();
      console.log('🔍 Testing URL:', url);
      console.log('   Normalized:', normalizeWebSocketUrl(url));
      console.log('   Has trailing slash:', url.endsWith('/'));
      
      // Try to create a test WebSocket (will fail if server is down, but we can see the error)
      const testWs = new WebSocket(url);
      testWs.onopen = () => {
        console.log('✅ Test connection successful!');
        testWs.close();
      };
      testWs.onerror = (error) => {
        console.error('❌ Test connection failed:', error);
      };
      testWs.onclose = (event) => {
        console.log('🔌 Test connection closed:', event.code, event.reason);
      };
    } catch (error) {
      console.error('❌ Error testing URL:', error);
    }
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

export function setConnectionStatusCallback(callback: ((connected: boolean) => void) | null) {
  connectionStatusCallback = callback
  // Immediately notify current status
  if (callback) {
    callback(connected && ws?.readyState === WebSocket.OPEN)
  }
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