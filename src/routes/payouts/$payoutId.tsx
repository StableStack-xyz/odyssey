import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { APP_NAME } from '../../lib/constants'

export const Route = createFileRoute('/payouts/$payoutId')({
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
      { title: `Beneficiary Details - ${APP_NAME}` },
    ],
  }),
  component: PayoutDetailPage,
})

function PayoutDetailPage() {
  const { payoutId } = Route.useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['payout-method', payoutId],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/payout-methods', {
        params: { search: payoutId },
      })
      const methods = response.data?.data?.data || []
      return methods.find((m: any) => m.id === payoutId) || null
    },
  })

  const method = data

  if (isLoading) {
    return (
      <AdminLayout title="Beneficiary Details">
        <div className="py-12 text-center text-slate">
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate border-t-ink"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!method) {
    return (
      <AdminLayout title="Beneficiary Details">
        <div className="space-y-6">
          <button
            onClick={() => navigate({ to: '/payouts' })}
            className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Beneficiaries
          </button>
          <div className="py-12 text-center text-slate">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-ash" />
            <p className="text-xs">Beneficiary not found</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const isBank = method.type === 'BANK'

  return (
    <AdminLayout title="Beneficiary Details">
      <div className="space-y-6">
        <button
          onClick={() => navigate({ to: '/payouts' })}
          className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Beneficiaries
        </button>

        <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-ink" />
              </div>
              <div>
                <h2 className="font-display text-xl text-ink capitalize">
                  {method.label || (isBank ? method.account_name || 'Bank Account' : method.wallet_address?.slice(0, 10) + '...' || 'Wallet')}
                </h2>
                <p className="text-xs text-slate uppercase">{method.type} — {method.currency}{method.country ? ` — ${method.country}` : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {isBank ? (
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">Bank Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Bank Name</p>
                <p className="text-sm text-ink">{method.bank_name || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Account Name</p>
                <p className="text-sm text-ink">{method.account_name || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Account Number</p>
                <p className="text-sm font-mono text-ink">{method.account_number || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Account Type</p>
                <p className="text-sm text-ink">{method.account_type || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Bank Code</p>
                <p className="text-sm font-mono text-ink">{method.bank_code || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Routing Number</p>
                <p className="text-sm font-mono text-ink">{method.routing_number || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Sort Code</p>
                <p className="text-sm font-mono text-ink">{method.sort_code || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">SWIFT Code</p>
                <p className="text-sm font-mono text-ink">{method.swift_code || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">IBAN</p>
                <p className="text-sm font-mono text-ink">{method.iban || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Bank Type</p>
                <p className="text-sm text-ink">{method.bank_type || '—'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">Wallet Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg md:col-span-2">
                <p className="text-[10px] text-slate uppercase">Wallet Address</p>
                <p className="text-sm font-mono text-ink break-all">{method.wallet_address || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Network</p>
                <p className="text-sm text-ink">{method.network || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Currency</p>
                <p className="text-sm text-ink">{method.currency || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {method.bank_address && (method.bank_address.street_line1 || method.bank_address.city) && (
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">Bank Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {method.bank_address.street_line1 && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Street</p>
                  <p className="text-sm text-ink">{method.bank_address.street_line1}</p>
                </div>
              )}
              {method.bank_address.city && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">City</p>
                  <p className="text-sm text-ink">{method.bank_address.city}</p>
                </div>
              )}
              {method.bank_address.state && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">State</p>
                  <p className="text-sm text-ink">{method.bank_address.state}</p>
                </div>
              )}
              {method.bank_address.postal_code && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Postal Code</p>
                  <p className="text-sm text-ink">{method.bank_address.postal_code}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {method.account_holder && method.account_holder.first_name && (
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">Account Holder</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Type</p>
                <p className="text-sm text-ink capitalize">{method.account_holder.type}</p>
              </div>
              {method.account_holder.business_name && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Business Name</p>
                  <p className="text-sm text-ink">{method.account_holder.business_name}</p>
                </div>
              )}
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">First Name</p>
                <p className="text-sm text-ink">{method.account_holder.first_name || '—'}</p>
              </div>
              <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                <p className="text-[10px] text-slate uppercase">Last Name</p>
                <p className="text-sm text-ink">{method.account_holder.last_name || '—'}</p>
              </div>
              {method.account_holder.email && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Email</p>
                  <p className="text-sm text-ink">{method.account_holder.email}</p>
                </div>
              )}
              {method.account_holder.phone && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
                  <p className="text-[10px] text-slate uppercase">Phone</p>
                  <p className="text-sm text-ink">{method.account_holder.phone}</p>
                </div>
              )}
              {method.account_holder.address && (method.account_holder.address.street_line1 || method.account_holder.address.city) && (
                <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg md:col-span-2">
                  <p className="text-[10px] text-slate uppercase">Address</p>
                  <p className="text-sm text-ink">
                    {[method.account_holder.address.street_line1, method.account_holder.address.city, method.account_holder.address.state, method.account_holder.address.postal_code].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
          <h3 className="font-display text-lg text-ink mb-4">Metadata</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">ID</p>
              <p className="font-mono text-xs text-ink break-all">{method.id}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">User ID</p>
              <p className="font-mono text-xs text-ink break-all">{method.user_id}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">Country</p>
              <p className="text-sm text-ink">{method.country || '—'}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">Provider</p>
              <p className="text-sm text-ink">{method.provider || '—'}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">WalletPay ID</p>
              <p className="font-mono text-xs text-ink break-all">{method.walapay_account_id || '—'}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">Third Party</p>
              <p className="text-sm text-ink">{method.is_third_party ? 'Yes' : 'No'}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">API Generated</p>
              <p className="text-sm text-ink">{method.is_api_generated ? 'Yes' : 'No'}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">Created</p>
              <p className="text-sm text-ink">{method.created_at ? format(new Date(method.created_at), 'MMM d, yyyy h:mm a') : '—'}</p>
            </div>
            <div className="p-3 bg-vellum/30 border border-graphite-hairline rounded-lg">
              <p className="text-[10px] text-slate uppercase">Updated</p>
              <p className="text-sm text-ink">{method.updated_at ? format(new Date(method.updated_at), 'MMM d, yyyy h:mm a') : '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
