'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Send, 
  Layers, 
  Activity, 
  Settings as SettingsIcon,
  Sparkles,
  Zap,
  Bot
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings?: () => void;
  onOpenQStashTest?: () => void;
  hasActiveCampaign?: boolean;
  isSimulated?: boolean;
}

export default function Navbar({ 
  onOpenSettings, 
  onOpenQStashTest, 
  hasActiveCampaign, 
  isSimulated = true 
}: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Send className="w-5 h-5 text-cyan-400 transform -rotate-12 group-hover:rotate-0 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg text-white tracking-tight">JobApplier</span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                  AI + QUEUE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                LangChain GenAI & Async Batch Scheduler
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
          <Link
            href="/"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              pathname === '/'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Leads & Planner</span>
          </Link>

          <Link
            href="/queue"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 relative ${
              pathname === '/queue'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Queue & Live Logs</span>
            {hasActiveCampaign && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </Link>
        </nav>

        {/* Right Status & Settings */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick 1-Min QStash Schedule Button */}
          {onOpenQStashTest && (
            <button
              type="button"
              onClick={onOpenQStashTest}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-600/20 hover:from-amber-500/30 hover:to-indigo-600/30 border border-amber-500/30 text-amber-300 text-xs font-bold shadow-md shadow-amber-500/10 transition-all hover:scale-[1.02]"
              title="Schedule a 1-minute test job in Upstash QStash"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden sm:inline">⏱️ Test 1-Min QStash</span>
              <span className="sm:hidden">⏱️ 1-Min Test</span>
            </button>
          )}

          {/* Gemini AI Status Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/30 text-purple-300">
            <Bot className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span>AI Rotated</span>
          </div>

          {/* Mode Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
            {isSimulated ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-300">QStash Simulator</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Upstash Active</span>
              </>
            )}
          </div>

          {/* Settings Button */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors"
              title="AI & Queue Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
