import { useState, useEffect } from 'react';
import { supabase } from '../db/supabaseClient';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'staff';
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

// Memory cache for listeners
let globalState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitialized: false,
};

const listeners = new Set<(state: AuthState) => void>();

function notify() {
  listeners.forEach(listener => listener({ ...globalState }));
}

async function fetchUserProfile(userId: string, email: string): Promise<AuthUser> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Could not fetch user profile role from profiles table, defaulting to staff:', error.message);
      return { id: userId, email, role: 'staff' };
    }

    const role = (data?.role === 'admin' ? 'admin' : 'staff') as 'admin' | 'staff';
    return { id: userId, email, role };
  } catch (err) {
    console.warn('Exception while fetching user profile:', err);
    return { id: userId, email, role: 'staff' };
  }
}

async function updateSessionUser(sessionUser: { id: string; email?: string } | null) {
  if (!sessionUser) {
    globalState = {
      user: null,
      isAuthenticated: false,
      isInitialized: true,
    };
    notify();
    return;
  }

  const email = sessionUser.email || '';
  const user = await fetchUserProfile(sessionUser.id, email);
  globalState = {
    user,
    isAuthenticated: true,
    isInitialized: true,
  };
  notify();
}

let initialized = false;

export function initAuth() {
  if (initialized) return;
  initialized = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    updateSessionUser(session?.user || null);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    updateSessionUser(session?.user || null);
  });
}

export async function loginWithPassword(email: string, password: string): Promise<{ error: Error | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error };
    }
    if (data?.user) {
      await updateSessionUser(data.user);
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  globalState = {
    user: null,
    isAuthenticated: false,
    isInitialized: true,
  };
  notify();
}

/**
 * React hook to access authentication state
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>(globalState);

  useEffect(() => {
    initAuth();
    listeners.add(setState);
    // sync current state in case it updated between render and mount
    setState({ ...globalState });
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return {
    ...state,
    login: loginWithPassword,
    logout,
  };
}
