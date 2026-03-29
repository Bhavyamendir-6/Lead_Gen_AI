// Professional Lead Gen Platform - Enterprise Module
// Secure Session Configuration UI

import React, { useState } from 'react';
import { Lock, ShieldCheck, Key, ExternalLink, AlertCircle, X, Save } from 'lucide-react';
import { usePortfolioStore } from '../../store/usePortfolioStore';

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CookieSettingsModal: React.FC<CookieSettingsModalProps> = ({ isOpen, onClose }) => {
  const { session, setSession } = usePortfolioStore();
  
  // Local state for form handling
  const [liAt, setLiAt] = useState(session?.li_at || '');
  const [jSessionId, setJSessionId] = useState(session?.JSESSIONID || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

// Inside src/components/extraction/CookieSettingsModal.tsx

const handleSave = async () => {
  if (!liAt || !jSessionId) return;
  setIsSaving(true);
  
  try {
    // 1. Encrypt via Server API
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${baseUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ li_at: liAt, JSESSIONID: jSessionId })
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error);

    // 2. data now contains { li_at, JSESSIONID, status, lastValidated }
    // Pass this directly to the store's setSession action
    await setSession(data);
    
    onClose();
  } catch (error) {
    console.error("Validation failed:", error);
    alert("Session validation failed. Check server logs.");
  } finally {
    setIsSaving(false);
  }
};
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
      <div className="w-[550px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">LinkedIn Session Injection</h3>
              <p className="text-xs text-slate-500">Configure cookies for the Extraction Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          <div className="bg-blue-900/10 border border-blue-800/30 p-4 rounded-lg flex gap-3">
            <AlertCircle size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 leading-relaxed">
              We use your browser session to perform live profile verification. 
              Find these in <span className="text-white font-mono">Inspect &gt; Application &gt; Cookies</span> on LinkedIn.com.
              <a href="#" className="text-blue-400 hover:underline flex items-center gap-1 mt-1 font-semibold">
                How to find your cookies <ExternalLink size={10} />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            {/* li_at Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Key size={14} className="text-slate-500" />
                li_at Cookie
              </label>
              <input
                type="password"
                value={liAt}
                onChange={(e) => setLiAt(e.target.value)}
                placeholder="Paste li_at value..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-700"
              />
            </div>

            {/* JSESSIONID Input */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <ShieldCheck size={14} className="text-slate-500" />
                JSESSIONID Cookie
              </label>
              <input
                type="password"
                value={jSessionId}
                onChange={(e) => setJSessionId(e.target.value)}
                placeholder="Paste JSESSIONID (e.g. ajax:83...)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/80 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !liAt || !jSessionId}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            {isSaving ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save & Validate Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieSettingsModal;