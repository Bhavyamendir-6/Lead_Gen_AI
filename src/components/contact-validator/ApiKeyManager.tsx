"use client";

import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

type KeyStatus = 'checking' | 'valid' | 'exhausted' | 'error' | 'untested';

const keyStatusMap = new Map<string, KeyStatus>();

async function validateKey(key: string): Promise<KeyStatus> {
  keyStatusMap.set(key, 'checking');
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: 'test',
      config: { maxOutputTokens: 1 },
    });
    keyStatusMap.set(key, 'valid');
    return 'valid';
  } catch (error: any) {
    const msg = (error?.message ?? String(error)).toLowerCase();
    const isExhausted =
      error?.status === 429 ||
      msg.includes('429') ||
      msg.includes('quota') ||
      msg.includes('too many requests') ||
      msg.includes('resource has been exhausted') ||
      msg.includes('api key not valid') ||
      msg.includes('invalid api key');
    const status: KeyStatus = isExhausted ? 'exhausted' : 'error';
    keyStatusMap.set(key, status);
    return status;
  }
}

interface ApiKeyManagerProps {
  onKeysChange: (keys: string[]) => void;
}

export function ApiKeyManager({ onKeysChange }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('customGeminiApiKeys');
    if (saved) {
      try {
        const parsed: string[] = JSON.parse(saved);
        setKeys(parsed);
        onKeysChange(parsed);
        Promise.all(parsed.map((k) => validateKey(k))).then(() =>
          setRefreshTrigger((p) => p + 1)
        );
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setRefreshTrigger((p) => p + 1), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  const saveKeys = (next: string[]) => {
    setKeys(next);
    onKeysChange(next);
    localStorage.setItem('customGeminiApiKeys', JSON.stringify(next));
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    const added = newKey.split(/[\n,\s]+/).map((k) => k.trim()).filter(Boolean);
    const unique = Array.from(new Set([...keys, ...added]));
    saveKeys(unique);
    setNewKey('');
    setRefreshTrigger((p) => p + 1);
    await Promise.all(added.map((k) => validateKey(k)));
    setRefreshTrigger((p) => p + 1);
  };

  const handleRemove = (i: number) => {
    saveKeys(keys.filter((_, idx) => idx !== i));
  };

  const renderStatus = (status: KeyStatus | undefined) => {
    switch (status) {
      case 'checking': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'valid': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'exhausted': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
          keys.length > 0
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
        }`}
      >
        <Key className="w-4 h-4" />
        {keys.length > 0 ? `${keys.length} Custom Key${keys.length > 1 ? 's' : ''}` : 'Add API Keys'}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-xl shadow-lg border border-slate-800 z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              API Key Management
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Add backup Gemini API keys. The app will automatically switch to the next key if a quota limit is reached.
            </p>
          </div>

          <div className="p-4">
            <form onSubmit={handleAddKey} className="flex flex-col gap-2 mb-4">
              <textarea
                placeholder="Paste API key(s) here... (Separate multiple keys with commas or new lines)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                rows={3}
                className="w-full text-sm px-3 py-2 border border-slate-700 rounded-lg bg-slate-950 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder-slate-600"
              />
              <button
                type="submit"
                disabled={!newKey.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Key(s)
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-medium text-slate-400">System Default Key</span>
                </div>
              </div>

              {keys.length === 0 ? (
                <div className="text-center py-4 text-sm text-slate-500 flex flex-col items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-slate-600" />
                  No custom keys added.
                </div>
              ) : (
                keys.map((key, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {renderStatus(keyStatusMap.get(key))}
                      <span className="text-xs font-mono text-slate-400 truncate">
                        {key.substring(0, 8)}...{key.substring(key.length - 4)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(i)}
                      className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
