import axios from 'axios';
import { LoginFormData, RegisterFormData } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increase timeout to 30 seconds
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add response interceptor
api.interceptors.response.use(
  response => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle timeout
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out'));
    }

    // Skip token refresh for logout requests
    if (originalRequest.url?.includes('/auth/logout')) {
      return Promise.reject(error);
    }

    // Handle token expiration
    if (error.response?.status === 401 && 
        (error.response?.data?.code === 'TOKEN_EXPIRED' || 
         error.response?.data?.message?.includes('hết hạn')) && 
        !originalRequest._retry) {
      
      originalRequest._retry = true;
      
      try {
        console.log('Token expired, attempting to refresh...');        // Try to refresh token
        const response = await api.post('/auth/refresh');
        
        if (response.data?.accessToken) {
          const newToken = response.data.accessToken;
          localStorage.setItem('token', newToken);
          
          // Update the failed request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          console.log('Token refreshed successfully, retrying original request');
          return api(originalRequest);
        }
        throw new Error('No token in refresh response');
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Force reload to login page
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Handle other auth errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      // If it's a non-retryable auth error, logout
      if (originalRequest._retry) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (data: LoginFormData) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error: any) {
      // Ignore 401/403 errors during logout as they don't affect the logout process
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Token already invalid during logout - proceeding with client-side cleanup');
      } else {
        console.error('Logout error:', error);
      }
    } finally {
      // Always clear local storage regardless of API call result
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  register: async (data: RegisterFormData) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  heartbeat: async () => {
    const response = await api.post('/auth/heartbeat');
    return response.data;
  }
};

export const userAPI = {
  getAllUsers: async () => {
    const response = await api.get('/user');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/user/me');
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await api.get(`/user/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: any) => {
    const response = await api.put(`/user/${id}`, data);
    return response.data;
  },

  updateProfile: async (data: any) => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/user/${id}`);
    return response.data;
  }
};

export default api;
