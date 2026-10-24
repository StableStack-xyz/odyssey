import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Fuel,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '../../components/ui/Modal';
import { walletApi } from '../../lib/api';
import {
  SUPPORTED_GAS_NETWORKS,
  getNetworkMeta,
  type GasTankBalancesByNetwork,
  type GasStationStatusData,
} from './-types';

/* -------------------------------------------------------------------------- */
/*                            MANUAL FUND GAS MODAL                           */
/* -------------------------------------------------------------------------- */

interface ManualFundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualFundModal({ isOpen, onClose }: ManualFundModalProps) {
  const queryClient = useQueryClient();
  const [network, setNetwork] = useState<string>('eth');
  const [address, setAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');

  const fundMutation = useMutation({
    mutationFn: async () => {
      const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const response = await walletApi.post('/api/admin/gas-station/fund', {
        network,
        address: address.trim(),
        amount: amount.trim(),
        requestId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Manual gas funding request successfully queued');
      queryClient.invalidateQueries({ queryKey: ['gas-station'] });
      setAddress('');
      setAmount('');
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        err.message ||
        'Failed to queue manual gas funding';
      toast.error(msg);
    },
  });

  const selectedMeta = getNetworkMeta(network);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !amount.trim()) {
      toast.error('Please enter a recipient address and amount');
      return;
    }
    fundMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!fundMutation.isPending) onClose();
      }}
      title="Manual Gas Top-up"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate">
          Queue an immediate native gas transfer from the platform's gas tank wallet to any merchant or user address.
        </p>

        {/* Network Selector */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Destination Blockchain Network <span className="text-red-500">*</span>
          </label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value)}
            disabled={fundMutation.isPending}
            className="w-full px-3 py-2 text-xs bg-vellum/50 border border-graphite-hairline rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors disabled:opacity-50"
          >
            {SUPPORTED_GAS_NETWORKS.map((net) => (
              <option key={net.id} value={net.id}>
                {net.label}
              </option>
            ))}
          </select>
        </div>

        {/* Recipient Address */}
        <div>
          <label className="block text-xs font-semibold text-ink mb-1.5">
            Recipient Wallet Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder={network === 'tron' ? 'T...' : '0x...'}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={fundMutation.isPending}
            required
            className="w-full px-3 py-2 text-xs font-mono bg-vellum/50 border border-graphite-hairline rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors disabled:opacity-50"
          />
          <span className="block text-[11px] text-slate mt-1">
            {network === 'tron'
              ? 'Must be a valid Base58 TRON address starting with T'
              : 'Must be a valid 42-character hexadecimal EVM address (0x...)'}
          </span>
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-ink">
              Amount ({selectedMeta.symbol}) <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-slate">Native Coin Units</span>
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              placeholder="e.g. 0.05"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={fundMutation.isPending}
              required
              className="w-full pl-3 pr-14 py-2 text-xs font-mono bg-vellum/50 border border-graphite-hairline rounded-lg text-ink focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-colors disabled:opacity-50"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate">
              {selectedMeta.symbol}
            </span>
          </div>
          <span className="block text-[11px] text-slate mt-1">
            Specify amount in whole native units (e.g. 0.005 for 0.005 ETH / 15 for 15 TRX).
          </span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-graphite-hairline">
          <button
            type="button"
            onClick={onClose}
            disabled={fundMutation.isPending}
            className="px-4 py-2 text-xs font-medium text-ink bg-transparent border border-graphite-hairline hover:bg-vellum/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!address.trim() || !amount.trim() || fundMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-paper bg-ink hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
          >
            {fundMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Submitting Transfer...
              </>
            ) : (
              <>
                <Fuel className="w-3.5 h-3.5" />
                Queue Gas Transfer
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                             GAS TANK CARD GRID                             */
/* -------------------------------------------------------------------------- */

export function GasTankCardsGrid({ tanks }: { tanks?: GasTankBalancesByNetwork }) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  if (!tanks || Object.keys(tanks).length === 0) {
    return (
      <div className="p-6 text-center bg-vellum/30 rounded-xl border border-graphite-hairline text-slate text-xs">
        No active gas tanks configured or currently unreachable.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(tanks).map(([networkKey, tankList]) => {
        const meta = getNetworkMeta(networkKey);
        return tankList.map((tank, idx) => {
          const numBalance = parseFloat(tank.balance || '0');
          const isLow = numBalance <= 0.05 && numBalance > 0;
          const isEmpty = numBalance === 0;

          return (
            <div
              key={`${networkKey}-${tank.address}-${idx}`}
              className="bg-paper p-4 rounded-xl border border-graphite-hairline shadow-sm hover:border-brand/40 transition-all flex flex-col justify-between space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.color}`}>
                  {meta.name}
                </span>
                {tank.error ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200">
                    <XCircle className="w-3 h-3" /> Error
                  </span>
                ) : isLow ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200">
                    <AlertTriangle className="w-3 h-3" /> Low Balance
                  </span>
                ) : isEmpty ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-700 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-md border border-red-200">
                    <AlertTriangle className="w-3 h-3" /> Depleted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                )}
              </div>

              {/* Balance */}
              <div>
                <span className="text-[11px] font-medium text-slate uppercase tracking-wider block mb-0.5">
                  Tank Balance
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono text-ink tracking-tight">
                    {tank.balance}
                  </span>
                  <span className="text-sm font-semibold text-slate">{meta.symbol}</span>
                </div>
              </div>

              {/* Address Bar */}
              <div className="pt-2 border-t border-graphite-hairline/60 flex items-center justify-between text-xs">
                <span className="font-mono text-slate truncate max-w-[200px]" title={tank.address}>
                  {tank.address.substring(0, 8)}...{tank.address.substring(tank.address.length - 8)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(tank.address)}
                  className="p-1 rounded text-slate hover:text-ink hover:bg-vellum transition-colors cursor-pointer"
                  title="Copy Tank Address"
                >
                  {copiedAddress === tank.address ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          );
        });
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             TELEMETRY STATS CARD                           */
/* -------------------------------------------------------------------------- */

export function GasStationTelemetryBar({ statusData }: { statusData?: GasStationStatusData }) {
  const healthStatus = statusData?.health?.status || 'unknown';
  const isHealthy = healthStatus === 'healthy';
  const isDegraded = healthStatus === 'degraded';
  const errors = statusData?.health?.errors || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Service Health */}
      <div className="bg-paper p-4 rounded-xl border border-graphite-hairline shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate">Engine Status</span>
          <Activity className="w-4 h-4 text-slate" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isHealthy ? 'bg-emerald-500 animate-pulse' : isDegraded ? 'bg-amber-500' : 'bg-red-500'
            }`}
          />
          <span className="text-lg font-bold capitalize text-ink">
            {healthStatus}
          </span>
        </div>
        {errors.length > 0 ? (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 truncate" title={errors.join(', ')}>
            {errors[0]}
          </p>
        ) : (
          <p className="text-[11px] text-slate mt-1">All monitoring daemons operational</p>
        )}
      </div>

      {/* Monitored Tanks */}
      <div className="bg-paper p-4 rounded-xl border border-graphite-hairline shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate">Gas Tanks Active</span>
          <Fuel className="w-4 h-4 text-slate" />
        </div>
        <div className="mt-2">
          <span className="text-lg font-bold text-ink">
            {statusData?.status?.gasTanksCount ?? '—'} Tanks
          </span>
        </div>
        <p className="text-[11px] text-slate mt-1">
          {statusData?.status?.supportedChains?.length || 0} supported chains
        </p>
      </div>

      {/* Active Daemons */}
      <div className="bg-paper p-4 rounded-xl border border-graphite-hairline shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate">Active Subsystems</span>
          <Layers className="w-4 h-4 text-slate" />
        </div>
        <div className="mt-2">
          <span className="text-lg font-bold text-ink">
            {statusData?.status?.activeServices?.length || 0} Services
          </span>
        </div>
        <p className="text-[11px] text-slate mt-1">
          Native Funding & Deposit Watchers
        </p>
      </div>
    </div>
  );
}
