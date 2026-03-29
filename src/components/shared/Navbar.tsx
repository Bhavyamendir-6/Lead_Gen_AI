// Professional Lead Gen Platform - Enterprise Module
// Global Navbar & Session Status (With Logout)

"use client";

import React, { useState } from 'react';
import { Search, Bell, ShieldAlert, ShieldCheck, User, Command, LogOut, Loader2 } from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { createClient } from '@/lib/supabase-client';

const Navbar = () => {
  const { session, resetStore } = usePortfolioStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await supabase.auth.signOut();
      resetStore();
      window.location.href = '/login';
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-8 z-40">
      
      {/* Search Bar / Breadcrumbs Placeholder */}
      <div className="flex items-center flex-1">
        <div className="relative w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search accounts, leads, or mirrors..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] text-slate-500 font-mono">
            <Command size={10} /> K
          </div>
        </div>
      </div>

      {/* Actions & Session Status */}
      <div className="flex items-center gap-6">
        
        {/* Session Vitality Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full">
          {session?.status === 'Active' ? (
            <>
              <ShieldCheck size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Session Active</span>
            </>
          ) : (
            <>
              <ShieldAlert size={14} className="text-red-500" />
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Authentication Required</span>
            </>
          )}
        </div>

        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-slate-900"></span>
        </button>

        <div className="h-8 w-px bg-slate-800"></div>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-4 pl-2">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Enterprise Admin</p>
              <p className="text-[10px] text-slate-500">Tier: Unlimited</p>
            </div>
            <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 group-hover:border-blue-500 transition-all">
              <User size={18} className="text-slate-400" />
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all border border-transparent hover:border-red-900/50"
            title="Sign Out"
          >
            {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;