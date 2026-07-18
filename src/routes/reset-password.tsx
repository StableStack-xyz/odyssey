import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Key, Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react'
import { authApi } from '../lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [
      { title: 'Reset Password - StableStack Admin' },
    ],
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  
  // Safe parsing of search params
  const search = useSearch({ strict: false }) as Record<string, string>
  const urlToken = search?.token || ''

  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (urlToken) {
      setToken(urlToken)
    }
  }, [urlToken])

  const resetPasswordMutation = useMutation({
    mutationFn: async (body: any) => {
      const response = await authApi.put('/reset-password', body)
      return response.data
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Password reset successful!')
      setSubmitted(true)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please check your token.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!token.trim()) {
      toast.error('Reset token is required')
      return
    }

    if (!password) {
      toast.error('New password is required')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    // Backend regex validation: at least 1 letter, 1 number, 1 special character
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
    if (!passwordRegex.test(password)) {
      toast.error('Password must contain at least one letter, one number, and one special character (@$!%*#?&)')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    resetPasswordMutation.mutate({
      token: token.trim(),
      password,
    })
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
              Create New Password
            </h1>
            <p className="text-slate text-xs max-w-sm mx-auto leading-relaxed">
              Enter your recovery token and define a highly secure new administrative password
            </p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Token Input */}
              <div className="space-y-2">
                <label htmlFor="token" className="block text-xs uppercase tracking-wider text-slate">
                  Recovery Token *
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                  <input
                    id="token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 text-sm bg-vellum border border-graphite-hairline rounded-[8px] text-ink focus:outline-none focus:border-ink placeholder-ash transition-all font-mono"
                    placeholder="Enter reset token from email"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-xs uppercase tracking-wider text-slate">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-12 text-sm bg-vellum border border-graphite-hairline rounded-[8px] text-ink focus:outline-none focus:border-ink placeholder-ash transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ash hover:text-slate transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-wider text-slate">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 pl-10 pr-12 text-sm bg-vellum border border-graphite-hairline rounded-[8px] text-ink focus:outline-none focus:border-ink placeholder-ash transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={resetPasswordMutation.isPending}
                className="w-full h-11 bg-ink text-paper rounded-full text-sm font-display hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetPasswordMutation.isPending ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          ) : (
            <div className="p-6 bg-vellum/45 border border-graphite-hairline rounded-xl space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <p className="text-sm font-medium text-ink leading-relaxed">
                Your administrative password has been securely updated!
              </p>
              <button
                onClick={() => navigate({ to: '/login' })}
                className="btn-primary cursor-pointer w-full text-center text-sm py-2.5 rounded-full"
              >
                Sign In Now
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
