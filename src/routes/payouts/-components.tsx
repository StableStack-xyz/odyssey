import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Modal } from '../../components/ui/Modal'
import { walletApi } from '../../lib/api'
import { ISO_COUNTRIES } from '../providers/-mansa-kyb-types'

export interface BeneficiaryRecord {
  id: string
  user_id: string
  type: string
  currency: string | null
  provider: string | null
  label: string | null
  account_name: string | null
  account_number: string | null
  bank_name: string | null
  bank_code: string | null
  swift_code: string | null
  routing_number: string | null
  sort_code: string | null
  iban: string | null
  wallet_address: string | null
  network: string | null
  country: string | null
  bank_address: {
    street_line1?: string
    city?: string
    state?: string
    postal_code?: string
  } | null
}

interface MerchantOption {
  user_id: string
  merchant_name: string | null
  email: string
}

export const CURRENCY_PROVIDERS: Record<string, string[]> = {
  USD: ['MANSA', 'WALAPAY'],
  NGN: ['BUSHA'],
  KES: ['BUSHA'],
  ZAR: ['FIVEWEST'],
  GBP: [],
  EUR: [],
}
export const CURRENCIES = Object.keys(CURRENCY_PROVIDERS)
export const ALL_PROVIDERS = Array.from(new Set(Object.values(CURRENCY_PROVIDERS).flat()))

const errorMessage = (error: any) => {
  const data = error?.response?.data
  return data?.errors?.[0]?.msg || data?.message || 'Request failed'
}

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function MerchantSearch({ onPick }: { onPick: (merchant: MerchantOption) => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebounced(search)

  const { data } = useQuery({
    queryKey: ['admin-beneficiary-merchants', debounced, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const response = await walletApi.get('/api/admin/mansa/merchants', {
        params: { search: debounced, page, limit: 10 },
      })
      return response.data as {
        data: MerchantOption[]
        pagination: { totalPages: number }
      }
    },
  })
  const totalPages = data?.pagination?.totalPages || 1

  return (
    <div className="space-y-2">
      <input
        className="input w-full"
        placeholder="Search merchant by business name or email"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(1)
        }}
        autoFocus
      />
      <ul className="divide-y divide-graphite-hairline max-h-48 overflow-y-auto">
        {(data?.data || []).map((m) => (
          <li key={m.user_id}>
            <button type="button" onClick={() => onPick(m)} className="w-full text-left py-2 px-1 hover:bg-vellum cursor-pointer">
              <p className="text-sm text-ink">{m.merchant_name || 'Unnamed merchant'}</p>
              <p className="text-xs text-slate">{m.email}</p>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-xs text-slate">
        <button type="button" className="btn-secondary cursor-pointer" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button type="button" className="btn-secondary cursor-pointer" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-xs text-slate space-y-1">
    <span>{label}</span>
    {children}
  </label>
)

type Form = Record<string, string>

const toForm = (m?: BeneficiaryRecord | null): Form => ({
  type: m?.type || 'BANK',
  currency: m?.currency || 'USD',
  provider: m?.provider || '',
  label: m?.label || '',
  account_name: m?.account_name || '',
  account_number: m?.account_number || '',
  bank_name: m?.bank_name || '',
  bank_code: m?.bank_code || '',
  swift_code: m?.swift_code || '',
  routing_number: m?.routing_number || '',
  sort_code: m?.sort_code || '',
  iban: m?.iban || '',
  country: m?.country || '',
  wallet_address: m?.wallet_address || '',
  network: m?.network || '',
  street_line1: m?.bank_address?.street_line1 || '',
  city: m?.bank_address?.city || '',
  state: m?.bank_address?.state || '',
  postal_code: m?.bank_address?.postal_code || '',
})

const BANK_FIELDS = [
  'account_name',
  'account_number',
  'bank_name',
  'bank_code',
  'swift_code',
  'routing_number',
  'sort_code',
  'iban',
  'country',
]
const ADDRESS_FIELDS = ['street_line1', 'city', 'state', 'postal_code']

function buildPayload(form: Form, editing: boolean) {
  const payload: Record<string, unknown> = {
    label: form.label.trim() || undefined,
  }
  if (!editing) {
    payload.type = form.type
    payload.currency = form.currency
    if (form.provider) payload.provider = form.provider
  }
  if (form.type === 'WALLET') {
    payload.wallet_address = form.wallet_address.trim()
    payload.network = form.network.trim()
    return payload
  }
  BANK_FIELDS.forEach((key) => {
    const value = form[key].trim()
    if (value) payload[key] = key === 'country' ? value.toUpperCase() : value
  })
  const address = Object.fromEntries(ADDRESS_FIELDS.filter((k) => form[k].trim()).map((k) => [k, form[k].trim()]))
  if (Object.keys(address).length) payload.bank_address = address
  return payload
}

const FIELD_LABELS: Record<string, string> = {
  wallet_address: 'Wallet address',
  network: 'Network',
  account_number: 'Account number',
  bank_name: 'Bank name',
  bank_code: 'Bank code',
  swift_code: 'SWIFT / BIC',
  country: 'Bank country',
  street_line1: 'Bank street address',
  city: 'Bank city',
  state: 'Bank state / province',
}

// Single source of truth for the "*" markers and the submit check
function requiredKeys(form: Form): string[] {
  if (form.type === 'WALLET') return ['wallet_address', 'network']
  const keys = ['account_number', 'bank_name']
  if (form.provider === 'MANSA') keys.push('swift_code', 'country', 'street_line1', 'city', 'state')
  if (['NGN', 'KES'].includes(form.currency)) keys.push('bank_code')
  return keys
}

const missingFields = (form: Form) =>
  requiredKeys(form)
    .filter((key) => !form[key].trim())
    .map((key) => FIELD_LABELS[key].toLowerCase())

export function BeneficiaryFormModal({
  beneficiary,
  onClose,
  onDone,
}: {
  beneficiary?: BeneficiaryRecord | null
  onClose: () => void
  onDone: () => void
}) {
  const editing = !!beneficiary
  const [merchant, setMerchant] = useState<MerchantOption | null>(null)
  const [form, setForm] = useState<Form>(() => toForm(beneficiary))
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const providers = CURRENCY_PROVIDERS[form.currency] || []
  const isBank = form.type === 'BANK'
  const showAddress = isBank && (form.currency === 'USD' || !!form.street_line1)
  const userId = beneficiary?.user_id || merchant?.user_id

  const save = useMutation({
    mutationFn: () => {
      const payload = buildPayload(form, editing)
      return editing
        ? walletApi.put(`/api/admin/users/${userId}/payout-methods/${beneficiary!.id}`, payload)
        : walletApi.post(`/api/admin/users/${userId}/payout-methods`, payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Beneficiary updated' : 'Beneficiary saved')
      onDone()
      onClose()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const submit = () => {
    const missing = missingFields(form)
    if (!userId) missing.unshift('merchant')
    if (missing.length) {
      toast.error(`Missing: ${missing.join(', ')}`)
      return
    }
    save.mutate()
  }

  // Mansa keeps its own copy of the beneficiary, so only the label can change after saving
  const locked = editing && form.provider === 'MANSA'
  const required = new Set(requiredKeys(form))
  const isMansa = form.provider === 'MANSA'
  const text = (key: string, label: string, placeholder = '', lockable = true) => (
    <Field label={`${label}${required.has(key) ? ' *' : ' (optional)'}`}>
      <input className="input w-full" placeholder={placeholder} value={form[key]} disabled={locked && lockable} onChange={set(key)} />
    </Field>
  )

  const countrySelect = (key: string, label: string, lockable = true) => (
    <Field label={`${label}${required.has(key) ? ' *' : ' (optional)'}`}>
      <select
        className="input w-full"
        value={form[key] || ''}
        disabled={locked && lockable}
        onChange={set(key)}
      >
        <option value="">Select country...</option>
        {ISO_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>
    </Field>
  )

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Edit beneficiary' : 'Add beneficiary'} size="full">
      <div className="space-y-4 flex-1 overflow-y-auto pr-1 p-4">
        {editing ? null : merchant ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink">{merchant.merchant_name || 'Unnamed merchant'}</p>
              <p className="text-xs text-slate">{merchant.email}</p>
            </div>
            <button type="button" className="btn-secondary cursor-pointer" onClick={() => setMerchant(null)}>
              Change
            </button>
          </div>
        ) : (
          <MerchantSearch onPick={setMerchant} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <select
              className="input w-full"
              value={form.currency}
              disabled={editing}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currency: e.target.value,
                  provider: '',
                }))
              }
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Provider">
            <select className="input w-full" value={form.provider} disabled={editing} onChange={set('provider')}>
              <option value="">Default for currency</option>
              {providers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select className="input w-full" value={form.type} disabled={editing} onChange={set('type')}>
              <option value="BANK">Bank</option>
              <option value="WALLET">Wallet</option>
            </select>
          </Field>
          {text('label', 'Label', '', false)}
        </div>

        {locked && (
          <p className="text-xs text-slate">
            This beneficiary is registered with Mansa. To change bank details, delete it and add a new one.
          </p>
        )}

        <p className="text-xs text-slate">* required{isMansa ? ' - Mansa needs the bank SWIFT code and full bank address.' : ''}</p>

        {isBank ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {text('account_name', 'Account name', 'Defaults to the merchant name')}
              {text('account_number', 'Account number')}
              {text('bank_name', 'Bank name')}
              {text('bank_code', 'Bank code')}
              {text('swift_code', 'SWIFT / BIC')}
              {text('routing_number', 'Routing number')}
              {text('sort_code', 'Sort code')}
              {text('iban', 'IBAN')}
              {!isMansa && countrySelect('country', 'Bank country (ISO-2)')}
            </div>
            {showAddress && (
              <div className="space-y-2">
                <p className="text-xs text-slate">Bank address</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">{text('street_line1', 'Street address')}</div>
                  {text('city', 'City')}
                  {text('state', 'State / province')}
                  {isMansa && countrySelect('country', 'Country (ISO-2)')}
                  {text('postal_code', 'Postal code')}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">{text('wallet_address', 'Wallet address')}</div>
            {text('network', 'Network', 'TRC20')}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary cursor-pointer" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary cursor-pointer" disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving...' : editing ? 'Save changes' : 'Save beneficiary'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
