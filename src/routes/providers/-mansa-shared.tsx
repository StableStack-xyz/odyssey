import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function CopyId({ value }: { value?: string | null }) {
  if (!value) return <span className="text-xs text-slate">-</span>
  return (
    <button
      type="button"
      title="Copy ID"
      className="inline-flex items-center gap-1.5 text-xs font-mono text-slate hover:text-ink cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(value).then(() => toast.success('ID copied'))
      }}
    >
      {value}
      <Copy className="w-3 h-3 shrink-0" />
    </button>
  )
}
