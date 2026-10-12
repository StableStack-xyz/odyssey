import { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AdminUser, AuthState } from '../types/auth';
import { authApi } from '../lib/api';
import { collectDeviceAndLocationData } from '../services/deviceInfo';

// Actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: AdminUser; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'RESTORE_SESSION'; payload: { user: AdminUser; token: string } | null };

// Initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return { ...initialState, isLoading: false };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'RESTORE_SESSION':
      if (!action.payload) {
        return { ...initialState, isLoading: false };
      }
      return {
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    default:
      return state;
  }
}

// Context
interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session on mount (client-only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const restoreSession = async () => {
      const token = sessionStorage.getItem('admin_token');
      const userStr = sessionStorage.getItem('admin_user');

      if (!token || !userStr) {
        dispatch({ type: 'RESTORE_SESSION', payload: null });
        return;
      }

      try {
        const user = JSON.parse(userStr) as AdminUser;
        // Decode the token before validating with backend
        const decodedToken = atob(token);
        const refreshedUser = await validateTokenInternal(decodedToken);
        if (refreshedUser) {
          const finalUser: AdminUser = {
            ...user,
            ...refreshedUser,
          };
          sessionStorage.setItem('admin_user', JSON.stringify(finalUser));
          dispatch({ type: 'RESTORE_SESSION', payload: { user: finalUser, token: decodedToken } });
        } else {
          sessionStorage.removeItem('admin_token');
          sessionStorage.removeItem('admin_user');
          dispatch({ type: 'RESTORE_SESSION', payload: null });
        }
      } catch {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_user');
        dispatch({ type: 'RESTORE_SESSION', payload: null });
      }
    };

    restoreSession();
  }, []);

  const validateTokenInternal = async (token: string): Promise<Partial<AdminUser> | null> => {
    try {
      const response = await authApi.post('/api/validate/validate-token', {
        token,
      });
      // Correctly read the nested data envelope wrapped by the backend middleware
      const innerData = response.data?.data || response.data;
      if (innerData?.isValid === true && innerData?.user?.isAdmin === true) {
        const u = innerData.user;
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          image: u.image,
          isAdmin: u.isAdmin,
          adminRole: u.adminRole || (u.isAdmin ? 'super_admin' : 'custom_admin'),
          permissions: u.permissions || (u.adminRole === 'super_admin' || u.isAdmin ? { '*': ['*'] } : {}),
          isFullAccess: u.isFullAccess ?? Boolean(u.isAdmin && (u.adminRole === 'super_admin' || !u.adminRole)),
          role: u.role,
          isBlocked: u.isBlocked,
          isAccountVerified: u.isAccountVerified,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const deviceInfo = await collectDeviceAndLocationData();

      const response = await authApi.post('/api/users/auth/admin/signin', {
        email,
        password,
        ...deviceInfo,
      });

      const { data } = response.data;

      if (!data.isAdmin) {
        throw new Error('Not an admin user');
      }

      const user: AdminUser = {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        image: data.image,
        isAdmin: data.isAdmin,
        adminRole: data.adminRole || (data.isAdmin ? 'super_admin' : 'custom_admin'),
        permissions: data.permissions || (data.adminRole === 'super_admin' || data.isAdmin ? { '*': ['*'] } : {}),
        isFullAccess: data.isFullAccess ?? Boolean(data.isAdmin && (data.adminRole === 'super_admin' || !data.adminRole)),
        role: data.role,
        isBlocked: data.isBlocked,
        isAccountVerified: data.isAccountVerified,
        lastLogin: data.lastLogin,
      };

      // Store in sessionStorage (base64 encoded for basic obfuscation) - client only
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_token', btoa(data.token));
        sessionStorage.setItem('admin_user', JSON.stringify(user));
      }

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token: data.token },
      });

      return true;
    } catch (error) {
      console.error('Login error:', error);
      dispatch({ type: 'LOGIN_FAILURE' });
      return false;
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
    }
    dispatch({ type: 'LOGOUT' });
  };

  const validateToken = async (): Promise<boolean> => {
    if (!state.token) return false;
    const validatedUser = await validateTokenInternal(state.token);
    return validatedUser !== null;
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        validateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
