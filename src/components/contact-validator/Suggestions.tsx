"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Lightbulb } from 'lucide-react';

interface SuggestionsProps {
  suggestions: string;
  isLoading: boolean;
}

export function Suggestions({ suggestions, isLoading }: SuggestionsProps) {
  if (!suggestions && !isLoading) return null;

  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-500/10 p-2 rounded-lg">
          <Lightbulb className="w-5 h-5 text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-emerald-400">AI Suggestions & Insights</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-emerald-400 animate-pulse">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          <span className="text-sm font-medium">Analyzing data for insights...</span>
        </div>
      ) : (
        <div className="prose prose-invert prose-sm max-w-none prose-emerald">
          <ReactMarkdown>{suggestions}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
