import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw, Users } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { walletApi } from '../../lib/api'
import type { MansaBeneficiary, Pagination } from './-mansa-types'
import { errorMessage, statusStyle } from './-mansa-types'
import { CopyId, useDebounced } from './-mansa-shared'

export function MansaBeneficiaries() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebounced(search)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-mansa-beneficiaries', debounced, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/payout-methods', {
        params: { provider: 'MANSA', currency: 'USD', search: debounced || undefined, page, limit },
      })
      return response.data.data as { data: MansaBeneficiary[]; pagination: Pagination }
    },
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-mansa-beneficiaries'] })

  const sync = useMutation({
    mutationFn: (id: string) => walletApi.post(`/api/admin/mansa/beneficiaries/${id}/sync`),
    onSuccess: () => {
      toast.success('Status synced')
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const syncPending = useMutation({
    mutationFn: async () =>
      (await walletApi.post('/api/admin/mansa/beneficiaries/sync-pending')).data.data as {
        checked: number
        updated: number
        failed: number
      },
    onSuccess: ({ checked, updated, failed }) => {
      toast.success(`Checked ${checked}: ${updated} updated${failed ? `, ${failed} failed` : ''}`)
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const columns: Column<MansaBeneficiary>[] = [
    {
      key: 'merchant',
      header: 'Merchant',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-ink">
            {row.user?.businessName || `${row.user?.first_name || ''} ${row.user?.last_name || ''}`.trim() || 'Unnamed merchant'}
          </p>
          <p className="text-xs text-slate">{row.user?.email || row.user_id}</p>
        </div>
      ),
    },
    {
      key: 'beneficiary',
      header: 'Beneficiary',
      render: (row) => (
        <div>
          <p className="text-sm text-ink">{row.account_name || '-'}</p>
          <p className="text-xs text-slate">
            {row.bank_name || '-'} {row.account_number ? `- ****${row.account_number.slice(-4)}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'mansa_id',
      header: 'Mansa beneficiary ID',
      render: (row) => <CopyId value={row.account_holder?.id} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.account_holder?.status ? (
          <div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle(row.account_holder.status)}`}>
              {row.account_holder.status}
            </span>
            {row.account_holder.status_reason && <p className="text-xs text-slate mt-1">{row.account_holder.status_reason}</p>}
          </div>
        ) : (
          <span className="text-xs text-slate">-</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) =>
        row.account_holder?.id ? (
          <button
            onClick={() => sync.mutate(row.id)}
            disabled={sync.isPending}
            className="p-2 hover:bg-vellum rounded-lg text-ash hover:text-ink cursor-pointer"
            aria-label="Sync status"
            title="Sync status from Mansa"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-xl font-semibold text-ink">Mansa beneficiaries</h3>
          <p className="text-slate mt-1">USD beneficiaries saved for Mansa. Add new ones from Beneficiaries (provider MANSA).</p>
        </div>
        <button
          onClick={() => syncPending.mutate()}
          disabled={syncPending.isPending}
          className="btn-secondary cursor-pointer inline-flex items-center gap-2 whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-4 h-4 shrink-0 ${syncPending.isPending ? 'animate-spin' : ''}`} />
          Sync pending
        </button>
      </div>
      <input
        className="input w-full max-w-md"
        placeholder="Search by merchant, account, bank or Mansa ID"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
      />
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        emptyMessage="No Mansa beneficiaries found"
        emptyIcon={<Users className="w-8 h-8 text-slate" />}
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        limit={limit}
        onPageChange={setPage}
        rowKey={(row) => row.id}
      />
    </div>
  )
}
