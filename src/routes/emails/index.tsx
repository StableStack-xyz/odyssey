import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Modal } from '../../components/ui/Modal';
import { StatsCard } from '../../components/ui/StatsCard';
import { RichTextEditor, type RichTextEditorRef } from '../../components/ui/RichTextEditor';
import {
  Mail,
  Send,
  Upload,
  Users,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Eye,
  Smartphone,
  Monitor,
  Loader2,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  X,
  ExternalLink,
  Tag,
  Code,
  Copy,
  Check,
  SlidersHorizontal,
  Clock,
  Filter,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { authApi } from '../../lib/api';
import { toast } from 'sonner';
import { APP_NAME } from '../../lib/constants';
import { usePermissions } from '../../hooks/usePermissions';
import { AccessDenied } from '../../components/auth/AccessDenied';

export const Route = createFileRoute('/emails/')({
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
      { title: `Email Campaigns & Broadcasts - ${APP_NAME}` },
      { name: 'description', content: 'Bulk emailing system using Zoho ZeptoMail Generic Template' },
    ],
  }),
  component: EmailBroadcastPage,
});

interface ImportedRecipient {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
}

const VERIFIED_SENDERS = [
  { email: 'hello@stablestack.xyz', label: 'hello@stablestack.xyz (Default)' },
  { email: 'notifications@stablestack.xyz', label: 'notifications@stablestack.xyz (System Alerts)' },
  { email: 'support@stablestack.xyz', label: 'support@stablestack.xyz (Customer Support)' },
];

const TEMPLATE_PRESETS = [
  {
    name: 'Platform Update',
    subject: 'Important Platform Update from StableStack',
    listContent: `<p>We have rolled out several infrastructure enhancements to make your stablecoin settlement and payout flows significantly faster and more reliable:</p><ul><li><b>Instant Settlement:</b> Higher throughput across supported payout corridors.</li><li><b>Real-Time Monitoring:</b> Improved transaction tracking and status webhooks.</li><li><b>Enhanced Security:</b> Strengthened compliance verification and account safeguards.</li></ul>`,
    additionalMessage: 'If you have any questions or require custom limits, our 24/7 engineering and support team is always available to assist you.',
  },
  {
    name: 'Scheduled Maintenance',
    subject: 'Notice of Scheduled System Maintenance',
    listContent: `<p>Please be advised that we will be performing routine system maintenance on our payment processing rails.</p><blockquote><b>Maintenance Window:</b> Sunday, 02:00 AM – 04:00 AM UTC</blockquote><p>During this window, API transaction submissions and portal access may experience brief intermittent pauses. All pending settlements will process automatically once maintenance concludes.</p>`,
    additionalMessage: 'No action is required on your part. Thank you for your patience and partnership.',
  },
  {
    name: 'Compliance Verification',
    subject: 'Action Required: Verify Account Information',
    listContent: `<p>As part of our periodic regulatory compliance review, please review your account details and ensure your business records are <u>fully up to date</u> to maintain uninterrupted high-volume processing.</p>`,
    additionalMessage: 'Please log in to your StableStack account settings to verify or update your compliance documents.',
  },
];

const ZEPTO_TEMPLATES = [
  { key: 'generic-template', name: 'Generic Template' },
  { key: 'custom', name: '+ Enter Custom ZeptoMail Template Key / Alias' },
];

const MERGE_TAGS = [
  { tag: '{{user_name}}', label: 'Business / Recipient Name' },
  { tag: '{{first_name}}', label: 'First Name' },
  { tag: '{{company}}', label: 'Company / Business' },
  { tag: '{{email}}', label: 'Email' },
  { tag: '{{date}}', label: 'Current Date' },
];

const PLATFORM_PRESETS = [
  {
    id: 'all',
    label: 'All Active Users',
    desc: 'All non-blocked registered platform accounts',
    role: 'all' as const,
    compliance: 'all' as const,
    status: 'active' as const,
    icon: Users,
  },
  {
    id: 'merchants',
    label: 'Merchants Only',
    desc: 'Verified corporate & merchant accounts',
    role: 'merchant' as const,
    compliance: 'all' as const,
    status: 'active' as const,
    icon: ShieldCheck,
  },
  {
    id: 'pending',
    label: 'Pending Compliance',
    desc: 'Awaiting KYC / KYB document verification',
    role: 'all' as const,
    compliance: 'Pending' as const,
    status: 'active' as const,
    icon: Clock,
  },
  {
    id: 'approved',
    label: 'Approved KYC/KYB',
    desc: 'Cleared accounts with verified KYC/KYB records',
    role: 'all' as const,
    compliance: 'Approved' as const,
    status: 'active' as const,
    icon: CheckCircle2,
  },
  {
    id: 'not_submitted',
    label: 'KYC Not Submitted',
    desc: 'Registered accounts pending initial document upload',
    role: 'all' as const,
    compliance: 'NotSubmitted' as const,
    status: 'active' as const,
    icon: HelpCircle,
  },
  {
    id: 'rejected',
    label: 'Rejected KYC',
    desc: 'Accounts requiring compliance re-submission',
    role: 'all' as const,
    compliance: 'Rejected' as const,
    status: 'active' as const,
    icon: AlertCircle,
  },
  {
    id: 'blocked',
    label: 'Blocked Accounts',
    desc: 'Suspended accounts for critical legal notices',
    role: 'all' as const,
    compliance: 'all' as const,
    status: 'blocked' as const,
    icon: ShieldAlert,
  },
];

function EmailBroadcastPage() {
  const { user: currentAdmin, isFullAccess, canRead, canWrite } = usePermissions();

  // ZeptoMail template state
  const [selectedTemplate, setSelectedTemplate] = useState('generic-template');
  const [customTemplateKey, setCustomTemplateKey] = useState('');

  // Target mode state
  const [targetType, setTargetType] = useState<'platform_users' | 'imported'>('platform_users');
  const [platformPreset, setPlatformPreset] = useState<'all' | 'merchants' | 'pending' | 'approved' | 'rejected' | 'not_submitted' | 'blocked' | 'custom'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'merchant'>('all');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected' | 'NotSubmitted'>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'active' | 'blocked' | 'all'>('active');

  // Imported recipients state
  const [rawPastedEmails, setRawPastedEmails] = useState('');
  const [importedList, setImportedList] = useState<ImportedRecipient[]>([]);
  const [importStats, setImportStats] = useState({ valid: 0, duplicates: 0, invalid: 0 });
  const [csvFileName, setCsvFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email sender settings
  const [fromEmail, setFromEmail] = useState('hello@stablestack.xyz');
  const [customFromEmail, setCustomFromEmail] = useState('');
  const [fromName, setFromName] = useState('StableStack');
  const [replyTo, setReplyTo] = useState('');
  const [ccList, setCcList] = useState('');

  // Template merge fields matching ZeptoMail Generic Notification Template
  const [subject, setSubject] = useState(TEMPLATE_PRESETS[0].subject);
  const [listContent, setListContent] = useState(TEMPLATE_PRESETS[0].listContent);
  const [additionalMessage, setAdditionalMessage] = useState(TEMPLATE_PRESETS[0].additionalMessage);

  // Preview tab & device state
  const [previewTab, setPreviewTab] = useState<'visual' | 'json'>('visual');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedJson, setCopiedJson] = useState(false);

  // Modals state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(currentAdmin?.email || '');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);

  // Textarea & Rich Editor refs
  const richEditorRef = useRef<RichTextEditorRef>(null);
  const additionalMessageRef = useRef<HTMLTextAreaElement>(null);
  const [activeFocusField, setActiveFocusField] = useState<'listContent' | 'additionalMessage'>('listContent');

  // Fetch platform user counts with flexible audience filter parameters
  const { data: recipientCounts, isLoading: isLoadingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['broadcast-recipients-summary', roleFilter, complianceFilter, accountStatusFilter],
    queryFn: async () => {
      const res = await authApi.get('/api/users/auth/broadcast/recipients-summary', {
        params: {
          role: roleFilter,
          complianceStatus: complianceFilter,
          accountStatus: accountStatusFilter,
        },
      });
      return (
        res.data?.data || {
          total: 0,
          merchants: 0,
          pendingCompliance: 0,
          approvedCompliance: 0,
          rejectedCompliance: 0,
          notSubmittedCompliance: 0,
          blockedAccounts: 0,
          filteredCount: 0,
        }
      );
    },
    enabled: isFullAccess || canRead('emails'),
  });

  // Test Email Mutation
  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const activeSender = fromEmail === 'custom' ? customFromEmail : fromEmail;
      const activeTemplateKey = selectedTemplate === 'custom' ? customTemplateKey : selectedTemplate;
      const res = await authApi.post('/api/users/auth/broadcast/test', {
        toEmail: testEmailAddress,
        templateKey: activeTemplateKey,
        subject,
        listContent,
        additionalMessage,
        messageContent: listContent,
        fromEmail: activeSender,
        fromName,
        replyTo: replyTo || undefined,
        cc: ccList ? ccList.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success(`Test email dispatched successfully to ${testEmailAddress}`);
      setIsTestModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to send test email');
    },
  });

  // Bulk Broadcast Mutation
  const sendBroadcastMutation = useMutation({
    mutationFn: async () => {
      const activeSender = fromEmail === 'custom' ? customFromEmail : fromEmail;
      const activeTemplateKey = selectedTemplate === 'custom' ? customTemplateKey : selectedTemplate;
      const payload: any = {
        targetType,
        targetFilter: targetType === 'platform_users' ? platformPreset : undefined,
        roleFilter: targetType === 'platform_users' ? roleFilter : undefined,
        complianceFilter: targetType === 'platform_users' ? complianceFilter : undefined,
        statusFilter: targetType === 'platform_users' ? accountStatusFilter : undefined,
        importedRecipients: targetType === 'imported' ? importedList : undefined,
        templateKey: activeTemplateKey,
        fromEmail: activeSender,
        fromName,
        replyTo: replyTo || undefined,
        cc: ccList ? ccList.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        subject,
        listContent,
        additionalMessage,
        messageContent: listContent,
      };

      const res = await authApi.post('/api/users/auth/broadcast/send', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      setSendResult(data);
      setIsConfirmModalOpen(false);
      toast.success(`Broadcast completed: ${data?.sent || 0} sent, ${data?.failed || 0} failed`);
    },
    onError: (err: any) => {
      setIsConfirmModalOpen(false);
      toast.error(err?.response?.data?.message || err?.message || 'Failed to dispatch email broadcast');
    },
  });

  // Parse CSV File helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseImportText(text);
    };
    reader.readAsText(file);
  };

  // Parse text or CSV content
  const parseImportText = (text: string) => {
    if (!text || !text.trim()) {
      setImportedList([]);
      setImportStats({ valid: 0, duplicates: 0, invalid: 0 });
      return;
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const seenEmails = new Set<string>();
    const validRecipients: ImportedRecipient[] = [];
    let duplicateCount = 0;
    let invalidCount = 0;

    let hasHeader = false;
    let emailIdx = 0;
    let nameIdx = -1;
    let companyIdx = -1;

    if (lines.length > 0 && lines[0].includes(',')) {
      const headerParts = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const foundEmailIdx = headerParts.findIndex((h) => h.includes('email') || h.includes('mail'));
      if (foundEmailIdx !== -1) {
        hasHeader = true;
        emailIdx = foundEmailIdx;
        nameIdx = headerParts.findIndex((h) => h.includes('name') || h.includes('first'));
        companyIdx = headerParts.findIndex(
          (h) => h.includes('business') || h.includes('company') || h.includes('org')
        );
      }
    }

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      let email = '';
      let name = '';
      let businessName = '';

      if (line.includes(',')) {
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        email = parts[emailIdx] || '';
        if (companyIdx !== -1 && parts[companyIdx]) {
          businessName = parts[companyIdx];
        }
        if (nameIdx !== -1 && parts[nameIdx]) {
          name = parts[nameIdx];
        } else if (parts.length > 1 && emailIdx === 0) {
          name = parts[1];
        }
      } else {
        email = line.trim();
      }

      email = email.toLowerCase().trim();

      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isValidEmail) {
        invalidCount++;
        continue;
      }

      if (seenEmails.has(email)) {
        duplicateCount++;
        continue;
      }

      // Prioritize businessName if provided, otherwise individual name
      const resolvedName = businessName || name || undefined;

      seenEmails.add(email);
      validRecipients.push({
        email,
        name: resolvedName,
        businessName: businessName || undefined,
        firstName: name ? name.split(' ')[0] : businessName || undefined,
      });
    }

    setImportedList(validRecipients);
    setImportStats({
      valid: validRecipients.length,
      duplicates: duplicateCount,
      invalid: invalidCount,
    });
  };

  // Insert merge tag at active field cursor
  const insertMergeTag = (tag: string) => {
    if (activeFocusField === 'additionalMessage' && additionalMessageRef.current) {
      const el = additionalMessageRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const prev = additionalMessage;
      const next = prev.substring(0, start) + tag + prev.substring(end);
      setAdditionalMessage(next);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
      return;
    }

    if (richEditorRef.current) {
      richEditorRef.current.insertTag(tag);
    } else {
      setListContent((prev) => prev + ` ${tag}`);
    }
  };

  // Selected recipient count
  const estimatedCount = useMemo(() => {
    if (targetType === 'imported') {
      return importedList.length;
    }
    if (!recipientCounts) return 0;
    if (recipientCounts.filteredCount !== undefined) {
      return recipientCounts.filteredCount;
    }
    return recipientCounts.total || 0;
  }, [targetType, importedList, recipientCounts]);

  // Check whether current filter parameters match any preset
  const checkAndSyncPreset = (
    role: 'all' | 'merchant',
    comp: 'all' | 'Pending' | 'Approved' | 'Rejected' | 'NotSubmitted',
    status: 'active' | 'blocked' | 'all'
  ) => {
    const matched = PLATFORM_PRESETS.find(
      (p) => p.role === role && p.compliance === comp && p.status === status
    );
    if (matched) {
      setPlatformPreset(matched.id as any);
    } else {
      setPlatformPreset('custom');
    }
  };

  // Helper to apply preset
  const applyPreset = (preset: (typeof PLATFORM_PRESETS)[number]) => {
    setPlatformPreset(preset.id as any);
    setRoleFilter(preset.role);
    setComplianceFilter(preset.compliance);
    setAccountStatusFilter(preset.status);
  };

  // Filter change handlers
  const handleRoleChange = (newRole: 'all' | 'merchant') => {
    setRoleFilter(newRole);
    checkAndSyncPreset(newRole, complianceFilter, accountStatusFilter);
  };

  const handleComplianceChange = (
    newCompliance: 'all' | 'Pending' | 'Approved' | 'Rejected' | 'NotSubmitted'
  ) => {
    setComplianceFilter(newCompliance);
    checkAndSyncPreset(roleFilter, newCompliance, accountStatusFilter);
  };

  const handleStatusChange = (newStatus: 'active' | 'blocked' | 'all') => {
    setAccountStatusFilter(newStatus);
    checkAndSyncPreset(roleFilter, complianceFilter, newStatus);
  };

  const resetFilters = () => {
    setPlatformPreset('all');
    setRoleFilter('all');
    setComplianceFilter('all');
    setAccountStatusFilter('active');
  };

  const getPresetCount = (id: string) => {
    if (!recipientCounts) return 0;
    switch (id) {
      case 'all':
        return recipientCounts.total || 0;
      case 'merchants':
        return recipientCounts.merchants || 0;
      case 'pending':
        return recipientCounts.pendingCompliance || 0;
      case 'approved':
        return recipientCounts.approvedCompliance || 0;
      case 'not_submitted':
        return recipientCounts.notSubmittedCompliance || 0;
      case 'rejected':
        return recipientCounts.rejectedCompliance || 0;
      case 'blocked':
        return recipientCounts.blockedAccounts || 0;
      default:
        return 0;
    }
  };

  const isCustomFiltered =
    roleFilter !== 'all' || complianceFilter !== 'all' || accountStatusFilter !== 'active';

  const getFilterSummaryText = () => {
    if (targetType === 'imported') {
      return `Imported List (${csvFileName || `${importedList.length} recipient${importedList.length === 1 ? '' : 's'}`})`;
    }
    const parts: string[] = [];
    if (roleFilter === 'merchant') parts.push('Merchants');
    else parts.push('All Roles');

    if (complianceFilter === 'Pending') parts.push('Pending KYC');
    else if (complianceFilter === 'Approved') parts.push('Approved KYC');
    else if (complianceFilter === 'Rejected') parts.push('Rejected KYC');
    else if (complianceFilter === 'NotSubmitted') parts.push('KYC Not Submitted');

    if (accountStatusFilter === 'active') parts.push('Active Only');
    else if (accountStatusFilter === 'blocked') parts.push('Blocked Only');
    else parts.push('Active & Blocked');

    return parts.join(' • ');
  };

  // JSON Merge Info representation (matching ZeptoMail console)
  const mergeInfoJson = useMemo(() => {
    return JSON.stringify(
      {
        subject: subject || 'subject_value',
        user_name: 'user_name_value',
        list_content: listContent || 'list_content_value',
        additional_message: additionalMessage || 'additional_message_value',
      },
      null,
      2
    );
  }, [subject, listContent, additionalMessage]);

  // Live compiled preview matching the exact Zoho ZeptoMail Generic Notification Template layout
  const compiledPreviewHtml = useMemo(() => {
    const formatMergeTags = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\{\{user_name\}\}/gi, 'Gabriel')
        .replace(/\{\{User_name\}\}/gi, 'Gabriel')
        .replace(/\{\{first_name\}\}/gi, 'Gabriel')
        .replace(/\{\{name\}\}/gi, 'Gabriel Ajenifuja')
        .replace(/\{\{email\}\}/gi, 'gabriel@stablestack.xyz')
        .replace(/\{\{company\}\}/gi, 'Acme Global Corp')
        .replace(
          /\{\{date\}\}/gi,
          new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        );
    };

    const formattedListContent = formatMergeTags(listContent);
    const formattedAdditional = formatMergeTags(additionalMessage).replace(/\n/g, '<br/>');
    const displaySubject = subject || '{{subject}}';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      margin: 0;
      padding: 24px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8f9fa;
      color: #1a1a24;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e9ecef;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }
    /* Light Lavender Header with watermark effect matching ZeptoMail template */
    .header {
      background: #f4effb;
      position: relative;
      padding: 36px 36px 32px 36px;
      overflow: hidden;
    }
    .header-watermark {
      position: absolute;
      right: -20px;
      top: -20px;
      width: 190px;
      height: 190px;
      opacity: 0.18;
      pointer-events: none;
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 24px;
    }
    .logo-text {
      font-size: 21px;
      font-weight: 800;
      color: #24133d;
      letter-spacing: -0.02em;
    }
    .notification-label {
      font-size: 12px;
      font-weight: 700;
      color: #6326a6;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .subject-title {
      font-size: 26px;
      font-weight: 800;
      line-height: 1.25;
      color: #1c0c38;
      margin: 0;
      word-break: break-word;
    }
    /* Content Area */
    .body-content {
      padding: 32px 36px 36px 36px;
      background-color: #ffffff;
    }
    .greeting {
      font-size: 15px;
      font-weight: 500;
      color: #2d3748;
      margin-bottom: 20px;
    }
    /* The Highlighted Gray Container Box for {{list_content}} */
    .list-content-box {
      background-color: #f8fafc;
      border: 1px solid #f1f5f9;
      border-radius: 10px;
      padding: 20px 22px;
      font-size: 14.5px;
      line-height: 1.65;
      color: #334155;
      margin-bottom: 22px;
      word-break: break-word;
    }
    .list-content-box p {
      margin: 0 0 10px 0;
    }
    .list-content-box p:last-child {
      margin-bottom: 0;
    }
    .list-content-box b, .list-content-box strong {
      font-weight: 700;
      color: #0f172a;
    }
    .list-content-box i, .list-content-box em {
      font-style: italic;
    }
    .list-content-box u {
      text-decoration: underline;
    }
    .list-content-box s {
      text-decoration: line-through;
    }
    .list-content-box ul {
      margin: 8px 0;
      padding-left: 20px;
      list-style-type: disc;
    }
    .list-content-box ol {
      margin: 8px 0;
      padding-left: 20px;
      list-style-type: decimal;
    }
    .list-content-box li {
      margin-bottom: 5px;
    }
    .list-content-box h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin: 12px 0 6px 0;
    }
    .list-content-box h3 {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      margin: 10px 0 4px 0;
    }
    .list-content-box blockquote {
      border-left: 3px solid #10b981;
      background: #f1f5f9;
      padding: 8px 12px;
      margin: 10px 0;
      font-style: italic;
      color: #475569;
    }
    .list-content-box a {
      color: #6d28d9;
      text-decoration: underline;
    }
    /* The Additional Message below the Box */
    .additional-message {
      font-size: 14.5px;
      line-height: 1.65;
      color: #475569;
      margin-bottom: 26px;
      word-break: break-word;
    }
    /* Regards & Signoff */
    .signoff {
      margin-top: 24px;
      font-size: 14.5px;
      line-height: 1.5;
      color: #334155;
    }
    .signoff-brand {
      font-weight: 700;
      color: #551e96;
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header Card -->
    <div class="header">
      <!-- Watermark shape -->
      <svg class="header-watermark" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="70" y="20" width="120" height="120" rx="36" transform="rotate(25 70 20)" fill="#7c3aed" />
        <rect x="110" y="60" width="90" height="90" rx="28" transform="rotate(25 110 60)" fill="#6d28d9" />
      </svg>

      <div class="logo-row">
        <!-- SVG StableStack Purple Rings Logo -->
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="20" cy="20" rx="17" ry="9" stroke="#6d28d9" stroke-width="3.5" transform="rotate(-25 20 20)"/>
          <ellipse cx="20" cy="20" rx="17" ry="9" stroke="#a78bfa" stroke-width="3.5" transform="rotate(25 20 20)"/>
        </svg>
        <span class="logo-text">StableStack</span>
      </div>

      <div class="notification-label">NOTIFICATION:</div>
      <h1 class="subject-title">${displaySubject}</h1>
    </div>

    <!-- Main White Card Body -->
    <div class="body-content">
      <div class="greeting">Hi Gabriel,</div>

      <div class="list-content-box">
        ${formattedListContent || '<span style="color: #94a3b8; font-style: italic;">{{list_content}} placeholder</span>'}
      </div>

      ${
        formattedAdditional
          ? `<div class="additional-message">${formattedAdditional}</div>`
          : ''
      }

      <div class="signoff">
        <div>Regards,</div>
        <div class="signoff-brand">The Stablestack Team</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }, [subject, listContent, additionalMessage]);

  if (!isFullAccess && !canRead('emails')) {
    return (
      <AdminLayout title="Email Broadcasts">
        <AccessDenied message="You do not have permissions to access the Email Campaigns module." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Email Campaigns & Broadcasts">
      <div className="space-y-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-graphite-hairline pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-display font-semibold text-ink">
                Email Campaigns & Broadcasts
              </h1>
            </div>
            <p className="text-xs text-slate mt-1">
              Dispatch bulk announcements and transactional updates using Zoho ZeptoMail <strong>Generic Notification Template</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTestModalOpen(true)}
              className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-ash" />
              <span>Send Test Email</span>
            </button>

            <button
              onClick={() => {
                if (!subject.trim()) {
                  toast.error('Please enter an email subject line');
                  return;
                }
                if (!listContent.trim()) {
                  toast.error('Please enter notification body content (list_content)');
                  return;
                }
                if (estimatedCount === 0) {
                  toast.error('No valid recipients selected. Please configure target users or import a CSV.');
                  return;
                }
                setIsConfirmModalOpen(true);
              }}
              disabled={estimatedCount === 0 || sendBroadcastMutation.isPending}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer disabled:opacity-50"
            >
              {sendBroadcastMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {sendBroadcastMutation.isPending
                  ? 'Dispatching...'
                  : `Send Broadcast (${estimatedCount.toLocaleString()})`}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            label="Total Platform Users"
            value={isLoadingCounts ? '...' : (recipientCounts?.total || 0).toLocaleString()}
            icon={Users}
          />
          <StatsCard
            label="Merchants Audience"
            value={isLoadingCounts ? '...' : (recipientCounts?.merchants || 0).toLocaleString()}
            icon={ShieldCheck}
            change="Corporate & Business"
          />
          <StatsCard
            label="Pending Compliance"
            value={isLoadingCounts ? '...' : (recipientCounts?.pendingCompliance || 0).toLocaleString()}
            icon={Clock}
            change="Awaiting verification"
            changeType="neutral"
          />
          <StatsCard
            label="Active Audience Pool"
            value={isLoadingCounts ? '...' : estimatedCount.toLocaleString()}
            icon={Mail}
            change={getFilterSummaryText()}
            changeType="positive"
          />
        </div>

        {/* Main 2-Column Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Configuration & Composer (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Target Audience Selection */}
            <div className="bg-vellum/40 p-5 rounded-2xl border border-graphite-hairline space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-ink text-paper text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Target Audience</h3>
                </div>
                <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {estimatedCount.toLocaleString()} recipient{estimatedCount === 1 ? '' : 's'} selected
                </span>
              </div>

              {/* Segmented Control */}
              <div className="grid grid-cols-2 p-1 bg-paper border border-graphite-hairline rounded-xl">
                <button
                  type="button"
                  onClick={() => setTargetType('platform_users')}
                  className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    targetType === 'platform_users'
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-slate hover:text-ink'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Platform Users Database</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('imported')}
                  className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    targetType === 'imported'
                      ? 'bg-ink text-paper shadow-sm'
                      : 'text-slate hover:text-ink'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import List (CSV / Paste)</span>
                </button>
              </div>

              {/* Platform Users Filtering Options */}
              {targetType === 'platform_users' && (
                <div className="space-y-4 pt-1">
                  {/* Presets Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-ink">
                        Target Audience Segments & Presets
                      </label>
                      <p className="text-[11px] text-slate mt-0.5">
                        Select a pre-built user cohort or combine multi-criteria filters below
                      </p>
                    </div>
                    {isCustomFiltered && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Preset Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {PLATFORM_PRESETS.map((preset) => {
                      const PresetIcon = preset.icon;
                      const isSelected = platformPreset === preset.id;
                      const count = getPresetCount(preset.id);

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group ${
                            isSelected
                              ? 'bg-paper border-emerald-500 ring-1 ring-emerald-500 shadow-sm'
                              : 'bg-paper/60 border-graphite-hairline hover:bg-paper hover:border-graphite'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`p-1.5 rounded-lg ${
                                isSelected
                                  ? 'bg-emerald-500/10 text-emerald-700'
                                  : 'bg-vellum text-slate group-hover:text-ink'
                              }`}
                            >
                              <PresetIcon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-[11px] font-mono font-medium text-slate">
                              {isLoadingCounts ? '...' : count.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-ink line-clamp-1">{preset.label}</div>
                          <div className="text-[10px] text-slate mt-0.5 line-clamp-1 leading-snug">
                            {preset.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Multi-Criteria Filter Controls Panel */}
                  <div className="bg-paper p-4 rounded-xl border border-graphite-hairline space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-xs font-semibold text-ink">Fine-Tune Filter Criteria</span>
                      </div>
                      <span className="text-[11px] text-slate">
                        Combinable role, KYC, and account status filters
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Role Filter */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate mb-1">
                          Role Type
                        </label>
                        <select
                          value={roleFilter}
                          onChange={(e) => handleRoleChange(e.target.value as any)}
                          className="input bg-paper text-xs w-full py-1.5 cursor-pointer"
                        >
                          <option value="all">All Roles (Platform-wide)</option>
                          <option value="merchant">Merchants Only</option>
                        </select>
                      </div>

                      {/* Compliance Status Filter */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate mb-1">
                          Compliance (KYC/KYB)
                        </label>
                        <select
                          value={complianceFilter}
                          onChange={(e) => handleComplianceChange(e.target.value as any)}
                          className="input bg-paper text-xs w-full py-1.5 cursor-pointer"
                        >
                          <option value="all">All Compliance Statuses</option>
                          <option value="Pending">Pending Verification</option>
                          <option value="Approved">Approved KYC/KYB</option>
                          <option value="Rejected">Rejected KYC</option>
                          <option value="NotSubmitted">KYC Not Submitted</option>
                        </select>
                      </div>

                      {/* Account Status Filter */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate mb-1">
                          Account Status
                        </label>
                        <select
                          value={accountStatusFilter}
                          onChange={(e) => handleStatusChange(e.target.value as any)}
                          className="input bg-paper text-xs w-full py-1.5 cursor-pointer"
                        >
                          <option value="active">Active Accounts Only (Default)</option>
                          <option value="blocked">Blocked Accounts Only</option>
                          <option value="all">All Accounts (Active & Blocked)</option>
                        </select>
                      </div>
                    </div>

                    {/* Active Filter Pills & Real-Time Count Match */}
                    <div className="pt-2 border-t border-graphite-hairline flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate mr-1">Active Criteria:</span>
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-vellum border border-graphite-hairline text-ink font-medium">
                          Role: {roleFilter === 'merchant' ? 'Merchants' : 'All Roles'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                            complianceFilter === 'Pending'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700'
                              : complianceFilter === 'Approved'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
                              : complianceFilter === 'Rejected'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-700'
                              : complianceFilter === 'NotSubmitted'
                              ? 'bg-gray-500/10 border-gray-500/20 text-gray-700'
                              : 'bg-vellum border-graphite-hairline text-ink'
                          }`}
                        >
                          Compliance: {complianceFilter === 'all' ? 'All' : complianceFilter}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${
                            accountStatusFilter === 'blocked'
                              ? 'bg-red-500/10 border-red-500/20 text-red-700'
                              : accountStatusFilter === 'all'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700'
                          }`}
                        >
                          Status: {accountStatusFilter === 'active' ? 'Active Only' : accountStatusFilter === 'blocked' ? 'Blocked Only' : 'Active & Blocked'}
                        </span>
                      </div>

                      {/* Dynamic Real-time Count */}
                      <div className="text-xs font-mono font-medium text-emerald-700 flex items-center gap-1.5">
                        {isLoadingCounts ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>
                          {isLoadingCounts
                            ? 'Calculating recipients...'
                            : `${estimatedCount.toLocaleString()} recipient${estimatedCount === 1 ? '' : 's'} match`}
                        </span>
                      </div>
                    </div>

                    {/* Blocked Accounts Safety Alert */}
                    {(accountStatusFilter === 'blocked' || accountStatusFilter === 'all') && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Notice:</strong> Broadcast audience includes suspended/blocked accounts. Ensure messages sent to this pool adhere to regulatory and account status guidelines.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Import List (CSV / Manual Paste) Options */}
              {targetType === 'imported' && (
                <div className="space-y-4 pt-1">
                  {/* File Upload Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-graphite-hairline hover:border-emerald-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-paper/50 hover:bg-paper"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <FileSpreadsheet className="w-8 h-8 text-ash mx-auto mb-2" />
                    <p className="text-xs font-semibold text-ink">
                      {csvFileName ? `File: ${csvFileName}` : 'Click or drop a CSV file here'}
                    </p>
                    <p className="text-[11px] text-slate mt-0.5">
                      Must contain an <code>email</code> column (e.g. <code>email,name,company</code>)
                    </p>
                  </div>

                  {/* Or Manual Paste Textarea */}
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Or Paste Email Addresses (one per line, or comma-separated)
                    </label>
                    <textarea
                      rows={3}
                      value={rawPastedEmails}
                      onChange={(e) => {
                        setRawPastedEmails(e.target.value);
                        parseImportText(e.target.value);
                      }}
                      placeholder="john@example.com, John Doe&#10;jane@acme.com, Jane Smith"
                      className="input bg-paper font-mono text-xs w-full resize-y"
                    />
                  </div>

                  {/* Import Stats Badges */}
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {importStats.valid} valid emails ready
                    </span>
                    {importStats.duplicates > 0 && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {importStats.duplicates} duplicates removed
                      </span>
                    )}
                    {importStats.invalid > 0 && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-700 font-medium">
                        <X className="w-3.5 h-3.5" />
                        {importStats.invalid} invalid formats skipped
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Sender & Routing Settings */}
            <div className="bg-vellum/40 p-5 rounded-2xl border border-graphite-hairline space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-ink text-paper text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-semibold text-ink">Sender & Template Configuration</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    From Email Address <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="input bg-paper text-xs cursor-pointer"
                  >
                    {VERIFIED_SENDERS.map((s) => (
                      <option key={s.email} value={s.email}>
                        {s.label}
                      </option>
                    ))}
                    <option value="custom">+ Custom Verified Address</option>
                  </select>
                </div>

                {fromEmail === 'custom' ? (
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Custom From Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={customFromEmail}
                      onChange={(e) => setCustomFromEmail(e.target.value)}
                      placeholder="announcements@stablestack.xyz"
                      className="input bg-paper text-xs"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      From Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="StableStack"
                      className="input bg-paper text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    CC Email Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={ccList}
                    onChange={(e) => setCcList(e.target.value)}
                    placeholder="compliance@stablestack.xyz"
                    className="input bg-paper text-xs"
                  />
                  <p className="text-[10px] text-slate mt-0.5">
                    Comma-separated emails to receive a CC copy of each dispatch.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Reply-To Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="support@stablestack.xyz"
                    className="input bg-paper text-xs"
                  />
                </div>
              </div>

              {/* ZeptoMail Template Selection */}
              <div className="pt-2 border-t border-graphite-hairline/80">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-ink mb-1">
                      Zoho ZeptoMail Template <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="input bg-paper text-xs cursor-pointer font-medium"
                    >
                      {ZEPTO_TEMPLATES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate mt-0.5">
                      Target template in Zoho ZeptoMail containing <code>subject</code>, <code>user_name</code>, <code>list_content</code> & <code>additional_message</code>.
                    </p>
                  </div>

                  {selectedTemplate === 'custom' && (
                    <div>
                      <label className="block text-xs font-medium text-ink mb-1">
                        Custom Template Key / Alias <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customTemplateKey}
                        onChange={(e) => setCustomTemplateKey(e.target.value)}
                        placeholder="e.g. 2d6f.7... or template_alias"
                        className="input bg-paper font-mono text-xs"
                      />
                      <p className="text-[10px] text-slate mt-0.5">
                        Found under "Single email setup" or "Batch email setup" in ZeptoMail.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Message Content Composer */}
            <div className="bg-vellum/40 p-5 rounded-2xl border border-graphite-hairline space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-ink text-paper text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-ink">Template Content Composer</h3>
                </div>

                {/* Preset Templates Dropdown */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate">Presets:</span>
                  {TEMPLATE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setSubject(preset.subject);
                        setListContent(preset.listContent);
                        setAdditionalMessage(preset.additionalMessage);
                        toast.info(`Loaded preset: ${preset.name}`);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded border border-graphite-hairline bg-paper hover:bg-vellum text-ink transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Line (Maps to {{subject}}) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-ink">
                    Subject Line (<code>{"{{subject}}"}</code>) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate font-mono">{subject.length} chars</span>
                </div>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Important Platform Update from StableStack"
                  className="input bg-paper text-sm font-semibold text-ink"
                />
                <p className="text-[10px] text-slate mt-0.5">
                  Rendered in the email subject line and the top purple header: <code>NOTIFICATION: {subject || '{{subject}}'}</code>
                </p>
              </div>

              {/* Merge Tags Quick Bar */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag className="w-3.5 h-3.5 text-ash" />
                  <span className="text-xs font-medium text-ink">Insert Recipient Merge Tags:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MERGE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => insertMergeTag(t.tag)}
                      className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-paper border border-graphite-hairline text-ink hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      + {t.label} ({t.tag})
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Notification Box Content (Maps to {{list_content}}) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-ink">
                    Notification Body (<code>{"{{list_content}}"}</code>) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full font-mono">
                    Formatted Card Box
                  </span>
                </div>
                <div onFocus={() => setActiveFocusField('listContent')}>
                  <RichTextEditor
                    ref={richEditorRef}
                    value={listContent}
                    onChange={setListContent}
                    placeholder="Enter the core announcement, feature updates, or formatted bullet points here..."
                    minHeight="210px"
                  />
                </div>
                <p className="text-[10px] text-slate mt-1.5">
                  Format using <b>B</b> (Bold), <i>I</i> (Italic), <u>U</u> (Underline), lists, headings, and quotes. Injected into the template card box.
                </p>
              </div>

              {/* Additional Message (Maps to {{additional_message}}) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-ink">
                    Additional Message / Closing Notes (<code>{"{{additional_message}}"}</code>) (Optional)
                  </label>
                  <span className="text-[10px] text-slate font-mono">Below Card Box</span>
                </div>
                <textarea
                  ref={additionalMessageRef}
                  rows={3}
                  onFocus={() => setActiveFocusField('additionalMessage')}
                  value={additionalMessage}
                  onChange={(e) => setAdditionalMessage(e.target.value)}
                  placeholder="e.g. If you have questions, our support team is available 24/7 to assist you."
                  className="input bg-paper font-sans text-xs w-full resize-y leading-relaxed"
                />
                <p className="text-[10px] text-slate mt-1">
                  Placed right below the container card box, preceding "Regards, The Stablestack Team".
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Interactive ZeptoMail Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-24 space-y-3">
            <div className="bg-vellum/40 p-4 rounded-2xl border border-graphite-hairline space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-ink">ZeptoMail Template Preview</h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Switcher: Visual vs JSON */}
                  <div className="flex items-center p-0.5 bg-paper border border-graphite-hairline rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('visual')}
                      className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                        previewTab === 'visual' ? 'bg-vellum font-semibold text-ink' : 'text-slate hover:text-ink'
                      }`}
                    >
                      Visual Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('json')}
                      className={`px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                        previewTab === 'json' ? 'bg-vellum font-semibold text-ink' : 'text-slate hover:text-ink'
                      }`}
                    >
                      <Code className="w-3 h-3" />
                      <span>JSON Merge</span>
                    </button>
                  </div>

                  {/* Device switch for visual */}
                  {previewTab === 'visual' && (
                    <div className="flex items-center p-0.5 bg-paper border border-graphite-hairline rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          previewDevice === 'desktop' ? 'bg-vellum text-ink' : 'text-slate hover:text-ink'
                        }`}
                        title="Desktop Preview"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          previewDevice === 'mobile' ? 'bg-vellum text-ink' : 'text-slate hover:text-ink'
                        }`}
                        title="Mobile Preview"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sender & Envelope details */}
              <div className="bg-paper p-3 rounded-xl border border-graphite-hairline text-xs space-y-1">
                <div className="text-[11px] text-slate">
                  From: <span className="font-semibold text-ink">{fromName} &lt;{fromEmail}&gt;</span>
                </div>
                <div className="text-xs font-medium text-ink truncate">
                  Subject: <span className="font-normal">{subject || '(No subject)'}</span>
                </div>
                <div className="text-[11px] text-slate flex items-center justify-between pt-0.5 border-t border-graphite-hairline/60">
                  <span>ZeptoMail Template:</span>
                  <span className="font-mono font-medium text-purple-700">generic-template</span>
                </div>
              </div>

              {/* Tab 1: Visual Card Render */}
              {previewTab === 'visual' && (
                <div
                  className={`mx-auto bg-paper rounded-xl border border-graphite-hairline overflow-hidden shadow-sm transition-all ${
                    previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'
                  }`}
                >
                  <div className="h-[520px] w-full overflow-hidden">
                    <iframe
                      title="ZeptoMail Template Preview"
                      srcDoc={compiledPreviewHtml}
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: JSON Merge Info View (matches screenshot) */}
              {previewTab === 'json' && (
                <div className="bg-paper rounded-xl border border-graphite-hairline p-3 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-graphite-hairline text-[11px] text-slate">
                    <span>ZeptoMail Merge Info Payload (JSON)</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(mergeInfoJson);
                        setCopiedJson(true);
                        toast.success('JSON merge payload copied to clipboard');
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="flex items-center gap-1 text-purple-600 hover:text-purple-700 cursor-pointer"
                    >
                      {copiedJson ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-vellum/50 rounded-lg text-ink overflow-x-auto text-[11.5px] leading-relaxed">
                    {mergeInfoJson}
                  </pre>
                  <p className="text-[10px] text-slate leading-relaxed">
                    This JSON payload exactly matches the merge tags defined in your ZeptoMail console:
                    <code>subject</code>, <code>user_name</code>, <code>list_content</code>, and <code>additional_message</code>.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate text-center">
                Preview reflects recipient <code>Gabriel</code> for merge tag demonstration.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: SEND TEST EMAIL                                     */}
      {/* ============================================================ */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Send Test Notification"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendTestMutation.mutate();
          }}
          className="space-y-4"
        >
          <p className="text-xs text-slate">
            Sends an immediate test email to verify how the <strong>Generic Template</strong> renders in your mailbox.
          </p>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Destination Test Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="you@stablestack.xyz"
              className="input bg-paper font-mono text-xs"
            />
          </div>

          <div className="p-3 bg-vellum/40 border border-graphite-hairline rounded-xl text-xs space-y-1">
            <div className="text-slate">
              Sender: <span className="font-semibold text-ink">{fromName} &lt;{fromEmail}&gt;</span>
            </div>
            <div className="text-slate">
              Subject: <span className="font-semibold text-ink">[TEST] {subject}</span>
            </div>
            <div className="text-slate">
              Template: <span className="font-mono text-purple-700">Generic Template (generic-template)</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setIsTestModalOpen(false)}
              className="btn-secondary text-xs py-2 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendTestMutation.isPending || !testEmailAddress}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 cursor-pointer disabled:opacity-50"
            >
              {sendTestMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching Test...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 2: CONFIRM BULK DISPATCH                               */}
      {/* ============================================================ */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Bulk Broadcast Dispatch"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">Review before sending:</span> You are about to dispatch this email campaign to{' '}
              <strong className="underline">{estimatedCount.toLocaleString()} recipient(s)</strong> via Zoho ZeptoMail using the <strong>Generic Template</strong> (<code>generic-template</code>).
              Each recipient receives a personalized email with their individual merge data.
            </div>
          </div>

          <div className="bg-vellum/30 p-4 rounded-xl border border-graphite-hairline space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate">Recipient Target:</span>
              <span className="font-semibold text-ink text-right">
                {targetType === 'platform_users'
                  ? `Platform Users (${getFilterSummaryText()})`
                  : `Imported List (${csvFileName || `${importedList.length} recipient${importedList.length === 1 ? '' : 's'}`})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Total Recipients:</span>
              <span className="font-semibold text-emerald-600 font-mono">
                {estimatedCount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">From Address:</span>
              <span className="font-mono text-ink">{fromName} &lt;{fromEmail}&gt;</span>
            </div>
            {ccList && (
              <div className="flex justify-between">
                <span className="text-slate">CC:</span>
                <span className="font-mono text-ink truncate max-w-[200px]">{ccList}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate">Subject:</span>
              <span className="font-semibold text-ink truncate max-w-[200px]">{subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Template:</span>
              <span className="font-mono text-purple-700">Generic Template (generic-template)</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-graphite-hairline">
            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(false)}
              className="btn-secondary text-xs py-2 px-4 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => sendBroadcastMutation.mutate()}
              disabled={sendBroadcastMutation.isPending}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-5 cursor-pointer disabled:opacity-50"
            >
              {sendBroadcastMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching to {estimatedCount} users...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Confirm & Send Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 3: DISPATCH RESULTS SUMMARY                            */}
      {/* ============================================================ */}
      {sendResult && (
        <Modal
          isOpen={!!sendResult}
          onClose={() => setSendResult(null)}
          title="Broadcast Dispatch Summary"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-emerald-950">Broadcast Dispatch Concluded</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Zoho ZeptoMail processed the broadcast batch successfully.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-vellum/50 rounded-xl border border-graphite-hairline">
                <div className="text-[11px] text-slate">Total Target</div>
                <div className="text-base font-bold font-mono text-ink mt-0.5">{sendResult.total}</div>
              </div>
              <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                <div className="text-[11px] text-emerald-700">Successfully Sent</div>
                <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">
                  {sendResult.sent}
                </div>
              </div>
              <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/20">
                <div className="text-[11px] text-red-700">Failed / Rejected</div>
                <div className="text-base font-bold font-mono text-red-600 mt-0.5">
                  {sendResult.failed}
                </div>
              </div>
            </div>

            {sendResult.failedList && sendResult.failedList.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-ink">Failed Recipients Details:</div>
                <div className="max-h-36 overflow-y-auto space-y-1 p-2 rounded-xl bg-paper border border-graphite-hairline text-xs font-mono">
                  {sendResult.failedList.map((f: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[11px] py-1 border-b border-graphite-hairline last:border-0">
                      <span className="text-ink">{f.email}</span>
                      <span className="text-red-500 text-[10px]">{f.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-graphite-hairline">
              <button
                type="button"
                onClick={() => setSendResult(null)}
                className="btn-primary text-xs py-2 px-5 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
