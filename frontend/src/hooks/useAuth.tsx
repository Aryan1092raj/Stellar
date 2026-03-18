'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface User {
  email: string;
  role: 'donor' | 'ngo';
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, role: 'donor' | 'ngo') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored auth on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('geoledger-auth');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse stored auth:', error);
          localStorage.removeItem('geoledger-auth');
        }
      }
    }
  }, []);

  const login = async (email: string, role: 'donor' | 'ngo') => {
    // Read the real JWT set by the OTP flow in lib/auth.ts
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const realUser = { email, role, token };
    setUser(realUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('geoledger-auth', JSON.stringify(realUser));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('geoledger-auth');
    }
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
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
