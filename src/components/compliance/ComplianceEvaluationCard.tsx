import { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  Loader2,
  ExternalLink,
  Info,
  Save,
  Check,
} from 'lucide-react';
import type { BusinessTier, IdentityVerificationResult } from '../../types/complianceRules';
import {
  getComplianceRule,
  evaluateMerchantCompliance,
  runBusinessVerification,
  runTaxVerification,
  runBvnVerification,
  runAmlScreening,
  saveComplianceReport,
} from '../../lib/complianceRules';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ComplianceEvaluationCardProps {
  merchant: any;
  userDocuments: any[];
  userProfile: any;
  canManage: boolean;
  onApproveClick: (tier: BusinessTier, reportPayload: any) => void;
  onRejectClick: (tier: BusinessTier, reportPayload: any) => void;
  isApprovalPending: boolean;
}

export function ComplianceEvaluationCard({
  merchant,
  userDocuments,
  userProfile,
  canManage,
  onApproveClick,
  onRejectClick,
  isApprovalPending,
}: ComplianceEvaluationCardProps) {
  // Country detection
  const detectedCountry = (
    merchant?.formation_country ||
    merchant?.country ||
    userProfile?.country ||
    'NG'
  ).toUpperCase();

  // Load saved report and tier if previously stored in database
  const savedReport = merchant?.compliance_report || null;
  const initialTier: BusinessTier =
    (merchant?.compliance_tier as BusinessTier) ||
    (merchant?.is_regulated ||
    (merchant?.business_model || '').toLowerCase().includes('api') ||
    (merchant?.business_model || '').toLowerCase().includes('fintech')
      ? 'api_fintech'
      : 'general_business');

  const [selectedTier, setSelectedTier] = useState<BusinessTier>(initialTier);
  const [liveVerifications, setLiveVerifications] = useState<
    Record<string, IdentityVerificationResult>
  >(savedReport?.liveVerifications || {});
  const [isRunningSuite, setIsRunningSuite] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suiteLog, setSuiteLog] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(
    merchant?.compliance_reviewed_at || savedReport?.evaluatedAt || null
  );

  // Evaluate compliance against the selected rule
  const rule = getComplianceRule(detectedCountry, selectedTier);
  const evaluation = evaluateMerchantCompliance(
    merchant,
    userDocuments,
    rule,
    liveVerifications
  );

  // Auto-save or manual save compliance report to auth_services
  const persistReport = async (
    tierToSave: BusinessTier,
    verificationsToSave: Record<string, IdentityVerificationResult>
  ) => {
    try {
      setIsSaving(true);
      const evalToPersist = evaluateMerchantCompliance(
        merchant,
        userDocuments,
        getComplianceRule(detectedCountry, tierToSave),
        verificationsToSave
      );

      const timestamp = new Date().toISOString();
      await saveComplianceReport(userProfile.id, tierToSave, {
        ...evalToPersist,
        liveVerifications: verificationsToSave,
        evaluatedAt: timestamp,
      });

      setLastSavedAt(timestamp);
      toast.success('Compliance report snapshot saved to database!');
    } catch (err: any) {
      console.error('Failed to save compliance report:', err);
      toast.error(
        'Failed to save report: ' +
          (err.response?.data?.message || err.message || 'Database error')
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Trigger automated checks via identity-service
  const handleRunVerificationSuite = async () => {
    setIsRunningSuite(true);
    setSuiteLog([]);
    const logs: string[] = [];
    const results: Record<string, IdentityVerificationResult> = { ...liveVerifications };

    try {
      logs.push(
        `Starting automated verification suite for ${merchant?.business_name || 'Merchant'}...`
      );
      setSuiteLog([...logs]);

      // 1. Business Check (CAC / Registry)
      const rcNumber = merchant?.registration_number;
      if (rcNumber) {
        logs.push(`Checking Corporate Registry for RC: ${rcNumber}...`);
        setSuiteLog([...logs]);
        try {
          const bizRes = await runBusinessVerification(
            rcNumber,
            merchant?.business_name || '',
            detectedCountry
          );
          results['verif_cac'] = bizRes;
          results['verif_business'] = bizRes;
          logs.push(`✓ Business Registry: ${bizRes.status} (${bizRes.provider || 'registry'})`);
        } catch (e: any) {
          logs.push(
            `⚠ Business Registry check error: ${e.response?.data?.message || e.message}`
          );
        }
      } else {
        logs.push(`ℹ No company registration number provided.`);
      }

      // 2. Tax ID (TIN) Check
      const tin = merchant?.tax_identification_number;
      if (tin) {
        logs.push(`Verifying Tax ID (TIN): ${tin}...`);
        setSuiteLog([...logs]);
        try {
          const tinRes = await runTaxVerification(tin, detectedCountry);
          results['verif_tin'] = tinRes;
          logs.push(`✓ Tax Verification: ${tinRes.status}`);
        } catch (e: any) {
          logs.push(
            `⚠ Tax Verification check error: ${e.response?.data?.message || e.message}`
          );
        }
      }

      // 3. Contact Person BVN (NG)
      const bvn = merchant?.contact_person?.bvn || merchant?.contactPerson_bvn;
      if (bvn && detectedCountry === 'NG') {
        logs.push(`Verifying Contact Person BVN...`);
        setSuiteLog([...logs]);
        try {
          const bvnRes = await runBvnVerification(
            bvn,
            merchant?.contact_person?.full_name?.split(' ')[0],
            merchant?.contact_person?.full_name?.split(' ').slice(1).join(' '),
            detectedCountry
          );
          results['verif_contact_bvn'] = bvnRes;
          logs.push(`✓ Contact Person BVN: ${bvnRes.status}`);
        } catch (e: any) {
          logs.push(
            `⚠ BVN Verification check error: ${e.response?.data?.message || e.message}`
          );
        }
      }

      // 4. Automated AML / PEP Screening
      logs.push(`Running automated AML & Sanctions screening on entity...`);
      setSuiteLog([...logs]);
      try {
        const amlRes = await runAmlScreening(
          { companyName: merchant?.business_name },
          detectedCountry
        );
        results['verif_aml_company'] = amlRes;
        logs.push(
          `✓ Company AML Screening: ${amlRes.status} (Risk: ${
            amlRes.risk?.level || 'LOW'
          })`
        );
      } catch (e: any) {
        logs.push(`⚠ AML screening error: ${e.response?.data?.message || e.message}`);
      }

      setLiveVerifications(results);

      // Auto-save the fresh report to the database
      await persistReport(selectedTier, results);
    } catch (err: any) {
      toast.error('Failed to complete verification suite: ' + (err.message || 'Unknown error'));
    } finally {
      setIsRunningSuite(false);
    }
  };

  const isApproved = userProfile?.compliance_status?.toLowerCase() === 'approved';

  const currentPayload = {
    ...evaluation,
    liveVerifications,
    evaluatedAt: new Date().toISOString(),
  };

  return (
    <div className="bg-paper border border-graphite-hairline rounded-2xl p-6 shadow-xl-3 transition-all space-y-6">
      {/* Header & Tier Controller */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-graphite-hairline">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand/10 border border-brand/20 rounded-xl text-brand">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-lg text-ink">Compliance Expectation Checklist</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-vellum border border-graphite-hairline text-slate">
                {rule.country} • {rule.countryName}
              </span>
              {lastSavedAt && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Report Persisted (
                  {format(new Date(lastSavedAt), 'MMM d, yyyy h:mm a')})
                </span>
              )}
            </div>
            <p className="text-xs text-slate mt-0.5">{rule.description}</p>
          </div>
        </div>

        {/* Business Tier Selector */}
        <div className="flex items-center gap-2 self-start lg:self-auto bg-vellum p-1 rounded-xl border border-graphite-hairline">
          <button
            type="button"
            onClick={() => setSelectedTier('api_fintech')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              selectedTier === 'api_fintech'
                ? 'bg-paper text-ink shadow-sm border border-graphite-hairline font-semibold'
                : 'text-slate hover:text-ink'
            }`}
          >
            API / Fintech Tier
          </button>
          <button
            type="button"
            onClick={() => setSelectedTier('general_business')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              selectedTier === 'general_business'
                ? 'bg-paper text-ink shadow-sm border border-graphite-hairline font-semibold'
                : 'text-slate hover:text-ink'
            }`}
          >
            General Business Tier
          </button>
        </div>
      </div>

      {/* Progress & Readiness Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-vellum/40 border border-graphite-hairline rounded-xl">
        <div className="space-y-1">
          <p className="text-[10px] text-slate uppercase font-semibold">Audit Readiness</p>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                evaluation.readinessPercentage >= 100
                  ? 'text-green-600'
                  : evaluation.readinessPercentage >= 70
                  ? 'text-amber-600'
                  : 'text-red-600'
              }`}
            >
              {evaluation.readinessPercentage}%
            </span>
            <span className="text-xs text-slate font-medium">
              ({evaluation.satisfiedCount}/{evaluation.totalRequirements} Satisfied)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-graphite-hairline h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full transition-all duration-500 ${
                evaluation.readinessPercentage >= 100
                  ? 'bg-green-500'
                  : evaluation.readinessPercentage >= 70
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${evaluation.readinessPercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate uppercase font-semibold">Satisfied</p>
          <p className="text-xl font-bold text-green-700 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {evaluation.satisfiedCount} Requirements
          </p>
          <p className="text-[10px] text-slate">Verified documents & registry checks</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate uppercase font-semibold">Pending Verification</p>
          <p className="text-xl font-bold text-amber-700 font-mono flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {evaluation.pendingCount} Pending
          </p>
          <p className="text-[10px] text-slate">Uploaded or unverified on live registry</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate uppercase font-semibold">Missing Mandatory</p>
          <p className="text-xl font-bold text-red-700 font-mono flex items-center gap-1.5">
            <XCircle className="w-4 h-4" />
            {evaluation.missingCount} Missing
          </p>
          <p className="text-[10px] text-slate">Strict requirement for {rule.tierLabel.split(' ')[0]}</p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-paper border border-graphite-hairline rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate">Automated Engine:</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">
            identity-service
          </span>
          <span className="text-xs text-slate">CAC • TIN • BVN • AML/PEP</span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {canManage && (
            <button
              type="button"
              onClick={() => persistReport(selectedTier, liveVerifications)}
              disabled={isSaving || isRunningSuite}
              className="px-3 py-2 text-xs font-medium text-slate hover:text-ink bg-vellum hover:bg-vellum/80 border border-graphite-hairline rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Save current checklist and verification snapshot to database"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Report Snapshot
            </button>
          )}

          <button
            type="button"
            onClick={handleRunVerificationSuite}
            disabled={isRunningSuite}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 disabled:opacity-50 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
          >
            {isRunningSuite ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running Verification Suite...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Run Automated Verification Suite
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Suite Execution Logs if present */}
      {suiteLog.length > 0 && (
        <div className="p-3 bg-vellum border border-graphite-hairline rounded-xl space-y-1 font-mono text-[11px] text-slate max-h-36 overflow-y-auto">
          {suiteLog.map((log, index) => (
            <p key={index} className="leading-relaxed">
              {log}
            </p>
          ))}
        </div>
      )}

      {/* Checklist Items Breakdown */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-ink uppercase tracking-wider">
          Compliance Checklist Requirements ({evaluation.items.length})
        </p>
        <div className="grid grid-cols-1 gap-2.5">
          {evaluation.items.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                item.status === 'satisfied'
                  ? 'bg-green-50/40 border-green-200/60'
                  : item.status === 'warning'
                  ? 'bg-amber-50/40 border-amber-200/60'
                  : item.status === 'pending'
                  ? 'bg-paper border-graphite-hairline'
                  : 'bg-red-50/30 border-red-200/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {item.status === 'satisfied' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : item.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : item.status === 'pending' ? (
                    <Clock className="w-4 h-4 text-amber-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-ink">{item.title}</p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        item.status === 'satisfied'
                          ? 'bg-green-100 text-green-800'
                          : item.status === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : item.status === 'pending'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-red-100 text-red-800 font-semibold'
                      }`}
                    >
                      {item.statusMessage}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate mt-0.5">{item.description}</p>
                  {item.details && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1 break-all">
                      {item.details.startsWith('http') ? (
                        <a
                          href={item.details}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline inline-flex items-center gap-1"
                        >
                          View Document Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        item.details
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Badge Tag */}
              <div className="self-end md:self-auto flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate uppercase bg-vellum px-2 py-0.5 rounded border border-graphite-hairline">
                  {item.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Human Decision Box & Sign-off */}
      <div className="p-4 bg-vellum/50 border border-graphite-hairline rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand" />
            Compliance Officer Sign-Off & Review
          </p>
          <p className="text-xs text-slate">
            {evaluation.isCompliant
              ? '✓ All mandatory expectations for this tier and country are met. You can safely sign off and approve.'
              : `⚠ ${evaluation.missingCount} requirement(s) are missing or require attention before final approval.`}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 self-end md:self-auto">
            {isApproved ? (
              <button
                type="button"
                onClick={() => onRejectClick(selectedTier, currentPayload)}
                disabled={isApprovalPending}
                className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                Disapprove / Revoke
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onRejectClick(selectedTier, currentPayload)}
                  disabled={isApprovalPending}
                  className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  Reject Compliance
                </button>
                <button
                  type="button"
                  onClick={() => onApproveClick(selectedTier, currentPayload)}
                  disabled={isApprovalPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 border border-green-600 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isApprovalPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Approve Compliance
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
