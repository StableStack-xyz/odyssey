import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../components/layout/AdminLayout'
import { StatsCard } from '../components/ui/StatsCard'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { walletApi, authApi } from '../lib/api'
import { useState } from 'react'
import {
  Users,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Activity,
  ArrowRight,
  Calendar,
  Coins,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: Dashboard,
})

const COLORS = ['#d65a84', '#3e1e68', '#73647a', '#a0a0a0']

// Helper to format currency numbers beautifully with symbols
const formatCurrencySymbol = (value: number, currency: string) => {
  const symbolMap: Record<string, string> = {
    USD: '$',
    USDT: '$',
    USDC: '$',
    NGN: '₦',
    ZAR: 'R',
    KES: 'KSh',
  }
  const symbol = symbolMap[currency.toUpperCase()] || ''
  return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Dynamic filter states
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'thisyear'>('today')
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL')

  // 1. Fetch revenue stats with active period filter
  const { data: revenueStats, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue-stats', period],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/transactions/revenue-stats', {
        params: { period },
      })
      return response.data.data
    },
  })

  // 2. Fetch flow stats
  const { data: flowStats, isLoading: loadingFlow } = useQuery({
    queryKey: ['flow-stats', period],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/transactions/flow-stats', {
        params: { period },
      })
      return response.data.data
    },
  })

  // 3. Fetch total users (count) from auth service
  const { data: usersCountData } = useQuery({
    queryKey: ['admin-dashboard-users-count'],
    queryFn: async () => {
      const response = await authApi.get('/api/users/onboard/documents', {
        params: { page: 1, limit: 1 },
      })
      return response.data?.data?.pagination?.total || 0
    },
  })

  // 4. Fetch total wallets (count) from wallet service
  const { data: walletsCountData } = useQuery({
    queryKey: ['admin-dashboard-wallets-count'],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/wallets', {
        params: { page: 1, limit: 1 },
      })
      return response.data?.data?.pagination?.totalCount || 0
    },
  })

  // 5. Fetch recent transactions
  const { data: transactionsData, isLoading: loadingTx } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/transactions', {
        params: { page: 1, limit: 100 }, // Fetch larger list so we can filter dynamically
      })
      return response.data.data
    },
  })

  // --- DYNAMIC RE-COMPUTATIONS BASED ON FILTERS ---

  const rawTxList = transactionsData?.data || []

  // Filter transactions by selected asset code
  const filteredTxList = rawTxList.filter((tx: any) => {
    if (selectedAsset === 'ALL') return true
    return tx.asset_code?.toUpperCase() === selectedAsset.toUpperCase()
  })

  // Slice filtered recent transactions for table view
  const recentTx = filteredTxList.slice(0, 8)

  // Dynamically calculate Inflow & Outflow totals for selected asset
  const dynamicFlowVolume = (() => {
    if (selectedAsset === 'ALL') {
      const inflowVal = parseFloat(flowStats?.inflow?.total || '0')
      const outflowVal = parseFloat(flowStats?.outflow?.total || '0')
      return {
        totalInflow: `$${inflowVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalOutflow: `$${outflowVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      }
    }

    // Filter flowStats detail lists by selected currency
    const inflowCur = (flowStats?.inflow?.byCurrency || []).find(
      (item: any) => item.currency?.toUpperCase() === selectedAsset.toUpperCase()
    )
    const outflowCur = (flowStats?.outflow?.byCurrency || []).find(
      (item: any) => item.currency?.toUpperCase() === selectedAsset.toUpperCase()
    )

    const inflowAmt = parseFloat(inflowCur?.total || '0')
    const outflowAmt = parseFloat(outflowCur?.total || '0')

    return {
      totalInflow: `${inflowAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${selectedAsset}`,
      totalOutflow: `${outflowAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${selectedAsset}`,
    }
  })()

  // Dynamically calculate completed transaction count for selected asset/period
  const dynamicTransactionsCount = (() => {
    if (loadingFlow || !flowStats) return '—'

    if (selectedAsset === 'ALL') {
      const count = parseInt(flowStats.inflow?.transactionCount || '0') + parseInt(flowStats.outflow?.transactionCount || '0')
      return count.toLocaleString()
    }

    // Sum transactions in selection matching selected asset
    return filteredTxList.length.toLocaleString()
  })()

  // Dynamically isolate revenue based on selected asset
  const dynamicRevenueDisplay = (() => {
    if (loadingRevenue || !revenueStats) return '—'

    if (selectedAsset === 'ALL') {
      return `$${parseFloat(revenueStats.totalRevenue || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    }

    // Lookup selected asset inside revenueByCurrency list from your API payload
    const currencyRevenue = (revenueStats.revenueByCurrency || []).find(
      (item: any) => item.currency?.toUpperCase() === selectedAsset.toUpperCase()
    )

    const revenueVal = parseFloat(currencyRevenue?.total || '0')
    return formatCurrencySymbol(revenueVal, selectedAsset)
  })()

  // Process flow area-chart data grouped by date (filtered by selected asset)
  const chartData = (() => {
    const byDate: Record<string, { date: string; inflow: number; outflow: number; count: number }> = {}

    filteredTxList.forEach((tx: any) => {
      const date = format(new Date(tx.created_at), 'MMM dd')
      if (!byDate[date]) {
        byDate[date] = { date, inflow: 0, outflow: 0, count: 0 }
      }
      const amount = parseFloat(tx.amount || '0')
      if (tx.transaction_mode === 'CREDIT') {
        byDate[date].inflow += amount
      } else {
        byDate[date].outflow += amount
      }
      byDate[date].count += 1
    })

    return Object.values(byDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })()

  // Transaction type breakdown (pie-chart, filtered by selected asset)
  const typeData = (() => {
    const byType: Record<string, number> = {}
    filteredTxList.forEach((tx: any) => {
      const type = tx.transaction_type || 'OTHER'
      byType[type] = (byType[type] || 0) + 1
    })
    return Object.entries(byType).map(([name, value]) => ({ name, value }))
  })()

  // Asset breakdown (bar-chart, only displayed when ALL is selected)
  const assetData = (() => {
    const byAsset: Record<string, number> = {}
    rawTxList.forEach((tx: any) => {
      const asset = tx.asset_code || 'UNKNOWN'
      byAsset[asset] = (byAsset[asset] || 0) + parseFloat(tx.amount || '0')
    })
    return Object.entries(byAsset).map(([name, value]) => ({ name, value }))
  })()

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome & Filters Header row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-normal text-ink">
              Welcome back, {user?.firstName}
            </h2>
            <p className="text-slate text-xs mt-1 uppercase tracking-wider">
              StableStack Treasury Desk
            </p>
          </div>

          {/* DUAL FILTERS SELECTORS */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period Dropdown */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ash" />
              <select
                value={period}
                onChange={(e: any) => setPeriod(e.target.value)}
                className="input !py-1.5 !px-3 !h-9 text-xs cursor-pointer appearance-none bg-vellum border border-graphite-hairline rounded-full pr-8"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7days">Last 7 Days</option>
                <option value="last30days">Last 30 Days</option>
                <option value="last90days">Last 90 Days</option>
                <option value="thisyear">This Year</option>
              </select>
            </div>

            {/* Asset / Currency Filter */}
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-ash" />
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value)}
                className="input !py-1.5 !px-3 !h-9 text-xs cursor-pointer appearance-none bg-vellum border border-graphite-hairline rounded-full pr-8 uppercase"
              >
                <option value="ALL">All Assets</option>
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="NGN">NGN</option>
                <option value="ZAR">ZAR</option>
                <option value="USD">USD</option>
                <option value="KES">KES</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            label={`Fee Revenue (${selectedAsset})`}
            value={dynamicRevenueDisplay}
            change={selectedAsset === 'ALL' && revenueStats?.revenueChange ? `${revenueStats.revenueChange > 0 ? '+' : ''}${revenueStats.revenueChange}%` : undefined}
            changeType={revenueStats?.revenueChange > 0 ? 'positive' : revenueStats?.revenueChange < 0 ? 'negative' : 'neutral'}
            icon={TrendingUp}
          />
          <StatsCard
            label="Total Transactions"
            value={dynamicTransactionsCount}
            icon={ArrowLeftRight}
          />
          <StatsCard
            label="Active Wallets"
            value={walletsCountData ? walletsCountData.toLocaleString() : '—'}
            icon={Wallet}
          />
          <StatsCard
            label="Total Users"
            value={usersCountData ? usersCountData.toLocaleString() : '—'}
            icon={Users}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Flow Chart */}
          <div className="lg:col-span-2 bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg text-ink">
                  Transaction Flow ({selectedAsset})
                </h3>
                <p className="text-xs text-slate">
                  Inflow vs Outflow volume tracking
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <span className="text-slate">Inflow</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-slate">Outflow</span>
                </div>
              </div>
            </div>
            <div className="h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-graphite-hairline)" opacity={0.5} />
                    <XAxis dataKey="date" stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-vellum)',
                        border: '1px solid var(--color-graphite-hairline)',
                        borderRadius: '8px',
                        color: 'var(--color-ink)',
                      }}
                    />
                    <Area type="monotone" dataKey="inflow" stroke="#10B981" fillOpacity={1} fill="url(#inflowGradient)" strokeWidth={1.5} />
                    <Area type="monotone" dataKey="outflow" stroke="#EF4444" fillOpacity={1} fill="url(#outflowGradient)" strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate text-sm italic">
                  No transaction data recorded for this selection
                </div>
              )}
            </div>
          </div>

          {/* Pie Chart */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink">
              Transaction Types
            </h3>
            <p className="text-xs text-slate mb-4">
              Distribution for {selectedAsset} transfers
            </p>
            <div className="h-64 flex items-center justify-center">
              {typeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="42%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {typeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-vellum)',
                        border: '1px solid var(--color-graphite-hairline)',
                        borderRadius: '8px',
                        color: 'var(--color-ink)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={6}
                      formatter={(value: string) => (
                        <span className="text-[11px] text-slate capitalize">{value.toLowerCase().replace(/_/g, ' ')}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate text-sm italic">
                  No distribution details
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Financial Summary */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 space-y-4">
            <h3 className="font-display text-lg text-ink">
              Financial Flow Summary ({selectedAsset})
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-vellum rounded-xl border border-graphite-hairline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-paper rounded-full border border-graphite-hairline flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate uppercase tracking-wider">Total Inflow Volume</p>
                    <p className="text-lg font-display font-medium text-green-600 mt-0.5 font-mono">
                      {dynamicFlowVolume.totalInflow}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-vellum rounded-xl border border-graphite-hairline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-paper rounded-full border border-graphite-hairline flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate uppercase tracking-wider">Total Outflow Volume</p>
                    <p className="text-lg font-display font-medium text-red-600 mt-0.5 font-mono">
                      {dynamicFlowVolume.totalOutflow}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bar Chart (Asset Volume distribution) */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink">
              Overall Volume by Asset
            </h3>
            <p className="text-xs text-slate mb-4">
              Cross-asset transaction volume breakdown (USD value equivalence)
            </p>
            <div className="h-64">
              {assetData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-graphite-hairline)" opacity={0.5} />
                    <XAxis type="number" stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                    <YAxis type="category" dataKey="name" stroke="var(--color-slate)" fontSize={11} tickLine={false} width={50} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-vellum)',
                        border: '1px solid var(--color-graphite-hairline)',
                        borderRadius: '8px',
                        color: 'var(--color-ink)',
                      }}
                    />
                    <Bar dataKey="value" fill="var(--color-ink)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate text-sm italic">
                  No cross-asset details
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg text-ink">
                Recent Transactions ({selectedAsset})
              </h3>
              <p className="text-xs text-slate mt-1">
                Latest {recentTx.length} transactions in selection
              </p>
            </div>
            <a
              href="/transactions"
              className="text-xs text-slate underline underline-offset-4 hover:text-ink transition-colors"
            >
              View all
            </a>
          </div>
          <div className="overflow-x-auto">
            {loadingTx ? (
              <div className="px-6 py-12 text-center text-slate">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate border-t-ink"></div>
                <p className="mt-2 text-xs">Loading...</p>
              </div>
            ) : recentTx.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-graphite-hairline bg-vellum">
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Flow (From → To)</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Parties (Sender → Recipient)</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-hairline">
                  {recentTx.map((tx: any, i: number) => {
                    const cryptoAmount = parseFloat(tx.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 });
                    const fiatAmount = tx.amount_fiat && parseFloat(tx.amount_fiat) > 0 
                      ? parseFloat(tx.amount_fiat).toLocaleString(undefined, { minimumFractionDigits: 2 }) 
                      : null;
                    const toCurrency = tx.receiver_wallet_details?.currency || null;

                    const sender = tx.sender_user?.businessName || `${tx.sender_user?.first_name || ''} ${tx.sender_user?.last_name || ''}`.trim() || 'StableStack';
                    const receiver = tx.withdrawal_recipient_name || tx.receiver_wallet_details?.bank_name || 'External Wallet';

                    return (
                      <tr
                        key={tx.id || i}
                        onClick={() => navigate({ to: `/transactions/$transactionId`, params: { transactionId: tx.transaction_id } })}
                        className="hover:bg-vellum transition-colors cursor-pointer"
                      >
                        {/* Reference ID */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-ink">
                            {tx.transaction_id || tx.id?.slice(0, 8)}
                          </span>
                        </td>

                        {/* Conversion Flow */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-ink">{cryptoAmount} <span className="text-xs text-slate uppercase">{tx.asset_code}</span></span>
                            {fiatAmount && toCurrency && (
                              <>
                                <ArrowRight className="w-3.5 h-3.5 text-ash" />
                                <span className="text-sm text-ink">{fiatAmount} <span className="text-xs text-slate uppercase">{toCurrency}</span></span>
                              </>
                            )}
                          </div>
                          {tx.exchange_rate && parseFloat(tx.exchange_rate) > 0 && (
                            <p className="text-[10px] text-slate mt-0.5">Rate: 1 {tx.asset_code} = {parseFloat(tx.exchange_rate).toLocaleString()} {toCurrency}</p>
                          )}
                        </td>

                        {/* Parties */}
                        <td className="px-6 py-4">
                          <div className="text-sm text-ink flex items-center gap-1.5">
                            <span className="capitalize">{sender}</span>
                            <span className="text-ash">→</span>
                            <span className="text-pewter capitalize">{receiver}</span>
                          </div>
                          {tx.receiver_wallet_details?.account_number && (
                            <p className="text-[10px] text-slate mt-0.5 font-mono">Acct: {tx.receiver_wallet_details.account_number}</p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <StatusBadge status={tx.status} />
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate">
                            {tx.created_at ? format(new Date(tx.created_at), 'MMM d, HH:mm') : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-12 text-center text-slate">
                <Activity className="w-8 h-8 mx-auto mb-2 text-ash" />
                <p className="text-xs">No transactions in selection</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
