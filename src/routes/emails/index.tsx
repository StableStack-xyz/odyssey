import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Modal } from '../../components/ui/Modal';
import { StatsCard } from '../../components/ui/StatsCard';
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
  Plus,
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
      { name: 'description', content: 'Bulk emailing system using Zoho ZeptoMail' },
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
    name: 'General Announcement',
    subject: 'Important Platform Update from StableStack',
    preheader: 'Important improvements and updates regarding your StableStack account.',
    bodyHtml: `<h3>Hello {{first_name}},</h3>
<p>We are writing to share an important update regarding our platform features and infrastructure improvements.</p>
<p>Over the past few weeks, we have rolled out several enhancements to make your stablecoin settlement and payout flows significantly faster and more reliable.</p>
<ul>
  <li><strong>Instant Settlement:</strong> Higher throughput across supported payout corridors.</li>
  <li><strong>Real-Time Monitoring:</strong> Improved transaction tracking and reporting.</li>
  <li><strong>Enhanced Security:</strong> Strengthened compliance verification and account safeguards.</li>
</ul>
<p>If you have any questions, our support team is available 24/7 to assist you.</p>`,
    ctaText: 'View Dashboard',
    ctaUrl: 'https://stablestack.xyz',
  },
  {
    name: 'Scheduled Maintenance',
    subject: 'Notice of Scheduled System Maintenance',
    preheader: 'Please be advised of upcoming maintenance on our payment rails.',
    bodyHtml: `<h3>Dear {{first_name}},</h3>
<p>Please be advised that we will be performing routine system maintenance on our processing infrastructure to enhance stability and performance.</p>
<blockquote><strong>Maintenance Window:</strong> Sunday, 02:00 AM – 04:00 AM UTC</blockquote>
<p>During this window, API transaction submissions and portal access may experience brief intermittent pauses. All pending settlements will process automatically once maintenance concludes.</p>
<p>Thank you for your patience and partnership.</p>`,
    ctaText: 'System Status',
    ctaUrl: 'https://status.stablestack.xyz',
  },
  {
    name: 'Compliance / Verification',
    subject: 'Action Required: Verify Account Information',
    preheader: 'Please review and confirm your compliance profile.',
    bodyHtml: `<h3>Hi {{first_name}},</h3>
<p>As part of our periodic compliance review and regulatory obligations, we kindly ask you to review your account details and ensure your business records are fully up to date.</p>
<p>Keeping your profile verified ensures uninterrupted access to all payment corridors and high-volume limits.</p>`,
    ctaText: 'Review Profile',
    ctaUrl: 'https://stablestack.xyz/onboarding',
  },
];

const ZEPTO_TEMPLATES = [
  { key: 'generic-template', name: 'Generic Notification Template (Empty Body Container)' },
  { key: 'compliance-template', name: 'Compliance Template' },
  { key: 'welcome-template', name: 'Welcome Template' },
  { key: 'verify-your-account-template', name: 'Verify Your Account Template' },
  { key: 'custom', name: '+ Custom ZeptoMail Template Key / Alias' },
];

const MERGE_TAGS = [
  { tag: '{{first_name}}', label: 'First Name' },
  { tag: '{{last_name}}', label: 'Last Name' },
  { tag: '{{name}}', label: 'Full Name' },
  { tag: '{{email}}', label: 'Email' },
  { tag: '{{company}}', label: 'Company / Business' },
  { tag: '{{date}}', label: 'Current Date' },
];

function EmailBroadcastPage() {
  const { user: currentAdmin, isFullAccess, canRead, canWrite } = usePermissions();

  // ZeptoMail template state
  const [selectedTemplate, setSelectedTemplate] = useState('generic-template');
  const [customTemplateKey, setCustomTemplateKey] = useState('');

  // Target mode state
  const [targetType, setTargetType] = useState<'platform_users' | 'imported'>('platform_users');
  const [platformFilter, setPlatformFilter] = useState<'all' | 'merchants' | 'individuals' | 'approved'>('all');

  // Imported recipients state
  const [rawPastedEmails, setRawPastedEmails] = useState('');
  const [importedList, setImportedList] = useState<ImportedRecipient[]>([]);
  const [importStats, setImportStats] = useState({ valid: 0, duplicates: 0, invalid: 0 });
  const [csvFileName, setCsvFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email composer form state
  const [fromEmail, setFromEmail] = useState('hello@stablestack.xyz');
  const [customFromEmail, setCustomFromEmail] = useState('');
  const [fromName, setFromName] = useState('Stablestack');
  const [replyTo, setReplyTo] = useState('');
  const [ccList, setCcList] = useState('');
  const [bccList, setBccList] = useState('');

  const [subject, setSubject] = useState('Important Platform Update from StableStack');
  const [preheader, setPreheader] = useState('Important improvements and updates regarding your StableStack account.');
  const [bodyHtml, setBodyHtml] = useState(TEMPLATE_PRESETS[0].bodyHtml);
  const [enableCta, setEnableCta] = useState(true);
  const [ctaText, setCtaText] = useState('View Dashboard');
  const [ctaUrl, setCtaUrl] = useState('https://stablestack.xyz');

  // Preview device state
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Modals state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(currentAdmin?.email || '');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [sendResult, setSendResult] = useState<any | null>(null);

  // Textarea ref for inserting merge tags
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch platform user counts
  const { data: recipientCounts, isLoading: isLoadingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['broadcast-recipients-summary'],
    queryFn: async () => {
      const res = await authApi.get('/api/users/auth/broadcast/recipients-summary');
      return res.data?.data || { total: 0, merchants: 0, individuals: 0, approved: 0 };
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
        messageContent: bodyHtml,
        preheader,
        bodyHtml,
        fromEmail: activeSender,
        fromName,
        replyTo: replyTo || undefined,
        cc: ccList ? ccList.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        bcc: bccList ? bccList.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        ctaText: enableCta ? ctaText : '',
        ctaUrl: enableCta ? ctaUrl : '',
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
        targetFilter: targetType === 'platform_users' ? platformFilter : undefined,
        importedRecipients: targetType === 'imported' ? importedList : undefined,
        templateKey: activeTemplateKey,
        fromEmail: activeSender,
        fromName,
        replyTo: replyTo || undefined,
        cc: ccList ? ccList.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        bcc: bccList ? bccList.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        subject,
        messageContent: bodyHtml,
        preheader,
        bodyHtml,
        ctaText: enableCta ? ctaText : '',
        ctaUrl: enableCta ? ctaUrl : '',
      };

      const res = await authApi.post('/api/users/auth/broadcast/send', payload);
      return res.data?.data;
    },
    onSuccess: (data) => {
      setSendResult(data);
      setIsConfirmModalOpen(false);
      toast.success(`Broadcast finished: ${data?.sent || 0} sent, ${data?.failed || 0} failed`);
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

    // Check if first line is CSV header
    let hasHeader = false;
    let emailIdx = 0;
    let nameIdx = -1;

    if (lines.length > 0 && lines[0].includes(',')) {
      const headerParts = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const foundEmailIdx = headerParts.findIndex((h) => h.includes('email') || h.includes('mail'));
      if (foundEmailIdx !== -1) {
        hasHeader = true;
        emailIdx = foundEmailIdx;
        nameIdx = headerParts.findIndex((h) => h.includes('name') || h.includes('first'));
      }
    }

    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      let email = '';
      let name = '';

      if (line.includes(',')) {
        const parts = line.split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
        email = parts[emailIdx] || '';
        if (nameIdx !== -1 && parts[nameIdx]) {
          name = parts[nameIdx];
        } else if (parts.length > 1 && emailIdx === 0) {
          name = parts[1];
        }
      } else {
        email = line.trim();
      }

      email = email.toLowerCase().trim();

      // Basic regex check
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!isValidEmail) {
        invalidCount++;
        continue;
      }

      if (seenEmails.has(email)) {
        duplicateCount++;
        continue;
      }

      seenEmails.add(email);
      validRecipients.push({
        email,
        name: name || undefined,
        firstName: name ? name.split(' ')[0] : undefined,
      });
    }

    setImportedList(validRecipients);
    setImportStats({
      valid: validRecipients.length,
      duplicates: duplicateCount,
      invalid: invalidCount,
    });
  };

  // Insert merge tag at current cursor position
  const insertMergeTag = (tag: string) => {
    if (!bodyTextareaRef.current) {
      setBodyHtml((prev) => prev + ` ${tag}`);
      return;
    }
    const el = bodyTextareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const prev = bodyHtml;
    const next = prev.substring(0, start) + tag + prev.substring(end);
    setBodyHtml(next);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Selected recipient count
  const estimatedCount = useMemo(() => {
    if (targetType === 'imported') {
      return importedList.length;
    }
    if (!recipientCounts) return 0;
    if (platformFilter === 'merchants') return recipientCounts.merchants || 0;
    if (platformFilter === 'individuals') return recipientCounts.individuals || 0;
    if (platformFilter === 'approved') return recipientCounts.approved || 0;
    return recipientCounts.total || 0;
  }, [targetType, importedList, platformFilter, recipientCounts]);

  // Live compiled preview HTML
  const compiledPreviewHtml = useMemo(() => {
    let replaced = bodyHtml
      .replace(/\{\{first_name\}\}/gi, 'Gabriel')
      .replace(/\{\{last_name\}\}/gi, 'Ajenifuja')
      .replace(/\{\{name\}\}/gi, 'Gabriel Ajenifuja')
      .replace(/\{\{email\}\}/gi, 'gabriel@stablestack.xyz')
      .replace(/\{\{company\}\}/gi, 'Acme Global Corp')
      .replace(/\{\{business_name\}\}/gi, 'Acme Global Corp')
      .replace(
        /\{\{date\}\}/gi,
        new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      );

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f6f9; color: #1a1a24; }
    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e7e7ed; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background: #0b091a; padding: 24px; text-align: center; }
    .body { padding: 32px 28px; font-size: 14.5px; line-height: 1.65; color: #2b2b36; }
    .body h1, .body h2, .body h3 { color: #0b091a; margin-top: 0; margin-bottom: 12px; }
    .body p { margin: 0 0 14px 0; }
    .body ul, .body ol { margin: 0 0 14px 0; padding-left: 20px; }
    .body li { margin-bottom: 6px; }
    .body blockquote { margin: 16px 0; padding: 10px 16px; background-color: #f8fafc; border-left: 3px solid #10b981; font-style: italic; color: #475569; }
    .body a { color: #10b981; text-decoration: underline; }
    .cta-wrap { text-align: center; margin: 28px 0 16px 0; }
    .cta-btn { display: inline-block; padding: 12px 28px; background-color: #10b981; color: #ffffff !important; text-decoration: none !important; font-weight: 600; font-size: 14px; border-radius: 9999px; }
    .footer { background: #fafafc; border-top: 1px solid #ededf2; padding: 24px 28px; text-align: center; font-size: 11.5px; color: #717184; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="https://res.cloudinary.com/dmllysomu/image/upload/v1774460775/stablestack-logo_my8fxq.png" alt="StableStack" width="120" style="display: block; margin: 0 auto;" />
    </div>
    <div class="body">
      ${replaced}
      ${enableCta && ctaUrl && ctaText ? `<div class="cta-wrap"><a href="${ctaUrl}" class="cta-btn">${ctaText}</a></div>` : ''}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0; font-weight: 500; color: #4b4b5c;">StableStack Inc. &bull; Enterprise Stablecoin Infrastructure</p>
      <p style="margin: 0 0 6px 0;">Questions? Contact support@stablestack.xyz</p>
      <p style="margin: 0; color: #9494a6;">&copy; ${new Date().getFullYear()} StableStack. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
  }, [bodyHtml, enableCta, ctaText, ctaUrl]);

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
              Dispatch bulk transactional & announcement emails via Zoho ZeptoMail using the Master Branded Shell.
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
                if (!bodyHtml.trim()) {
                  toast.error('Please enter email body content');
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
              <Send className="w-3.5 h-3.5" />
              <span>Send Broadcast ({estimatedCount.toLocaleString()})</span>
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
            change="High-volume partners"
          />
          <StatsCard
            label="Approved Compliance"
            value={isLoadingCounts ? '...' : (recipientCounts?.approved || 0).toLocaleString()}
            icon={CheckCircle2}
            change="KYC/KYB verified"
            changeType="positive"
          />
          <StatsCard
            label="Active Audience Pool"
            value={estimatedCount.toLocaleString()}
            icon={Mail}
            change={targetType === 'platform_users' ? `Filter: ${platformFilter}` : 'Imported List'}
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
                  className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
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
                  className={`py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
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
                <div className="space-y-3 pt-1">
                  <label className="block text-xs font-medium text-ink">
                    Select Target User Segment <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'all', label: 'All Users', count: recipientCounts?.total || 0 },
                      { id: 'merchants', label: 'Merchants', count: recipientCounts?.merchants || 0 },
                      { id: 'individuals', label: 'Individuals', count: recipientCounts?.individuals || 0 },
                      { id: 'approved', label: 'Approved KYC', count: recipientCounts?.approved || 0 },
                    ].map((seg) => (
                      <button
                        key={seg.id}
                        type="button"
                        onClick={() => setPlatformFilter(seg.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          platformFilter === seg.id
                            ? 'bg-paper border-emerald-500 ring-1 ring-emerald-500 shadow-sm'
                            : 'bg-paper/60 border-graphite-hairline hover:bg-paper'
                        }`}
                      >
                        <div className="text-xs font-semibold text-ink">{seg.label}</div>
                        <div className="text-[11px] text-slate mt-0.5">
                          {isLoadingCounts ? '...' : seg.count.toLocaleString()} accounts
                        </div>
                      </button>
                    ))}
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
                <h3 className="text-sm font-semibold text-ink">Sender & Routing Options</h3>
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
                    CC Email (Optional)
                  </label>
                  <input
                    type="text"
                    value={ccList}
                    onChange={(e) => setCcList(e.target.value)}
                    placeholder="compliance@stablestack.xyz"
                    className="input bg-paper text-xs"
                  />
                  <p className="text-[10px] text-slate mt-0.5">
                    Comma-separated emails to receive a CC of the dispatch.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Reply-To (Optional)
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
                      ZeptoMail Host Template <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="input bg-paper text-xs cursor-pointer"
                    >
                      {ZEPTO_TEMPLATES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate mt-0.5">
                      The shell template in Zoho ZeptoMail that content will be pushed into.
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
                  <h3 className="text-sm font-semibold text-ink">Message Composer</h3>
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
                        setPreheader(preset.preheader);
                        setBodyHtml(preset.bodyHtml);
                        setCtaText(preset.ctaText);
                        setCtaUrl(preset.ctaUrl);
                        toast.info(`Loaded preset: ${preset.name}`);
                      }}
                      className="text-[11px] px-2 py-0.5 rounded border border-graphite-hairline bg-paper hover:bg-vellum text-ink transition-colors cursor-pointer"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject & Preheader */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-ink">
                      Subject Line <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate font-mono">{subject.length} chars</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Important Notice: Scheduled Payment Rails Maintenance"
                    className="input bg-paper text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Preheader Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="Short summary preview shown in the recipient inbox list"
                    className="input bg-paper text-xs text-slate"
                  />
                </div>
              </div>

              {/* Merge Tags Bar */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag className="w-3.5 h-3.5 text-ash" />
                  <span className="text-xs font-medium text-ink">Insert Personalization Tags:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {MERGE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => insertMergeTag(t.tag)}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-paper border border-graphite-hairline text-ink hover:border-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      + {t.label} ({t.tag})
                    </button>
                  ))}
                </div>
              </div>

              {/* Rich Body Content (HTML / Markdown) */}
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Message Body Content (HTML Supported) <span className="text-red-500">*</span>
                </label>
                <textarea
                  ref={bodyTextareaRef}
                  rows={9}
                  required
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="<p>Hello {{first_name}},</p><p>We are excited to announce...</p>"
                  className="input bg-paper font-mono text-xs w-full resize-y leading-relaxed"
                />
                <p className="text-[11px] text-slate mt-1">
                  Content will be injected into the central body area of the StableStack Master Email Template.
                </p>
              </div>

              {/* Call-to-action button settings */}
              <div className="pt-2 border-t border-graphite-hairline/80 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCta}
                    onChange={(e) => setEnableCta(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs font-medium text-ink">
                    Include Call-to-Action (CTA) Button
                  </span>
                </label>

                {enableCta && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className="block text-[11px] text-slate mb-1">Button Text</label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="View Dashboard"
                        className="input bg-paper text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate mb-1">Target URL</label>
                      <input
                        type="url"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="https://stablestack.xyz"
                        className="input bg-paper text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Interactive Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-24 space-y-3">
            <div className="bg-vellum/40 p-4 rounded-2xl border border-graphite-hairline space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-ink">Live Shell Preview</h3>
                </div>

                {/* Device switch */}
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
                    title="Mobile Preview (375px)"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subject simulation */}
              <div className="bg-paper p-3 rounded-xl border border-graphite-hairline text-xs space-y-1">
                <div className="text-[11px] text-slate">
                  From: <span className="font-semibold text-ink">{fromName} &lt;{fromEmail}&gt;</span>
                </div>
                <div className="text-xs font-medium text-ink truncate">
                  Subject: <span className="font-normal">{subject || '(No subject)'}</span>
                </div>
                {preheader && (
                  <div className="text-[11px] text-slate truncate">
                    Snippet: <span className="italic">{preheader}</span>
                  </div>
                )}
              </div>

              {/* Rendered Frame */}
              <div
                className={`mx-auto bg-paper rounded-xl border border-graphite-hairline overflow-hidden shadow-sm transition-all ${
                  previewDevice === 'mobile' ? 'max-w-[375px]' : 'w-full'
                }`}
              >
                <div className="h-[520px] w-full overflow-hidden">
                  <iframe
                    title="Email Preview"
                    srcDoc={compiledPreviewHtml}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate text-center">
                Preview displays sample recipient <code>Gabriel Ajenifuja</code> for merge tags.
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
        title="Send Test Email"
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
            Sends an immediate test email of this exact campaign to verify formatting in Gmail, Outlook, and mobile mail clients.
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
                  <span>Sending Test...</span>
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
        title="Confirm Bulk Email Broadcast"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">Review before sending:</span> You are about to dispatch this campaign to{' '}
              <strong className="underline">{estimatedCount.toLocaleString()} recipient(s)</strong> via Zoho ZeptoMail.
              Each recipient will receive an individual personalized email.
            </div>
          </div>

          <div className="bg-vellum/30 p-4 rounded-xl border border-graphite-hairline space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate">Recipient Target:</span>
              <span className="font-semibold text-ink">
                {targetType === 'platform_users'
                  ? `Platform Users (${platformFilter.toUpperCase()})`
                  : `Imported List (${csvFileName || 'Pasted'})`}
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
      {/* MODAL 3: COMPLETION SUMMARY                                  */}
      {/* ============================================================ */}
      {sendResult && (
        <Modal
          isOpen={Boolean(sendResult)}
          onClose={() => setSendResult(null)}
          title="Broadcast Dispatch Summary"
          size="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-ink">Broadcast Complete</h4>
              <p className="text-xs text-slate mt-1">
                Your email broadcast has finished processing through Zoho ZeptoMail.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-paper border border-graphite-hairline rounded-xl">
                <div className="text-[10px] text-slate uppercase">Total</div>
                <div className="text-base font-bold font-mono text-ink mt-0.5">{sendResult.total}</div>
              </div>
              <div className="p-3 bg-paper border border-graphite-hairline rounded-xl">
                <div className="text-[10px] text-slate uppercase">Sent</div>
                <div className="text-base font-bold font-mono text-emerald-600 mt-0.5">{sendResult.sent}</div>
              </div>
              <div className="p-3 bg-paper border border-graphite-hairline rounded-xl">
                <div className="text-[10px] text-slate uppercase">Failed</div>
                <div className="text-base font-bold font-mono text-red-500 mt-0.5">{sendResult.failed}</div>
              </div>
            </div>

            {sendResult.failedList && sendResult.failedList.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-ink">Failed Deliveries ({sendResult.failedList.length})</h5>
                <div className="max-h-40 overflow-y-auto p-2 bg-paper border border-graphite-hairline rounded-xl text-xs space-y-1 font-mono">
                  {sendResult.failedList.map((f: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-red-600">
                      <span>{f.email}</span>
                      <span className="text-[11px] text-slate">{f.reason}</span>
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
                Close Summary
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
