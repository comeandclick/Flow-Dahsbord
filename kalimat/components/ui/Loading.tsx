export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
  return (
    <svg className={`animate-spin ${sizes[size]} text-muted`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export function LoadingCard() {
  return (
    <div className="bg-surface rounded-2xl border border-border p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  )
}
