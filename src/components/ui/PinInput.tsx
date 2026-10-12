import React, { useRef } from 'react'

interface PinInputProps {
  value: string
  onChange: (val: string) => void
  length?: number
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

export function PinInput({
  value = '',
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  className = '',
}: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = Array.from({ length }, (_, i) => value[i] || '')

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    // Handle paste or multi-character entry
    const numericChars = rawVal.replace(/\D/g, '')

    if (!numericChars) {
      // Cleared input
      const newDigits = [...digits]
      newDigits[index] = ''
      onChange(newDigits.join(''))
      return
    }

    if (numericChars.length > 1) {
      // Pasted full or partial code
      const pastedCode = numericChars.slice(0, length)
      onChange(pastedCode)
      const nextIndex = Math.min(pastedCode.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    // Single digit entry
    const newDigits = [...digits]
    newDigits[index] = numericChars
    const updatedValue = newDigits.join('')
    onChange(updatedValue)

    // Move to next input box if available
    if (numericChars && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back and clear previous input
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        inputRefs.current[index - 1]?.focus()
      } else {
        const newDigits = [...digits]
        newDigits[index] = ''
        onChange(newDigits.join(''))
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '')
    if (pastedData) {
      const pastedCode = pastedData.slice(0, length)
      onChange(pastedCode)
      const targetIndex = Math.min(pastedCode.length, length - 1)
      inputRefs.current[targetIndex]?.focus()
    }
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      {Array.from({ length }).map((_, index) => {
        const digit = digits[index]
        const isFilled = Boolean(digit)

        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            className={`w-9 h-11 sm:w-11 sm:h-12 text-center font-mono text-lg font-bold rounded-xl border transition-all cursor-text focus:outline-none ${
              isFilled
                ? 'bg-paper border-purple-500/60 text-ink shadow-sm ring-1 ring-purple-500/20'
                : 'bg-vellum/60 border-graphite-hairline text-ink hover:border-slate/40'
            } focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
          />
        )
      })}
    </div>
  )
}
