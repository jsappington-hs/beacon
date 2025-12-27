import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { users } from '../lib/api';
import type { User } from '../types';

interface TeamContextType {
  employees: User[];
  isLoading: boolean;
  error: string | null;
  refreshEmployees: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export function TeamProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only load employees if user is authenticated (has token)
    const token = localStorage.getItem('auth_token');
    if (token) {
      loadEmployees();
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadEmployees = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await users.getAll();
      setEmployees(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load employees');
      console.error('Failed to load employees:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshEmployees = async () => {
    await loadEmployees();
  };

  return (
    <TeamContext.Provider
      value={{
        employees,
        isLoading,
        error,
        refreshEmployees,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}
