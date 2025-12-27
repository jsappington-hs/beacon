import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../lib/api';
import type { User, LoginCredentials, Organization } from '../types';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      auth
        .getCurrentUser()
        .then((userData) => {
          setUser(userData);
          if (userData.organization) {
            setOrganization(userData.organization);
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const response = await auth.login(credentials);
    localStorage.setItem('auth_token', response.token);
    setUser(response.user);
    if (response.organization) {
      setOrganization(response.organization);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setOrganization(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const userData = await auth.getCurrentUser();
      setUser(userData);
      if (userData.organization) {
        setOrganization(userData.organization);
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
