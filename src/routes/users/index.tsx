import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { FilterDropdown } from '../../components/ui/FilterDropdown'
import { Users as UsersIcon, UserPlus, Eye } from 'lucide-react'
import { baseApi } from '../../lib/api'
import { format } from 'date-fns'

export const Route = createFileRoute('/users/')({
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
      { title: 'Users - StableStack Admin' },
      { name: 'description', content: 'Manage platform users' },
    ],
  }),
  component: UsersPage,
})

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  businessName?: string
  role: string
  is_admin: boolean
  is_blocked: boolean
  isAccountVerified: boolean
  complianceStatus: string
  created_at: string
}

function UsersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('All')
  const [complianceFilter, setComplianceFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('')
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, complianceFilter, countryFilter],
    queryFn: async () => {
      const response = await baseApi.get('/api/users/filter', {
        params: {
          page,
          limit,
          searchQuery: search || undefined,
          complianceStatus: complianceFilter,
          country: countryFilter || undefined,
        },
      })
      return response.data.data
    },
  })

  const rawUsers = data?.users || []
  const users = rawUsers.filter((user: any) => {
    if (roleFilter === 'All') return true
    return user.role?.toLowerCase() === roleFilter.toLowerCase()
  })
  const total = data?.totalUsers || users.length
  const totalPages = data ? Math.ceil(data.totalUsers / limit) : 1

  const roleOptions = ['All', 'Individual', 'Merchant', 'Admin']

  const getInitials = (user: User) => {
    if (user.businessName) {
      const words = user.businessName.trim().split(/\s+/)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return user.businessName.slice(0, 2).toUpperCase()
    }
    const first = user.first_name?.[0] || ''
    const last = user.last_name?.[0] || ''
    return (first + last).toUpperCase() || 'U'
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-vellum border border-graphite-hairline rounded-xl flex items-center justify-center">
            <span className="text-xs font-bold text-ink uppercase">
              {getInitials(row)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-ink uppercase">
              {row.first_name || row.businessName} {row.last_name || ''}
            </p>
            {row.businessName && row.first_name && (
              <p className="text-xs text-slate uppercase">{row.businessName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (row) => <span className="text-sm text-gray-600 dark:text-gray-300">{row.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className="text-sm capitalize text-gray-600 dark:text-gray-300">{row.role}</span>
      ),
    },
    {
      key: 'complianceStatus',
      header: 'Compliance',
      render: (row) => <StatusBadge status={row.complianceStatus} />,
    },
    {
      key: 'is_blocked',
      header: 'Status',
      render: (row) => (
        <StatusBadge status={row.is_blocked ? 'Blocked' : 'Active'} />
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (row) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate({ to: `/users/$userId`, params: { userId: row.id } })
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg transition-colors"
        >
          <Eye className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
        </button>
      ),
    },
  ]

  return (
    <AdminLayout title="Users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">
              Users
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage platform users and their compliance status
            </p>
          </div>
          <button
            onClick={() => navigate({ to: '/users/add' })}
            className="btn-primary flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            placeholder="Search users..."
            className="w-80 max-sm:w-full"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {roleOptions.map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role)
                  setPage(1)
                }}
                className={`px-3 py-1.5 text-xs font-normal rounded-full transition-colors cursor-pointer ${
                  roleFilter === role
                    ? 'bg-ink text-paper'
                    : 'bg-vellum text-slate hover:bg-slate/10'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
          <FilterDropdown
            fields={[
              {
                key: 'compliance',
                label: 'Compliance Status',
                type: 'select',
                value: complianceFilter,
                onChange: (v) => { setComplianceFilter(v); setPage(1) },
                options: [
                  { label: 'All Compliance', value: 'all' },
                  { label: 'Pending', value: 'Pending' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'Rejected', value: 'Rejected' },
                  { label: 'Not Submitted', value: 'NotSubmitted' },
                ],
              },
              {
                key: 'country',
                label: 'Country',
                type: 'text',
                value: countryFilter,
                onChange: (v) => { setCountryFilter(v); setPage(1) },
                placeholder: 'Filter by country...',
              },
            ]}
          />
        </div>

        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          emptyMessage="No users found"
          emptyIcon={<UsersIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate({ to: `/users/$userId`, params: { userId: row.id } })}
          rowKey={(row) => row.id}
        />
      </div>
    </AdminLayout>
  )
}
