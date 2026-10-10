import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Loader2, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { PinInput } from '../../components/ui/PinInput'
import { walletApi } from '../../lib/api'
import type { Pagination } from './-mansa-types'
import { errorMessage } from './-mansa-types'
import { NewPayoutModal } from './-mansa-new-payout'

interface PendingPayout {
  transaction_id: string
  asset_code: string
  amount: string
  source_amount: string | null
  beneficiary_amount: string | null
  platform_fee: string | null
  withdrawal_recipient_name: string | null
  bank_name: string | null
  bank_account: string | null
  merchant_name: string | null
  merchant_email: string | null
  requested_at: string | null
  created_at: string
}

type TwoFactorMethod = 'authenticator' | 'email' | null

const money = (value: string | null, suffix: string) => (value ? `${Number(value).toLocaleString()} ${suffix}` : '-')

function ApproveModal({
  payout,
  method,
  onClose,
  onDone,
}: {
  payout: PendingPayout
  method: TwoFactorMethod
  onClose: () => void
  onDone: () => void
}) {
  const [code, setCode] = useState('')

  const sendCode = useMutation({
    mutationFn: () => walletApi.post('/api/admin/mansa/payouts/otp'),
    onSuccess: () => toast.success('Code sent to your email'),
    onError: (e) => toast.error(errorMessage(e)),
  })

  const approve = useMutation({
    mutationFn: () => walletApi.post(`/api/admin/mansa/payouts/${payout.transaction_id}/approve`, { totp_code: code }),
    onSuccess: () => {
      toast.success('Payout approved - funds are being sent')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Modal isOpen onClose={onClose} title="Approve USD payout" size="md">
      <div className="space-y-4">
        <div className="p-3.5 bg-vellum/40 border border-graphite-hairline rounded-xl space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-graphite-hairline">
            <span className="font-semibold text-ink">{payout.merchant_name || payout.merchant_email}</span>
            <span className="text-slate font-medium">{money(payout.beneficiary_amount, 'USD')}</span>
          </div>
          <div className="space-y-1 text-slate">
            <p>
              <strong className="text-ink">Beneficiary:</strong> {payout.withdrawal_recipient_name || '-'} ({payout.bank_name || '-'} {payout.bank_account || ''})
            </p>
            <p>
              <strong className="text-ink">Source Amount:</strong> {money(payout.source_amount, 'USDT')} sent from merchant wallet
            </p>
            <p>
              <strong className="text-ink">Platform Fee:</strong> {money(payout.platform_fee, 'USDT')}
            </p>
          </div>
        </div>

        {method ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="block text-xs font-semibold text-ink">
                {method === 'email' ? '2FA Code from Email *' : '2FA Code from Authenticator App *'}
              </label>
              {method === 'email' && (
                <button
                  className="btn-secondary cursor-pointer inline-flex items-center gap-1.5 text-xs px-3 py-1.5"
                  disabled={sendCode.isPending}
                  onClick={() => sendCode.mutate()}
                >
                  {sendCode.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send code to email'
                  )}
                </button>
              )}
            </div>
            <div className="pt-1 flex justify-start">
              <PinInput
                value={code}
                onChange={(val) => setCode(val)}
                length={6}
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-600">
            Enable two-factor authentication on your admin account before approving payouts.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary cursor-pointer" disabled={approve.isPending} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary cursor-pointer inline-flex items-center gap-2"
            disabled={!method || code.length !== 6 || approve.isPending}
            onClick={() => approve.mutate()}
          >
            {approve.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Approve and send
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function RejectModal({ payout, onClose, onDone }: { payout: PendingPayout; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('')

  const reject = useMutation({
    mutationFn: () => walletApi.post(`/api/admin/mansa/payouts/${payout.transaction_id}/reject`, { reason }),
    onSuccess: () => {
      toast.success('Payout rejected')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  return (
    <Modal isOpen onClose={onClose} title="Reject USD payout" size="md">
      <div className="space-y-4">
        <p className="text-xs text-slate">
          The Mansa order will be cancelled and the transaction failed. No funds have left the merchant wallet.
        </p>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate">Rejection Reason *</label>
          <textarea
            className="input w-full"
            rows={3}
            maxLength={200}
            placeholder="Reason (shown on the transaction details)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary cursor-pointer" disabled={reject.isPending} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary cursor-pointer inline-flex items-center gap-2"
            disabled={reason.trim().length < 3 || reject.isPending}
            onClick={() => reject.mutate()}
          >
            {reject.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Rejecting...
              </>
            ) : (
              'Reject payout'
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function MansaPayouts() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [approving, setApproving] = useState<PendingPayout | null>(null)
  const [rejecting, setRejecting] = useState<PendingPayout | null>(null)
  const [creating, setCreating] = useState(false)
  const limit = 20

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-mansa-payouts', page],
    placeholderData: keepPreviousData,
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/mansa/payouts', { params: { page, limit } })
      return response.data as { data: PendingPayout[]; pagination: Pagination; two_factor: TwoFactorMethod }
    },
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-mansa-payouts'] })

  const columns: Column<PendingPayout>[] = [
    {
      key: 'merchant',
      header: 'Merchant',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.merchant_name || 'Unnamed merchant'}</p>
          <p className="text-xs text-slate">{row.merchant_email}</p>
        </div>
      ),
    },
    {
      key: 'beneficiary',
      header: 'Beneficiary',
      render: (row) => (
        <div>
          <p className="text-sm text-ink">{row.withdrawal_recipient_name || '-'}</p>
          <p className="text-xs text-slate">
            {row.bank_name || '-'} {row.bank_account || ''}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{money(row.beneficiary_amount, 'USD')}</p>
          <p className="text-xs text-slate">Sends {money(row.source_amount, 'USDT')}</p>
        </div>
      ),
    },
    {
      key: 'requested',
      header: 'Requested',
      render: (row) => <span className="text-xs text-slate">{new Date(row.requested_at || row.created_at).toLocaleString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <button className="btn-primary cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1" onClick={() => setApproving(row)}>
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
          <button className="btn-secondary cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1" onClick={() => setRejecting(row)}>
            <X className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">Payouts awaiting approval</h3>
          <p className="text-slate text-sm mt-1">
            USD payouts are quoted by Mansa, then wait here. USDT only leaves the merchant wallet after an admin approves with 2FA.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
            title="Refresh payout approvals"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setCreating(true)} className="btn-primary cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0">
            <Plus className="w-4 h-4 shrink-0" /> New payout
          </button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        emptyMessage="No payouts awaiting approval"
        emptyIcon={<ShieldCheck className="w-8 h-8 text-slate" />}
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        limit={limit}
        onPageChange={setPage}
        rowKey={(row) => row.transaction_id}
      />
      {creating && <NewPayoutModal method={data?.two_factor ?? null} onClose={() => setCreating(false)} onDone={refresh} />}
      {approving && (
        <ApproveModal payout={approving} method={data?.two_factor ?? null} onClose={() => setApproving(null)} onDone={refresh} />
      )}
      {rejecting && <RejectModal payout={rejecting} onClose={() => setRejecting(null)} onDone={refresh} />}
    </div>
  )
}
