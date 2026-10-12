import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient, useIsFetching } from '@tanstack/react-query'
import { AdminLayout } from '../../components/layout/AdminLayout'
import { DataTable } from '../../components/ui/DataTable'
import type { Column } from '../../components/ui/DataTable'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { SearchInput } from '../../components/ui/SearchInput'
import { FilterDropdown } from '../../components/ui/FilterDropdown'
import { Modal } from '../../components/ui/Modal'
import { PermissionGate } from '../../components/auth/PermissionGate'
import {
  Users as UsersIcon,
  UserPlus,
  Eye,
  RefreshCw,
  Download,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react'
import { baseApi, getErrorMessage } from '../../lib/api'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { APP_NAME } from '../../lib/constants'

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
      { title: `Users - ${APP_NAME}` },
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
  const queryClient = useQueryClient()
  const isFetching = useIsFetching() > 0
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('All')
  const [complianceFilter, setComplianceFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('')
  const limit = 20

  // Export states
  const [isExporting, setIsExporting] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [modalRole, setModalRole] = useState('All')
  const [modalCompliance, setModalCompliance] = useState('all')
  const [modalStatus, setModalStatus] = useState('all')
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    if (roleFilter !== 'All' && user.role?.toLowerCase() !== roleFilter.toLowerCase()) {
      return false
    }
    if (statusFilter === 'active' && user.is_blocked) {
      return false
    }
    if (statusFilter === 'blocked' && !user.is_blocked) {
      return false
    }
    return true
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

  const exportUsersToCsv = async (filters: {
    role: string
    compliance: string
    status: string
  }) => {
    if (isExporting) return

    setIsExporting(true)
    const toastId = toast.loading('Preparing users CSV export...')

    try {
      const pageSize = 100
      const apiParams: Record<string, any> = {
        page: 1,
        limit: pageSize,
        complianceStatus: filters.compliance,
      }
      if (search) apiParams.searchQuery = search
      if (countryFilter) apiParams.country = countryFilter

      // Step 1: Fetch first batch and determine total records
      const firstRes = await baseApi.get('/api/users/filter', { params: apiParams })
      const firstBatch = firstRes.data?.data?.users || []
      const totalUsersCount = firstRes.data?.data?.totalUsers ?? firstBatch.length
      let allUsers: any[] = [...firstBatch]

      // Step 2: Fetch remaining pages concurrently in batches
      const totalPagesCount = Math.ceil(totalUsersCount / pageSize)
      if (totalPagesCount > 1) {
        const remainingPages = Array.from({ length: totalPagesCount - 1 }, (_, i) => i + 2)
        const batchSize = 5

        for (let i = 0; i < remainingPages.length; i += batchSize) {
          const pageBatch = remainingPages.slice(i, i + batchSize)
          const results = await Promise.all(
            pageBatch.map((p) =>
              baseApi.get('/api/users/filter', {
                params: {
                  ...apiParams,
                  page: p,
                  limit: pageSize,
                },
              })
            )
          )
          for (const res of results) {
            const pageUsers = res.data?.data?.users || []
            allUsers.push(...pageUsers)
          }
        }
      }

      // Step 3: Apply filter criteria (Role, Compliance, Status)
      const filtered = allUsers.filter((u: any) => {
        // Role filter
        if (filters.role !== 'All' && u.role?.toLowerCase() !== filters.role.toLowerCase()) {
          return false
        }
        // Compliance filter
        if (
          filters.compliance !== 'all' &&
          u.complianceStatus?.toLowerCase() !== filters.compliance.toLowerCase()
        ) {
          return false
        }
        // Status filter (Active vs Blocked)
        if (filters.status === 'active' && u.is_blocked) {
          return false
        }
        if (filters.status === 'blocked' && !u.is_blocked) {
          return false
        }
        return true
      })

      if (filtered.length === 0) {
        toast.error('No users found matching the selected filters', { id: toastId })
        return
      }

      // Step 4: Build CSV rows (only requested fields)
      const headers = [
        'Business Name',
        'Email',
        'Date Joined',
        'Compliance Status',
        'Account Status',
        'Account Verified',
      ]

      const escapeCsv = (val: unknown): string => {
        if (val === null || val === undefined) return '""'
        let str = String(val)
        // Prevent formula injection in spreadsheet applications (=, +, -, @)
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'${str}`
        }
        return `"${str.replace(/"/g, '""')}"`
      }

      const formatDateSafe = (dateStr?: string): string => {
        if (!dateStr) return ''
        try {
          const d = new Date(dateStr)
          return isNaN(d.getTime()) ? dateStr : format(d, 'yyyy-MM-dd HH:mm:ss')
        } catch {
          return dateStr
        }
      }

      const rows = filtered.map((u: any) => [
        escapeCsv(u.businessName || u.business_name || ''),
        escapeCsv(u.email || ''),
        escapeCsv(formatDateSafe(u.created_at)),
        escapeCsv(u.complianceStatus || u.compliance_status || ''),
        escapeCsv(u.is_blocked ? 'Blocked' : 'Active'),
        escapeCsv((u.isAccountVerified ?? u.is_account_verified) ? 'Yes' : 'No'),
      ])

      const csvContent = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join('\r\n')

      // Step 5: Trigger browser download with UTF-8 BOM
      const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
      const roleTag = filters.role !== 'All' ? `-${filters.role.toLowerCase()}` : ''
      const compTag = filters.compliance !== 'all' ? `-${filters.compliance.toLowerCase()}` : ''
      const statusTag = filters.status !== 'all' ? `-${filters.status.toLowerCase()}` : ''
      const filename = `users${roleTag}${compTag}${statusTag}-${timestamp}.csv`

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(
        `Successfully exported ${filtered.length} user${filtered.length === 1 ? '' : 's'} to CSV`,
        { id: toastId }
      )
    } catch (error) {
      toast.error(getErrorMessage(error) || 'Failed to export users to CSV', { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const handleQuickExport = () => {
    setExportMenuOpen(false)
    exportUsersToCsv({
      role: roleFilter,
      compliance: complianceFilter,
      status: statusFilter,
    })
  }

  const handleExportAll = () => {
    setExportMenuOpen(false)
    exportUsersToCsv({
      role: 'All',
      compliance: 'all',
      status: 'all',
    })
  }

  const handleOpenExportModal = () => {
    setModalRole(roleFilter)
    setModalCompliance(complianceFilter)
    setModalStatus(statusFilter)
    setExportMenuOpen(false)
    setIsExportModalOpen(true)
  }

  const handleModalExportSubmit = async () => {
    setIsExportModalOpen(false)
    await exportUsersToCsv({
      role: modalRole,
      compliance: modalCompliance,
      status: modalStatus,
    })
  }

  const [exportingUserId, setExportingUserId] = useState<string | null>(null)

  const exportSingleUserRow = async (u: User) => {
    if (exportingUserId) return
    setExportingUserId(u.id)
    const toastId = toast.loading(`Preparing export for ${u.businessName || u.first_name || u.email}...`)

    try {
      let detailData: any = u
      try {
        const res = await baseApi.get(`/api/users/${u.id}`)
        if (res.data?.data) {
          detailData = res.data.data
        }
      } catch {
        // Fallback to table row data
      }

      const profile = detailData.user_profile || detailData
      const merchant = detailData.merchant_details || {}

      const escapeCsv = (val: unknown): string => {
        if (val === null || val === undefined) return '""'
        let str = String(val)
        if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`
        return `"${str.replace(/"/g, '""')}"`
      }

      const formatDateSafe = (dateStr?: string | null): string => {
        if (!dateStr) return ''
        try {
          const d = new Date(dateStr)
          return isNaN(d.getTime()) ? dateStr : format(d, 'yyyy-MM-dd HH:mm:ss')
        } catch {
          return dateStr
        }
      }

      const documents = detailData.userDocuments || []

      const sections: string[] = []

      // Section 1: Overview
      sections.push('--- USER OVERVIEW ---')
      sections.push(['Field', 'Value'].map(escapeCsv).join(','))
      const overviewFields: [string, string][] = [
        ['Business Name', u.businessName || merchant.business_name || profile.business_name || ''],
        ['Email', profile.email || u.email || ''],
        ['Email Verified', profile.is_email_verified ? 'Yes' : 'No'],
        ['Phone', profile.phone || ''],
        ['Phone Verified', profile.is_phone_verified ? 'Yes' : 'No'],
        ['Role', profile.role || u.role || ''],
        ['Account Status', profile.status || (u.is_blocked || profile.is_blocked ? 'Blocked' : 'Active')],
        ['Is Active', profile.is_active ? 'Yes' : 'No'],
        ['Is Blocked', (u.is_blocked || profile.is_blocked) ? 'Yes' : 'No'],
        ['Compliance Status', profile.compliance_status || u.complianceStatus || ''],
        ['Account Verified', (u.isAccountVerified ?? profile.is_account_verified) ? 'Yes' : 'No'],
        ['Country', profile.country_code || merchant.country || ''],
        ['Currency', profile.currency || merchant.currency || ''],
        ['Birth Date', profile.birth_date || ''],
        ['Date Joined', formatDateSafe(profile.created_at || u.created_at)],
        ['Last Login', formatDateSafe(profile.last_login_at)],
        ['Tax Identification Number', profile.tax_identification_number || ''],
        ['Tax Verified', profile.is_tax_verified ? 'Yes' : 'No'],
        ['Onboarding Reference', profile.onboarding_reference || ''],
      ]
      for (const [f, v] of overviewFields) {
        sections.push([escapeCsv(f), escapeCsv(v)].join(','))
      }

      // Section 2: Merchant Details
      if (merchant && Object.keys(merchant).length > 0) {
        sections.push('')
        sections.push('--- MERCHANT DETAILS ---')
        sections.push(['Field', 'Value'].map(escapeCsv).join(','))
        const regAddr = merchant.addresses?.registered_address
        const mailAddr = merchant.addresses?.mailing_address
        const fullRegAddress = [regAddr?.street1, regAddr?.street2].filter(Boolean).join(', ')
        const fullMailAddress = [mailAddr?.street1, mailAddr?.street2].filter(Boolean).join(', ')

        const merchantFields: [string, string][] = [
          ['Business Name', merchant.business_name || ''],
          ['Registration Number', merchant.registration_number || ''],
          ['Registration Verified', merchant.is_registration_number_verified ? 'Yes' : 'No'],
          ['Tax Identification Number', merchant.tax_identification_number || ''],
          ['Tax Verified', merchant.is_tax_verified ? 'Yes' : 'No'],
          ['Business Type', merchant.business_type || ''],
          ['Business Model', merchant.business_model || ''],
          ['Industry', merchant.industry || ''],
          ['Nature of Business', merchant.nature_of_business || ''],
          ['Website', merchant.business_website || ''],
          ['Phone', merchant.phone || ''],
          ['Currency', merchant.currency || ''],
          ['Country', merchant.country || ''],
          ['Legal Structure', merchant.legal_structure || ''],
          ['Formation Country', merchant.formation_country || ''],
          ['Formation Date', merchant.formation_date ? formatDateSafe(merchant.formation_date) : ''],
          ['Source of Funds', merchant.source_of_funds || ''],
          ['Expected Monthly Transactions', merchant.expected_monthly_transactions || ''],
          ['Expected Monthly Volume', merchant.expected_monthly_volume || ''],
          ['Registered Street Address', fullRegAddress || ''],
          ['Registered City', regAddr?.city || ''],
          ['Registered State', regAddr?.state || ''],
          ['Registered Postal Code', regAddr?.postal_code || ''],
          ['Registered Country', regAddr?.country || ''],
        ]

        if (mailAddr) {
          merchantFields.push(
            ['Mailing Street Address', fullMailAddress || ''],
            ['Mailing City', mailAddr.city || ''],
            ['Mailing State', mailAddr.state || ''],
            ['Mailing Postal Code', mailAddr.postal_code || ''],
            ['Mailing Country', mailAddr.country || '']
          )
        }

        if (merchant.business_bank_account) {
          merchantFields.push(
            ['Business Bank Name', merchant.business_bank_account.bank_name || ''],
            ['Business Bank Account Name', merchant.business_bank_account.account_name || ''],
            ['Business Bank Account Number', merchant.business_bank_account.account_number || ''],
            ['Business Bank Branch Address', merchant.business_bank_account.branch_address || '']
          )
        }

        for (const [f, v] of merchantFields) {
          sections.push([escapeCsv(f), escapeCsv(v)].join(','))
        }

        // Contact Person
        if (merchant.contact_person) {
          sections.push('')
          sections.push('--- CONTACT PERSON ---')
          sections.push(['Field', 'Value'].map(escapeCsv).join(','))
          const contactFields: [string, string][] = [
            ['Name', merchant.contact_person.full_name || ''],
            ['Email', merchant.contact_person.email || ''],
            ['Phone', merchant.contact_person.phone || ''],
            ['Job Title', merchant.contact_person.job_title || ''],
            ['ID Type', merchant.contact_person.id_type || ''],
            ['ID Number', merchant.contact_person.id_number || ''],
            ['BVN', merchant.contact_person.bvn || ''],
            ['BVN Verified', merchant.contact_person.is_bvn_verified ? 'Yes' : 'No'],
          ]
          for (const [f, v] of contactFields) {
            sections.push([escapeCsv(f), escapeCsv(v)].join(','))
          }
        }

        // Financial Profile
        sections.push('')
        sections.push('--- FINANCIAL PROFILE ---')
        sections.push(['Field', 'Value'].map(escapeCsv).join(','))
        const financialFields: [string, string][] = [
          ['Total Investable Assets', merchant.total_investable_assets || ''],
          ['Estimated Fiat Balance', merchant.estimated_fiat_balance || ''],
          ['Digital Assets', (merchant.digital_assets || []).join('; ')],
          ['Estimated Non-Fiat Balance', merchant.estimated_non_fiat_balance || ''],
          ['Expected Monthly Non-Fiat Transactions', merchant.expected_monthly_non_fiat_transactions || ''],
        ]
        for (const [f, v] of financialFields) {
          sections.push([escapeCsv(f), escapeCsv(v)].join(','))
        }

        // Regulation & AML
        sections.push('')
        sections.push('--- REGULATION & AML ---')
        sections.push(['Field', 'Value'].map(escapeCsv).join(','))
        const regAmlFields: [string, string][] = [
          ['Regulated', merchant.is_regulated ? 'Yes' : 'No'],
          ['Regulation Type', merchant.regulation_type || ''],
          ['Regulatory Number', merchant.regulatory_number || ''],
          ['Issuing Entity', merchant.issuing_entity || ''],
          ['Regulated Activities', (merchant.regulated_activities || []).join('; ')],
          ['Operating Countries', (merchant.operating_countries || []).join('; ')],
          ['Transaction Countries', (merchant.transaction_countries || []).join('; ')],
          ['AML Policy URL', merchant.policies?.aml_policy || ''],
          ['KYC Policy URL', merchant.policies?.kyc_policy || ''],
          ['Data Protection Policy URL', merchant.policies?.data_protection_policy || ''],
        ]
        for (const [f, v] of regAmlFields) {
          sections.push([escapeCsv(f), escapeCsv(v)].join(','))
        }

        // Business Owners
        if (merchant.business_owners && merchant.business_owners.length > 0) {
          sections.push('')
          sections.push(`--- BUSINESS OWNERS (${merchant.business_owners.length}) ---`)
          sections.push([
            '#',
            'Full Name',
            'Email',
            'Phone',
            'Title',
            'Ownership %',
            'Gender',
            'Date of Birth',
            'Nationality',
            'ID Number',
            'Tax ID',
            'Relationship Date',
            'Is Signer',
            'Is Control Person',
            'Is Beneficial Owner',
            'Street 1',
            'Street 2',
            'City',
            'State',
            'Postal Code',
            'Country',
            'Front ID URL',
            'Back ID URL',
            'Supporting Documents',
          ].map(escapeCsv).join(','))

          merchant.business_owners.forEach((owner: any, idx: number) => {
            const ownerDocs = (owner.supporting_document || [])
              .map((d: any) => [d.doc_type, d.sub_type ? `(${d.sub_type})` : '', d.doc_image].filter(Boolean).join(' '))
              .join('; ')

            sections.push([
              escapeCsv(String(idx + 1)),
              escapeCsv([owner.firstName, owner.lastName].filter(Boolean).join(' ')),
              escapeCsv(owner.email || ''),
              escapeCsv(owner.phone_number || ''),
              escapeCsv(owner.title || ''),
              escapeCsv(owner.ownership_percentage != null ? `${owner.ownership_percentage}%` : ''),
              escapeCsv(owner.gender || ''),
              escapeCsv(owner.dob || ''),
              escapeCsv(owner.nationality || ''),
              escapeCsv(owner.id_number || ''),
              escapeCsv(owner.tax_identification_number || ''),
              escapeCsv(owner.relationship_establishment_date || ''),
              escapeCsv(owner.is_signer ? 'Yes' : 'No'),
              escapeCsv(owner.is_control_person ? 'Yes' : 'No'),
              escapeCsv(owner.is_beneficial_owner ? 'Yes' : 'No'),
              escapeCsv(owner.address?.street1 || ''),
              escapeCsv(owner.address?.street2 || ''),
              escapeCsv(owner.address?.city || ''),
              escapeCsv(owner.address?.state || ''),
              escapeCsv(owner.address?.postal_code || ''),
              escapeCsv(owner.address?.country || ''),
              escapeCsv(owner.front_image || ''),
              escapeCsv(owner.back_image || ''),
              escapeCsv(ownerDocs),
            ].join(','))
          })
        }
      }

      // Section 3: Bank Details
      if (profile.bank_details) {
        sections.push('')
        sections.push('--- BANK DETAILS ---')
        sections.push(['Field', 'Value'].map(escapeCsv).join(','))
        const bankFields = [
          ['Bank Identifier', profile.bank_details.bank_identifier || ''],
          ['Identifier Type', profile.bank_details.bank_identifier_type || ''],
          ['Bank Country', profile.bank_details.bank_country || ''],
          ['Bank Verified', profile.bank_details.is_bank_verified ? 'Yes' : 'No'],
        ]
        for (const [f, v] of bankFields) {
          sections.push([escapeCsv(f), escapeCsv(v)].join(','))
        }
      }

      // Section 4: Verification Documents
      if (documents.length > 0) {
        sections.push('')
        sections.push(`--- VERIFICATION DOCUMENTS (${documents.length}) ---`)
        sections.push(['Document Type', 'Country', 'Approval Status', 'Verified', 'Rejection Reason', 'Submitted At', 'Document URL'].map(escapeCsv).join(','))
        for (const doc of documents) {
          sections.push([
            escapeCsv((doc.doc_type || '').toLowerCase().replace(/_/g, ' ')),
            escapeCsv(doc.doc_country || ''),
            escapeCsv(doc.approval_status || ''),
            escapeCsv(doc.is_doc_verified ? 'Yes' : 'No'),
            escapeCsv(doc.rejection_reason || ''),
            escapeCsv(formatDateSafe(doc.created_at)),
            escapeCsv(doc.doc_image || ''),
          ].join(','))
        }
      }

      const csvContent = sections.join('\r\n')
      const sanitizedName = (u.businessName || u.first_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-')
      const timestamp = format(new Date(), 'yyyyMMdd-HHmmss')
      const filename = `user-details-${sanitizedName}-${timestamp}.csv`

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('User details exported successfully', { id: toastId })
    } catch {
      toast.error('Failed to export user details', { id: toastId })
    } finally {
      setExportingUserId(null)
    }
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
      render: (row) => <span className="text-sm text-slate">{row.email}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className="text-sm capitalize text-slate">{row.role}</span>
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
        <span className="text-sm text-slate">
          {row.created_at ? format(new Date(row.created_at), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation()
              exportSingleUserRow(row)
            }}
            disabled={exportingUserId === row.id}
            className="p-2 hover:bg-vellum rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Export this user's details to CSV"
          >
            {exportingUserId === row.id ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate" />
            ) : (
              <Download className="w-4 h-4 text-ash hover:text-ink" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate({ to: `/users/$userId`, params: { userId: row.id } })
            }}
            className="p-2 hover:bg-vellum rounded-lg transition-colors cursor-pointer"
            title="View user details"
          >
            <Eye className="w-4 h-4 text-ash hover:text-ink" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <AdminLayout title="Users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              Users
            </h2>
            <p className="text-slate mt-1">
              Manage platform users and their compliance status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-users'] })}
              className="btn-secondary flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Export CSV Split Button */}
            <div className="relative" ref={exportMenuRef}>
              <div className="inline-flex items-center rounded-lg shadow-xs">
                <button
                  onClick={handleQuickExport}
                  disabled={isExporting}
                  className="btn-secondary flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-r-none border-r border-graphite-hairline hover:bg-slate/5 transition-all"
                  title={`Export CSV (Role: ${roleFilter}, Compliance: ${complianceFilter === 'all' ? 'All' : complianceFilter}, Status: ${statusFilter === 'all' ? 'All' : statusFilter})`}
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate" />
                  ) : (
                    <Download className="w-4 h-4 text-slate" />
                  )}
                  <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                </button>
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  disabled={isExporting}
                  className="btn-secondary px-2 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed rounded-l-none hover:bg-slate/5 transition-all"
                  title="Export options"
                >
                  <ChevronDown className={`w-3.5 h-3.5 text-slate transition-transform duration-200 ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {exportMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-paper border border-graphite-hairline rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={handleQuickExport}
                    disabled={isExporting}
                    className="w-full text-left px-3.5 py-2 hover:bg-vellum transition-colors flex flex-col gap-0.5 cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">Export Active Filters</span>
                      <span className="text-[10px] bg-sand px-1.5 py-0.5 rounded text-ink border border-graphite-hairline">
                        Current
                      </span>
                    </div>
                    <span className="text-[11px] text-slate">
                      Role: {roleFilter} • Comp: {complianceFilter === 'all' ? 'All' : complianceFilter} • Status: {statusFilter === 'all' ? 'All' : statusFilter}
                    </span>
                  </button>

                  <button
                    onClick={handleOpenExportModal}
                    disabled={isExporting}
                    className="w-full text-left px-3.5 py-2 hover:bg-vellum transition-colors flex items-center gap-2 cursor-pointer border-t border-graphite-hairline/60 disabled:opacity-50 text-xs text-ink"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate" />
                    <span>Configure Filters & Export...</span>
                  </button>

                  <button
                    onClick={handleExportAll}
                    disabled={isExporting}
                    className="w-full text-left px-3.5 py-2 hover:bg-vellum transition-colors flex flex-col gap-0.5 cursor-pointer border-t border-graphite-hairline/60 disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink">Export All Users</span>
                      <span className="text-[10px] bg-vellum px-1.5 py-0.5 rounded text-slate border border-graphite-hairline">
                        No filters
                      </span>
                    </div>
                    <span className="text-[11px] text-slate">Export all platform users ignoring active filters</span>
                  </button>
                </div>
              )}
            </div>

            <PermissionGate resource="users" action="write">
              <button
                onClick={() => navigate({ to: '/users/add' })}
                className="btn-primary flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </PermissionGate>
          </div>
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
                key: 'status',
                label: 'Account Status',
                type: 'select',
                value: statusFilter,
                onChange: (v) => { setStatusFilter(v); setPage(1) },
                options: [
                  { label: 'All Statuses', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Blocked', value: 'blocked' },
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
          emptyIcon={<UsersIcon className="w-8 h-8 text-slate" />}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onRowClick={(row) => navigate({ to: `/users/$userId`, params: { userId: row.id } })}
          rowKey={(row) => row.id}
        />
      </div>

      {/* Export Configuration Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => !isExporting && setIsExportModalOpen(false)}
        title="Export Users to CSV"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate">
            Configure filters to export platform users into a downloadable CSV file.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Role
              </label>
              <select
                value={modalRole}
                onChange={(e) => setModalRole(e.target.value)}
                className="input w-full text-sm py-2 px-3 cursor-pointer"
              >
                {roleOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'All Roles' : opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Compliance Status
              </label>
              <select
                value={modalCompliance}
                onChange={(e) => setModalCompliance(e.target.value)}
                className="input w-full text-sm py-2 px-3 cursor-pointer"
              >
                <option value="all">All Compliance Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="NotSubmitted">Not Submitted</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Account Status
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value)}
                className="input w-full text-sm py-2 px-3 cursor-pointer"
              >
                <option value="all">All Account Statuses</option>
                <option value="active">Active Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
            </div>
          </div>

          <div className="bg-vellum/60 border border-graphite-hairline rounded-lg p-3 text-xs text-slate">
            <div className="flex items-center gap-1.5 font-medium text-ink mb-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate" />
              <span>Export Scope</span>
            </div>
            <p>
              Exports all users matching the specified Role, Compliance, and Status criteria across all pages.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              disabled={isExporting}
              className="btn-secondary cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleModalExportSubmit}
              disabled={isExporting}
              className="btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Download CSV'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  )
}

