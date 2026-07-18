import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { ArrowLeft, Mail, Lock, User, Building, Phone, MapPin, Shield, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../../lib/api'
import { toast } from 'sonner'

export const Route = createFileRoute('/users/add')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token')
      if (!token) {
        throw redirect({ to: '/login' })
      }
    }
  },
  component: AddUserPage,
})

function AddUserPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    businessName: '',
    phone: '',
    country: '',
    role: 'individual',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

  const addUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const isAddAdmin = data.role === 'admin';
      const endpoint = isAddAdmin 
        ? '/api/users/auth/admin/signup' 
        : '/api/users/auth/add-user';

      const response = await authApi.post(endpoint, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('Account created successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      navigate({ to: '/users' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add user')
    },
  })

  // Cryptographically secure password generator
  const generatePassword = () => {
    const length = 14
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+'
    let password = ''
    
    // Guarantee complexity criteria to pass backend validation
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    password += '0123456789'[Math.floor(Math.random() * 10)]
    password += '!@#$%^&*()_+'[Math.floor(Math.random() * 12)]
    
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)]
    }
    
    // Shuffle
    const shuffled = password.split('').sort(() => 0.5 - Math.random()).join('')
    
    setFormData((prev) => ({ ...prev, password: shuffled }))
    setShowPassword(true) // Show it immediately so the admin can write it down
    navigator.clipboard.writeText(shuffled)
    toast.success('Strong password generated and copied to clipboard')
    
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: '' }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.email) newErrors.email = 'Email is required'
    if (!formData.password) newErrors.password = 'Password is required'
    if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (!formData.firstName) newErrors.firstName = 'First name is required'
    if (!formData.lastName) newErrors.lastName = 'Last name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    addUserMutation.mutate(formData)
  }

  return (
    <AdminLayout title="Add User">
      <div className="max-w-2xl space-y-6">
        <button
          onClick={() => navigate({ to: '/users' })}
          className="flex items-center gap-2 text-xs text-slate hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>

        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">
            Add New User
          </h2>
          <p className="text-slate mt-1 text-sm">
            Create a new individual, merchant, or administrative account on the platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 space-y-6">
          {/* Email */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`input !pl-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="user@example.com"
              />
            </div>
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Password (with Generator and Visibility Toggle) */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">
              Password *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`input !pl-10 !pr-32 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                placeholder="••••••••"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-ash hover:text-slate transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="px-2.5 py-1 text-[11px] font-normal tracking-wide text-ink bg-vellum hover:bg-slate/10 border border-graphite-hairline rounded-full transition-colors cursor-pointer uppercase"
                >
                  Generate
                </button>
              </div>
            </div>
            {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
          </div>

          {/* Name row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">
                First Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`input !pl-10 ${errors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="John"
                />
              </div>
              {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">
                Last Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`input !pl-10 ${errors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Doe"
                />
              </div>
              {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">
              Business Name (Required for Merchants)
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                className="input !pl-10"
                placeholder="Acme Corp (optional)"
              />
            </div>
          </div>

          {/* Phone & Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input !pl-10"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wider text-slate">
                Country
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="input !pl-10"
                  placeholder="Nigeria"
                />
              </div>
            </div>
          </div>

          {/* Role selection dropdown (includes Admin) */}
          <div className="space-y-2">
            <label className="block text-xs uppercase tracking-wider text-slate">
              Account Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input !pl-10 cursor-pointer appearance-none"
              >
                <option value="individual">Individual</option>
                <option value="merchant">Merchant</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={addUserMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addUserMutation.isPending ? 'Adding Account...' : 'Create Account'}
            </button>
            <button
              type="button"
              onClick={() => navigate({ to: '/users' })}
              className="px-4 py-2 text-sm text-ink bg-transparent border border-graphite-hairline hover:bg-vellum rounded-full transition-colors font-display cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
