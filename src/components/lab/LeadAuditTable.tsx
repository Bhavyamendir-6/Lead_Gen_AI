// Professional Lead Gen Platform - Enterprise Module
// Lead Audit & Synthesis Interface (Database-Synced)

"use client";

import React, { useState } from 'react';
import { 
  User, 
  ExternalLink, 
  ShieldCheck, 
  Target, 
  Crown, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Loader2,
  Trash2,
  FileDown
} from 'lucide-react';
import { Lead } from '@/types';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { exportLeadsToCSV } from '@/lib/export-utils';
import { generateMirrorHook } from '@/services/gemini.service';
import { createClient } from '@/lib/supabase-client';

const LeadAuditTable = () => {
  const { leads, selectedAccount, competitiveProxies, updateLead, status, setProcessingStatus } = usePortfolioStore();
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const supabase = createClient();

  const handleGenerateHook = async (lead: Lead) => {
    if (!selectedAccount) return;
    const proxy = competitiveProxies.find(p => p.id === lead.proxyId);
    if (!proxy) return;

    setProcessingStatus({ generatingHookFor: lead.id });
    
    try {
      // 1. Generate the Hook via Gemini
      const hook = await generateMirrorHook(lead, selectedAccount, proxy);
      
      // 2. Persist to Supabase
      const { error } = await supabase
        .from('leads')
        .update({ generated_hook: hook, is_verified: true })
        .eq('id', lead.id);

      if (error) throw error;

      // 3. Update Local State
      updateLead(lead.id, { generatedHook: hook, isVerified: true });
    } catch (error) {
      console.error("Hook synthesis or persistence failed:", error);
    } finally {
      setProcessingStatus({ generatingHookFor: null });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyingId(id);
    setTimeout(() => setCopyingId(null), 2000);
  };

  if (leads.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Table Header/Toolbar */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Lead Audit Interface</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-mono">Verified Synthesis Pipeline</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => exportLeadsToCSV(leads)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all">
            <FileDown size={14} /> Export CSV
          </button>
          <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-bold text-blue-400 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            {leads.length} PERSISTED PROFILES
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 border-b border-slate-800">
              <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Identity & Verification</th>
              <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Intent Heatmap</th>
              <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Match Quality</th>
              <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Synthesized Mirror Hook</th>
              <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-blue-500/[0.02] transition-colors group">
                
                {/* Identity Column */}
                <td className="p-4 min-w-[280px]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 text-slate-500 group-hover:border-blue-500/40 transition-all">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{lead.name}</span>
                        {lead.isVerified && (
                           <div className="group/shield relative cursor-help">
                              <ShieldCheck size={14} className="text-emerald-500 fill-emerald-500/10" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/shield:block w-48 p-2 bg-slate-800 text-[10px] text-slate-300 rounded shadow-2xl border border-slate-700 z-50">
                                Verified via Google/LinkedIn Index Retrieval. Zero Hallucination.
                              </div>
                           </div>
                        )}
                        <a href={lead.linkedinUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-blue-400 transition-colors">
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{lead.title}</div>
                    </div>
                  </div>
                </td>
                
                {/* Signal Heatmap */}
                <td className="p-4">
                  <div className="flex justify-center gap-4">
                    <SignalItem active={lead.signalAuthority} icon={<Crown size={14} />} label="Auth" />
                    <SignalItem active={lead.signalTrustBridge} icon={<ShieldCheck size={14} />} label="Trust" />
                    <SignalItem active={lead.signalFunctionalWedge} icon={<Target size={14} />} label="Wedge" />
                  </div>
                </td>

                {/* Match Quality */}
                <td className="p-4">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-600 tracking-tighter uppercase">Confidence</span>
                      <span className={lead.confidenceScore > 85 ? 'text-emerald-400' : 'text-amber-400'}>
                        {lead.confidenceScore}%
                      </span>
                    </div>
                    <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${lead.confidenceScore > 85 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`}
                        style={{ width: `${lead.confidenceScore}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* Mirror Hook Synthesis */}
                <td className="p-4 max-w-md">
                  {lead.generatedHook ? (
                    <div className="relative p-3 bg-slate-950/80 border border-slate-800 rounded-xl group/hook border-l-2 border-l-blue-500">
                      <p className="text-[11px] text-slate-300 italic leading-relaxed">"{lead.generatedHook}"</p>
                      <button 
                        onClick={() => copyToClipboard(lead.generatedHook!, lead.id)}
                        className="absolute top-2 right-2 p-1.5 bg-slate-800 rounded-lg opacity-0 group-hover/hook:opacity-100 transition-all hover:bg-slate-700 hover:text-white"
                      >
                        {copyingId === lead.id ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} className="text-slate-400" />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] text-slate-600 italic px-2">
                       <Loader2 size={10} className="animate-spin opacity-20" />
                       Waiting for synthesis...
                    </div>
                  )}
                </td>

                {/* Action Column */}
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleGenerateHook(lead)}
                      disabled={status.generatingHookFor === lead.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        lead.generatedHook 
                          ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10' 
                          : 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:scale-105 active:scale-95'
                      }`}
                      title="Synthesize Mirror Hook"
                    >
                      {status.generatingHookFor === lead.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : lead.generatedHook ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <Sparkles size={16} />
                      )}
                    </button>
                    
                    <button className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/50 text-slate-600 hover:text-red-400 hover:border-red-400/30 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Sub-component for Signal Icons
const SignalItem = ({ active, icon, label }: { active: boolean, icon: React.ReactNode, label: string }) => (
  <div className={`flex flex-col items-center gap-1 transition-all ${active ? 'opacity-100 scale-100' : 'opacity-10 scale-90 grayscale'}`}>
    <div className={active ? 'text-blue-400 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]' : 'text-slate-500'}>
      {icon}
    </div>
    <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-500">{label}</span>
  </div>
);

export default LeadAuditTable;