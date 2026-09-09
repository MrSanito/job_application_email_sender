'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-slate-900 group-[.toaster]:text-slate-100 group-[.toaster]:border-slate-800 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-2xl group-[.toaster]:backdrop-blur-xl',
          description: 'group-[.toast]:text-slate-400 text-xs',
          actionButton:
            'group-[.toast]:bg-indigo-600 group-[.toast]:text-white font-semibold rounded-xl',
          cancelButton:
            'group-[.toast]:bg-slate-800 group-[.toast]:text-slate-300 rounded-xl',
          success: 'group-[.toast]:border-emerald-500/30 group-[.toast]:text-emerald-300',
          error: 'group-[.toast]:border-rose-500/30 group-[.toast]:text-rose-300',
          warning: 'group-[.toast]:border-amber-500/30 group-[.toast]:text-amber-300',
          info: 'group-[.toast]:border-cyan-500/30 group-[.toast]:text-cyan-300',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
