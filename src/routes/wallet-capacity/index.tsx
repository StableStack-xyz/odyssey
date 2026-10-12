import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gauge, Pencil, Plus, Settings2 } from 'lucide-react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { walletApi } from '../../lib/api'
import { APP_NAME } from '../../lib/constants'
import { useTiers } from './-hooks'
import { ConfigModal, MerchantPicker, TierManager } from './-components'
import type { CapacityUsage } from './-types'
import { STATUS_STYLES, STATUS_LABELS } from './-types'

export const Route = createFileRoute('/wallet-capacity/')({
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
      { title: `Wallet Capacity - ${APP_NAME}` },
      { name: 'description', content: 'Manage merchant crypto wallet tiers and capacity' },
    ],
  }),
  component: WalletCapacityPage,
})

function WalletCapacityPage() {
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [managingTiers, setManagingTiers] = useState(false)
  const limit = 20
  const { data: tiers = [] } = useTiers()
  const tierLabel = (code: string) => tiers.find((t) => t.code === code)?.label ?? code

  const { data, isLoading } = useQuery({
    queryKey: ['admin-wallet-capacity', page],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/wallet-capacity', {
        params: { page, limit },
      })
      return response.data
    },
  })

  const rows: CapacityUsage[] = data?.data || []

  const columns: Column<CapacityUsage>[] = [
    {
      key: 'merchant_id',
      header: 'Merchant',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.merchant_name || 'Unnamed merchant'}</p>
          <p className="text-xs text-slate">{row.merchant_email || row.merchant_id}</p>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (row) => (
        <span className="text-sm text-ink">
          {tierLabel(row.tier)}
          {row.has_config === false && <span className="ml-1 text-xs text-slate">(default)</span>}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Allocated',
      render: (row) => (
        <div className="min-w-[140px]">
          <p className="text-sm text-ink">
            {row.allocated.toLocaleString()} / {row.wallet_limit.toLocaleString()}
          </p>
          <div className="h-1.5 mt-1 rounded-full bg-vellum overflow-hidden">
            <div
              className={`h-full ${row.status === 'ok' ? 'bg-green-500' : row.status === 'approaching_limit' ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(row.usage_percent, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'activation',
      header: 'Activation',
      render: (row) => (
        <div>
          <p className="text-sm text-ink">
            {row.activated.toLocaleString()} ({row.activation_rate}%)
          </p>
          <p className={`text-xs ${row.activation_threshold_met ? 'text-green-700' : 'text-slate'}`}>
            {row.activation_threshold_met ? 'Meets' : 'Below'} {row.activation_threshold_percent}% target
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[row.status]}`}>
          {STATUS_LABELS[row.status]}
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
            setEditing(row.merchant_id)
          }}
          className="p-2 hover:bg-vellum rounded-lg text-ash hover:text-ink transition-colors cursor-pointer"
          aria-label="Edit wallet config"
        >
          <Pencil className="w-4 h-4" />
        </button>
      ),
    },
  ]

  return (
    <AdminLayout title="Wallet Capacity">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Wallet Capacity</h2>
            <p className="text-slate mt-1">
              Crypto wallet tiers, limits and activation per merchant. Activation is the share of
              allocated wallets that have received a deposit or taken part in a transaction.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setManagingTiers(true)} className="btn-secondary cursor-pointer inline-flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Manage tiers
            </button>
            <button onClick={() => setPicking(true)} className="btn-primary cursor-pointer inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add merchant
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyMessage="No merchants with API wallets yet"
          emptyIcon={<Gauge className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={data?.pagination?.totalPages || 1}
          total={data?.pagination?.total || rows.length}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => setEditing(row.merchant_id)}
          rowKey={(row) => row.merchant_id}
        />
      </div>

      {editing && <ConfigModal merchantId={editing} tiers={tiers} onClose={() => setEditing(null)} />}
      {picking && (
        <MerchantPicker
          onPick={(id) => {
            setPicking(false)
            setEditing(id)
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {managingTiers && <TierManager onClose={() => setManagingTiers(false)} />}
    </AdminLayout>
  )
}
