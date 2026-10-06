import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { walletApi } from '../../lib/api'
import { useTiers } from './-hooks'
import type { Tier, CapacityUsage, WalletConfig, MerchantOption } from './-types'

export function ConfigModal({ merchantId, tiers, onClose }: { merchantId: string; tiers: Tier[]; onClose: () => void }) {
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
          tiers={tiers}
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
  tiers,
  config,
  usage,
  onSaved,
}: {
  merchantId: string
  tiers: Tier[]
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
    const preset = tiers.find((t) => t.code === value)
    if (preset?.wallet_limit) setWalletLimit(String(preset.wallet_limit))
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

  const reset = useMutation({
    mutationFn: async () => walletApi.delete(`/api/admin/merchants/${merchantId}/wallet-config`),
    onSuccess: () => {
      toast.success('Configuration reset to defaults')
      onSaved()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reset configuration')
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
        <p className="text-sm font-medium text-ink">{usage.merchant_name || merchantId}</p>
        <p className="font-mono break-all">{merchantId}</p>
        <p>
          {usage.allocated} of {usage.wallet_limit} wallets allocated · {usage.activated} activated (
          {usage.activation_rate}%)
        </p>
      </div>

      <label className="block text-sm text-ink">
        Tier
        <select className="input mt-1 w-full" value={tier} onChange={(e) => onTierChange(e.target.value)}>
          {tiers
            .filter((t) => t.is_active || t.code === config.tier)
            .map((t) => (
              <option key={t.code} value={t.code}>
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

      <div className="flex justify-between">
        <button
          type="button"
          disabled={reset.isPending}
          onClick={() => window.confirm('Reset this merchant to the default tier?') && reset.mutate()}
          className="btn-secondary cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" /> Reset to default
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary cursor-pointer disabled:opacity-50">
          {mutation.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

export function MerchantPicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const { data: merchants = [], isLoading } = useQuery({
    queryKey: ['admin-capacity-merchants', search],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/wallet-capacity/merchants', { params: { search } })
      return response.data.data as MerchantOption[]
    },
  })

  return (
    <Modal isOpen onClose={onClose} title="Add merchant" size="lg">
      <div className="space-y-3">
        <input
          className="input w-full"
          placeholder="Search by business name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {isLoading ? (
          <p className="text-sm text-slate">Loading...</p>
        ) : merchants.length === 0 ? (
          <p className="text-sm text-slate">No merchants found</p>
        ) : (
          <ul className="divide-y divide-graphite-hairline max-h-80 overflow-y-auto">
            {merchants.map((m) => (
              <li key={m.merchant_id}>
                <button
                  type="button"
                  onClick={() => onPick(m.merchant_id)}
                  className="w-full text-left py-2 px-1 hover:bg-vellum cursor-pointer"
                >
                  <p className="text-sm text-ink">{m.merchant_name || 'Unnamed merchant'}</p>
                  <p className="text-xs text-slate">{m.email}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

export function TierManager({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: tiers = [] } = useTiers()
  const [draft, setDraft] = useState({ code: '', label: '', wallet_limit: '' })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-wallet-tiers'] })
  const onError = (error: any) => toast.error(error?.response?.data?.message || 'Request failed')

  const create = useMutation({
    mutationFn: async () =>
      walletApi.post('/api/admin/wallet-tiers', {
        code: draft.code.trim().toUpperCase(),
        label: draft.label.trim(),
        wallet_limit: draft.wallet_limit ? Number(draft.wallet_limit) : null,
        sort_order: (tiers[tiers.length - 1]?.sort_order ?? 0) + 1,
      }),
    onSuccess: () => {
      toast.success('Tier created')
      setDraft({ code: '', label: '', wallet_limit: '' })
      refresh()
    },
    onError,
  })

  const update = useMutation({
    mutationFn: async ({ code, changes }: { code: string; changes: Partial<Tier> }) =>
      walletApi.put(`/api/admin/wallet-tiers/${code}`, changes),
    onSuccess: refresh,
    onError,
  })

  const remove = useMutation({
    mutationFn: async (code: string) => walletApi.delete(`/api/admin/wallet-tiers/${code}`),
    onSuccess: () => {
      toast.success('Tier deleted')
      refresh()
    },
    onError,
  })

  return (
    <Modal isOpen onClose={onClose} title="Manage tiers" size="lg">
      <div className="space-y-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate">
              <th className="py-1">Code</th>
              <th>Label</th>
              <th>Wallets</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.code} className="border-t border-graphite-hairline">
                <td className="py-2 font-mono text-xs">{t.code}</td>
                <td>{t.label}</td>
                <td>{t.wallet_limit ?? 'Negotiated'}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={t.is_active}
                    onChange={(e) => update.mutate({ code: t.code, changes: { is_active: e.target.checked } })}
                  />
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    aria-label={`Delete ${t.code}`}
                    onClick={() => window.confirm(`Delete tier ${t.code}?`) && remove.mutate(t.code)}
                    className="p-1.5 text-ash hover:text-ink cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form
          className="grid grid-cols-4 gap-2 items-end"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <label className="text-xs text-slate">
            Code
            <input className="input mt-1 w-full" required placeholder="TIER_5000" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
          </label>
          <label className="text-xs text-slate">
            Label
            <input className="input mt-1 w-full" required value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </label>
          <label className="text-xs text-slate">
            Wallets (blank = negotiated)
            <input className="input mt-1 w-full" type="number" min={1} value={draft.wallet_limit} onChange={(e) => setDraft({ ...draft, wallet_limit: e.target.value })} />
          </label>
          <button type="submit" disabled={create.isPending} className="btn-primary cursor-pointer disabled:opacity-50">
            Add tier
          </button>
        </form>
      </div>
    </Modal>
  )
}
