import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { Coins } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'

export const Route = createFileRoute('/assets/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: AssetsPage,
})

interface AssetNetwork {
  id: string
  asset_code_id: string
  network: string
  status: string
}

interface Asset {
  id: string
  code: string
  asset_type: string
  status: string
  created_at: string
  updated_at: string
  networks: AssetNetwork[] | null
}

function AssetsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: assets, isLoading } = useQuery({
    queryKey: ['admin-assets', search],
    queryFn: async () => {
      const response = await walletApi.get('/api/asset-codes', {
        params: { search: search || undefined },
      })
      // The API returns response.data.data as the flat array directly
      return response.data.data as Asset[]
    },
  })

  // Filter client-side by search term for robustness
  const filteredAssets = (assets || []).filter((asset) => {
    if (!search) return true
    return (
      asset.code?.toLowerCase().includes(search.toLowerCase()) ||
      asset.asset_type?.toLowerCase().includes(search.toLowerCase())
    )
  })

  const columns: Column<Asset>[] = [
    {
      key: 'code',
      header: 'Asset',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
            <Coins className="w-4 h-4 text-ink" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{row.code}</p>
            <p className="text-xs text-slate uppercase tracking-wider">
              {row.asset_type?.toLowerCase().replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'networks',
      header: 'Supported Networks',
      render: (row) => {
        const networks = row.networks || []
        if (networks.length === 0) {
          return <span className="text-xs text-slate italic">Local settlement only</span>
        }

        return (
          <div className="flex flex-wrap gap-1.5">
            {networks.map((net) => (
              <span
                key={net.id}
                className="px-2 py-0.5 text-[10px] font-normal bg-vellum border border-graphite-hairline text-ink rounded-full uppercase tracking-wider"
              >
                {net.network}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      key: 'created_at',
      header: 'Added',
      render: (row) => (
        <span className="text-sm text-slate">
          {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
  ]

  return (
    <AdminLayout title="Assets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Assets
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage supported cryptocurrencies and networks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SearchInput
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder="Search assets..."
            className="w-80"
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredAssets}
          isLoading={isLoading}
          emptyMessage="No assets found"
          emptyIcon={<Coins className="w-8 h-8 text-slate" />}
          onRowClick={(row) => navigate({ to: `/assets/$assetId`, params: { assetId: row.id } })}
          rowKey={(row) => row.id}
        />
      </div>
    </AdminLayout>
  )
}
