import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: 'traveler' | 'partner_storage' | 'partner_transport' | 'admin' | 'support';
  email_verified_at?: string | null;
  created_at: string;
  partner_account?: {
    id: string;
    type: string;
    status: string;
    verified_at?: string | null;
    storage_provider?: { business_name: string; verification_status: string } | null;
    transport_provider?: { name: string; verification_status: string } | null;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
    business_name?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  requestEmailVerification: (email?: string) => Promise<string>;
  confirmEmailVerification: (token: string) => Promise<string>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUserProfile = async () => {
    try {
      const profile = await api.request<User>('/auth/me');
      setUser(profile);
    } catch {
      setUser(null);
      api.clearTokens();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('travel_access_token');
    if (token) {
      refreshUserProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.request<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    api.setSession(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const register = async (input: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
    business_name?: string;
  }) => {
    const data = await api.request<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    api.setSession(data.accessToken, data.refreshToken);
    setUser(data.user);
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('travel_refresh_token');
    if (refreshToken) {
      try {
        await api.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignored on logout
      }
    }
    api.clearTokens();
    setUser(null);
  };

  const requestPasswordReset = async (email: string): Promise<string> => {
    const res = await api.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return res.message;
  };

  const resetPassword = async (token: string, newPassword: string): Promise<string> => {
    const res = await api.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
    return res.message;
  };

  const requestEmailVerification = async (email?: string): Promise<string> => {
    const res = await api.request<{ message: string }>('/auth/verify-email/request', {
      method: 'POST',
      body: JSON.stringify({ email: email || user?.email }),
    });
    return res.message;
  };

  const confirmEmailVerification = async (token: string): Promise<string> => {
    const res = await api.request<{ message: string }>('/auth/verify-email/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    await refreshUserProfile();
    return res.message;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        requestPasswordReset,
        resetPassword,
        requestEmailVerification,
        confirmEmailVerification,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
