'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from './supabase/client';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.full_name,
              created_at: profile.created_at,
            });
          }
        }
      } catch (err) {
        console.error('[FloMedia] Session check failed:', err);
      }
    };
    checkSession();
  }, [supabase]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        const userData = {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          created_at: profile.created_at,
        };
        setUser(userData);
        return { user: userData };
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      if (error) throw error;
      return { user: data.user };
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  return { user, loading, login, signup, logout };
}

export function useUser() {
  const { user } = useAuth();
  return { user };
}
