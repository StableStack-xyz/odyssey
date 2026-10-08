import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Coins, Flame, RefreshCw, ShieldAlert, Wallet } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { errorMessage } from './-mansa-types'
import { CopyId } from './-mansa-shared'

interface Balance {
  available: string
  total: string
}

interface FundingAddress {
  chain: string
  network: string
  asset: string
  address: string
  contract_address: string
  balance: Balance
  gas_balance: Balance
}

const amount = (value: string | undefined, suffix: string) => (value === undefined ? '-' : `${Number(value).toLocaleString()} ${suffix}`)

function BalanceCard({
  title,
  balance,
  suffix,
  icon: Icon,
}: {
  title: string
  balance?: Balance
  suffix: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl hover:border-brand/30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-slate uppercase tracking-wider">{title}</p>
        {Icon && <Icon className="w-4 h-4 text-brand/70" />}
      </div>
      <p className="text-2xl font-display font-semibold text-ink mt-2">{amount(balance?.available, suffix)}</p>
      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate">
        <span className="font-medium text-emerald-600 dark:text-emerald-400">Available</span>
        <span className="text-slate/40">•</span>
        <span>Total: {amount(balance?.total, suffix)}</span>
      </div>
    </div>
  )
}

export function MansaFunding() {
  const queryClient = useQueryClient()
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-mansa-funding'],
    refetchInterval: 60000,
    queryFn: async () => (await walletApi.get('/api/admin/mansa/funding-address')).data.data as FundingAddress,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">Funding address</h3>
          <p className="text-slate text-sm mt-1 max-w-3xl">
            Mansa's shared USDT wallet. Approved payouts send USDT here, and Mansa pays out from this balance. It is the same address for
            every merchant.
          </p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-mansa-funding'] })}
          disabled={isFetching}
          className="btn-secondary cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 shrink-0 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 border border-graphite-hairline rounded-xl flex items-center justify-center gap-3 text-slate">
          <RefreshCw className="w-5 h-5 animate-spin text-brand" />
          <span className="text-sm">Loading funding wallet info...</span>
        </div>
      ) : error || !data ? (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-600">{errorMessage(error)}</p>
        </div>
      ) : (
        <>
          <div className="p-5 bg-paper border border-graphite-hairline rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-graphite-hairline">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand" />
                <span className="text-xs font-semibold text-ink uppercase tracking-wider">Deposit Details</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-brand/10 text-brand text-[11px] font-semibold">
                  {data.chain} / {data.network}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-vellum text-ink text-[11px] font-semibold">
                  {data.asset}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-medium text-slate uppercase">Deposit address</p>
                <div className="mt-1.5 break-all">
                  <CopyId value={data.address} />
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-slate uppercase">{data.asset} contract address</p>
                <div className="mt-1.5 break-all">
                  <CopyId value={data.contract_address} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                Only send <strong>{data.asset}</strong> on <strong>{data.network}</strong>. Anything else sent to this address can be permanently lost.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BalanceCard title={`${data.asset} balance`} balance={data.balance} suffix={data.asset} icon={Coins} />
            <BalanceCard title="Gas balance (for outbound fees)" balance={data.gas_balance} suffix={data.chain === 'TRON' ? 'TRX' : ''} icon={Flame} />
          </div>
        </>
      )}
    </div>
  )
}
