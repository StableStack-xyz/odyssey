import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import { APP_NAME } from '../lib/constants'
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
  head: () => ({
    meta: [
      { title: `Dashboard - ${APP_NAME}` },
      { name: 'description', content: 'Platform overview and key metrics' },
    ],
  }),
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
  const queryClient = useQueryClient()

  // Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'flow'>('overview')

  // Dynamic filter states
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'thisyear'>('last30days')
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

  // --- REVENUE STATS COMPUTATIONS ---
  const revenueTrendData = (() => {
    if (!revenueStats?.revenueByDay) return []
    return revenueStats.revenueByDay.map((item: any) => ({
      date: format(new Date(item.date), 'MMM d'),
      amount: parseFloat(item.total || '0'),
    }))
  })()

  const revenueByCurrencyData = (() => {
    if (!revenueStats?.revenueByCurrency) return []
    return revenueStats.revenueByCurrency.map((item: any) => ({
      name: item.currency?.toUpperCase(),
      value: parseFloat(item.total || '0'),
    }))
  })()

  const revenueByRecipientCurrencyData = (() => {
    if (!revenueStats?.countByRecipientCurrency) return []
    return revenueStats.countByRecipientCurrency.map((item: any) => ({
      name: item.currency?.toUpperCase(),
      value: parseInt(item.count || '0'),
    }))
  })()

  // --- FLOW STATS COMPUTATIONS ---
  const flowTrendByDay = (() => {
    const byDate: Record<string, { date: string; inflow: number; outflow: number }> = {}
    ;(flowStats?.inflow?.byDay || []).forEach((item: any) => {
      const d = format(new Date(item.date), 'MMM d')
      if (!byDate[d]) byDate[d] = { date: d, inflow: 0, outflow: 0 }
      byDate[d].inflow += parseFloat(item.total || '0')
    })
    ;(flowStats?.outflow?.byDay || []).forEach((item: any) => {
      const d = format(new Date(item.date), 'MMM d')
      if (!byDate[d]) byDate[d] = { date: d, inflow: 0, outflow: 0 }
      byDate[d].outflow += parseFloat(item.total || '0')
    })
    return Object.values(byDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  })()

  const inflowCurrencyData = (() => {
    if (!flowStats?.inflow?.byCurrency) return []
    return flowStats.inflow.byCurrency.map((item: any) => ({
      name: item.currency?.toUpperCase(),
      value: parseFloat(item.total || '0'),
    }))
  })()

  const outflowCurrencyData = (() => {
    if (!flowStats?.outflow?.byCurrency) return []
    return flowStats.outflow.byCurrency.map((item: any) => ({
      name: item.currency?.toUpperCase(),
      value: parseFloat(item.total || '0'),
    }))
  })()

  const recipientCurrencyData = (() => {
    if (!flowStats?.outflow?.byRecipientCurrency) return []
    return flowStats.outflow.byRecipientCurrency.map((item: any) => ({
      name: item.currency?.toUpperCase(),
      value: parseInt(item.count || '0'),
    }))
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
            {/* Refresh Button */}
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['revenue-stats'] })
                queryClient.invalidateQueries({ queryKey: ['flow-stats'] })
                queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard-users-count'] })
                queryClient.invalidateQueries({ queryKey: ['admin-dashboard-wallets-count'] })
              }}
              className="btn-secondary !py-1.5 !px-3 !h-9 text-xs flex items-center gap-2 cursor-pointer border border-graphite-hairline bg-vellum rounded-full text-slate hover:text-ink transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>

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

        {/* Tab System */}
        <div className="flex border-b border-graphite-hairline gap-6 mb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-slate hover:text-ink hover:border-graphite-hairline/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'revenue'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-slate hover:text-ink hover:border-graphite-hairline/50'
            }`}
          >
            Revenue Stats
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'flow'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-slate hover:text-ink hover:border-graphite-hairline/50'
            }`}
          >
            Flow Stats
          </button>
        </div>

        {/* Stats Grid */}
        {activeTab === 'overview' && (
          <>
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
      </>
    )}

        {activeTab === 'revenue' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Meta */}
            <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">Revenue Stats</h3>
                  <p className="text-xs text-slate">
                    Overview of system fee margins, payout revenues, and currencies
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate uppercase tracking-wider block font-semibold">Period</span>
                  <span className="text-sm font-medium text-ink capitalize font-mono">
                    {period.replace(/last/i, 'Last ').replace(/7days/i, '7 Days').replace(/30days/i, '30 Days').replace(/90days/i, '90 Days').replace(/thisyear/i, 'This Year')}
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <StatsCard
                label="Total"
                value={loadingRevenue ? '—' : (revenueStats?.transactionCount || 0).toLocaleString()}
                icon={ArrowLeftRight}
              />
              <StatsCard
                label="Total Revenue"
                value={loadingRevenue ? '—' : formatCurrencySymbol(parseFloat(revenueStats?.totalRevenue || '0'), 'USD')}
                icon={TrendingUp}
              />
              <StatsCard
                label="Average Revenue / T"
                value={loadingRevenue ? '—' : formatCurrencySymbol(parseFloat(revenueStats?.averageRevenuePerTransaction || '0'), 'USD')}
                icon={Activity}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart 1: Revenue Trend by Day */}
              <div className="lg:col-span-2 bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
                <h3 className="font-display text-lg text-ink mb-1">Revenue Trend by Day</h3>
                <p className="text-xs text-slate mb-6">Daily aggregated fee margins over selected period</p>
                <div className="h-72">
                  {!loadingRevenue && revenueTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrendData}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#d65a84" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#d65a84" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-graphite-hairline)" opacity={0.5} />
                        <XAxis dataKey="date" stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--color-slate)" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Revenue']}
                          contentStyle={{
                            backgroundColor: 'var(--color-vellum)',
                            border: '1px solid var(--color-graphite-hairline)',
                            borderRadius: '8px',
                            color: 'var(--color-ink)',
                          }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#d65a84" fillOpacity={1} fill="url(#revenueGradient)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate text-sm italic">
                      {loadingRevenue ? 'Loading revenue trend...' : 'No revenue recorded in this period'}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 2: Revenue By Currency (Stable) */}
              <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg text-ink mb-1">Revenue By Currency (Stable)</h3>
                  <p className="text-xs text-slate mb-4">Stablecoin fee generation distribution</p>
                </div>
                <div className="h-56 flex items-center justify-center">
                  {!loadingRevenue && revenueByCurrencyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={revenueByCurrencyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {revenueByCurrencyData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Revenue']}
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
                            <span className="text-[11px] text-slate capitalize">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate text-sm italic py-12">
                      {loadingRevenue ? 'Loading distribution...' : 'No distribution details'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Revenue By Recipient Currency */}
              <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
                <h3 className="font-display text-lg text-ink mb-1">Revenue By Recipient Currency</h3>
                <p className="text-xs text-slate mb-4">Driver volume by recipient payout channels (Transaction count)</p>
                <div className="h-64">
                  {!loadingRevenue && revenueByRecipientCurrencyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByRecipientCurrencyData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-graphite-hairline)" opacity={0.5} />
                        <XAxis type="number" stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" stroke="var(--color-slate)" fontSize={11} tickLine={false} width={60} />
                        <Tooltip
                          formatter={(value: any) => [`${value} transactions`, 'Volume']}
                          contentStyle={{
                            backgroundColor: 'var(--color-vellum)',
                            border: '1px solid var(--color-graphite-hairline)',
                            borderRadius: '8px',
                            color: 'var(--color-ink)',
                          }}
                        />
                        <Bar dataKey="value" fill="#3e1e68" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate text-sm italic">
                      {loadingRevenue ? 'Loading volume...' : 'No recipient transaction data'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'flow' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Meta */}
            <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">Flow Stats</h3>
                  <p className="text-xs text-slate">
                    Comprehensive performance analysis of platform onramps (Inflow) vs offramps (Outflow)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate uppercase tracking-wider block font-semibold">Period</span>
                  <span className="text-sm font-medium text-ink capitalize font-mono">
                    {period.replace(/last/i, 'Last ').replace(/7days/i, '7 Days').replace(/30days/i, '30 Days').replace(/90days/i, '90 Days').replace(/thisyear/i, 'This Year')}
                  </span>
                </div>
              </div>
            </div>

            {/* InFlow Section */}
            <div className="bg-paper border border-graphite-hairline rounded-2xl p-6 shadow-xl-3 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-graphite-hairline">
                <h4 className="font-display text-base font-semibold text-green-600 uppercase tracking-wider">InFlow Metrics</h4>
                <span className="text-[10px] bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium">Deposit Channels</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatsCard
                  label="Total InFlow Count"
                  value={loadingFlow ? '—' : (flowStats?.inflow?.transactionCount || 0).toLocaleString()}
                  icon={ArrowLeftRight}
                />
                <StatsCard
                  label="Total InFlow"
                  value={loadingFlow ? '—' : formatCurrencySymbol(parseFloat(flowStats?.inflow?.total || '0'), 'USD')}
                  icon={ArrowDownLeft}
                />
                <StatsCard
                  label="Average InFlow / T"
                  value={loadingFlow ? '—' : formatCurrencySymbol(parseFloat(flowStats?.inflow?.averagePerTransaction || '0'), 'USD')}
                  icon={Activity}
                />
              </div>
            </div>

            {/* OutFlow Section */}
            <div className="bg-paper border border-graphite-hairline rounded-2xl p-6 shadow-xl-3 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-graphite-hairline">
                <h4 className="font-display text-base font-semibold text-red-600 uppercase tracking-wider">OutFlow Metrics</h4>
                <span className="text-[10px] bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full font-medium">Payout Channels</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <StatsCard
                  label="Total OutFlow Count"
                  value={loadingFlow ? '—' : (flowStats?.outflow?.transactionCount || 0).toLocaleString()}
                  icon={ArrowLeftRight}
                />
                <StatsCard
                  label="Total OutFlow"
                  value={loadingFlow ? '—' : formatCurrencySymbol(parseFloat(flowStats?.outflow?.total || '0'), 'USD')}
                  icon={ArrowUpRight}
                />
                <StatsCard
                  label="Average OutFlow / T"
                  value={loadingFlow ? '—' : formatCurrencySymbol(parseFloat(flowStats?.outflow?.averagePerTransaction || '0'), 'USD')}
                  icon={Activity}
                />
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Trend by Day (Inflow vs Outflow) */}
              <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-display text-lg text-ink">Trend by Day</h3>
                    <p className="text-xs text-slate">Comparison of completed inflows vs outflows</p>
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
                  {!loadingFlow && flowTrendByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={flowTrendByDay}>
                        <defs>
                          <linearGradient id="inflowTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="outflowTrendGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-graphite-hairline)" opacity={0.5} />
                        <XAxis dataKey="date" stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Amount']}
                          contentStyle={{
                            backgroundColor: 'var(--color-vellum)',
                            border: '1px solid var(--color-graphite-hairline)',
                            borderRadius: '8px',
                            color: 'var(--color-ink)',
                          }}
                        />
                        <Area type="monotone" dataKey="inflow" stroke="#10B981" fillOpacity={1} fill="url(#inflowTrendGrad)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="outflow" stroke="#EF4444" fillOpacity={1} fill="url(#outflowTrendGrad)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate text-sm italic">
                      {loadingFlow ? 'Loading trends...' : 'No transaction data for this period'}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 4: Recipient Currency (Fiat & Stable) */}
              <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
                <h3 className="font-display text-lg text-ink mb-1">Recipient Currency (Fiat & Stable)</h3>
                <p className="text-xs text-slate mb-4">Total payout distributions across settlement currencies (Fiat & Stable count)</p>
                <div className="h-72">
                  {!loadingFlow && recipientCurrencyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recipientCurrencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-graphite-hairline)" opacity={0.5} />
                        <XAxis dataKey="name" stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--color-slate)" fontSize={11} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${value} settlement requests`, 'Payouts']}
                          contentStyle={{
                            backgroundColor: 'var(--color-vellum)',
                            border: '1px solid var(--color-graphite-hairline)',
                            borderRadius: '8px',
                            color: 'var(--color-ink)',
                          }}
                        />
                        <Bar dataKey="value" fill="#d65a84" radius={[4, 4, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate text-sm italic">
                      {loadingFlow ? 'Loading distribution...' : 'No settlement currency details recorded'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Distribution Pies Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 2: InFlow Currency (Stable) */}
              <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg text-ink mb-1">InFlow Currency (Stable)</h3>
                  <p className="text-xs text-slate mb-4">Distribution of completed asset inflows</p>
                </div>
                <div className="h-56 flex items-center justify-center">
                  {!loadingFlow && inflowCurrencyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={inflowCurrencyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {inflowCurrencyData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Amount']}
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
                            <span className="text-[11px] text-slate capitalize">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate text-sm italic py-12">
                      {loadingFlow ? 'Loading distribution...' : 'No inflow currency details'}
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 3: OutFlow Currency (Stable) */}
              <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg text-ink mb-1">OutFlow Currency (Stable)</h3>
                  <p className="text-xs text-slate mb-4">Distribution of completed asset outflows</p>
                </div>
                <div className="h-56 flex items-center justify-center">
                  {!loadingFlow && outflowCurrencyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={outflowCurrencyData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {outflowCurrencyData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Amount']}
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
                            <span className="text-[11px] text-slate capitalize">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-slate text-sm italic py-12">
                      {loadingFlow ? 'Loading distribution...' : 'No outflow currency details'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
