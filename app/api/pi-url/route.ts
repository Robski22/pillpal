import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Normalize WebSocket URL - remove trailing slashes and ensure proper format
function normalizeWebSocketUrl(url: string): string {
  if (!url) return url
  // Remove trailing slashes
  let normalized = url.trim().replace(/\/+$/, '')
  // Ensure it starts with ws:// or wss://
  if (!normalized.startsWith('ws://') && !normalized.startsWith('wss://')) {
    normalized = 'ws://' + normalized
  }
  return normalized
}

export async function GET() {
  try {
    // Create a timeout promise for 2 seconds
    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) => {
      setTimeout(() => resolve({ data: null, error: { message: 'Query timeout' } }), 2000)
    })
    
    // Race the query against the timeout
    const queryPromise = supabase
      .from('pi_connection_config')
      .select('websocket_url')
      .single()
    
    const result = await Promise.race([queryPromise, timeoutPromise])
    const { data, error } = result

    let url = ''
    if (error) {
      // Silently use fallback - don't log errors to reduce noise
      url = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
    } else {
      url = data?.websocket_url || process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
    }

    // Normalize the URL before returning
    url = normalizeWebSocketUrl(url)

    return NextResponse.json({ url })
  } catch (error) {
    // Silently use fallback - don't log errors to reduce noise
    let url = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
    url = normalizeWebSocketUrl(url)
    return NextResponse.json({ url })
  }
}