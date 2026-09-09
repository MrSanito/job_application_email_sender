import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobApplier - Cold Email Outreach & Async Batch Scheduler',
  description:
    'High performance lead ingestion, smart campaign calculator, and asynchronous background email queueing with Upstash QStash.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {/* Subtle decorative background gradient glows */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-indigo-600/15 via-cyan-500/10 to-transparent blur-[120px] rounded-full" />
          <div className="absolute top-1/2 -right-40 w-[600px] h-[400px] bg-gradient-to-bl from-purple-600/10 to-transparent blur-[120px] rounded-full" />
        </div>

        <div className="flex flex-col min-h-screen">
          <main className="flex-1">{children}</main>

          {/* Clean footer */}
          <footer className="border-t border-slate-800/60 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">JobApplier PRO</span>
                <span>•</span>
                <span>Next.js App Router + Upstash QStash & Redis</span>
              </div>
              <div>Automated Async Batch Job Application Engine</div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
