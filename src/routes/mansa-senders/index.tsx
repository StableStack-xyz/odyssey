import { createFileRoute, redirect } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileCheck2, Plus, RefreshCw, Landmark } from 'lucide-react'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { Modal } from '../../components/ui/Modal'
import { walletApi } from '../../lib/api'
import { APP_NAME } from '../../lib/constants'

export const Route = createFileRoute('/mansa-senders/')({
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
      { title: `Mansa Senders - ${APP_NAME}` },
      { name: 'description', content: 'Manage Mansa USD payout sender profiles' },
    ],
  }),
  component: MansaSendersPage,
})

interface Sender {
  id: string
  user_id: string
  sender_profile_id: string
  status: string
  status_reason: string | null
  merchant_name: string | null
  merchant_email: string | null
  updated_at: string
}

interface MerchantOption {
  user_id: string
  merchant_name: string | null
  email: string
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

const STATUS_FILTERS = ['', 'pending', 'approved', 'rejected']

const statusStyle = (status: string) =>
  status === 'approved'
    ? 'bg-green-100 text-green-700'
    : status === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

const errorMessage = (error: any) => error?.response?.data?.message || 'Request failed'

function MansaSendersPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20
  const [registering, setRegistering] = useState(false)
  const [kycFor, setKycFor] = useState<Sender | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-mansa-senders', status, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/mansa/senders', {
        params: { status: status || undefined, page, limit },
      })
      return response.data as { data: Sender[]; pagination: Pagination }
    },
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-mansa-senders'] })

  const sync = useMutation({
    mutationFn: (userId: string) => walletApi.post(`/api/admin/mansa/senders/${userId}/sync`),
    onSuccess: () => {
      toast.success('Status synced')
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const columns: Column<Sender>[] = [
    {
      key: 'merchant',
      header: 'Merchant',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">{row.merchant_name || 'Unnamed merchant'}</p>
          <p className="text-xs text-slate">{row.merchant_email || row.user_id}</p>
        </div>
      ),
    },
    {
      key: 'sender_profile_id',
      header: 'Mansa sender ID',
      render: (row) => <span className="text-xs font-mono text-slate">{row.sender_profile_id}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle(row.status)}`}>
            {row.status}
          </span>
          {row.status_reason && <p className="text-xs text-slate mt-1">{row.status_reason}</p>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex gap-1 justify-end">
          <button
            onClick={() => setKycFor(row)}
            className="p-2 hover:bg-vellum rounded-lg text-ash hover:text-ink cursor-pointer"
            aria-label="Submit KYC"
            title="Submit KYC"
          >
            <FileCheck2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => sync.mutate(row.user_id)}
            disabled={sync.isPending}
            className="p-2 hover:bg-vellum rounded-lg text-ash hover:text-ink cursor-pointer"
            aria-label="Sync status"
            title="Sync status from Mansa"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Mansa Senders">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Mansa Senders</h2>
            <p className="text-slate mt-1">
              Sender profiles required for USD payouts. Merchants can send USD only once their sender is approved.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <select className="input" value={status} onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s || 'All statuses'}
                </option>
              ))}
            </select>
            <button onClick={() => setRegistering(true)} className="btn-primary cursor-pointer inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Register sender
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          emptyMessage="No Mansa senders yet"
          emptyIcon={<Landmark className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={data?.pagination?.totalPages || 1}
          total={data?.pagination?.total || 0}
          limit={limit}
          onPageChange={setPage}
          rowKey={(row) => row.id}
        />
      </div>

      {registering && <RegisterModal onClose={() => setRegistering(false)} onDone={refresh} />}
      {kycFor && <KycModal sender={kycFor} onClose={() => setKycFor(null)} onDone={refresh} />}
    </AdminLayout>
  )
}

function RegisterModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const [pickerPage, setPickerPage] = useState(1)
  const [merchant, setMerchant] = useState<MerchantOption | null>(null)
  const [mode, setMode] = useState<'create' | 'link'>('create')
  const [linkId, setLinkId] = useState('')
  const [form, setForm] = useState({ profile_type: 'enterprise', legal_name: '', country_code: '' })

  const { data: result } = useQuery({
    queryKey: ['admin-mansa-merchants', debouncedSearch, pickerPage],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/mansa/merchants', {
        params: { search: debouncedSearch, page: pickerPage, limit: 10 },
      })
      return response.data as { data: MerchantOption[]; pagination: Pagination }
    },
    enabled: !merchant,
  })
  const merchants = result?.data || []
  const totalPages = result?.pagination?.totalPages || 1

  const register = useMutation({
    mutationFn: () =>
      walletApi.post(
        `/api/admin/mansa/senders/${merchant!.user_id}`,
        mode === 'link'
          ? { sender_profile_id: linkId.trim() }
          : { sender: { ...form, country_code: form.country_code.toUpperCase() } }
      ),
    onSuccess: () => {
      toast.success('Sender registered')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const canSubmit =
    !!merchant && (mode === 'link' ? !!linkId.trim() : !!form.legal_name.trim() && form.country_code.length === 2)

  return (
    <Modal isOpen onClose={onClose} title="Register Mansa sender" size="lg">
      <div className="space-y-4">
        {merchant ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">{merchant.merchant_name || 'Unnamed merchant'}</p>
              <p className="text-xs text-slate">{merchant.email}</p>
            </div>
            <button className="btn-secondary cursor-pointer" onClick={() => setMerchant(null)}>
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className="input w-full"
              placeholder="Search merchant by business name or email"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPickerPage(1)
              }}
              autoFocus
            />
            <ul className="divide-y divide-graphite-hairline max-h-56 overflow-y-auto">
              {merchants.map((m) => (
                <li key={m.user_id}>
                  <button type="button" onClick={() => setMerchant(m)} className="w-full text-left py-2 px-1 hover:bg-vellum cursor-pointer">
                    <p className="text-sm text-ink">{m.merchant_name || 'Unnamed merchant'}</p>
                    <p className="text-xs text-slate">{m.email}</p>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-xs text-slate">
              <button type="button" className="btn-secondary cursor-pointer" disabled={pickerPage <= 1} onClick={() => setPickerPage((p) => p - 1)}>
                Previous
              </button>
              <span>
                Page {pickerPage} of {totalPages}
              </span>
              <button type="button" className="btn-secondary cursor-pointer" disabled={pickerPage >= totalPages} onClick={() => setPickerPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={mode === 'create'} onChange={() => setMode('create')} /> Create new sender
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={mode === 'link'} onChange={() => setMode('link')} /> Link existing Mansa sender
          </label>
        </div>

        {mode === 'link' ? (
          <input className="input w-full" placeholder="Mansa sender profile ID (UUID)" value={linkId} onChange={(e) => setLinkId(e.target.value)} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.profile_type} onChange={(e) => setForm({ ...form, profile_type: e.target.value })}>
              <option value="enterprise">Enterprise</option>
              <option value="individual">Individual</option>
            </select>
            <input className="input" placeholder="Country code (e.g. NG)" maxLength={2} value={form.country_code} onChange={(e) => setForm({ ...form, country_code: e.target.value })} />
            <input className="input col-span-2" placeholder="Legal name" value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary cursor-pointer" disabled={!canSubmit || register.isPending} onClick={() => register.mutate()}>
            {register.isPending ? 'Registering...' : 'Register'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function KycModal({ sender, onClose, onDone }: { sender: Sender; onClose: () => void; onDone: () => void }) {
  const [profileType, setProfileType] = useState('enterprise')
  const [payload, setPayload] = useState('{\n  \n}')

  const submit = useMutation({
    mutationFn: () => walletApi.post(`/api/admin/mansa/senders/${sender.user_id}/kyc`, { profile_type: profileType, kyc: JSON.parse(payload) }),
    onSuccess: () => {
      toast.success('KYC submitted')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const send = () => {
    try {
      JSON.parse(payload)
    } catch {
      toast.error('KYC payload must be valid JSON')
      return
    }
    submit.mutate()
  }

  return (
    <Modal isOpen onClose={onClose} title={`Submit KYC - ${sender.merchant_name || sender.merchant_email || 'merchant'}`} size="lg">
      <div className="space-y-4">
        <select className="input" value={profileType} onChange={(e) => setProfileType(e.target.value)}>
          <option value="enterprise">Enterprise KYC</option>
          <option value="individual">Personal KYC</option>
        </select>
        <textarea
          className="input w-full font-mono text-xs"
          rows={14}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="Mansa KYC payload (JSON)"
        />
        <div className="flex justify-end gap-2">
          <button className="btn-secondary cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary cursor-pointer" disabled={submit.isPending} onClick={send}>
            {submit.isPending ? 'Submitting...' : 'Submit KYC'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
