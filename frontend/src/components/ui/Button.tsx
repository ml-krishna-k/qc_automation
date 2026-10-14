import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-brand-800 text-[#f4efe6] hover:bg-brand-700 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset] disabled:bg-sunken disabled:text-ink-faint',
  secondary:
    'bg-surface text-ink border border-line-strong hover:border-brand-500 hover:text-brand-700 disabled:text-ink-faint disabled:hover:border-line-strong',
  ghost: 'bg-transparent text-ink-soft hover:bg-sunken disabled:text-ink-faint',
  danger: 'bg-removed text-white hover:brightness-110 disabled:bg-sunken disabled:text-ink-faint',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150',
        'disabled:cursor-not-allowed active:scale-[0.98]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V1C6 1 1 6 1 12h3Z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  )
}
