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
  Plus,
  UserPlus,
  FileText,
  ChevronDown,
  ChevronUp,
  Trash2,
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

const CUSTOM_SENDERS_STORAGE_KEY = 'stablestack_custom_from_emails';
const LAST_SENDER_STORAGE_KEY = 'stablestack_last_from_email';
const LAST_FROM_NAME_STORAGE_KEY = 'stablestack_last_from_name';

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
  { key: 'general-template', name: 'General Template' },
  { key: 'custom', name: '+ Enter Custom ZeptoMail Template Key / Alias' },
];

const MERGE_TAGS = [
  { tag: '{{greetings}}', label: 'Greeting (Hi Name,)' },
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
  const [selectedTemplate, setSelectedTemplate] = useState('general-template');
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
  const [invalidEntriesList, setInvalidEntriesList] = useState<string[]>([]);
  const [showSkippedDetails, setShowSkippedDetails] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [importTab, setImportTab] = useState<'manual' | 'paste' | 'upload'>('manual');
  const [manualRecipientEmail, setManualRecipientEmail] = useState('');
  const [manualRecipientName, setManualRecipientName] = useState('');
  const [manualInputError, setManualInputError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved custom senders from localStorage
  const [savedCustomSenders, setSavedCustomSenders] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CUSTOM_SENDERS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Email sender settings (persisted in localStorage)
  const [fromEmail, setFromEmail] = useState(() => {
    if (typeof window === 'undefined') return 'hello@stablestack.xyz';
    try {
      return localStorage.getItem(LAST_SENDER_STORAGE_KEY) || 'hello@stablestack.xyz';
    } catch {
      return 'hello@stablestack.xyz';
    }
  });
  const [customFromEmail, setCustomFromEmail] = useState('');
  const [fromName, setFromName] = useState(() => {
    if (typeof window === 'undefined') return 'StableStack';
    try {
      return localStorage.getItem(LAST_FROM_NAME_STORAGE_KEY) || 'StableStack';
    } catch {
      return 'StableStack';
    }
  });
  const [replyTo, setReplyTo] = useState('');
  const [ccList, setCcList] = useState('');

  // Save a custom email address to localStorage for reuse
  const saveCustomSender = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (VERIFIED_SENDERS.some((s) => s.email.toLowerCase() === trimmed)) {
      toast.info('This address is already a default verified sender');
      return true;
    }
    const updated = savedCustomSenders.includes(trimmed)
      ? savedCustomSenders
      : [...savedCustomSenders, trimmed];
    setSavedCustomSenders(updated);
    try {
      localStorage.setItem(CUSTOM_SENDERS_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(LAST_SENDER_STORAGE_KEY, trimmed);
    } catch {}
    return true;
  };

  // Remove a custom email address from localStorage
  const removeCustomSender = (emailToRemove: string) => {
    const updated = savedCustomSenders.filter((e) => e !== emailToRemove);
    setSavedCustomSenders(updated);
    try {
      localStorage.setItem(CUSTOM_SENDERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    if (fromEmail === emailToRemove) {
      setFromEmail('hello@stablestack.xyz');
      try {
        localStorage.setItem(LAST_SENDER_STORAGE_KEY, 'hello@stablestack.xyz');
      } catch {}
    }
    toast.success(`Removed ${emailToRemove} from saved senders`);
  };

  const handleFromEmailChange = (val: string) => {
    setFromEmail(val);
    if (val !== 'custom') {
      try {
        localStorage.setItem(LAST_SENDER_STORAGE_KEY, val);
      } catch {}
    }
  };

  const handleFromNameChange = (val: string) => {
    setFromName(val);
    try {
      localStorage.setItem(LAST_FROM_NAME_STORAGE_KEY, val);
    } catch {}
  };

  const resolvedFromEmail = fromEmail === 'custom' ? (customFromEmail.trim() || 'custom@stablestack.xyz') : fromEmail;

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
      const activeSender = fromEmail === 'custom' ? customFromEmail.trim().toLowerCase() : fromEmail;
      if (fromEmail === 'custom' && customFromEmail.trim()) {
        saveCustomSender(customFromEmail);
      }
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
      const activeSender = fromEmail === 'custom' ? customFromEmail.trim().toLowerCase() : fromEmail;
      if (fromEmail === 'custom' && customFromEmail.trim()) {
        saveCustomSender(customFromEmail);
      }
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
  };  // Split CSV line respecting quotes
  const splitCsvRow = (row: string, delim: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delim && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, '').trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, '').trim());
    return result;
  };

  // Email validation helpers
  const EMAIL_SEARCH_REGEX = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/gi;
  const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  const isValidEmailAddress = (email: string) => STRICT_EMAIL_REGEX.test(email.trim());

  // Parse text or CSV content with intelligent multi-format detection
  const parseImportText = (text: string) => {
    if (!text || !text.trim()) {
      setImportedList([]);
      setImportStats({ valid: 0, duplicates: 0, invalid: 0 });
      setInvalidEntriesList([]);
      return;
    }

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const seenEmails = new Set<string>();
    const validRecipients: ImportedRecipient[] = [];
    const invalidLines: string[] = [];
    let duplicateCount = 0;

    // Detect if first line is a true CSV header row:
    // Header only if: contains delimiter AND does NOT contain '@' AND contains a keyword like 'email' or 'e-mail'
    let hasHeader = false;
    let emailIdx = -1;
    let nameIdx = -1;
    let firstNameIdx = -1;
    let lastNameIdx = -1;
    let companyIdx = -1;
    let detectedDelim = ',';

    if (lines.length > 0) {
      const firstLine = lines[0];
      const hasAt = firstLine.includes('@');
      const hasDelim = firstLine.includes(',') || firstLine.includes('\t') || firstLine.includes(';');
      if (!hasAt && hasDelim) {
        detectedDelim = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';
        const headers = splitCsvRow(firstLine, detectedDelim).map((h) => h.toLowerCase());

        for (let idx = 0; idx < headers.length; idx++) {
          const h = headers[idx];
          if (['email', 'e-mail', 'mail', 'email_address', 'email address', 'recipient', 'recipient_email'].includes(h)) {
            emailIdx = idx;
            hasHeader = true;
          } else if (['name', 'full_name', 'fullname', 'recipient_name', 'customer_name', 'user_name'].includes(h)) {
            nameIdx = idx;
          } else if (['first_name', 'firstname', 'first'].includes(h)) {
            firstNameIdx = idx;
          } else if (['last_name', 'lastname', 'last'].includes(h)) {
            lastNameIdx = idx;
          } else if (['company', 'business', 'business_name', 'org', 'organization', 'company_name'].includes(h)) {
            companyIdx = idx;
          }
        }
      }
    }

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // If header was detected and valid email column index found, parse using CSV columns
      if (hasHeader && emailIdx !== -1) {
        const parts = splitCsvRow(line, detectedDelim);
        const rawEmail = (parts[emailIdx] || '').trim().toLowerCase();

        if (isValidEmailAddress(rawEmail)) {
          if (seenEmails.has(rawEmail)) {
            duplicateCount++;
          } else {
            seenEmails.add(rawEmail);
            let extractedName = nameIdx !== -1 && nameIdx < parts.length ? parts[nameIdx]?.trim() : '';
            if (!extractedName && firstNameIdx !== -1 && firstNameIdx < parts.length) {
              const fn = parts[firstNameIdx]?.trim() || '';
              const ln = lastNameIdx !== -1 && lastNameIdx < parts.length ? parts[lastNameIdx]?.trim() || '' : '';
              extractedName = `${fn} ${ln}`.trim();
            }
            const extractedCompany = companyIdx !== -1 && companyIdx < parts.length ? parts[companyIdx]?.trim() : '';
            const resolvedName = extractedName || extractedCompany || undefined;
            const firstName = extractedName ? extractedName.split(' ')[0] : extractedCompany || undefined;

            validRecipients.push({
              email: rawEmail,
              name: resolvedName,
              firstName,
              businessName: extractedCompany || undefined,
            });
          }
        } else {
          invalidLines.push(line);
        }
        continue;
      }

      // No CSV header: intelligent extraction for any freeform format
      // 1. Find all emails in the line
      const matchedEmails = line.match(EMAIL_SEARCH_REGEX);

      if (!matchedEmails || matchedEmails.length === 0) {
        invalidLines.push(line);
        continue;
      }

      // If multiple bare emails on one line (e.g. "a@b.com, c@d.com, e@f.com")
      if (matchedEmails.length > 1) {
        for (const em of matchedEmails) {
          const lowerEm = em.toLowerCase();
          if (seenEmails.has(lowerEm)) {
            duplicateCount++;
          } else {
            seenEmails.add(lowerEm);
            validRecipients.push({ email: lowerEm });
          }
        }
        continue;
      }

      // Exactly 1 email on this line
      const rawEmail = matchedEmails[0].toLowerCase();
      if (!isValidEmailAddress(rawEmail)) {
        invalidLines.push(line);
        continue;
      }

      if (seenEmails.has(rawEmail)) {
        duplicateCount++;
        continue;
      }

      seenEmails.add(rawEmail);

      // Extract the name by removing the email and cleaning up remaining text
      let remainder = line.replace(matchedEmails[0], '').trim();

      // Clean brackets, quotes, colons, hyphens, commas, tabs, semicolons, pipes
      remainder = remainder
        .replace(/^[<(\["'\s,:;|\-]+/, '')
        .replace(/[>\])"'\s,:;|\-]+$/, '')
        .trim();

      // Strip common prefixes like "name:", "Name:", "recipient:", "email:"
      remainder = remainder
        .replace(/^(email|e-mail)\s*:\s*/i, '')
        .replace(/^(name|recipient|user|contact)\s*:\s*/i, '')
        .trim();

      // Strip surrounding quotes
      remainder = remainder.replace(/^["']|["']$/g, '').trim();

      let name: string | undefined = undefined;
      let businessName: string | undefined = undefined;

      if (remainder) {
        // If remainder contains a comma, e.g. "John Doe, Acme Corp"
        if (remainder.includes(',')) {
          const parts = remainder.split(',').map((p) => p.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
          if (parts.length >= 2) {
            name = parts[0];
            businessName = parts[1];
          } else if (parts.length === 1) {
            name = parts[0];
          }
        } else {
          name = remainder;
        }
      }

      const firstName = name ? name.split(' ')[0] : undefined;

      validRecipients.push({
        email: rawEmail,
        name: name || undefined,
        firstName,
        businessName: businessName || undefined,
      });
    }

    setImportedList(validRecipients);
    setInvalidEntriesList(invalidLines);
    setImportStats({
      valid: validRecipients.length,
      duplicates: duplicateCount,
      invalid: invalidLines.length,
    });
  };

  // Add individual recipient manually
  const handleAddManualRecipient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setManualInputError('');

    const trimmedEmail = manualRecipientEmail.trim().toLowerCase();
    const trimmedName = manualRecipientName.trim();

    if (!trimmedEmail) {
      setManualInputError('Please enter an email address');
      return;
    }

    if (!isValidEmailAddress(trimmedEmail)) {
      setManualInputError('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    // Check for duplicates in current list
    const alreadyExists = importedList.some((r) => r.email.toLowerCase() === trimmedEmail);
    if (alreadyExists) {
      setManualInputError(`Email ${trimmedEmail} is already in the recipient list`);
      return;
    }

    const newRecipient: ImportedRecipient = {
      email: trimmedEmail,
      name: trimmedName || undefined,
      firstName: trimmedName ? trimmedName.split(' ')[0] : undefined,
    };

    const updated = [newRecipient, ...importedList];
    setImportedList(updated);
    setImportStats((prev) => ({
      ...prev,
      valid: updated.length,
    }));

    setManualRecipientEmail('');
    setManualRecipientName('');
    setManualInputError('');
    toast.success(`Added ${trimmedEmail} to recipients`);
  };

  const removeImportedRecipient = (emailToRemove: string) => {
    const lowerTarget = emailToRemove.toLowerCase();
    const updated = importedList.filter((r) => r.email.toLowerCase() !== lowerTarget);
    setImportedList(updated);
    setImportStats((prev) => ({
      ...prev,
      valid: updated.length,
    }));

    // Synchronize textarea if present
    if (rawPastedEmails) {
      const remainingLines = rawPastedEmails
        .split(/\r?\n/)
        .filter((line) => !line.toLowerCase().includes(lowerTarget));
      setRawPastedEmails(remainingLines.join('\n'));
    }
  };

  const clearImportedList = () => {
    setImportedList([]);
    setRawPastedEmails('');
    setCsvFileName('');
    setInvalidEntriesList([]);
    setImportStats({ valid: 0, duplicates: 0, invalid: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Recipient list cleared');
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
        greetings: 'Hi Gabriel,',
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
        .replace(/\{\{greetings\}\}/gi, 'Hi Gabriel,')
        .replace(/\{\{greeting\}\}/gi, 'Hi Gabriel,')
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

              {/* Import List (CSV / Manual Entry / Paste) Options */}
              {targetType === 'imported' && (
                <div className="space-y-4 pt-1">
                  {/* Mode Tabs: Manual Entry / Paste / Upload CSV */}
                  <div className="flex items-center gap-1 bg-vellum/60 p-1 rounded-xl border border-graphite-hairline w-full sm:w-fit flex-wrap">
                    <button
                      type="button"
                      onClick={() => setImportTab('manual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        importTab === 'manual'
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-slate hover:text-ink hover:bg-paper/80'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Manual Entry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportTab('paste')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        importTab === 'paste'
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-slate hover:text-ink hover:bg-paper/80'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Paste Text / CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportTab('upload')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        importTab === 'upload'
                          ? 'bg-ink text-paper shadow-sm'
                          : 'text-slate hover:text-ink hover:bg-paper/80'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Upload CSV File</span>
                    </button>
                  </div>

                  {/* Tab 1: Manual Single Add */}
                  {importTab === 'manual' && (
                    <div className="bg-paper p-4 rounded-xl border border-graphite-hairline space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-ink">Add Recipient Manually</span>
                        <p className="text-[11px] text-slate mt-0.5">
                          Enter email and optional name to add directly to your broadcast pool.
                        </p>
                      </div>

                      <form onSubmit={handleAddManualRecipient} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-ink mb-1">
                              Recipient Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={manualRecipientEmail}
                              onChange={(e) => {
                                setManualRecipientEmail(e.target.value);
                                if (manualInputError) setManualInputError('');
                              }}
                              placeholder="e.g. alex@company.com"
                              className={`input bg-vellum/30 text-xs w-full py-2 ${
                                manualInputError ? 'border-red-500 focus:border-red-500' : ''
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-ink mb-1">
                              Recipient or Business Name <span className="text-slate font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={manualRecipientName}
                              onChange={(e) => setManualRecipientName(e.target.value)}
                              placeholder="e.g. Alex Johnson or Acme Corp"
                              className="input bg-vellum/30 text-xs w-full py-2"
                            />
                          </div>
                        </div>

                        {manualInputError && (
                          <div className="text-[11px] text-red-600 flex items-center gap-1.5 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{manualInputError}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                          <span className="text-[11px] text-slate">
                            Names personalize <code>{'{{user_name}}'}</code>, <code>{'{{first_name}}'}</code>, and <code>{'{{greetings}}'}</code>
                          </span>

                          <button
                            type="submit"
                            disabled={!manualRecipientEmail.trim()}
                            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Recipient</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Tab 2: Paste Textarea */}
                  {importTab === 'paste' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-ink">
                          Paste Email Addresses & Names
                        </label>
                        <span className="text-[11px] text-slate">
                          Supports comma, space, tab, or angle brackets
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={rawPastedEmails}
                        onChange={(e) => {
                          setRawPastedEmails(e.target.value);
                          parseImportText(e.target.value);
                        }}
                        placeholder={"john@example.com, John Doe\njane@acme.com, Jane Smith\nAlex Johnson <alex@company.com>\nbob@example.com"}
                        className="input bg-paper font-mono text-xs w-full resize-y"
                      />
                      <p className="text-[11px] text-slate">
                        Format examples: <code>email, name</code>, <code>name, email</code>, <code>email name</code>, or <code>Name &lt;email&gt;</code> (one per line).
                      </p>
                    </div>
                  )}

                  {/* Tab 3: Upload Dropzone */}
                  {importTab === 'upload' && (
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
                        Must contain an <code>email</code> column (e.g. <code>email,name,company</code> or <code>Email,First Name,Last Name</code>)
                      </p>
                    </div>
                  )}

                  {/* Import Stats Badges */}
                  <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {importStats.valid} valid recipient{importStats.valid === 1 ? '' : 's'} ready
                      </span>
                      {importStats.duplicates > 0 && (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {importStats.duplicates} duplicate{importStats.duplicates === 1 ? '' : 's'} removed
                        </span>
                      )}
                      {importStats.invalid > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowSkippedDetails(!showSkippedDetails)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-700 font-medium hover:bg-red-500/20 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{importStats.invalid} skipped (invalid format)</span>
                          {showSkippedDetails ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>
                    {importedList.length > 0 && (
                      <button
                        type="button"
                        onClick={clearImportedList}
                        className="text-[11px] text-red-600 hover:text-red-800 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear List</span>
                      </button>
                    )}
                  </div>

                  {/* Skipped Details Drawer */}
                  {showSkippedDetails && invalidEntriesList.length > 0 && (
                    <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/20 space-y-1.5 text-xs">
                      <span className="font-semibold text-red-800 block text-[11px]">
                        Lines skipped due to invalid email format:
                      </span>
                      <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[11px] text-red-700">
                        {invalidEntriesList.slice(0, 10).map((l, idx) => (
                          <div key={idx} className="truncate">
                            • {l}
                          </div>
                        ))}
                        {invalidEntriesList.length > 10 && (
                          <div className="text-[10px] text-slate italic">
                            ...and {invalidEntriesList.length - 10} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Imported Recipients Live Preview */}
                  {importedList.length > 0 ? (
                    <div className="bg-paper rounded-xl border border-graphite-hairline overflow-hidden">
                      <div className="p-2.5 bg-vellum/50 border-b border-graphite-hairline flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs font-semibold text-ink">
                            Parsed Recipients ({importedList.length})
                          </span>
                        </div>
                        <span className="text-[10px] text-slate font-sans">
                          Names will personalize <code>{"{{user_name}}"}</code> & <code>{"{{greetings}}"}</code>
                        </span>
                      </div>

                      <div className="max-h-56 overflow-y-auto divide-y divide-graphite-hairline text-xs font-mono">
                        {importedList.slice(0, 50).map((r, idx) => (
                          <div
                            key={`${r.email}-${idx}`}
                            className="px-3 py-2 flex items-center justify-between hover:bg-vellum/30 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="text-[10px] text-slate w-5 text-right font-sans">
                                {idx + 1}.
                              </span>
                              <span className="text-ink font-medium truncate">{r.email}</span>
                              {r.name && (
                                <span className="text-slate font-sans text-[11px] truncate">
                                  ({r.name})
                                </span>
                              )}
                              <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                                Hi {r.firstName || r.name || 'there'},
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImportedRecipient(r.email)}
                              className="text-slate hover:text-red-600 p-1 rounded hover:bg-vellum cursor-pointer shrink-0 transition-colors"
                              title="Remove recipient"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {importedList.length > 50 && (
                        <div className="p-2 bg-vellum/30 text-center text-[11px] text-slate font-sans border-t border-graphite-hairline">
                          Showing first 50 of {importedList.length} imported recipients
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-paper p-4 rounded-xl border border-dashed border-graphite-hairline text-center text-xs text-slate">
                      No custom recipients added yet. Use Manual Entry above, paste emails, or upload a CSV file.
                    </div>
                  )}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-ink">
                      From Email Address <span className="text-red-500">*</span>
                    </label>
                    {savedCustomSenders.includes(fromEmail) && (
                      <button
                        type="button"
                        onClick={() => removeCustomSender(fromEmail)}
                        className="text-[10px] text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                      >
                        Delete saved address
                      </button>
                    )}
                  </div>
                  <select
                    value={fromEmail}
                    onChange={(e) => handleFromEmailChange(e.target.value)}
                    className="input bg-paper text-xs cursor-pointer"
                  >
                    <optgroup label="Default Verified Senders">
                      {VERIFIED_SENDERS.map((s) => (
                        <option key={s.email} value={s.email}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>

                    {savedCustomSenders.length > 0 && (
                      <optgroup label="Saved Custom Senders (localStorage)">
                        {savedCustomSenders.map((email) => (
                          <option key={email} value={email}>
                            {email} (Custom)
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="New Sender">
                      <option value="custom">+ Enter New Custom Address...</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    From Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fromName}
                    onChange={(e) => handleFromNameChange(e.target.value)}
                    placeholder="StableStack"
                    className="input bg-paper text-xs"
                  />
                </div>
              </div>

              {/* Extra input if 'custom' is selected */}
              {fromEmail === 'custom' && (
                <div className="p-3 bg-paper rounded-xl border border-graphite-hairline space-y-2">
                  <label className="block text-xs font-medium text-ink">
                    New Custom From Address <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      required
                      value={customFromEmail}
                      onChange={(e) => setCustomFromEmail(e.target.value)}
                      placeholder="announcements@stablestack.xyz"
                      className="input bg-vellum/50 text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (saveCustomSender(customFromEmail)) {
                          const savedEmail = customFromEmail.trim().toLowerCase();
                          setFromEmail(savedEmail);
                          setCustomFromEmail('');
                          toast.success(`Saved and selected ${savedEmail}`);
                        }
                      }}
                      disabled={!customFromEmail || !customFromEmail.includes('@')}
                      className="btn-secondary text-xs py-2 px-3 whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      Save to List
                    </button>
                  </div>
                  <p className="text-[10px] text-slate">
                    Saved addresses are stored locally in your browser and automatically appear in the dropdown above for future campaigns. Must be verified in Zoho ZeptoMail.
                  </p>
                </div>
              )}

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
                  From: <span className="font-semibold text-ink">{fromName} &lt;{resolvedFromEmail}&gt;</span>
                </div>
                <div className="text-xs font-medium text-ink truncate">
                  Subject: <span className="font-normal">{subject || '(No subject)'}</span>
                </div>
                <div className="text-[11px] text-slate flex items-center justify-between pt-0.5 border-t border-graphite-hairline/60">
                  <span>ZeptoMail Template:</span>
                  <span className="font-mono font-medium text-purple-700">general-template</span>
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
              Sender: <span className="font-semibold text-ink">{fromName} &lt;{resolvedFromEmail}&gt;</span>
            </div>
            <div className="text-slate">
              Subject: <span className="font-semibold text-ink">[TEST] {subject}</span>
            </div>
            <div className="text-slate">
              Template: <span className="font-mono text-purple-700">General Template (general-template)</span>
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
              <strong className="underline">{estimatedCount.toLocaleString()} recipient(s)</strong> via Zoho ZeptoMail using the <strong>General Template</strong> (<code>general-template</code>).
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
              <span className="font-mono text-ink">{fromName} &lt;{resolvedFromEmail}&gt;</span>
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
              <span className="font-mono text-purple-700">General Template (general-template)</span>
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
