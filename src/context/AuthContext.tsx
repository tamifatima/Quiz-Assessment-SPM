import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';

type UserRole = 'teacher' | 'student' | null;

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'teacher' | 'student';
}

interface AuthContextType {
  role: UserRole;
  isTeacher: boolean;
  clientId: string | null;
  email: string | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signInWithPassword: (email: string, password: string, expectedRole?: 'teacher' | 'student') => Promise<{ error?: string }>;
  signUpWithPassword: (payload: {
    email: string;
    password: string;
    name?: string;
    role?: 'teacher' | 'student';
  }) => Promise<{ error?: string }>;
  signInWithGoogle: (
    withContactsScope?: boolean,
    redirectPath?: string,
    forceCurrentEmail?: boolean,
  ) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_OP_TIMEOUT_MS = 7000;
const ROLE_STORAGE_KEY = 'masscom_auth_role';

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs = AUTH_OP_TIMEOUT_MS): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const normalizeRole = (value: unknown): 'teacher' | 'student' =>
  String(value || 'student').trim().toLowerCase() === 'teacher' ? 'teacher' : 'student';

const normalizeAuthError = (message: string, mode: 'user' | 'admin' | 'signup'): string => {
  const value = String(message || '').toLowerCase();

  if (mode === 'signup') {
    if (
      value.includes('already registered') ||
      value.includes('already exists') ||
      value.includes('email address is invalid')
    ) {
      return 'Email already exists';
    }
    return message;
  }

  if (value.includes('invalid login credentials')) {
    return mode === 'admin' ? 'Admin account does not exist' : 'Account does not exist';
  }

  if (value.includes('lock:') || value.includes('another request stole it')) {
    return 'Please try logging in again';
  }

  return message;
};

const isLockContentionError = (message: string) => {
  const value = String(message || '').toLowerCase();
  return value.includes('lock:') || value.includes('another request stole it');
};

const readStoredRole = (): UserRole => {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
  if (value === 'teacher' || value === 'student') return value as UserRole;
  return null;
};

const writeStoredRole = (value: UserRole) => {
  if (typeof window === 'undefined') return;
  if (!value) {
    window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(ROLE_STORAGE_KEY, value);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => readStoredRole());
  const [clientId, setClientId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const signInWithPasswordSafe = async (userEmail: string, password: string) => {
    const first = await supabase.auth.signInWithPassword({ email: userEmail, password });
    if (!first.error || !isLockContentionError(first.error.message)) {
      return first;
    }

    await delay(250);
    return supabase.auth.signInWithPassword({ email: userEmail, password });
  };

  const clearClientState = () => {
    writeStoredRole(null);
    setRole(null);
    setClientId(null);
    setEmail(null);
    setProfile(null);
  };

  const applyRole = (value: UserRole) => {
    writeStoredRole(value);
    setRole(value);
  };

  const loadProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[loadProfile] Supabase error:', error.message, error);
      return null;
    }

    const mappedProfile: UserProfile | null = data
      ? {
          id: data.id,
          email: null,
          full_name: data.full_name ?? null,
          role: normalizeRole(data.role),
        }
      : null;

    setProfile(mappedProfile);
    return mappedProfile;
  };

  const refreshProfile = async () => {
    if (!clientId) return;
    try {
      const nextProfile = await withTimeout(loadProfile(clientId));
      if (nextProfile) {
        applyRole(nextProfile.role);
      }
    } catch {
      // Keep previous profile/UI state if refresh times out.
    }
  };

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      try {
        const user = session?.user;
        if (user?.id) {
          setClientId(user.id);
          setEmail(user.email ?? null);
          try {
            const nextProfile = await withTimeout(loadProfile(user.id));
            if (nextProfile) {
              applyRole(nextProfile.role);
            } else {
              applyRole(readStoredRole() ?? 'student');
            }
          } catch {
            applyRole(readStoredRole() ?? 'student');
          }
        } else {
          clearClientState();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);



  // signInWithPassword validates the selected role on the login form.
  // If the profile's role doesn't match what the user chose, reject with a clear error.
  const signInWithPassword = async (userEmail: string, password: string, expectedRole?: 'teacher' | 'student') => {
    const { data, error } = await signInWithPasswordSafe(userEmail, password);
    if (error) return { error: normalizeAuthError(error.message, 'user') };

    const id = data.user?.id;
    if (!id) {
      await supabase.auth.signOut({ scope: 'local' });
      clearClientState();
      return { error: 'Account does not exist' };
    }

    const nextProfile = await loadProfile(id);
    const actualRole = nextProfile?.role ?? 'student';

    // If a specific role was selected on the login form, enforce it.
    if (expectedRole && actualRole !== expectedRole) {
      await supabase.auth.signOut({ scope: 'local' });
      clearClientState();
      const roleName = expectedRole === 'teacher' ? 'Teacher' : 'Student';
      return { error: `No ${roleName} account found with these credentials.` };
    }

    applyRole(actualRole);
    setClientId(id);
    setEmail(data.user?.email ?? null);
    return {};
  };

  const signUpWithPassword = async ({ email: userEmail, password, name, role: desiredRole }: {
    email: string;
    password: string;
    name?: string;
    role?: 'teacher' | 'student';
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: userEmail,
      password,
      options: {
        data: { name: name || null },
      },
    });

    if (error) return { error: normalizeAuthError(error.message, 'signup') };

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: 'Email already exists' };
    }

    if (data.user?.id) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name || null,
        role: desiredRole ?? 'student',
      });
    }

    return {};
  };

  const signInWithGoogle = async (
    withContactsScope = false,
    redirectPath?: string,
    forceCurrentEmail = false,
  ) => {
    const baseRedirect =
      (import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL as string | undefined) || window.location.origin;
    const redirectTo = redirectPath
      ? `${window.location.origin}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`
      : baseRedirect;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: withContactsScope
          ? 'openid email profile https://www.googleapis.com/auth/contacts.readonly'
          : 'openid email profile',
        queryParams: {
          access_type: 'offline',
          include_granted_scopes: 'true',
          ...(forceCurrentEmail && email ? { login_hint: email } : {}),
          ...(forceCurrentEmail ? { prompt: withContactsScope ? 'consent' : 'none' } : {}),
        },
      },
    });

    if (error) return { error: normalizeAuthError(error.message, 'user') };
    return {};
  };

  const logout = async () => {
    clearClientState();
    setLoading(false);
    try {
      // Best-effort local sign out; state is already cleared for instant UX.
      void supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Local state is already reset.
    }
  };

  const value = useMemo(
    () => ({
      role,
      isTeacher: role === 'teacher',
      clientId,
      email,
      profile,
      loading,
      refreshProfile,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      logout,
    }),
    [role, clientId, email, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
