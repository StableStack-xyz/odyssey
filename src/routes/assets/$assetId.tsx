import { createFileRoute, redirect, useParams } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { ArrowLeft, Coins, Shield, Activity, Globe, Edit3, Trash2, Plus, Pencil, Network, X } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { APP_NAME } from '../../lib/constants'

export const Route = createFileRoute('/assets/$assetId')({
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
      { title: `Asset Details - ${APP_NAME}` },
    ],
  }),
  component: AssetDetailPage,
})

interface AssetNetwork {
  id: string
  asset_code_id: string
  network: string
  status: string
  created_at: string
  updated_at: string
}

interface AssetDetail {
  id: string
  code: string
  asset_type: string
  status: string
  created_at: string
  updated_at: string
  networks: AssetNetwork[] | null
}

function AssetDetailPage() {
  const { assetId } = useParams({ from: '/assets/$assetId' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showEditAsset, setShowEditAsset] = useState(false)
  const [showDeleteAsset, setShowDeleteAsset] = useState(false)
  const [showAddNetwork, setShowAddNetwork] = useState(false)
  const [showEditNetwork, setShowEditNetwork] = useState<string | null>(null)
  const [showDeleteNetwork, setShowDeleteNetwork] = useState<string | null>(null)

  const [editCode, setEditCode] = useState('')
  const [editAssetType, setEditAssetType] = useState('STABLECOIN')
  const [newNetworkName, setNewNetworkName] = useState('')
  const [editNetworkName, setEditNetworkName] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: async () => {
      const response = await walletApi.get(`/api/asset-codes/${assetId}`)
      return response.data.data as AssetDetail
    },
  })

  const updateAssetMutation = useMutation({
    mutationFn: async ({ code, asset_type }: { code: string; asset_type: string }) => {
      const response = await walletApi.put(`/api/asset-codes/${assetId}`, { code, asset_type })
      return response.data
    },
    onSuccess: () => {
      toast.success('Asset updated successfully')
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      queryClient.invalidateQueries({ queryKey: ['admin-assets'] })
      setShowEditAsset(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update asset')
    },
  })

  const deleteAssetMutation = useMutation({
    mutationFn: async () => {
      await walletApi.delete(`/api/asset-codes/${assetId}`)
    },
    onSuccess: () => {
      toast.success('Asset deleted successfully')
      navigate({ to: '/assets' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete asset')
    },
  })

  const addNetworkMutation = useMutation({
    mutationFn: async (network: string) => {
      const response = await walletApi.post(`/api/asset-codes/${assetId}/networks`, {
        networks: [network],
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Network added successfully')
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setNewNetworkName('')
      setShowAddNetwork(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add network')
    },
  })

  const updateNetworkMutation = useMutation({
    mutationFn: async ({ networkId, network }: { networkId: string; network: string }) => {
      const response = await walletApi.put(
        `/api/asset-codes/${assetId}/asset-networks/${networkId}`,
        { network }
      )
      return response.data
    },
    onSuccess: () => {
      toast.success('Network updated successfully')
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setEditNetworkName('')
      setShowEditNetwork(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update network')
    },
  })

  const deleteNetworkMutation = useMutation({
    mutationFn: async (networkId: string) => {
      await walletApi.delete(`/api/asset-codes/${assetId}/asset-networks/${networkId}`)
    },
    onSuccess: () => {
      toast.success('Network deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setShowDeleteNetwork(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete network')
    },
  })

  const asset = data

  const openEditAsset = () => {
    if (!asset) return
    setEditCode(asset.code)
    setEditAssetType(asset.asset_type)
    setShowEditAsset(true)
  }

  const openEditNetwork = (net: AssetNetwork) => {
    setEditNetworkName(net.network)
    setShowEditNetwork(net.id)
  }

  const handleUpdateAsset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editCode.trim()) {
      toast.error('Asset code is required')
      return
    }
    updateAssetMutation.mutate({ code: editCode.trim(), asset_type: editAssetType })
  }

  const handleAddNetwork = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNetworkName.trim()) {
      toast.error('Network name is required')
      return
    }
    addNetworkMutation.mutate(newNetworkName.trim().toLowerCase())
  }

  const handleUpdateNetwork = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editNetworkName.trim()) {
      toast.error('Network name is required')
      return
    }
    const networkId = showEditNetwork
    if (!networkId) return
    updateNetworkMutation.mutate({ networkId, network: editNetworkName.trim().toLowerCase() })
  }

  if (isLoading) {
    return (
      <AdminLayout title="Asset Detail">
        <div className="flex items-center justify-center py-20 bg-paper">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate border-t-ink"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !asset) {
    return (
      <AdminLayout title="Asset Detail">
        <div className="text-center py-20 bg-paper">
          <p className="text-slate">Asset not found</p>
          <button
            onClick={() => navigate({ to: '/assets' })}
            className="mt-4 text-xs underline underline-offset-4 hover:text-slate text-ink cursor-pointer"
          >
            Back to Assets
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Asset Detail">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: '/assets' })}
            className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assets
          </button>
        </div>

        {/* Asset Header with Actions */}
        <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d65a84] to-[#3e1e68] rounded-2xl flex items-center justify-center shadow-xl-3">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl text-ink leading-tight">
                    {asset.code} Asset
                  </h2>
                  <StatusBadge status={asset.status} />
                </div>
                <p className="text-slate text-xs uppercase mt-1 tracking-wider">
                  {asset.asset_type?.toLowerCase().replace(/_/g, ' ')} Settlement
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={openEditAsset}
                className="px-4 py-2 text-xs font-normal text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Edit Asset
              </button>
              <button
                onClick={() => setShowDeleteAsset(true)}
                className="px-4 py-2 text-xs font-normal text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete Asset
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">
              Asset Metadata
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">ID</span>
                <span className="font-mono text-sm text-ink">{asset.id}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Asset Code</span>
                <span className="text-sm text-ink font-medium uppercase">{asset.code}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Asset Type</span>
                <span className="text-sm text-ink uppercase">{asset.asset_type}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <span className="text-sm text-slate">Date Added</span>
                <span className="text-sm text-ink">
                  {asset.created_at ? format(new Date(asset.created_at), 'MMM d, yyyy HH:mm') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-slate">Last Updated</span>
                <span className="text-sm text-ink">
                  {asset.updated_at ? format(new Date(asset.updated_at), 'MMM d, yyyy HH:mm') : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3">
            <h3 className="font-display text-lg text-ink mb-4">
              Configuration Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-ash" />
                  <span className="text-sm text-slate">Global Active Status</span>
                </div>
                <StatusBadge status={asset.status} />
              </div>
              <div className="flex items-center justify-between py-3 border-b border-graphite-hairline">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-ash" />
                  <span className="text-sm text-slate">Settlement Type</span>
                </div>
                <span className="text-sm text-ink font-medium capitalize">
                  {asset.asset_type === 'FIAT' ? 'Off-chain Ledger' : 'On-chain Smart Contract'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-ash" />
                  <span className="text-sm text-slate">Associated Networks</span>
                </div>
                <span className="text-sm text-ink font-medium">
                  {asset.networks?.length || 0} Blockchains
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Supported Networks list with CRUD */}
        <div className="bg-paper rounded-2xl border border-graphite-hairline overflow-hidden shadow-xl-3">
          <div className="px-6 py-5 border-b border-graphite-hairline flex items-center justify-between">
            <h3 className="font-display text-lg text-ink">
              On-chain Networks ({asset.networks?.length || 0})
            </h3>
            <button
              onClick={() => setShowAddNetwork(true)}
              className="px-3 py-1.5 text-xs font-normal text-ink bg-vellum border border-graphite-hairline hover:bg-graphite-hairline/20 rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Network
            </button>
          </div>

          {asset.networks && asset.networks.length > 0 ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {asset.networks.map((net) => (
                <div
                  key={net.id}
                  className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink uppercase truncate">{net.network}</span>
                      <StatusBadge status={net.status} />
                    </div>
                    <p className="text-[10px] text-slate font-mono truncate">ID: {net.id}</p>
                    <p className="text-[10px] text-slate">
                      Enabled on: {net.created_at ? format(new Date(net.created_at), 'MMM d, yyyy HH:mm') : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => openEditNetwork(net)}
                      className="p-1.5 text-ash hover:text-ink hover:bg-vellum rounded-lg transition-colors cursor-pointer"
                      title="Edit network"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteNetwork(net.id)}
                      className="p-1.5 text-ash hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                      title="Delete network"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Network className="w-8 h-8 mx-auto mb-2 text-ash" />
              <p className="text-sm text-slate italic">This asset does not require multi-network configurations (Fiat asset / Centralized ledger).</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Asset Modal */}
      <Modal isOpen={showEditAsset} onClose={() => setShowEditAsset(false)} title="Edit Asset" size="md">
        <form onSubmit={handleUpdateAsset} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Asset Code</label>
            <input
              type="text"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              className="input"
              placeholder="e.g. USDC"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Asset Type</label>
            <select
              value={editAssetType}
              onChange={(e) => setEditAssetType(e.target.value)}
              className="input cursor-pointer appearance-none"
              required
            >
              <option value="STABLECOIN">STABLECOIN</option>
              <option value="FIAT">FIAT</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowEditAsset(false)}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateAssetMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {updateAssetMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Asset Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteAsset}
        onClose={() => setShowDeleteAsset(false)}
        onConfirm={() => deleteAssetMutation.mutate()}
        title="Delete Asset"
        message={
          <span>
            Are you sure you want to delete <strong>{asset.code}</strong>? This will permanently remove the asset and all its associated networks. This action cannot be undone.
          </span>
        }
        confirmLabel="Delete Asset"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteAssetMutation.isPending}
      />

      {/* Add Network Modal */}
      <Modal isOpen={showAddNetwork} onClose={() => setShowAddNetwork(false)} title="Add Network" size="sm">
        <form onSubmit={handleAddNetwork} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Network Name</label>
            <input
              type="text"
              value={newNetworkName}
              onChange={(e) => setNewNetworkName(e.target.value)}
              className="input"
              placeholder="e.g. polygon, erc20, trc20"
              required
            />
            <p className="text-[10px] text-slate">Enter the blockchain network identifier (lowercase)</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddNetwork(false); setNewNetworkName('') }}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addNetworkMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {addNetworkMutation.isPending ? 'Adding...' : 'Add Network'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Network Modal */}
      <Modal
        isOpen={showEditNetwork !== null}
        onClose={() => { setShowEditNetwork(null); setEditNetworkName('') }}
        title="Edit Network"
        size="sm"
      >
        <form onSubmit={handleUpdateNetwork} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">Network Name</label>
            <input
              type="text"
              value={editNetworkName}
              onChange={(e) => setEditNetworkName(e.target.value)}
              className="input"
              placeholder="e.g. polygon"
              required
            />
            <p className="text-[10px] text-slate">Update the blockchain network identifier</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowEditNetwork(null); setEditNetworkName('') }}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateNetworkMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50"
            >
              {updateNetworkMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Network Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteNetwork !== null}
        onClose={() => setShowDeleteNetwork(null)}
        onConfirm={() => {
          if (showDeleteNetwork) deleteNetworkMutation.mutate(showDeleteNetwork)
        }}
        title="Delete Network"
        message="Are you sure you want to remove this network from the asset? This action cannot be undone."
        confirmLabel="Delete Network"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteNetworkMutation.isPending}
      />
    </AdminLayout>
  )
}
