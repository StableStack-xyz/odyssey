export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
  isAdmin: boolean;
  role: string;
  isBlocked: boolean;
  isAccountVerified: boolean;
  lastLogin?: string;
}

export interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponse {
  status: string;
  data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    image?: string;
    isAdmin: boolean;
    role: string;
    isBlocked: boolean;
    isAccountVerified: boolean;
    lastLogin: string;
    token: string;
    session: {
      id: string;
      createdAt: string;
      platform: string;
      ipAddress: string;
    };
  };
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  ip_address?: string;
  location_data?: {
    country: string;
    city: string;
    region: string;
  };
  device_data?: {
    os?: unknown;
    client?: unknown;
    device?: unknown;
    userAgent: string;
  };
}

// Token validation response
export interface ValidateTokenResponse {
  status: string;
  data: {
    userId: string;
    email: string;
    isAdmin: boolean;
    role: string;
    sessionId: string;
  };
  message: string;
}
