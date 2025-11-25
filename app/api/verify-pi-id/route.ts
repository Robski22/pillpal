import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { pi_unique_id, user_email } = await request.json()
    
    if (!pi_unique_id || !user_email) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Pi unique ID and user email are required' 
      }, { status: 400 })
    }

    // Check if Pi is registered with this email
    const { data: registration, error } = await supabase
      .from('pi_registration')
      .select('*')
      .eq('pi_unique_id', pi_unique_id)
      .eq('registered_email', user_email.toLowerCase().trim())
      .single()

    if (error || !registration) {
      return NextResponse.json({ 
        verified: false, 
        error: 'Pi not registered or email mismatch' 
      }, { status: 403 })
    }

    // Update last_seen timestamp
    await supabase
      .from('pi_registration')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', registration.id)

    return NextResponse.json({ 
      verified: true,
      message: 'Pi verified successfully'
    })
  } catch (error: any) {
    console.error('Error verifying Pi ID:', error)
    return NextResponse.json({ 
      verified: false, 
      error: error.message || 'Failed to verify Pi' 
    }, { status: 500 })
  }
}


