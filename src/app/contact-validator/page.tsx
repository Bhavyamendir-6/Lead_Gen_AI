"use client";

import React, { useState, useEffect } from 'react';
import { DataInput } from '@/components/contact-validator/DataInput';
import { ValidationTable } from '@/components/contact-validator/ValidationTable';
import { Suggestions } from '@/components/contact-validator/Suggestions';
import { ApiKeyManager } from '@/components/contact-validator/ApiKeyManager';
import { CostTracker, addUsage } from '@/components/contact-validator/CostTracker';
import type { ContactInput, ValidatedContact } from '@/types/contact-validator';
import { UserCheck, Play, Settings2, Loader2, Download } from 'lucide-react';
import Papa from 'papaparse';

const MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest)' },
  { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash (Default)' },
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro (High Accuracy)' },
];

export default function ContactValidatorPage() {
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validatedContacts, setValidatedContacts] = useState<ValidatedContact[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [suggestions, setSuggestions] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [customApiKeys, setCustomApiKeys] = useState<string[]>([]);

  useEffect(() => {
    const pending = localStorage.getItem('pendingValidationLeads');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (Array.isArray(data) && data.length > 0) {
          handleDataParsed(data);
        }
      } catch { /* ignore */ }
      localStorage.removeItem('pendingValidationLeads');
    }
  }, []);

  const handleDataParsed = (data: any[]) => {
    const valid = data.filter((row) => Object.values(row).some((v) => v !== ''));
    setParsedData(valid);
    setValidatedContacts([]);
    setSuggestions('');
  };

  const startValidation = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setValidatedContacts([]);
    setSuggestions('');

    const results: ValidatedContact[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const contact: ContactInput = {
        name: row.Name ?? row.name ?? row['Full Name'] ?? '',
        linkedin: row.Linkedin ?? row.linkedin ?? row['LinkedIn URL'] ?? '',
        autoGroup: row['Auto Group'] ?? row.autoGroup ?? row.AutoGroup ?? row['Dealership Group'] ?? '',
        rooftop: row.Rooftop ?? row.rooftop ?? row['Child Dealership'] ?? '',
      };

      const res = await fetch('/api/contact-validator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', contact, modelName: selectedModel, customApiKeys }),
      });
      const json = await res.json();
      const validated: ValidatedContact[] = json.data ?? [];
      results.push(...validated);

      if (json.usage) addUsage(json.usage);

      setValidatedContacts([...results]);
      setProgress(Math.round(((i + 1) / parsedData.length) * 100));

      await new Promise((r) => setTimeout(r, 500));
    }

    setIsProcessing(false);

    setIsGeneratingSuggestions(true);
    const sugRes = await fetch('/api/contact-validator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suggestions', validatedContacts: results, modelName: selectedModel, customApiKeys }),
    });
    const sugJson = await sugRes.json();
    setSuggestions(sugJson.suggestions ?? '');
    if (sugJson.usage) addUsage(sugJson.usage);
    setIsGeneratingSuggestions(false);
  };

  const exportToCSV = () => {
    if (validatedContacts.length === 0) return;
    const csv = Papa.unparse(validatedContacts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', 'validated_contacts.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const passContacts = validatedContacts.filter((c) => c.OverallValidation.includes('✅'));
  const warnContacts = validatedContacts.filter((c) => c.OverallValidation.includes('⚠️'));
  const flagContacts = validatedContacts.filter((c) => c.OverallValidation.includes('❌'));
  const pendingContacts = validatedContacts.filter((c) => c.OverallValidation.includes('🔲'));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="text-blue-400" size={24} />
            Contact Validator
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            AI-powered dealership GM contact verification across 4 sources
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <CostTracker />
          <ApiKeyManager onKeysChange={setCustomApiKeys} />
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <Settings2 className="w-4 h-4 text-slate-500" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isProcessing}
              className="bg-transparent text-sm font-medium text-slate-300 outline-none cursor-pointer"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-800">
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Input */}
      <DataInput onDataParsed={handleDataParsed} />

      {/* Action Bar */}
      {parsedData.length > 0 && (
        <div className="mt-6 bg-slate-900 p-6 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Ready to Validate</h3>
            <p className="text-sm text-slate-500">{parsedData.length} contact{parsedData.length !== 1 ? 's' : ''} loaded and ready for AI verification.</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {isProcessing ? (
              <div className="flex items-center gap-3 bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20 flex-1 sm:flex-none">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-blue-300">Validating... {progress}%</span>
                  <div className="w-32 h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={startValidation}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors w-full sm:w-auto"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Validation
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {validatedContacts.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Validation Results</h2>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="space-y-0">
            {flagContacts.length > 0 && (
              <ValidationTable title="❌ Flags (Critical Issues)" contacts={flagContacts} />
            )}
            {warnContacts.length > 0 && (
              <ValidationTable title="⚠️ Warnings (Concerns Found)" contacts={warnContacts} />
            )}
            {passContacts.length > 0 && (
              <ValidationTable title="✅ Passed (Verified)" contacts={passContacts} />
            )}
            {pendingContacts.length > 0 && (
              <ValidationTable title="🔲 Pending (Could not confirm)" contacts={pendingContacts} />
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {(suggestions || isGeneratingSuggestions) && (
        <Suggestions suggestions={suggestions} isLoading={isGeneratingSuggestions} />
      )}
    </div>
  );
}
