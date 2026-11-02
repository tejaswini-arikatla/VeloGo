import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, VehicleCategory } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (emailOrPhone: string, pass: string) => Promise<User>;
  registerCustomer: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
  }) => Promise<User>;
  registerCaptain: (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    drivingLicenseNumber: string;
    vehicleCategory: VehicleCategory;
    vehicleModel: string;
    registrationNumber: string;
    vehicleColor: string;
  }) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('velogo_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('velogo_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      if (token) {
        const u = await api.auth.getMe();
        setUser(u);
        localStorage.setItem('velogo_user', JSON.stringify(u));
      }
    } catch (e) {
      // Token may be expired
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshProfile();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (emailOrPhone: string, pass: string) => {
    const res = await api.auth.login({ emailOrPhone, password: pass });
    localStorage.setItem('velogo_token', res.accessToken);
    localStorage.setItem('velogo_refresh_token', res.refreshToken);
    localStorage.setItem('velogo_user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const registerCustomer = async (data: any) => {
    const res = await api.auth.registerCustomer(data);
    localStorage.setItem('velogo_token', res.accessToken);
    localStorage.setItem('velogo_refresh_token', res.refreshToken);
    localStorage.setItem('velogo_user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const registerCaptain = async (data: any) => {
    const res = await api.auth.registerCaptain(data);
    localStorage.setItem('velogo_token', res.accessToken);
    localStorage.setItem('velogo_refresh_token', res.refreshToken);
    localStorage.setItem('velogo_user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    const rt = localStorage.getItem('velogo_refresh_token') || undefined;
    try {
      await api.auth.logout(rt);
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('velogo_token');
    localStorage.removeItem('velogo_refresh_token');
    localStorage.removeItem('velogo_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerCustomer,
        registerCaptain,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
