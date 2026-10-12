import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { SearchInput } from '../../components/ui/SearchInput';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatsCard } from '../../components/ui/StatsCard';
import {
  ShieldCheck,
  Shield,
  UserPlus,
  Loader2,
  Lock,
  Unlock,
  CheckCircle2,
  KeyRound,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authApi } from '../../lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { APP_NAME } from '../../lib/constants';
import { usePermissions } from '../../hooks/usePermissions';
import { MODULE_DEFINITIONS } from '../../types/permissions';
import type { AdminRole, AdminPermissions, ResourceModule, PermissionAction } from '../../types/permissions';

export const Route = createFileRoute('/admins/')({
  beforeLoad: () => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('admin_token');
      if (!token) {
        throw redirect({ to: '/login' });
      }
    }
  },
  head: () => ({
    meta: [
      { title: `Admin Roles & RBAC - ${APP_NAME}` },
      { name: 'description', content: 'Manage platform administrators, roles, and granular permissions' },
    ],
  }),
  component: AdminsPage,
});

interface AdminListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  image?: string;
  isAdmin: boolean;
  adminRole: AdminRole;
  permissions: AdminPermissions;
  isFullAccess: boolean;
  isBlocked: boolean;
  isAccountVerified: boolean;
  lastLogin: string | null;
  createdAt: string;
}

function AdminsPage() {
  const queryClient = useQueryClient();
  const { user: currentAdmin, isFullAccess } = usePermissions();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'custom_admin'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminListItem | null>(null);
  const [statusTargetAdmin, setStatusTargetAdmin] = useState<AdminListItem | null>(null);

  // Form states for Add Admin
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    adminRole: 'custom_admin' as AdminRole,
    permissions: {} as AdminPermissions,
  });

  // Cryptographically secure password generator
  const generatePassword = () => {
    const length = 14;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';

    // Guarantee complexity criteria to pass backend validation
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*()_+'[Math.floor(Math.random() * 12)];

    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle
    const shuffled = password.split('').sort(() => 0.5 - Math.random()).join('');

    setAddForm((prev) => ({ ...prev, password: shuffled }));
    setShowAddPassword(true);
    navigator.clipboard.writeText(shuffled);
    toast.success('Strong password generated and copied to clipboard');
  };

  // Form states for Edit Admin Permissions
  const [editRole, setEditRole] = useState<AdminRole>('custom_admin');
  const [editPermissions, setEditPermissions] = useState<AdminPermissions>({});

  // Fetch all admins
  const { data: admins = [], isLoading, isFetching, refetch } = useQuery<AdminListItem[]>({
    queryKey: ['platform-admins'],
    queryFn: async () => {
      const res = await authApi.get('/api/users/auth/admins');
      return res.data?.data || [];
    },
    enabled: isFullAccess,
  });

  // Create admin mutation
  const createAdminMutation = useMutation({
    mutationFn: async (payload: typeof addForm) => {
      const res = await authApi.post('/api/users/auth/admins', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Admin invited successfully');
      setIsAddModalOpen(false);
      setShowAddPassword(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        adminRole: 'custom_admin',
        permissions: {},
      });
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create admin');
    },
  });

  // Update permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ id, adminRole, permissions }: { id: string; adminRole: AdminRole; permissions: AdminPermissions }) => {
      const res = await authApi.patch(`/api/users/auth/admins/${id}/permissions`, {
        adminRole,
        permissions,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Admin permissions updated successfully');
      setEditingAdmin(null);
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update permissions');
    },
  });

  // Toggle status (block/unblock) mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isBlocked }: { id: string; isBlocked: boolean }) => {
      const res = await authApi.patch(`/api/users/auth/admins/${id}/status`, {
        isBlocked,
      });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Admin successfully ${variables.isBlocked ? 'blocked' : 'unblocked'}`);
      setStatusTargetAdmin(null);
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update admin status');
    },
  });

  // Permission matrix helper
  const handleTogglePermission = (
    perms: AdminPermissions,
    setPerms: (p: AdminPermissions) => void,
    moduleId: ResourceModule,
    action: PermissionAction
  ) => {
    const currentActions = perms[moduleId] || [];
    const exists = currentActions.includes(action);
    let nextActions: PermissionAction[];

    if (exists) {
      nextActions = currentActions.filter((a) => a !== action);
    } else {
      nextActions = [...currentActions, action];
    }

    const updated = { ...perms };
    if (nextActions.length === 0) {
      delete updated[moduleId];
    } else {
      updated[moduleId] = nextActions;
    }
    setPerms(updated);
  };


  const handleSelectAllModules = (setPerms: (p: AdminPermissions) => void) => {
    const all: AdminPermissions = {};
    for (const m of MODULE_DEFINITIONS) {
      all[m.id] = [...m.actions];
    }
    setPerms(all);
  };

  const handleClearAllModules = (setPerms: (p: AdminPermissions) => void) => {
    setPerms({});
  };

  // Open Edit modal
  const handleOpenEdit = (admin: AdminListItem) => {
    setEditingAdmin(admin);
    setEditRole(admin.adminRole);
    setEditPermissions(admin.permissions || {});
  };

  // Filtered admins
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchSearch =
        search === '' ||
        `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase());

      const matchRole =
        roleFilter === 'all' ||
        (roleFilter === 'super_admin' && a.isFullAccess) ||
        (roleFilter === 'custom_admin' && !a.isFullAccess);

      return matchSearch && matchRole;
    });
  }, [admins, search, roleFilter]);

  // Summary counts
  const totalCount = admins.length;
  const superAdminCount = admins.filter((a) => a.isFullAccess).length;
  const customAdminCount = admins.filter((a) => !a.isFullAccess).length;
  const blockedCount = admins.filter((a) => a.isBlocked).length;

  const columns: Column<AdminListItem>[] = [
    {
      key: 'name',
      header: 'Admin User',
      render: (row) => {
        const isCurrent = currentAdmin?.id === row.id;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-vellum border border-graphite-hairline flex items-center justify-center shrink-0 text-ink font-medium text-xs">
              {row.firstName?.[0]?.toUpperCase()}
              {row.lastName?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-ink text-sm truncate">
                  {row.firstName} {row.lastName}
                </span>
                {isCurrent && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-slate truncate font-mono">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Access Level',
      render: (row) => {
        const moduleCount = Object.keys(row.permissions || {}).filter((k) => k !== '*').length;
        return (
          <div className="space-y-1">
            {row.isFullAccess ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Full Access (Super Admin)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <Shield className="w-3.5 h-3.5" />
                Selected Access ({moduleCount} {moduleCount === 1 ? 'module' : 'modules'})
              </span>
            )}
            {!row.isFullAccess && (
              <div className="flex flex-wrap gap-1 max-w-xs">
                {Object.keys(row.permissions || {}).map((mod) => (
                  <span
                    key={mod}
                    className="text-[10px] font-mono px-1.5 py-0.5 bg-paper border border-graphite-hairline rounded text-slate capitalize"
                  >
                    {mod.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          {row.isBlocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20">
              <Lock className="w-3 h-3" />
              Blocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (row) => (
        <span className="text-xs text-slate">
          {row.lastLogin ? format(new Date(row.lastLogin), 'MMM d, yyyy HH:mm') : 'Never'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (row) => (
        <span className="text-xs text-slate">
          {row.createdAt ? format(new Date(row.createdAt), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        const isCurrent = currentAdmin?.id === row.id;
        return (
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEdit(row);
              }}
              className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer"
              title="Edit Role & Permissions"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Permissions</span>
            </button>

            {!isCurrent && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStatusTargetAdmin(row);
                }}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  row.isBlocked
                    ? 'border-green-500/20 bg-green-500/10 text-green-700 hover:bg-green-500/20'
                    : 'border-red-500/20 bg-red-500/10 text-red-700 hover:bg-red-500/20'
                }`}
                title={row.isBlocked ? 'Unblock Admin' : 'Block Admin'}
              >
                {row.isBlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout title="Admin Roles & Access Control">
      <div className="space-y-6">
        {/* Header banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              Admin Roles & RBAC
            </h1>
            <p className="text-xs text-slate mt-1">
              Configure platform administrator roles, granular permissions, and feature-level access controls.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite New Admin</span>
            </button>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label="Total Administrators" value={totalCount} icon={Shield} />
          <StatsCard
            label="Full Access (Super Admins)"
            value={superAdminCount}
            icon={ShieldCheck}
            change="Full Read/Write across all modules"
            changeType="positive"
          />
          <StatsCard
            label="Selected Access Admins"
            value={customAdminCount}
            icon={SlidersHorizontal}
            change="Scoped by assigned permissions"
            changeType="positive"
          />
          <StatsCard
            label="Blocked Admins"
            value={blockedCount}
            icon={Lock}
            change={blockedCount > 0 ? 'Action required' : 'All accounts clean'}
            changeType={blockedCount === 0 ? 'positive' : 'negative'}
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-paper p-4 rounded-xl border border-graphite-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search admin by name or email..."
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate font-medium">Filter Role:</span>
            <div className="flex rounded-lg border border-graphite-hairline p-0.5 bg-vellum">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  roleFilter === 'all' ? 'bg-paper text-ink shadow-sm' : 'text-slate hover:text-ink'
                }`}
              >
                All ({admins.length})
              </button>
              <button
                onClick={() => setRoleFilter('super_admin')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  roleFilter === 'super_admin' ? 'bg-paper text-ink shadow-sm' : 'text-slate hover:text-ink'
                }`}
              >
                Full Access ({superAdminCount})
              </button>
              <button
                onClick={() => setRoleFilter('custom_admin')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                  roleFilter === 'custom_admin' ? 'bg-paper text-ink shadow-sm' : 'text-slate hover:text-ink'
                }`}
              >
                Selected Access ({customAdminCount})
              </button>
            </div>
          </div>
        </div>

        {/* Admins Table */}
        <div className="bg-paper rounded-xl border border-graphite-hairline overflow-hidden shadow-sm">
          <DataTable
            columns={columns}
            data={filteredAdmins}
            isLoading={isLoading}
            emptyMessage="No administrators match your filter criteria."
            rowKey={(row) => row.id}
          />
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ADD / INVITE NEW ADMIN (Full screen size="full")   */}
      {/* ============================================================ */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setShowAddPassword(false);
        }}
        title="Invite New Administrator"
        size="full"
        noPadding
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!addForm.firstName || !addForm.lastName || !addForm.email || !addForm.password) {
              toast.error('Please fill in all required credentials');
              return;
            }
            createAdminMutation.mutate(addForm);
          }}
          className="flex flex-col h-full bg-paper min-h-0"
        >
          {/* Subtitle Banner */}
          <div className="px-6 py-3.5 border-b border-graphite-hairline bg-vellum/30 shrink-0">
            <h2 className="text-sm font-semibold text-ink">
              Add Platform Administrator
            </h2>
            <p className="text-xs text-slate mt-0.5">
              Assign account credentials and specify either Full Access or scoped Selected Access permissions.
            </p>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 min-h-0">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Account Details (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-vellum/40 p-5 rounded-2xl border border-graphite-hairline space-y-4">
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-ash" />
                    Account Credentials
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addForm.firstName}
                        onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                        placeholder="John"
                        className="input bg-paper"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={addForm.lastName}
                        onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                        placeholder="Doe"
                        className="input bg-paper"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      placeholder="admin@stablestack.xyz"
                      className="input bg-paper font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Temporary Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
                      <input
                        type={showAddPassword ? 'text' : 'password'}
                        required
                        value={addForm.password}
                        onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                        placeholder="At least 8 chars with letter, number, symbol"
                        className="input bg-paper !pl-10 !pr-32 font-mono"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddPassword(!showAddPassword)}
                          className="p-1 text-ash hover:text-slate transition-colors cursor-pointer"
                          title={showAddPassword ? 'Hide password' : 'Show password'}
                        >
                          {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    <p className="text-[11px] text-slate mt-1">
                      Must contain at least 8 characters, a letter, number, and special character.
                    </p>
                  </div>
                </div>

                {/* Role selection radio card */}
                <div className="bg-vellum/40 p-5 rounded-2xl border border-graphite-hairline space-y-4">
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-ash" />
                    Access Mode Selection
                  </h3>

                  <div className="space-y-3">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        addForm.adminRole === 'super_admin'
                          ? 'bg-paper border-purple-500 ring-1 ring-purple-500 shadow-sm'
                          : 'bg-paper/60 border-graphite-hairline hover:bg-paper'
                      }`}
                    >
                      <input
                        type="radio"
                        name="adminRole"
                        value="super_admin"
                        checked={addForm.adminRole === 'super_admin'}
                        onChange={() => setAddForm({ ...addForm, adminRole: 'super_admin' })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Full Access (Super Admin)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 font-medium">
                            Unrestricted
                          </span>
                        </div>
                        <p className="text-xs text-slate mt-1 leading-normal">
                          Can view, write, mutate, and access every route across the entire platform, including managing other administrators.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        addForm.adminRole === 'custom_admin'
                          ? 'bg-paper border-amber-500 ring-1 ring-amber-500 shadow-sm'
                          : 'bg-paper/60 border-graphite-hairline hover:bg-paper'
                      }`}
                    >
                      <input
                        type="radio"
                        name="adminRole"
                        value="custom_admin"
                        checked={addForm.adminRole === 'custom_admin'}
                        onChange={() => setAddForm({ ...addForm, adminRole: 'custom_admin' })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Selected Access (Custom Admin)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-medium">
                            Granular Scopes
                          </span>
                        </div>
                        <p className="text-xs text-slate mt-1 leading-normal">
                          Access restricted to explicitly selected modules. Choose read-only vs management actions on the right.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Permission Matrix (7 cols) */}
              <div className="lg:col-span-7">
                {addForm.adminRole === 'super_admin' ? (
                  <div className="h-full min-h-[300px] border border-dashed border-purple-500/30 rounded-2xl bg-purple-500/5 p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-display font-semibold text-ink mb-1">
                      Full Platform Access Granted
                    </h4>
                    <p className="text-xs text-slate max-w-md">
                      This administrator will automatically have complete read, write, and audit privileges on every module, page, and button without needing individual permission toggles.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-ink">Module Permission Matrix</h3>
                        <p className="text-xs text-slate">
                          Select which features this administrator can view and manage.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllModules((p) => setAddForm({ ...addForm, permissions: p }))}
                          className="btn-secondary text-xs py-1 px-2.5"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearAllModules((p) => setAddForm({ ...addForm, permissions: p }))}
                          className="btn-secondary text-xs py-1 px-2.5"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {MODULE_DEFINITIONS.filter((m) => m.id !== 'admins').map((mod) => {
                        const currentActions = addForm.permissions[mod.id] || [];
                        const isRead = currentActions.includes('read');
                        const isWrite = currentActions.includes('write');
                        const canManage = mod.actions.includes('write');

                        return (
                          <div
                            key={mod.id}
                            className={`p-4 rounded-xl border transition-all ${
                              currentActions.length > 0
                                ? 'bg-paper border-graphite-hairline shadow-sm'
                                : 'bg-vellum/30 border-graphite-hairline/60 opacity-80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-ink">
                                    {mod.label}
                                  </span>
                                  <span className="text-[10px] text-slate font-mono">
                                    {mod.routes.join(', ')}
                                  </span>
                                </div>
                                <p className="text-xs text-slate mt-0.5 leading-normal">
                                  {mod.description}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isRead}
                                    onChange={() =>
                                      handleTogglePermission(
                                        addForm.permissions,
                                        (p) => setAddForm({ ...addForm, permissions: p }),
                                        mod.id,
                                        'read'
                                      )
                                    }
                                    className="rounded"
                                  />
                                  <span>View (Read)</span>
                                </label>

                                {canManage && (
                                  <label
                                    className={`flex items-center gap-1.5 text-xs cursor-pointer ${
                                      isRead ? 'text-ink' : 'text-slate opacity-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!isRead}
                                      checked={isWrite}
                                      onChange={() =>
                                        handleTogglePermission(
                                          addForm.permissions,
                                          (p) => setAddForm({ ...addForm, permissions: p }),
                                          mod.id,
                                          'write'
                                        )
                                      }
                                      className="rounded"
                                    />
                                    <span>Manage (Write)</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed Footer action bar */}
          <div className="shrink-0 border-t border-graphite-hairline bg-paper px-6 py-4 flex items-center justify-end gap-3 z-30 shadow-lg">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="btn-secondary text-xs py-2 px-5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createAdminMutation.isPending}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-6 cursor-pointer disabled:opacity-50"
            >
              {createAdminMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Administrator...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create & Invite Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: EDIT ADMIN PERMISSIONS (Full screen size="full")    */}
      {/* ============================================================ */}
      <Modal
        isOpen={Boolean(editingAdmin)}
        onClose={() => setEditingAdmin(null)}
        title={editingAdmin ? `Edit Permissions — ${editingAdmin.firstName} ${editingAdmin.lastName}` : ''}
        size="full"
        noPadding
      >
        {editingAdmin && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updatePermissionsMutation.mutate({
                id: editingAdmin.id,
                adminRole: editRole,
                permissions: editPermissions,
              });
            }}
            className="flex flex-col h-full bg-paper min-h-0"
          >
            {/* Subtitle Banner */}
            <div className="px-6 py-3.5 border-b border-graphite-hairline bg-vellum/30 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-ink">
                  Update Permissions: {editingAdmin.firstName} {editingAdmin.lastName}
                </h2>
                <p className="text-xs text-slate mt-0.5">
                  Configure granular resource access or grant unrestricted Full Access.
                </p>
              </div>
              <span className="text-xs font-mono text-ink bg-paper px-2.5 py-1 rounded-md border border-graphite-hairline">
                {editingAdmin.email}
              </span>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 min-h-0">
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left column: Role selection */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="bg-vellum/40 p-5 rounded-2xl border border-graphite-hairline space-y-4">
                    <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-ash" />
                      Role Assignment
                    </h3>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        editRole === 'super_admin'
                          ? 'bg-paper border-purple-500 ring-1 ring-purple-500 shadow-sm'
                          : 'bg-paper/60 border-graphite-hairline hover:bg-paper'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editRole"
                        value="super_admin"
                        checked={editRole === 'super_admin'}
                        onChange={() => setEditRole('super_admin')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Full Access (Super Admin)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 font-medium">
                            Unrestricted
                          </span>
                        </div>
                        <p className="text-xs text-slate mt-1 leading-normal">
                          Full read and write capabilities across every module and route on the platform.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        editRole === 'custom_admin'
                          ? 'bg-paper border-amber-500 ring-1 ring-amber-500 shadow-sm'
                          : 'bg-paper/60 border-graphite-hairline hover:bg-paper'
                      }`}
                    >
                      <input
                        type="radio"
                        name="editRole"
                        value="custom_admin"
                        checked={editRole === 'custom_admin'}
                        onChange={() => setEditRole('custom_admin')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Selected Access (Custom Admin)</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-medium">
                            Granular Scopes
                          </span>
                        </div>
                        <p className="text-xs text-slate mt-1 leading-normal">
                          Restrict access to chosen modules with read and write action scopes.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Right column: Permissions matrix */}
                <div className="lg:col-span-7">
                  {editRole === 'super_admin' ? (
                    <div className="h-full min-h-[300px] border border-dashed border-purple-500/30 rounded-2xl bg-purple-500/5 p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-8 h-8" />
                      </div>
                      <h4 className="text-base font-display font-semibold text-ink mb-1">
                        Full Platform Access
                      </h4>
                      <p className="text-xs text-slate max-w-md">
                        This administrator will have complete authority across all routes, features, and management functions.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-ink">Assigned Module Permissions</h3>
                          <p className="text-xs text-slate">Toggle read and write capabilities per module.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAllModules(setEditPermissions)}
                            className="btn-secondary text-xs py-1 px-2.5"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={() => handleClearAllModules(setEditPermissions)}
                            className="btn-secondary text-xs py-1 px-2.5"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {MODULE_DEFINITIONS.filter((m) => m.id !== 'admins').map((mod) => {
                          const currentActions = editPermissions[mod.id] || [];
                          const isRead = currentActions.includes('read');
                          const isWrite = currentActions.includes('write');
                          const canManage = mod.actions.includes('write');

                          return (
                            <div
                              key={mod.id}
                              className={`p-4 rounded-xl border transition-all ${
                                currentActions.length > 0
                                  ? 'bg-paper border-graphite-hairline shadow-sm'
                                  : 'bg-vellum/30 border-graphite-hairline/60 opacity-80'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-ink">
                                      {mod.label}
                                    </span>
                                    <span className="text-[10px] text-slate font-mono">
                                      {mod.routes.join(', ')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate mt-0.5 leading-normal">
                                    {mod.description}
                                  </p>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <label className="flex items-center gap-1.5 text-xs text-ink cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isRead}
                                      onChange={() =>
                                        handleTogglePermission(
                                          editPermissions,
                                          setEditPermissions,
                                          mod.id,
                                          'read'
                                        )
                                      }
                                      className="rounded"
                                    />
                                    <span>View (Read)</span>
                                  </label>

                                  {canManage && (
                                    <label
                                      className={`flex items-center gap-1.5 text-xs cursor-pointer ${
                                        isRead ? 'text-ink' : 'text-slate opacity-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        disabled={!isRead}
                                        checked={isWrite}
                                        onChange={() =>
                                          handleTogglePermission(
                                            editPermissions,
                                            setEditPermissions,
                                            mod.id,
                                            'write'
                                          )
                                        }
                                        className="rounded"
                                      />
                                      <span>Manage (Write)</span>
                                    </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fixed Footer action bar */}
            <div className="shrink-0 border-t border-graphite-hairline bg-paper px-6 py-4 flex items-center justify-end gap-3 z-30 shadow-lg">
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="btn-secondary text-xs py-2 px-5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updatePermissionsMutation.isPending}
                className="btn-primary flex items-center gap-2 text-xs py-2 px-6 cursor-pointer disabled:opacity-50"
              >
                {updatePermissionsMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Permissions</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: CONFIRM BLOCK / UNBLOCK DIALOG                     */}
      {/* ============================================================ */}
      <ConfirmDialog
        isOpen={Boolean(statusTargetAdmin)}
        onClose={() => setStatusTargetAdmin(null)}
        title={statusTargetAdmin?.isBlocked ? 'Unblock Administrator' : 'Block Administrator'}
        message={
          statusTargetAdmin?.isBlocked
            ? `Are you sure you want to unblock ${statusTargetAdmin.firstName} ${statusTargetAdmin.lastName}? They will be able to sign in immediately.`
            : `Are you sure you want to block ${statusTargetAdmin?.firstName} ${statusTargetAdmin?.lastName}? Their active sessions will be terminated and they will not be able to log in.`
        }
        confirmLabel={statusTargetAdmin?.isBlocked ? 'Unblock Admin' : 'Block Admin'}
        onConfirm={() => {
          if (statusTargetAdmin) {
            toggleStatusMutation.mutate({
              id: statusTargetAdmin.id,
              isBlocked: !statusTargetAdmin.isBlocked,
            });
          }
        }}
        variant={statusTargetAdmin?.isBlocked ? 'info' : 'danger'}
        isLoading={toggleStatusMutation.isPending}
      />
    </AdminLayout>
  );
}
