import { useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { supabase } from '../lib/supabase'
import { setUser, setLoading } from '../store/authSlice'

export function useAuth() {
  const dispatch = useDispatch()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch(setUser(session?.user ?? null))
      dispatch(setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setUser(session?.user ?? null))
    })

    return () => subscription.unsubscribe()
  }, [dispatch])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }, [])

  const signUp = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { signIn, signUp, signOut }
}
