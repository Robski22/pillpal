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
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), 2000)
    })
    
    // Race the query against the timeout
    const { data, error } = await Promise.race([
      supabase
        .from('pi_connection_config')
        .select('websocket_url')
        .single(),
      timeoutPromise
    ]) as { data: any; error: any }

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