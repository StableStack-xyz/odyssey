export interface Tier {
  code: string
  label: string
  wallet_limit: number | null
  sort_order: number
  is_active: boolean
}

export interface MerchantOption {
  merchant_id: string
  merchant_name: string | null
  email: string
}

export type CapacityStatus = 'ok' | 'approaching_limit' | 'limit_reached'

export interface CapacityUsage {
  merchant_id: string
  merchant_name?: string | null
  merchant_email?: string | null
  has_config?: boolean
  tier: string
  wallet_limit: number
  allocated: number
  remaining: number
  usage_percent: number
  activated: number
  activation_rate: number
  activation_threshold_percent: number
  activation_threshold_met: boolean
  status: CapacityStatus
  message: string | null
}

export interface WalletConfig {
  merchant_id: string
  tier: string
  wallet_limit: number
  activation_threshold_percent: number
  warning_threshold_percent: number
  enforce_limit: boolean
  auto_upgrade: boolean
  notes: string | null
}

export const STATUS_STYLES: Record<CapacityStatus, string> = {
  ok: 'bg-green-500/10 text-green-700',
  approaching_limit: 'bg-amber-500/10 text-amber-700',
  limit_reached: 'bg-red-500/10 text-red-700',
}

export const STATUS_LABELS: Record<CapacityStatus, string> = {
  ok: 'OK',
  approaching_limit: 'Approaching limit',
  limit_reached: 'Limit reached',
}
