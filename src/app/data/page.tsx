// Professional Lead Gen Platform - Enterprise Module
// Data Management & Account-Based Intelligence

"use client";

import React, { useMemo, useState } from 'react';
import { Database, Trash2, FileDown, ShieldCheck, BarChart2, Folder, ChevronRight, User, UserCheck, RefreshCw } from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { exportLeadsToCSV } from '@/lib/export-utils';
import { SourceAccount, Lead } from '@/types';
import { useRouter } from 'next/navigation';

export default function DataManagement() {
  const { sourceAccounts, leads, competitiveProxies, resetStore, syncWithCloud } = usePortfolioStore();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await syncWithCloud();
    setSyncing(false);
  };

  const sendToValidator = (accLeads: Lead[], account: SourceAccount) => {
    const proxyMap = new Map(competitiveProxies.map((p) => [p.id, p]));
    const mapped = accLeads.map((lead) => ({
      Name: lead.name,
      Linkedin: lead.linkedinUrl,
      'Auto Group': account.name,
      Rooftop: proxyMap.get(lead.proxyId)?.name ?? '',
    }));
    localStorage.setItem('pendingValidationLeads', JSON.stringify(mapped));
    router.push('/contact-validator');
  };

  // Helper: Group Leads by Source Account
  // Logic: Lead -> Proxy -> Source Account
  const accountStats = useMemo(() => {
    return sourceAccounts.map(account => {
      // 1. Find all proxies belonging to this account
      const accountProxies = competitiveProxies.filter(p => p.sourceAccountId === account.id);
      const proxyIds = accountProxies.map(p => p.id);
      
      // 2. Find all leads belonging to those proxies
      const accountLeads = leads.filter(l => proxyIds.includes(l.proxyId));
      
      return {
        account,
        leads: accountLeads,
        proxyCount: accountProxies.length
      };
    });
  }, [sourceAccounts, competitiveProxies, leads]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
      
      {/* Header Stats */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Data Management</h1>
          <p className="text-slate-500 mt-1">Global control for your lead infrastructure.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync from Cloud'}
          </button>
          <button
            onClick={() => { if(confirm("Are you sure? This will wipe all local data.")) resetStore(); }}
            className="text-xs text-red-400 hover:text-red-300 underline decoration-red-900 underline-offset-4"
          >
            Factory Reset Cache
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DataCard title="Active Portfolios" value={sourceAccounts.length} icon={<Database className="text-blue-400" />} />
        <DataCard title="Monitored Proxies" value={competitiveProxies.length} icon={<BarChart2 className="text-purple-400" />} />
        <DataCard title="Total Verified Leads" value={leads.length} icon={<ShieldCheck className="text-emerald-400" />} />
      </div>

      {/* Account-Wise Breakdown */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Folder size={20} className="text-slate-500" />
          Portfolio Breakdown
        </h2>

        {accountStats.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
            No active portfolios found. Add a Source Account to begin tracking.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {accountStats.map(({ account, leads: accLeads, proxyCount }) => (
              <div key={account.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-slate-700 transition-all">
                
                {/* Account Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white truncate">{account.name}</h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
                      {account.domain}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <BarChart2 size={12} /> {proxyCount} Proxies
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={12} /> {accLeads.length} Leads Harvested
                    </span>
                  </div>
                </div>

                {/* Lead Preview (Mini Avatars) */}
                <div className="flex -space-x-2 overflow-hidden">
                  {accLeads.slice(0, 5).map((l, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-400 font-bold" title={l.name}>
                      {l.name.charAt(0)}
                    </div>
                  ))}
                  {accLeads.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                      +{accLeads.length - 5}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => sendToValidator(accLeads, account)}
                    disabled={accLeads.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg text-sm font-bold border border-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserCheck size={16} />
                    Validate Leads
                  </button>
                  <button
                    onClick={() => exportLeadsToCSV(accLeads)}
                    disabled={accLeads.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-sm font-bold border border-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileDown size={16} />
                    Export {accLeads.length} Leads
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Actions */}
      <div className="pt-8 border-t border-slate-800 flex justify-end">
        <button 
          onClick={() => exportLeadsToCSV(leads)}
          disabled={leads.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"
        >
          <FileDown size={20} /> 
          Export Global Database ({leads.length} Records)
        </button>
      </div>
    </div>
  );
}

const DataCard = ({ title, value, icon }: any) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity scale-150">
      {icon}
    </div>
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-white">{icon}</div>
    </div>
    <div className="text-3xl font-bold text-white font-mono">{value}</div>
    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{title}</div>
  </div>
);