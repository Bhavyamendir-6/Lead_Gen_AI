// Professional Lead Gen Platform - Enterprise Module
// Real-time Extraction Activity Log

"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu, ShieldCheck, Loader2, Wifi } from 'lucide-react';

interface LogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

const ExtractionTerminal = ({ isActive }: { isActive: boolean }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog = {
      id: Math.random().toString(36),
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setLogs(prev => [...prev.slice(-15), newLog]);
  };

  useEffect(() => {
    if (isActive) {
      const sequences = [
        { msg: "Initializing Playwright Headless Instance...", type: 'info' as const },
        { msg: "Injecting LinkedIn Session Cookies (li_at verified)...", type: 'success' as const },
        { msg: "Applying Human Mimicry Protocol: Randomized viewport 1440x900", type: 'info' as const },
        { msg: "Navigating to Competitive Proxy: Search Results...", type: 'info' as const },
        { msg: "Detecting DOM structure: [li-profile-card] identified.", type: 'success' as const },
        { msg: "Executing Stage 2: Authority & Functional Wedge Audit...", type: 'info' as const },
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < sequences.length) {
          addLog(sequences[i].msg, sequences[i].type);
          i++;
        } else {
          addLog(`Scanning profile ${Math.floor(Math.random() * 50)}/100...`, 'info');
        }
      }, 1500);

      return () => clearInterval(interval);
    } else {
      setLogs([]);
    }
  }, [isActive]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono shadow-2xl">
      <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Extraction Engine Live Log</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        </div>
      </div>
      
      <div ref={scrollRef} className="h-64 p-4 overflow-y-auto space-y-1 scrollbar-hide">
        {logs.length === 0 && !isActive && (
          <div className="h-full flex items-center justify-center text-slate-700 text-xs">
            Standby: Waiting for harvest initialization...
          </div>
        )}
        {logs.map(log => (
          <div key={log.id} className="text-[11px] flex gap-3 animate-in fade-in slide-in-from-left-1">
            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
            <span className={
              log.type === 'success' ? 'text-emerald-400' : 
              log.type === 'warning' ? 'text-amber-400' : 
              log.type === 'error' ? 'text-red-400' : 'text-blue-300'
            }>
              {log.type === 'success' ? '✔' : log.type === 'info' ? '→' : '⚠'} {log.message}
            </span>
          </div>
        ))}
        {isActive && (
          <div className="flex items-center gap-2 text-[11px] text-blue-400 mt-2">
            <Loader2 size={10} className="animate-spin" />
            <span className="animate-pulse">Engine Active: Mimicking Human Interaction...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtractionTerminal;