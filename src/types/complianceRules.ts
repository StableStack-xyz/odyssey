export type BusinessTier = 'api_fintech' | 'general_business';

export type ComplianceCheckStatus = 'satisfied' | 'pending' | 'warning' | 'missing';

export interface DocumentRequirement {
  key: string;
  label: string;
  description: string;
  required: boolean;
  isPolicy?: boolean;
  policyKey?: 'aml_policy' | 'kyc_policy' | 'data_protection_policy';
  docTypeMatch?: string[];
}

export interface VerificationRequirement {
  id: string;
  label: string;
  type: 'BUSINESS' | 'TIN' | 'BVN' | 'NIN' | 'AML' | 'UBO';
  target: 'company' | 'contact_person' | 'ubos';
  description: string;
  required: boolean;
}

export interface ComplianceRule {
  country: string;
  countryName: string;
  tier: BusinessTier;
  tierLabel: string;
  description: string;
  documents: DocumentRequirement[];
  verifications: VerificationRequirement[];
  minUboOwnershipThreshold: number; // e.g. 25%
  requireUboAddress: boolean;
  requireUboIdFrontAndBack: boolean;
}

export interface ComplianceCheckItem {
  id: string;
  category: 'document' | 'verification' | 'policy' | 'ubo';
  title: string;
  description: string;
  status: ComplianceCheckStatus;
  statusMessage: string;
  details?: string;
  actionableKey?: string;
}

export interface ComplianceEvaluation {
  rule: ComplianceRule;
  totalRequirements: number;
  satisfiedCount: number;
  pendingCount: number;
  missingCount: number;
  warningCount: number;
  readinessPercentage: number;
  isCompliant: boolean;
  items: ComplianceCheckItem[];
  missingRequiredTitles: string[];
}

export interface IdentityVerificationResult {
  type: string;
  status: 'VERIFIED' | 'PENDING' | 'REVIEW' | 'FAILED';
  provider?: string;
  checks?: {
    identifierExists?: boolean;
    nameMatch?: boolean;
    dobMatch?: boolean;
    companyActive?: boolean;
    watchlisted?: boolean;
    liveness?: boolean;
    faceMatch?: boolean;
  };
  matches?: {
    pep?: any[];
    sanctions?: any[];
    watchlist?: any[];
  };
  company?: {
    companyName?: string;
    rcNumber?: string;
    status?: string;
    directors?: any[];
    address?: string;
  };
  reason?: string | null;
  risk?: {
    level?: 'LOW' | 'MEDIUM' | 'HIGH';
    score?: number;
  };
  raw?: any;
}
