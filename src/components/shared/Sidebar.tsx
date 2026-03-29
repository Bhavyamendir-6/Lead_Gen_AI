// Professional Lead Gen Platform - Enterprise Module
// Global Sidebar Navigation

"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Zap,
  Settings,
  Database,
  ChevronRight,
  Globe,
  UserCheck
} from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';

const Sidebar = () => {
  const pathname = usePathname();
  const { sourceAccounts, leads } = usePortfolioStore();

  const navItems = [
    { name: 'Dashboard', href: '/', icon: <LayoutDashboard size={20} /> },
    { 
      name: 'Account Portfolio', 
      href: '/portfolio', 
      icon: <Briefcase size={20} />,
      badge: sourceAccounts.length > 0 ? sourceAccounts.length : null 
    },
    { 
      name: 'Extraction Lab', 
      href: '/extraction-lab', 
      icon: <Zap size={20} />,
      badge: leads.length > 0 ? leads.length : null 
    },
    { name: 'Data Management', href: '/data', icon: <Database size={20} /> },
    { name: 'Contact Validator', href: '/contact-validator', icon: <UserCheck size={20} /> },
  ];

  return (
    <aside className="w-64 h-full bg-slate-900 border-r border-slate-800 flex flex-col z-50">
      {/* Branding */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Globe className="text-white" size={20} />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">Shorthills<span className="text-blue-500">AI</span></span>
        </div>
        <div className="mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Enterprise Edition</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = item.href === '/contact-validator';

          if (isDisabled) {
            return (
              <span
                key={item.name}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-slate-600 cursor-not-allowed opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600">{item.icon}</span>
                  <span className="text-sm font-semibold">{item.name}</span>
                </div>
              </span>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400 transition-colors'}>
                  {item.icon}
                </span>
                <span className="text-sm font-semibold">{item.name}</span>
              </div>

              {item.badge ? (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              ) : (
                <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-white/40' : 'text-slate-600'}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
            pathname === '/settings' ? 'text-white bg-slate-800' : 'text-slate-500 hover:text-white'
          }`}
        >
          <Settings size={20} />
          Settings
        </Link>
        <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800">
           <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">System Status</span>
           </div>
           <p className="text-[10px] text-slate-600">v1.2.4-Production</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;