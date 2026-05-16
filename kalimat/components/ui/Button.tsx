'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-light active:scale-[0.98]',
      secondary: 'bg-surface border border-border text-primary hover:bg-background active:scale-[0.98]',
      ghost: 'text-muted hover:text-primary hover:bg-background active:scale-[0.98]',
      danger: 'bg-error text-white hover:bg-red-700 active:scale-[0.98]',
      success: 'bg-success text-white hover:bg-green-700 active:scale-[0.98]',
    }

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-5 text-sm',
      lg: 'h-12 px-7 text-base',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Chargement...
          </span>
        ) : children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
