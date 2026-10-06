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

export const STATUS_FILTERS = ['', 'pending', 'approved', 'rejected']

export const statusStyle = (status: string) =>
  status === 'approved'
    ? 'bg-green-100 text-green-700'
    : status === 'rejected'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'

export const errorMessage = (error: any) => error?.response?.data?.message || 'Request failed'
