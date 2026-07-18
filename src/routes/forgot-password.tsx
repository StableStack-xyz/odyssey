import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Mail, ArrowLeft, Send } from 'lucide-react'
import { authApi } from '../lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [
      { title: 'Forgot Password - StableStack Admin' },
    ],
  }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const requestResetMutation = useMutation({
    mutationFn: async (emailStr: string) => {
      const response = await authApi.post('/password-reset-request', { email: emailStr })
      return response.data
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Verification email sent successfully')
      setSubmitted(true)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to request password reset')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Email is required')
      return
    }
    requestResetMutation.mutate(email.trim().toLowerCase())
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-paper transition-colors duration-200">
      {/* Top cream notice ribbon */}
      <div className="w-full bg-cream-notice py-2.5 px-4 text-center border-b border-graphite-hairline">
        <p className="text-xs tracking-wider text-[#171717] font-display">
          STABLESTACK CONTROL PANEL • PASSWORD RECOVERY
        </p>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px] space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img src="/logo.svg?v=2" alt="StableStack" className="h-12 dark:hidden" />
              <img src="/logo-dark.svg?v=2" alt="StableStack" className="h-12 hidden dark:block" />
            </div>
            <h1 className="font-display text-[28px] tracking-tight text-ink leading-tight">
              Reset Password
            </h1>
            <p className="text-slate text-xs max-w-sm mx-auto leading-relaxed">
              Enter your administrative email address below to request a secure password recovery token
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs uppercase tracking-wider text-slate">
                  Administrative Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 text-sm bg-vellum border border-graphite-hairline rounded-[8px] text-ink focus:outline-none focus:border-ink placeholder-ash transition-all"
                    placeholder="name@stablestack.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={requestResetMutation.isPending}
                className="w-full h-11 bg-ink text-paper rounded-full text-sm font-display hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {requestResetMutation.isPending ? 'Requesting...' : 'Request Reset Link'}
              </button>
            </form>
          ) : (
            <div className="p-6 bg-vellum/45 border border-graphite-hairline rounded-xl space-y-4 text-center">
              <p className="text-sm text-ink leading-relaxed">
                An email containing a secure password reset token has been dispatched to{' '}
                <strong className="font-mono text-xs">{email}</strong>. Please check your inbox and follow the instructions within 10 minutes.
              </p>
              <button
                onClick={() => navigate({ to: '/reset-password' })}
                className="btn-primary cursor-pointer w-full text-center text-xs py-2.5 rounded-full"
              >
                Enter Reset Token
              </button>
            </div>
          )}

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="py-4 text-center border-t border-graphite-hairline">
        <p className="text-[10px] uppercase tracking-widest text-ash">
          © 2026 StableStack Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}
