"use client";

import React, { useRef, useState } from 'react';
import Papa from 'papaparse';
import { Upload, X, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { CsvLookupRow } from '@/types/csv-lookup';

interface CsvUploadZoneProps {
  onRowsParsed: (rows: CsvLookupRow[]) => void;
  parsedRows: CsvLookupRow[];
  onClear: () => void;
}

// Flexible column name mapping (case-insensitive)
const COLUMN_ALIASES: Record<keyof CsvLookupRow, string[]> = {
  firstName: ['first name', 'firstname', 'first_name', 'fname'],
  lastName: ['last name', 'lastname', 'last_name', 'lname', 'surname'],
  designationTitle: ['designation title', 'title', 'job title', 'designation', 'designation_title', 'job_title'],
  department: ['department', 'dept', 'department name'],
  companyName: ['company name', 'company', 'company_name', 'organization', 'org'],
};

function resolveColumn(headers: string[], aliases: string[]): string | null {
  for (const alias of aliases) {
    const match = headers.find(h => h.toLowerCase().trim() === alias);
    if (match) return match;
  }
  return null;
}

export default function CsvUploadZone({ onRowsParsed, parsedRows, onClear }: CsvUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = (file: File) => {
    setError(null);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setError('CSV file is empty or could not be parsed.');
          return;
        }

        const headers = Object.keys(results.data[0] as object);
        const firstNameCol = resolveColumn(headers, COLUMN_ALIASES.firstName);
        const lastNameCol = resolveColumn(headers, COLUMN_ALIASES.lastName);
        const titleCol = resolveColumn(headers, COLUMN_ALIASES.designationTitle);
        const deptCol = resolveColumn(headers, COLUMN_ALIASES.department);
        const companyCol = resolveColumn(headers, COLUMN_ALIASES.companyName);

        const missing = [];
        if (!firstNameCol) missing.push('"First Name"');
        if (!lastNameCol) missing.push('"Last Name"');
        if (!companyCol) missing.push('"Company Name"');
        if (missing.length > 0) {
          setError(`Missing required columns: ${missing.join(', ')}. Expected: First Name, Last Name, Designation Title, Department (optional), Company Name`);
          return;
        }

        if (!titleCol) {
          setError('Missing column: "Designation Title". Expected: First Name, Last Name, Designation Title, Department (optional), Company Name');
          return;
        }

        const rows: CsvLookupRow[] = (results.data as Record<string, string>[])
          .map(row => ({
            firstName: (row[firstNameCol!] || '').trim(),
            lastName: (row[lastNameCol!] || '').trim(),
            designationTitle: (row[titleCol] || '').trim(),
            department: deptCol ? (row[deptCol] || '').trim() || undefined : undefined,
            companyName: (row[companyCol!] || '').trim(),
          }))
          .filter(r => (r.firstName || r.lastName) && r.companyName);

        if (rows.length === 0) {
          setError('No valid rows found. Each row needs at least Employee Name and Company Name.');
          return;
        }

        onRowsParsed(rows);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so re-uploading the same file works
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      processFile(file);
    } else {
      setError('Please upload a .csv file.');
    }
  };

  const handleClear = () => {
    setError(null);
    setFileName(null);
    onClear();
  };

  // Preview state: show parsed rows
  if (parsedRows.length > 0) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-violet-400" />
            CSV Contacts
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-violet-400 font-bold bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
              {parsedRows.length} CONTACTS
            </span>
            {parsedRows.length > 200 && (
              <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                MAX 200 WILL BE PROCESSED
              </span>
            )}
            <button
              onClick={handleClear}
              className="text-slate-500 hover:text-red-400 transition-colors p-1"
              title="Clear CSV"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {fileName && (
          <p className="text-xs text-slate-500 mb-3 font-mono">{fileName}</p>
        )}

        <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 text-slate-500 font-bold">#</th>
                <th className="text-left px-3 py-2 text-slate-500 font-bold">First Name</th>
                <th className="text-left px-3 py-2 text-slate-500 font-bold">Last Name</th>
                <th className="text-left px-3 py-2 text-slate-500 font-bold">Designation Title</th>
                <th className="text-left px-3 py-2 text-slate-500 font-bold">Department</th>
                <th className="text-left px-3 py-2 text-slate-500 font-bold">Company Name</th>
              </tr>
            </thead>
            <tbody>
              {parsedRows.slice(0, 50).map((row, i) => (
                <tr key={i} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-3 py-2 text-slate-600">{i + 1}</td>
                  <td className="px-3 py-2 text-white">{row.firstName}</td>
                  <td className="px-3 py-2 text-white">{row.lastName}</td>
                  <td className="px-3 py-2 text-slate-300">{row.designationTitle}</td>
                  <td className="px-3 py-2 text-slate-400">{row.department || '—'}</td>
                  <td className="px-3 py-2 text-slate-300">{row.companyName}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {parsedRows.length > 50 && (
            <div className="text-center py-2 text-xs text-slate-600 bg-slate-950">
              ... and {parsedRows.length - 50} more rows
            </div>
          )}
        </div>
      </div>
    );
  }

  // Upload state: show drag-and-drop zone
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
        <FileSpreadsheet size={18} className="text-violet-400" />
        Upload Contact List
      </h2>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">
        Upload a CSV with columns: <strong className="text-slate-300">First Name</strong>, <strong className="text-slate-300">Last Name</strong>, <strong className="text-slate-300">Designation Title</strong>, <strong className="text-slate-300">Department</strong> (optional), <strong className="text-slate-300">Company Name</strong>
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-violet-500 bg-violet-500/5'
            : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/20'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-violet-400' : 'text-slate-600'}`} />
        <p className="text-sm font-medium text-slate-300 mb-1">
          {isDragging ? 'Drop CSV here' : 'Drag & drop your CSV file here'}
        </p>
        <p className="text-xs text-slate-600">or click to browse</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
