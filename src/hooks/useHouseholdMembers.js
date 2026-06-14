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
      // Check if user is already a member
      // (RLS will prevent duplicate, but let's give nice error message)
      const { data, error } = await supabase
        .from('household_invites')
        .insert({ household_id: householdId, email: email.trim().toLowerCase(), invited_by: invitedBy })
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

  // Accept invite (called by invitee) — creates household_members row
  const acceptInviteMutation = useMutation({
    mutationFn: async ({ inviteId, userId }) => {
      // 1. Get the invite to know the household_id
      const { data: invite, error: gErr } = await supabase
        .from('household_invites')
        .select('*')
        .eq('id', inviteId)
        .single()
      if (gErr) throw gErr

      // 2. Create household_members row
      const { error: mErr } = await supabase
        .from('household_members')
        .insert({
          household_id: invite.household_id,
          user_id: userId,
          role: 'member',
          status: 'accepted',
          invited_by: invite.invited_by,
          accepted_at: new Date().toISOString(),
        })
      if (mErr) {
        if (mErr.code === '23505') {
          // Already a member — update the invite and move on
          await supabase
            .from('household_invites')
            .update({ status: 'accepted', responded_at: new Date().toISOString() })
            .eq('id', inviteId)
          return invite
        }
        throw mErr
      }

      // 3. Update invite status
      await supabase
        .from('household_invites')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', inviteId)

      return invite
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['householdMembership'] })
      queryClient.invalidateQueries({ queryKey: ['pendingInvites'] })
    },
  })

  // Reject invite (called by invitee)
  const rejectInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      const { error } = await supabase
        .from('household_invites')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', inviteId)
      if (error) throw error
      return inviteId
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
      // Use the RPC/select — RLS will filter to only my email
      const { data, error } = await supabase
        .from('household_invites')
        .select('*, households!household_invites_household_id_fkey(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })
}
