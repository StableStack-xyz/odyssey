import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { Building2, Plus, Pencil, Trash2, ArrowRight, DollarSign, Calendar, User } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'

export const Route = createFileRoute('/otc/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: OTCPage,
})

interface OTCTransaction {
  id: string
  initiator_name: string
  sender_name: string | null
  transaction_date: string
  beneficiary_details: string | null
  transaction_type: string
  source_currency: string
  recipient_currency: string
  amount: string
  revenue: string | null
  evidence_transfer_url: string | null
  payment_receipt_url: string | null
  status: string
  transaction_reference: string | null
  external_reference: string | null
  created_at: string
  updated_at: string
}

function OTCPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Modals and state management
  const [showAddOTC, setShowAddCountry] = useState(false)
  const [showEditOTC, setShowEditOTC] = useState<OTCTransaction | null>(null)
  const [showDeleteOTC, setShowDeleteOTC] = useState<OTCTransaction | null>(null)

  // Form states
  const [otcForm, setOtcForm] = useState({
    initiator_name: '',
    sender_name: '',
    transaction_date: '',
    transaction_type: 'CREDIT',
    source_currency: 'USDT',
    recipient_currency: 'NGN',
    amount: '',
    revenue: '',
    beneficiary_details: '',
    transaction_reference: '',
    external_reference: '',
    evidence_transfer_url: '',
    payment_receipt_url: '',
    status: 'pending',
  })

  // 1. Fetch OTC Transactions
  const { data, isLoading } = useQuery({
    queryKey: ['admin-otc-transactions', page, search],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/otc-transactions', {
        params: { page, limit, search: search || undefined },
      })
      return response.data
    },
  })

  const transactions: OTCTransaction[] = data?.data || []
  const total = data?.pagination?.total || transactions.length
  const totalPages = data?.pagination?.pages || 1

  // --- MUTATIONS ---

  // Create OTC Transaction Mutation
  const createOTCMutation = useMutation({
    mutationFn: async (body: any) => {
      const response = await walletApi.post('/api/admin/otc-transactions', body)
      return response.data
    },
    onSuccess: () => {
      toast.success('OTC transaction created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-otc-transactions'] })
      setShowAddCountry(false)
      resetOtcForm()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create OTC transaction')
    },
  })

  // Update OTC Transaction Mutation
  const updateOTCMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      const response = await walletApi.put(`/api/admin/otc-transactions/${id}`, body)
      return response.data
    },
    onSuccess: () => {
      toast.success('OTC transaction updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-otc-transactions'] })
      setShowEditOTC(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update OTC transaction')
    },
  })

  // Delete OTC Transaction Mutation
  const deleteOTCMutation = useMutation({
    mutationFn: async (id: string) => {
      await walletApi.delete(`/api/admin/otc-transactions/${id}`)
    },
    onSuccess: () => {
      toast.success('OTC transaction deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-otc-transactions'] })
      setShowDeleteOTC(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete OTC transaction')
    },
  })

  // --- HANDLERS ---

  const resetOtcForm = () => {
    setOtcForm({
      initiator_name: '',
      sender_name: '',
      transaction_date: new Date().toISOString().slice(0, 16), // datetime-local format
      transaction_type: 'CREDIT',
      source_currency: 'USDT',
      recipient_currency: 'NGN',
      amount: '',
      revenue: '',
      beneficiary_details: '',
      transaction_reference: '',
      external_reference: '',
      evidence_transfer_url: '',
      payment_receipt_url: '',
      status: 'pending',
    })
  }

  const openAddOTC = () => {
    resetOtcForm()
    setShowAddCountry(true)
  }

  const openEditOTC = (row: OTCTransaction) => {
    setShowEditOTC(row)
    
    // Parse timestamp to local date-time compatible format for inputs
    let formattedDate = ''
    try {
      formattedDate = new Date(row.transaction_date).toISOString().slice(0, 16)
    } catch {
      formattedDate = new Date().toISOString().slice(0, 16)
    }

    setOtcForm({
      initiator_name: row.initiator_name || '',
      sender_name: row.sender_name || '',
      transaction_date: formattedDate,
      transaction_type: row.transaction_type || 'CREDIT',
      source_currency: row.source_currency || 'USDT',
      recipient_currency: row.recipient_currency || 'NGN',
      amount: row.amount ? parseFloat(row.amount).toString() : '',
      revenue: row.revenue ? parseFloat(row.revenue).toString() : '',
      beneficiary_details: row.beneficiary_details || '',
      transaction_reference: row.transaction_reference || '',
      external_reference: row.external_reference || '',
      evidence_transfer_url: row.evidence_transfer_url || '',
      payment_receipt_url: row.payment_receipt_url || '',
      status: row.status || 'pending',
    })
  }

  const handleCreateOTC = (e: React.FormEvent) => {
    e.preventDefault()
    if (!otcForm.initiator_name.trim()) {
      toast.error('Initiator name is required')
      return
    }

    const body: any = {
      initiator_name: otcForm.initiator_name.trim(),
      sender_name: otcForm.sender_name.trim() || null,
      transaction_date: new Date(otcForm.transaction_date || new Date()).toISOString(),
      transaction_type: otcForm.transaction_type,
      source_currency: otcForm.source_currency,
      recipient_currency: otcForm.recipient_currency,
      amount: parseFloat(otcForm.amount),
      revenue: otcForm.revenue ? parseFloat(otcForm.revenue) : null,
      beneficiary_details: otcForm.beneficiary_details.trim() || null,
      transaction_reference: otcForm.transaction_reference.trim() || null,
      external_reference: otcForm.external_reference.trim() || null,
      evidence_transfer_url: otcForm.evidence_transfer_url.trim() || null,
      payment_receipt_url: otcForm.payment_receipt_url.trim() || null,
      status: otcForm.status,
    }

    createOTCMutation.mutate(body)
  }

  const handleUpdateOTC = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEditOTC) return
    if (!otcForm.initiator_name.trim()) {
      toast.error('Initiator name is required')
      return
    }

    const body: any = {
      initiator_name: otcForm.initiator_name.trim(),
      sender_name: otcForm.sender_name.trim() || null,
      transaction_date: new Date(otcForm.transaction_date || new Date()).toISOString(),
      transaction_type: otcForm.transaction_type,
      source_currency: otcForm.source_currency,
      recipient_currency: otcForm.recipient_currency,
      amount: parseFloat(otcForm.amount),
      revenue: otcForm.revenue ? parseFloat(otcForm.revenue) : null,
      beneficiary_details: otcForm.beneficiary_details.trim() || null,
      transaction_reference: otcForm.transaction_reference.trim() || null,
      external_reference: otcForm.external_reference.trim() || null,
      evidence_transfer_url: otcForm.evidence_transfer_url.trim() || null,
      payment_receipt_url: otcForm.payment_receipt_url.trim() || null,
      status: otcForm.status,
    }

    updateOTCMutation.mutate({ id: showEditOTC.id, body })
  }

  const columns: Column<OTCTransaction>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: (row) => (
        <div>
          <span className="font-mono text-xs text-ink font-semibold">
            {row.transaction_reference || row.id.slice(0, 8)}
          </span>
          {row.external_reference && (
            <span className="text-[10px] text-slate block font-mono">
              Ext: {row.external_reference}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'initiator_name',
      header: 'Initiator',
      render: (row) => (
        <div>
          <span className="text-sm font-medium text-ink uppercase tracking-wide">
            {row.initiator_name}
          </span>
          {row.sender_name && (
            <span className="text-[10px] text-slate block">
              Sender: {row.sender_name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'transaction_type',
      header: 'Type',
      render: (row) => (
        <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wider rounded-md uppercase ${
          row.transaction_type === 'CREDIT' 
            ? 'bg-green-100/60 dark:bg-green-950/40 text-green-800 dark:text-green-300' 
            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300'
        }`}>
          {row.transaction_type}
        </span>
      ),
    },
    {
      key: 'exchange_flow',
      header: 'Exchange Flow (From → To)',
      render: (row) => {
        const amt = parseFloat(row.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink">
              {amt} <span className="text-xs text-slate uppercase">{row.source_currency}</span>
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-ash" />
            <span className="text-xs text-slate uppercase">{row.recipient_currency}</span>
          </div>
        )
      },
    },
    {
      key: 'revenue',
      header: 'Margin / Revenue',
      render: (row) => (
        <span className="text-sm font-mono text-ink">
          {row.revenue ? `${parseFloat(row.revenue).toLocaleString()} ${row.source_currency}` : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'transaction_date',
      header: 'Execution Date',
      render: (row) => (
        <span className="text-sm text-slate">
          {row.transaction_date ? format(new Date(row.transaction_date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEditOTC(row)}
            className="p-1.5 text-ash hover:text-ink hover:bg-vellum rounded-lg transition-colors cursor-pointer"
            title="Edit trade details"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowDeleteOTC(row)}
            className="p-1.5 text-ash hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            title="Delete trade"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="OTC Transactions">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              OTC Transactions
            </h2>
            <p className="text-slate mt-1 text-sm">
              Create, review, and manage over-the-counter liquidity transactions and institutional treasury conversions
            </p>
          </div>
          <button
            onClick={openAddOTC}
            className="px-4 py-2 text-xs font-normal text-ink bg-vellum border border-graphite-hairline hover:bg-graphite-hairline/20 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Create OTC Trade
          </button>
        </div>

        <div className="flex items-center gap-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search OTC transactions..."
            className="w-full sm:w-80"
          />
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          isLoading={isLoading}
          emptyMessage="No OTC transactions found"
          emptyIcon={<Building2 className="w-8 h-8 text-ash" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => openEditOTC(row)}
          rowKey={(row) => row.id}
        />
      </div>

      {/* CREATE OTC TRANSACTION MODAL */}
      <Modal isOpen={showAddOTC} onClose={() => setShowAddCountry(false)} title="Create OTC Trade" size="lg">
        <form onSubmit={handleCreateOTC} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Initiator Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="text"
                  value={otcForm.initiator_name}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, initiator_name: e.target.value }))}
                  className="input !pl-10"
                  placeholder="e.g. Lenco, Busha"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Sender Name (Optional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="text"
                  value={otcForm.sender_name}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, sender_name: e.target.value }))}
                  className="input !pl-10"
                  placeholder="e.g. Gabriel"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Execution Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="datetime-local"
                  value={otcForm.transaction_date}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
                  className="input !pl-10 cursor-pointer"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Transaction Type *</label>
              <select
                value={otcForm.transaction_type}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, transaction_type: e.target.value }))}
                className="input cursor-pointer appearance-none"
                required
              >
                <option value="CREDIT">CREDIT</option>
                <option value="DEBIT">DEBIT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Source Currency *</label>
              <select
                value={otcForm.source_currency}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, source_currency: e.target.value }))}
                className="input cursor-pointer appearance-none uppercase"
                required
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Recipient Currency *</label>
              <select
                value={otcForm.recipient_currency}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, recipient_currency: e.target.value }))}
                className="input cursor-pointer appearance-none uppercase"
                required
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Trade Amount *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  value={otcForm.amount}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input !pl-10 font-mono"
                  placeholder="e.g. 10000.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Margin / Revenue (Optional)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={otcForm.revenue}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, revenue: e.target.value }))}
                  className="input !pl-10 font-mono"
                  placeholder="e.g. 15.00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Transaction Ref (Optional)</label>
              <input
                type="text"
                value={otcForm.transaction_reference}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, transaction_reference: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. TRF_otc_9012"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">External Ref (Optional)</label>
              <input
                type="text"
                value={otcForm.external_reference}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, external_reference: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. EXT_quidax_11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Evidence URL (Optional)</label>
              <input
                type="url"
                value={otcForm.evidence_transfer_url}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, evidence_transfer_url: e.target.value }))}
                className="input"
                placeholder="e.g. https://stable.com/trans.pdf"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Receipt URL (Optional)</label>
              <input
                type="url"
                value={otcForm.payment_receipt_url}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, payment_receipt_url: e.target.value }))}
                className="input"
                placeholder="e.g. https://stable.com/receipt.pdf"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Beneficiary details (Optional)</label>
            <textarea
              value={otcForm.beneficiary_details}
              onChange={(e) => setOtcForm((prev) => ({ ...prev, beneficiary_details: e.target.value }))}
              className="input min-h-[80px]"
              placeholder="e.g. Account Number: 2007525991, Bank Name: Zenith Bank"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Trade Status</label>
            <select
              value={otcForm.status}
              onChange={(e) => setOtcForm((prev) => ({ ...prev, status: e.target.value }))}
              className="input cursor-pointer appearance-none"
              required
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setShowAddCountry(false)}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createOTCMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {createOTCMutation.isPending ? 'Creating...' : 'Create OTC Trade'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT OTC TRANSACTION MODAL */}
      <Modal isOpen={showEditOTC !== null} onClose={() => setShowEditOTC(null)} title="Edit OTC Trade" size="lg">
        <form onSubmit={handleUpdateOTC} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Initiator Name *</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="text"
                  value={otcForm.initiator_name}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, initiator_name: e.target.value }))}
                  className="input !pl-10"
                  placeholder="e.g. Lenco"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Sender Name (Optional)</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="text"
                  value={otcForm.sender_name}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, sender_name: e.target.value }))}
                  className="input !pl-10"
                  placeholder="e.g. Gabriel"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Execution Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="datetime-local"
                  value={otcForm.transaction_date}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, transaction_date: e.target.value }))}
                  className="input !pl-10 cursor-pointer"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Transaction Type *</label>
              <select
                value={otcForm.transaction_type}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, transaction_type: e.target.value }))}
                className="input cursor-pointer appearance-none"
                required
              >
                <option value="CREDIT">CREDIT</option>
                <option value="DEBIT">DEBIT</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Source Currency *</label>
              <select
                value={otcForm.source_currency}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, source_currency: e.target.value }))}
                className="input cursor-pointer appearance-none uppercase"
                required
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Recipient Currency *</label>
              <select
                value={otcForm.recipient_currency}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, recipient_currency: e.target.value }))}
                className="input cursor-pointer appearance-none uppercase"
                required
              >
                <option value="USDT">USDT</option>
                <option value="USDC">USDC</option>
                <option value="USD">USD</option>
                <option value="NGN">NGN</option>
                <option value="ZAR">ZAR</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Trade Amount *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  value={otcForm.amount}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, amount: e.target.value }))}
                  className="input !pl-10 font-mono"
                  placeholder="e.g. 10000.00"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Margin / Revenue (Optional)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={otcForm.revenue}
                  onChange={(e) => setOtcForm((prev) => ({ ...prev, revenue: e.target.value }))}
                  className="input !pl-10 font-mono"
                  placeholder="e.g. 15.00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Transaction Ref (Optional)</label>
              <input
                type="text"
                value={otcForm.transaction_reference}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, transaction_reference: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. TRF_otc_9012"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">External Ref (Optional)</label>
              <input
                type="text"
                value={otcForm.external_reference}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, external_reference: e.target.value }))}
                className="input font-mono"
                placeholder="e.g. EXT_quidax_11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Evidence URL (Optional)</label>
              <input
                type="url"
                value={otcForm.evidence_transfer_url}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, evidence_transfer_url: e.target.value }))}
                className="input"
                placeholder="e.g. https://stable.com/trans.pdf"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">Receipt URL (Optional)</label>
              <input
                type="url"
                value={otcForm.payment_receipt_url}
                onChange={(e) => setOtcForm((prev) => ({ ...prev, payment_receipt_url: e.target.value }))}
                className="input"
                placeholder="e.g. https://stable.com/receipt.pdf"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Beneficiary details (Optional)</label>
            <textarea
              value={otcForm.beneficiary_details}
              onChange={(e) => setOtcForm((prev) => ({ ...prev, beneficiary_details: e.target.value }))}
              className="input min-h-[80px]"
              placeholder="e.g. Account Number: 2007525991"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Trade Status</label>
            <select
              value={otcForm.status}
              onChange={(e) => setOtcForm((prev) => ({ ...prev, status: e.target.value }))}
              className="input cursor-pointer appearance-none"
              required
            >
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setShowEditOTC(null)}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateOTCMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {updateOTCMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE OTC TRANSACTION CONFIRMATION */}
      <ConfirmDialog
        isOpen={showDeleteOTC !== null}
        onClose={() => setShowDeleteOTC(null)}
        onConfirm={() => {
          if (showDeleteOTC) deleteOTCMutation.mutate(showDeleteOTC.id)
        }}
        title="Delete OTC Transaction"
        message={
          <span>
            Are you sure you want to permanently delete the OTC transaction with reference{' '}
            <strong className="font-mono">{showDeleteOTC?.transaction_reference || showDeleteOTC?.id?.slice(0, 8)}</strong>? This will permanently delete the transaction record and cannot be undone.
          </span>
        }
        confirmLabel="Delete Trade"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteOTCMutation.isPending}
      />
    </AdminLayout>
  )
}
