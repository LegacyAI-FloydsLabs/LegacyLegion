import { cn } from '@/lib/utils'

export function Logo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-10 w-10' : size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'relative grid place-items-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-600 shadow-md',
        dim,
      )}>
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
          <path d="M5 4v16h6v-3H8V4H5z" fill="currentColor" />
          <path d="M14 4v16h5v-3h-2V4h-3z" fill="currentColor" opacity="0.85" />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn('font-display font-bold tracking-tight', text)}>
          Legacy<span className="text-gradient">Legion</span>
        </span>
        {size !== 'sm' && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-0.5">by LegacyAI</span>
        )}
      </div>
    </div>
  )
}
