import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import db from '../db/local'

/**
 * Household members management.
 * - listMembers(householdId) → all members
 * - inviteByEmail(householdId, email) → creates household_invites row
 * - acceptInvite(inviteId) → create household_members row, update invite status
 * - rejectInvite(inviteId) → update invite status
 * - kickMember(membershipId) → admin removes member
 * - transferOwnership(householdId, currentAdminUserId, newAdminUserId) → swap roles
 * - cancelInvite(inviteId) → admin cancels pending invite
 * - listInvites(householdId) → pending invites for the household (admin view)
 */
export function useHouseholdMembers(householdId) {
  const queryClient = useQueryClient()
  const key = ['householdMembers', householdId]
  const invitesKey = ['householdInvites', householdId]

  // List members
  const listQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId)
        .order('invited_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    enabled: !!householdId,
  })

  // Cache to Dexie
  if (listQuery.data) {
    listQuery.data.forEach(m => {
      db.householdMembers.put({
        ...m,
        householdId: m.household_id,
        userId: m.user_id,
      }).catch(() => {})
    })
  }

  // List pending invites (admin view)
  const invitesQuery = useQuery({
    queryKey: invitesKey,
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('household_invites')
        .select('*')
        .eq('household_id', householdId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!householdId,
  })

  // Invite by email
  const inviteMutation = useMutation({
    mutationFn: async ({ householdId, email, invitedBy }) => {
      // Validation
      if (!email || !email.includes('@')) throw new Error('Email tidak valid')

      // Block self-invite: kalau inviter punya email yang sama dengan
      // yang di-invite, tolak. Cegah admin yang nge-test invite ke
      // email sendiri dari kena notif palsu.
      const { data: { user: sbUser } } = await supabase.auth.getUser()
      if (sbUser && sbUser.email && sbUser.email.toLowerCase() === email.trim().toLowerCase()) {
        throw new Error('Ga bisa invite diri sendiri')
      }
      void invitedBy  // param kept for API compat, not used for the check

      const { data, error } = await supabase
        .from('household_invites')
        .insert({ household_id: householdId, email: email.trim().toLowerCase(), invited_by: sbUser?.id })
        .select()
        .single()
      if (error) {
        if (error.code === '23505') {
          throw new Error('Email ini sudah diundang sebelumnya')
        }
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitesKey })
    },
  })

  // Cancel invite (admin only)
  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      const { error } = await supabase
        .from('household_invites')
        .update({ status: 'cancelled', responded_at: new Date().toISOString() })
        .eq('id', inviteId)
      if (error) throw error
      return inviteId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invitesKey })
    },
  })

  // Accept invite (called by invitee) — uses RPC to bypass RLS
  const acceptInviteMutation = useMutation({
    mutationFn: async ({ inviteId }) => {
      const { data, error } = await supabase
        .rpc('accept_household_invite', { p_invite_id: inviteId })
        .single()
      if (error) {
        console.error('[acceptInvite] RPC failed', error)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['householdMembership'] })
      queryClient.invalidateQueries({ queryKey: ['pendingInvites'] })
    },
  })

  // Reject invite (called by invitee) — uses RPC to bypass RLS
  const rejectInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      const { data, error } = await supabase
        .rpc('reject_household_invite', { p_invite_id: inviteId })
        .single()
      if (error) {
        console.error('[rejectInvite] RPC failed', error)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvites'] })
    },
  })

  // Kick member (admin only — RLS enforces)
  const kickMutation = useMutation({
    mutationFn: async (membershipId) => {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', membershipId)
      if (error) throw error
      return membershipId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })

  // Leave household (self-removal)
  const leaveMutation = useMutation({
    mutationFn: async (membershipId) => {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', membershipId)
      if (error) throw error
      return membershipId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
      queryClient.invalidateQueries({ queryKey: ['householdMembership'] })
    },
  })

  // Transfer ownership
  const transferMutation = useMutation({
    mutationFn: async ({ householdId, currentAdminUserId, newAdminUserId }) => {
      // 1. Demote current admin
      const { error: e1 } = await supabase
        .from('household_members')
        .update({ role: 'member' })
        .eq('household_id', householdId)
        .eq('user_id', currentAdminUserId)
      if (e1) throw e1
      // 2. Promote new admin
      const { error: e2 } = await supabase
        .from('household_members')
        .update({ role: 'admin' })
        .eq('household_id', householdId)
        .eq('user_id', newAdminUserId)
      if (e2) throw e2
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    members: listQuery.data || [],
    invites: invitesQuery.data || [],
    loading: listQuery.isLoading,
    invite: inviteMutation.mutateAsync,
    cancelInvite: cancelInviteMutation.mutateAsync,
    acceptInvite: acceptInviteMutation.mutateAsync,
    rejectInvite: rejectInviteMutation.mutateAsync,
    kick: kickMutation.mutateAsync,
    leave: leaveMutation.mutateAsync,
    transferOwnership: transferMutation.mutateAsync,
  }
}

/**
 * Get pending invites for current user (invitee view).
 * Matches by email since RLS exposes invites with email = current user's email.
 */
export function useMyPendingInvites(userId) {
  return useQuery({
    queryKey: ['pendingInvites', userId],
    queryFn: async () => {
      if (!userId) return []
      // RLS filters by email = current user. Extra filter: skip invites
      // where the current user is the inviter (self-invites from
      // admin testing) so admins don't get notifications for their
      // own invites.
      const { data, error } = await supabase
        .from('household_invites')
        .select('*, households!household_invites_household_id_fkey(name)')
        .eq('status', 'pending')
        .neq('invited_by', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}
