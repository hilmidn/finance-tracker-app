import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import db from '../db/local'
import { setCurrentHouseholdId } from '../store/authSlice'

/**
 * Get the current user's household membership record.
 * Returns the household_members row that the user is part of (any status).
 * If no membership exists, returns null.
 *
 * userId is optional — defaults to the logged-in user from Redux. Pass
 * explicitly only when querying on behalf of someone else.
 */
export function useHousehold(userIdProp) {
  const dispatch = useDispatch()
  const queryClient = useQueryClient()
  const authUserId = useSelector((s) => s.auth.user?.id)
  const userId = userIdProp || authUserId

  // Get my membership(s) — could have one pending and one accepted, but per design
  // user can only be in 1 household (or 1 pending invite at a time)
  const membershipQuery = useQuery({
    queryKey: ['householdMembership', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('household_members')
        .select('*, households(*)')
        .eq('user_id', userId)
        .order('invited_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!userId,
  })

  // Cache to Dexie
  if (membershipQuery.data) {
    db.households.put(membershipQuery.data.households).catch(() => {})
    db.householdMembers.put({
      ...membershipQuery.data,
      id: membershipQuery.data.id,
      householdId: membershipQuery.data.household_id,
      userId: membershipQuery.data.user_id,
    }).catch(() => {})
  }

  // Create household
  const createMutation = useMutation({
    mutationFn: async ({ name }) => {
      if (!userId) throw new Error('Not logged in')

      // 1. Insert household
      const { data: household, error: hErr } = await supabase
        .from('households')
        .insert({ name, created_by: userId })
        .select()
        .single()
      if (hErr) throw hErr

      // 2. Insert self as admin/accepted
      const { error: mErr } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: userId,
          role: 'admin',
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
      if (mErr) throw mErr

      return household
    },
    onSuccess: async (household) => {
      dispatch(setCurrentHouseholdId(household.id))
      queryClient.invalidateQueries({ queryKey: ['householdMembership', userId] })
    },
  })

  // Rename household
  const renameMutation = useMutation({
    mutationFn: async ({ householdId, name }) => {
      const { data, error } = await supabase
        .from('households')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', householdId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['householdMembership', userId] })
    },
  })

  // Delete household (admin only — RLS enforces)
  const deleteMutation = useMutation({
    mutationFn: async (householdId) => {
      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', householdId)
      if (error) throw error
      return householdId
    },
    onSuccess: () => {
      dispatch(setCurrentHouseholdId(null))
      queryClient.invalidateQueries({ queryKey: ['householdMembership', userId] })
    },
  })

  const setCurrentHousehold = useCallback((id) => {
    dispatch(setCurrentHouseholdId(id))
  }, [dispatch])

  return {
    membership: membershipQuery.data,
    household: membershipQuery.data?.households || null,
    status: membershipQuery.data?.status || null,  // 'pending' | 'accepted' | null
    role: membershipQuery.data?.role || null,      // 'admin' | 'member' | null
    isMember: membershipQuery.data?.status === 'accepted',
    hasPendingInvite: membershipQuery.data?.status === 'pending',
    loading: membershipQuery.isLoading,
    error: membershipQuery.error,
    createHousehold: (name) => createMutation.mutateAsync({ name }),
    renameHousehold: (householdId, name) => renameMutation.mutateAsync({ householdId, name }),
    deleteHousehold: (householdId) => deleteMutation.mutateAsync(householdId),
    setCurrentHousehold,
  }
}
