import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { SearchInput } from '../../components/ui/SearchInput'
import { CreditCard } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'

export const Route = createFileRoute('/payouts/')({
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
      { title: 'Payouts - StableStack Admin' },
      { name: 'description', content: 'Manage payout methods' },
    ],
  }),
  component: PayoutsPage,
})

interface PayoutMethod {
  id: string
  user_id: string
  type: string
  bank_name?: string
  account_number?: string
  account_name?: string
  wallet_address?: string
  network?: string
  currency: string
  created_at: string
  user?: {
    email: string
    first_name: string
    last_name: string
    businessName?: string
  }
}

function PayoutsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payouts', page, search],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/payout-methods', {
        params: { page, limit, search: search || undefined },
      })
      return response.data.data
    },
  })

  const payouts: PayoutMethod[] = data?.data || []
  const total = data?.pagination?.total || payouts.length
  const totalPages = Math.ceil(total / limit) || 1

  const columns: Column<PayoutMethod>[] = [
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-100 dark:bg-dark-primary/20 rounded-lg flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-accent-600 dark:text-dark-primary" />
          </div>
          <span className="text-sm font-medium capitalize">{row.type}</span>
        </div>
      ),
    },
    {
      key: 'bank_name',
      header: 'Details',
      render: (row) => (
        <div>
          {row.bank_name && (
            <p className="text-sm font-medium">{row.bank_name}</p>
          )}
          {row.account_number && (
            <p className="text-xs text-gray-500 font-mono">
              ****{row.account_number.slice(-4)}
            </p>
          )}
          {row.wallet_address && (
            <p className="text-xs text-gray-500 font-mono">
              {row.wallet_address.slice(0, 10)}...{row.wallet_address.slice(-6)}
            </p>
          )}
          {row.account_name && (
            <p className="text-xs text-gray-400">{row.account_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'currency',
      header: 'Currency',
      render: (row) => (
        <span className="text-sm uppercase font-medium">{row.currency}</span>
      ),
    },
    {
      key: 'user',
      header: 'Owner',
      render: (row) => (
        <div>
          <p className="text-sm font-medium">
            {row.user?.businessName || `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || 'Unknown'}
          </p>
          <p className="text-xs text-gray-500">{row.user?.email || row.user_id?.slice(0, 8) + '...'}</p>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
  ]

  return (
    <AdminLayout title="Payout Methods">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Payout Methods
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage user payout methods (bank accounts, wallets)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search payout methods..."
            className="w-80"
          />
        </div>

        <DataTable
          columns={columns}
          data={payouts}
          isLoading={isLoading}
          emptyMessage="No payout methods found"
          emptyIcon={<CreditCard className="w-8 h-8 text-gray-300 dark:text-gray-600" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          rowKey={(row) => row.id}
        />
      </div>
    </AdminLayout>
  )
}
