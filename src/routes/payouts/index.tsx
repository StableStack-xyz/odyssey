import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { SearchInput } from '../../components/ui/SearchInput'
import { FilterDropdown } from '../../components/ui/FilterDropdown'
import { CreditCard, Eye, RefreshCw } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { APP_NAME } from '../../lib/constants'

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
      { title: `Beneficiaries - ${APP_NAME}` },
      { name: 'description', content: 'Manage beneficiary payout methods' },
    ],
  }),
  component: PayoutsPage,
})

interface PayoutMethod {
  id: string
  user_id: string
  type: string
  currency: string
  label: string | null
  account_name: string | null
  account_number: string | null
  bank_name: string | null
  bank_code: string | null
  wallet_address: string | null
  network: string | null
  country: string | null
  provider: string | null
  created_at: string
  updated_at: string | null
  sort_code: string | null
  swift_code: string | null
  routing_number: string | null
  iban: string | null
  bank_type: string | null
  bank_address: { street_line1?: string; street_line2?: string; city?: string; state?: string; postal_code?: string } | null
  is_third_party: boolean | null
  is_api_generated: boolean | null
  walapay_account_id: string | null
  account_type: string | null
  account_holder: {
    type: string
    business_name?: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    address?: { street_line1?: string; city?: string; state?: string; postal_code?: string }
  } | null
  user?: {
    email: string
    first_name: string
    last_name: string
    businessName?: string
  }
}

function PayoutsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [userIdFilter, setUserIdFilter] = useState('')
  const [accountNumberFilter, setAccountNumberFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payouts', page, search, userIdFilter, accountNumberFilter, typeFilter],
    queryFn: async () => {
      const params: any = { page, limit }
      if (search) params.search = search
      if (userIdFilter || accountNumberFilter) {
        const response = await walletApi.get('/api/admin/payout-methods/search', {
          params: {
            user_id: userIdFilter || undefined,
            account_number: accountNumberFilter || undefined,
          },
        })
        return { data: response.data.data, pagination: { total: response.data.data?.length || 0 } }
      }
      const response = await walletApi.get('/api/admin/payout-methods', {
        params: {
          ...params,
          user_id: userIdFilter || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
        },
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
      key: 'label',
      header: 'Label',
      render: (row) => (
        <span className="text-sm text-ink max-w-[180px] truncate block">{row.label || '—'}</span>
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
      key: 'country',
      header: 'Country',
      render: (row) => (
        <span className="text-sm">{row.country || '—'}</span>
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
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate({ to: '/payouts/$payoutId', params: { payoutId: row.id } })
          }}
          className="p-2 hover:bg-vellum rounded-lg text-ash hover:text-ink transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <AdminLayout title="Beneficiaries">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Beneficiaries
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage beneficiary payout methods
            </p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-payouts'] })}
            className="btn-secondary flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search beneficiaries..."
            className="w-80 max-sm:w-full"
          />
          <FilterDropdown
            fields={[
              {
                key: 'accountNumber',
                label: 'Account Number',
                type: 'text',
                value: accountNumberFilter,
                onChange: (v) => { setAccountNumberFilter(v); setPage(1) },
                placeholder: 'Search by account...',
              },
              {
                key: 'userId',
                label: 'User ID',
                type: 'text',
                value: userIdFilter,
                onChange: (v) => { setUserIdFilter(v); setPage(1) },
                placeholder: 'Filter by user ID...',
              },
              {
                key: 'type',
                label: 'Type',
                type: 'select',
                value: typeFilter,
                onChange: (v) => { setTypeFilter(v); setPage(1) },
                options: [
                  { label: 'All Types', value: 'all' },
                  { label: 'Bank', value: 'BANK' },
                  { label: 'Wallet', value: 'WALLET' },
                ],
              },
            ]}
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
          onRowClick={(row) => navigate({ to: '/payouts/$payoutId', params: { payoutId: row.id } })}
          rowKey={(row) => row.id}
        />
      </div>
    </AdminLayout>
  )
}
