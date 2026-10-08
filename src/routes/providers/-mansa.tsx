import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileCheck2, Landmark, Plus, RefreshCw } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { walletApi } from '../../lib/api'
import type { Pagination, Sender } from './-mansa-types'
import { STATUS_FILTERS, errorMessage, statusStyle } from './-mansa-types'
import { KycModal, RegisterModal } from './-mansa-components'
import { MansaBeneficiaries } from './-mansa-beneficiaries'
import { CopyId, useDebounced } from './-mansa-shared'

export function MansaProvider() {
  const [view, setView] = useState<'senders' | 'beneficiaries'>('senders')
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['senders', 'beneficiaries'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 text-xs rounded-full cursor-pointer capitalize ${view === v ? 'bg-ink text-paper' : 'bg-vellum text-slate hover:bg-slate/10'}`}
          >
            {v}
          </button>
        ))}
      </div>
      {view === 'senders' ? <MansaSenders /> : <MansaBeneficiaries />}
    </div>
  )
}

function MansaSenders() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search)
  const [page, setPage] = useState(1)
  const limit = 20
  const [registering, setRegistering] = useState(false)
  const [kycFor, setKycFor] = useState<Sender | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-mansa-senders', status, debouncedSearch, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/mansa/senders', {
        params: { status: status || undefined, search: debouncedSearch || undefined, page, limit },
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
      render: (row) => <CopyId value={row.sender_profile_id} />,
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
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">Mansa senders</h3>
            <p className="text-slate mt-1">
              Sender profiles required for USD payouts. Merchants can send USD only once their sender is approved.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              className="input w-64"
              placeholder="Search merchant or sender ID"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
            <select
              className="input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {s || 'All statuses'}
                </option>
              ))}
            </select>
            <button onClick={() => setRegistering(true)} className="btn-primary cursor-pointer inline-flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4 shrink-0" /> Register sender
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
    </>
  )
}
