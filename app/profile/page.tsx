'use client'

import { useAuth } from '../../src/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'

export default function Profile() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState({
    full_name: '',
    phone_number: '',
    emergency_contact: ''
  })
  const [saving, setSaving] = useState(false)
  const [caregivers, setCaregivers] = useState<any[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([])
  const [showCaregiverForm, setShowCaregiverForm] = useState(false)
  const [caregiverEmail, setCaregiverEmail] = useState('')
  const [isOwner, setIsOwner] = useState(true)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [currentAccountEmail, setCurrentAccountEmail] = useState<string>('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchUserEmail()
      fetchProfile()
      resolveOwner()
    }
  }, [user])

  // Fetch caregivers after ownerUserId is resolved
  useEffect(() => {
    if (!user || !ownerUserId) return
    
    // Always fetch pending invitations for all users (to show pending invitations)
    fetchPendingInvitations()
    
    if (isOwner && ownerUserId) {
      // Owner: fetch their caregivers list
      fetchCaregivers()
      fetchCurrentAccountEmail()
      
      // Periodically refresh caregiver list to see when invitations are accepted
      const refreshInterval = setInterval(async () => {
        console.log(' Auto-refreshing caregiver list...')
        await fetchCaregivers()
      }, 5000) // Check every 5 seconds
      
      return () => clearInterval(refreshInterval)
    } else if (!isOwner && ownerUserId) {
      // Accepted caregiver: fetch owner's account email
      fetchCurrentAccountEmail()
      
      // Periodically check if caregiver relationship still exists
      const checkInterval = setInterval(async () => {
        const session = await refreshSessionIfNeeded()
        if (!session) return
        
        const { data: memberData } = await supabase
          .from('account_members')
          .select('owner_user_id')
          .eq('member_user_id', session.user.id)
          .eq('status', 'accepted')
          .maybeSingle()
        
        // If relationship no longer exists, refresh to reset to owner mode
        if (!memberData) {
          console.log('🔄 Caregiver relationship removed, refreshing profile...')
          await resolveOwner()
          // Clear pending invitations if no longer a caregiver
          setPendingInvitations([])
        }
      }, 5000) // Check every 5 seconds
      
      return () => clearInterval(checkInterval)
    }
  }, [user, isOwner, ownerUserId])

  const fetchUserEmail = async () => {
    try {
      // Get email from user_profiles table
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', user?.id)
        .single()

      if (data) {
        setUserEmail(data.email)
      } else if (user?.email) {
        // Fallback to auth user email
        setUserEmail(user.email)
      }
    } catch (error) {
      console.error('Error fetching user email:', error)
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
  }

  const fetchCurrentAccountEmail = async () => {
    if (!ownerUserId) return
    
    try {
      // Get email for the account being viewed (owner or caregiver's owner)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('id', ownerUserId)
        .single()

      if (data) {
        setCurrentAccountEmail(data.email)
      }
    } catch (error) {
      console.error('Error fetching current account email:', error)
    }
  }

  // Helper function to refresh session and handle JWT expiration
  const refreshSessionIfNeeded = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        if (sessionError.message?.includes('JWT') || sessionError.message?.includes('expired')) {
          console.log(' JWT expired, attempting to refresh session...')
          if (session) {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession(session)
            if (refreshError || !refreshedSession) {
              console.error(' Failed to refresh session:', refreshError)
              alert('Your session has expired. Please log in again.')
              router.push('/login')
              return null
            }
            return refreshedSession
          } else {
            alert('Your session has expired. Please log in again.')
            router.push('/login')
            return null
          }
        } else {
          throw sessionError
        }
      }
      
      if (!session?.user) {
        console.error(' No user session')
        alert('Not logged in. Please log in again.')
        router.push('/login')
        return null
      }
      
      return session
    } catch (error: any) {
      console.error(' Session error:', error)
      if (error?.message?.includes('JWT') || error?.message?.includes('expired')) {
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession()
          if (currentSession) {
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession(currentSession)
            if (refreshError || !refreshedSession) {
              alert('Your session has expired. Please log in again.')
              router.push('/login')
              return null
            }
            return refreshedSession
          } else {
            alert('Your session has expired. Please log in again.')
            router.push('/login')
            return null
          }
        } catch (refreshErr) {
          alert('Your session has expired. Please log in again.')
          router.push('/login')
          return null
        }
      }
      throw error
    }
  }

  const resolveOwner = async () => {
    try {
      // Refresh session first to avoid JWT expiration
      const session = await refreshSessionIfNeeded()
      if (!session) {
        return
      }
      
      const currentUserId = session.user.id
      if (!currentUserId) {
        console.log('No user ID found')
        return
      }

      console.log('Resolving owner for user:', currentUserId)

      // Check if user is owner or caregiver
      // Select status as well to check if relationship is accepted
      const { data: memberData, error: memberError } = await supabase
        .from('account_members')
        .select('owner_user_id, status')
        .eq('member_user_id', currentUserId)
        .maybeSingle()

      // Handle JWT expiration
      if (memberError) {
        if (memberError.message?.includes('JWT') || memberError.message?.includes('expired')) {
          console.log(' JWT expired in resolveOwner, refreshing...')
          const refreshedSession = await refreshSessionIfNeeded()
          if (!refreshedSession) return
          
          // Retry the query (with status)
          const retryResult = await supabase
            .from('account_members')
            .select('owner_user_id, status')
            .eq('member_user_id', currentUserId)
            .maybeSingle()
          
          if (retryResult.error && retryResult.error.code !== 'PGRST116') {
            console.log('Error checking member status (assuming owner):', retryResult.error)
            setOwnerUserId(currentUserId)
            setIsOwner(true)
            return
          }
          
          if (retryResult.data && retryResult.data.status === 'accepted') {
            // User is an accepted caregiver
            console.log('User is an accepted caregiver, owner:', retryResult.data.owner_user_id)
            setOwnerUserId(retryResult.data.owner_user_id)
            setIsOwner(false)
            return
          } else if (retryResult.data && retryResult.data.status !== 'accepted') {
            // User has pending/rejected relationship - treat as owner
            console.log('User has pending caregiver invitation, but is owner for now:', currentUserId)
            setOwnerUserId(currentUserId)
            setIsOwner(true)
            return
          } else {
            setOwnerUserId(currentUserId)
            setIsOwner(true)
            return
          }
        } else if (memberError.code !== 'PGRST116') {
          // Table might not exist, assume owner
          console.log('Error checking member status (assuming owner):', memberError)
          setOwnerUserId(currentUserId)
          setIsOwner(true)
          return
        }
      }

      if (memberData && memberData.owner_user_id) {
        // User has a relationship - check if it's accepted or pending
        const { data: verifyRelationship } = await supabase
          .from('account_members')
          .select('status')
          .eq('owner_user_id', memberData.owner_user_id)
          .eq('member_user_id', currentUserId)
          .maybeSingle()
        
        if (verifyRelationship) {
          if (verifyRelationship.status === 'accepted') {
            // Relationship exists and is accepted - user is an active caregiver
            console.log('User is an accepted caregiver, owner:', memberData.owner_user_id)
            setOwnerUserId(memberData.owner_user_id)
            setIsOwner(false)
          } else {
            // Relationship exists but is pending or rejected - user is still considered owner until accepted
            // But we need to fetch pending invitations so they can accept
            console.log('User has pending caregiver invitation, but is owner for now:', currentUserId)
            setOwnerUserId(currentUserId)
            setIsOwner(true)
            // Still fetch pending invitations even though isOwner=true
            // This will be handled by always fetching invitations for all users
          }
        } else {
          // Relationship was removed - user is now an owner
          console.log('Caregiver relationship removed, user is now owner:', currentUserId)
          setOwnerUserId(currentUserId)
          setIsOwner(true)
        }
      } else {
        // User is an owner
        console.log('User is an owner:', currentUserId)
        setOwnerUserId(currentUserId)
        setIsOwner(true)
      }
    } catch (e) {
      console.error('Error resolving owner:', e)
      // On error, assume user is owner
      const session = await refreshSessionIfNeeded()
      if (session?.user) {
        setOwnerUserId(session.user.id)
        setIsOwner(true)
      }
    }
  }

  const fetchCaregivers = async () => {
    if (!isOwner || !ownerUserId) {
      console.log('Cannot fetch caregivers - isOwner:', isOwner, 'ownerUserId:', ownerUserId)
      setCaregivers([])
      return
    }

    console.log(' Fetching caregivers for owner:', ownerUserId)

    try {
      // Refresh session first to avoid JWT expiration
      const session = await refreshSessionIfNeeded()
      if (!session) {
        setCaregivers([])
        return
      }

      // Fetch caregivers with email lookup (only accepted ones for count)
      let { data, error } = await supabase
        .from('account_members')
        .select(`
          id,
          member_user_id,
          status,
          created_at
        `)
        .eq('owner_user_id', ownerUserId)
        .in('status', ['accepted', 'pending']) // Show both accepted and pending
        .order('created_at', { ascending: false })

      // Handle JWT expiration
      if (error) {
        if (error.message?.includes('JWT') || error.message?.includes('expired') || error.code === 'PGRST301') {
          console.log(' JWT expired in fetchCaregivers, refreshing...')
          const refreshedSession = await refreshSessionIfNeeded()
          if (!refreshedSession) {
            setCaregivers([])
            return
          }
          
          // Retry the query
          const retryResult = await supabase
            .from('account_members')
            .select(`
              id,
              member_user_id,
              status,
              created_at
            `)
            .eq('owner_user_id', ownerUserId)
            .in('status', ['accepted', 'pending'])
            .order('created_at', { ascending: false })
          
          if (retryResult.error) {
            if (retryResult.error.code === '42P01' || retryResult.error.message?.includes('does not exist')) {
              console.log(' Caregiver tables not set up yet.')
              setCaregivers([])
              return
            }
            console.error(' Error fetching caregivers after refresh:', retryResult.error)
            setCaregivers([])
            return
          }
          
          data = retryResult.data
        } else if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log(' Caregiver tables not set up yet.')
          setCaregivers([])
          return
        } else {
          console.error(' Error fetching caregivers:', error)
          setCaregivers([])
          return
        }
      }

      // Fetch email for each caregiver
      if (data && data.length > 0) {
        const caregiversWithEmail = await Promise.all(
          data.map(async (caregiver) => {
            try {
              const { data: profileData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('id', caregiver.member_user_id)
                .single()
              
              return {
                ...caregiver,
                user_profiles: profileData ? { email: profileData.email } : null,
                status: caregiver.status || 'pending'
              }
            } catch (emailError) {
              console.error('Error fetching email for caregiver:', emailError)
              return {
                ...caregiver,
                user_profiles: null
              }
            }
          })
        )
        
        console.log(' Found caregivers:', caregiversWithEmail.length)
        if (caregiversWithEmail.length > 0) {
          console.log('Caregiver data:', JSON.stringify(caregiversWithEmail, null, 2))
        }
        setCaregivers(caregiversWithEmail)
      } else {
        console.log(' No caregivers found')
        setCaregivers([])
      }
    } catch (error: any) {
      console.error(' Exception fetching caregivers:', error)
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        console.log(' Caregiver tables not set up yet.')
        setCaregivers([])
      } else {
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          details: error?.details
        })
        setCaregivers([])
      }
    }
  }

  const handleInviteCaregiver = async () => {
    if (!caregiverEmail.trim()) {
      alert('Please enter a caregiver email')
      return
    }

    // LIMIT: Only ONE accepted caregiver allowed per account
    const acceptedCaregivers = caregivers.filter(c => c.status === 'accepted')
    if (acceptedCaregivers.length >= 1) {
      alert(' You can only have ONE accepted caregiver per account.\n\nPlease remove the existing caregiver first before adding a new one.')
      return
    }

    // CONFIRMATION: Show who will be added
    const confirmMessage = `Add ${caregiverEmail.trim()} as a caregiver?\n\nThey will be able to:\n- View all medications\n- View and edit schedules\n- Dispense medications\n- View history\n\n⚠️ Only ONE caregiver is allowed per account.\n\nClick OK to confirm, Cancel to abort.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // Find user by email - use database function to find or create profile
      let profileData = null
      let userId = null
      
      // First try direct lookup in user_profiles
      const { data: profileDataFromProfiles } = await supabase
        .from('user_profiles')
        .select('id, email')
        .eq('email', caregiverEmail.trim().toLowerCase())
        .maybeSingle()

      if (profileDataFromProfiles) {
        userId = profileDataFromProfiles.id
        profileData = { id: userId }
        console.log(' Found user in user_profiles:', userId)
      } else {
        // User not found in profiles - try to find/create using database function
        console.log('User not in user_profiles, trying to find/create via database function...')
        
        try {
          // Call database function to find or create user profile
          const { data: functionResult, error: functionError } = await supabase
            .rpc('find_or_create_user_profile_by_email', {
              email_search: caregiverEmail.trim().toLowerCase()
            })
          
          if (functionError) {
            console.error('Error calling find_or_create_user_profile_by_email:', functionError)
            // Function might not exist - fallback to manual lookup
            alert(`User email not found: ${caregiverEmail.trim()}\n\n` +
              `The user account might exist but the profile entry is missing.\n\n` +
              `Please run this SQL in Supabase to fix it:\n\n` +
              `INSERT INTO user_profiles (id, email)\n` +
              `SELECT id, email FROM auth.users\n` +
              `WHERE LOWER(email) = '${caregiverEmail.trim().toLowerCase()}'\n` +
              `ON CONFLICT (id) DO NOTHING;`)
            return
          }
          
          if (functionResult && functionResult.length > 0) {
            userId = functionResult[0].user_id
            profileData = { id: userId }
            console.log(' Found/created user profile via function:', userId)
            
            if (functionResult[0].created) {
              console.log(' Created new profile entry for existing user')
            }
          } else {
            // User doesn't exist in auth.users at all
            alert('User not found. They must sign up first.\n\nTell them to:\n1. Go to the login page\n2. Click "Sign Up"\n3. Create an account\n4. Confirm their email\n5. Log in at least once\n\nThen try adding them again.')
            return
          }
        } catch (error: any) {
          console.error('Exception calling find_or_create function:', error)
          alert(`User email not found: ${caregiverEmail.trim()}\n\n` +
            `Run this SQL in Supabase to create the profile:\n\n` +
            `INSERT INTO user_profiles (id, email)\n` +
            `SELECT id, email FROM auth.users\n` +
            `WHERE LOWER(email) = '${caregiverEmail.trim().toLowerCase()}'\n` +
            `ON CONFLICT (id) DO NOTHING;`)
          return
        }
      }

      if (!profileData || !userId) {
        alert('User not found. They must sign up first.\n\nTell them to:\n1. Go to the login page\n2. Click "Sign Up"\n3. Create an account\n4. Confirm their email\n5. Log in at least once\n\nThen try adding them again.')
        return
      }

      // Check if they're trying to add themselves
      if (userId === ownerUserId) {
        alert('You cannot add yourself as a caregiver!')
        return
      }

      // Update profileData to use userId
      profileData = { id: userId }

      // Check ALL existing relationships (not just accepted/pending) to handle any edge cases
      let { data: allExistingRelationships, error: checkError } = await supabase
        .from('account_members')
        .select('owner_user_id, status, id')
        .eq('member_user_id', profileData.id)

      // If status column doesn't exist, try without status filter
      if (checkError && (checkError.message?.includes('column') || checkError.message?.includes('status'))) {
        console.log('Status column may not exist, checking without it...')
        const { data: allRelationshipsNoStatus } = await supabase
          .from('account_members')
          .select('owner_user_id, id')
          .eq('member_user_id', profileData.id)
        // Map to include default status for compatibility
        allExistingRelationships = allRelationshipsNoStatus?.map(rel => ({ ...rel, status: 'accepted' as const })) || null
        checkError = null
      }

      if (checkError && !checkError.message?.includes('column')) {
        console.error('Error checking existing caregiver relationships:', checkError)
        // Don't block - continue with adding
      }

      // Filter to only active relationships (accepted or pending, or all if status doesn't exist)
      const activeRelationships = allExistingRelationships?.filter(rel => 
        !rel.status || rel.status === 'accepted' || rel.status === 'pending'
      ) || []

      if (activeRelationships.length > 0) {
        // Check if they're already a caregiver for this owner
        const existingForThisOwner = activeRelationships.find(
          rel => rel.owner_user_id === ownerUserId
        )
        
        if (existingForThisOwner) {
          // Relationship exists for this owner - check if it's active
          if (existingForThisOwner.status === 'rejected' || !existingForThisOwner.status) {
            // It's rejected or no status - delete it and allow new invitation
            await supabase
              .from('account_members')
              .delete()
              .eq('id', existingForThisOwner.id)
            console.log(' Removed rejected/invalid relationship to allow new invitation')
          } else {
            alert('This user is already a caregiver for your account! Please refresh the page to see the current status.')
            setCaregiverEmail('')
            await fetchCaregivers() // Refresh to show current status
            return
          }
        } else {
          // They're a caregiver for a different owner - ask to remove old relationships
          const confirmMessage = `This user is already a caregiver for another account.\n\n` +
            `To add them to your account, we need to remove their existing caregiver relationship.\n\n` +
            `This will:\n` +
            `- Remove their access to the other account\n` +
            `- Add them to your account as a new caregiver\n\n` +
            `Do you want to continue?`
          
          if (!confirm(confirmMessage)) {
            setCaregiverEmail('')
            return
          }
          
          // Remove all existing relationships for this caregiver
          const { error: deleteError } = await supabase
            .from('account_members')
            .delete()
            .eq('member_user_id', profileData.id)
          
          if (deleteError) {
            console.error('Error removing existing relationships:', deleteError)
            alert(' Error removing existing caregiver relationships. Please try again.')
            return
          }
          
          console.log(` Removed ${activeRelationships.length} existing caregiver relationship(s)`)
        }
      }

      // Double-check limit before inserting (count only accepted caregivers)
      // Handle case where status column might not exist
      let { count: currentCount } = await supabase
        .from('account_members')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', ownerUserId)

      // If status column exists, filter by accepted status
      if (currentCount !== undefined && currentCount !== null && currentCount > 0) {
        try {
          const { count: acceptedCount } = await supabase
            .from('account_members')
            .select('id', { count: 'exact', head: true })
            .eq('owner_user_id', ownerUserId)
            .eq('status', 'accepted')
          
          if (acceptedCount && acceptedCount >= 1) {
            alert(' You already have an accepted caregiver. Please refresh and remove the existing one first.')
            await fetchCaregivers()
            return
          }
        } catch (statusError: any) {
          // Status column doesn't exist, use total count
          if (currentCount !== null && currentCount >= 1) {
            alert(' You already have a caregiver. Please refresh and remove the existing one first.')
            await fetchCaregivers()
            return
          }
        }
      }

      // Final validation: Ensure no duplicates will be created
      // Check if this exact relationship already exists
      const { count: finalCheck } = await supabase
        .from('account_members')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', ownerUserId)
        .eq('member_user_id', profileData.id)

      if (finalCheck && finalCheck > 0) {
        // Relationship exists - delete it and allow re-adding
        console.log(' Relationship exists but may be invalid, deleting and re-adding...')
        await supabase
          .from('account_members')
          .delete()
          .eq('owner_user_id', ownerUserId)
          .eq('member_user_id', profileData.id)
        console.log(' Removed existing relationship to allow fresh addition')
      }

      const { error } = await supabase
        .from('account_members')
        .insert({
          owner_user_id: ownerUserId,
          member_user_id: profileData.id,
          role: 'caregiver',
          status: 'pending' // Invitation sent, waiting for caregiver to accept
        })

      if (error) {
        // Check if error is due to unique constraint violation
        if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
          alert(' This caregiver relationship already exists. Refreshing...')
          await fetchCaregivers()
          return
        }
        throw error
      }

      alert(` Caregiver invitation sent!\n\n${caregiverEmail.trim()} will receive the invitation and must accept it before they can access your PillPal system.`)
      setCaregiverEmail('')
      setShowCaregiverForm(false)
      await fetchCaregivers()
    } catch (error: any) {
      console.error('Error inviting caregiver:', error)
      alert(` Error: ${error.message || 'Failed to add caregiver'}`)
    }
  }

  const fetchPendingInvitations = async () => {
    if (!user?.id) {
      setPendingInvitations([])
      return
    }
    
    try {
      // Refresh session first
      const session = await refreshSessionIfNeeded()
      if (!session) {
        setPendingInvitations([])
        return
      }

      console.log(' Fetching pending invitations for user:', session.user.id)

      // Fetch pending invitations for this user (caregiver)
      const { data, error } = await supabase
        .from('account_members')
        .select(`
          id,
          owner_user_id,
          status,
          created_at
        `)
        .eq('member_user_id', session.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching pending invitations:', error)
        // If status column doesn't exist, return empty array
        if (error.message?.includes('column') || error.message?.includes('status')) {
          console.log(' Status column may not exist, returning empty invitations')
          setPendingInvitations([])
          return
        }
        setPendingInvitations([])
        return
      }

      console.log('📋 Found pending invitations:', data?.length || 0)

      // Fetch owner emails
      if (data && data.length > 0) {
        const invitationsWithEmail = await Promise.all(
          data.map(async (invitation) => {
            try {
              const { data: profileData } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('id', invitation.owner_user_id)
                .single()
              
              return {
                ...invitation,
                owner_email: profileData?.email || 'Unknown Email'
              }
            } catch (emailError) {
              console.error('Error fetching owner email:', emailError)
              return {
                ...invitation,
                owner_email: 'Unknown Email'
              }
            }
          })
        )
        console.log(' Set pending invitations:', invitationsWithEmail.length)
        setPendingInvitations(invitationsWithEmail)
      } else {
        console.log(' No pending invitations found')
        setPendingInvitations([])
      }
    } catch (error: any) {
      console.error(' Exception fetching pending invitations:', error)
      setPendingInvitations([])
    }
  }

  const handleAcceptInvitation = async (invitationId: string, ownerEmail: string) => {
    const confirmMessage = `Accept caregiver invitation from ${ownerEmail}?\n\nYou will be able to:\n- View all medications\n- View and edit schedules\n- Dispense medications\n- View history\n\nClick OK to accept, Cancel to decline.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // Refresh session first
      const session = await refreshSessionIfNeeded()
      if (!session) return

      const currentUserId = session.user.id
      console.log(' Starting acceptance process for invitation:', invitationId, 'user:', currentUserId)

      // STEP 1: Verify the invitation exists and is pending
      console.log(' Step 1: Verifying invitation exists and is pending...')
      const { data: invitationData, error: verifyError } = await supabase
        .from('account_members')
        .select('id, owner_user_id, member_user_id, status')
        .eq('id', invitationId)
        .eq('member_user_id', currentUserId)
        .maybeSingle()

      if (verifyError) {
        console.error(' Error verifying invitation:', verifyError)
        throw new Error(`Failed to verify invitation: ${verifyError.message}`)
      }

      if (!invitationData) {
        console.error(' Invitation not found or access denied')
        alert(' Error: Invitation not found. It may have already been accepted, rejected, or removed.')
        await fetchPendingInvitations()
        return
      }

      if (invitationData.status !== 'pending') {
        console.error(' Invitation already processed:', invitationData.status)
        alert(` Error: This invitation has already been ${invitationData.status}. Please refresh the page.`)
        await fetchPendingInvitations()
        return
      }

      console.log('✅ Invitation verified - owner:', invitationData.owner_user_id, 'status:', invitationData.status)

      // STEP 2: VALIDATION: Check if this user is already an owner who has caregivers
      console.log(' Step 2: Checking if user has caregivers...')
      const { data: existingCaregivers, error: checkError } = await supabase
        .from('account_members')
        .select('id, member_user_id')
        .eq('owner_user_id', currentUserId)
        .eq('status', 'accepted')

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing caregivers:', checkError)
        // Continue anyway - might be a temporary error
      } else if (existingCaregivers && existingCaregivers.length > 0) {
        // User already has caregivers - they cannot accept invitations
        alert(` Cannot accept invitation!\n\nYou already have ${existingCaregivers.length} caregiver(s) in your account.\n\nAn account with caregivers cannot also be a caregiver for another account.\n\nPlease remove your caregivers first if you want to accept this invitation.`)
        return
      }

      // STEP 3: VALIDATION: Check if this user is already a caregiver for someone else
      console.log(' Step 3: Checking if user is already a caregiver...')
      const { data: existingCaregiverRole, error: caregiverCheckError } = await supabase
        .from('account_members')
        .select('owner_user_id, status')
        .eq('member_user_id', currentUserId)
        .eq('status', 'accepted')
        .neq('id', invitationId) // Exclude this invitation
        .maybeSingle()

      if (caregiverCheckError && caregiverCheckError.code !== 'PGRST116') {
        console.error('Error checking existing caregiver role:', caregiverCheckError)
        // Continue anyway - might be a temporary error
      } else if (existingCaregiverRole && existingCaregiverRole.status === 'accepted') {
        // User is already an accepted caregiver for someone else
        alert(` Cannot accept invitation!\n\nYou are already a caregiver for another account.\n\nAn account can only be a caregiver for ONE owner at a time.\n\nPlease contact the current owner to remove you first if you want to accept this invitation.`)
        return
      }

      // STEP 4: Update status to 'accepted'
      console.log(' Step 4: Updating invitation status to accepted...')
      const { data: updateData, error: updateError } = await supabase
        .from('account_members')
        .update({ status: 'accepted' })
        .eq('id', invitationId)
        .eq('member_user_id', currentUserId) // Ensure user can only update their own invitations
        .eq('status', 'pending') // Only update if still pending (prevents race conditions)
        .select('id, owner_user_id, status') // Return the updated row to verify

      if (updateError) {
        console.error(' Error updating status:', updateError)
        
        // More specific error messages
        if (updateError.code === '42501' || updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
          throw new Error('Permission denied. You may not have permission to update this invitation. Please check your account permissions.')
        } else {
          throw new Error(`Failed to update invitation: ${updateError.message}`)
        }
      }

      // Check if update actually affected a row
      if (!updateData || updateData.length === 0) {
        console.error(' No rows updated - invitation may have been accepted/removed by another process')
        
        // Double-check the current status
        const { data: currentStatus } = await supabase
          .from('account_members')
          .select('status')
          .eq('id', invitationId)
          .single()
        
        if (currentStatus?.status === 'accepted') {
          console.log(' Invitation was already accepted (possibly by another tab/session)')
          alert(' This invitation has already been accepted. Refreshing...')
        } else {
          console.error(' Invitation status is:', currentStatus?.status)
          alert(' Error: Could not update invitation. It may have already been accepted, rejected, or removed. Please refresh the page.')
        }
        
        await fetchPendingInvitations()
        await resolveOwner()
        return
      }

      const updatedRow = updateData[0]
      console.log(' Status updated successfully:', updatedRow)
      
      // STEP 5: Small delay to ensure database sync
      console.log(' Step 5: Waiting for database sync...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // STEP 6: Verify the update was successful
      console.log(' Step 6: Verifying update...')
      const { data: verifyUpdate } = await supabase
        .from('account_members')
        .select('status')
        .eq('id', invitationId)
        .single()
      
      if (verifyUpdate?.status !== 'accepted') {
        console.error(' Verification failed - status is:', verifyUpdate?.status)
        alert(' Error: Invitation update could not be verified. Please refresh the page and try again.')
        await fetchPendingInvitations()
        return
      }
      
      console.log(' Update verified - status is now:', verifyUpdate.status)
      
      // STEP 7: Resolve owner status to sync state
      console.log(' Step 7: Resolving owner status after acceptance...')
      await resolveOwner()
      
      // STEP 8: Refresh pending invitations to remove the accepted one
      console.log(' Step 8: Refreshing pending invitations...')
      await fetchPendingInvitations()
      
      console.log(' Acceptance successful! owner_user_id:', updatedRow.owner_user_id)
      
      alert(` Invitation accepted! You can now access ${ownerEmail}'s PillPal system.\n\nRedirecting to dashboard...`)
      
      // Force a hard refresh to ensure state is synced (using window.location)
      // This ensures the page.tsx resolveOwner runs with fresh data
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
    } catch (error: any) {
      console.error(' Error accepting invitation:', error)
      alert(` Error: ${error.message || 'Failed to accept invitation'}\n\nPlease check the browser console for details and try refreshing the page.`)
    }
  }

  const handleRejectInvitation = async (invitationId: string, ownerEmail: string) => {
    const confirmMessage = `Reject caregiver invitation from ${ownerEmail}?\n\nThis invitation will be removed and you will not have access to their PillPal system.\n\nClick OK to reject, Cancel to keep it.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // Refresh session first
      const session = await refreshSessionIfNeeded()
      if (!session) return

      // Update status to 'rejected' or delete
      const { error } = await supabase
        .from('account_members')
        .update({ status: 'rejected' })
        .eq('id', invitationId)
        .eq('member_user_id', user?.id) // Ensure user can only update their own invitations

      if (error) throw error

      alert(` Invitation rejected.`)
      
      // Refresh pending invitations
      await fetchPendingInvitations()
    } catch (error: any) {
      console.error('Error rejecting invitation:', error)
      alert(` Error: ${error.message || 'Failed to reject invitation'}`)
    }
  }

  const handleRemoveCaregiver = async (memberId: string, caregiverEmail: string) => {
    const confirmMessage = `Remove ${caregiverEmail} as a caregiver?\n\nThey will lose access to your PillPal system immediately and will need to log out and log back in to see the change.\n\nClick OK to confirm, Cancel to abort.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // Refresh session first
      const session = await refreshSessionIfNeeded()
      if (!session) return

      // Delete the caregiver relationship
      const { error } = await supabase
        .from('account_members')
        .delete()
        .eq('id', memberId)
        .eq('owner_user_id', ownerUserId) // Ensure owner can only delete their own caregivers

      if (error) throw error

      alert(` Caregiver removed successfully!\n\n${caregiverEmail} will lose access immediately. They may need to refresh their browser or log out and log back in.`)
      await fetchCaregivers()
    } catch (error: any) {
      console.error('Error removing caregiver:', error)
      alert(` Error: ${error.message || 'Failed to remove caregiver'}`)
    }
  }

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone_number: data.phone_number || '',
          emergency_contact: data.emergency_contact || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Refresh session first to avoid JWT expiration
      const session = await refreshSessionIfNeeded()
      if (!session) {
        alert('Your session has expired. Please log in again.')
        router.push('/login')
        return
      }

      // Get fresh user ID from session
      const userId = session.user.id
      if (!userId) {
        throw new Error('No user ID found in session')
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          emergency_contact: profile.emergency_contact,
          updated_at: new Date().toISOString()
        })

      if (error) {
        // If JWT expired error, try refreshing again
        if (error.message?.includes('JWT') || error.message?.includes('expired')) {
          console.log('🔄 JWT expired during save, refreshing session...')
          const refreshedSession = await refreshSessionIfNeeded()
          if (!refreshedSession) {
            alert('Your session has expired. Please log in again.')
            router.push('/login')
            return
          }
          
          // Retry the save with refreshed session
          const { error: retryError } = await supabase
            .from('profiles')
            .upsert({
              id: refreshedSession.user.id,
              full_name: profile.full_name,
              phone_number: profile.phone_number,
              emergency_contact: profile.emergency_contact,
              updated_at: new Date().toISOString()
            })
          
          if (retryError) throw retryError
        } else {
          throw error
        }
      }
      
      alert('Profile updated successfully!')
      
      // Refresh profile data after save
      await fetchProfile()
    } catch (error: any) {
      console.error('Error updating profile:', error)
      alert('Error updating profile: ' + (error.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">My Profile</h1>
          <a
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>
          
          {/* Account Email Display */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-blue-900 mb-1">
              Account Email
            </label>
            <p className="text-lg font-semibold text-blue-800">
              {userEmail || user?.email || 'Loading...'}
            </p>
            {!isOwner && currentAccountEmail && (
              <p className="text-xs text-blue-600 mt-2">
                👤 You are a caregiver for: <strong>{currentAccountEmail}</strong>
              </p>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (for notifications)
              </label>
              <input
                type="tel"
                value={profile.phone_number}
                onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="09171234567"
              />
              <p className="text-sm text-gray-500 mt-1">
                Add your phone number to receive medication reminders via SMS
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact
              </label>
              <input
                type="text"
                value={profile.emergency_contact}
                onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Emergency contact name and number"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Caregiver Management Section */}
        {isOwner && (() => {
          const acceptedCaregivers = caregivers.filter((c: any) => c.status === 'accepted')
          return (
            <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Caregivers</h2>
                  <p className="text-sm text-gray-600">
                    Manage who can access your PillPal system
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchCaregivers()}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                    title="Refresh caregivers list"
                  >
                     Refresh
                  </button>
                  <button
                    onClick={() => setShowCaregiverForm(!showCaregiverForm)}
                    disabled={acceptedCaregivers.length >= 1}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {showCaregiverForm ? 'Cancel' : acceptedCaregivers.length >= 1 ? 'Max Caregiver Added' : ' Add Caregiver'}
                  </button>
                </div>
              </div>

              {showCaregiverForm && acceptedCaregivers.length < 1 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caregiver Email
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  They must have signed up first. Enter their exact email address.<br/>
                  <span className="font-medium text-orange-600">⚠️ Only ONE caregiver allowed per account.</span>
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={caregiverEmail}
                    onChange={(e) => setCaregiverEmail(e.target.value)}
                    placeholder="caregiver@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={acceptedCaregivers.length >= 1}
                  />
                  <button
                    onClick={handleInviteCaregiver}
                    disabled={acceptedCaregivers.length >= 1}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {showCaregiverForm && acceptedCaregivers.length >= 1 && (
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                   <strong>Maximum limit reached:</strong> You already have 1 accepted caregiver. Please remove the existing caregiver before adding a new one.
                </p>
              </div>
            )}

            {caregivers.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-700 mb-3">
                  Caregivers ({caregivers.filter(c => c.status === 'accepted').length} accepted, {caregivers.filter(c => c.status === 'pending').length} pending)
                </h3>
                {caregivers.map((caregiver) => (
                  <div
                    key={caregiver.id}
                    className={`flex justify-between items-center p-4 rounded-lg border transition-colors ${
                      caregiver.status === 'accepted' 
                        ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
                        : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">
                          {caregiver.user_profiles?.email || 'Unknown Email'}
                        </p>
                        {caregiver.status === 'pending' && (
                          <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full font-medium">
                            Pending Acceptance
                          </span>
                        )}
                        {caregiver.status === 'accepted' && (
                          <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full font-medium">
                            Accepted
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Invited {new Date(caregiver.created_at).toLocaleDateString()}
                      </p>
                      {caregiver.status === 'pending' && (
                        <p className="text-xs text-yellow-600 mt-1">
                           Waiting for {caregiver.user_profiles?.email || 'caregiver'} to accept the invitation
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveCaregiver(caregiver.id, caregiver.user_profiles?.email || 'this caregiver')}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-2">No caregivers added yet</p>
                <p className="text-sm">
                  Click "+ Add Caregiver" to give someone access to your PillPal system
                </p>
              </div>
              )}
            </div>
          )
        })()}

        {/* Caregiver Invitations Section - Show for ANY user with pending invitations */}
        {pendingInvitations.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
            <h2 className="text-2xl font-semibold mb-6">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      Invitation from: {invitation.owner_email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Invited {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-yellow-700 mt-2">
                      ⏳ You have been invited to be a caregiver. Accept to access their PillPal system.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRejectInvitation(invitation.id, invitation.owner_email)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAcceptInvitation(invitation.id, invitation.owner_email)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Caregiver Notice */}
        {!isOwner && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
            <p className="text-blue-800 font-medium">
              👤 You are viewing this account as a caregiver
            </p>
            <p className="text-blue-600 text-sm mt-2">
              You have access to manage medications, schedules, and dispensing.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}