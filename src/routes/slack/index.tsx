import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { MessageSquare, Send, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react'
import { walletApi } from '../../lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/slack/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: SlackPage,
})

function SlackPage() {
  const [message, setMessage] = useState('')
  const [channel, setChannel] = useState('')

  const { data: slackStatus, isLoading } = useQuery({
    queryKey: ['slack-status'],
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/slack/status')
      return response.data.data
    },
  })

  const sendNotificationMutation = useMutation({
    mutationFn: async (data: { message: string; channel?: string }) => {
      const response = await walletApi.post('/api/admin/slack/notify', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Notification sent to Slack')
      setMessage('')
    },
    onError: () => {
      toast.error('Failed to send notification')
    },
  })

  const testTransactionMutation = useMutation({
    mutationFn: async () => {
      const response = await walletApi.post('/api/admin/slack/test-transaction')
      return response.data
    },
    onSuccess: () => {
      toast.success('Test transaction notification sent')
    },
    onError: () => {
      toast.error('Failed to send test transaction')
    },
  })

  const testErrorMutation = useMutation({
    mutationFn: async () => {
      const response = await walletApi.post('/api/admin/slack/test-error')
      return response.data
    },
    onSuccess: () => {
      toast.success('Test error notification sent')
    },
    onError: () => {
      toast.error('Failed to send test error')
    },
  })

  return (
    <AdminLayout title="Slack Integration">
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
            Slack Integration
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage Slack notifications and test connectivity
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white dark:bg-dark-container rounded-2xl p-6 border border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  Slack Status
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Integration status and connectivity
                </p>
              </div>
            </div>
            <StatusBadge status={slackStatus?.connected ? 'Connected' : 'Disconnected'} />
          </div>

          {isLoading ? (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
              Checking status...
            </div>
          ) : slackStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-gray-50 dark:bg-dark-input rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workspace</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {slackStatus.workspace || '—'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-dark-input rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Channel</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {slackStatus.channel || '—'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-dark-input rounded-xl">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Check</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                  {slackStatus.last_check ? new Date(slackStatus.last_check).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No Slack integration configured
            </p>
          )}
        </div>

        {/* Send Notification */}
        <div className="bg-white dark:bg-dark-container rounded-2xl p-6 border border-gray-200 dark:border-dark-border">
          <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Send Test Notification
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter notification message..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-accent-500 dark:focus:border-dark-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Channel (optional)
              </label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="#general"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-input border border-gray-200 dark:border-dark-border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-accent-500 dark:focus:border-dark-primary transition-colors"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => sendNotificationMutation.mutate({ message, channel: channel || undefined })}
                disabled={!message || sendNotificationMutation.isPending}
                className="btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {sendNotificationMutation.isPending ? 'Sending...' : 'Send Notification'}
              </button>
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-dark-container rounded-2xl p-6 border border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  Test Transaction
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Send a test transaction notification
                </p>
              </div>
            </div>
            <button
              onClick={() => testTransactionMutation.mutate()}
              disabled={testTransactionMutation.isPending}
              className="btn-press w-full py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testTransactionMutation.isPending ? 'Sending...' : 'Send Test Transaction'}
            </button>
          </div>

          <div className="bg-white dark:bg-dark-container rounded-2xl p-6 border border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-gray-900 dark:text-white">
                  Test Error
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Send a test error notification
                </p>
              </div>
            </div>
            <button
              onClick={() => testErrorMutation.mutate()}
              disabled={testErrorMutation.isPending}
              className="btn-press w-full py-2.5 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testErrorMutation.isPending ? 'Sending...' : 'Send Test Error'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
