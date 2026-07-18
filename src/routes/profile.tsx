import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { AdminLayout } from '../components/layout/AdminLayout'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../lib/api'
import { toast } from 'sonner'
import { User, Mail, Shield, ShieldCheck, Key } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/profile')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: ProfilePage,
})

function ProfilePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [resetSent, setResetSent] = useState(false)

  const requestResetMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('No user email found')
      const response = await authApi.post('/password-reset-request', { email: user.email })
      return response.data
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Verification token sent successfully!')
      setResetSent(true)
      
      // Delay logout and redirect slightly so the admin can read the toast/info box
      setTimeout(() => {
        logout()
        navigate({ to: '/reset-password' })
      }, 6000)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to trigger password reset')
    },
  })

  const handleTriggerReset = () => {
    if (confirm('Are you sure you want to trigger a password reset? You will be signed out of this session immediately to complete the security flow.')) {
      requestResetMutation.mutate()
    }
  }

  return (
    <AdminLayout title="My Profile">
      <div className="max-w-2xl space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">
            My Administrator Profile
          </h2>
          <p className="text-slate mt-1 text-sm">
            View your administrative credentials and manage account security settings
          </p>
        </div>

        {/* User Card */}
        <div className="bg-vellum border border-graphite-hairline rounded-2xl p-6 shadow-xl-3 flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#d65a84] to-[#3e1e68] rounded-2xl flex items-center justify-center shadow-xl-3">
            <span className="text-xl font-bold text-white uppercase">
              {user?.firstName?.[0] || 'A'}
              {user?.lastName?.[0] || 'D'}
            </span>
          </div>
          <div>
            <h2 className="font-display text-xl text-ink leading-tight">
              {user?.firstName || 'System'} {user?.lastName || 'Admin'}
            </h2>
            <p className="text-slate text-xs mt-1 uppercase tracking-wider">
              {user?.role || 'Administrator'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Metadata */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 space-y-4">
            <h3 className="font-display text-lg text-ink">
              Profile Details
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 py-1">
                <User className="w-4 h-4 text-ash" />
                <span className="text-sm text-ink">{user?.firstName} {user?.lastName}</span>
              </div>
              <div className="flex items-center gap-3 py-1">
                <Mail className="w-4 h-4 text-ash" />
                <span className="text-sm text-ink">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 py-1">
                <Shield className="w-4 h-4 text-ash" />
                <span className="text-sm text-ink capitalize">{user?.role || 'Admin'} Panel Access</span>
              </div>
            </div>
          </div>

          {/* Security Management */}
          <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 space-y-4">
            <h3 className="font-display text-lg text-ink">
              Security Settings
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <span className="text-xs text-green-700 bg-green-500/10 px-2.5 py-0.5 rounded-full font-medium">Session Secure</span>
              </div>
              
              <p className="text-xs text-slate leading-relaxed">
                For security reasons, changing your password requires generating a recovery token sent directly to your administrative inbox.
              </p>

              {!resetSent ? (
                <button
                  onClick={handleTriggerReset}
                  disabled={requestResetMutation.isPending}
                  className="px-4 py-2 text-xs font-normal text-ink bg-vellum border border-graphite-hairline hover:bg-slate/10 rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Key className="w-4 h-4" />
                  {requestResetMutation.isPending ? 'Initiating Security Flow...' : 'Trigger Password Reset'}
                </button>
              ) : (
                <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl space-y-1">
                  <p className="text-xs text-green-700 font-semibold">Verification Email Sent!</p>
                  <p className="text-[10px] text-slate">Signing out in a few seconds... Please check your inbox for the token.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
