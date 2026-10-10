import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { PinInput } from '../../components/ui/PinInput'
import { walletApi } from '../../lib/api'
import { MerchantSearch } from '../payouts/-components'
import type { MerchantOption } from '../payouts/-components'
import { errorMessage } from './-mansa-types'
import { capitalizeWords } from './-mansa-kyb-types'
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

const DEFAULT_PURPOSE_CODES = [
  'COMMERCIAL_PAYMENT',
  'GOODS_PURCHASE',
  'SERVICES_PAYMENT',
  'BUSINESS_EXPENSE',
  'PERSONAL_REMITTANCE',
  'OTHER',
]

export function NewPayoutModal({ method, onClose, onDone }: { method: TwoFactorMethod; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<1 | 2>(1)
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
          purpose_code: purpose || preview?.default_purpose_code || DEFAULT_PURPOSE_CODES[0],
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

  const availablePurposes = Array.from(
    new Set([...(preview?.purpose_codes || []), ...DEFAULT_PURPOSE_CODES])
  )
  const selectedBeneficiary = beneficiaries?.find((b) => b.id === beneficiaryId)

  const isInsufficientBalance = !!usdtWallet && Number(amount) > Number(usdtWallet.balance || 0)
  const readyToReview = !!merchant && !!beneficiaryId && Number(amount) > 0 && !!preview && !isInsufficientBalance

  return (
    <Modal isOpen onClose={onClose} title="New USD Payout" size="full">
      <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
        {/* Stepper Header */}
        <div className="flex items-center justify-center gap-3 py-2 border-b border-graphite-hairline text-xs font-medium mb-2">
          <div className={`flex items-center gap-1.5 ${step === 1 ? 'text-brand font-bold' : 'text-slate'}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step === 1 ? 'bg-brand text-white' : 'bg-vellum text-slate'}`}>1</span>
            Transfer Details
          </div>
          <ChevronRight className="w-4 h-4 text-slate/40" />
          <div className={`flex items-center gap-1.5 ${step === 2 ? 'text-brand font-bold' : 'text-slate'}`}>
            <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step === 2 ? 'bg-brand text-white' : 'bg-vellum text-slate'}`}>2</span>
            Review & Authorize
          </div>
        </div>

        {/* STEP 1: Transfer Details */}
        {step === 1 && (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Merchant Selection */}
            {merchant ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-paper border border-graphite-hairline rounded-xl flex items-center justify-between gap-3 shadow-sm transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-ink truncate">
                          {capitalizeWords(merchant.merchant_name) || merchant.email}
                        </span>
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

                {/* USDT TRON Wallet Balance Card */}
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
                        <span className="text-[11px] text-slate font-medium">Available Balance:</span>
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
                <label className="block text-xs font-semibold text-ink">Select Merchant (Sender Profile) *</label>
                <MerchantSearch onPick={setMerchant} mansaSendersOnly />
              </div>
            )}

            {/* Beneficiary Selector */}
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

            {/* Big Amount Input Section */}
            {merchant && (
              <div className="p-5 bg-vellum/30 border border-graphite-hairline rounded-2xl space-y-4 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-[11px] font-semibold uppercase tracking-wider">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  You Send (USDT)
                </div>

                <div className="relative max-w-md mx-auto">
                  <input
                    className="w-full text-3xl font-display font-bold text-center text-ink bg-paper border-2 border-graphite-hairline focus:border-brand rounded-2xl py-3 px-14 tracking-wide focus:outline-none transition-colors"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate font-mono">
                    USDT
                  </span>
                  {usdtWallet && (
                    <button
                      type="button"
                      onClick={() => setAmount(usdtWallet.balance || '')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-brand hover:bg-brand/10 px-2 py-1 rounded border border-brand/20 cursor-pointer transition-colors"
                    >
                      MAX
                    </button>
                  )}
                </div>

                {loadingPreview ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                    <span>Calculating USD rate & platform fee...</span>
                  </div>
                ) : previewError ? (
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl text-xs text-red-600">
                    {errorMessage(previewError)}
                  </div>
                ) : preview ? (
                  <div className="space-y-2 pt-2 border-t border-graphite-hairline">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      They Receive
                    </div>
                    <p className="text-3xl font-display font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      ${preview.fees.recipientGets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </p>
                    <div className="flex items-center justify-center gap-4 text-xs text-slate pt-1">
                      <span>Platform Fee: <strong className="text-ink font-mono">{preview.fees.platformRevenue.toLocaleString()} USDT</strong></span>
                      <span>•</span>
                      <span>{preview.requires_approval ? 'Approval Required' : 'Auto Approval'}</span>
                    </div>
                  </div>
                ) : null}

                {usdtWallet && Number(amount) > Number(usdtWallet.balance || 0) && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Insufficient balance: Amount ({amount} USDT) exceeds available merchant balance ({Number(usdtWallet.balance).toLocaleString()} USDT).</span>
                  </div>
                )}
              </div>
            )}

            {/* Purpose & Narration Fields */}
            {merchant && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">Purpose Code *</label>
                  <select
                    className="input w-full text-xs"
                    value={purpose || preview?.default_purpose_code || availablePurposes[0]}
                    onChange={(e) => setPurpose(e.target.value)}
                  >
                    {availablePurposes.map((p) => (
                      <option key={p} value={p}>
                        {p.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-ink">
                    Narration <span className="font-normal text-slate">(Optional)</span>
                  </label>
                  <input
                    className="input w-full text-xs"
                    maxLength={140}
                    placeholder="Reference or payment note"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Continue Action */}
            <div className="flex justify-end gap-2 pt-3 border-t border-graphite-hairline">
              <button type="button" className="btn-secondary text-xs px-4 py-2 cursor-pointer" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary text-xs px-5 py-2 cursor-pointer inline-flex items-center gap-2"
                disabled={!readyToReview}
                onClick={() => setStep(2)}
              >
                Continue to Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Review & 2FA Final Stage */}
        {step === 2 && (
          <div className="space-y-5 max-w-2xl mx-auto py-2">
            <div className="text-center space-y-1">
              <h4 className="font-display text-xl font-semibold text-ink">Review & Authorize Payout</h4>
              <p className="text-xs text-slate">Verify the transaction details below and authorize with your 2FA code.</p>
            </div>

            <div className="p-5 bg-paper border border-graphite-hairline rounded-2xl space-y-4 shadow-sm">
              <div className="text-xs font-semibold text-ink uppercase tracking-wider pb-2 border-b border-graphite-hairline flex items-center justify-between">
                <span>Transaction Summary</span>
                <span className="px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-[10px] font-bold">MANSA USD PAYOUT</span>
              </div>

              <div className="divide-y divide-graphite-hairline text-xs">
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate font-medium">Merchant (From Account):</span>
                  <span className="font-semibold text-ink text-right">
                    {capitalizeWords(merchant?.merchant_name) || merchant?.email}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate font-medium">Beneficiary (To Account):</span>
                  <span className="font-semibold text-ink text-right">
                    {selectedBeneficiary?.account_name || 'Unnamed'} ({selectedBeneficiary?.bank_name || '-'} ****{selectedBeneficiary?.account_number?.slice(-4)})
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate font-medium">Amount Sent (Debit):</span>
                  <span className="font-mono font-bold text-ink text-sm">{Number(amount).toLocaleString()} USDT</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate font-medium">Amount Received:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                    ${preview?.fees.recipientGets.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate font-medium">Platform Fee:</span>
                  <span className="font-mono text-slate">{preview?.fees.platformRevenue.toLocaleString()} USDT</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate font-medium">Purpose Code:</span>
                  <span className="font-medium text-ink">{(purpose || preview?.default_purpose_code || DEFAULT_PURPOSE_CODES[0]).replace(/_/g, ' ')}</span>
                </div>
                {narration && (
                  <div className="py-2.5 flex justify-between items-center">
                    <span className="text-slate font-medium">Narration:</span>
                    <span className="text-ink italic">{narration}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2FA Code Input Card */}
            {method ? (
              <div className="p-4 bg-vellum/40 border border-graphite-hairline rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label className="block text-xs font-semibold text-ink">
                    {method === 'email' ? 'Enter 2FA Code from Email *' : 'Enter 2FA Code from Authenticator App *'}
                  </label>
                  {method === 'email' && (
                    <button
                      type="button"
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
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600">
                Enable two-factor authentication on your admin account before creating payouts.
              </div>
            )}

            {/* Step 2 Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-graphite-hairline">
              <button
                type="button"
                className="btn-secondary text-xs px-4 py-2 cursor-pointer flex items-center gap-1"
                disabled={create.isPending}
                onClick={() => setStep(1)}
              >
                &larr; Back to Details
              </button>
              <button
                type="button"
                className="btn-primary text-xs px-5 py-2 cursor-pointer inline-flex items-center gap-2"
                disabled={code.length !== 6 || create.isPending || !method}
                onClick={() => create.mutate()}
              >
                {create.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Payout...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirm & Create Payout
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
