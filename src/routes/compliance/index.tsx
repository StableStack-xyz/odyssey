import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  FileText,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Search,
  Building2,
  ArrowUpRight,
  Loader2,
  Lock,
  Globe,
  Sparkles,
  RefreshCw,
  BadgeCheck,
  FileCheck2,
} from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { DataTable } from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { usePermissions } from '../../hooks/usePermissions';
import { baseApi, getErrorMessage } from '../../lib/api';
import { APP_NAME } from '../../lib/constants';
import {
  getComplianceRule,
  saveComplianceRule,
  resetSpecificComplianceRule,
  resetComplianceRules,
  isCustomRule,
} from '../../lib/complianceRules';
import type {
  ComplianceRule,
  BusinessTier,
  DocumentRequirement,
  VerificationRequirement,
} from '../../types/complianceRules';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const Route = createFileRoute('/compliance/')({
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
      { title: `Compliance & KYB - ${APP_NAME}` },
      { name: 'description', content: 'Manage KYB expectations, automated verification rules, and merchant review queues' },
    ],
  }),
  component: CompliancePage,
});

const COUNTRY_OPTIONS = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'GLOBAL', name: 'Global / Standard International', flag: '🌐' },
];

const VERIFICATION_TYPE_OPTIONS: Array<{
  type: VerificationRequirement['type'];
  label: string;
  defaultTarget: VerificationRequirement['target'];
  desc: string;
}> = [
  { type: 'BUSINESS', label: 'Company Registry (CAC / Secretary of State)', defaultTarget: 'company', desc: 'Validates official incorporation, active business status, and filing records' },
  { type: 'TIN', label: 'Tax Identification Number (TIN / IRS)', defaultTarget: 'company', desc: 'Confirms corporate tax registration and active taxpayer status' },
  { type: 'BVN', label: 'Director / Contact ID (BVN, SSN, NIN)', defaultTarget: 'contact_person', desc: 'Verifies biometric identity credentials of authorized representatives' },
  { type: 'AML', label: 'AML & PEP Sanctions Screening', defaultTarget: 'company', desc: 'Screens company, directors, and UBOs against global watchlists, OFAC, and PEP databases' },
  { type: 'UBO', label: 'Ultimate Beneficial Owner (UBO) Screening', defaultTarget: 'ubos', desc: 'Deep-dive background and sanctions checks on major shareholders' },
];

interface MerchantQueueItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  businessName?: string;
  country?: string;
  role: string;
  complianceStatus: string;
  compliance_tier?: BusinessTier;
  compliance_reviewed_at?: string;
  created_at: string;
}

function CompliancePage() {
  const navigate = useNavigate();
  const { canWrite, isFullAccess } = usePermissions();
  const hasWriteAccess = isFullAccess || canWrite('compliance');

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'policy' | 'queue'>('policy');

  // Policy Rule Selection state
  const [selectedCountry, setSelectedCountry] = useState<string>('NG');
  const [selectedTier, setSelectedTier] = useState<BusinessTier>('api_fintech');
  const [rulesVersion, setRulesVersion] = useState<number>(0);

  // Active rule state being viewed / edited
  const [ruleDraft, setRuleDraft] = useState<ComplianceRule>(() => {
    return JSON.parse(JSON.stringify(getComplianceRule('NG', 'api_fintech')));
  });

  // Whenever selection changes or rules are reset, reload draft
  const loadDraft = (country: string, tier: BusinessTier) => {
    const fresh = getComplianceRule(country, tier);
    // Deep clone to allow safe in-memory editing
    const draft: ComplianceRule = JSON.parse(JSON.stringify(fresh));
    draft.country = country;
    const countryMeta = COUNTRY_OPTIONS.find((c) => c.code === country);
    if (countryMeta) draft.countryName = countryMeta.name;
    draft.tier = tier;
    draft.tierLabel =
      tier === 'api_fintech'
        ? 'API & Fintech (WaaS, Rails, Aggregators)'
        : 'General Business (Direct Self-Use)';
    setRuleDraft(draft);
  };

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    loadDraft(country, selectedTier);
  };

  const handleTierChange = (tier: BusinessTier) => {
    setSelectedTier(tier);
    loadDraft(selectedCountry, tier);
  };

  // Rule modification states
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Add document modal state
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');
  const [newDocKey, setNewDocKey] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocRequired, setNewDocRequired] = useState(true);

  // Check if current rule is customized
  const ruleIsCustom = useMemo(() => {
    void rulesVersion;
    return isCustomRule(selectedCountry, selectedTier);
  }, [selectedCountry, selectedTier, rulesVersion]);

  // Save Rule Handler
  const handleSaveRule = async () => {
    if (!hasWriteAccess) {
      toast.error('You do not have write permissions to update compliance policies.');
      return;
    }

    try {
      setIsSaving(true);
      // Simulate slight async debounce for smooth UI feedback per standards
      await new Promise((resolve) => setTimeout(resolve, 350));
      saveComplianceRule(ruleDraft);
      setRulesVersion((v) => v + 1);
      toast.success(
        `Compliance expectations saved successfully for ${ruleDraft.countryName} (${ruleDraft.tier === 'api_fintech' ? 'Fintech/API' : 'General Business'})`
      );
    } catch (err) {
      toast.error('Failed to save compliance rule: ' + getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset current rule to system default
  const handleResetCurrentRule = async () => {
    if (!hasWriteAccess) {
      toast.error('You do not have write permissions.');
      return;
    }

    try {
      setIsResetting(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      resetSpecificComplianceRule(selectedCountry, selectedTier);
      setRulesVersion((v) => v + 1);
      loadDraft(selectedCountry, selectedTier);
      toast.success(
        `Restored default expectations for ${selectedCountry} (${selectedTier === 'api_fintech' ? 'API/Fintech' : 'General Business'})`
      );
    } catch (err) {
      toast.error('Failed to reset rule: ' + getErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  // Reset ALL custom rules to system default
  const handleResetAllRules = async () => {
    if (!hasWriteAccess) {
      toast.error('You do not have write permissions.');
      return;
    }

    if (!confirm('Are you sure you want to restore ALL compliance policies to system defaults? Custom changes across all countries will be cleared.')) {
      return;
    }

    try {
      setIsResetting(true);
      await new Promise((resolve) => setTimeout(resolve, 300));
      resetComplianceRules();
      setRulesVersion((v) => v + 1);
      loadDraft(selectedCountry, selectedTier);
      toast.success('All compliance rules restored to system factory defaults.');
    } catch (err) {
      toast.error('Failed to reset rules: ' + getErrorMessage(err));
    } finally {
      setIsResetting(false);
    }
  };

  // Document requirement handlers
  const handleToggleDocRequired = (index: number) => {
    if (!hasWriteAccess) return;
    setRuleDraft((prev) => {
      const nextDocs = [...prev.documents];
      nextDocs[index] = { ...nextDocs[index], required: !nextDocs[index].required };
      return { ...prev, documents: nextDocs };
    });
  };

  const handleDeleteDoc = (index: number) => {
    if (!hasWriteAccess) return;
    setRuleDraft((prev) => {
      const nextDocs = prev.documents.filter((_, i) => i !== index);
      return { ...prev, documents: nextDocs };
    });
  };

  const handleAddDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasWriteAccess) return;
    if (!newDocLabel.trim()) {
      toast.error('Document title is required.');
      return;
    }

    const key = newDocKey.trim() || newDocLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const newDoc: DocumentRequirement = {
      key,
      label: newDocLabel.trim(),
      description: newDocDesc.trim() || 'Required for KYB verification review',
      required: newDocRequired,
      docTypeMatch: [key],
    };

    setRuleDraft((prev) => ({
      ...prev,
      documents: [...prev.documents, newDoc],
    }));

    setNewDocLabel('');
    setNewDocKey('');
    setNewDocDesc('');
    setNewDocRequired(true);
    setIsAddDocModalOpen(false);
    toast.success(`Added "${newDoc.label}" to document expectations.`);
  };

  // Verification requirement handlers
  const handleToggleVerificationRequired = (index: number) => {
    if (!hasWriteAccess) return;
    setRuleDraft((prev) => {
      const nextVerifs = [...prev.verifications];
      nextVerifs[index] = { ...nextVerifs[index], required: !nextVerifs[index].required };
      return { ...prev, verifications: nextVerifs };
    });
  };

  const handleAddVerificationCheck = (opt: (typeof VERIFICATION_TYPE_OPTIONS)[0]) => {
    if (!hasWriteAccess) return;
    // Check if check already exists
    if (ruleDraft.verifications.some((v) => v.type === opt.type)) {
      toast.info(`${opt.label} is already configured in the rule.`);
      return;
    }

    const newVerif: VerificationRequirement = {
      id: `${opt.type.toLowerCase()}_check`,
      label: opt.label,
      type: opt.type,
      target: opt.defaultTarget,
      description: opt.desc,
      required: true,
    };

    setRuleDraft((prev) => ({
      ...prev,
      verifications: [...prev.verifications, newVerif],
    }));
    toast.success(`Added ${opt.label} to verification checks.`);
  };

  const handleDeleteVerificationCheck = (index: number) => {
    if (!hasWriteAccess) return;
    setRuleDraft((prev) => {
      const nextVerifs = prev.verifications.filter((_, i) => i !== index);
      return { ...prev, verifications: nextVerifs };
    });
  };

  // ==========================================
  // MERCHANT REVIEW QUEUE STATE & QUERY
  // ==========================================
  const [queuePage, setQueuePage] = useState(1);
  const [queueSearch, setQueueSearch] = useState('');
  const [queueStatusFilter, setQueueStatusFilter] = useState('all');
  const [queueCountryFilter, setQueueCountryFilter] = useState('');
  const queueLimit = 20;

  const {
    data: queueData,
    isLoading: isQueueLoading,
    isFetching: isQueueFetching,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['admin-compliance-queue', queuePage, queueSearch, queueStatusFilter, queueCountryFilter],
    queryFn: async () => {
      const response = await baseApi.get('/api/users/filter', {
        params: {
          page: queuePage,
          limit: queueLimit,
          searchQuery: queueSearch || undefined,
          complianceStatus: queueStatusFilter !== 'all' ? queueStatusFilter : undefined,
          country: queueCountryFilter || undefined,
          role: 'merchant',
        },
      });
      return response.data.data;
    },
    enabled: activeTab === 'queue',
  });

  const merchantsList: MerchantQueueItem[] = queueData?.users || [];
  const queueTotal = queueData?.totalUsers || merchantsList.length;

  const queueColumns: Column<MerchantQueueItem>[] = [
    {
      key: 'businessName',
      header: 'Merchant & Contact',
      render: (row) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink">
              {row.businessName || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unnamed Business'}
            </p>
          </div>
          <p className="text-xs text-slate mt-0.5">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'country',
      header: 'Jurisdiction',
      render: (row) => {
        const countryCode = row.country?.toUpperCase() || 'NG';
        const match = COUNTRY_OPTIONS.find((c) => c.code === countryCode);
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-base">{match?.flag || '🌐'}</span>
            <span className="text-xs font-medium text-ink">{countryCode}</span>
          </div>
        );
      },
    },
    {
      key: 'compliance_tier',
      header: 'Business Tier',
      render: (row) => {
        const tier = row.compliance_tier || 'general_business';
        return tier === 'api_fintech' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-700 border border-purple-500/20">
            <Sparkles className="w-3 h-3" />
            API / Fintech
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate/10 text-slate border border-slate/20">
            <Building2 className="w-3 h-3" />
            General Business
          </span>
        );
      },
    },
    {
      key: 'complianceStatus',
      header: 'Compliance Status',
      render: (row) => <StatusBadge status={row.complianceStatus} />,
    },
    {
      key: 'created_at',
      header: 'Submitted Date',
      render: (row) => (
        <span className="text-xs text-slate">
          {row.created_at ? format(new Date(row.created_at), 'MMM dd, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => navigate({ to: '/users/$userId', params: { userId: row.id } })}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand bg-brand/5 hover:bg-brand/10 border border-brand/20 transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Review & Evaluate</span>
          <ArrowUpRight className="w-3 h-3 text-ash" />
        </button>
      ),
    },
  ];

  return (
    <AdminLayout title="Compliance & KYB">
      <div className="space-y-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-graphite-hairline pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-display font-semibold text-ink">
                Compliance & KYB Expectations
              </h1>
            </div>
            <p className="text-xs text-slate mt-1">
              Define expectations per country and business tier, customize required corporate documents, configure automated identity verification checks, and review merchant applications.
            </p>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center gap-2 p-1 bg-vellum/50 rounded-xl border border-graphite-hairline">
            <button
              onClick={() => setActiveTab('policy')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'policy'
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Policy Rules & Expectations</span>
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-paper text-ink shadow-sm'
                  : 'text-slate hover:text-ink'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Merchant Review Queue</span>
            </button>
          </div>
        </div>

        {/* Read-Only Access Banner when write access is missing */}
        {!hasWriteAccess && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Read-Only Mode</p>
              <p className="text-amber-800 mt-0.5">
                You have viewing permissions for the Compliance module. Policy editing, rule saving, and KYB status mutations are restricted to authorized administrators with write permissions.
              </p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 1: POLICY RULES & EXPECTATIONS                   */}
        {/* ==================================================== */}
        {activeTab === 'policy' && (
          <div className="space-y-6">
            {/* Country and Tier Selector Bar */}
            <div className="bg-paper p-5 rounded-2xl border border-graphite-hairline shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Country Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">
                      Jurisdiction / Country
                    </label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="px-3 py-2 bg-paper border border-graphite-hairline rounded-xl text-xs text-ink font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
                    >
                      {COUNTRY_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Business Tier Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate mb-1">
                      Business Tier & Integration Model
                    </label>
                    <div className="inline-flex rounded-xl p-1 bg-vellum/50 border border-graphite-hairline">
                      <button
                        type="button"
                        onClick={() => handleTierChange('api_fintech')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedTier === 'api_fintech'
                            ? 'bg-paper text-brand shadow-sm font-semibold'
                            : 'text-slate hover:text-ink'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>API & Fintech Rails</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTierChange('general_business')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedTier === 'general_business'
                            ? 'bg-paper text-brand shadow-sm font-semibold'
                            : 'text-slate hover:text-ink'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate" />
                        <span>General Business</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status Badges & Quick Action Buttons */}
                <div className="flex items-center flex-wrap gap-2.5">
                  {ruleIsCustom ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Custom Policy (Active)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate/10 text-slate border border-slate/20">
                      <Globe className="w-3.5 h-3.5" />
                      System Factory Default
                    </span>
                  )}

                  {ruleIsCustom && (
                    <button
                      type="button"
                      onClick={handleResetCurrentRule}
                      disabled={!hasWriteAccess || isResetting}
                      className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3 cursor-pointer disabled:opacity-50"
                      title="Reset this country and tier to factory defaults"
                    >
                      {isResetting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 text-ash" />
                      )}
                      <span>Reset to Default</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveRule}
                    disabled={!hasWriteAccess || isSaving}
                    className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Policy Configuration</span>
                  </button>
                </div>
              </div>

              {/* Policy Description Box */}
              <div className="pt-3 border-t border-graphite-hairline">
                <label className="block text-xs font-medium text-slate mb-1">
                  Policy Summary & Scope
                </label>
                <textarea
                  value={ruleDraft.description}
                  onChange={(e) =>
                    setRuleDraft((prev) => ({ ...prev, description: e.target.value }))
                  }
                  disabled={!hasWriteAccess}
                  rows={2}
                  className="w-full text-xs text-ink bg-paper border border-graphite-hairline rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-vellum/30"
                  placeholder="Define the scope and expectations for this compliance tier..."
                />
              </div>
            </div>

            {/* Grid: Documents & Verifications */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Required Corporate & Governance Documents */}
              <div className="bg-paper rounded-2xl border border-graphite-hairline p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-graphite-hairline">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand" />
                      <h2 className="text-sm font-semibold text-ink">
                        Required Corporate & KYB Documents
                      </h2>
                    </div>
                    <p className="text-xs text-slate mt-0.5">
                      Documents merchants must upload for this jurisdiction and tier
                    </p>
                  </div>
                  {hasWriteAccess && (
                    <button
                      type="button"
                      onClick={() => setIsAddDocModalOpen(true)}
                      className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Document</span>
                    </button>
                  )}
                </div>

                {ruleDraft.documents.length === 0 ? (
                  <p className="text-xs text-slate italic py-4 text-center">
                    No documents currently specified for this rule.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {ruleDraft.documents.map((doc, idx) => (
                      <div
                        key={doc.key}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl border border-graphite-hairline bg-paper hover:bg-vellum/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-ink">
                              {doc.label}
                            </span>
                            {doc.isPolicy && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-purple-500/10 text-purple-700">
                                Policy Doc
                              </span>
                            )}
                            <span className="text-[10px] text-slate font-mono bg-vellum/40 px-1 rounded">
                              key: {doc.key}
                            </span>
                          </div>
                          <p className="text-xs text-slate mt-1 leading-relaxed">
                            {doc.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Required Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleDocRequired(idx)}
                            disabled={!hasWriteAccess}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                              doc.required
                                ? 'bg-red-500/10 text-red-700 border-red-500/20'
                                : 'bg-slate/10 text-slate border-slate/20'
                            }`}
                            title="Click to toggle required vs optional"
                          >
                            {doc.required ? 'Required' : 'Optional'}
                          </button>

                          {hasWriteAccess && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(idx)}
                              className="p-1 rounded-lg text-slate hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove document expectation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Automated Identity & AML Verification Checks */}
              <div className="bg-paper rounded-2xl border border-graphite-hairline p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-graphite-hairline">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h2 className="text-sm font-semibold text-ink">
                        Automated Verification Suite
                      </h2>
                    </div>
                    <p className="text-xs text-slate mt-0.5">
                      Real-time identity, registry, and AML screening checks to execute
                    </p>
                  </div>
                </div>

                {ruleDraft.verifications.length === 0 ? (
                  <p className="text-xs text-slate italic py-4 text-center">
                    No verification checks configured.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {ruleDraft.verifications.map((verif, idx) => (
                      <div
                        key={verif.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-xl border border-graphite-hairline bg-paper hover:bg-vellum/10 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-ink">
                              {verif.label}
                            </span>
                            <span className="text-[10px] font-medium rounded px-1.5 py-0.5 bg-brand/10 text-brand">
                              Target: {verif.target}
                            </span>
                          </div>
                          <p className="text-xs text-slate mt-1 leading-relaxed">
                            {verif.description}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleVerificationRequired(idx)}
                            disabled={!hasWriteAccess}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                              verif.required
                                ? 'bg-red-500/10 text-red-700 border-red-500/20'
                                : 'bg-slate/10 text-slate border-slate/20'
                            }`}
                            title="Click to toggle required vs optional"
                          >
                            {verif.required ? 'Required' : 'Optional'}
                          </button>

                          {hasWriteAccess && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVerificationCheck(idx)}
                              className="p-1 rounded-lg text-slate hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove check"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Available Checks Options */}
                {hasWriteAccess && (
                  <div className="pt-3 border-t border-graphite-hairline">
                    <p className="text-xs font-medium text-slate mb-2">
                      Add Verification Engine Check:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {VERIFICATION_TYPE_OPTIONS.map((opt) => {
                        const isAlreadyAdded = ruleDraft.verifications.some(
                          (v) => v.type === opt.type
                        );
                        return (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => handleAddVerificationCheck(opt)}
                            disabled={isAlreadyAdded}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                              isAlreadyAdded
                                ? 'bg-vellum/30 text-slate/50 border-graphite-hairline cursor-not-allowed'
                                : 'bg-paper text-ink border-graphite-hairline hover:bg-vellum cursor-pointer'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{opt.label.split('(')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* UBO Ownership & Governance Expectations */}
            <div className="bg-paper rounded-2xl border border-graphite-hairline p-5 shadow-sm">
              <div className="pb-3 border-b border-graphite-hairline flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand" />
                <h2 className="text-sm font-semibold text-ink">
                  Ultimate Beneficial Ownership (UBO) Expectations
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                <div>
                  <label className="block text-xs font-medium text-slate mb-1">
                    Minimum Ownership Threshold (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={ruleDraft.minUboOwnershipThreshold}
                      onChange={(e) =>
                        setRuleDraft((prev) => ({
                          ...prev,
                          minUboOwnershipThreshold: Number(e.target.value) || 25,
                        }))
                      }
                      disabled={!hasWriteAccess}
                      className="w-24 px-3 py-1.5 text-xs text-ink bg-paper border border-graphite-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-vellum/30"
                    />
                    <span className="text-xs text-slate">% or greater equity</span>
                  </div>
                  <p className="text-[11px] text-slate mt-1">
                    Shareholders meeting or exceeding this percentage require full KYC disclosure.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate mb-1">
                    UBO Proof of Address
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={ruleDraft.requireUboAddress}
                      onChange={(e) =>
                        setRuleDraft((prev) => ({
                          ...prev,
                          requireUboAddress: e.target.checked,
                        }))
                      }
                      disabled={!hasWriteAccess}
                      className="rounded border-graphite-hairline text-brand focus:ring-brand"
                    />
                    <span className="text-xs text-ink font-medium">
                      Require residential address proof (Utility bill/statement)
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate mb-1">
                    UBO ID Dual-Sided Capture
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={ruleDraft.requireUboIdFrontAndBack}
                      onChange={(e) =>
                        setRuleDraft((prev) => ({
                          ...prev,
                          requireUboIdFrontAndBack: e.target.checked,
                        }))
                      }
                      disabled={!hasWriteAccess}
                      className="rounded border-graphite-hairline text-brand focus:ring-brand"
                    />
                    <span className="text-xs text-ink font-medium">
                      Require both front & back image upload for Government IDs
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
              <button
                type="button"
                onClick={handleResetAllRules}
                disabled={!hasWriteAccess || isResetting}
                className="text-xs text-red-600 hover:text-red-700 underline cursor-pointer disabled:opacity-50"
              >
                Restore all policies across all countries to factory defaults
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveRule}
                  disabled={!hasWriteAccess || isSaving}
                  className="btn-primary flex items-center gap-1.5 text-xs py-2 px-5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Policy Configuration</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MERCHANT REVIEW QUEUE                         */}
        {/* ==================================================== */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-paper p-4 rounded-2xl border border-graphite-hairline shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ash" />
                  <input
                    type="text"
                    placeholder="Search merchant or email..."
                    value={queueSearch}
                    onChange={(e) => {
                      setQueueSearch(e.target.value);
                      setQueuePage(1);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 bg-paper border border-graphite-hairline rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                {/* Compliance Status Filter */}
                <select
                  value={queueStatusFilter}
                  onChange={(e) => {
                    setQueueStatusFilter(e.target.value);
                    setQueuePage(1);
                  }}
                  className="px-3 py-1.5 bg-paper border border-graphite-hairline rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
                >
                  <option value="all">All Compliance Statuses</option>
                  <option value="UnderReview">Under Review</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="NotSubmitted">Not Submitted</option>
                </select>

                {/* Country Filter */}
                <select
                  value={queueCountryFilter}
                  onChange={(e) => {
                    setQueueCountryFilter(e.target.value);
                    setQueuePage(1);
                  }}
                  className="px-3 py-1.5 bg-paper border border-graphite-hairline rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer"
                >
                  <option value="">All Countries</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => refetchQueue()}
                  disabled={isQueueFetching}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-ash ${isQueueFetching ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh Queue</span>
                </button>
              </div>
            </div>

            {/* Merchant Queue Data Table */}
            <div className="bg-paper rounded-2xl border border-graphite-hairline shadow-sm overflow-hidden">
              <DataTable<MerchantQueueItem>
                data={merchantsList}
                columns={queueColumns}
                isLoading={isQueueLoading}
                rowKey={(row) => String(row.id)}
                page={queuePage}
                totalPages={Math.max(1, Math.ceil(queueTotal / queueLimit))}
                total={queueTotal}
                limit={queueLimit}
                onPageChange={(newPage: number) => setQueuePage(newPage)}
              />
            </div>
          </div>
        )}

        {/* Modal: Add Document Expectation */}
        <Modal
          isOpen={isAddDocModalOpen}
          onClose={() => setIsAddDocModalOpen(false)}
          title="Add Document Expectation"
          size="md"
        >
          <form onSubmit={handleAddDocSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">
                Document Title *
              </label>
              <input
                type="text"
                required
                value={newDocLabel}
                onChange={(e) => setNewDocLabel(e.target.value)}
                placeholder="e.g. Tax Clearance Certificate"
                className="w-full px-3 py-2 text-xs text-ink bg-paper border border-graphite-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate mb-1">
                Document Key Identifier (Optional)
              </label>
              <input
                type="text"
                value={newDocKey}
                onChange={(e) => setNewDocKey(e.target.value)}
                placeholder="Auto-generated if empty (e.g. tax_clearance_cert)"
                className="w-full px-3 py-2 text-xs text-ink bg-paper border border-graphite-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate mb-1">
                Description & Instructions
              </label>
              <textarea
                value={newDocDesc}
                onChange={(e) => setNewDocDesc(e.target.value)}
                rows={2}
                placeholder="Clear instructions for the merchant regarding what to provide..."
                className="w-full px-3 py-2 text-xs text-ink bg-paper border border-graphite-hairline rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="pt-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newDocRequired}
                  onChange={(e) => setNewDocRequired(e.target.checked)}
                  className="rounded border-graphite-hairline text-brand focus:ring-brand"
                />
                <span className="text-xs text-ink font-medium">
                  Mark this document as strictly mandatory for approval
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-graphite-hairline">
              <button
                type="button"
                onClick={() => setIsAddDocModalOpen(false)}
                className="btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-4 cursor-pointer"
              >
                Add Document Requirement
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
}
