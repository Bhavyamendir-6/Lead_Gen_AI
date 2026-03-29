"use client";

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, ClipboardPaste } from 'lucide-react';

interface DataInputProps {
  onDataParsed: (data: any[]) => void;
}

export function DataInput({ onDataParsed }: DataInputProps) {
  const [pasteData, setPasteData] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onDataParsed(results.data);
        },
      });
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteData.trim()) return;
    Papa.parse(pasteData, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        onDataParsed(results.data);
      },
    });
  };

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <h2 className="text-lg font-semibold text-white mb-4">Input Data</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* File Upload */}
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-800/30 transition-colors">
          <Upload className="w-8 h-8 text-slate-500 mb-3" />
          <p className="text-sm font-medium text-slate-300 mb-1">Upload CSV or Excel (CSV format)</p>
          <p className="text-xs text-slate-500 mb-4">Must include headers: Name, Linkedin, Auto Group, Rooftop</p>
          <label className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors">
            Select File
            <input type="file" accept=".csv,.tsv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Paste Data */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardPaste className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-300">Or paste data (with headers)</span>
          </div>
          <textarea
            className="w-full flex-1 min-h-[120px] p-3 border border-slate-700 rounded-lg bg-slate-950 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none placeholder-slate-600"
            placeholder={"Name\tLinkedin\tAuto Group\tRooftop\nJohn Doe\thttps://...\tGroup A\tDealership X"}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
          />
          <button
            onClick={handlePasteSubmit}
            disabled={!pasteData.trim()}
            className="mt-3 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Parse Pasted Data
          </button>
        </div>
      </div>
    </div>
  );
}
