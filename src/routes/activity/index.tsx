import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { SearchInput } from '../../components/ui/SearchInput'
import { Modal } from '../../components/ui/Modal'
import { Activity, User, Eye, Copy, Terminal, Monitor, Compass } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { APP_NAME } from '../../lib/constants'

export const Route = createFileRoute('/activity/')({
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
      { title: `Activity Logs - ${APP_NAME}` },
      { name: 'description', content: 'System audit trail' },
    ],
  }),
  component: ActivityPage,
})

interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_description: string
  metadata: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  updated_at: string
}

function ActivityPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Inspecting state
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null)

  // Fetch logged activity events using correct meta-pagination
  const { data, isLoading } = useQuery({
    queryKey: ['admin-activity-logs', page, search],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/activity-logs', {
        params: { page, limit, search: search || undefined },
      })
      // Return response.data to preserve the meta block
      return response.data
    },
  })

  const logs: ActivityLog[] = data?.data || []
  const total = data?.meta?.total || logs.length
  const totalPages = data?.meta?.last_page || Math.ceil(total / limit) || 1

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Activity metadata copied')
  }

  // Color coding action categories
  const getActionStyle = (action: string) => {
    const act = action?.toUpperCase() || ''
    if (act.includes('FAILED') || act.includes('ERROR') || act.includes('REJECTED')) {
      return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-100/40 dark:border-red-900/30'
    }
    if (act.includes('PASSED') || act.includes('COMPLETED') || act.includes('SUCCESS') || act.includes('APPROVED')) {
      return 'bg-green-100/60 dark:bg-green-950/40 text-green-800 dark:text-green-300 border border-green-200/40 dark:border-green-800/30'
    }
    if (act.includes('INITIATED') || act.includes('REQUESTED') || act.includes('PENDING')) {
      return 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/40 dark:border-amber-800/30'
    }
    return 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100/40 dark:border-purple-900/30'
  }

  const columns: Column<ActivityLog>[] = [
    {
      key: 'action',
      header: 'Action / Operation',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
            <Activity className="w-4 h-4 text-ink" />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wider rounded-md uppercase ${getActionStyle(row.action)}`}>
                {row.action?.replace(/_/g, ' ')}
              </span>
            </p>
            <p className="text-xs text-slate mt-1">
              {row.entity_description || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Scope',
      render: (row) => (
        <div>
          <span className="text-xs text-slate uppercase block tracking-wider">
            {row.entity_type}
          </span>
          <span className="text-xs font-mono font-medium text-ink block mt-0.5 truncate max-w-[120px]" title={row.entity_id || ''}>
            {row.entity_id || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'user_id',
      header: 'Actor ID',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-vellum border border-graphite-hairline rounded-full flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-ash" />
          </div>
          <span className="font-mono text-xs text-ink truncate max-w-[150px]" title={row.user_id}>
            {row.user_id}
          </span>
        </div>
      ),
    },
    {
      key: 'ip_address',
      header: 'IP Address',
      render: (row) => (
        <span className="font-mono text-xs text-slate">
          {row.ip_address || '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Timestamp',
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
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedLog(row) }}
          className="p-1.5 text-ash hover:text-ink hover:bg-vellum rounded-lg transition-colors cursor-pointer"
          title="Inspect details"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ]

  return (
    <AdminLayout title="System Activity Logs">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
            System Activity Logs
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time audit trails of transaction events, processing events, and AML screenings executed on the platform
          </p>
        </div>

        <div className="flex items-center gap-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search logs by action or description..."
            className="w-full sm:w-96"
          />
        </div>

        <DataTable
          columns={columns}
          data={logs}
          isLoading={isLoading}
          emptyMessage="No system activities recorded"
          emptyIcon={<Activity className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => setSelectedLog(row)}
          rowKey={(row) => row.id}
        />
      </div>

      {/* ACTIVITY DETAIL INSPECTOR MODAL */}
      <Modal
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title="Inspect Audit Log"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-5">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <span className="text-[10px] text-slate uppercase tracking-wider">Operation Action</span>
                <p className="text-xs pt-1">
                  <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wider rounded-md uppercase ${getActionStyle(selectedLog.action)}`}>
                    {selectedLog.action?.replace(/_/g, ' ')}
                  </span>
                </p>
                <p className="text-xs font-medium text-ink pt-2">{selectedLog.entity_description}</p>
              </div>

              <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-1">
                <span className="text-[10px] text-slate uppercase tracking-wider">Entity Association</span>
                <p className="text-xs text-slate">Type: <span className="font-semibold text-ink uppercase">{selectedLog.entity_type}</span></p>
                <p className="text-xs text-slate">
                  ID:{' '}
                  <span className="font-mono text-ink font-semibold select-all">
                    {selectedLog.entity_id || '—'}
                  </span>
                </p>
                <p className="text-[10px] text-slate">Log ID: {selectedLog.id?.slice(0, 8)}...</p>
              </div>
            </div>

            {/* Actor and Source details */}
            <div className="p-4 bg-vellum/30 border border-graphite-hairline rounded-xl space-y-3">
              <span className="text-[10px] text-slate uppercase tracking-wider block border-b border-graphite-hairline pb-1.5">
                Client Session Context
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-slate flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-ash" /> User ID:
                  </p>
                  <p className="font-mono font-medium text-ink select-all">{selectedLog.user_id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-ash" /> Source IP Address:
                  </p>
                  <p className="font-mono font-medium text-ink">{selectedLog.ip_address || 'Internal System (Automated)'}</p>
                </div>
              </div>

              {selectedLog.user_agent && (
                <div className="pt-2 border-t border-graphite-hairline space-y-1 text-xs">
                  <p className="text-slate flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-ash" /> Client Browser / User Agent:
                  </p>
                  <p className="text-slate leading-relaxed bg-vellum/45 p-2 rounded-lg font-mono text-[10px] break-all">
                    {selectedLog.user_agent}
                  </p>
                </div>
              )}
            </div>

            {/* Webhook JSON Metadata Payload */}
            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate">
                    <Terminal className="w-4 h-4" />
                    <span className="uppercase tracking-wider font-semibold">Activity Metadata Payload</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedLog.metadata, null, 2))}
                    className="px-2.5 py-1 text-[10px] font-normal text-ink bg-vellum hover:bg-slate/10 border border-graphite-hairline rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Payload
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden border border-graphite-hairline bg-neutral-900 dark:bg-black/60 p-4 shadow-inner max-h-[220px] overflow-y-auto">
                  <pre className="font-mono text-xs text-neutral-200 whitespace-pre-wrap select-all selection:bg-neutral-700 selection:text-white leading-relaxed">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Time Recorded */}
            <div className="text-[10px] text-slate text-right">
              Recorded at: {format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss.SSS')}
            </div>

            {/* Buttons */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors font-display cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  )
}
