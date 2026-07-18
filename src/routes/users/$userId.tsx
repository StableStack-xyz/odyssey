import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ArrowLeft, Mail, Phone, MapPin, Building, Wallet, ArrowRight, Activity, Copy, FileText, CheckCircle2, Key, Globe, Link2, Clock, Check, X, RefreshCw } from 'lucide-react'
import { authApi, walletApi, baseApi } from '../../lib/api'
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

interface UserDocument {
  id: string
  user_id: string
  doc_country: string
  doc_type: string
  doc_image: string
  is_doc_verified: boolean
  approval_status: string
  created_at: string
  updated_at: string
  rejection_reason: string | null
}

interface LoginDetails {
  last_login: string | null
  failed_login_attempts: number
  last_failed_login: string | null
  login_blocked_until: string | null
}

interface OtpDetails {
  account_verification_otp: string | null
  otp_request_count: number
  last_otp_request: string | null
  otp_failure_count: number
  last_otp_failure: string | null
  account_verification_otp_expires: string | null
}

interface BankDetails {
  bank_identifier: string | null
  bank_identifier_type: string | null
  bank_country: string | null
  is_bank_verified: boolean
}

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  username: string
  role: string
  status: string
  is_active: boolean
  phone: string | null
  country_code: string | null
  currency: string | null
  is_email_verified: boolean
  is_phone_verified: boolean
  profile_image: string | null
  last_login_at: string
  created_at: string
  updated_at: string
  login_details: LoginDetails
  otp_details: OtpDetails
  compliance_status: string
  is_account_verified: boolean
  is_blocked: boolean
  is_admin: boolean
  slug: string
  birth_date: string | null
  tax_identification_number: string | null
  is_tax_verified: boolean
  bank_details: BankDetails
  quidax_user_id: string | null
  onboarding_reference: string | null
}

interface ContactPerson {
  full_name: string | null
  email: string | null
  phone: string | null
  job_title: string | null
  bvn: string | null
  is_bvn_verified: boolean
  id_type: string | null
  id_number: string | null
}

interface BusinessBankAccount {
  bank_name: string | null
  account_name: string | null
  account_number: string | null
  branch_address: string | null
}

interface MerchantAddress {
  street1: string | null
  street2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
}

interface MerchantAddresses {
  registered_address: MerchantAddress | null
  mailing_address: MerchantAddress | null
}

interface BusinessOwnerAddress {
  city: string | null
  state: string | null
  country: string | null
  street1: string | null
  street2: string | null
  postal_code: string | null
}

interface SupportingDocument {
  doc_type: string
  sub_type: string | null
  doc_image: string | null
}

interface BusinessOwner {
  dob: string | null
  email: string | null
  title: string | null
  gender: string | null
  address: BusinessOwnerAddress | null
  lastName: string | null
  firstName: string | null
  id_number: string | null
  is_signer: boolean
  back_image: string | null
  front_image: string | null
  nationality: string | null
  phone_number: string | null
  is_control_person: boolean
  is_beneficial_owner: boolean
  supporting_document: SupportingDocument[]
  ownership_percentage: number | null
  tax_identification_number: string | null
  relationship_establishment_date: string | null
}

interface MerchantPolicies {
  aml_policy: string | null
  kyc_policy: string | null
  data_protection_policy: string | null
}

interface MerchantDetails {
  id: string
  business_name: string | null
  phone: string | null
  currency: string | null
  country: string | null
  business_type: string | null
  industry: string | null
  business_model: string | null
  nature_of_business: string | null
  business_website: string | null
  tax_identification_number: string | null
  is_tax_verified: boolean
  registration_number: string | null
  is_registration_number_verified: boolean
  addresses: MerchantAddresses | null
  contact_person: ContactPerson | null
  source_of_funds: string | null
  business_bank_account: BusinessBankAccount | null
  expected_monthly_transactions: string | null
  expected_monthly_volume: string | null
  legal_structure: string | null
  formation_country: string | null
  formation_date: string | null
  operating_countries: string[]
  transaction_countries: string[]
  regulated_activities: string[]
  regulation_type: string | null
  is_regulated: boolean
  regulatory_number: string | null
  issuing_entity: string | null
  total_investable_assets: string | null
  estimated_fiat_balance: string | null
  digital_assets: string[]
  estimated_non_fiat_balance: string | null
  expected_monthly_non_fiat_transactions: string | null
  business_owners: BusinessOwner[]
  documents: any
  policies: MerchantPolicies | null
  created_at: string
  updated_at: string
}

interface ApiKey {
  id: string
  user_id: string
  api_key: string
  key_type: string
  description: string | null
  created_at: string
  last_used: string | null
  expires_at: string | null
  status: string
  permissions: any
}

interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  is_active: boolean
  created_at: string
}

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

  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [showRejectConfirm, setShowApproveReject] = useState(false)
  const [showApproveAppConfirm, setShowApproveAppConfirm] = useState(false)
  const [showRejectAppConfirm, setShowRejectAppConfirm] = useState(false)

  // Fetch user details by ID
  const { data: userData, isLoading: loadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await baseApi.get(`/api/users/${userId}`)
      const raw = response.data.data
      const profile: UserProfile = raw.user_profile
      const documents: UserDocument[] = raw.userDocuments || []
      const merchant: MerchantDetails = raw.merchant_details || {}
      const apiKeys: ApiKey[] = raw.api_keys || []
      const apiSettings = raw.api_settings || []
      const webhookEndpoints: WebhookEndpoint[] = raw.webhook_endpoints || []

      return {
        profile,
        documents,
        merchant,
        apiKeys,
        apiSettings,
        webhookEndpoints,
        // Derived fields
        displayName: profile.first_name
          ? `${profile.first_name} ${profile.last_name || ''}`.trim()
          : merchant.business_name || profile.username || profile.email,
        businessName: merchant.business_name || null,
        phone: profile.phone || merchant.contact_person?.phone || merchant.phone || null,
        country: profile.country_code || merchant.country || null,
        currency: profile.currency || merchant.currency || null,
      }
    },
  })

  // Fetch user wallets
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

  // Application approve/reject
  const approveAppMutation = useMutation({
    mutationFn: async (uid: string) => {
      const response = await authApi.post(`/api/users/onboard/approve-application/${uid}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Application approved successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setShowApproveAppConfirm(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve application')
    },
  })

  const rejectAppMutation = useMutation({
    mutationFn: async (uid: string) => {
      const response = await authApi.post(`/api/users/onboard/reject-application/${uid}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Application rejected successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setShowRejectAppConfirm(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reject application')
    },
  })

  // Compliance approve/reject
  const approveComplianceMutation = useMutation({
    mutationFn: async (uid: string) => {
      const response = await authApi.post(`/api/merchants/onboard/approve-compliance/${uid}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Compliance approved successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setShowApproveConfirm(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve compliance')
    },
  })

  const rejectComplianceMutation = useMutation({
    mutationFn: async (uid: string) => {
      const response = await authApi.post(`/api/merchants/onboard/reject-compliance/${uid}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Compliance rejected successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setShowApproveReject(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reject compliance')
    },
  })

  const approveDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await authApi.post(`/api/users/onboard/approve-doc/${userId}/${docId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Document approved successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve document')
    },
  })

  const rejectDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await authApi.post(`/api/users/onboard/reject-doc/${userId}/${docId}`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Document rejected successfully')
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reject document')
    },
  })

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied')
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // New helper to handle dynamic document types
  const formatDocType = (type: string) => {
    return type.toLowerCase().replace(/_/g, ' ')
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

  const { profile, documents, merchant, apiKeys, apiSettings, webhookEndpoints, displayName, businessName, phone, country, currency } = userData

  const statusColor = profile.status === 'active' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'

  return (
    <AdminLayout title="User Detail">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: '/users' })}
            className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Users
          </button>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['user', userId] })}
            className="flex items-center gap-1.5 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* User header */}
        <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d65a84] to-[#3e1e68] rounded-2xl flex items-center justify-center shadow-xl-3 shrink-0">
                <span className="text-xl font-bold text-white uppercase">
                  {getInitials(displayName)}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="font-display text-2xl text-ink leading-tight uppercase tracking-wider">
                  {displayName}
                </h2>
                {businessName && displayName !== businessName && (
                  <p className="text-slate text-sm mt-0.5 uppercase tracking-wider">{businessName}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-2.5 py-1 text-[11px] font-medium tracking-wider rounded-full uppercase border ${statusColor}`}>
                    {profile.status}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-slate">
                    {profile.role}
                  </span>
                  {profile.is_email_verified && (
                    <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium border border-green-200">
                      Email Verified
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-ink">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-ash shrink-0" />
                    <span className="truncate max-w-[200px]">{profile.email}</span>
                    {!profile.is_email_verified && (
                      <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">Unverified</span>
                    )}
                  </div>
                  {phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-ash shrink-0" />
                      <span>{phone}</span>
                      {!profile.is_phone_verified && (
                        <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">Unverified</span>
                      )}
                    </div>
                  )}
                  {country && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-ash shrink-0" />
                      <span>{country}</span>
                    </div>
                  )}
                  {currency && (
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-ash shrink-0" />
                      <span>{currency}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {!profile.is_account_verified && (
                  <>
                    <button
                      onClick={() => setShowApproveAppConfirm(true)}
                      disabled={approveAppMutation.isPending}
                      className="px-4 py-2 text-xs font-normal text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Approve Application
                    </button>
                    <button
                      onClick={() => setShowRejectAppConfirm(true)}
                      disabled={rejectAppMutation.isPending}
                      className="px-4 py-2 text-xs font-normal text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject Application
                    </button>
                  </>
                )}
                {(profile.compliance_status?.toLowerCase() === 'pending' || profile.compliance_status?.toLowerCase() === 'notsubmitted') && (
                  <>
                    <button
                      onClick={() => setShowApproveConfirm(true)}
                      disabled={approveComplianceMutation.isPending}
                      className="px-4 py-2 text-xs font-normal text-green-700 dark:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      Approve Compliance
                    </button>
                    <button
                      onClick={() => setShowApproveReject(true)}
                      disabled={rejectComplianceMutation.isPending}
                      className="px-4 py-2 text-xs font-normal text-orange-700 dark:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Reject Compliance
                    </button>
                  </>
                )}
              </div>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-6">
              Account Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">User ID</p>
                <p className="font-mono text-xs text-ink break-all" title={profile.id}>{profile.id}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Username / Slug</p>
                <p className="text-sm text-ink">{profile.username} / {profile.slug || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Role</p>
                <p className="text-sm text-ink uppercase">{profile.role}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Account Status</p>
                <StatusBadge status={profile.is_active ? 'Active' : 'Inactive'} />
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Blocked</p>
                <p className="text-sm text-ink">{profile.is_blocked ? 'Yes' : 'No'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Admin</p>
                <p className="text-sm text-ink">{profile.is_admin ? 'Yes' : 'No'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Account Verified</p>
                <StatusBadge status={profile.is_account_verified ? 'Verified' : 'Unverified'} />
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Compliance Status</p>
                <StatusBadge status={profile.compliance_status || 'NotSubmitted'} />
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Failed Logins</p>
                <p className="text-sm text-ink">{profile.login_details?.failed_login_attempts ?? 0}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Last Login</p>
                <p className="text-sm text-ink">
                  {profile.last_login_at ? format(new Date(profile.last_login_at), 'MMM d, yyyy HH:mm') : '—'}
                </p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Member Since</p>
                <p className="text-sm text-ink">
                  {profile.created_at ? format(new Date(profile.created_at), 'MMM d, yyyy') : '—'}
                </p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Birth Date</p>
                <p className="text-sm text-ink">{profile.birth_date || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Tax ID</p>
                <p className="text-sm text-ink">{profile.tax_identification_number || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Bank Details</p>
                <p className="text-sm text-ink">{profile.bank_details?.bank_identifier || '—'} / {profile.bank_details?.bank_identifier_type || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Quidax ID</p>
                <p className="text-sm text-ink">{profile.quidax_user_id || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Onboarding Ref</p>
                <p className="font-mono text-xs text-ink break-all">{profile.onboarding_reference || '—'}</p>
              </div>
            </div>
          </div>

        {/* Verification Documents */}
        {documents.length > 0 && (
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-ash" />
              Verification Documents ({documents.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documents.map((doc, index) => (
                <div key={index} className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate uppercase tracking-wider">{formatDocType(doc.doc_type || 'Document')}</p>
                    <StatusBadge status={doc.approval_status || 'Pending'} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc.is_doc_verified ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-[10px] text-green-700 font-medium">
                          Verified {format(new Date(doc.updated_at), 'MMM d, yyyy')}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Pending Verification
                      </span>
                    )}
                  </div>
                  <a href={doc.doc_image} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline block">View Document</a>
                  {doc.approval_status !== 'approved' && (
                    <div className="flex items-center gap-2 pt-1 border-t border-graphite-hairline">
                      <button
                        onClick={() => approveDocMutation.mutate(doc.id)}
                        disabled={approveDocMutation.isPending}
                        className="px-3 py-1 text-[10px] font-medium text-green-700 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-full transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3 h-3" />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectDocMutation.mutate(doc.id)}
                        disabled={rejectDocMutation.isPending}
                        className="px-3 py-1 text-[10px] font-medium text-red-700 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Merchant Details */}
        {profile.role === 'merchant' && (
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-6 flex items-center gap-2">
              <Building className="w-5 h-5 text-ash" />
              Merchant Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Business Name</p>
                <p className="text-sm font-medium text-ink">{merchant.business_name || '—'}</p>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Business Type / Model</p>
                <p className="text-sm font-medium text-ink capitalize">{merchant.business_type || '—'} / {merchant.business_model || '—'}</p>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Industry / Nature</p>
                <p className="text-sm font-medium text-ink">{merchant.industry || '—'} / {merchant.nature_of_business || '—'}</p>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Website</p>
                <a href={merchant.business_website || '#'} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline">{merchant.business_website || '—'}</a>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Tax ID (Verified)</p>
                <p className="text-sm font-medium text-ink font-mono">{merchant.tax_identification_number || '—'} {merchant.is_tax_verified ? '✅' : '❌'}</p>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Registration Number (Verified)</p>
                <p className="text-sm font-medium text-ink font-mono">{merchant.registration_number || '—'} {merchant.is_registration_number_verified ? '✅' : '❌'}</p>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Legal Structure / Formation</p>
                <p className="text-sm font-medium text-ink">{merchant.legal_structure || '—'} / {merchant.formation_country || '—'} {merchant.formation_date ? `(${format(new Date(merchant.formation_date), 'MMM d, yyyy')})` : ''}</p>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Source of Funds</p>
                <p className="text-sm font-medium text-ink">{merchant.source_of_funds || '—'}</p>
              </div>
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <p className="text-[10px] text-slate uppercase tracking-wider">Monthly Tx / Vol</p>
                <p className="text-sm font-medium text-ink">{merchant.expected_monthly_transactions || '—'} / {merchant.expected_monthly_volume || '—'}</p>
              </div>
            </div>

            {/* Registered Address */}
            {merchant.addresses?.registered_address?.city && (
              <div className="mt-6 pt-6 border-t border-graphite-hairline">
                <p className="text-xs font-semibold text-ink mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-ash" /> Registered Address</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['street1', 'street2', 'city', 'state', 'postal_code', 'country'].map(f => (
                    <div key={f} className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                      <p className="text-[10px] text-slate uppercase">{f.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-ink">{(merchant.addresses!.registered_address as any)[f] || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Merchant Compliance & Regulation */}
            <div className="mt-6 pt-6 border-t border-graphite-hairline">
              <p className="text-xs font-semibold text-ink mb-3">Regulation & AML</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Regulated</p>
                  <p className="text-sm text-ink">{String(merchant.is_regulated)} {merchant.is_regulated ? '— ' + (merchant.regulation_type || '') : ''}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Regulatory Number</p>
                  <p className="text-sm text-ink">{merchant.regulatory_number || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Issuing Entity</p>
                  <p className="text-sm text-ink">{merchant.issuing_entity || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Regulated Activities</p>
                  <p className="text-sm text-ink">{(merchant.regulated_activities || []).join(', ') || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Operating Countries</p>
                  <p className="text-sm text-ink">{(merchant.operating_countries || []).join(', ') || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Transaction Countries</p>
                  <p className="text-sm text-ink">{(merchant.transaction_countries || []).join(', ') || '—'}</p>
                </div>
              </div>
            </div>

            {/* Policies */}
            {merchant.policies && (
              <div className="mt-6 pt-6 border-t border-graphite-hairline">
                <p className="text-xs font-semibold text-ink mb-3">Policies</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">AML Policy</p>
                    {merchant.policies.aml_policy ? (
                      <a href={merchant.policies.aml_policy} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">View</a>
                    ) : (
                      <p className="text-sm text-ink">—</p>
                    )}
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">KYC Policy</p>
                    {merchant.policies.kyc_policy ? (
                      <a href={merchant.policies.kyc_policy} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">View</a>
                    ) : (
                      <p className="text-sm text-ink">—</p>
                    )}
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Data Protection Policy</p>
                    {merchant.policies.data_protection_policy ? (
                      <a href={merchant.policies.data_protection_policy} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">View</a>
                    ) : (
                      <p className="text-sm text-ink">—</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Financial Profile */}
            <div className="mt-6 pt-6 border-t border-graphite-hairline">
              <p className="text-xs font-semibold text-ink mb-3">Financial Profile</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Total Investable Assets</p>
                  <p className="text-sm text-ink">{merchant.total_investable_assets || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Est. Fiat Balance</p>
                  <p className="text-sm text-ink">{merchant.estimated_fiat_balance || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Digital Assets</p>
                  <p className="text-sm text-ink">{(merchant.digital_assets || []).join(', ') || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Est. Non-Fiat Balance</p>
                  <p className="text-sm text-ink">{merchant.estimated_non_fiat_balance || '—'}</p>
                </div>
                <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Monthly Non-Fiat Tx</p>
                  <p className="text-sm text-ink">{merchant.expected_monthly_non_fiat_transactions || '—'}</p>
                </div>
              </div>
            </div>

            {merchant.contact_person && (
              <div className="mt-6 pt-6 border-t border-graphite-hairline">
                <p className="text-xs font-semibold text-ink mb-3">Contact Person</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Name</p>
                    <p className="text-sm text-ink">{merchant.contact_person.full_name || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Email</p>
                    <p className="text-sm text-ink">{merchant.contact_person.email || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Phone</p>
                    <p className="text-sm text-ink">{merchant.contact_person.phone || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Title</p>
                    <p className="text-sm text-ink">{merchant.contact_person.job_title || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">ID Type / Number</p>
                    <p className="text-sm text-ink">{merchant.contact_person.id_type || '—'} / {merchant.contact_person.id_number || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">BVN / Verified</p>
                    <p className="text-sm text-ink">{merchant.contact_person.bvn || '—'} / {String(merchant.contact_person.is_bvn_verified)}</p>
                  </div>
                </div>
              </div>
            )}
            {merchant.business_bank_account && (
              <div className="mt-6 pt-6 border-t border-graphite-hairline">
                <p className="text-xs font-semibold text-ink mb-3">Business Bank Account</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Bank Name</p>
                    <p className="text-sm text-ink">{merchant.business_bank_account.bank_name || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Account Name</p>
                    <p className="text-sm text-ink">{merchant.business_bank_account.account_name || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Account Number</p>
                    <p className="text-sm text-ink font-mono">{merchant.business_bank_account.account_number || '—'}</p>
                  </div>
                  <div className="p-3 bg-paper border border-graphite-hairline rounded-lg">
                    <p className="text-[10px] text-slate uppercase">Branch Address</p>
                    <p className="text-sm text-ink">{merchant.business_bank_account.branch_address || '—'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Business Owners */}
            {merchant.business_owners && merchant.business_owners.length > 0 && (
              <div className="mt-6 pt-6 border-t border-graphite-hairline">
                <p className="text-xs font-semibold text-ink mb-3">Business Owners ({merchant.business_owners.length})</p>
                {merchant.business_owners.map((owner: any, i: number) => (
                  <div key={i} className="p-4 bg-paper border border-graphite-hairline rounded-xl mb-3 last:mb-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] text-slate uppercase">Name</p>
                        <p className="text-sm text-ink">{owner.firstName} {owner.lastName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Email</p>
                        <p className="text-sm text-ink">{owner.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Title</p>
                        <p className="text-sm text-ink">{owner.title || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Phone</p>
                        <p className="text-sm text-ink">{owner.phone_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Gender</p>
                        <p className="text-sm text-ink">{owner.gender || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">DOB</p>
                        <p className="text-sm text-ink">{owner.dob || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Nationality</p>
                        <p className="text-sm text-ink">{owner.nationality || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Ownership</p>
                        <p className="text-sm text-ink">{owner.ownership_percentage || '—'}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">ID Number</p>
                        <p className="text-sm text-ink">{owner.id_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Tax ID</p>
                        <p className="text-sm text-ink">{owner.tax_identification_number || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Relationship Date</p>
                        <p className="text-sm text-ink">{owner.relationship_establishment_date || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate uppercase">Signer / Control / Beneficial</p>
                        <p className="text-sm text-ink">{owner.is_signer ? '✓' : '✗'} / {owner.is_control_person ? '✓' : '✗'} / {owner.is_beneficial_owner ? '✓' : '✗'}</p>
                      </div>
                    </div>

                    {/* Address */}
                    {owner.address && (
                      <div className="mt-4 pt-4 border-t border-graphite-hairline">
                        <p className="text-[10px] text-slate uppercase mb-2">Address</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          <div>
                            <p className="text-[10px] text-slate uppercase">Street 1</p>
                            <p className="text-sm text-ink">{owner.address.street1 || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate uppercase">Street 2</p>
                            <p className="text-sm text-ink">{owner.address.street2 || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate uppercase">City</p>
                            <p className="text-sm text-ink">{owner.address.city || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate uppercase">State</p>
                            <p className="text-sm text-ink">{owner.address.state || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate uppercase">Postal Code</p>
                            <p className="text-sm text-ink">{owner.address.postal_code || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate uppercase">Country</p>
                            <p className="text-sm text-ink">{owner.address.country || '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ID Images */}
                    {(owner.front_image || owner.back_image) && (
                      <div className="mt-4 pt-4 border-t border-graphite-hairline">
                        <p className="text-[10px] text-slate uppercase mb-2">ID Document Images</p>
                        <div className="flex flex-wrap gap-4">
                          {owner.front_image && (
                            <a href={owner.front_image} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Front Image</a>
                          )}
                          {owner.back_image && (
                            <a href={owner.back_image} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Back Image</a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Supporting Documents */}
                    {owner.supporting_document && owner.supporting_document.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-graphite-hairline">
                        <p className="text-[10px] text-slate uppercase mb-2">Supporting Documents ({owner.supporting_document.length})</p>
                        <div className="space-y-2">
                          {owner.supporting_document.map((doc: any, di: number) => (
                            <div key={di} className="flex items-center justify-between p-2 bg-vellum/30 border border-graphite-hairline rounded-lg">
                              <div>
                                <span className="text-xs text-ink font-medium">{doc.doc_type}</span>
                                {doc.sub_type && <span className="text-[10px] text-slate ml-2">({doc.sub_type})</span>}
                              </div>
                              <a href={doc.doc_image} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline shrink-0">View</a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* API Keys */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline flex items-center justify-between">
            <h3 className="font-display text-lg text-ink flex items-center gap-2">
              <Key className="w-5 h-5 text-ash" />
              API Keys ({apiKeys.length})
            </h3>
          </div>
          {apiKeys.length > 0 ? (
            <div className="divide-y divide-graphite-hairline">
              {apiKeys.map((key) => (
                <div key={key.id} className="px-6 py-4 flex items-center justify-between hover:bg-vellum/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-vellum border border-graphite-hairline rounded-lg flex items-center justify-center">
                      <Key className="w-4 h-4 text-ash" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{key.description || key.key_type || 'API Key'}</p>
                      <p className="font-mono text-xs text-slate">{key.api_key?.slice(0, 8)}...{key.api_key?.slice(-4)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={key.status} />
                    <p className="text-[10px] text-slate mt-1">
                      {key.last_used ? `Last used ${format(new Date(key.last_used), 'MMM d, yyyy')}` : 'Never used'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate">
              <Key className="w-8 h-8 mx-auto mb-2 text-ash" />
              <p className="text-xs">No API keys configured</p>
            </div>
          )}
        </div>

        {/* API Settings */}
        {apiSettings && Object.keys(apiSettings).length > 0 && (
          <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
            <div className="px-6 py-5 border-b border-graphite-hairline flex items-center justify-between">
              <h3 className="font-display text-lg text-ink flex items-center gap-2">
                <Globe className="w-5 h-5 text-ash" />
                API Settings
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">API Version</p>
                <p className="text-sm text-ink">{apiSettings.api_version || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Request Timeout (sec)</p>
                <p className="text-sm text-ink">{apiSettings.request_timeout_seconds ?? '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Rate Limit (req/min)</p>
                <p className="text-sm text-ink">{apiSettings.rate_limiting_requests_per_minute ?? '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Idempotency Keys</p>
                <p className="text-sm text-ink">{apiSettings.require_idempotency_keys ? 'Required' : 'Optional'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Flag Large Tx</p>
                <p className="text-sm text-ink">{apiSettings.flag_large_transactions ? 'Enabled' : 'Disabled'} {apiSettings.large_transaction_threshold ? `(>${apiSettings.large_transaction_threshold})` : ''}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Monitor High-Risk Countries</p>
                <p className="text-sm text-ink">{apiSettings.monitor_high_risk_countries ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Monitor Suspicious Patterns</p>
                <p className="text-sm text-ink">{apiSettings.monitor_suspicious_patterns ? 'Enabled' : 'Disabled'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Webhook Endpoints */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline flex items-center justify-between">
            <h3 className="font-display text-lg text-ink flex items-center gap-2">
              <Link2 className="w-5 h-5 text-ash" />
              Webhook Endpoints ({webhookEndpoints.length})
            </h3>
          </div>
          {webhookEndpoints.length > 0 ? (
            <div className="divide-y divide-graphite-hairline">
              {webhookEndpoints.map((wh) => (
                <div key={wh.id} className="px-6 py-4 hover:bg-vellum/20 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-ash" />
                      <span className="font-mono text-sm text-ink">{wh.url}</span>
                    </div>
                    <StatusBadge status={wh.is_active ? 'Active' : 'Inactive'} />
                  </div>
                  {wh.events && wh.events.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 pl-6">
                      <span className="text-[10px] text-slate uppercase">Events:</span>
                      <div className="flex flex-wrap gap-1">
                        {wh.events.map((event, i) => (
                          <span key={i} className="px-2 py-0.5 text-[10px] bg-vellum border border-graphite-hairline rounded-full text-ink">
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-slate">
              <Link2 className="w-8 h-8 mx-auto mb-2 text-ash" />
              <p className="text-xs">No webhook endpoints configured</p>
            </div>
          )}
        </div>

        {/* Wallets */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline">
            <h3 className="font-display text-lg text-ink flex items-center gap-2">
              <Wallet className="w-5 h-5 text-ash" />
              Wallets ({wallets.length})
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
                        <span className="text-sm font-bold text-ink uppercase">{wallet.currency?.slice(0, 2)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">{wallet.currency} Wallet</p>
                        <p className="text-xs text-slate uppercase">{wallet.asset_type?.toLowerCase().replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-display font-medium text-ink font-mono">
                        {parseFloat(wallet.balance || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate uppercase">{wallet.currency} Total</p>
                    </div>
                  </div>

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

        {/* Transaction History */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline flex items-center justify-between">
            <h3 className="font-display text-lg text-ink flex items-center gap-2">
              <Activity className="w-5 h-5 text-ash" />
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

                    const typeLower = tx.transaction_type?.toLowerCase() || '';
                    let typeBadgeClasses = 'bg-vellum text-ink';
                    
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
        onConfirm={() => approveComplianceMutation.mutate(profile.id)}
        title="Approve Compliance"
        message={`Are you sure you want to approve the compliance for ${displayName}?`}
        confirmLabel="Approve Compliance"
        cancelLabel="Cancel"
        variant="info"
        isLoading={approveComplianceMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => setShowApproveReject(false)}
        onConfirm={() => rejectComplianceMutation.mutate(profile.id)}
        title="Reject Compliance"
        message={`Are you sure you want to reject the compliance for ${displayName}?`}
        confirmLabel="Reject Compliance"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={rejectComplianceMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showApproveAppConfirm}
        onClose={() => setShowApproveAppConfirm(false)}
        onConfirm={() => approveAppMutation.mutate(profile.id)}
        title="Approve Application"
        message={`Are you sure you want to approve the application for ${displayName}?`}
        confirmLabel="Approve Application"
        cancelLabel="Cancel"
        variant="info"
        isLoading={approveAppMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showRejectAppConfirm}
        onClose={() => setShowRejectAppConfirm(false)}
        onConfirm={() => rejectAppMutation.mutate(profile.id)}
        title="Reject Application"
        message={`Are you sure you want to reject the application for ${displayName}?`}
        confirmLabel="Reject Application"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={rejectAppMutation.isPending}
      />
    </AdminLayout>
  )
}
