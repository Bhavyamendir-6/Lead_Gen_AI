"use client";

import React, { useState, useEffect } from 'react';
import { DollarSign, BarChart3, RefreshCcw, Info } from 'lucide-react';
import type { TokenUsage } from '@/types/contact-validator';

const USAGE_KEY = 'geminiTokenUsage';

export function getTotalUsage(): TokenUsage {
  if (typeof window === 'undefined') return { inputTokens: 0, outputTokens: 0, estimatedCost: 0 };
  try {
    const saved = localStorage.getItem(USAGE_KEY);
    return saved ? JSON.parse(saved) : { inputTokens: 0, outputTokens: 0, estimatedCost: 0 };
  } catch {
    return { inputTokens: 0, outputTokens: 0, estimatedCost: 0 };
  }
}

export function addUsage(delta: { inputTokens: number; outputTokens: number; cost: number }) {
  const current = getTotalUsage();
  const next: TokenUsage = {
    inputTokens: current.inputTokens + delta.inputTokens,
    outputTokens: current.outputTokens + delta.outputTokens,
    estimatedCost: current.estimatedCost + delta.cost,
  };
  localStorage.setItem(USAGE_KEY, JSON.stringify(next));
  return next;
}

export function resetUsage() {
  const zero: TokenUsage = { inputTokens: 0, outputTokens: 0, estimatedCost: 0 };
  localStorage.setItem(USAGE_KEY, JSON.stringify(zero));
  return zero;
}

export function CostTracker() {
  const [usage, setUsage] = useState<TokenUsage>({ inputTokens: 0, outputTokens: 0, estimatedCost: 0 });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setUsage(getTotalUsage());
    const id = setInterval(() => setUsage(getTotalUsage()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleReset = () => {
    if (window.confirm('Reset the cost tracker?')) {
      setUsage(resetUsage());
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
      >
        <DollarSign className="w-4 h-4 text-emerald-500" />
        <span>${usage.estimatedCost.toFixed(4)}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-900 rounded-xl shadow-lg border border-slate-800 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Usage & Cost
            </h3>
            <button onClick={handleReset} className="text-slate-500 hover:text-red-400 transition-colors" title="Reset Usage">
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Input Tokens</span>
                <span className="text-sm font-mono font-semibold text-slate-300">{usage.inputTokens.toLocaleString()}</span>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Output Tokens</span>
                <span className="text-sm font-mono font-semibold text-slate-300">{usage.outputTokens.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/20">
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500 block mb-1">Total Estimated Cost</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-400">${usage.estimatedCost.toFixed(4)}</span>
                <span className="text-xs text-emerald-500 font-medium">USD</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-[10px] text-slate-500 bg-slate-800/50 p-2 rounded border border-slate-700">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <p>Costs are estimated based on standard Gemini pricing. Actual costs may vary.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
