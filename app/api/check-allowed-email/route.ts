import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Use service role key for this API route since we need to read config before authentication
// The service role bypasses RLS policies
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ allowed: false, error: 'Email is required' }, { status: 400 })
    }

    // Get allowed email from app_config
    const { data: config, error } = await supabase
      .from('app_config')
      .select('config_value')
      .eq('config_key', 'allowed_email')
      .single()

    if (error || !config) {
      // If no config found, block all emails for security
      console.error('No allowed_email config found in database. Blocking access for:', email)
      return NextResponse.json({ 
        allowed: false,
        message: 'Email whitelist not configured. Please contact administrator.'
      })
    }

    const allowedEmail = config.config_value?.toLowerCase().trim()
    const checkEmail = email.toLowerCase().trim()

    if (!allowedEmail) {
      // Config exists but is empty - block all
      console.error('allowed_email config is empty. Blocking access for:', email)
      return NextResponse.json({ 
        allowed: false,
        message: 'Email whitelist not configured. Please contact administrator.'
      })
    }

    // Check if email matches EXACTLY (case-insensitive)
    // Allow Gmail aliases (estaciomark03+something@gmail.com maps to estaciomark03@gmail.com)
    let normalizedCheckEmail = checkEmail
    let normalizedAllowedEmail = allowedEmail
    
    // Handle Gmail aliases - remove everything after + and before @
    if (normalizedCheckEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedCheckEmail.split('@')
      if (localPart.includes('+')) {
        normalizedCheckEmail = localPart.split('+')[0] + '@' + domain
      }
    }
    
    if (normalizedAllowedEmail.includes('@gmail.com')) {
      const [localPart, domain] = normalizedAllowedEmail.split('@')
      if (localPart.includes('+')) {
        normalizedAllowedEmail = localPart.split('+')[0] + '@' + domain
      }
    }
    
    // Exact match only (after normalizing Gmail aliases)
    const isAllowed = normalizedCheckEmail === normalizedAllowedEmail

    return NextResponse.json({ 
      allowed: isAllowed,
      message: isAllowed ? 'Email is allowed' : 'This email is not authorized to access this application'
    })
  } catch (error: any) {
    console.error('Error checking allowed email:', error)
    return NextResponse.json({ 
      allowed: false, 
      error: error.message || 'Failed to check email' 
    }, { status: 500 })
  }
}

