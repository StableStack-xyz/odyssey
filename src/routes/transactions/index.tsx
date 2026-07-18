import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { ArrowLeftRight, ArrowRight, ArrowDownLeft, ArrowUpRight, Download } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'

export const Route = createFileRoute('/transactions/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: TransactionsPage,
})

interface Transaction {
  id: string
  user_id: string
  transaction_id: string
  asset_code: string
  amount: string
  amount_fiat?: string
  reference_id: string
  status: string
  created_at: string
  updated_at: string
  network: string
  transaction_type: string
  transaction_mode: string
  fee: string
  exchange_rate?: string
  withdrawal_recipient_name?: string
  sender_user?: { first_name: string | null; last_name: string | null; businessName: string | null; role: string | null }
  receiver_user?: { first_name: string | null; last_name: string | null; businessName: string | null; role: string | null }
  receiver_wallet_details?: { currency?: string; bank_name?: string; account_number?: string }
}

const statusOptions = ['All', 'Pending', 'Completed', 'Failed', 'Processing', 'Cancelled']

function TransactionsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('All')
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', page, search, statusFilter],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/transactions', {
        params: {
          page,
          limit,
          search: search || undefined,
          status: statusFilter !== 'All' ? statusFilter.toUpperCase() : undefined,
        },
      })
      return response.data.data
    },
  })

  const transactions: Transaction[] = data?.data || []
  const total = data?.pagination?.total || transactions.length
  const totalPages = Math.ceil(total / limit) || 1

  const columns: Column<Transaction>[] = [
    {
      key: 'transaction_id',
      header: 'Reference',
      render: (row) => (
        <span className="font-mono text-xs text-ink">
          {row.transaction_id || row.id.slice(0, 8)}
        </span>
      ),
    },
    {
      key: 'flow',
      header: 'Conversion Flow (From → To)',
      render: (row) => {
        const cryptoAmount = parseFloat(row.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 });
        const fiatAmount = row.amount_fiat && parseFloat(row.amount_fiat) > 0 
          ? parseFloat(row.amount_fiat).toLocaleString(undefined, { minimumFractionDigits: 2 }) 
          : null;
        const toCurrency = row.receiver_wallet_details?.currency || null;

        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-ink">{cryptoAmount} <span className="text-xs text-slate uppercase">{row.asset_code}</span></span>
              {fiatAmount && toCurrency && (
                <>
                  <ArrowRight className="w-3.5 h-3.5 text-ash" />
                  <span className="text-sm font-medium text-ink">{fiatAmount} <span className="text-xs text-slate uppercase">{toCurrency}</span></span>
                </>
              )}
            </div>
            {row.exchange_rate && parseFloat(row.exchange_rate) > 0 && (
              <p className="text-[10px] text-slate mt-0.5 font-normal">Rate: 1 {row.asset_code} = {parseFloat(row.exchange_rate).toLocaleString()} {toCurrency}</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'parties',
      header: 'Parties (Sender → Recipient)',
      render: (row) => {
        const sender = row.sender_user?.businessName || `${row.sender_user?.first_name || ''} ${row.sender_user?.last_name || ''}`.trim() || 'StableStack';
        const receiver = row.withdrawal_recipient_name || row.receiver_wallet_details?.bank_name || 'External Wallet';

        return (
          <div>
            <div className="text-sm text-ink flex items-center gap-1.5">
              <span className="capitalize">{sender}</span>
              <span className="text-ash">→</span>
              <span className="text-pewter capitalize">{receiver}</span>
            </div>
            {row.receiver_wallet_details?.account_number && (
              <p className="text-[10px] text-slate mt-0.5 font-mono">Acct: {row.receiver_wallet_details.account_number}</p>
            )}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'fee',
      header: 'Fee',
      render: (row) => (
        <span className="text-sm text-slate">
          {row.fee ? parseFloat(row.fee).toLocaleString() : '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (row) => (
        <span className="text-sm text-slate">
          {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy HH:mm') : '—'}
        </span>
      ),
    },
  ]

  return (
    <AdminLayout title="Transactions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Transactions
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitor and manage all platform transactions
            </p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="Search by reference..."
            className="w-80"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status)
                  setPage(1)
                }}
                className={`px-3 py-1.5 text-xs font-normal rounded-full transition-colors ${
                  statusFilter === status
                    ? 'bg-ink text-paper'
                    : 'bg-vellum text-slate hover:bg-slate/10'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          isLoading={isLoading}
          emptyMessage="No transactions found"
          emptyIcon={<ArrowLeftRight className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate({ to: `/transactions/$transactionId`, params: { transactionId: row.transaction_id } })}
          rowKey={(row) => row.id}
        />
      </div>
    </AdminLayout>
  )
}
