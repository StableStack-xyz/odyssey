import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Fuel,
  RefreshCw,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PermissionGate } from '../../components/auth/PermissionGate';
import { walletApi } from '../../lib/api';
import { APP_NAME } from '../../lib/constants';
import { getExplorerUrl } from '../../lib/explorer';
import {
  ManualFundModal,
  GasTankCardsGrid,
  GasStationTelemetryBar,
} from './-components';
import {
  SUPPORTED_GAS_NETWORKS,
  getNetworkMeta,
  type GasFundingRecord,
  type GasFundingHistoryResponse,
  type GasTankBalancesByNetwork,
  type GasStationStatusData,
} from './-types';

export const Route = createFileRoute('/gas-station/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token');
      if (!token) {
        throw redirect({ to: '/login' });
      }
    }
  },
  head: () => ({
    meta: [
      { title: `Gas Station - ${APP_NAME}` },
      { name: 'description', content: 'Monitor native gas tank balances, automated funding history, and manual gas top-ups' },
    ],
  }),
  component: GasStationPage,
});

function GasStationPage() {
  const [page, setPage] = useState(1);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchAddress, setSearchAddress] = useState<string>('');
  const [isManualFundModalOpen, setIsManualFundModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const limit = 20;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Fetch Gas Station Status & Health
  const {
    data: statusData,
    refetch: refetchStatus,
    isRefetching: isRefetchingStatus,
  } = useQuery<GasStationStatusData>({
    queryKey: ['gas-station', 'status'],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/gas-station/status');
      return response.data?.data;
    },
    refetchInterval: 30000,
  });

  // 2. Fetch Tank Balances
  const {
    data: tankBalances,
    refetch: refetchTanks,
    isRefetching: isRefetchingTanks,
  } = useQuery<GasTankBalancesByNetwork>({
    queryKey: ['gas-station', 'tanks'],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/gas-station/tanks/balances');
      return response.data?.data || {};
    },
    refetchInterval: 45000,
  });

  // 3. Fetch Funding History
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    refetch: refetchHistory,
    isRefetching: isRefetchingHistory,
  } = useQuery<GasFundingHistoryResponse>({
    queryKey: ['gas-station', 'history', page, selectedNetwork, selectedStatus, searchAddress],
    queryFn: async () => {
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (selectedNetwork !== 'all') params.network = selectedNetwork;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      if (searchAddress.trim()) params.address = searchAddress.trim();

      const response = await walletApi.get('/api/admin/gas-station/history', { params });
      return response.data;
    },
  });

  const handleRefreshAll = () => {
    refetchStatus();
    refetchTanks();
    refetchHistory();
    toast.success('Refreshing gas station telemetry and tank balances...');
  };

  const isGlobalRefreshing = isRefetchingStatus || isRefetchingTanks || isRefetchingHistory;

  const rows: GasFundingRecord[] = historyData?.data || [];
  const totalRecords = historyData?.meta?.total || 0;
  const totalPages = historyData?.meta?.last_page || Math.ceil(totalRecords / limit) || 1;

  const columns: Column<GasFundingRecord>[] = [
    {
      key: 'network',
      header: 'Network',
      render: (row) => {
        const meta = getNetworkMeta(row.network);
        return (
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${meta.color}`}>
            {meta.name}
          </span>
        );
      },
    },
    {
      key: 'user_address',
      header: 'Recipient Address',
      render: (row) => {
        const explorerUrl = getExplorerUrl({
          network: row.network,
          address: row.user_address,
        });

        return (
          <div className="flex items-center gap-1.5 font-mono text-xs text-ink">
            <span title={row.user_address}>
              {row.user_address
                ? `${row.user_address.substring(0, 8)}...${row.user_address.substring(row.user_address.length - 8)}`
                : '—'}
            </span>
            {row.user_address && (
              <>
                <button
                  type="button"
                  onClick={() => handleCopy(row.user_address, `addr-${row.id}`)}
                  className="p-1 rounded text-slate hover:text-ink hover:bg-vellum transition-colors cursor-pointer"
                  title="Copy Address"
                >
                  {copiedKey === `addr-${row.id}` ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-slate hover:text-ink hover:bg-vellum transition-colors"
                    title="View on Block Explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            )}
          </div>
        );
      },
    },
    {
      key: 'gas_amount',
      header: 'Gas Amount',
      render: (row) => {
        const meta = getNetworkMeta(row.network);
        return (
          <div>
            <span className="font-mono text-xs font-semibold text-ink">
              {row.gas_amount} {meta.symbol}
            </span>
            {row.deposit_amount && row.deposit_amount !== '0' && (
              <p className="text-[10px] text-slate">
                Deposit: {row.deposit_amount} {row.deposit_currency}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status || 'completed'} />,
    },
    {
      key: 'funding_tx_hash',
      header: 'Funding Transaction',
      render: (row) => {
        if (!row.funding_tx_hash) {
          return <span className="text-xs text-slate">—</span>;
        }

        const explorerUrl = getExplorerUrl({
          network: row.network,
          txHash: row.funding_tx_hash,
        });

        return (
          <div className="flex items-center gap-1.5 font-mono text-xs text-ink">
            <span title={row.funding_tx_hash}>
              {`${row.funding_tx_hash.substring(0, 10)}...${row.funding_tx_hash.substring(row.funding_tx_hash.length - 8)}`}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(row.funding_tx_hash!, `tx-${row.id}`)}
              className="p-1 rounded text-slate hover:text-ink hover:bg-vellum transition-colors cursor-pointer"
              title="Copy TX Hash"
            >
              {copiedKey === `tx-${row.id}` ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-slate hover:text-ink hover:bg-vellum transition-colors"
                title="View on Explorer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: 'gas_tank_address',
      header: 'Gas Tank Source',
      render: (row) => {
        if (!row.gas_tank_address) {
          return <span className="text-xs text-slate">—</span>;
        }
        return (
          <div className="flex items-center gap-1 font-mono text-xs text-slate">
            <span title={row.gas_tank_address}>
              {`${row.gas_tank_address.substring(0, 6)}...${row.gas_tank_address.substring(row.gas_tank_address.length - 6)}`}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(row.gas_tank_address, `tank-${row.id}`)}
              className="p-0.5 rounded text-slate hover:text-ink hover:bg-vellum transition-colors cursor-pointer"
            >
              {copiedKey === `tank-${row.id}` ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (row) => (
        <div className="text-xs text-slate whitespace-nowrap">
          <p className="text-ink font-medium">{new Date(row.created_at).toLocaleDateString()}</p>
          <p className="text-[11px]">{new Date(row.created_at).toLocaleTimeString()}</p>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Gas Station">
      <div className="space-y-6">
        {/* Top Header & CTAs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">Gas Station & Native Liquidity</h1>
            <p className="text-xs text-slate mt-1">
              Monitor multi-chain platform gas tank balances, automated sweep fundings, and queue manual top-ups.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isGlobalRefreshing}
              className="px-3.5 py-2 text-xs font-medium text-ink bg-paper border border-graphite-hairline hover:bg-vellum rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGlobalRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <PermissionGate resource="gas_station" action="write">
              <button
                type="button"
                onClick={() => setIsManualFundModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold text-paper bg-ink hover:opacity-90 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Manual Gas Top-up
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Telemetry Top Bar */}
        <GasStationTelemetryBar statusData={statusData} />

        {/* Gas Tanks Balances Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Fuel className="w-4 h-4 text-brand" />
              Gas Tank Balances Across Chains
            </h2>
            <span className="text-xs text-slate">Auto-refreshes every 45s</span>
          </div>
          <GasTankCardsGrid tanks={tankBalances} />
        </div>

        {/* Funding History Table */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Gas Funding Audit Trail</h2>
              <p className="text-xs text-slate">
                History of automated deposit-triggered fundings and admin manual transfers.
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Network Filter */}
              <div className="flex items-center gap-1.5 bg-paper border border-graphite-hairline rounded-lg px-2.5 py-1.5 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate" />
                <select
                  value={selectedNetwork}
                  onChange={(e) => {
                    setSelectedNetwork(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-ink border-none focus:outline-none cursor-pointer pr-2 text-xs"
                >
                  <option value="all">All Networks</option>
                  {SUPPORTED_GAS_NETWORKS.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-paper border border-graphite-hairline rounded-lg px-2.5 py-1.5 text-xs">
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  className="bg-transparent text-ink border-none focus:outline-none cursor-pointer pr-2 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Search Address */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by address..."
                  value={searchAddress}
                  onChange={(e) => {
                    setSearchAddress(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 text-xs bg-paper border border-graphite-hairline rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand w-48 transition-colors"
                />
              </div>
            </div>
          </div>

          <DataTable<GasFundingRecord>
            data={rows}
            columns={columns}
            rowKey={(row) => String(row.id)}
            isLoading={isHistoryLoading}
            page={page}
            totalPages={totalPages}
            total={totalRecords}
            limit={limit}
            onPageChange={setPage}
            emptyMessage="No gas funding records found matching the current filters."
          />
        </div>

        {/* Manual Gas Top-up Modal */}
        <ManualFundModal
          isOpen={isManualFundModalOpen}
          onClose={() => setIsManualFundModalOpen(false)}
        />
      </div>
    </AdminLayout>
  );
}
