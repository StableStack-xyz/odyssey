export interface GasTankBalance {
  address: string;
  balance: string;
  balanceWei: string;
  error?: string;
}

export type GasTankBalancesByNetwork = Record<string, GasTankBalance[]>;

export interface GasStationStatusData {
  status: {
    supportedChains?: string[];
    gasTanksCount?: number;
    activeServices?: string[];
    [key: string]: any;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy' | string;
    services?: Record<string, any>;
    errors?: string[];
    [key: string]: any;
  };
}

export interface GasFundingRecord {
  id: number;
  user_address: string;
  network: string;
  gas_amount: string;
  deposit_amount: string;
  deposit_currency: string;
  gas_tank_address: string;
  deposit_tx_hash: string;
  funding_tx_hash: string | null;
  block_number: number | null;
  status: 'pending' | 'completed' | 'failed' | string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GasStationStatItem {
  network: string;
  status: string;
  attempts: string | number;
}

export interface GasFundingHistoryResponse {
  message?: string;
  data: GasFundingRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    last_page: number;
  };
}

export const SUPPORTED_GAS_NETWORKS = [
  { id: 'eth', label: 'Ethereum (ETH)', nativeSymbol: 'ETH', chainType: 'evm' },
  { id: 'matic', label: 'Polygon (POL)', nativeSymbol: 'POL', chainType: 'evm' },
  { id: 'bsc', label: 'BNB Smart Chain (BNB)', nativeSymbol: 'BNB', chainType: 'evm' },
  { id: 'tron', label: 'TRON (TRX)', nativeSymbol: 'TRX', chainType: 'tron' },
  { id: 'sepolia', label: 'Sepolia Testnet', nativeSymbol: 'ETH', chainType: 'evm' },
  { id: 'amoy', label: 'Polygon Amoy Testnet', nativeSymbol: 'POL', chainType: 'evm' },
] as const;

export function getNetworkMeta(networkName: string) {
  const norm = networkName.toLowerCase();
  if (norm.includes('eth') || norm === 'ethereum') {
    return { name: 'Ethereum', symbol: 'ETH', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
  }
  if (norm.includes('matic') || norm.includes('polygon') || norm.includes('amoy')) {
    return { name: norm.includes('amoy') ? 'Amoy Testnet' : 'Polygon', symbol: 'POL', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
  }
  if (norm.includes('tron') || norm.includes('trc')) {
    return { name: 'TRON', symbol: 'TRX', color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-800' };
  }
  if (norm.includes('bsc') || norm.includes('bep') || norm.includes('binance')) {
    return { name: 'BNB Chain', symbol: 'BNB', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
  }
  if (norm.includes('sepolia')) {
    return { name: 'Sepolia', symbol: 'ETH', color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800' };
  }
  return { name: networkName.toUpperCase(), symbol: 'GAS', color: 'bg-slate-50 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
}
