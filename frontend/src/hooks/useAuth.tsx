import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, LoginCredentials, Organization } from '../types';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Transform database user to frontend User type
function transformUser(dbUser: any, org?: any): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    title: dbUser.title,
    role: dbUser.role,
    organizationId: dbUser.organization_id,
    managerId: dbUser.manager_id,
    departmentId: dbUser.department_id,
    hireDate: dbUser.hire_date,
    profilePicture: dbUser.profile_picture,
    bio: dbUser.bio,
    phoneNumber: dbUser.phone_number,
    location: dbUser.location,
    isActive: dbUser.is_active,
    lastLoginAt: dbUser.last_login_at,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
    organization: org ? transformOrganization(org) : undefined,
  };
}

function transformOrganization(dbOrg: any): Organization {
  return {
    id: dbOrg.id,
    name: dbOrg.name,
    slug: dbOrg.slug,
    logo: dbOrg.logo,
    isActive: dbOrg.is_active,
    createdAt: dbOrg.created_at,
    updatedAt: dbOrg.updated_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async (authUser: SupabaseUser, accessToken?: string) => {
    try {
      console.log('fetchUserProfile: Starting for user', authUser.id);
      console.log('fetchUserProfile: Has access token:', !!accessToken);

      // First, just fetch the user without join
      console.log('fetchUserProfile: Making simple query...');

      // Use raw fetch instead of Supabase client to debug
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const url = `${supabaseUrl}/rest/v1/users?id=eq.${authUser.id}&select=*`;

      // Use provided token or fall back to anon key
      const token = accessToken || supabaseKey;

      console.log('fetchUserProfile: Making raw fetch...');
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('fetchUserProfile: Raw fetch complete, status:', response.status);

      const users = await response.json();
      console.log('fetchUserProfile: Raw fetch data:', users);

      const userData = users?.[0];
      const userError = !userData ? { message: 'User not found' } : null;

      console.log('fetchUserProfile: User query complete', { userData, userError });

      if (userError || !userData) {
        console.error('Error fetching user:', userError);
        return null;
      }

      // Then fetch organization separately
      console.log('fetchUserProfile: Fetching organization...');
      const orgUrl = `${supabaseUrl}/rest/v1/organizations?id=eq.${userData.organization_id}&select=*`;
      const orgResponse = await fetch(orgUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const orgs = await orgResponse.json();
      const orgData = orgs?.[0];

      console.log('fetchUserProfile: Org query complete', { orgData });

      const transformedUser = transformUser(userData, orgData);
      setUser(transformedUser);

      if (orgData) {
        setOrganization(transformOrganization(orgData));
      }

      // Skip last login update for now - can add back later
      return transformedUser;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set loading to false after a short delay - don't wait for session check
    // The onAuthStateChange will handle fetching profile if user is logged in
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('onAuthStateChange:', event, !!session);
        if (event === 'SIGNED_IN' && session?.user) {
          // Pass the access token from the session
          await fetchUserProfile(session.user, session.access_token);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOrganization(null);
        }
      }
    );

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    console.log('login: Starting...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    console.log('login: signInWithPassword complete', { user: data?.user?.id, error });

    if (error) {
      throw new Error(error.message);
    }

    // Don't call fetchUserProfile here - onAuthStateChange handles it
    // Just wait a moment for the auth state to propagate
    if (data.user) {
      console.log('login: Waiting for auth state to propagate...');
      // Give onAuthStateChange time to fire and fetch profile
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('login: Done waiting');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOrganization(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await fetchUserProfile(authUser);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
