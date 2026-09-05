import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isSupabaseActive: boolean;
  login: (email: string, password?: string, preferredRole?: UserRole) => Promise<UserProfile>;
  signup: (email: string, password: string, fullName: string, role: UserRole, companyName?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  loginAsAdmin: () => Promise<UserProfile>;
  loginAsCustomer: () => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<string, UserProfile> = {
  'admin@novacraft.com': {
    id: 1,
    email: 'admin@novacraft.com',
    full_name: 'NovaCraft Operations Admin',
    role: 'ADMIN',
    company_name: 'NovaCraft Manufacturing',
  },
  'customer@abcindustries.com': {
    id: 2,
    email: 'customer@abcindustries.com',
    full_name: 'ABC Industries Finance Team',
    role: 'CUSTOMER',
    buyer_id: 1,
    buyer_name: 'ABC Industries',
    company_name: 'NovaCraft Manufacturing',
  },
};

const STORAGE_KEY = 'termwise_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isSupabaseActive = isSupabaseConfigured();

  // Load initial session
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // 1. Check if Supabase session exists
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const email = session.user.email || '';
            const metaRole = (session.user.user_metadata?.role as UserRole) || 'CUSTOMER';
            const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User';

            // Attempt to get or sync profile from backend
            try {
              const profile = await api.getUserProfile(email, metaRole);
              setUser(profile);
              setLoading(false);
              return;
            } catch (err) {
              // Fallback to local session
              setUser({
                id: session.user.id,
                email,
                full_name: fullName,
                role: metaRole,
              });
              setLoading(false);
              return;
            }
          }
        }

        // 2. Check local storage for demo session
        const storedSession = localStorage.getItem(STORAGE_KEY);
        if (storedSession) {
          const parsedUser = JSON.parse(storedSession) as UserProfile;
          // Refresh profile data from backend if possible
          try {
            const liveProfile = await api.getUserProfile(parsedUser.email, parsedUser.role);
            setUser(liveProfile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(liveProfile));
          } catch {
            setUser(parsedUser);
          }
        } else {
          // Default to null
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to initialize auth session:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen to Supabase Auth state changes if active
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const email = session.user.email || '';
          const metaRole = (session.user.user_metadata?.role as UserRole) || 'CUSTOMER';
          try {
            const profile = await api.getUserProfile(email, metaRole);
            setUser(profile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
          } catch {
            const fallback: UserProfile = {
              id: session.user.id,
              email,
              full_name: session.user.user_metadata?.full_name || email.split('@')[0],
              role: metaRole,
            };
            setUser(fallback);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password?: string, preferredRole?: UserRole): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // If Supabase is available and password is provided, try Supabase login
      if (supabase && password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          const role = (data.user.user_metadata?.role as UserRole) || preferredRole || 'CUSTOMER';
          try {
            const profile = await api.getUserProfile(cleanEmail, role);
            setUser(profile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
            return profile;
          } catch {
            const profile: UserProfile = {
              id: data.user.id,
              email: cleanEmail,
              full_name: data.user.user_metadata?.full_name || cleanEmail.split('@')[0],
              role,
            };
            setUser(profile);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
            return profile;
          }
        }
      }

      // Offline / Demo Login
      let profile = DEMO_USERS[cleanEmail];
      if (!profile) {
        const detectedRole: UserRole = preferredRole || (cleanEmail.includes('admin') ? 'ADMIN' : 'CUSTOMER');
        try {
          profile = await api.getUserProfile(cleanEmail, detectedRole);
        } catch {
          profile = {
            id: Date.now(),
            email: cleanEmail,
            full_name: cleanEmail.split('@')[0].toUpperCase(),
            role: detectedRole,
            company_name: detectedRole === 'ADMIN' ? 'NovaCraft Manufacturing' : 'ABC Industries',
            buyer_name: detectedRole === 'CUSTOMER' ? 'ABC Industries' : undefined,
          };
        }
      }

      setUser(profile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    companyName?: string
  ): Promise<UserProfile> => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              company_name: companyName,
            },
          },
        });

        if (error) {
          throw error;
        }

        const profile: UserProfile = {
          id: data.user?.id || Date.now(),
          email: cleanEmail,
          full_name: fullName,
          role,
          company_name: companyName || (role === 'ADMIN' ? 'NovaCraft Manufacturing' : 'ABC Industries'),
          buyer_name: role === 'CUSTOMER' ? (companyName || 'ABC Industries') : undefined,
        };

        setUser(profile);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        return profile;
      }

      // Demo signup
      const profile: UserProfile = {
        id: Date.now(),
        email: cleanEmail,
        full_name: fullName,
        role,
        company_name: companyName || (role === 'ADMIN' ? 'NovaCraft Manufacturing' : 'ABC Industries'),
        buyer_name: role === 'CUSTOMER' ? (companyName || 'ABC Industries') : undefined,
      };

      setUser(profile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (supabase) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.warn('Supabase sign out error:', e);
        }
      }
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const loginAsAdmin = async () => {
    return login('admin@novacraft.com', undefined, 'ADMIN');
  };

  const loginAsCustomer = async () => {
    return login('customer@abcindustries.com', undefined, 'CUSTOMER');
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const liveProfile = await api.getUserProfile(user.email, user.role);
      setUser(liveProfile);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(liveProfile));
    } catch (e) {
      console.error('Failed to refresh profile', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        loading,
        isSupabaseActive,
        login,
        signup,
        logout,
        loginAsAdmin,
        loginAsCustomer,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
