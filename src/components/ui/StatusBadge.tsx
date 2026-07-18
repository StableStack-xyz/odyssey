interface StatusBadgeProps {
  status: string;
}

const statusMap: Record<string, string> = {
  completed: 'completed',
  complete: 'completed',
  success: 'completed',
  active: 'active',
  verified: 'verified',
  connected: 'connected',
  approved: 'approved',
  pending: 'pending',
  processing: 'processing',
  notsubmitted: 'notsubmitted',
  failed: 'failed',
  blocked: 'blocked',
  disconnected: 'disconnected',
  rejected: 'rejected',
  cancelled: 'failed',
  inactive: 'blocked',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = statusMap[status?.toLowerCase()] || 'pending';
  
  return (
    <span className="status-badge" data-status={normalized}>
      {status}
    </span>
  );
}
