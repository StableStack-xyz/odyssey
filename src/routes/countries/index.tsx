import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { SearchInput } from '../../components/ui/SearchInput'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { Globe, Plus, Pencil, Trash2, Shield, DollarSign } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'

export const Route = createFileRoute('/countries/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: CountriesPage,
})

interface Country {
  id: string
  name: string
  created_at: string
  updated_at: string
  min_withdrawal: string
  iso_two: string | null
  iso_three: string | null
}

function CountriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Modal and state management for Countries CRUD
  const [showAddCountry, setShowAddCountry] = useState(false)
  const [showEditCountry, setShowEditCountry] = useState<Country | null>(null)
  const [showDeleteCountry, setShowDeleteCountry] = useState<Country | null>(null)

  // Form states
  const [countryForm, setCountryForm] = useState({
    name: '',
    min_withdrawal: '',
  })

  // 1. Fetch Countries using real paginated endpoint
  const { data, isLoading } = useQuery({
    queryKey: ['admin-countries', page, search],
    queryFn: async () => {
      const response = await walletApi.get('/api/countries', {
        params: { page, limit, search: search || undefined },
      })
      return response.data.data
    },
  })

  const countries: Country[] = data?.data || []
  const total = data?.pagination?.total || countries.length
  const totalPages = Math.ceil(total / limit) || 1

  // --- MUTATIONS ---

  // Create Country Mutation
  const createCountryMutation = useMutation({
    mutationFn: async (body: { name: string; min_withdrawal?: number }) => {
      const response = await walletApi.post('/api/admin/countries', body)
      return response.data
    },
    onSuccess: () => {
      toast.success('Country added successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-countries'] })
      setShowAddCountry(false)
      resetCountryForm()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add country')
    },
  })

  // Update Country Mutation
  const updateCountryMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { name?: string; min_withdrawal?: number } }) => {
      const response = await walletApi.put(`/api/admin/countries/${id}`, body)
      return response.data
    },
    onSuccess: () => {
      toast.success('Country updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-countries'] })
      setShowEditCountry(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update country')
    },
  })

  // Delete Country Mutation
  const deleteCountryMutation = useMutation({
    mutationFn: async (id: string) => {
      await walletApi.delete(`/api/admin/countries/${id}`)
    },
    onSuccess: () => {
      toast.success('Country deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-countries'] })
      setShowDeleteCountry(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete country')
    },
  })

  // --- HANDLERS ---

  const resetCountryForm = () => {
    setCountryForm({
      name: '',
      min_withdrawal: '',
    })
  }

  const openEditCountry = (row: Country) => {
    setShowEditCountry(row)
    setCountryForm({
      name: row.name,
      min_withdrawal: parseFloat(row.min_withdrawal || '0').toString(),
    })
  }

  const handleCreateCountry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!countryForm.name.trim()) {
      toast.error('Country name is required')
      return
    }

    const body: { name: string; min_withdrawal?: number } = {
      name: countryForm.name.trim(),
    }

    if (countryForm.min_withdrawal) {
      body.min_withdrawal = parseFloat(countryForm.min_withdrawal)
    }

    createCountryMutation.mutate(body)
  }

  const handleUpdateCountry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showEditCountry) return
    if (!countryForm.name.trim()) {
      toast.error('Country name is required')
      return
    }

    const body: { name?: string; min_withdrawal?: number } = {
      name: countryForm.name.trim(),
    }

    if (countryForm.min_withdrawal) {
      body.min_withdrawal = parseFloat(countryForm.min_withdrawal)
    }

    updateCountryMutation.mutate({ id: showEditCountry.id, body })
  }

  const columns: Column<Country>[] = [
    {
      key: 'name',
      header: 'Country',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
            <Globe className="w-4 h-4 text-ink" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink uppercase tracking-wide">{row.name}</p>
            <p className="text-[10px] text-slate font-mono uppercase tracking-widest">
              {row.iso_two || '—'} / {row.iso_three || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'iso_two',
      header: 'ISO 2-Letter',
      render: (row) => (
        <span className="text-sm font-mono text-ink uppercase">
          {row.iso_two || '—'}
        </span>
      ),
    },
    {
      key: 'iso_three',
      header: 'ISO 3-Letter',
      render: (row) => (
        <span className="text-sm font-mono text-slate uppercase">
          {row.iso_three || '—'}
        </span>
      ),
    },
    {
      key: 'min_withdrawal',
      header: 'Min Withdrawal',
      render: (row) => (
        <span className="text-sm font-medium text-ink">
          {parseFloat(row.min_withdrawal || '0').toLocaleString()} <span className="text-xs text-slate uppercase">{row.iso_three || ''}</span>
        </span>
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
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => openEditCountry(row)}
            className="p-1.5 text-ash hover:text-ink hover:bg-vellum rounded-lg transition-colors cursor-pointer"
            title="Edit country details"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowDeleteCountry(row)}
            className="p-1.5 text-ash hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            title="Delete country"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Countries">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Countries Configuration
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Configure supported countries and active regional withdrawal thresholds
            </p>
          </div>
          <button
            onClick={() => { resetCountryForm(); setShowAddCountry(true) }}
            className="px-4 py-2 text-xs font-normal text-ink bg-vellum border border-graphite-hairline hover:bg-graphite-hairline/20 rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Country
          </button>
        </div>

        <div className="flex items-center gap-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search countries..."
            className="w-full sm:w-80"
          />
        </div>

        <DataTable
          columns={columns}
          data={countries}
          isLoading={isLoading}
          emptyMessage="No countries configured"
          emptyIcon={<Globe className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          rowKey={(row) => row.id}
        />
      </div>

      {/* CREATE COUNTRY MODAL */}
      <Modal isOpen={showAddCountry} onClose={() => setShowAddCountry(false)} title="Add Supported Country" size="sm">
        <form onSubmit={handleCreateCountry} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Country Name *</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="text"
                value={countryForm.name}
                onChange={(e) => setCountryForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input !pl-10"
                placeholder="e.g. Ghana"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Min Withdrawal Threshold *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="number"
                step="0.000001"
                min="0"
                value={countryForm.min_withdrawal}
                onChange={(e) => setCountryForm((prev) => ({ ...prev, min_withdrawal: e.target.value }))}
                className="input !pl-10"
                placeholder="e.g. 50"
                required
              />
            </div>
            <p className="text-[10px] text-slate">The minimum fiat withdrawal amount allowed in regional bank settlements.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setShowAddCountry(false)}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCountryMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {createCountryMutation.isPending ? 'Adding...' : 'Add Country'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT COUNTRY MODAL */}
      <Modal isOpen={showEditCountry !== null} onClose={() => setShowEditCountry(null)} title="Edit Country Configuration" size="sm">
        <form onSubmit={handleUpdateCountry} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Country Name *</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="text"
                value={countryForm.name}
                onChange={(e) => setCountryForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input !pl-10"
                placeholder="e.g. Kenya"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Min Withdrawal Threshold *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="number"
                step="0.000001"
                min="0"
                value={countryForm.min_withdrawal}
                onChange={(e) => setCountryForm((prev) => ({ ...prev, min_withdrawal: e.target.value }))}
                className="input !pl-10"
                placeholder="e.g. 10"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setShowEditCountry(null)}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateCountryMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {updateCountryMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE COUNTRY CONFIRMATION */}
      <ConfirmDialog
        isOpen={showDeleteCountry !== null}
        onClose={() => setShowDeleteCountry(null)}
        onConfirm={() => {
          if (showDeleteCountry) deleteCountryMutation.mutate(showDeleteCountry.id)
        }}
        title="Delete Supported Country"
        message={
          <span>
            Are you sure you want to delete <strong>{showDeleteCountry?.name}</strong>? This will permanently remove it from supported locations. This action cannot be undone.
          </span>
        }
        confirmLabel="Delete Country"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteCountryMutation.isPending}
      />
    </AdminLayout>
  )
}
