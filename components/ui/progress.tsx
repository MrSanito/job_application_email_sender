import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indicatorClassName?: string;
  showText?: boolean;
}

export function Progress({
  value = 0,
  max = 100,
  className,
  indicatorClassName,
  showText = false,
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, Math.round(((value || 0) / (max || 100)) * 100)));

  return (
    <div className="w-full space-y-1">
      {showText && (
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span>Progress</span>
          <span className="text-white">{percentage}%</span>
        </div>
      )}
      <div
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-slate-800/80 border border-slate-700/40',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full w-full flex-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500 transition-all duration-500 ease-out rounded-full',
            indicatorClassName
          )}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </div>
    </div>
  );
}
