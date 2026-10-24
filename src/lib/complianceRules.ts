import type {
  BusinessTier,
  ComplianceRule,
  ComplianceEvaluation,
  ComplianceCheckItem,
  IdentityVerificationResult,
} from '../types/complianceRules';
import { identityApi, authApi } from './api';

// ==========================================
// PRE-DEFINED COMPLIANCE RULES MATRIX
// ==========================================

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // ----------------------------------------
  // NIGERIA (NG) — API / FINTECH
  // ----------------------------------------
  {
    country: 'NG',
    countryName: 'Nigeria',
    tier: 'api_fintech',
    tierLabel: 'API & Fintech (WaaS, Rails, Aggregators)',
    description:
      'High-assurance KYB for fintechs, crypto/virtual asset providers, and businesses integrating via API rails.',
    documents: [
      {
        key: 'cac_certificate',
        label: 'CAC Incorporation Certificate',
        description: 'Certificate of incorporation issued by the Corporate Affairs Commission (CAC)',
        required: true,
        docTypeMatch: ['cac_document', 'incorporation_cert', 'business_registration'],
      },
      {
        key: 'cac_status_report',
        label: 'CAC Status Report / Extract',
        description: 'Current CAC status report or particulars of directors / shareholding extract',
        required: true,
        docTypeMatch: ['status_report', 'cac_status_report', 'memorandum'],
      },
      {
        key: 'bank_statement',
        label: 'Corporate Bank Statement (6 Months)',
        description: 'Official corporate account bank statement reflecting active business transactions',
        required: true,
        docTypeMatch: ['bank_statement'],
      },
      {
        key: 'aml_policy',
        label: 'AML / CFT Policy',
        description: 'Approved Anti-Money Laundering & Counter-Terrorist Financing policy',
        required: true,
        isPolicy: true,
        policyKey: 'aml_policy',
      },
      {
        key: 'kyc_policy',
        label: 'KYC Policy',
        description: 'Documented customer onboarding and identity verification framework',
        required: true,
        isPolicy: true,
        policyKey: 'kyc_policy',
      },
      {
        key: 'data_protection_policy',
        label: 'Data Protection Policy (NDPR / GDPR)',
        description: 'Data security, privacy, and user information handling compliance policy',
        required: true,
        isPolicy: true,
        policyKey: 'data_protection_policy',
      },
    ],
    verifications: [
      {
        id: 'verif_cac',
        label: 'CAC Business Verification',
        type: 'BUSINESS',
        target: 'company',
        description: 'Company registration number verified with active status on the CAC registry',
        required: true,
      },
      {
        id: 'verif_tin',
        label: 'Tax Identification Number (TIN)',
        type: 'TIN',
        target: 'company',
        description: 'TIN verified and matching corporate tax registry with FIRS / JTB',
        required: true,
      },
      {
        id: 'verif_contact_bvn',
        label: 'Contact Person BVN & Identity',
        type: 'BVN',
        target: 'contact_person',
        description: 'Authorized signatory BVN verified with at least 80% name match',
        required: true,
      },
      {
        id: 'verif_aml_company',
        label: 'Company AML / Sanctions Screening',
        type: 'AML',
        target: 'company',
        description: 'Entity screened against UN, OFAC, UK, and national PEP & sanctions databases',
        required: true,
      },
      {
        id: 'verif_ubos',
        label: 'UBO Identification & AML Screening',
        type: 'UBO',
        target: 'ubos',
        description: 'All Ultimate Beneficial Owners with >=25% stake verified with Gov ID and AML screening',
        required: true,
      },
    ],
    minUboOwnershipThreshold: 25,
    requireUboAddress: true,
    requireUboIdFrontAndBack: true,
  },

  // ----------------------------------------
  // NIGERIA (NG) — GENERAL BUSINESS
  // ----------------------------------------
  {
    country: 'NG',
    countryName: 'Nigeria',
    tier: 'general_business',
    tierLabel: 'General Business (Direct Operations / Portal Use)',
    description:
      'Standard corporate onboarding for businesses using StableStack dashboard for direct payouts or settlement.',
    documents: [
      {
        key: 'cac_certificate',
        label: 'CAC Incorporation Certificate',
        description: 'Certificate of registration or incorporation with CAC',
        required: true,
        docTypeMatch: ['cac_document', 'incorporation_cert', 'business_registration'],
      },
      {
        key: 'cac_status_report',
        label: 'CAC Status Report',
        description: 'CAC status report (Optional for non-fintech businesses)',
        required: false,
        docTypeMatch: ['status_report', 'cac_status_report', 'memorandum'],
      },
      {
        key: 'bank_statement',
        label: 'Bank Statement (3 Months)',
        description: 'Recent corporate bank statement',
        required: true,
        docTypeMatch: ['bank_statement'],
      },
      {
        key: 'aml_policy',
        label: 'AML / CFT Policy (Optional)',
        description: 'Recommended for corporate compliance hygiene',
        required: false,
        isPolicy: true,
        policyKey: 'aml_policy',
      },
    ],
    verifications: [
      {
        id: 'verif_cac',
        label: 'CAC Business Verification',
        type: 'BUSINESS',
        target: 'company',
        description: 'Registration number verified on CAC',
        required: true,
      },
      {
        id: 'verif_tin',
        label: 'Tax Identification Number (TIN)',
        type: 'TIN',
        target: 'company',
        description: 'TIN verified with tax authority',
        required: true,
      },
      {
        id: 'verif_contact_bvn',
        label: 'Contact Person BVN',
        type: 'BVN',
        target: 'contact_person',
        description: 'Contact person identity verified',
        required: true,
      },
      {
        id: 'verif_ubos',
        label: 'UBO Verification (>=25%)',
        type: 'UBO',
        target: 'ubos',
        description: 'Valid government ID for all major beneficial owners',
        required: true,
      },
      {
        id: 'verif_aml_company',
        label: 'Sanctions & Watchlist Check',
        type: 'AML',
        target: 'company',
        description: 'Automated sanctions screening check',
        required: true,
      },
    ],
    minUboOwnershipThreshold: 25,
    requireUboAddress: true,
    requireUboIdFrontAndBack: false,
  },

  // ----------------------------------------
  // UNITED STATES (US) — API / FINTECH
  // ----------------------------------------
  {
    country: 'US',
    countryName: 'United States',
    tier: 'api_fintech',
    tierLabel: 'API & Fintech (US Entities / Cross-Border)',
    description: 'High-assurance KYB for US registered corporations and fintech partners.',
    documents: [
      {
        key: 'cert_incorporation',
        label: 'Certificate of Formation / Incorporation',
        description: 'Articles of Incorporation or State Certificate of Formation',
        required: true,
        docTypeMatch: ['cac_document', 'incorporation_cert', 'business_registration'],
      },
      {
        key: 'ein_letter',
        label: 'EIN Confirmation Letter (IRS Form CP 575 / 147C)',
        description: 'Official IRS documentation confirming Employer Identification Number (EIN)',
        required: true,
        docTypeMatch: ['tax_document', 'tin_cert', 'ein_document'],
      },
      {
        key: 'bank_statement',
        label: 'US Bank Statement / Voided Check (3 Months)',
        description: 'Corporate bank statement verifying account holder and ACH routing',
        required: true,
        docTypeMatch: ['bank_statement'],
      },
      {
        key: 'fincen_boi',
        label: 'FinCEN Beneficial Ownership Information (BOI)',
        description: 'FinCEN BOI filing confirmation report',
        required: true,
        docTypeMatch: ['status_report', 'boi_report'],
      },
      {
        key: 'aml_policy',
        label: 'BSA / AML / OFAC Compliance Program',
        description: 'Documented BSA/AML/OFAC compliance program and risk assessment',
        required: true,
        isPolicy: true,
        policyKey: 'aml_policy',
      },
    ],
    verifications: [
      {
        id: 'verif_business',
        label: 'State Secretary of State Registry Check',
        type: 'BUSINESS',
        target: 'company',
        description: 'Active corporate standing verified in state of formation',
        required: true,
      },
      {
        id: 'verif_tin',
        label: 'EIN / Tax Verification',
        type: 'TIN',
        target: 'company',
        description: 'IRS EIN verified against corporate entity name',
        required: true,
      },
      {
        id: 'verif_aml_company',
        label: 'OFAC & Global Sanctions Screening',
        type: 'AML',
        target: 'company',
        description: 'Automated screening against US OFAC SDN and global watchlists',
        required: true,
      },
      {
        id: 'verif_ubos',
        label: 'UBO Passport & OFAC Check (>=25%)',
        type: 'UBO',
        target: 'ubos',
        description: 'Passports / State IDs and AML screening on all 25%+ beneficial owners',
        required: true,
      },
    ],
    minUboOwnershipThreshold: 25,
    requireUboAddress: true,
    requireUboIdFrontAndBack: true,
  },

  // ----------------------------------------
  // GLOBAL / DEFAULT JURISDICTION
  // ----------------------------------------
  {
    country: 'GLOBAL',
    countryName: 'International / Other Jurisdictions',
    tier: 'general_business',
    tierLabel: 'Standard Corporate Onboarding',
    description: 'International KYB standard for entities outside primary domestic markets.',
    documents: [
      {
        key: 'cert_incorporation',
        label: 'Certificate of Incorporation / Registry Extract',
        description: 'Official corporate registration from national registrar',
        required: true,
        docTypeMatch: ['cac_document', 'incorporation_cert', 'business_registration'],
      },
      {
        key: 'tax_certificate',
        label: 'Tax Registration Certificate',
        description: 'National tax authority registration or certificate',
        required: true,
        docTypeMatch: ['tax_document', 'tin_cert'],
      },
      {
        key: 'bank_statement',
        label: 'Corporate Bank Statement (3 Months)',
        description: 'Bank statement verifying active commercial account',
        required: true,
        docTypeMatch: ['bank_statement'],
      },
      {
        key: 'aml_policy',
        label: 'AML / Compliance Policy (Optional)',
        description: 'Corporate AML framework if available',
        required: false,
        isPolicy: true,
        policyKey: 'aml_policy',
      },
    ],
    verifications: [
      {
        id: 'verif_business',
        label: 'Commercial Registry Check',
        type: 'BUSINESS',
        target: 'company',
        description: 'Company registration number verified with active legal status',
        required: true,
      },
      {
        id: 'verif_aml_company',
        label: 'Global Sanctions & PEP Screening',
        type: 'AML',
        target: 'company',
        description: 'Screening against global sanctions and political exposed persons databases',
        required: true,
      },
      {
        id: 'verif_ubos',
        label: 'Beneficial Owners Identification (>=25%)',
        type: 'UBO',
        target: 'ubos',
        description: 'Valid passport and address for beneficial owners holding >= 25% ownership',
        required: true,
      },
    ],
    minUboOwnershipThreshold: 25,
    requireUboAddress: true,
    requireUboIdFrontAndBack: false,
  },
];

// ==========================================
// RESOLVER & EVALUATOR FUNCTIONS
// ==========================================

const CUSTOM_RULES_STORAGE_KEY = 'stablestack_compliance_rules_v1';

export function getCustomRules(): ComplianceRule[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_RULES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getAllComplianceRules(): ComplianceRule[] {
  const custom = getCustomRules();
  const merged = [...COMPLIANCE_RULES];
  for (const cRule of custom) {
    const idx = merged.findIndex((r) => r.country === cRule.country && r.tier === cRule.tier);
    if (idx >= 0) {
      merged[idx] = cRule;
    } else {
      merged.push(cRule);
    }
  }
  return merged;
}

export function saveComplianceRule(rule: ComplianceRule): void {
  if (typeof window === 'undefined') return;
  const current = getCustomRules();
  const idx = current.findIndex((r) => r.country === rule.country && r.tier === rule.tier);
  if (idx >= 0) {
    current[idx] = rule;
  } else {
    current.push(rule);
  }
  localStorage.setItem(CUSTOM_RULES_STORAGE_KEY, JSON.stringify(current));
}

export function resetComplianceRules(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CUSTOM_RULES_STORAGE_KEY);
}

export function isCustomRule(country: string, tier: BusinessTier): boolean {
  const custom = getCustomRules();
  return custom.some((r) => r.country === country && r.tier === tier);
}

export function resetSpecificComplianceRule(country: string, tier: BusinessTier): void {
  if (typeof window === 'undefined') return;
  const current = getCustomRules();
  const filtered = current.filter((r) => !(r.country === country && r.tier === tier));
  localStorage.setItem(CUSTOM_RULES_STORAGE_KEY, JSON.stringify(filtered));
}

export function getComplianceRule(
  countryCode?: string,
  tier: BusinessTier = 'general_business'
): ComplianceRule {
  const normalizedCountry = (countryCode || 'NG').toUpperCase();
  const allRules = getAllComplianceRules();

  // 1. Try exact country + tier
  const exact = allRules.find(
    (r) => r.country === normalizedCountry && r.tier === tier
  );
  if (exact) return exact;

  // 2. Try exact country with fallback tier
  const countryFallback = allRules.find(
    (r) => r.country === normalizedCountry
  );
  if (countryFallback) return countryFallback;

  // 3. Fallback to GLOBAL rule
  const globalRule = allRules.find(
    (r) => r.country === 'GLOBAL' && r.tier === tier
  ) || allRules.find((r) => r.country === 'GLOBAL')!;

  return globalRule;
}

export function evaluateMerchantCompliance(
  merchant: any,
  documents: any[] = [],
  rule: ComplianceRule,
  liveVerifications: Record<string, IdentityVerificationResult> = {}
): ComplianceEvaluation {
  const items: ComplianceCheckItem[] = [];

  // 1. Evaluate Document Requirements
  for (const docReq of rule.documents) {
    if (docReq.isPolicy && docReq.policyKey) {
      // Check policy in merchant policies
      const policyVal =
        merchant?.policies?.[docReq.policyKey] ||
        (docReq.policyKey === 'aml_policy' ? merchant?.aml_policy || merchant?.amlPolicy : '') ||
        (docReq.policyKey === 'kyc_policy' ? merchant?.kyc_policy || merchant?.kycPolicy : '') ||
        (docReq.policyKey === 'data_protection_policy' ? merchant?.data_protection_policy || merchant?.dataProtectionPolicy : '');

      const isUploaded = Boolean(policyVal && typeof policyVal === 'string' && policyVal.trim().length > 0);

      items.push({
        id: `doc_${docReq.key}`,
        category: 'policy',
        title: docReq.label,
        description: docReq.description,
        status: isUploaded ? 'satisfied' : docReq.required ? 'missing' : 'pending',
        statusMessage: isUploaded ? 'Document uploaded & on file' : docReq.required ? 'Missing (Required for this tier)' : 'Not uploaded (Optional)',
        details: isUploaded ? String(policyVal) : undefined,
        actionableKey: docReq.key,
      });
    } else {
      // Check uploaded user documents
      const matchDoc = documents.find((d) => {
        const type = (d.doc_type || '').toLowerCase();
        if (docReq.docTypeMatch?.some((m) => type.includes(m.toLowerCase()))) return true;
        return type.includes(docReq.key.toLowerCase());
      });

      const hasDoc = Boolean(matchDoc && matchDoc.doc_image);
      const isApproved = matchDoc?.approval_status?.toLowerCase() === 'approved';

      let status: 'satisfied' | 'pending' | 'warning' | 'missing' = 'missing';
      let msg = 'Missing document';

      if (hasDoc) {
        if (isApproved) {
          status = 'satisfied';
          msg = 'Approved by compliance';
        } else {
          status = 'pending';
          msg = 'Uploaded — Pending officer verification';
        }
      } else if (!docReq.required) {
        status = 'pending';
        msg = 'Optional document (Not uploaded)';
      }

      items.push({
        id: `doc_${docReq.key}`,
        category: 'document',
        title: docReq.label,
        description: docReq.description,
        status,
        statusMessage: msg,
        details: matchDoc?.doc_image,
        actionableKey: docReq.key,
      });
    }
  }

  // 2. Evaluate Verification Requirements
  for (const vReq of rule.verifications) {
    const liveResult = liveVerifications[vReq.id];

    if (vReq.type === 'BUSINESS') {
      const isDbVerified = Boolean(merchant?.is_registration_number_verified);
      const regNo = merchant?.registration_number;

      let status: 'satisfied' | 'pending' | 'warning' | 'missing' = 'missing';
      let msg = 'Registration number not provided';
      let details: string | undefined = undefined;

      if (liveResult) {
        if (liveResult.status === 'VERIFIED') {
          status = 'satisfied';
          msg = `Verified Active on Corporate Registry (${liveResult.provider || 'registry'})`;
          details = liveResult.company?.companyName ? `Name: ${liveResult.company.companyName}` : undefined;
        } else if (liveResult.status === 'REVIEW') {
          status = 'warning';
          msg = `Review Flagged: ${liveResult.reason || 'Company Status Inactive or Discrepancy'}`;
        } else {
          status = 'missing';
          msg = `Verification Failed: ${liveResult.reason || 'Entity not found'}`;
        }
      } else if (isDbVerified) {
        status = 'satisfied';
        msg = `Verified: ${regNo || 'Registration Number on Record'}`;
      } else if (regNo) {
        status = 'pending';
        msg = `Submitted: ${regNo} (Unverified on live registry)`;
      }

      items.push({
        id: vReq.id,
        category: 'verification',
        title: vReq.label,
        description: vReq.description,
        status,
        statusMessage: msg,
        details,
      });
    } else if (vReq.type === 'TIN') {
      const isDbVerified = Boolean(merchant?.is_tax_verified);
      const tin = merchant?.tax_identification_number;

      let status: 'satisfied' | 'pending' | 'warning' | 'missing' = 'missing';
      let msg = 'Tax ID not provided';

      if (liveResult) {
        if (liveResult.status === 'VERIFIED') {
          status = 'satisfied';
          msg = `Tax ID Active & Verified with Tax Authority (${liveResult.provider || 'system'})`;
        } else {
          status = 'missing';
          msg = `TIN verification failed: ${liveResult.reason || 'Invalid TIN'}`;
        }
      } else if (isDbVerified) {
        status = 'satisfied';
        msg = `Verified: ${tin || 'Corporate TIN'}`;
      } else if (tin) {
        status = 'pending';
        msg = `Submitted: ${tin} (Unverified)`;
      }

      items.push({
        id: vReq.id,
        category: 'verification',
        title: vReq.label,
        description: vReq.description,
        status,
        statusMessage: msg,
      });
    } else if (vReq.type === 'BVN') {
      const isDbVerified = Boolean(merchant?.contact_person?.is_bvn_verified || merchant?.is_contact_person_bvn_verified);
      const bvn = merchant?.contact_person?.bvn || merchant?.contactPerson_bvn;

      let status: 'satisfied' | 'pending' | 'warning' | 'missing' = 'missing';
      let msg = 'Contact person BVN not provided';

      if (liveResult) {
        if (liveResult.status === 'VERIFIED') {
          status = 'satisfied';
          msg = `BVN Verified & Identity Match Confirmed (${liveResult.provider || 'identity-service'})`;
        } else {
          status = 'warning';
          msg = `BVN Match Warning: ${liveResult.reason || 'Discrepancy detected'}`;
        }
      } else if (isDbVerified) {
        status = 'satisfied';
        msg = 'Verified Contact Person BVN';
      } else if (bvn) {
        status = 'pending';
        msg = `Submitted: ${bvn} (Unverified)`;
      }

      items.push({
        id: vReq.id,
        category: 'verification',
        title: vReq.label,
        description: vReq.description,
        status,
        statusMessage: msg,
      });
    } else if (vReq.type === 'AML') {
      let status: 'satisfied' | 'pending' | 'warning' | 'missing' = 'pending';
      let msg = 'Automated AML screening not run';
      let details: string | undefined = undefined;

      if (liveResult) {
        if (liveResult.status === 'VERIFIED') {
          status = 'satisfied';
          msg = 'Clear: 0 Sanctions, 0 PEP hits, Low Risk';
        } else if (liveResult.status === 'REVIEW') {
          status = 'warning';
          msg = `Alert: PEP or Watchlist match (${liveResult.reason || 'Review required'})`;
          details = JSON.stringify(liveResult.matches || liveResult.reason);
        } else {
          status = 'missing';
          msg = `Sanctions hit or high risk flag: ${liveResult.reason || 'High Risk'}`;
        }
      }

      items.push({
        id: vReq.id,
        category: 'verification',
        title: vReq.label,
        description: vReq.description,
        status,
        statusMessage: msg,
        details,
      });
    } else if (vReq.type === 'UBO') {
      const owners: any[] = Array.isArray(merchant?.business_owners) ? merchant.business_owners : [];
      const threshold = rule.minUboOwnershipThreshold || 25;
      const majorOwners = owners.filter((o) => {
        const pct = parseFloat(o.ownership_percentage || '0');
        return isNaN(pct) || pct >= threshold || o.is_beneficial_owner;
      });

      let status: 'satisfied' | 'pending' | 'warning' | 'missing' = 'missing';
      let msg = 'No beneficial owners (UBOs) registered';
      let details: string | undefined = undefined;

      if (majorOwners.length > 0) {
        const missingIds = majorOwners.filter((o) => !o.id_front && !o.id_number);
        const missingAddresses = rule.requireUboAddress ? majorOwners.filter((o) => !o.address?.street1 && !o.address?.city) : [];

        if (missingIds.length > 0) {
          status = 'warning';
          msg = `${majorOwners.length - missingIds.length}/${majorOwners.length} major UBOs have ID on file (${missingIds.length} missing ID)`;
        } else if (missingAddresses.length > 0) {
          status = 'warning';
          msg = `All IDs present, but ${missingAddresses.length} UBO(s) missing address`;
        } else {
          status = 'satisfied';
          msg = `All ${majorOwners.length} major UBOs (>=${threshold}%) verified with IDs on file`;
        }
        details = majorOwners.map((o) => `${o.firstName || ''} ${o.lastName || ''} (${o.ownership_percentage || 0}%)`).join(', ');
      }

      items.push({
        id: vReq.id,
        category: 'ubo',
        title: vReq.label,
        description: vReq.description,
        status,
        statusMessage: msg,
        details,
      });
    }
  }

  // Count stats
  const total = items.length;
  const satisfied = items.filter((i) => i.status === 'satisfied').length;
  const pending = items.filter((i) => i.status === 'pending').length;
  const warning = items.filter((i) => i.status === 'warning').length;
  const missing = items.filter((i) => i.status === 'missing').length;

  const readiness = total > 0 ? Math.round((satisfied / total) * 100) : 0;
  const missingTitles = items.filter((i) => i.status === 'missing' || i.status === 'warning').map((i) => i.title);

  return {
    rule,
    totalRequirements: total,
    satisfiedCount: satisfied,
    pendingCount: pending,
    warningCount: warning,
    missingCount: missing,
    readinessPercentage: readiness,
    isCompliant: missing === 0 && warning === 0,
    items,
    missingRequiredTitles: missingTitles,
  };
}

// ==========================================
// API CALLS TO IDENTITY-SERVICE VIA GATEWAY
// ==========================================

export async function runBusinessVerification(
  rcNumber: string,
  companyName: string,
  country: string = 'NG'
): Promise<IdentityVerificationResult> {
  const payload = {
    type: 'BUSINESS',
    country: country.toUpperCase(),
    subject: {
      rcNumber: rcNumber.trim(),
      companyName: companyName.trim(),
    },
  };

  const res = await identityApi.post('/v1/verifications', payload);
  return res.data?.data || res.data;
}

export async function runTaxVerification(
  tin: string,
  country: string = 'NG'
): Promise<IdentityVerificationResult> {
  const payload = {
    type: 'TIN',
    country: country.toUpperCase(),
    subject: {
      identifier: tin.trim(),
    },
  };

  const res = await identityApi.post('/v1/verifications', payload);
  return res.data?.data || res.data;
}

export async function runBvnVerification(
  bvn: string,
  firstName?: string,
  lastName?: string,
  country: string = 'NG'
): Promise<IdentityVerificationResult> {
  const payload = {
    type: 'BVN',
    country: country.toUpperCase(),
    subject: {
      identifier: bvn.trim(),
      ...(firstName ? { firstName: firstName.trim() } : {}),
      ...(lastName ? { lastName: lastName.trim() } : {}),
    },
  };

  const res = await identityApi.post('/v1/verifications', payload);
  return res.data?.data || res.data;
}

export async function runAmlScreening(
  nameOrCompany: { firstName?: string; lastName?: string; companyName?: string },
  country: string = 'NG'
): Promise<IdentityVerificationResult> {
  const payload = {
    type: 'AML',
    country: country.toUpperCase(),
    subject: {
      ...(nameOrCompany.firstName ? { firstName: nameOrCompany.firstName.trim() } : {}),
      ...(nameOrCompany.lastName ? { lastName: nameOrCompany.lastName.trim() } : {}),
      ...(nameOrCompany.companyName ? { companyName: nameOrCompany.companyName.trim() } : {}),
    },
  };

  const res = await identityApi.post('/v1/verifications', payload);
  return res.data?.data || res.data;
}

export async function saveComplianceReport(
  userId: string,
  tier: BusinessTier,
  report: any,
  notes?: string
) {
  const res = await authApi.post(`/api/merchants/onboard/compliance-report/${userId}`, {
    tier,
    report,
    notes,
  });
  return res.data?.data || res.data;
}
