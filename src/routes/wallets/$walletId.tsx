import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ArrowLeft, Copy, ExternalLink, Wallet } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/wallets/$walletId')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: WalletDetailPage,
})

interface WalletAddress {
  id: string
  address: string
  network: string
  created_at: string
  status: string
  balance: string
  is_wdk_wallet: boolean
}

interface WalletDetail {
  id: string
  user_id: string
  asset_type: string
  currency: string
  balance: string
  status: string
  created_at: string
  updated_at: string
  addresses: WalletAddress[]
  user?: {
    email: string
    first_name: string
    last_name: string
    businessName?: string
  }
}

function WalletDetailPage() {
  const { walletId } = useParams({ from: '/wallets/$walletId' })
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['wallet', walletId],
    queryFn: async () => {
      const response = await walletApi.get(`/api/admin/wallets/${walletId}`)
      return response.data.data
    },
  })

  const wallet: WalletDetail = data?.data || data

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  }

  if (isLoading) {
    return (
      <AdminLayout title="Wallet Detail">
        <div className="flex items-center justify-center py-20 bg-paper">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate border-t-ink"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !wallet) {
    return (
      <AdminLayout title="Wallet Detail">
        <div className="text-center py-20 bg-paper">
          <p className="text-slate">Wallet not found</p>
          <button
            onClick={() => navigate({ to: '/wallets' })}
            className="mt-4 text-xs underline underline-offset-4 hover:text-slate text-ink cursor-pointer"
          >
            Back to Wallets
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Wallet Detail">
      <div className="space-y-6">
        <button
          onClick={() => navigate({ to: '/wallets' })}
          className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Wallets
        </button>

        {/* Wallet header */}
        <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d65a84] to-[#3e1e68] rounded-2xl flex items-center justify-center shadow-xl-3">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl text-ink leading-tight">
                    {wallet.currency} Wallet
                  </h2>
                  <StatusBadge status={wallet.status} />
                </div>
                <p className="text-slate text-xs uppercase mt-1 tracking-wider">
                  {wallet.asset_type?.toLowerCase().replace(/_/g, ' ')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-display text-ink font-mono">
                {parseFloat(wallet.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate uppercase">
                {wallet.currency} Total Balance
              </p>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Block — Wallet Info */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">
              Wallet Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Wallet ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">
                    {wallet.id}
                  </span>
                  <button
                    onClick={() => copyToClipboard(wallet.id, 'Wallet ID')}
                    className="p-1 hover:bg-vellum rounded transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-ash" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Asset Type</span>
                <span className="text-sm text-ink uppercase">
                  {wallet.asset_type}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Currency Code</span>
                <span className="text-sm text-ink uppercase">
                  {wallet.currency}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Created</span>
                <span className="text-sm text-ink">
                  {wallet.created_at ? format(new Date(wallet.created_at), 'MMM d, yyyy') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate">Last Updated</span>
                <span className="text-sm text-ink">
                  {wallet.updated_at ? format(new Date(wallet.updated_at), 'MMM d, yyyy HH:mm') : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Block — Owner Info */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">
              Owner
            </h3>
            {wallet.user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
                    <span className="text-sm font-bold text-ink uppercase">
                      {wallet.user.first_name?.[0] || 'S'}{wallet.user.last_name?.[0] || 'S'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink capitalize">
                      {wallet.user.businessName || `${wallet.user.first_name || ''} ${wallet.user.last_name || ''}`.trim() || 'System'}
                    </p>
                    <p className="text-xs text-slate">
                      {wallet.user.email}
                    </p>
                  </div>
                </div>
                {wallet.user_id && (
                  <button
                    onClick={() => navigate({ to: `/users/$userId`, params: { userId: wallet.user_id } })}
                    className="w-full mt-4 py-2.5 px-4 bg-vellum hover:bg-slate/10 text-xs font-normal text-ink rounded-full border border-graphite-hairline transition-colors cursor-pointer"
                  >
                    View User Profile
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate italic">System account or no owner information</p>
            )}
          </div>
        </div>

        {/* Deposit Addresses Card Grid */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3 p-6 space-y-4">
          <h3 className="font-display text-lg text-ink flex items-center gap-2">
            <Wallet className="w-5 h-5 text-ash" />
            Deposit Networks & Addresses ({wallet.addresses?.length || 0})
          </h3>
          {wallet.addresses && wallet.addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallet.addresses.map((addr) => (
                <div key={addr.id} className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-normal text-slate capitalize">{addr.network}</span>
                      <StatusBadge status={addr.status} />
                    </div>
                    <p className="font-mono text-xs text-ink truncate max-w-[280px]" title={addr.address}>
                      {addr.address}
                    </p>
                    {addr.balance !== undefined && (
                      <p className="text-[10px] text-slate font-mono">Net Balance: {parseFloat(addr.balance).toLocaleString()} {wallet.currency}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(addr.address, 'Address')}
                      className="p-1.5 hover:bg-vellum rounded-lg text-slate hover:text-ink transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    {addr.network && (
                      <a
                        href={`https://${addr.network === 'polygon' ? 'polygonscan.com' : addr.network === 'bep20' ? 'bscscan.com' : 'etherscan.io'}/address/${addr.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-vellum rounded-lg text-slate hover:text-ink transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate italic">No network deposit addresses configured for this currency type (Fiat or Pending Crypto).</p>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
