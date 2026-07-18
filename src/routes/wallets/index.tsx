import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { FilterDropdown } from '../../components/ui/FilterDropdown'
import { Wallet as WalletIcon, Eye, Copy } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { APP_NAME } from '../../lib/constants'

export const Route = createFileRoute('/wallets/')({
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
      { title: `Wallets - ${APP_NAME}` },
      { name: 'description', content: 'Manage user wallets' },
    ],
  }),
  component: WalletsPage,
})

interface WalletAddress {
  id: string
  address: string
  network: string
  status: string
  balance: number
}

interface Wallet {
  id: string
  user_id: string
  asset_type: string
  currency: string
  balance: string
  status: string
  created_at: string
  addresses: WalletAddress[]
  user?: {
    email: string
    first_name: string
    last_name: string
    businessName?: string
  }
}

function WalletsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [currencyFilter, setCurrencyFilter] = useState('All')
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-wallets', page, search, currencyFilter],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/wallets', {
        params: {
          page,
          limit,
          search: search || undefined,
          currency: currencyFilter !== 'All' ? currencyFilter : undefined,
        },
      })
      return response.data.data
    },
  })

  // Parse according to the exact backend payload keys
  const wallets: Wallet[] = data?.wallets || []
  const total = data?.pagination?.totalCount || wallets.length
  const totalPages = data?.pagination?.totalPages || 1

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied')
  }

  const columns: Column<Wallet>[] = [
    {
      key: 'currency',
      header: 'Asset',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
            <span className="text-xs font-bold text-ink uppercase">
              {row.currency?.slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{row.currency}</p>
            <p className="text-xs text-slate uppercase">{row.asset_type?.toLowerCase().replace(/_/g, ' ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'addresses',
      header: 'Deposit Address',
      render: (row) => {
        const firstAddr = row.addresses?.[0];
        if (!firstAddr) return <span className="text-xs text-slate italic">No address</span>

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-ink truncate max-w-[150px]" title={firstAddr.address}>
              {firstAddr.address}
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-normal bg-vellum border border-graphite-hairline text-slate rounded uppercase">
              {firstAddr.network}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                copyAddress(firstAddr.address)
              }}
              className="p-1 hover:bg-vellum rounded text-ash hover:text-ink transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink font-mono">
            {parseFloat(row.balance || '0').toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6,
            })}
          </p>
          <p className="text-xs text-slate uppercase">
            {row.currency}
          </p>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Owner',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink capitalize">
            {row.user?.businessName || `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || 'System'}
          </p>
          <p className="text-xs text-slate">
            {row.user?.email || row.user_id?.slice(0, 8) + '...'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span className="text-sm text-slate">
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
            navigate({ to: `/wallets/$walletId`, params: { walletId: row.id } })
          }}
          className="p-2 hover:bg-vellum rounded-lg text-ash hover:text-ink transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <AdminLayout title="Wallets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Wallets
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage all user wallets on the platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="Search wallets..."
            className="w-80 max-sm:w-full"
          />
          <FilterDropdown
            fields={[
              {
                key: 'currency',
                label: 'Currency',
                type: 'select',
                value: currencyFilter,
                onChange: (v) => { setCurrencyFilter(v); setPage(1) },
                options: [
                  { label: 'All Currencies', value: 'All' },
                  { label: 'USDT', value: 'USDT' },
                  { label: 'USDC', value: 'USDC' },
                  { label: 'ZAR', value: 'ZAR' },
                ],
              },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          data={wallets}
          isLoading={isLoading}
          emptyMessage="No wallets found"
          emptyIcon={<WalletIcon className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate({ to: `/wallets/$walletId`, params: { walletId: row.id } })}
          rowKey={(row) => row.id}
        />
      </div>
    </AdminLayout>
  )
}
