// Professional Lead Gen Platform - Enterprise Module
// Extraction Lab: Hybrid Engine Interface (Global Index + Sniper Protocol)
// v5.0.0 - Full UI Integration

"use client";

import React, { useState } from 'react';
import {
  Zap,
  ShieldAlert,
  Filter,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  FileDown,
  Cpu,
  Layers,
  Target,
  ChevronDown,
  Settings2,
  Globe,
  MousePointer,
  Check,
  Database
} from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { suggestDecisionMakers, findCompetitiveProxies } from '@/services/gemini.service';
import { ExtractionMode } from '@/types/leads';
import { CsvLookupRow } from '@/types/csv-lookup';
import ProxyGrid from '@/components/discovery/ProxyGrid';
import ExtractionTerminal from '@/components/extraction/ExtractionTerminal';
import LeadAuditTable from '@/components/lab/LeadAuditTable';
import CsvUploadZone from '@/components/lab/CsvUploadZone';
import { exportLeadsToCSV } from '@/lib/export-utils';
import LeadFilterModal from '@/components/extraction/LeadFilterModal';

export default function ExtractionLab() {
  const {
    selectedAccount,
    competitiveProxies,
    session,
    extractionFilters,
    status,
    setProcessingStatus,
    leads,
    setLeads,
    setProxies,
    saveProxiesToDB,
    saveLeadsBulk
  } = usePortfolioStore();
  
  // Local State
  const [selectedProxyIds, setSelectedProxyIds] = useState<string[]>([]);
  const [batchOffset, setBatchOffset] = useState(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Engine Configuration
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('zoominfo');
  const [progress, setProgress] = useState(0);

  // CSV Lookup State (ZoomInfo mode)
  const [csvRows, setCsvRows] = useState<CsvLookupRow[]>([]);
  const [lookupMeta, setLookupMeta] = useState<any>(null);
  
  // Target Identification State
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // --- Render-time diagnostic ---
  console.log(`[Render] leads.length = ${leads.length}, extractingLeads = ${status.extractingLeads}`);

  // ------------------------------------------------------------------
  // Feature 1: Proxy Management
  // ------------------------------------------------------------------

  const handleToggleProxy = (id: string) => {
    setSelectedProxyIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

const handleLoadMoreProxies = async () => {
    if (!selectedAccount) return;
    setProcessingStatus({ findingProxies: true });
    try {
      // FIX: Map the proxies to their names before passing to the service
      const currentNames = competitiveProxies.map(p => p.name);
      const newProxies = await findCompetitiveProxies(selectedAccount, currentNames);

      // Persist to DB before updating local state
      await saveProxiesToDB(newProxies, selectedAccount.id);
      setProxies(newProxies, true); // Append mode
    } catch (error) {
      console.error("Failed to load more proxies", error);
    } finally {
      setProcessingStatus({ findingProxies: false });
    }
  };

  // ------------------------------------------------------------------
  // Feature 2: Target Persona Identification
  // ------------------------------------------------------------------

  const handleIdentifyTargets = async () => {
    if (selectedProxyIds.length === 0) {
      alert("Please select at least one Competitive Proxy to analyze.");
      return;
    }
    
    setIsSuggesting(true);
    setSuggestedTitles([]);
    setSelectedTitles([]);

    try {
      const proxy = competitiveProxies.find(p => p.id === selectedProxyIds[0]);
      if (proxy) {
        const titles = await suggestDecisionMakers(proxy.name, selectedModel);
        setSuggestedTitles(titles);
        // Auto-select all by default for convenience
        setSelectedTitles(titles);
      }
    } catch (error) {
      console.error("Target identification failed", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const toggleTitleSelection = (title: string) => {
    setSelectedTitles(prev => 
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  // ------------------------------------------------------------------
  // Feature 3: Hybrid Extraction Engine
  // ------------------------------------------------------------------

  const handleStartExtraction = async (isLoadMore = false, useSelectedTitles = false) => {
    if (selectedProxyIds.length === 0) {
      alert("Please select at least one Competitive Proxy.");
      return;
    }
    if (extractionMode === 'sniper' && !session) {
      alert("A LinkedIn session is required for Sniper Protocol. Inject cookies from the Dashboard.");
      return;
    }

    setProcessingStatus({ extractingLeads: true, extractingAutoHarvest: true });
    setProgress(5); // Initial progress

    const currentOffset = isLoadMore ? batchOffset + 30 : 0;
    
    try {
      let newLeads: any[] = [];
      const titlesPayload = useSelectedTitles ? selectedTitles : [];
      const progressStep = 90 / selectedProxyIds.length;

      for (const proxyId of selectedProxyIds) {
        const proxy = competitiveProxies.find(p => p.id === proxyId);
        if (!proxy) continue;

        console.log(`[Client] Requesting harvest (${extractionMode}) for: ${proxy.name}`);

        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const response = await fetch(`${baseUrl}/api/extraction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proxyName: proxy.name,
            filters: extractionFilters,
            offset: currentOffset,
            modelId: selectedModel,
            mode: extractionMode,     // Pass 'search' or 'sniper'
            session: session,         // Pass credentials
            targetTitles: titlesPayload // Pass specific titles if any
          })
        });

        const result = await response.json();

        // --- Diagnostic logging ---
        console.log(`[Client] API response status: ${response.status}`);
        console.log(`[Client] result keys:`, Object.keys(result));
        console.log(`[Client] result.data is array:`, Array.isArray(result.data));
        console.log(`[Client] result.data length:`, result.data?.length ?? 'N/A');
        if (result.error) {
          console.error(`[Client] API returned error:`, result.error);
        }

        if (!response.ok || result.error) {
          console.error(`[Client] Extraction failed for ${proxy.name}:`, result.error || response.statusText);
          continue;
        }

        if (result.data && Array.isArray(result.data)) {
          const resultsWithIds = result.data.map((r: any) => ({
            ...r,
            id: r.id || crypto.randomUUID(),
            proxyId: proxy.id,
            matchedSkills: r.matchedSkills || []
          }));

          if (extractionMode === 'zoominfo') {
            const remaining = 50 - newLeads.length;
            if (remaining <= 0) break;
            newLeads = [...newLeads, ...resultsWithIds.slice(0, remaining)];
            console.log(`[Client] ZoomInfo cap: ${newLeads.length}/50 leads accumulated`);
            if (newLeads.length >= 50) break;
            setProgress(prev => Math.min(prev + progressStep, 95));
            continue;
          }
          newLeads = [...newLeads, ...resultsWithIds];
          console.log(`[Client] Mapped ${resultsWithIds.length} leads for ${proxy.name}, total so far: ${newLeads.length}`);
        }

        // Increment Progress
        setProgress(prev => Math.min(prev + progressStep, 95));
      }

      // Update State
      const finalLeadList = isLoadMore ? [...leads, ...newLeads] : newLeads;
      setLeads(finalLeadList);
      console.log(`[Client] setLeads called with ${finalLeadList.length} leads`);
      setBatchOffset(currentOffset);

      // Persist new leads to Supabase
      try { await saveLeadsBulk(newLeads); } catch (e) { console.warn('Cloud lead save failed:', e); }
      
      setProgress(100);
      setTimeout(() => setProgress(0), 1000); // Hide bar after delay
      
    } catch (error) {
      console.error("Extraction failed:", error);
      setProgress(0);
    } finally {
      setProcessingStatus({ extractingLeads: false, extractingAutoHarvest: false });
    }
  };

  // ------------------------------------------------------------------
  // Feature 4: Direct Target Company Harvest
  // ------------------------------------------------------------------

  const handleHarvestTarget = async () => {
    if (!selectedAccount) return;
    if (extractionMode === 'sniper' && !session) {
      alert("A LinkedIn session is required for Sniper Protocol. Inject cookies from the Dashboard.");
      return;
    }

    setProcessingStatus({ extractingLeads: true, extractingHarvestTarget: true });
    setProgress(5);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseUrl}/api/extraction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxyName: selectedAccount.name,
          filters: extractionFilters,
          offset: 0,
          modelId: selectedModel,
          mode: extractionMode,
          session: session,
          targetTitles: []
        })
      });

      const result = await response.json();

      // --- Diagnostic logging ---
      console.log(`[HarvestTarget] API response status: ${response.status}`);
      console.log(`[HarvestTarget] result keys:`, Object.keys(result));
      console.log(`[HarvestTarget] result.data is array:`, Array.isArray(result.data));
      console.log(`[HarvestTarget] result.data length:`, result.data?.length ?? 'N/A');
      if (result.error) {
        console.error(`[HarvestTarget] API returned error:`, result.error);
      }

      if (result.data && Array.isArray(result.data)) {
        const resultsWithIds = result.data.map((r: any) => ({
          ...r,
          id: r.id || crypto.randomUUID(),
          proxyId: 'target-company',
          matchedSkills: r.matchedSkills || []
        }));
        console.log(`[HarvestTarget] Mapped ${resultsWithIds.length} leads, calling setLeads`);
        setLeads(resultsWithIds);

        // Persist to Supabase
        try { await saveLeadsBulk(resultsWithIds); } catch (e) { console.warn('Cloud lead save failed:', e); }
      } else {
        console.warn(`[HarvestTarget] No data array in response — leads will NOT display`);
      }

      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      console.error("Target company harvest failed:", error);
      setProgress(0);
    } finally {
      setProcessingStatus({ extractingLeads: false, extractingHarvestTarget: false });
    }
  };

  const handleExport = () => {
    exportLeadsToCSV(leads);
  };

  // ------------------------------------------------------------------
  // Feature 5: ZoomInfo CSV Lookup
  // ------------------------------------------------------------------

  const handleModeChange = (mode: ExtractionMode) => {
    setExtractionMode(mode);
    if (mode !== 'zoominfo') {
      setCsvRows([]);
      setLookupMeta(null);
    }
  };

  const handleCsvLookup = async () => {
    if (csvRows.length === 0) return;

    setProcessingStatus({ extractingLeads: true });
    setProgress(5);
    setLookupMeta(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${baseUrl}/api/extraction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'zoominfo-csv', rows: csvRows }),
      });

      const result = await response.json();

      console.log(`[CSV Lookup] API response status: ${response.status}`);
      console.log(`[CSV Lookup] result.data length:`, result.data?.length ?? 'N/A');

      if (!response.ok || result.error) {
        console.error(`[CSV Lookup] Failed:`, result.error || response.statusText);
        setLookupMeta({ totalRows: csvRows.length, found: 0, notFound: 0, errors: csvRows.length, details: [] });
        return;
      }

      if (result.data && Array.isArray(result.data)) {
        const resultsWithIds = result.data.map((r: any) => ({
          ...r,
          id: r.id || crypto.randomUUID(),
          proxyId: 'csv-lookup',
          matchedSkills: r.matchedSkills || [],
        }));
        setLeads(resultsWithIds);
        setLookupMeta(result.meta || null);

        try { await saveLeadsBulk(resultsWithIds); } catch (e) { console.warn('Cloud save failed:', e); }
      }

      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    } catch (error) {
      console.error('CSV lookup failed:', error);
      setProgress(0);
    } finally {
      setProcessingStatus({ extractingLeads: false });
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (!selectedAccount && extractionMode !== 'zoominfo') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center bg-slate-900/50 border border-slate-800 p-12 rounded-2xl max-w-md">
          <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Portfolio Required</h2>
          <p className="text-sm text-slate-500 mb-6">Select a Source Account from your Portfolio to unlock mirroring capabilities, or switch to ZoomInfo Protocol for CSV-based lookup.</p>
          <a href="/portfolio" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-500 transition-all">
            Go to Portfolio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-32 relative">
      
      {/* GLOBAL PROGRESS BAR */}
      {status.extractingLeads && (
        <div className="fixed top-0 left-0 w-full h-1 z-50 bg-slate-900">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_10px_#3b82f6]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* HEADER & CONFIGURATION */}
      <div className="flex flex-col xl:flex-row justify-between items-end bg-slate-900/40 p-6 rounded-2xl border border-slate-800 gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cpu className="text-blue-400" size={24} />
            Extraction Configuration
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            Targeting: <span className="text-white font-semibold">{selectedAccount?.name || 'CSV Upload'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-blue-300">
              v5.0.0-Hybrid
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* Model Selection — hidden in ZoomInfo mode */}
          {extractionMode !== 'zoominfo' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Zap size={10} className="text-amber-400" /> AI Model Cluster
              </label>
              <div className="relative group">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="appearance-none bg-slate-950 border border-slate-700 text-xs text-white px-4 py-2.5 pr-10 rounded-lg focus:border-blue-500 outline-none cursor-pointer min-w-[200px] hover:border-slate-500 transition-colors"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white" />
              </div>
            </div>
          )}

          {/* Target Persona — hidden in ZoomInfo mode */}
          {extractionMode !== 'zoominfo' && (
            <button
              onClick={() => setIsFilterModalOpen(true)}
              className="h-[38px] px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Filter size={16} />
              Target Persona
            </button>
          )}

          <div className="flex gap-2">
            {/* Export CSV — always visible */}
            <button
              onClick={handleExport}
              disabled={leads.length === 0}
              className="h-[38px] px-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 disabled:opacity-50 text-slate-300 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
            >
              <FileDown size={16} />
            </button>

            {/* ZoomInfo: Lookup & Enrich button */}
            {extractionMode === 'zoominfo' && (
              <button
                onClick={handleCsvLookup}
                disabled={status.extractingLeads || csvRows.length === 0}
                className="h-[38px] px-6 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-900/20"
              >
                {status.extractingLeads ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Database size={16} />
                    {csvRows.length > 0 ? `Lookup & Enrich (${csvRows.length})` : 'Upload CSV First'}
                  </>
                )}
              </button>
            )}

            {/* Non-ZoomInfo: Harvest Target & Auto Harvest */}
            {extractionMode !== 'zoominfo' && (
              <>
                <button
                  onClick={handleHarvestTarget}
                  disabled={status.extractingLeads || (extractionMode === 'sniper' && !session)}
                  className="h-[38px] px-5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-amber-900/20"
                >
                  {status.extractingHarvestTarget ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Target size={16} />
                      Harvest Target
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleStartExtraction(false, false)}
                  disabled={status.extractingLeads || selectedProxyIds.length === 0 || (extractionMode === 'sniper' && !session)}
                  className="h-[38px] px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
                >
                  {status.extractingAutoHarvest ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play size={16} className="fill-current" />
                      Auto Harvest
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* PROTOCOL SWITCHER */}
          <div className="flex gap-4">
            <button 
              onClick={() => handleModeChange('search')}
              className={`flex-1 p-4 rounded-xl border flex items-center gap-4 transition-all ${
                extractionMode === 'search'
                  ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${extractionMode === 'search' ? 'bg-blue-500 text-white' : 'bg-slate-800'}`}>
                <Globe size={20} />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">Global Index Protocol</div>
                <div className="text-[10px] opacity-70">Safe • High Volume • Serper API</div>
              </div>
            </button>

            <button
              onClick={() => handleModeChange('sniper')}
              className={`flex-1 p-4 rounded-xl border flex items-center gap-4 transition-all ${
                extractionMode === 'sniper'
                  ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${extractionMode === 'sniper' ? 'bg-emerald-500 text-white' : 'bg-slate-800'}`}>
                <MousePointer size={20} />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">Sniper Protocol</div>
                <div className="text-[10px] opacity-70">100% Accurate • Uses Session • Slow</div>
              </div>
            </button>

            <button
              onClick={() => handleModeChange('zoominfo')}
              className={`flex-1 p-4 rounded-xl border flex items-center gap-4 transition-all ${
                extractionMode === 'zoominfo'
                  ? 'bg-violet-600/10 border-violet-500 text-violet-400'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className={`p-2 rounded-lg ${extractionMode === 'zoominfo' ? 'bg-violet-500 text-white' : 'bg-slate-800'}`}>
                <Database size={20} />
              </div>
              <div className="text-left">
                <div className="font-bold text-sm">ZoomInfo Protocol</div>
                <div className="text-[10px] opacity-70">Enterprise Data • Verified Contacts • MCP</div>
              </div>
            </button>
          </div>

          {/* ZoomInfo mode: CSV upload. Other modes: Proxy grid */}
          {extractionMode === 'zoominfo' ? (
            <CsvUploadZone
              parsedRows={csvRows}
              onRowsParsed={(rows) => setCsvRows(rows)}
              onClear={() => { setCsvRows([]); setLookupMeta(null); }}
            />
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-slate-500" />
                  Selected Competitive Proxies
                </h2>
                {selectedProxyIds.length > 0 && (
                  <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    {selectedProxyIds.length} ACTIVE
                  </span>
                )}
              </div>

              {competitiveProxies.length > 0 ? (
                <>
                  <ProxyGrid
                    proxies={competitiveProxies}
                    selectedProxyIds={selectedProxyIds}
                    onToggleProxy={handleToggleProxy}
                  />
                  <button
                    onClick={handleLoadMoreProxies}
                    disabled={status.findingProxies}
                    className="mt-6 w-full py-3 border border-dashed border-slate-700 rounded-xl text-slate-500 hover:text-blue-400 hover:border-blue-500 hover:bg-slate-900/50 transition-all font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                  >
                    {status.findingProxies ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Load More Competitors
                  </button>
                </>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-600">No proxies identified yet.</p>
                </div>
              )}
            </div>
          )}

          <ExtractionTerminal isActive={status.extractingLeads} />
        </div>

        {/* RIGHT COLUMN — hidden in ZoomInfo mode */}
        {extractionMode !== 'zoominfo' && (
          <div className="space-y-6">

            {/* INTERACTIVE TARGET IDENTIFICATION */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Target size={18} className="text-blue-400" />
                Target Identification
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Analyze blueprint to identify decision makers via <strong>{selectedModel}</strong>.
              </p>

              <button
                onClick={handleIdentifyTargets}
                disabled={isSuggesting || selectedProxyIds.length === 0}
                className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700 transition-all flex items-center justify-center gap-2 mb-6"
              >
                {isSuggesting ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} className="text-amber-500" />}
                Identify Optimal Personas
              </button>

              {suggestedTitles.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      SUGGESTED TARGETS
                    </label>
                    <button
                      onClick={() => handleStartExtraction(false, true)}
                      disabled={selectedTitles.length === 0 || status.extractingLeads}
                      className="text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold transition-colors disabled:opacity-50"
                    >
                      Harvest ({selectedTitles.length})
                    </button>
                  </div>

                  <div className="space-y-2">
                    {suggestedTitles.map((title) => {
                      const isSelected = selectedTitles.includes(title);
                      return (
                        <div
                          key={title}
                          onClick={() => toggleTitleSelection(title)}
                          className={`p-3 rounded-lg text-xs font-medium cursor-pointer transition-all border flex justify-between items-center group ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {title}
                          {isSelected && <Check size={14} className="text-blue-400" />}
                          {!isSelected && <div className="w-3.5 h-3.5 rounded-full border border-slate-700 group-hover:border-slate-500"></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Session Status */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Session Status</h2>
              {session?.status === 'Active' ? (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <CheckCircle2 className="text-emerald-500" size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-400">Tunnel Verified</p>
                    <p className="text-[10px] text-emerald-600 font-mono">Cookies Encrypted</p>
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                  <ShieldAlert className="text-red-500" size={24} />
                  <p className="text-sm font-bold text-red-400">Session Missing</p>
                  <p className="text-xs text-slate-500">Inject LinkedIn cookies in the Dashboard.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RESULTS TABLE */}
      {leads.length > 0 && (
        <div className="mt-12 space-y-8">
          {/* ZoomInfo CSV lookup summary */}
          {extractionMode === 'zoominfo' && lookupMeta && (
            <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg flex items-center gap-3">
              <Database size={16} className="text-violet-400 shrink-0" />
              <p className="text-sm text-violet-300 font-medium">
                ZoomInfo Lookup Complete —{' '}
                <span className="font-bold text-white">{lookupMeta.found} found</span>
                {lookupMeta.notFound > 0 && (
                  <span className="text-slate-400">, {lookupMeta.notFound} not found</span>
                )}
                {lookupMeta.errors > 0 && (
                  <span className="text-red-400">, {lookupMeta.errors} errors</span>
                )}
                <span className="text-slate-500"> out of {lookupMeta.totalRows} contacts</span>
              </p>
            </div>
          )}

          <LeadAuditTable />

          {/* Expand Harvest — only shown for non-ZoomInfo modes */}
          {extractionMode !== 'zoominfo' && (
            <div className="flex justify-center pb-20">
              <button
                onClick={() => handleStartExtraction(true, suggestedTitles.length > 0)}
                disabled={status.extractingLeads}
                className="group relative px-8 py-4 bg-slate-900 border border-slate-700 text-slate-300 rounded-2xl font-bold hover:bg-slate-800 hover:border-slate-500 transition-all flex items-center gap-3 overflow-hidden shadow-2xl"
              >
                {status.extractingLeads ? (
                  <>
                    <Loader2 size={20} className="animate-spin text-blue-400" />
                    <span>Harvesting Batch...</span>
                  </>
                ) : (
                  <>
                    <Plus size={20} className="text-blue-400 group-hover:scale-125 transition-transform" />
                    <span>Expand Harvest (Next 30 Leads)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL */}
      <LeadFilterModal 
        isOpen={isFilterModalOpen} 
        onClose={() => setIsFilterModalOpen(false)} 
      />
    </div>
  );
}