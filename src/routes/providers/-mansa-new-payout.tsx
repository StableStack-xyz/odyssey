import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertCircle, Building2, Calculator, CheckCircle2, Loader2, ShieldCheck, Sparkles, UserCheck, Wallet } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { walletApi } from '../../lib/api'
import { MerchantSearch } from '../payouts/-components'
import type { MerchantOption } from '../payouts/-components'
import { errorMessage } from './-mansa-types'
import { useDebounced } from './-mansa-shared'

type TwoFactorMethod = 'authenticator' | 'email' | null

interface Beneficiary {
  id: string
  account_name: string | null
  account_number: string | null
  bank_name: string | null
  country: string | null
}

interface Preview {
  fees: { recipientGets: number; platformRevenue: number; minimumTransferAmount: number }
  purpose_codes: string[]
  default_purpose_code: string
  requires_approval: boolean
}

interface WalletAddress {
  id: string
  address: string
  network: string
  balance: string
  status: string
}

interface UserWallet {
  id: string
  user_id: string
  asset_type: string
  currency: string
  balance: string
  status: string
  addresses: WalletAddress[]
}

export function NewPayoutModal({ method, onClose, onDone }: { method: TwoFactorMethod; onClose: () => void; onDone: () => void }) {
  const [merchant, setMerchant] = useState<MerchantOption | null>(null)
  const [beneficiaryId, setBeneficiaryId] = useState('')
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [narration, setNarration] = useState('')
  const [code, setCode] = useState('')
  const debouncedAmount = useDebounced(amount, 400)

  const { data: beneficiaries, isLoading: loadingBeneficiaries } = useQuery({
    queryKey: ['admin-mansa-new-payout-beneficiaries', merchant?.user_id],
    enabled: !!merchant,
    queryFn: async () => {
      const response = await walletApi.get(`/api/admin/users/${merchant!.user_id}/payout-methods`, {
        params: { provider: 'MANSA', currency: 'USD', type: 'BANK' },
      })
      return response.data.data as Beneficiary[]
    },
  })

  const { data: userWallets, isLoading: loadingWallets } = useQuery({
    queryKey: ['admin-merchant-wallets', merchant?.user_id],
    enabled: !!merchant,
    queryFn: async () => {
      const response = await walletApi.get(`/api/wallets/${merchant!.user_id}`)
      return response.data.data as UserWallet[]
    },
  })

  const usdtWallet = userWallets?.find(
    (w) => w.currency?.toUpperCase() === 'USDT' || w.asset_type?.toUpperCase() === 'USDT'
  )
  const tronAddress = usdtWallet?.addresses?.find(
    (a) => a.network?.toUpperCase().includes('TRON') || a.network?.toUpperCase().includes('TRX')
  )

  const amountValid = Number(debouncedAmount) > 0
  const { data: preview, isLoading: loadingPreview, error: previewError } = useQuery({
    queryKey: ['admin-mansa-payout-preview', debouncedAmount],
    enabled: amountValid,
    retry: false,
    queryFn: async () =>
      (await walletApi.get('/api/admin/mansa/payouts/preview', { params: { amount: debouncedAmount } })).data.data as Preview,
  })

  const sendCode = useMutation({
    mutationFn: () => walletApi.post('/api/admin/mansa/payouts/otp'),
    onSuccess: () => toast.success('Code sent to your email'),
    onError: (e) => toast.error(errorMessage(e)),
  })

  const create = useMutation({
    mutationFn: async () =>
      (
        await walletApi.post('/api/admin/mansa/payouts', {
          user_id: merchant!.user_id,
          payout_method_id: beneficiaryId,
          amount: Number(amount),
          purpose_code: purpose || preview?.default_purpose_code,
          narration: narration.trim() || undefined,
          totp_code: code,
        })
      ).data.data as { transaction_id: string; requires_approval: boolean },
    onSuccess: ({ requires_approval }) => {
      toast.success(requires_approval ? 'Payout created - it now awaits approval' : 'Payout created and queued')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const ready = !!merchant && !!beneficiaryId && Number(amount) > 0 && !!preview && code.length === 6 && !!method

  return (
    <Modal isOpen onClose={onClose} title="New USD payout" size="lg">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {merchant ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-paper border border-graphite-hairline rounded-xl flex items-center justify-between gap-3 shadow-sm transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-ink truncate">{merchant.merchant_name || 'Unnamed merchant'}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-xs text-slate truncate">{merchant.email}</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary text-xs px-2.5 py-1 cursor-pointer shrink-0"
                onClick={() => {
                  setMerchant(null)
                  setBeneficiaryId('')
                }}
              >
                Change
              </button>
            </div>

            {loadingWallets ? (
              <div className="p-3 border border-graphite-hairline rounded-xl flex items-center gap-2 text-xs text-slate">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                <span>Loading merchant USDT balance & TRON wallet...</span>
              </div>
            ) : usdtWallet ? (
              <div className="p-3.5 bg-brand/5 border border-brand/20 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-brand" />
                    <span className="font-semibold text-ink">Merchant USDT Wallet (TRON)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate font-medium">Available:</span>
                    <span className="text-xs font-bold text-ink font-mono bg-paper px-2 py-0.5 rounded border border-graphite-hairline">
                      {Number(usdtWallet.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                </div>

                {tronAddress && (
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate pt-1.5 border-t border-brand/10">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="shrink-0 font-medium">TRON Deposit:</span>
                      <code className="font-mono text-ink truncate bg-vellum/50 px-1.5 py-0.5 rounded text-[11px]" title={tronAddress.address}>
                        {tronAddress.address}
                      </code>
                    </div>
                    {tronAddress.balance !== undefined && (
                      <span className="shrink-0 font-medium text-slate font-mono">
                        {Number(tronAddress.balance || 0).toLocaleString()} USDT
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>No provisioned USDT wallet found for this merchant.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">Select Merchant *</label>
            <MerchantSearch onPick={setMerchant} />
          </div>
        )}

        {merchant && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">Beneficiary *</label>
            {loadingBeneficiaries ? (
              <div className="p-3 border border-graphite-hairline rounded-xl flex items-center gap-2 text-xs text-slate">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand" />
                <span>Loading merchant beneficiaries...</span>
              </div>
            ) : !beneficiaries?.length ? (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-600">
                This merchant has no Mansa USD beneficiary. Add one under Beneficiaries (provider MANSA).
              </div>
            ) : (
              <select className="input w-full text-xs" value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}>
                <option value="">Select a beneficiary...</option>
                {beneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.account_name || 'Unnamed'} - {b.bank_name || '-'} ****{b.account_number?.slice(-4)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">Amount to debit (USDT) *</label>
            <input
              className="input w-full text-xs"
              inputMode="decimal"
              placeholder="200"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              Purpose <span className="font-normal text-slate">(Optional)</span>
            </label>
            <select
              className="input w-full text-xs"
              value={purpose || preview?.default_purpose_code || ''}
              onChange={(e) => setPurpose(e.target.value)}
              disabled={!preview}
            >
              {(preview?.purpose_codes || []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingPreview ? (
          <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-xl flex items-center gap-2 text-xs text-slate">
            <Loader2 className="w-4 h-4 animate-spin text-brand" />
            <span>Calculating USD payout rate and platform fee...</span>
          </div>
        ) : previewError ? (
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-600">
            {errorMessage(previewError)}
          </div>
        ) : preview ? (
          <div className="p-3.5 bg-vellum/40 border border-graphite-hairline rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-ink border-b border-graphite-hairline pb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                Beneficiary Receives:
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {preview.fees.recipientGets.toLocaleString()} USD
              </span>
            </div>
            <p className="text-slate">
              Platform fee: <strong>{preview.fees.platformRevenue.toLocaleString()} USDT</strong>. Mansa cost is included in USDT sent to Mansa.
            </p>
            <p className="text-[11px] text-slate/80">
              {preview.requires_approval
                ? 'Approval flow active: payout requires admin 2FA approval before USDT leaves wallet.'
                : 'Auto approval active: USDT is sent immediately.'}
            </p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink">
            Narration <span className="font-normal text-slate">(Optional)</span>
          </label>
          <input
            className="input w-full text-xs"
            maxLength={140}
            placeholder="Reference or note for this payout"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
          />
        </div>

        {method ? (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              {method === 'email' ? '2FA Code from Email *' : '2FA Code from Authenticator App *'}
            </label>
            <div className="flex gap-2">
              <input
                className="input w-40 tracking-widest text-center text-sm"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
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
                    'Send code'
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600">
            Enable two-factor authentication on your admin account before creating payouts.
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-graphite-hairline">
          <button className="btn-secondary cursor-pointer text-xs" disabled={create.isPending} onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary cursor-pointer inline-flex items-center gap-2 text-xs"
            disabled={!ready || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Create payout
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}
