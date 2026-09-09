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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Send className="w-5 h-5 text-cyan-400 transform -rotate-12 group-hover:rotate-0 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                  JobApplier
                </span>
                <Badge variant="default" className="text-[10px] px-2 py-0.2">
                  PRO AI
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                LangChain GenAI & Async Batch Scheduler
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/80 border border-slate-800/80 p-1 rounded-2xl backdrop-blur-md shadow-inner">
          <Link
            href="/"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
              pathname === '/'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Leads & Planner</span>
          </Link>

          <Link
            href="/queue"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 relative ${
              pathname === '/queue'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Queue & Live Stream</span>
            {hasActiveCampaign && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </Link>
        </nav>

        {/* Right Status & Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick 1-Min QStash Schedule Button */}
          {onOpenQStashTest && (
            <Button
              variant="amber"
              size="sm"
              onClick={onOpenQStashTest}
              className="gap-1.5 shadow-amber-500/10"
              title="Schedule a 1-minute test job in Upstash QStash"
            >
              <Zap className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span className="hidden sm:inline">⏱️ Test 1-Min</span>
              <span className="sm:hidden">1-Min</span>
            </Button>
          )}

          {/* Gemini AI Status Badge */}
          <div className="hidden xl:flex items-center">
            <Badge variant="purple" dot className="px-3 py-1 text-xs">
              <Bot className="w-3.5 h-3.5 mr-0.5 text-purple-300" />
              Gemini GenAI
            </Badge>
          </div>

          {/* Mode Pill */}
          <div className="hidden md:flex items-center">
            {isSimulated ? (
              <Badge variant="warning" dot className="px-3 py-1 text-xs">
                Simulator Mode
              </Badge>
            ) : (
              <Badge variant="success" dot className="px-3 py-1 text-xs">
                QStash Live
              </Badge>
            )}
          </div>

          {/* Settings Button */}
          {onOpenSettings && (
            <Button
              variant="outline"
              size="icon-sm"
              onClick={onOpenSettings}
              className="rounded-xl border-slate-700/80 hover:border-slate-500"
              title="AI & Queue Settings"
            >
              <SettingsIcon className="w-4 h-4 text-slate-300" />
            </Button>
          )}
        </div>

      </div>
    </header>
  );
}
