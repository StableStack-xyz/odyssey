import { useState, useRef, useEffect } from 'react'
import { Filter, X } from 'lucide-react'

export interface FilterField {
  key: string
  label: string
  type: 'select' | 'text'
  value: string
  options?: { label: string; value: string }[]
  onChange: (value: string) => void
  placeholder?: string
}

interface FilterDropdownProps {
  fields: FilterField[]
  className?: string
}

export function FilterDropdown({ fields, className = '' }: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeCount = fields.filter((f) => {
    if (f.type === 'select') return f.value && f.value !== 'all'
    return f.value && f.value !== ''
  }).length

  const hasActive = activeCount > 0

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-normal rounded-full transition-colors cursor-pointer ${
          hasActive
            ? 'bg-ink text-paper'
            : 'bg-vellum text-slate hover:bg-slate/10'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
        {hasActive && (
          <span className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-paper text-[10px] font-medium text-ink">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 max-sm:left-0 z-50 w-64 bg-paper border border-graphite-hairline rounded-xl shadow-xl-3 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink uppercase tracking-wider">Filters</p>
            {hasActive && (
              <button
                onClick={() => {
                  fields.forEach((f) => f.onChange(f.type === 'select' ? 'all' : ''))
                }}
                className="text-[10px] text-slate hover:text-ink transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
          </div>

          {fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="block text-[10px] uppercase tracking-wider text-slate">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={field.value}
                  onChange={(e) => {
                    field.onChange(e.target.value)
                  }}
                  className="input text-xs py-1.5 px-2.5 w-full cursor-pointer appearance-none"
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder={field.placeholder || `Filter by ${field.label.toLowerCase()}...`}
                    className="input text-xs py-1.5 px-2.5 w-full"
                  />
                  {field.value && (
                    <button
                      onClick={() => field.onChange('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-ash hover:text-slate cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
