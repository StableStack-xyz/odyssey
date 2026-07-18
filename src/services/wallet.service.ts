import { walletApi } from '../lib/api';

export interface Wallet {
  id: string;
  user_id: string;
  wallet_address: string;
  asset_code: string;
  network: string;
  balance: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: string;
  amount: string;
  currency: string;
  status: string;
  reference: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  businessName?: string;
  role: string;
  is_admin: boolean;
  is_blocked: boolean;
  isAccountVerified: boolean;
  complianceStatus: string;
  created_at: string;
}

// Wallets
export const walletService = {
  getAllWallets: async (): Promise<Wallet[]> => {
    const response = await walletApi.get('/api/admin/wallets');
    return response.data.data;
  },

  getWalletById: async (walletId: string): Promise<Wallet> => {
    const response = await walletApi.get(`/api/admin/wallets/${walletId}`);
    return response.data.data;
  },

  getWalletsByUserId: async (userId: string): Promise<Wallet[]> => {
    const response = await walletApi.get(`/api/wallets/${userId}`);
    return response.data.data;
  },

  createWallet: async (userId: string, data: { asset_code: string; network: string }): Promise<Wallet> => {
    const response = await walletApi.post(`/api/wallets/${userId}`, data);
    return response.data.data;
  },

  deleteWallet: async (walletId: string): Promise<void> => {
    await walletApi.delete(`/api/wallets/${walletId}`);
  },
};

// Transactions
export const transactionService = {
  getAllTransactions: async (params?: { page?: number; limit?: number; status?: string; user_id?: string }): Promise<{ transactions: Transaction[]; total: number }> => {
    const response = await walletApi.get('/api/admin/transactions', { params });
    return response.data.data;
  },

  getTransactionById: async (id: string): Promise<Transaction> => {
    const response = await walletApi.get(`/api/transactions/${id}`);
    return response.data.data;
  },

  getRevenueStats: async (params?: { startDate?: string; endDate?: string }): Promise<any> => {
    const response = await walletApi.get('/api/admin/transactions/revenue-stats', { params });
    return response.data.data;
  },

  getFlowStats: async (): Promise<any> => {
    const response = await walletApi.get('/api/admin/transactions/flow-stats');
    return response.data.data;
  },

  updateTransactionStatus: async (transactionId: string, status: string): Promise<void> => {
    await walletApi.patch(`/api/admin/transactions/${transactionId}/status`, { status });
  },

  deleteTransaction: async (transactionId: string): Promise<void> => {
    await walletApi.delete(`/api/transactions/${transactionId}`);
  },
};

// Users (from auth service)
export const userService = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ users: User[]; total: number }> => {
    // This will come from backend service
    const response = await walletApi.get('/api/admin/transactions', { params });
    return response.data.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await walletApi.get(`/api/wallets/${userId}`);
    return response.data.data;
  },

  blockUser: async (userId: string): Promise<void> => {
    // Block user endpoint
  },

  unblockUser: async (userId: string): Promise<void> => {
    // Unblock user endpoint
  },
};
