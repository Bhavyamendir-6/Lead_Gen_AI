// Professional Lead Gen Platform - Enterprise Module
// Executive Command Center Dashboard

"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Users, 
  Target, 
  Zap, 
  Activity, 
  ArrowUpRight, 
  Plus, 
  ShieldCheck 
} from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import CookieSettingsModal from '@/components/extraction/CookieSettingsModal';

export default function Dashboard() {
  const { sourceAccounts, session, leads } = usePortfolioStore();
  const [isCookieModalOpen, setCookieModalOpen] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-slate-400 mt-1">Strategic oversight and extraction performance.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setCookieModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-all ${
              session?.status === 'Active' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
            }`}
          >
            <ShieldCheck size={16} />
            {session?.status === 'Active' ? 'Session Secure' : 'Session Required'}
          </button>
          
          {/* Working Link to Portfolio */}
          <Link 
            href="/portfolio"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all"
          >
            <Plus size={16} />
            Register Source Account
          </Link>
        </div>
      </div>

      {/* High-Level Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Portfolios" 
          value={sourceAccounts.length.toString()} 
          icon={<Target className="text-blue-400" />} 
          trend="Live" 
        />
        <StatCard 
          title="Extracted Leads" 
          value={leads.length.toString()} 
          icon={<Users className="text-purple-400" />} 
          trend="Cumulative" 
        />
        <StatCard 
          title="Mirror Efficiency" 
          value="94.2%" 
          icon={<Zap className="text-amber-400" />} 
          trend="Optimal" 
        />
        <StatCard 
          title="System Latency" 
          value="240ms" 
          icon={<Activity className="text-emerald-400" />} 
          trend="Healthy" 
        />
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Source Accounts Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white">Active Source Accounts</h3>
              <Link href="/portfolio" className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                View All <ArrowUpRight size={12} />
              </Link>
            </div>
            
            <div className="p-0">
              {sourceAccounts.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex p-4 bg-slate-800 rounded-full mb-4">
                    <BarChart3 size={32} className="text-slate-600" />
                  </div>
                  <h4 className="text-white font-medium">No accounts registered</h4>
                  <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">
                    Begin by registering a Source Account to mirror its footprint.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {sourceAccounts.map(account => (
                    <div key={account.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-blue-600/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                          <Target size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{account.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{account.domain}</p>
                        </div>
                      </div>
                      <div className="text-[10px] px-2 py-1 bg-slate-800 rounded text-slate-400 font-bold uppercase tracking-wider">
                        {account.track}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: System Health */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="font-bold text-white mb-4">Extraction Vitality</h3>
            <div className="space-y-4">
               <VitalityItem label="LinkedIn Tunnel" status={session ? "Active" : "Offline"} color={session ? "bg-emerald-500" : "bg-red-500"} />
               <VitalityItem label="Gemini LLM Cluster" status="Stable" color="bg-emerald-500" />
               <VitalityItem label="Proxy Rotation" status="Standby" color="bg-amber-500" />
               <VitalityItem label="Human Mimicry" status="Enabled" color="bg-blue-500" />
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-blue-600/5 border border-blue-500/10 rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-2">Platform Protocol</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              1. Add a **Source Account** in Portfolio.<br/>
              2. Generate **Competitive Proxies**.<br/>
              3. Configure **Cookies** in the Dashboard.<br/>
              4. Run **Extraction Lab** to harvest leads.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CookieSettingsModal 
        isOpen={isCookieModalOpen} 
        onClose={() => setCookieModalOpen(false)} 
      />
    </div>
  );
}

/* Sub-components */

const StatCard = ({ title, value, icon, trend }: { title: string, value: string, icon: React.ReactNode, trend: string }) => (
  <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-800 rounded-lg">{icon}</div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{trend}</span>
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{title}</div>
  </div>
);

const VitalityItem = ({ label, status, color }: { label: string, status: string, color: string }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-400">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono text-slate-300 uppercase">{status}</span>
      <div className={`h-2 w-2 rounded-full ${color} shadow-[0_0_8px_rgba(0,0,0,0.3)]`}></div>
    </div>
  </div>
);