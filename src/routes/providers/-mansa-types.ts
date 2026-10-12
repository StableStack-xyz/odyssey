export interface Sender {
  id: string
  user_id: string
  sender_profile_id: string
  status: string
  status_reason: string | null
  merchant_name: string | null
  merchant_email: string | null
  updated_at: string
}

export interface MerchantOption {
  user_id: string
  merchant_name: string | null
  email: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export const STATUS_FILTERS = ['', 'pending', 'ready', 'rejected']

export const statusStyle = (status: string) =>
  status === 'ready'
    ? 'bg-green-100 text-green-700'
    : status === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'

export const errorMessage = (error: any) => error?.response?.data?.message || 'Request failed'

export interface MansaBeneficiary {
  id: string
  user_id: string
  account_name: string | null
  account_number: string | null
  bank_name: string | null
  swift_code: string | null
  country: string | null
  account_holder: { id?: string; status?: string; status_reason?: string | null } | null
  user?: { email?: string; businessName?: string; first_name?: string; last_name?: string }
  created_at: string
}
