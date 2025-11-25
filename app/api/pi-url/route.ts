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
    const { data, error } = await supabase
      .from('pi_connection_config')
      .select('websocket_url')
      .single()

    let url = ''
    if (error) {
      console.error('❌ Error fetching Pi URL from database:', error)
      url = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
      console.log('📋 Using fallback URL from env:', url)
    } else {
      url = data?.websocket_url || process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
      console.log('📋 Fetched URL from database:', url)
    }

    // Normalize the URL before returning
    const originalUrl = url
    url = normalizeWebSocketUrl(url)
    
    if (originalUrl !== url) {
      console.log('🔧 URL normalized:', originalUrl, '→', url)
    }
    
    console.log('✅ Returning URL to client:', url)
    console.log('   URL length:', url.length, 'Ends with /:', url.endsWith('/'))

    return NextResponse.json({ url })
  } catch (error) {
    console.error('❌ Error in API route:', error)
    let url = process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
    url = normalizeWebSocketUrl(url)
    console.log('📋 Using fallback URL due to error:', url)
    return NextResponse.json({ url })
  }
}