import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ArrowLeft, Mail, Phone, MapPin, Building, Shield, ShieldCheck, ShieldX, Wallet, ArrowRight, Activity, Copy, FileText, CheckCircle2, Check, X } from 'lucide-react'
import { authApi, walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/users/$userId')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: UserDetailPage,
})

interface Transaction {
  id: string
  transaction_id: string
  asset_code: string
  amount: string
  amount_fiat?: string
  status: string
  transaction_type: string
  transaction_mode: string
  created_at: string
  receiver_wallet_details?: { currency?: string }
}

interface WalletAddress {
  id: string
  address: string
  network: string
  balance: string
  status: string
  is_circle_wallet: boolean
  is_wdk_wallet: boolean
}

interface UserWallet {
  id: string
  user_id: string
  asset_type: string
  currency: string
  balance: string
  status: string
  created_at: string
  addresses: WalletAddress[]
}

function UserDetailPage() {
  const { userId } = useParams({ from: '/users/$userId' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Modal confirmations states
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectConfirm, setShowApproveReject] = useState(false)

  // Fetch user documents (has user info)
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await authApi.get('/api/users/onboard/documents', {
        params: { page: 1, limit: 100 },
      })
      const docs = response.data.data.documents || []
      const userDoc = docs.find((d: any) => d.user_id === userId)
      return userDoc
    },
  })

  // Fetch extra merchant onboarding details (if role is merchant)
  const isMerchant = userData?.role === 'merchant'
  const { data: merchantData, isLoading: loadingMerchant } = useQuery({
    queryKey: ['merchant-onboard', userId],
    queryFn: async () => {
      const response = await authApi.get(`/api/merchants/onboard/${userId}`)
      return response.data?.data?.formData || null
    },
    enabled: !!userData && isMerchant,
  })

  // Fetch user wallets using correct direct endpoint
  const { data: walletsData, isLoading: loadingWallets } = useQuery({
    queryKey: ['user-wallets', userId],
    queryFn: async () => {
      const response = await walletApi.get(`/api/wallets/${userId}`)
      return response.data.data
    },
  })

  // Fetch user transactions
  const { data: transactionsData, isLoading: loadingTx } = useQuery({
    queryKey: ['user-transactions', userId],
    queryFn: async () => {
      const response = await walletApi.get(`/api/admin/transactions/${userId}`)
      return response.data.data
    },
  })

  const wallets: UserWallet[] = walletsData || []
  const transactions: Transaction[] = transactionsData?.data || transactionsData || []

  // Mutate Compliance Approvals
  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await authApi.post(`/api/users/onboard/approve-application/${userId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Compliance application approved successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setShowApproveConfirm(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve application')
    },
  })

  // Mutate Compliance Rejections
  const rejectMutation = useMutation({
    mutationFn: async () => {
      const response = await authApi.post(`/api/users/onboard/reject-application/${userId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Compliance application rejected successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setShowApproveReject(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reject application')
    },
  })

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied')
  }

  // Helper to get initials robustly for merchants and individuals
  const getInitials = (user: any) => {
    if (!user) return 'U'
    if (user.businessName) {
      const words = user.businessName.trim().split(/\s+/)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return user.businessName.slice(0, 2).toUpperCase()
    }
    const first = user.first_name?.[0] || ''
    const last = user.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'U'
  }

  if (loadingUser) {
    return (
      <AdminLayout title="User Detail">
        <div className="flex items-center justify-center py-20 bg-paper">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate border-t-ink"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!userData) {
    return (
      <AdminLayout title="User Detail">
        <div className="text-center py-20 bg-paper">
          <p className="text-slate">User not found</p>
          <button
            onClick={() => navigate({ to: '/users' })}
            className="mt-4 text-xs underline underline-offset-4 hover:text-slate text-ink cursor-pointer"
          >
            Back to Users
          </button>
        </div>
      </AdminLayout>
    )
  }

  const isPending = userData.approval_status?.toLowerCase() === 'pending' || userData.approval_status?.toLowerCase() === 'notsubmitted'

  return (
    <AdminLayout title="User Detail">
      <div className="space-y-6">
        <button
          onClick={() => navigate({ to: '/users' })}
          className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>

        {/* User header with Actions */}
        <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d65a84] to-[#3e1e68] rounded-2xl flex items-center justify-center shadow-xl-3">
                <span className="text-xl font-bold text-white uppercase">
                  {getInitials(userData)}
                </span>
              </div>
              <div>
                <h2 className="font-display text-2xl text-ink leading-tight uppercase tracking-wider">
                  {userData.first_name || userData.businessName} {userData.last_name || ''}
                </h2>
                {userData.businessName && userData.first_name && (
                  <p className="text-slate text-sm mt-0.5 uppercase tracking-wider">{userData.businessName}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <StatusBadge status={userData.approval_status || 'NotSubmitted'} />
                  <span className="text-xs uppercase tracking-wider text-slate">
                    {userData.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Compliance Action Controls */}
            {isPending && (
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowApproveConfirm(true)}
                  className="px-4 py-2 text-xs font-normal text-green-700 dark:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Approve Application
                </button>
                <button
                  onClick={() => setShowApproveReject(true)}
                  className="px-4 py-2 text-xs font-normal text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Reject Application
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact info */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">
              Contact Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 py-1">
                <Mail className="w-4 h-4 text-ash" />
                <span className="text-sm text-ink">{userData.email}</span>
              </div>
              {userData.phone && (
                <div className="flex items-center gap-3 py-1">
                  <Phone className="w-4 h-4 text-ash" />
                  <span className="text-sm text-ink">{userData.phone}</span>
                </div>
              )}
              {userData.country && (
                <div className="flex items-center gap-3 py-1">
                  <MapPin className="w-4 h-4 text-ash" />
                  <span className="text-sm text-ink">{userData.country}</span>
                </div>
              )}
              {userData.businessName && (
                <div className="flex items-center gap-3 py-1">
                  <Building className="w-4 h-4 text-ash" />
                  <span className="text-sm text-ink uppercase tracking-wider">{userData.businessName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Compliance */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">
              Compliance & Verification
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-ash" />
                  <span className="text-sm text-slate">Approval Status</span>
                </div>
                <StatusBadge status={userData.approval_status || 'NotSubmitted'} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-ash" />
                  <span className="text-sm text-slate">Account Verified</span>
                </div>
                <StatusBadge status={userData.isAccountVerified ? 'Verified' : 'Unverified'} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <div className="flex items-center gap-2">
                  <ShieldX className="w-4 h-4 text-ash" />
                  <span className="text-sm text-slate">Account Blocked</span>
                </div>
                <StatusBadge status={userData.is_blocked ? 'Blocked' : 'Active'} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-slate">Member Since</span>
                <span className="text-sm text-ink">
                  {userData.created_at ? format(new Date(userData.created_at), 'MMM d, yyyy') : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* EXTRA MERCHANT BUSINESS PROFILE CARD */}
        {isMerchant && (
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-ash" />
              Business Verification Details
            </h3>
            {loadingMerchant ? (
              <div className="py-8 text-center text-slate">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate border-t-ink"></div>
              </div>
            ) : merchantData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Registration Number */}
                <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                  <p className="text-[10px] text-slate uppercase tracking-wider">RC / Company Number</p>
                  <p className="text-sm font-medium text-ink font-mono">{merchantData.registrationNumber || '—'}</p>
                  <div className="pt-2 flex items-center gap-1.5">
                    {merchantData.is_registrationNumber_verified ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-[10px] text-green-700 font-medium">Registry Verified</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Pending Verification</span>
                    )}
                  </div>
                </div>

                {/* Tax ID */}
                <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                  <p className="text-[10px] text-slate uppercase tracking-wider">Tax ID (TIN)</p>
                  <p className="text-sm font-medium text-ink font-mono">{merchantData.tin || '—'}</p>
                  <p className="text-[10px] text-slate mt-2">{merchantData.tin ? 'Submitted' : 'Not Provided'}</p>
                </div>

                {/* BVN Details */}
                <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                  <p className="text-[10px] text-slate uppercase tracking-wider">Bank Verification (BVN)</p>
                  <p className="text-sm font-medium text-ink font-mono">
                    {merchantData.bvn ? `******${merchantData.bvn.slice(-4)}` : '—'}
                  </p>
                  <div className="pt-2 flex items-center gap-1.5">
                    {merchantData.bvn ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-[10px] text-green-700 font-medium">BVN Bound</span>
                      </>
                    ) : (
                      <span className="text-[10px] text-slate">Not Bound</span>
                    )}
                  </div>
                </div>

                {/* Onboarding Stage */}
                <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                  <p className="text-[10px] text-slate uppercase tracking-wider">Onboarding Progress</p>
                  <p className="text-sm font-medium text-ink">Step {merchantData.step || 1} of 3</p>
                  <p className="text-[10px] text-slate mt-2">Compliance Phase</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate italic">No detailed onboarding metadata found in the registry.</p>
            )}
          </div>
        )}

        {/* Wallets */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline">
            <h3 className="font-display text-lg text-ink">
              User Wallets ({wallets.length})
            </h3>
          </div>
          {loadingWallets ? (
            <div className="px-6 py-12 text-center text-slate">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate border-t-ink"></div>
            </div>
          ) : wallets.length > 0 ? (
            <div className="divide-y divide-graphite-hairline">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="p-6 space-y-4 hover:bg-vellum/20 transition-colors">
                  {/* Currency Summary Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
                        <span className="text-sm font-bold text-ink uppercase">{wallet.currency?.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {wallet.currency} Wallet
                        </p>
                        <p className="text-xs text-slate uppercase">
                          {wallet.asset_type?.toLowerCase().replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-display font-medium text-ink font-mono">
                        {parseFloat(wallet.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate uppercase">
                        {wallet.currency} Total
                      </p>
                    </div>
                  </div>

                  {/* Nested Network Addresses */}
                  {wallet.addresses && wallet.addresses.length > 0 ? (
                    <div className="pl-12 space-y-2.5">
                      <p className="text-[10px] text-slate uppercase tracking-wider">Deposit Addresses</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {wallet.addresses.map((addr) => (
                          <div key={addr.id} className="p-3 bg-vellum/40 border border-graphite-hairline rounded-xl flex items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-normal text-slate capitalize">{addr.network}</span>
                                <StatusBadge status={addr.status} />
                              </div>
                              <p className="font-mono text-xs text-ink truncate max-w-[200px]" title={addr.address}>
                                {addr.address}
                              </p>
                            </div>
                            <button
                              onClick={() => copyAddress(addr.address)}
                              className="p-1.5 hover:bg-vellum rounded-lg text-slate hover:text-ink transition-colors cursor-pointer flex-shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="pl-12">
                      <p className="text-xs text-slate italic">No network deposit addresses provisioned.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate">
              <Wallet className="w-8 h-8 mx-auto mb-2 text-ash" />
              <p className="text-xs">No wallets configured</p>
            </div>
          )}
        </div>

        {/* Transaction History Section */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline flex items-center justify-between">
            <h3 className="font-display text-lg text-ink">
              Transaction History ({transactions.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loadingTx ? (
              <div className="px-6 py-12 text-center text-slate">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate border-t-ink"></div>
              </div>
            ) : transactions.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-graphite-hairline bg-vellum">
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Flow (From → To)</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-normal text-slate uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-hairline">
                  {transactions.map((tx: any) => {
                    const cryptoAmount = parseFloat(tx.amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2 });
                    const fiatAmount = tx.amount_fiat && parseFloat(tx.amount_fiat) > 0 
                      ? parseFloat(tx.amount_fiat).toLocaleString(undefined, { minimumFractionDigits: 2 }) 
                      : null;
                    const toCurrency = tx.receiver_wallet_details?.currency || null;

                    // Compute Type Badge Colors
                    const typeLower = tx.transaction_type?.toLowerCase() || '';
                    let typeBadgeClasses = 'bg-vellum text-ink'; // default sandstone
                    
                    if (typeLower.includes('deposit') || typeLower.includes('credit')) {
                      typeBadgeClasses = 'bg-green-100/60 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/40 dark:border-green-800/30';
                    } else if (typeLower.includes('payout') || typeLower.includes('withdrawal')) {
                      typeBadgeClasses = 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-100/40 dark:border-red-900/30';
                    } else if (typeLower.includes('transfer')) {
                      typeBadgeClasses = 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100/40 dark:border-purple-900/30';
                    }

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => navigate({ to: `/transactions/$transactionId`, params: { transactionId: tx.transaction_id } })}
                        className="hover:bg-vellum transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-ink">{tx.transaction_id || tx.id?.slice(0, 8)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[11px] font-normal tracking-wider rounded-full uppercase ${typeBadgeClasses}`}>
                            {tx.transaction_type || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-ink">{cryptoAmount} <span className="text-xs text-slate uppercase">{tx.asset_code}</span></span>
                            {fiatAmount && toCurrency && (
                              <>
                                <ArrowRight className="w-3.5 h-3.5 text-ash" />
                                <span className="text-sm text-ink">{fiatAmount} <span className="text-xs text-slate uppercase">{toCurrency}</span></span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={tx.status} />
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate">
                            {tx.created_at ? format(new Date(tx.created_at), 'MMM d, yyyy HH:mm') : '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-12 text-center text-slate">
                <Activity className="w-8 h-8 mx-auto mb-2 text-ash" />
                <p className="text-xs">No transactions recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODALS */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={() => approveMutation.mutate()}
        title="Approve Compliance Application"
        message={`Are you sure you want to approve the compliance application for ${userData.first_name || userData.businessName}? This will verify their account and fully enable all operations.`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        variant="info"
        isLoading={approveMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => setShowApproveReject(false)}
        onConfirm={() => rejectMutation.mutate()}
        title="Reject Compliance Application"
        message={`Are you sure you want to reject the compliance application for ${userData.first_name || userData.businessName}? An automated email will be dispatched informing them of the rejection.`}
        confirmLabel="Reject"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={rejectMutation.isPending}
      />
    </AdminLayout>
  )
}
