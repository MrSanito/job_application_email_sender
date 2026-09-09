'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-indigo-400 hover:shadow-indigo-500/35 border border-indigo-400/20',
        destructive:
          'bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-rose-400 border border-rose-400/20',
        outline:
          'border border-slate-700/80 bg-slate-900/60 text-slate-200 hover:bg-slate-800/80 hover:text-white hover:border-slate-600',
        secondary:
          'bg-slate-800 text-slate-100 hover:bg-slate-700/80 border border-slate-700/50 shadow-sm',
        ghost:
          'text-slate-400 hover:text-white hover:bg-slate-800/60',
        link:
          'text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300 p-0 h-auto',
        glowing:
          'bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 text-slate-950 font-bold shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:brightness-110 border border-white/20',
        amber:
          'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 border border-amber-400/30',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, loadingText, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-current" />
            <span>{loadingText || children}</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            {children}
          </span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
