import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { walletApi } from '../../lib/api'
import type { MansaBeneficiary, Pagination } from './-mansa-types'
import { statusStyle } from './-mansa-types'
import { CopyId, useDebounced } from './-mansa-shared'

export function MansaBeneficiaries() {
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
  ]

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl font-semibold text-ink">Mansa beneficiaries</h3>
        <p className="text-slate mt-1">USD beneficiaries saved for Mansa. Add new ones from Beneficiaries (provider MANSA).</p>
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
