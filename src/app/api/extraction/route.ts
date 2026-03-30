// Professional Lead Gen Platform - Enterprise Module
// Hydra Trawler v5.6 (Safe-Volume & 400-Error Patch)

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { proxyName, targetTitles, filters, mode, rows } = body;

    // ── ZoomInfo CSV Lookup Protocol ─────────────────────────────────────
    if (mode === 'zoominfo-csv') {
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'CSV rows required' }, { status: 400 });
      }

      const { lookupPeopleViaZoomInfo } = await import('@/services/zoominfo-mcp.service');
      const cappedRows = rows.slice(0, 200);
      const results = await lookupPeopleViaZoomInfo(cappedRows);

      const leads = results
        .map(r => r.lead)
        .filter(Boolean);

      const notFoundCount = results.filter(r => r.status === 'not_found').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      console.log(`[ZoomInfo CSV] Lookup: ${leads.length} found, ${notFoundCount} not found, ${errorCount} errors out of ${cappedRows.length} rows`);

      return NextResponse.json({
        data: leads,
        meta: {
          totalRows: cappedRows.length,
          found: leads.length,
          notFound: notFoundCount,
          errors: errorCount,
          details: results.map(r => ({
            name: `${r.row.firstName} ${r.row.lastName}`.trim(),
            companyName: r.row.companyName,
            status: r.status,
            errorMessage: r.errorMessage,
          })),
        },
      });
    }

    if (!proxyName) return NextResponse.json({ error: 'Proxy Name required' }, { status: 400 });

    // ── ZoomInfo MCP Protocol ──────────────────────────────────────────
    if (mode === 'zoominfo') {
      const { searchPeopleViaZoomInfo } = await import('@/services/zoominfo-mcp.service');
      const titles = (Array.isArray(targetTitles) && targetTitles.length > 0)
        ? targetTitles
        : (filters?.jobTitles || 'VP,Director,Manager').split(',').map((t: string) => t.trim());

      const leads = await searchPeopleViaZoomInfo(proxyName, titles, {
        location: filters?.location,
        departments: filters?.departments
          ? filters.departments.split(',').map((d: string) => d.trim()).filter(Boolean)
          : undefined,
      });

      const capped = leads.slice(0, 50);
      console.log(`[ZoomInfo MCP] FOUND: ${leads.length} leads for ${proxyName} (capped to ${capped.length})`);
      return NextResponse.json({ data: capped });
    }

    // Build title query from targetTitles if provided, otherwise fall back to filters or default
    const titleQuery = (Array.isArray(targetTitles) && targetTitles.length > 0)
      ? targetTitles.slice(0, 5).join(' OR ')
      : (filters?.jobTitles || 'VP OR Director OR Manager');
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 1. RECURSIVE STRATEGY: Get 15 Departments for higher volume
    const deptPrompt = `List 15 internal departments for "${proxyName}" (e.g. Engineering, Sales, Product, Marketing, IT, Ops, Finance, HR, Legal, Support, Data, Growth, Strategy, Design, Security). Return ONLY a comma-separated list. No intro.`;
    
    let departments = ["Engineering", "Sales", "Product", "Operations", "Marketing", "Data", "IT", "Growth", "Finance", "Legal"];
    try {
        const deptResult = await model.generateContent(deptPrompt);
        departments = deptResult.response.text().replace(/```/g, "").replace(/json/g, "").split(',').map(d => d.trim());
    } catch (e) { console.error("AI Fallback used"); }

    const allUrls = new Set<string>();
    const discoveredLeads: any[] = [];

    // 2. PARALLEL TRAWLER: num set to 10 to avoid 400 errors
    const searchPromises = departments.map(async (dept) => {
      // Simplified query to ensure 100% acceptance by Google
      const query = `site:linkedin.com/in/ "${proxyName}" "${dept}" ${titleQuery}`;
      
      try {
        const res = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: { 
            'X-API-KEY': process.env.SERPER_API_KEY || '', 
            'Content-Type': 'application/json' 
          },
          // num: 10 is the "Safe Zone" for all Serper keys
          body: JSON.stringify({ q: query, num: 10 }) 
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || `Status ${res.status}`);
        }
        return res.json();
      } catch (err) {
        console.error(`[Hydra] Skip ${dept}:`, err);
        return { organic: [] };
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // 3. AGGREGATE
    searchResults.forEach(data => {
      if (data?.organic) {
        data.organic.forEach((result: any) => {
          if (result.link?.includes('/in/') && !allUrls.has(result.link)) {
            allUrls.add(result.link);
            
            // Refined extraction logic
            const titleParts = result.title.split(' - ');
            const cleanName = titleParts[0].split('|')[0].trim();
            
            discoveredLeads.push({
              id: Math.random().toString(36).substring(7),
              name: cleanName,
              title: result.snippet.split('...')[0].replace(/\n/g, " ").trim(),
              company: proxyName,
              linkedinUrl: result.link,
              confidenceScore: 100,
              isVerified: true,
              verificationSource: 'Hydra Trawler'
            });
          }
        });
      }
    });

    console.log(`[Hydra] FOUND: ${discoveredLeads.length} leads for ${proxyName}`);
    return NextResponse.json({ data: discoveredLeads });

  } catch (error: any) {
    console.error("[CRITICAL] API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}