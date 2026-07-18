import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Modal } from '../../components/ui/Modal'
import { Webhook, Trash2, Calendar, ShieldAlert, CheckCircle2, ChevronRight, Copy, Terminal, Eye } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'

export const Route = createFileRoute('/webhooks/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: WebhooksPage,
})

interface WebhookEvent {
  id: string
  reference_id: string
  event_type: string
  provider: string
  metadata: any
  status: string
  attempts: number
  error_details: any
  processed_at: string | null
  created_at: string
  updated_at: string
}

function WebhooksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Inspecting and deleting states
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<WebhookEvent | null>(null)

  // 1. Fetch logged webhook event deliveries
  const { data, isLoading } = useQuery({
    queryKey: ['admin-webhook-events', page, search],
    queryFn: async () => {
      const response = await walletApi.get('/api/webhook_events', {
        params: { page, limit, search: search || undefined },
      })
      // Correctly unwrap paginated data structure
      return response.data.data
    },
  })

  // 2. Delete webhook event mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await walletApi.delete(`/api/webhook_events/${id}`)
    },
    onSuccess: () => {
      toast.success('Webhook event log deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-webhook-events'] })
      setShowDeleteConfirm(null)
      // Close inspection modal if it was open for the deleted event
      if (selectedEvent?.id === showDeleteConfirm?.id) {
        setSelectedEvent(null)
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete webhook log')
    },
  })

  const webhooks: WebhookEvent[] = data?.data || []
  const total = data?.pagination?.totalRecords || data?.pagination?.total || webhooks.length
  const totalPages = data?.pagination?.totalPages || Math.ceil(total / limit) || 1

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Payload copied to clipboard')
  }

  // Helper to color-code provider badges beautifully
  const getProviderStyle = (provider: string) => {
    const prov = provider?.toLowerCase() || ''
    if (prov === 'circle') {
      return 'bg-purple-100/60 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200/40 dark:border-purple-800/30'
    }
    if (prov === 'busha') {
      return 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/40 dark:border-amber-800/30'
    }
    if (prov === 'lenco') {
      return 'bg-blue-100/60 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/40 dark:border-blue-800/30'
    }
    if (prov === 'walapay') {
      return 'bg-pink-100/60 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 border border-pink-200/40 dark:border-pink-800/30'
    }
    return 'bg-vellum text-ink border border-graphite-hairline'
  }

  const columns: Column<WebhookEvent>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => (
        <span className={`px-2.5 py-1 text-[11px] font-normal tracking-wider rounded-full uppercase ${getProviderStyle(row.provider)}`}>
          {row.provider}
        </span>
      ),
    },
    {
      key: 'event_type',
      header: 'Event Type',
      render: (row) => (
        <span className="text-sm font-medium text-ink font-mono">
          {row.event_type}
        </span>
      ),
    },
    {
      key: 'reference_id',
      header: 'Reference ID',
      render: (row) => (
        <span className="text-xs text-slate font-mono truncate max-w-[200px] block" title={row.reference_id}>
          {row.reference_id || '—'}
        </span>
      ),
    },
    {
      key: 'attempts',
      header: 'Attempts',
      render: (row) => (
        <span className="text-sm font-mono text-ink">
          {row.attempts || 1}
        </span>
      ),
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
      header: 'Received At',
      render: (row) => (
        <span className="text-sm text-slate">
          {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy HH:mm:ss') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedEvent(row)}
            className="p-1.5 text-ash hover:text-ink hover:bg-vellum rounded-lg transition-colors cursor-pointer"
            title="Inspect payload"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowDeleteConfirm(row)}
            className="p-1.5 text-ash hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
            title="Delete log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Webhooks Audit Log">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
            Webhook Event Logs
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Audit logs of incoming notification payloads processed from third-party liquidity and settlement providers
          </p>
        </div>

        <div className="flex items-center gap-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search by Event Type, Reference, or Provider..."
            className="w-full sm:w-96"
          />
        </div>

        <DataTable
          columns={columns}
          data={webhooks}
          isLoading={isLoading}
          emptyMessage="No webhook event logs recorded"
          emptyIcon={<Webhook className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => setSelectedEvent(row)}
          rowKey={(row) => row.id}
        />
      </div>

      {/* INSPECTION DETAIL MODAL */}
      <Modal
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title="Inspect Webhook Payload"
        size="lg"
      >
        {selectedEvent && (
          <div className="space-y-5">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <span className="text-[10px] text-slate uppercase tracking-wider">Event & Status</span>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`px-2 py-0.5 text-[10px] font-normal tracking-wider rounded-full uppercase ${getProviderStyle(selectedEvent.provider)}`}>
                    {selectedEvent.provider}
                  </span>
                  <StatusBadge status={selectedEvent.status} />
                </div>
                <p className="text-xs font-semibold text-ink pt-1 font-mono">{selectedEvent.event_type}</p>
              </div>

              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <span className="text-[10px] text-slate uppercase tracking-wider">Reference Code</span>
                <p className="text-xs text-ink font-mono select-all truncate pt-1" title={selectedEvent.reference_id}>
                  {selectedEvent.reference_id || '—'}
                </p>
                <p className="text-[10px] text-slate">Attempts: {selectedEvent.attempts || 1}</p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-[9px] text-slate uppercase tracking-wider block">Received</span>
                <span className="text-[11px] font-medium text-ink block mt-0.5">
                  {selectedEvent.created_at ? format(new Date(selectedEvent.created_at), 'HH:mm:ss.SSS') : '—'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate uppercase tracking-wider block">Processed</span>
                <span className="text-[11px] font-medium text-ink block mt-0.5">
                  {selectedEvent.processed_at ? format(new Date(selectedEvent.processed_at), 'HH:mm:ss.SSS') : '—'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate uppercase tracking-wider block">Difference</span>
                <span className="text-[11px] font-medium text-green-700 dark:text-green-400 block mt-0.5">
                  {selectedEvent.processed_at && selectedEvent.created_at
                    ? `${(new Date(selectedEvent.processed_at).getTime() - new Date(selectedEvent.created_at).getTime()).toLocaleString()}ms`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Error logs if any */}
            {selectedEvent.status?.toLowerCase() === 'failed' && selectedEvent.error_details && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Processing Failures Detected</span>
                </div>
                <pre className="font-mono text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap select-all">
                  {typeof selectedEvent.error_details === 'object'
                    ? JSON.stringify(selectedEvent.error_details, null, 2)
                    : String(selectedEvent.error_details)}
                </pre>
              </div>
            )}

            {/* Webhook JSON Metadata Payload */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate">
                  <Terminal className="w-4 h-4" />
                  <span className="uppercase tracking-wider font-semibold">Metadata payload</span>
                </div>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedEvent.metadata, null, 2))}
                  className="px-2.5 py-1 text-[10px] font-normal text-ink bg-vellum hover:bg-slate/10 border border-graphite-hairline rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  Copy JSON
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-graphite-hairline bg-neutral-900 dark:bg-black/60 p-4 shadow-inner max-h-[300px] overflow-y-auto">
                <pre className="font-mono text-xs text-neutral-200 whitespace-pre-wrap select-all selection:bg-neutral-700 selection:text-white leading-relaxed">
                  {selectedEvent.metadata ? JSON.stringify(selectedEvent.metadata, null, 2) : '// No metadata payload logged.'}
                </pre>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors font-display cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE LOG ENTRY CONFIRMATION */}
      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          if (showDeleteConfirm) deleteMutation.mutate(showDeleteConfirm.id)
        }}
        title="Delete Webhook Event Log"
        message={
          <span>
            Are you sure you want to delete the logged webhook event with reference{' '}
            <strong className="font-mono">{showDeleteConfirm?.reference_id}</strong>? This will permanently delete the delivery logs and payloads from the database.
          </span>
        }
        confirmLabel="Delete Log"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  )
}
