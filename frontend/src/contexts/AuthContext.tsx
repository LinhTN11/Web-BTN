import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { userAPI, authAPI } from '../services/api';

interface AdminData {
  users: User[];
  lastFetched: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState<AdminData>({ users: [], lastFetched: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = async () => {
    try {
      const currentUser = await userAPI.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };  const updateUser = (updatedUserData: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUserData };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };
  // Setup automatic token refresh and heartbeat
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout;

    if (isAuthenticated && token) {
      // Refresh token every 10 minutes (access token expires in 15 minutes)
      refreshInterval = setInterval(async () => {
        try {
          console.log('Auto-refreshing token...');
          const response = await authAPI.refreshToken();
          if (response?.accessToken) {
            setToken(response.accessToken);
            localStorage.setItem('token', response.accessToken);
            console.log('Token auto-refreshed successfully');
          }
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          // If refresh fails, logout user
          logout();
        }
      }, 10 * 60 * 1000); // 10 minutes

      // Send heartbeat every 2 minutes to keep session alive
      heartbeatInterval = setInterval(async () => {
        try {
          await authAPI.heartbeat();
        } catch (error) {
          console.error('Heartbeat failed:', error);
        }
      }, 2 * 60 * 1000); // 2 minutes
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [isAuthenticated, token]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        
        if (savedUser && savedToken) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setToken(savedToken);
          setIsAuthenticated(true);

          // Refresh user data
          await refreshUserData();
          
          // If admin, preload admin data
          if (parsedUser.role === 'admin') {
            await preloadAdminData();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const preloadAdminData = async () => {
    try {
      const now = Date.now();
      if (now - adminData.lastFetched < CACHE_DURATION && adminData.users.length > 0) {
        return adminData.users;
      }

      const users = await userAPI.getAllUsers();
      if (Array.isArray(users)) {
        setAdminData({
          users,
          lastFetched: now
        });
        return users;
      }
      return [];
    } catch (error) {
      console.error('Error preloading admin data:', error);
      throw error;
    }
  };

  const login = async (response: any, accessToken: string) => {
    try {
      if (!response.user || !accessToken) {
        throw new Error('Invalid response data');
      }

      // Set auth state
      setUser(response.user);
      setToken(accessToken);
      setIsAuthenticated(true);
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', accessToken);

      // If admin, preload data
      if (response.user.role === 'admin') {
        await preloadAdminData();
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = () => {
    try {
      authAPI.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setAdminData({ users: [], lastFetched: 0 });
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };
  const getUsers = useCallback(() => adminData.users, [adminData.users]);
  
  const refreshUsers = useCallback(async () => {
    try {
      const users = await userAPI.getAllUsers();
      if (Array.isArray(users)) {
        const now = Date.now();
        setAdminData({
          users,
          lastFetched: now
        });
        return users;
      }
      return [];
    } catch (error) {
      console.error('Error refreshing users:', error);
      throw error;
    }
  }, []);
  const clearCache = () => {
    setAdminData({ users: [], lastFetched: 0 });
  };
  const updateUserInList = useCallback((userId: string, updatedData: Partial<User>) => {
    setAdminData(prevData => ({
      ...prevData,
      users: prevData.users.map(user => 
        user._id === userId ? { ...user, ...updatedData } : user
      )
    }));
  }, []);

  const removeUserFromList = useCallback((userId: string) => {
    setAdminData(prevData => ({
      ...prevData,
      users: prevData.users.filter(user => user._id !== userId)
    }));
  }, []);

  // Validate if token is still valid (not expired)
  const isTokenValid = useCallback((token: string): boolean => {
    try {
      if (!token) return false;
      
      // Extract JWT payload
      const base64Url = token.split('.')[1];
      if (!base64Url) return false;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      const payload = JSON.parse(jsonPayload);
      const currentTime = Date.now() / 1000;
      
      // Check if token is expired (with 30 second buffer)
      return payload.exp && payload.exp > (currentTime + 30);
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }, []);

  // Get valid token - refresh if needed
  const getValidToken = useCallback(async (): Promise<string | null> => {
    if (!token) return null;
    
    // Check if current token is still valid
    if (isTokenValid(token)) {
      return token;
    }
    
    try {
      console.log('Token expired, attempting refresh...');
      const response = await authAPI.refreshToken();
      if (response?.accessToken) {
        setToken(response.accessToken);
        localStorage.setItem('token', response.accessToken);
        console.log('Token refreshed successfully');
        return response.accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
    
    return null;
  }, [token, isTokenValid]);
  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshUserData,
    getUsers,
    refreshUsers,
    updateUserInList,
    removeUserFromList,
    clearCache,
    getValidToken
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
