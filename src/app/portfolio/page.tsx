// Professional Lead Gen Platform - Enterprise Module
// Account Portfolio Management Interface

"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Loader2, 
  Briefcase, 
  Globe, 
  Zap, 
  Filter
} from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { analyzeSourceAccount, findCompetitiveProxies } from '@/services/gemini.service';
import ProxyGrid from '@/components/discovery/ProxyGrid'; // Ensure you have this or render logic inline

export default function PortfolioPage() {
  const [inputName, setInputName] = useState('');
  const {
    sourceAccounts,
    selectedAccount,
    competitiveProxies,
    status,
    setSourceAccounts,
    selectAccount,
    setProcessingStatus,
    setProxies,
    addAccount,
    saveProxiesToDB
  } = usePortfolioStore();

  const handleAddAccount = async () => {
    if (!inputName.trim()) return;
    
    setProcessingStatus({ analyzingSource: true });
    try {
      const blueprint = await analyzeSourceAccount(inputName);
      await addAccount(blueprint);
      setInputName('');
    } catch (error) {
      console.error("Blueprinting failed", error);
      alert("Analysis failed. Check console.");
    } finally {
      setProcessingStatus({ analyzingSource: false });
    }
  };

  const handleDiscoverProxies = async () => {
    if (!selectedAccount) return;
    setProcessingStatus({ findingProxies: true });
    try {
      // Initial fetch: Pass empty array as existing names
      const proxies = await findCompetitiveProxies(selectedAccount, []);
      // Save to DB first, then update local state to avoid race with syncWithCloud
      await saveProxiesToDB(proxies, selectedAccount.id);
      setProxies(proxies);
    } catch (error: any) {
      console.error("Proxy discovery failed", error);
      const msg = error?.message?.includes('quota') || error?.message?.includes('429')
        ? "All API keys rate-limited. Please wait a minute and try again."
        : "Proxy discovery failed. Check console for details.";
      alert(msg);
    } finally {
      setProcessingStatus({ findingProxies: false });
    }
  };
const handleLoadMoreProxies = async () => {
    if (!selectedAccount) return;
    setProcessingStatus({ findingProxies: true });
    try {
      // FIX: Map the proxies to their names
      const currentNames = competitiveProxies.map(p => p.name);
      const newProxies = await findCompetitiveProxies(selectedAccount, currentNames);
      setProxies(newProxies, true); // Append mode
      await saveProxiesToDB(newProxies, selectedAccount.id);
    } catch (error) {
      console.error("Proxy discovery failed", error);
    } finally {
      setProcessingStatus({ findingProxies: false });
    }
  };
  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Top Action Bar */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Briefcase size={20} className="text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Account Portfolio</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
              placeholder="Enter Company Name (e.g. Stripe)..."
              className="w-72 bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button 
            onClick={handleAddAccount}
            disabled={status.analyzingSource || !inputName}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
          >
            {status.analyzingSource ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Analyze Source
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Source Account List */}
        <div className="w-80 border-r border-slate-800 overflow-y-auto p-4 space-y-2">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Saved Blueprints</span>
            <Filter size={14} className="text-slate-600" />
          </div>
          
          {sourceAccounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => selectAccount(acc)}
              className={`w-full p-4 rounded-xl text-left border transition-all group ${
                selectedAccount?.id === acc.id 
                  ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-900/10' 
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold text-sm ${selectedAccount?.id === acc.id ? 'text-blue-400' : 'text-white'}`}>
                  {acc.name}
                </span>
                <Globe size={12} className="text-slate-600" />
              </div>
              <p className="text-[10px] text-slate-500 font-mono mb-2">{acc.domain}</p>
              <div className="text-[10px] px-2 py-0.5 bg-slate-800 rounded-full text-slate-400 inline-block">
                {acc.track}
              </div>
            </button>
          ))}
        </div>

        {/* Right: Selected Account Detailed Blueprint */}
        <div className="flex-1 overflow-y-auto bg-slate-900/20 p-8">
          {selectedAccount ? (
            <div className="max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedAccount.name}</h2>
                  <div className="flex gap-4">
                    <span className="text-sm text-blue-400 flex items-center gap-1 font-mono">
                      {selectedAccount.domain}
                    </span>
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      Target Track: <span className="text-slate-300 font-semibold">{selectedAccount.track}</span>
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleDiscoverProxies}
                  disabled={status.findingProxies}
                  className="px-6 py-3 bg-white text-slate-950 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-50 transition-all shadow-xl shadow-white/5"
                >
                  {status.findingProxies ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
                  Find Competitive Proxies
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Source Tech Stack</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAccount.techStack.map((tech, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Niche Analysis</h3>
                  <div className="text-lg text-white font-semibold flex items-center gap-2">
                    <Zap size={18} className="text-amber-500" />
                    {selectedAccount.subDomain}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Strategic alignment identified for mirroring outreach.</p>
                </div>
              </div>

              {/* Render Competitive Proxies Grid directly here if desired, OR keep separate component */}
              {/* For now, we assume the user navigates to Extraction Lab, OR we can show a preview here */}
              
              {competitiveProxies.length > 0 && (
                <div className="pt-8 border-t border-slate-800">
                   <h3 className="text-lg font-bold text-white mb-6">Identified Competitors ({competitiveProxies.length})</h3>
                   <ProxyGrid 
                      proxies={competitiveProxies} 
                      selectedProxyIds={[]} 
                      onToggleProxy={() => {}} // No-op in portfolio view
                   />
                   
                   {/* LOAD MORE BUTTON */}
                   <button 
                      onClick={async () => {
                        setProcessingStatus({ findingProxies: true });
                        // Pass existing names to exclude them
                        const currentNames = competitiveProxies.map(p => p.name);
                        const newProxies = await findCompetitiveProxies(selectedAccount, currentNames);
                        await saveProxiesToDB(newProxies, selectedAccount.id);
                        setProxies(newProxies, true); // true = append
                        setProcessingStatus({ findingProxies: false });
                      }}
                      disabled={status.findingProxies}
                      className="mt-8 w-full py-4 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-500 transition-all font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                      {status.findingProxies ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                      Identify 10 More Competitors
                    </button>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Briefcase size={48} className="mb-4 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-500">Select an account blueprint to begin discovery.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}