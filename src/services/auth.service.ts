import { authApi } from '../lib/api';
import { AdminUser, LoginRequest, LoginResponse } from '../types/auth';

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await authApi.post<LoginResponse>('/api/users/auth/admin/signin', data);
    return response.data;
  },

  validateToken: async (): Promise<boolean> => {
    try {
      const response = await authApi.get('/api/validate/validate-token');
      return response.data?.data?.isAdmin === true;
    } catch {
      return false;
    }
  },

  addUser: async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
  }): Promise<{ userId: string }> => {
    const response = await authApi.post('/api/users/auth/add-user', userData);
    return response.data;
  },
};
