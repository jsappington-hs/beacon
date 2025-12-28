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
  const fetchUserProfile = async (authUser: SupabaseUser) => {
    try {
      console.log('fetchUserProfile: Starting for user', authUser.id);

      // Fetch user with organization
      console.log('fetchUserProfile: Making query...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          organizations (*)
        `)
        .eq('id', authUser.id)
        .single();

      console.log('fetchUserProfile: Query complete', { userData, userError });

      if (userError || !userData) {
        console.error('Error fetching user profile:', userError);
        return null;
      }

      const transformedUser = transformUser(userData, userData.organizations);
      setUser(transformedUser);

      if (userData.organizations) {
        setOrganization(transformOrganization(userData.organizations));
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authUser.id);

      return transformedUser;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setOrganization(null);
        }
      }
    );

    return () => subscription.unsubscribe();
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

    if (data.user) {
      console.log('login: Calling fetchUserProfile...');
      await fetchUserProfile(data.user);
      console.log('login: fetchUserProfile complete');
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
