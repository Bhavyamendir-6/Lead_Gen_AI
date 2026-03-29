// Professional Lead Gen Platform - Enterprise Module
// Target Persona Configuration Modal

import React, { useState, useEffect } from 'react';
import { Filter, X, Briefcase, MapPin, Target, Clock, Ghost, Zap } from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { ExtractionFilters } from '@/types';

interface LeadFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeadFilterModal: React.FC<LeadFilterModalProps> = ({ isOpen, onClose }) => {
  const { extractionFilters, setFilters, competitiveProxies } = usePortfolioStore();
  
  // Local state to manage inputs before saving
  const [localFilters, setLocalFilters] = useState<ExtractionFilters>(extractionFilters);

  // Sync local state with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalFilters(extractionFilters);
    }
  }, [isOpen, extractionFilters]);

  if (!isOpen) return null;

  const handleSave = () => {
    setFilters(localFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white">
            <Filter size={20} className="text-blue-500" />
            <h3 className="font-bold tracking-wide uppercase text-sm">Target Persona Configuration</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 bg-slate-900/50">
          <p className="text-xs text-slate-400">
            Configure the search parameters for the <span className="text-white font-bold">{competitiveProxies.length} identified accounts</span>.
          </p>

          <div className="space-y-5">
            {/* Target Titles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <Target size={14} />
                Target Titles
              </label>
              <input
                type="text"
                value={localFilters.jobTitles}
                onChange={(e) => setLocalFilters({...localFilters, jobTitles: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-slate-600 transition-all"
                placeholder="e.g. VP, Director, Head of"
              />
            </div>

            {/* Departments */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                <Briefcase size={14} />
                Departments
              </label>
              <input
                type="text"
                value={localFilters.departments}
                onChange={(e) => setLocalFilters({...localFilters, departments: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-slate-600 transition-all"
                placeholder="e.g. Engineering, Product, Data"
              />
            </div>

             {/* Experience & Location Row */}
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                        <Clock size={14} />
                        Min Experience (Years)
                    </label>
                    <div className="flex items-center gap-3 bg-slate-950 border border-slate-700 rounded-lg p-2.5">
                        <input
                            type="range"
                            min="1"
                            max="20"
                            value={localFilters.minExperience}
                            onChange={(e) => setLocalFilters({...localFilters, minExperience: parseInt(e.target.value)})}
                            className="flex-1 accent-blue-500 cursor-pointer h-1 bg-slate-800 rounded-lg appearance-none"
                        />
                        <span className="text-sm font-mono text-white min-w-[20px] text-center">{localFilters.minExperience}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                        <MapPin size={14} />
                        Geography
                    </label>
                    <input
                        type="text"
                        value={localFilters.location}
                        onChange={(e) => setLocalFilters({...localFilters, location: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:outline-none placeholder-slate-600 transition-all"
                        placeholder="e.g. United States"
                    />
                </div>
             </div>

             {/* Human Mimicry Toggle */}
             <div className="pt-4 border-t border-slate-800">
                <label className="flex items-center justify-between cursor-pointer group">
                    <div className="flex flex-col">
                        <span className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            <Ghost size={14} />
                            Human Mimicry Protocol
                        </span>
                        <span className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors">Simulate scroll/hover to bypass bot detection.</span>
                    </div>
                    <div className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${localFilters.enableHumanMimicry ? 'bg-emerald-500/20 border border-emerald-500' : 'bg-slate-800 border border-slate-700'}`}>
                         <div className={`absolute top-1 w-3.5 h-3.5 rounded-full transition-all duration-300 ${localFilters.enableHumanMimicry ? 'left-6 bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'left-1 bg-slate-500'}`}></div>
                         <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={localFilters.enableHumanMimicry}
                            onChange={(e) => setLocalFilters({...localFilters, enableHumanMimicry: e.target.checked})}
                        />
                    </div>
                </label>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
             <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold transition-colors"
            >
                Cancel
            </button>
            <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
            >
                <Zap size={16} className="fill-current" />
                Save Configuration
            </button>
        </div>
      </div>
    </div>
  );
};

export default LeadFilterModal;