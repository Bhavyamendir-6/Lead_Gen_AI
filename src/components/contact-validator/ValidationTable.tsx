"use client";

import React from 'react';
import { ValidatedContact } from '@/types/contact-validator';
import { ExternalLink, AlertCircle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface ValidationTableProps {
  title: string;
  contacts: ValidatedContact[];
}

export function ValidationTable({ title, contacts }: ValidationTableProps) {
  if (contacts.length === 0) return null;

  const getStatusIcon = (status: string) => {
    if (status.includes('✅')) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (status.includes('⚠️')) return <AlertCircle className="w-4 h-4 text-amber-500" />;
    if (status.includes('❌')) return <XCircle className="w-4 h-4 text-red-500" />;
    return <MinusCircle className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-800">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 text-[10px] uppercase tracking-wider">
              <th className="px-4 py-3 font-bold">Name</th>
              <th className="px-4 py-3 font-bold">Auto Group</th>
              <th className="px-4 py-3 font-bold">Rooftop</th>
              <th className="px-4 py-3 font-bold">Cleaned Title</th>
              <th className="px-4 py-3 font-bold">Address</th>
              <th className="px-4 py-3 font-bold">LinkedIn URL</th>
              <th className="px-4 py-3 font-bold text-center">Rooftop Web</th>
              <th className="px-4 py-3 font-bold text-center">LinkedIn</th>
              <th className="px-4 py-3 font-bold text-center">ZoomInfo</th>
              <th className="px-4 py-3 font-bold text-center">DealerRater</th>
              <th className="px-4 py-3 font-bold text-center">Overall</th>
              <th className="px-4 py-3 font-bold">Concerns / Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {contacts.map((contact, index) => (
              <tr key={index} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-4 font-medium text-white whitespace-nowrap">{contact.Name}</td>
                <td className="px-4 py-4 text-slate-300">{contact.AutoGroup}</td>
                <td className="px-4 py-4 text-slate-300">{contact.Rooftop}</td>
                <td className="px-4 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    contact.CleanedTitle.toLowerCase() === 'general manager'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {contact.CleanedTitle}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-500 max-w-xs truncate" title={contact.Address}>
                  {contact.Address}
                </td>
                <td className="px-4 py-4">
                  {contact.LinkedinURL && contact.LinkedinURL !== 'Not provided' ? (
                    <a
                      href={contact.LinkedinURL.startsWith('http') ? contact.LinkedinURL : `https://${contact.LinkedinURL}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Link <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-slate-500 italic">N/A</span>
                  )}
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">{getStatusIcon(contact.RooftopWebsiteStatus)}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">{getStatusIcon(contact.LinkedInStatus)}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">{getStatusIcon(contact.ZoomInfoStatus)}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">{getStatusIcon(contact.DealerRaterStatus)}</div>
                </td>
                <td className="px-4 py-4 text-center">
                  <div className="flex justify-center">{getStatusIcon(contact.OverallValidation)}</div>
                </td>
                <td className="px-4 py-4 text-slate-400 text-xs max-w-md">
                  <p className="line-clamp-2 hover:line-clamp-none transition-all cursor-default" title={contact.ConcernsNotes}>
                    {contact.ConcernsNotes}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
