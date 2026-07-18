import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, useIsFetching } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { SearchInput } from '../../components/ui/SearchInput'
import { FilterDropdown } from '../../components/ui/FilterDropdown'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { Settings, Plus, Pencil, Trash2, Save, Info, RefreshCw } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { toast } from 'sonner'
import { APP_NAME } from '../../lib/constants'

export const Route = createFileRoute('/fees/')({
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
      { title: `Fees - ${APP_NAME}` },
      { name: 'description', content: 'Manage fee configurations' },
    ],
  }),
  component: FeesPage,
})

interface FiatFee {
  id: string
  currency_type: string
  from_currency: string
  to_currency: string
  market_pair: string
  fee_type: string
  fee_percentage: string
  fee_flat_amount: string
  exchange_rate: string
  created_at: string
  updated_at: string
  fiat_provider_fee: string | null
  buffer_rate: string
}

interface StablecoinFeeData {
  currency_type: string
  fee_type: string
  fee_value: string
}

function FeesPage() {
  const queryClient = useQueryClient()
  const isFetching = useIsFetching() > 0
  const [activeTab, setActiveTab] = useState<'fiat' | 'stablecoin'>('fiat')
  const [search, setSearch] = useState('')
  const [feeTypeFilter, setFeeTypeFilter] = useState('all')

  // Modal and state management for Fiat Fees CRUD
  const [showAddFiat, setShowAddFiat] = useState(false)
  const [showEditFiat, setShowEditFiat] = useState<FiatFee | null>(null)
  const [showDeleteFiat, setShowDeleteFiat] = useState<FiatFee | null>(null)

  // Form states for Fiat Fee
  const [fiatForm, setFiatForm] = useState({
    from_currency: '',
    to_currency: '',
    fee_type: 'percentage',
    fee_percentage: '',
    fee_flat_amount: '',
    exchange_rate: '',
    fiat_provider_fee: '',
    buffer_rate: '',
  })

  // Form states for Stablecoin Fee
  const [stablecoinForm, setStablecoinForm] = useState({
    fee_type: 'percentage',
    fee_percentage: '',
    fee_flat_amount: '',
  })

  // 1. Fetch Fiat Fees
  const { data: fiatFeesData, isLoading: loadingFiat } = useQuery({
    queryKey: ['fiat-fees'],
    queryFn: async () => {
      const response = await walletApi.get('/api/fees/fiat')
      return response.data.data as FiatFee[]
    },
    enabled: activeTab === 'fiat',
  })

  // 2. Fetch Stablecoin Fee Settings
  const { isLoading: loadingStablecoin } = useQuery({
    queryKey: ['stablecoin-fee'],
    queryFn: async () => {
      const response = await walletApi.get('/api/fees', {
        params: { currency_type: 'STABLECOIN' },
      })
      const fee = response.data?.data?.fees as StablecoinFeeData | null
      
      if (fee) {
        setStablecoinForm({
          fee_type: fee.fee_type,
          fee_percentage: fee.fee_type === 'percentage' ? fee.fee_value : '',
          fee_flat_amount: fee.fee_type === 'flat' ? fee.fee_value : '',
        })
      }
      return fee
    },
    enabled: activeTab === 'stablecoin',
  })

  // --- MUTATIONS ---

  // Create Fiat Fee Mutation
  const createFiatMutation = useMutation({
    mutationFn: async (body: any) => {
      const response = await walletApi.post('/api/fees/fiat', body)
      return response.data
    },
    onSuccess: () => {
      toast.success('Fiat fee config added successfully')
      queryClient.invalidateQueries({ queryKey: ['fiat-fees'] })
      setShowAddFiat(false)
      resetFiatForm()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create fiat fee')
    },
  })

  // Update Fiat Fee Mutation
  const updateFiatMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const response = await walletApi.patch(`/api/fees/fiat/${id}`, body)
      return response.data
    },
    onSuccess: () => {
      toast.success('Fiat fee config updated successfully')
      queryClient.invalidateQueries({ queryKey: ['fiat-fees'] })
      setShowEditFiat(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update fiat fee')
    },
  })

  // Delete Fiat Fee Mutation
  const deleteFiatMutation = useMutation({
    mutationFn: async (id: string) => {
      await walletApi.delete(`/api/fees/fiat/${id}`)
    },
    onSuccess: () => {
      toast.success('Fiat fee configuration deleted')
      queryClient.invalidateQueries({ queryKey: ['fiat-fees'] })
      setShowDeleteFiat(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete fiat fee')
    },
  })

  // Create or Update Stablecoin Fee Mutation (POST to /api/fees/stablecoin)
  const saveStablecoinMutation = useMutation({
    mutationFn: async (body: any) => {
      const response = await walletApi.post('/api/fees/stablecoin', body)
      return response.data
    },
    onSuccess: () => {
      toast.success('Stablecoin transfer fee saved successfully')
      queryClient.invalidateQueries({ queryKey: ['stablecoin-fee'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save stablecoin fee')
    },
  })

  // --- HANDLERS ---

  const resetFiatForm = () => {
    setFiatForm({
      from_currency: '',
      to_currency: '',
      fee_type: 'percentage',
      fee_percentage: '',
      fee_flat_amount: '',
      exchange_rate: '',
      fiat_provider_fee: '',
      buffer_rate: '',
    })
  }

  const openEditFiat = (row: FiatFee) => {
    setShowEditFiat(row)
    setFiatForm({
      from_currency: row.from_currency,
      to_currency: row.to_currency,
      fee_type: row.fee_type,
      fee_percentage: row.fee_type === 'percentage' ? row.fee_percentage : '',
      fee_flat_amount: row.fee_type === 'flat' ? row.fee_flat_amount : '',
      exchange_rate: row.exchange_rate,
      fiat_provider_fee: row.fiat_provider_fee || '',
      buffer_rate: row.buffer_rate || '',
    })
  }

  const handleCreateFiat = (e: React.FormEvent) => {
    e.preventDefault()
    const body: any = {
      from_currency: fiatForm.from_currency.trim().toUpperCase(),
      to_currency: fiatForm.to_currency.trim().toUpperCase() || 'NGN',
      fee_type: fiatForm.fee_type,
    }

    if (fiatForm.fee_type === 'percentage') {
      body.fee_percentage = parseFloat(fiatForm.fee_percentage || '0')
    } else {
      body.fee_flat_amount = parseFloat(fiatForm.fee_flat_amount || '0')
    }

    if (fiatForm.exchange_rate) body.exchange_rate = parseFloat(fiatForm.exchange_rate)
    if (fiatForm.fiat_provider_fee) body.fiat_provider_fee = parseFloat(fiatForm.fiat_provider_fee)
    if (fiatForm.buffer_rate) body.buffer_rate = parseFloat(fiatForm.buffer_rate)

    createFiatMutation.mutate(body)
  }

  const handleUpdateFiat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEditFiat) return

    const body: any = {
      from_currency: fiatForm.from_currency.trim().toUpperCase(),
      to_currency: fiatForm.to_currency.trim().toUpperCase(),
      fee_type: fiatForm.fee_type,
    }

    if (fiatForm.fee_type === 'percentage') {
      body.fee_percentage = parseFloat(fiatForm.fee_percentage || '0')
      body.fee_flat_amount = null
    } else {
      body.fee_flat_amount = parseFloat(fiatForm.fee_flat_amount || '0')
      body.fee_percentage = null
    }

    if (fiatForm.exchange_rate) body.exchange_rate = parseFloat(fiatForm.exchange_rate)
    if (fiatForm.fiat_provider_fee) body.fiat_provider_fee = parseFloat(fiatForm.fiat_provider_fee)
    if (fiatForm.buffer_rate) body.buffer_rate = parseFloat(fiatForm.buffer_rate)

    updateFiatMutation.mutate({ id: showEditFiat.id, body })
  }

  const handleSaveStablecoin = (e: React.FormEvent) => {
    e.preventDefault()
    const body: any = {
      fee_type: stablecoinForm.fee_type,
    }

    if (stablecoinForm.fee_type === 'percentage') {
      if (!stablecoinForm.fee_percentage) {
        toast.error('Percentage value is required')
        return
      }
      body.fee_percentage = parseFloat(stablecoinForm.fee_percentage)
    } else {
      if (!stablecoinForm.fee_flat_amount) {
        toast.error('Flat amount is required')
        return
      }
      body.fee_flat_amount = parseFloat(stablecoinForm.fee_flat_amount)
    }

    saveStablecoinMutation.mutate(body)
  }

  // Filter fiat fees client side
  const filteredFiatFees = (fiatFeesData || []).filter((fee) => {
    if (search && !fee.from_currency?.toLowerCase().includes(search.toLowerCase()) && !fee.to_currency?.toLowerCase().includes(search.toLowerCase()) && !fee.market_pair?.toLowerCase().includes(search.toLowerCase())) return false
    if (feeTypeFilter !== 'all' && fee.fee_type?.toLowerCase() !== feeTypeFilter) return false
    return true
  })

  // Columns for Fiat Fees Table
  const fiatColumns: Column<FiatFee>[] = [
    {
      key: 'market_pair',
      header: 'Trading Pair',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-vellum border border-graphite-hairline rounded-lg flex items-center justify-center">
            <Settings className="w-4 h-4 text-ink" />
          </div>
          <div>
            <span className="text-sm font-medium uppercase text-ink">
              {row.from_currency} → {row.to_currency}
            </span>
            <span className="text-[10px] text-slate font-mono block uppercase">
              {row.market_pair}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'fee',
      header: 'Our Fee',
      render: (row) => (
        <div>
          <span className="text-sm font-medium text-ink">
            {row.fee_type === 'percentage'
              ? `${parseFloat(row.fee_percentage).toFixed(2)}%`
              : `${parseFloat(row.fee_flat_amount).toLocaleString()} ${row.to_currency}`}
          </span>
          <span className="text-[10px] text-slate block capitalize">
            {row.fee_type} fee
          </span>
        </div>
      ),
    },
    {
      key: 'fiat_provider_fee',
      header: 'Provider Fee',
      render: (row) => (
        <span className="text-sm text-ink">
          {row.fiat_provider_fee 
            ? `${parseFloat(row.fiat_provider_fee).toLocaleString()} ${row.to_currency}`
            : '—'}
        </span>
      ),
    },
    {
      key: 'exchange_rate',
      header: 'Exchange Rate',
      render: (row) => (
        <div>
          <span className="text-sm font-medium text-ink font-mono">
            {parseFloat(row.exchange_rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </span>
          <span className="text-[10px] text-slate block">
            1 {row.from_currency} = {parseFloat(row.exchange_rate).toLocaleString()} {row.to_currency}
          </span>
        </div>
      ),
    },
    {
      key: 'buffer_rate',
      header: 'Buffer Rate',
      render: (row) => (
        <span className="text-sm text-slate">
          {parseFloat(row.buffer_rate) > 0 ? `${parseFloat(row.buffer_rate).toFixed(4)}` : '0.00'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditFiat(row)}
            className="p-1.5 text-ash hover:text-ink hover:bg-vellum rounded-lg transition-colors cursor-pointer"
            title="Edit configuration"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowDeleteFiat(row)}
            className="p-1.5 text-ash hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            title="Delete pair config"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Fees">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Fees Configuration
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Configure deposit, conversion, and global transfer fee settings
            </p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="btn-secondary flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tab System */}
        <div className="flex border-b border-graphite-hairline gap-6">
          <button
            onClick={() => setActiveTab('fiat')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'fiat'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            Fiat Conversion Fees
          </button>
          <button
            onClick={() => setActiveTab('stablecoin')}
            className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'stablecoin'
                ? 'border-ink text-ink'
                : 'border-transparent text-slate hover:text-ink'
            }`}
          >
            Stablecoin Transfer Fee
          </button>
        </div>

        {/* TABS CONTENT */}
        {activeTab === 'fiat' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <SearchInput
                  value={search}
                  onChange={(v) => setSearch(v)}
                  placeholder="Search fiat pairs..."
                  className="w-full sm:w-80"
                />
                <FilterDropdown
                  fields={[
                    {
                      key: 'feeType',
                      label: 'Fee Type',
                      type: 'select',
                      value: feeTypeFilter,
                      onChange: setFeeTypeFilter,
                      options: [
                        { label: 'All Types', value: 'all' },
                        { label: 'Percentage', value: 'percentage' },
                        { label: 'Flat', value: 'flat' },
                      ],
                    },
                  ]}
                />
              </div>
              <button
                onClick={() => { resetFiatForm(); setShowAddFiat(true) }}
                className="px-4 py-2 text-xs font-normal text-ink bg-vellum border border-graphite-hairline hover:bg-graphite-hairline/20 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                Add Fiat Pair Fee
              </button>
            </div>

            <DataTable
              columns={fiatColumns}
              data={filteredFiatFees}
              isLoading={loadingFiat}
              emptyMessage="No fiat conversion fees configured"
              emptyIcon={<Settings className="w-8 h-8 text-slate" />}
              rowKey={(row) => row.id}
            />
          </div>
        ) : (
          <div className="max-w-xl space-y-6">
            {loadingStablecoin ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate border-t-ink"></div>
              </div>
            ) : (
              <div className="bg-paper border border-graphite-hairline rounded-2xl p-6 shadow-xl-3 space-y-6">
                <div>
                  <h3 className="font-display text-lg text-ink">Global Stablecoin Fee Settings</h3>
                  <p className="text-slate text-xs mt-1">
                    This sets the global fee charged to merchants and users when performing on-chain stablecoin transfer operations.
                  </p>
                </div>

                <form onSubmit={handleSaveStablecoin} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider text-slate">Fee Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setStablecoinForm((prev) => ({ ...prev, fee_type: 'percentage' }))}
                        className={`py-3 text-sm font-medium border rounded-xl transition-all cursor-pointer text-center ${
                          stablecoinForm.fee_type === 'percentage'
                            ? 'border-ink bg-vellum text-ink'
                            : 'border-graphite-hairline bg-transparent text-slate hover:text-ink'
                        }`}
                      >
                        Percentage (%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setStablecoinForm((prev) => ({ ...prev, fee_type: 'flat' }))}
                        className={`py-3 text-sm font-medium border rounded-xl transition-all cursor-pointer text-center ${
                          stablecoinForm.fee_type === 'flat'
                            ? 'border-ink bg-vellum text-ink'
                            : 'border-graphite-hairline bg-transparent text-slate hover:text-ink'
                        }`}
                      >
                        Flat Amount
                      </button>
                    </div>
                  </div>

                  {stablecoinForm.fee_type === 'percentage' ? (
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-slate">Fee Percentage (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          max="100"
                          value={stablecoinForm.fee_percentage}
                          onChange={(e) => setStablecoinForm((prev) => ({ ...prev, fee_percentage: e.target.value }))}
                          className="input !pr-8"
                          placeholder="0.20"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate">%</span>
                      </div>
                      <p className="text-[10px] text-slate">Charged as a percentage of the total transfer value.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs uppercase tracking-wider text-slate">Flat Fee Amount (USD / stablecoin equivalent)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          value={stablecoinForm.fee_flat_amount}
                          onChange={(e) => setStablecoinForm((prev) => ({ ...prev, fee_flat_amount: e.target.value }))}
                          className="input !pl-8"
                          placeholder="1.00"
                          required
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate">$</span>
                      </div>
                      <p className="text-[10px] text-slate">Fixed flat stablecoin amount charged per transfer regardless of size.</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-graphite-hairline flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate">
                      <Info className="w-3.5 h-3.5" />
                      Saved setting takes effect instantly
                    </div>
                    <button
                      type="submit"
                      disabled={saveStablecoinMutation.isPending}
                      className="btn-primary cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      {saveStablecoinMutation.isPending ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE FIAT FEE MODAL */}
      <Modal isOpen={showAddFiat} onClose={() => setShowAddFiat(false)} title="Create Fiat Pair Fee" size="md">
        <form onSubmit={handleCreateFiat} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">From Currency (Source) *</label>
              <input
                type="text"
                value={fiatForm.from_currency}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, from_currency: e.target.value }))}
                className="input uppercase"
                placeholder="e.g. USDT, USDC"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">To Currency (Destination) *</label>
              <input
                type="text"
                value={fiatForm.to_currency}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, to_currency: e.target.value }))}
                className="input uppercase"
                placeholder="e.g. NGN, KES, ZAR"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Fee Type</label>
            <select
              value={fiatForm.fee_type}
              onChange={(e) => setFiatForm((prev) => ({ ...prev, fee_type: e.target.value }))}
              className="input cursor-pointer appearance-none"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount</option>
            </select>
          </div>

          {fiatForm.fee_type === 'percentage' ? (
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Fee Percentage (%) *</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="100"
                value={fiatForm.fee_percentage}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, fee_percentage: e.target.value }))}
                className="input"
                placeholder="0.20"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Fee Flat Amount *</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={fiatForm.fee_flat_amount}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, fee_flat_amount: e.target.value }))}
                className="input"
                placeholder="5.00"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Exchange Rate</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={fiatForm.exchange_rate}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, exchange_rate: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. 1375.38"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Provider Fee</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={fiatForm.fiat_provider_fee}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, fiat_provider_fee: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. 20.00"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Buffer Rate</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={fiatForm.buffer_rate}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, buffer_rate: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. 0.0000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setShowAddFiat(false)}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createFiatMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {createFiatMutation.isPending ? 'Creating...' : 'Create Configuration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT FIAT FEE MODAL */}
      <Modal isOpen={showEditFiat !== null} onClose={() => setShowEditFiat(null)} title="Edit Fiat Pair Fee" size="md">
        <form onSubmit={handleUpdateFiat} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">From Currency (Source) *</label>
              <input
                type="text"
                value={fiatForm.from_currency}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, from_currency: e.target.value }))}
                className="input uppercase"
                placeholder="e.g. USDT"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">To Currency (Destination) *</label>
              <input
                type="text"
                value={fiatForm.to_currency}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, to_currency: e.target.value }))}
                className="input uppercase"
                placeholder="e.g. NGN"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Fee Type</label>
            <select
              value={fiatForm.fee_type}
              onChange={(e) => setFiatForm((prev) => ({ ...prev, fee_type: e.target.value }))}
              className="input cursor-pointer appearance-none"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="flat">Flat Amount</option>
            </select>
          </div>

          {fiatForm.fee_type === 'percentage' ? (
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Fee Percentage (%) *</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="100"
                value={fiatForm.fee_percentage}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, fee_percentage: e.target.value }))}
                className="input"
                placeholder="0.20"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Fee Flat Amount *</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={fiatForm.fee_flat_amount}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, fee_flat_amount: e.target.value }))}
                className="input"
                placeholder="5.00"
                required
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Exchange Rate</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={fiatForm.exchange_rate}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, exchange_rate: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. 1375.38"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Provider Fee</label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={fiatForm.fiat_provider_fee}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, fiat_provider_fee: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. 20.00"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Buffer Rate</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={fiatForm.buffer_rate}
                onChange={(e) => setFiatForm((prev) => ({ ...prev, buffer_rate: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. 0.0000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setShowEditFiat(null)}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateFiatMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {updateFiatMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE FIAT FEE CONFIRMATION */}
      <ConfirmDialog
        isOpen={showDeleteFiat !== null}
        onClose={() => setShowDeleteFiat(null)}
        onConfirm={() => {
          if (showDeleteFiat) deleteFiatMutation.mutate(showDeleteFiat.id)
        }}
        title="Delete Fee Configuration"
        message={
          <span>
            Are you sure you want to delete the fee configuration for trading pair{' '}
            <strong>
              {showDeleteFiat?.from_currency} → {showDeleteFiat?.to_currency}
            </strong>
            ? This action cannot be undone.
          </span>
        }
        confirmLabel="Delete Config"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteFiatMutation.isPending}
      />
    </AdminLayout>
  )
}
