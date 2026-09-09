import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none border',
  {
    variants: {
      variant: {
        default:
          'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20',
        secondary:
          'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700',
        destructive:
          'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
        outline:
          'border-slate-700 text-slate-300 bg-transparent',
        success:
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
        warning:
          'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
        info:
          'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20',
        purple:
          'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full animate-pulse', {
            'bg-indigo-400': variant === 'default',
            'bg-emerald-400': variant === 'success',
            'bg-amber-400': variant === 'warning',
            'bg-rose-400': variant === 'destructive',
            'bg-cyan-400': variant === 'info',
            'bg-purple-400': variant === 'purple',
            'bg-slate-400': variant === 'secondary' || variant === 'outline',
          })}
        />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
