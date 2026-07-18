import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ArrowLeft, Copy, ExternalLink, ArrowRight } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { APP_NAME } from '../../lib/constants'

export const Route = createFileRoute('/transactions/$transactionId')({
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
      { title: `Transaction Details - ${APP_NAME}` },
    ],
  }),
  component: TransactionDetailPage,
})

function TransactionDetailPage() {
  const { transactionId } = useParams({ from: '/transactions/$transactionId' })
  const navigate = useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      const response = await walletApi.get(`/api/transactions/${transactionId}`)
      return response.data.data
    },
  })

  const tx = data?.data || data

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  if (isLoading) {
    return (
      <AdminLayout title="Transaction Detail">
        <div className="flex items-center justify-center py-20 bg-paper">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate border-t-ink"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !tx) {
    return (
      <AdminLayout title="Transaction Detail">
        <div className="text-center py-20 bg-paper">
          <p className="text-slate">Transaction not found</p>
          <button
            onClick={() => navigate({ to: '/transactions' })}
            className="mt-4 text-xs underline underline-offset-4 hover:text-slate text-ink"
          >
            Back to Transactions
          </button>
        </div>
      </AdminLayout>
    )
  }

  // Read amount_after_fee directly from API, fallback to calculation if missing
  const amountNum = parseFloat(tx.amount || '0')
  const feeNum = parseFloat(tx.fee || '0')
  const amountAfterFee = tx.amount_after_fee !== undefined && tx.amount_after_fee !== null
    ? parseFloat(tx.amount_after_fee)
    : (amountNum - feeNum)

  const cryptoAmount = amountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })
  const fiatAmount = tx.amount_fiat && parseFloat(tx.amount_fiat) > 0 
    ? parseFloat(tx.amount_fiat).toLocaleString(undefined, { minimumFractionDigits: 2 }) 
    : null;
  const toCurrency = tx.receiver_wallet_details?.currency || null;

  return (
    <AdminLayout title="Transaction Detail">
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate({ to: '/transactions' })}
          className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Transactions
        </button>

        {/* Header Block */}
        <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="font-display text-2xl text-ink leading-tight">
                  Transaction {tx.transaction_id || tx.id?.slice(0, 8)}
                </h2>
                <StatusBadge status={tx.status} />
              </div>
              <p className="text-slate text-xs mt-1">
                {tx.created_at ? format(new Date(tx.created_at), 'MMMM d, yyyy \'at\' HH:mm:ss') : '—'}
              </p>
            </div>
            <div className="text-left md:text-right">
              <div className="flex items-center gap-2 md:justify-end">
                <span className="text-2xl font-display text-ink">{cryptoAmount} <span className="text-sm text-slate uppercase">{tx.asset_code}</span></span>
                {fiatAmount && toCurrency && (
                  <>
                    <ArrowRight className="w-4 h-4 text-ash" />
                    <span className="text-2xl font-display text-ink">{fiatAmount} <span className="text-sm text-slate uppercase">{toCurrency}</span></span>
                  </>
                )}
              </div>
              {tx.exchange_rate && parseFloat(tx.exchange_rate) > 0 && (
                <p className="text-xs text-slate mt-0.5">Rate: 1 {tx.asset_code} = {parseFloat(tx.exchange_rate).toLocaleString()} {toCurrency}</p>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Block — Transaction Info */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">
              Transaction Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Reference ID</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-ink">
                    {tx.transaction_id || '—'}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tx.transaction_id, 'Reference ID')}
                    className="p-1 hover:bg-vellum rounded transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-ash" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Type</span>
                <span className="text-sm text-ink capitalize">
                  {tx.transaction_type?.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Mode</span>
                <span className="text-sm text-ink capitalize">
                  {tx.transaction_mode?.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Network</span>
                <span className="text-sm text-ink capitalize">
                  {tx.network || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Amount</span>
                <span className="text-sm text-ink font-mono">
                  {cryptoAmount} {tx.asset_code}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Fee</span>
                <span className="text-sm text-ink font-mono">
                  {tx.fee ? `${parseFloat(tx.fee).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${tx.asset_code}` : '—'}
                </span>
              </div>
              {/* AMOUNT AFTER FEE */}
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Amount After Fee</span>
                <span className="text-sm text-ink font-mono font-medium">
                  {amountAfterFee.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.asset_code}
                </span>
              </div>
              {tx.crypto_transaction_id && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-slate">TX Hash</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ink">
                      {tx.crypto_transaction_id.slice(0, 10)}...{tx.crypto_transaction_id.slice(-8)}
                    </span>
                    <button
                      onClick={() => copyToClipboard(tx.crypto_transaction_id, 'TX Hash')}
                      className="p-1 hover:bg-vellum rounded transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-ash" />
                    </button>
                    {tx.network && (
                      <a
                        href={`https://${tx.network === 'polygon' ? 'polygonscan.com' : 'etherscan.io'}/tx/${tx.crypto_transaction_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-vellum rounded transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-ash" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Block — Parties */}
          <div className="space-y-6">
            {/* Sender */}
            <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
              <h3 className="font-display text-lg text-ink mb-4">
                Sender
              </h3>
              {tx.sender_user ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
                    <span className="text-sm text-ink capitalize">
                      {tx.sender_user.first_name?.[0] || 'S'}{tx.sender_user.last_name?.[0] || 'S'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-ink capitalize">
                      {tx.sender_user.businessName || `${tx.sender_user.first_name || ''} ${tx.sender_user.last_name || ''}`.trim() || 'StableStack'}
                    </p>
                    <p className="text-xs text-slate capitalize">
                      {tx.sender_user.role || 'System'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate">No sender information</p>
              )}
            </div>

            {/* Recipient */}
            <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
              <h3 className="font-display text-lg text-ink mb-4">
                Recipient
              </h3>
              {tx.receiver_wallet_details?.address || tx.receiver_wallet_details?.account_number ? (
                <div className="space-y-3">
                  {tx.withdrawal_recipient_name && (
                    <div className="flex items-center justify-between py-2 border-b border-graphite-hairline">
                      <span className="text-sm text-slate">Name</span>
                      <span className="text-sm text-ink capitalize">{tx.withdrawal_recipient_name}</span>
                    </div>
                  )}
                  {tx.receiver_wallet_details?.address && (
                    <div className="flex items-center justify-between py-2 border-b border-graphite-hairline">
                      <span className="text-sm text-slate">Address</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-ink">
                          {tx.receiver_wallet_details.address.slice(0, 10)}...{tx.receiver_wallet_details.address.slice(-8)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(tx.receiver_wallet_details.address, 'Address')}
                          className="p-1 hover:bg-vellum rounded transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5 text-ash" />
                        </button>
                      </div>
                    </div>
                  )}
                  {tx.receiver_wallet_details?.bank_name && (
                    <div className="flex items-center justify-between py-2 border-b border-graphite-hairline">
                      <span className="text-sm text-slate">Bank</span>
                      <span className="text-sm text-ink capitalize">
                        {tx.receiver_wallet_details.bank_name}
                      </span>
                    </div>
                  )}
                  {tx.receiver_wallet_details?.account_number && (
                    <div className="flex items-center justify-between py-2 border-b border-graphite-hairline">
                      <span className="text-sm text-slate">Account Number</span>
                      <span className="font-mono text-sm text-ink">
                        {tx.receiver_wallet_details.account_number}
                      </span>
                    </div>
                  )}
                  {tx.receiver_wallet_details?.currency && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate">Currency</span>
                      <span className="text-sm text-ink uppercase">
                        {tx.receiver_wallet_details.currency}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate">No receiver information</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
