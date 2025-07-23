import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../lib/api/client';
import { User } from '../types';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        const u = response.data.user;
        setUser({
          id: u.id,
          email: u.email,
          name: u.name || u.email, // fallback to email if name is missing
          role: (u.role || 'USER').toUpperCase() as User['role'],
          isActive: u.isActive,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        });
      } else {
        setUser(null);
        setError(response.error || 'Failed to fetch user');
      }
    } catch (err) {
      setUser(null);
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const value: UserContextType = {
    user,
    isLoading,
    error,
    refreshUser: fetchUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
} 