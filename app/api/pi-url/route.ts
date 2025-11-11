import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('pi_connection_config')
      .select('websocket_url')
      .single()

    if (error) {
      console.error('Error fetching Pi URL:', error)
      return NextResponse.json({
        url: process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
      })
    }

    return NextResponse.json({
      url: data?.websocket_url || process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
    })
  } catch (error) {
    console.error('Error in API route:', error)
    return NextResponse.json({
      url: process.env.NEXT_PUBLIC_PI_WEBSOCKET_URL || ''
    })
  }
}