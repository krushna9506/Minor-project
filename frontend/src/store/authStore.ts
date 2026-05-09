import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User) => void;
  checkTokenExpiration: () => boolean;
  refreshTokenIfNeeded: () => Promise<boolean>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string): Promise<boolean> => {
        try {
          console.log('🔑 Attempting login for:', email);
          
          const formData = new FormData();
          formData.append('username', email);
          formData.append('password', password);

          const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          const { access_token, token_type } = response.data;
          console.log('🔑 Login response - token_type:', token_type, 'access_token length:', access_token?.length);

          // Get user info
          const userResponse = await axios.get(`${API_BASE_URL}/users/me`, {
            headers: {
              Authorization: `${token_type} ${access_token}`,
            },
          });

          console.log('🔑 User data retrieved:', userResponse.data);

          set({
            user: userResponse.data,
            token: access_token, // Store just the access token
            isAuthenticated: true,
          });

          console.log('🔑 Auth state updated successfully');
          return true;
        } catch (error) {
          console.error('🔑 Login failed:', error);
          return false;
        }
      },

      register: async (name: string, email: string, password: string): Promise<boolean> => {
        try {
          // Register user
          await axios.post(`${API_BASE_URL}/auth/register`, {
            name,
            email,
            password,
          });

          // Auto-login after successful registration
          const formData = new FormData();
          formData.append('username', email);
          formData.append('password', password);

          const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          const { access_token, token_type } = loginResponse.data;
          const token = `${token_type} ${access_token}`;

          // Get user info
          const userResponse = await axios.get(`${API_BASE_URL}/users/me`, {
            headers: {
              Authorization: token,
            },
          });

          set({
            user: userResponse.data,
            token: access_token,
            isAuthenticated: true,
          });

          // Set default axios header
          axios.defaults.headers.common['Authorization'] = token;

          return true;
        } catch (error) {
          console.error('Registration failed:', error);
          throw error; // Throw error so component can handle it
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        delete axios.defaults.headers.common['Authorization'];
      },

      setUser: (user: User) => {
        set({ user });
      },

      checkTokenExpiration: (): boolean => {
        const state = useAuthStore.getState();
        if (!state.token) return false;
        
        try {
          // Decode JWT token to check expiration
          const tokenParts = state.token.split('.');
          if (tokenParts.length !== 3) return false;
          
          const payload = JSON.parse(atob(tokenParts[1]));
          const currentTime = Date.now() / 1000;
          
          // Check if token expires in the next 24 hours (instead of 5 minutes)
          return payload.exp && (payload.exp - currentTime) < 86400; // 24 hours = 86400 seconds
        } catch (error) {
          console.error('Error checking token expiration:', error);
          return true; // Assume expired if we can't parse
        }
      },

      refreshTokenIfNeeded: async (): Promise<boolean> => {
        const state = useAuthStore.getState();
        
        if (!state.user || !state.isAuthenticated) {
          return false;
        }

        // Only auto-refresh for admin users for security
        if (!state.user.is_admin) {
          return false;
        }

        try {
          console.log('🔄 Refreshing token for admin user');
          
          // Re-authenticate with admin credentials
          const formData = new FormData();
          formData.append('username', state.user.email);
          formData.append('password', 'admin123'); // In production, use refresh tokens
          
          const response = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          const { access_token } = response.data;
          
          // Update the store with new token
          set({
            ...state,
            token: access_token,
          });
          
          console.log('✅ Token refreshed successfully');
          return true;
        } catch (error) {
          console.error('❌ Token refresh failed:', error);
          // Don't logout automatically, let user handle it
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Set axios interceptor to add token to requests
axios.interceptors.request.use((config) => {
  console.log('🚨 AXIOS INTERCEPTOR TRIGGERED!');
  
  const authState = useAuthStore.getState();
  const token = authState.token;
  const isAuthenticated = authState.isAuthenticated;
  
  console.log('🔐 Axios interceptor - Auth state:', {
    isAuthenticated,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'None'
  });
  
  if (token && isAuthenticated) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 Axios interceptor - Added Authorization header:', `Bearer ${token.substring(0, 20)}...`);
  } else {
    console.warn('🔐 Axios interceptor - No token or not authenticated!');
    console.warn('🔐 Debug - token:', token);
    console.warn('🔐 Debug - isAuthenticated:', isAuthenticated);
  }
  
  config.baseURL = API_BASE_URL;
  console.log('🔐 Axios interceptor - Request URL:', `${config.baseURL}${config.url}`);
  console.log('🔐 Axios interceptor - Final headers Authorization:', config.headers.Authorization);
  return config;
});

// Response interceptor for handling auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
