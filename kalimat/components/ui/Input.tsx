import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  arabic?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, arabic, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          lang={arabic ? 'ar' : undefined}
          className={cn(
            'h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm text-primary placeholder:text-muted',
            'transition-colors focus:border-accent focus:outline-none',
            arabic && 'font-arabic text-right text-base',
            error && 'border-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
