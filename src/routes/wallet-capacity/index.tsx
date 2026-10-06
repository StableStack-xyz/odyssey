import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Gauge, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { walletApi } from '../../lib/api'
import { APP_NAME } from '../../lib/constants'

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

const TIERS = [
  { value: 'TIER_100', label: '100 wallets', limit: 100 },
  { value: 'TIER_500', label: '500 wallets', limit: 500 },
  { value: 'TIER_1500', label: '1,500 wallets', limit: 1500 },
  { value: 'TIER_3000', label: '3,000 wallets', limit: 3000 },
  { value: 'ENTERPRISE', label: 'Enterprise (negotiated)', limit: null },
] as const

type CapacityStatus = 'ok' | 'approaching_limit' | 'limit_reached'

interface CapacityUsage {
  merchant_id: string
  tier: string
  wallet_limit: number
  allocated: number
  remaining: number
  usage_percent: number
  activated: number
  activation_rate: number
  activation_threshold_percent: number
  activation_threshold_met: boolean
  status: CapacityStatus
  message: string | null
}

interface WalletConfig {
  merchant_id: string
  tier: string
  wallet_limit: number
  activation_threshold_percent: number
  warning_threshold_percent: number
  enforce_limit: boolean
  auto_upgrade: boolean
  notes: string | null
}

const STATUS_STYLES: Record<CapacityStatus, string> = {
  ok: 'bg-green-500/10 text-green-700',
  approaching_limit: 'bg-amber-500/10 text-amber-700',
  limit_reached: 'bg-red-500/10 text-red-700',
}

const STATUS_LABELS: Record<CapacityStatus, string> = {
  ok: 'OK',
  approaching_limit: 'Approaching limit',
  limit_reached: 'Limit reached',
}

const tierLabel = (tier: string) => TIERS.find((t) => t.value === tier)?.label ?? tier

function WalletCapacityPage() {
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<string | null>(null)
  const limit = 20

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
      render: (row) => <span className="font-mono text-xs text-ink">{row.merchant_id}</span>,
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (row) => <span className="text-sm text-ink">{tierLabel(row.tier)}</span>,
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
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Wallet Capacity</h2>
          <p className="text-slate mt-1">
            Crypto wallet tiers, limits and activation per merchant. Activation is the share of
            allocated wallets that have received a deposit or taken part in a transaction.
          </p>
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

      {editing && <ConfigModal merchantId={editing} onClose={() => setEditing(null)} />}
    </AdminLayout>
  )
}

function ConfigModal({ merchantId, onClose }: { merchantId: string; onClose: () => void }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-wallet-config', merchantId],
    queryFn: async () => {
      const response = await walletApi.get(`/api/admin/merchants/${merchantId}/wallet-config`)
      return response.data.data as { config: WalletConfig; usage: CapacityUsage }
    },
  })

  return (
    <Modal isOpen onClose={onClose} title="Merchant wallet configuration" size="lg">
      {isLoading || !data ? (
        <p className="text-sm text-slate">Loading...</p>
      ) : (
        <ConfigForm
          key={merchantId}
          merchantId={merchantId}
          config={data.config}
          usage={data.usage}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-wallet-capacity'] })
            queryClient.invalidateQueries({ queryKey: ['admin-wallet-config', merchantId] })
            onClose()
          }}
        />
      )}
    </Modal>
  )
}

function ConfigForm({
  merchantId,
  config,
  usage,
  onSaved,
}: {
  merchantId: string
  config: WalletConfig
  usage: CapacityUsage
  onSaved: () => void
}) {
  const [tier, setTier] = useState(config.tier)
  const [walletLimit, setWalletLimit] = useState(String(config.wallet_limit))
  const [activation, setActivation] = useState(String(config.activation_threshold_percent))
  const [warning, setWarning] = useState(String(config.warning_threshold_percent))
  const [enforce, setEnforce] = useState(config.enforce_limit)
  const [autoUpgrade, setAutoUpgrade] = useState(config.auto_upgrade)
  const [notes, setNotes] = useState(config.notes ?? '')

  const onTierChange = (value: string) => {
    setTier(value)
    const preset = TIERS.find((t) => t.value === value)
    if (preset?.limit) setWalletLimit(String(preset.limit))
  }

  const mutation = useMutation({
    mutationFn: async () =>
      walletApi.put(`/api/admin/merchants/${merchantId}/wallet-config`, {
        tier,
        wallet_limit: Number(walletLimit),
        activation_threshold_percent: Number(activation),
        warning_threshold_percent: Number(warning),
        enforce_limit: enforce,
        auto_upgrade: autoUpgrade,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success('Wallet configuration updated')
      onSaved()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update configuration')
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <div className="rounded-xl bg-vellum border border-graphite-hairline p-3 text-xs text-slate space-y-1">
        <p className="font-mono text-ink break-all">{merchantId}</p>
        <p>
          {usage.allocated} of {usage.wallet_limit} wallets allocated · {usage.activated} activated (
          {usage.activation_rate}%)
        </p>
      </div>

      <label className="block text-sm text-ink">
        Tier
        <select className="input mt-1 w-full" value={tier} onChange={(e) => onTierChange(e.target.value)}>
          {TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block text-sm text-ink">
          Wallet limit
          <input
            type="number"
            min={1}
            required
            className="input mt-1 w-full"
            value={walletLimit}
            onChange={(e) => setWalletLimit(e.target.value)}
          />
        </label>
        <label className="block text-sm text-ink">
          Activation target %
          <input
            type="number"
            min={1}
            max={100}
            required
            className="input mt-1 w-full"
            value={activation}
            onChange={(e) => setActivation(e.target.value)}
          />
        </label>
        <label className="block text-sm text-ink">
          Warn at usage %
          <input
            type="number"
            min={1}
            max={100}
            required
            className="input mt-1 w-full"
            value={warning}
            onChange={(e) => setWarning(e.target.value)}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={enforce} onChange={(e) => setEnforce(e.target.checked)} />
        Enforce limit (block new wallets at capacity)
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={autoUpgrade} onChange={(e) => setAutoUpgrade(e.target.checked)} />
        Auto-unlock next tier when activation target is met at the limit
      </label>

      <label className="block text-sm text-ink">
        Internal notes
        <textarea
          className="input mt-1 w-full"
          rows={3}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="flex justify-end">
        <button type="submit" disabled={mutation.isPending} className="btn-primary cursor-pointer disabled:opacity-50">
          {mutation.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
