// Professional Lead Gen Platform - Enterprise Module
// Defensive Proxy Selection Grid

"use client";

import React from 'react';
import { Layers, Percent } from 'lucide-react';
import { CompetitiveProxy } from '@/types';

interface ProxyGridProps {
  proxies: CompetitiveProxy[];
  selectedProxyIds: string[];
  onToggleProxy: (id: string) => void;
}

const ProxyGrid: React.FC<ProxyGridProps> = ({ proxies, selectedProxyIds, onToggleProxy }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {proxies.map((proxy) => {
        const isSelected = selectedProxyIds.includes(proxy.id);
        
        // Defensive Check: Ensure techStackOverlap is an array
        const techStack = Array.isArray(proxy.techStackOverlap) 
          ? proxy.techStackOverlap 
          : typeof proxy.techStackOverlap === 'string' 
            ? (proxy.techStackOverlap as string).split(',').map(s => s.trim())
            : [];

        return (
          <button
            key={proxy.id}
            onClick={() => onToggleProxy(proxy.id)}
            className={`text-left p-5 rounded-xl border transition-all relative group ${
              isSelected 
                ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-900/10' 
                : 'bg-slate-900 border-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
                <Layers size={16} className={isSelected ? 'text-blue-400' : 'text-slate-400'} />
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono text-emerald-400">
                <Percent size={10} /> {proxy.similarityScore}%
              </div>
            </div>

            <h3 className="font-bold text-white mb-1">{proxy.name}</h3>
            <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
              {proxy.proxyWedge}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {techStack.slice(0, 3).map((tech, idx) => (
                <span key={`${proxy.id}-${tech}-${idx}`} className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700">
                  {tech}
                </span>
              ))}
            </div>

            {isSelected && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3B82F6]"></div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ProxyGrid;