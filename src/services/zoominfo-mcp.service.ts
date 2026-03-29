// Professional Lead Gen Platform - Enterprise Module
// ZoomInfo MCP Client Service
// Connects to ZoomInfo MCP Server to search for verified contacts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Lead } from '@/types/leads';
import { CsvLookupRow, CsvLookupResultItem } from '@/types/csv-lookup';
import { getZoomInfoToken, clearTokenCache } from './zoominfo-auth.service';

let mcpClient: Client | null = null;
let clientToken: string | null = null; // tracks which token the current client was built with

// ZoomInfo's hosted MCP server endpoint (default)
const ZOOMINFO_MCP_DEFAULT_URL = 'https://mcp.zoominfo.com/mcp';

async function getClient(): Promise<Client> {
  const token = await getZoomInfoToken();

  // If client exists but was built with a different token, reset it
  if (mcpClient && clientToken === token) return mcpClient;
  if (mcpClient) resetClient();

  const sseUrl = process.env.ZOOMINFO_MCP_SSE_URL || ZOOMINFO_MCP_DEFAULT_URL;

  const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
  const transport = new StreamableHTTPClientTransport(new URL(sseUrl), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  mcpClient = new Client({ name: 'leadgen-client', version: '1.0.0' });
  clientToken = token;
  await mcpClient.connect(transport);

  const tools = await mcpClient.listTools();
  console.log('[ZoomInfo MCP] Connected. Available tools:', tools.tools.map(t => t.name));

  return mcpClient;
}

function resetClient() {
  mcpClient = null;
  clientToken = null;
  validDepartmentsCache = null;
}

// ---------------------------------------------------------------------------
// Department Lookup Cache
// ---------------------------------------------------------------------------

interface DeptEntry { id: string; name: string; }
let validDepartmentsCache: DeptEntry[] | null = null;

// ZoomInfo has exactly 11 departments — used as fallback if lookup fails
const ZOOMINFO_DEPARTMENTS_FALLBACK: DeptEntry[] = [
  { id: '0', name: 'C-Suite' },
  { id: '1', name: 'Finance' },
  { id: '2', name: 'Human Resources' },
  { id: '3', name: 'Sales' },
  { id: '4', name: 'Operations' },
  { id: '5', name: 'Information Technology' },
  { id: '6', name: 'Engineering & Technical' },
  { id: '7', name: 'Marketing' },
  { id: '8', name: 'Legal' },
  { id: '9', name: 'Medical & Health' },
  { id: '10', name: 'Other' },
];

async function fetchValidDepartments(client: Client): Promise<DeptEntry[]> {
  if (validDepartmentsCache) return validDepartmentsCache;

  try {
    const result = await client.callTool({
      name: 'lookup',
      arguments: { fieldName: 'departments' },
    });
    const parsed = parseMcpResponseRaw(result);
    // Response structure: { departments: { data: [{ id, attributes: { name } }] } }
    const raw: any[] = parsed?.departments?.data ?? [];
    const depts: DeptEntry[] = raw
      .map((d: any) => ({ id: String(d.id), name: d.attributes?.name || '' }))
      .filter(d => d.id && d.name);

    if (depts.length > 0) {
      validDepartmentsCache = depts;
      console.log('[ZoomInfo MCP] Loaded', depts.length, 'departments from lookup');
      return depts;
    }
  } catch (err: any) {
    console.warn('[ZoomInfo MCP] Department lookup failed, using fallback:', err.message);
  }

  // Use hardcoded fallback so the filter always works
  validDepartmentsCache = ZOOMINFO_DEPARTMENTS_FALLBACK;
  console.log('[ZoomInfo MCP] Using hardcoded department fallback');
  return ZOOMINFO_DEPARTMENTS_FALLBACK;
}

/** Maps caller-supplied department strings to ZoomInfo department IDs via fuzzy name match. */
function mapToValidDepartments(input: string[], valid: DeptEntry[]): string[] {
  if (valid.length === 0) return [];
  const matchedIds = new Set<string>();
  for (const dep of input) {
    const lower = dep.toLowerCase();
    // Exact name match first
    const exact = valid.find(v => v.name.toLowerCase() === lower);
    if (exact) { matchedIds.add(exact.id); continue; }
    // Substring match
    const partial = valid.find(
      v => v.name.toLowerCase().includes(lower) || lower.includes(v.name.toLowerCase())
    );
    if (partial) matchedIds.add(partial.id);
  }
  return [...matchedIds];
}

// ---------------------------------------------------------------------------
// Response Parsing Utilities
// ---------------------------------------------------------------------------

/** Lightweight parser used before the error-check version is defined. */
function parseMcpResponseRaw(result: any): any {
  const textContent = (result.content as any[])?.find((c: any) => c.type === 'text');
  if (!textContent?.text) return null;
  try {
    let parsed = JSON.parse(textContent.text);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed;
  } catch {
    return null;
  }
}

function parseMcpResponse(result: any): any {
  const textContent = (result.content as any[])?.find((c: any) => c.type === 'text');
  if (!textContent?.text) return null;

  // Check for ZoomInfo validation errors
  if (textContent.text.includes('Input parameter') && textContent.text.includes('is invalid')) {
    throw new Error(textContent.text);
  }

  try {
    let parsed = JSON.parse(textContent.text);
    // Response may be double-encoded
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    return parsed;
  } catch {
    console.error('[ZoomInfo MCP] Failed to parse response:', textContent.text.slice(0, 200));
    return null;
  }
}

function extractDataArray(parsed: any): any[] {
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;
  const raw = parsed.result || parsed.results || parsed.data || parsed.contacts || [];
  // Preserve the outer id alongside attributes fields
  return raw.map((item: any) =>
    item.attributes ? { id: item.id, ...item.attributes } : item
  );
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

const CONTACT_ENRICH_FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'mobilePhone',
  'jobTitle', 'jobFunction', 'managementLevel',
  'externalUrls', 'companyName', 'zoominfoCompanyId', 'contactAccuracyScore',
];

const COMPANY_ENRICH_FIELDS = [
  'name', 'website', 'phone', 'description', 'socialMediaUrls',
  'street', 'city', 'state', 'zipCode', 'country',
  'employeeCount', 'employeeRange', 'revenueRange', 'revenue',
  'primaryIndustry', 'industries', 'primarySubIndustryCode',
  'parentName', 'parentId', 'foundedYear',
];

async function enrichContactsBatch(
  client: Client,
  personIds: string[]
): Promise<Map<string, any>> {
  const enrichedMap = new Map<string, any>();
  for (let i = 0; i < personIds.length; i += 10) {
    const batch = personIds.slice(i, i + 10);
    try {
      const result = await client.callTool({
        name: 'enrich_contacts',
        arguments: {
          contacts: batch.map(id => ({ personId: id })),
          requiredFields: CONTACT_ENRICH_FIELDS,
        },
      });
      const parsed = parseMcpResponse(result);
      if (!parsed) continue;
      // Response is { contact_1: { success, data }, contact_2: ..., totalEnriched, totalErrors }
      for (const key of Object.keys(parsed)) {
        if (!key.startsWith('contact_')) continue;
        const entry = parsed[key];
        if (entry?.success && entry.data) {
          // Unwrap attributes pattern (same as search results)
          const d = entry.data.attributes
            ? { id: entry.data.id, ...entry.data.attributes }
            : entry.data;
          const id = String(d.id || '');
          if (id) enrichedMap.set(id, d);
        }
      }
    } catch (err: any) {
      console.warn('[ZoomInfo MCP] Contact enrichment batch failed:', err.message);
    }
  }
  return enrichedMap;
}

async function enrichCompaniesBatch(
  client: Client,
  companyIds: string[]
): Promise<Map<string, any>> {
  const enrichedMap = new Map<string, any>();
  const uniqueIds = [...new Set(companyIds.filter(Boolean))];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    const batch = uniqueIds.slice(i, i + 10);
    try {
      const result = await client.callTool({
        name: 'enrich_companies',
        arguments: {
          companies: batch.map(id => ({ companyId: id })),
          requiredFields: COMPANY_ENRICH_FIELDS,
        },
      });
      const parsed = parseMcpResponse(result);
      if (!parsed) continue;
      // Response is { company_1: { success, data }, company_2: ..., totalEnriched, totalErrors }
      for (const key of Object.keys(parsed)) {
        if (!key.startsWith('company_')) continue;
        const entry = parsed[key];
        if (entry?.success && entry.data) {
          // Unwrap attributes pattern (same as search results)
          const d = entry.data.attributes
            ? { id: entry.data.id, ...entry.data.attributes }
            : entry.data;
          const id = String(d.id || d.companyId || '');
          if (id) enrichedMap.set(id, d);
        }
      }
    } catch (err: any) {
      console.warn('[ZoomInfo MCP] Company enrichment batch failed:', err.message);
    }
  }
  return enrichedMap;
}

// ---------------------------------------------------------------------------
// Lead Mapping
// ---------------------------------------------------------------------------

function extractLinkedInUrl(externalUrls: any[]): string {
  if (!Array.isArray(externalUrls)) return '';
  const li = externalUrls.find(
    (u: any) => (u.url || u.type || '').toLowerCase().includes('linkedin')
  );
  return li?.url || '';
}

function mapToLead(
  searchItem: any,
  enrichedContact: any,
  enrichedCompany: any,
  proxyCompany: string
): Partial<Lead> {
  // Merge: enriched data wins over search data
  const contact = { ...searchItem, ...enrichedContact };
  const co = enrichedCompany || searchItem.company || {};

  const firstName = contact.firstName || '';
  const lastName = contact.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || proxyCompany;
  const title = contact.jobTitle || '';

  const linkedinUrl = extractLinkedInUrl(contact.externalUrls) ||
    contact.linkedInUrl || contact.linkedin_url || '';

  // Company LinkedIn from social media URLs
  const companyLinkedinUrl = Array.isArray(co.socialMediaUrls)
    ? (co.socialMediaUrls.find((u: any) => (u.url || '').toLowerCase().includes('linkedin'))?.url || '')
    : '';

  const industry = co.primaryIndustry ||
    (Array.isArray(co.industries) ? co.industries[0]?.name || '' : '') || '';

  return {
    id: crypto.randomUUID(),
    name,
    title,
    linkedinUrl,
    urlStatus: linkedinUrl ? 'Canonical' : 'Search_Result',
    confidenceScore: contact.contactAccuracyScore ?? 85,
    isVerified: true,
    verificationSource: 'ZoomInfo MCP',
    matchedSkills: [],
    aiReasoning: `Sourced from ZoomInfo database for ${proxyCompany}`,
    signalTrustBridge: false,
    signalFunctionalWedge: true,
    signalAuthority: false,
    influenceScore: 0,

    // Contact fields
    firstName,
    lastName,
    mobilePhone: contact.mobilePhone || '',
    email: contact.email || '',
    email2: contact.supplementalEmail || contact.email2 || '',
    emailPersonal: contact.personalEmail || '',
    directPhone: contact.phone || contact.directPhone || '',
    managementLevel: contact.managementLevel || '',
    contactStreet: '',
    contactCity: '',
    contactState: '',
    contactCountry: '',
    contactZip: '',
    timeZone: contact.timeZone || '',
    yearsOfExperience: contact.yearsOfExperience,
    linkedinSummary: contact.linkedInSummary || '',

    // Company fields (from enriched company data)
    companyName: co.name || contact.companyName || proxyCompany,
    companyStreet: co.street || '',
    companyCity: co.city || '',
    companyState: co.state || '',
    companyZip: co.zipCode || '',
    companyCountry: co.country || '',
    employeeCount: co.employeeCount,
    companyWebsite: co.website || '',
    companyPhone: co.phone || '',
    companyDescription: co.description || '',
    companyLinkedinUrl,
    industry,
    subIndustry: co.primarySubIndustryCode || '',
    parentCompany: co.parentName || '',
    parentCompanyCountry: '',
    foundedYear: co.foundedYear,
    revenueRange: co.revenueRange || '',
    employeeSizeRange: co.employeeRange || '',
    annualRevenue: co.revenue ? String(co.revenue) : '',

    // App-managed CRM fields
    leadSourceGlobal: 'ZoomInfo MCP',
    segmentName: industry,
    sdrName: '',
    researcherName: '',
    dataRequesterDetails: '',
  };
}

// ---------------------------------------------------------------------------
// Search + Enrich Pipeline
// ---------------------------------------------------------------------------

async function callSearchAndParse(
  client: Client,
  companyName: string,
  titles: string[],
  filters: { location?: string; departments?: string[] }
): Promise<Partial<Lead>[]> {
  const baseArgs: Record<string, any> = {
    companyName,
    jobTitle: titles.join(' OR '),
    pageSize: 50,
  };
  if (filters.location) baseArgs.country = filters.location;
  if (filters.departments?.length) {
    const validDepts = await fetchValidDepartments(client);
    const mapped = mapToValidDepartments(filters.departments, validDepts);
    if (mapped.length > 0) {
      baseArgs.department = mapped.join(',');
      console.log('[ZoomInfo MCP] Mapped departments:', mapped);
    } else {
      console.warn('[ZoomInfo MCP] No valid department matches found for:', filters.departments, '— skipping filter');
    }
  }

  // Step 1: search_contacts
  const searchResult = await client.callTool({ name: 'search_contacts', arguments: baseArgs });

  const parsed = parseMcpResponse(searchResult);
  const searchItems = extractDataArray(parsed);

  if (searchItems.length === 0) {
    console.log(`[ZoomInfo MCP] FOUND: 0 leads for ${companyName}`);
    return [];
  }

  // Extract personIds and companyIds for enrichment
  const personIds: string[] = [];
  const companyIds: string[] = [];
  for (const item of searchItems) {
    const pid = String(item.id || item.personId || '');
    const cid = String(item.company?.id || item.companyId || '');
    if (pid) personIds.push(pid);
    if (cid) companyIds.push(cid);
  }
  // Step 2: enrich contacts + companies in parallel
  const [contactEnrichedMap, companyEnrichedMap] = await Promise.all([
    personIds.length ? enrichContactsBatch(client, personIds) : Promise.resolve(new Map()),
    companyIds.length ? enrichCompaniesBatch(client, companyIds) : Promise.resolve(new Map()),
  ]);

  // Step 3: merge and map
  const leads = searchItems.map((item: any) => {
    const pid = String(item.id || item.personId || '');
    const cid = String(item.company?.id || item.companyId || '');
    const enrichedContact = contactEnrichedMap.get(pid) || {};
    const enrichedCompany = companyEnrichedMap.get(cid) || null;
    return mapToLead(item, enrichedContact, enrichedCompany, companyName);
  });

  console.log(`[ZoomInfo MCP] FOUND: ${leads.length} leads for ${companyName}`);
  return leads;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CSV Lookup Helpers
// ---------------------------------------------------------------------------


function pickBestMatch(candidates: any[], csvTitle: string): any {
  if (candidates.length === 1) return candidates[0];

  const csvLower = csvTitle.toLowerCase();
  const csvWords = csvLower.split(/\s+/).filter(Boolean);

  const scored = candidates.map(c => {
    const ziTitle = (c.jobTitle || '').toLowerCase();
    let score = 0;
    if (ziTitle === csvLower) {
      score = 100;
    } else if (ziTitle.includes(csvLower) || csvLower.includes(ziTitle)) {
      score = 70;
    } else {
      const ziWords = ziTitle.split(/\s+/).filter(Boolean);
      const overlap = csvWords.filter(w => ziWords.includes(w)).length;
      score = (overlap / Math.max(csvWords.length, 1)) * 50;
    }
    return { candidate: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// CSV Lookup Pipeline
// ---------------------------------------------------------------------------

async function searchSinglePerson(
  client: Client,
  row: CsvLookupRow,
): Promise<{ items: any[]; status: CsvLookupResultItem['status']; errorMessage?: string }> {
  const { firstName, lastName } = row;

  const baseArgs: Record<string, any> = {
    companyName: row.companyName,
    pageSize: 5,
  };

  // Optional department filter
  if (row.department) {
    try {
      const validDepts = await fetchValidDepartments(client);
      const mapped = mapToValidDepartments([row.department], validDepts);
      if (mapped.length > 0) baseArgs.department = mapped.join(',');
    } catch { /* skip dept filter on failure */ }
  }

  // Attempt 1: firstName + lastName search
  if (firstName && lastName) {
    try {
      const result = await client.callTool({
        name: 'search_contacts',
        arguments: { ...baseArgs, firstName, lastName },
      });
      const items = extractDataArray(parseMcpResponse(result));
      if (items.length > 0) return { items, status: 'found' };
    } catch (err: any) {
      console.warn(`[ZoomInfo CSV] name search failed for "${firstName} ${lastName}":`, err.message);
    }
  }

  // Attempt 2: fullName search as fallback
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    try {
      const result = await client.callTool({
        name: 'search_contacts',
        arguments: { ...baseArgs, fullName },
      });
      const items = extractDataArray(parseMcpResponse(result));
      if (items.length > 0) return { items, status: 'found' };
    } catch (err: any) {
      console.warn(`[ZoomInfo CSV] fullName search failed for "${fullName}":`, err.message);
    }
  }

  return { items: [], status: 'not_found' };
}

async function lookupPeopleViaZoomInfoInternal(
  client: Client,
  rows: CsvLookupRow[],
): Promise<CsvLookupResultItem[]> {
  // Phase 1: Search each person individually
  const searchResults: {
    row: CsvLookupRow;
    bestMatch: any | null;
    status: CsvLookupResultItem['status'];
    matchCount: number;
    errorMessage?: string;
  }[] = [];

  for (const row of rows) {
    if ((!row.firstName?.trim() && !row.lastName?.trim()) || !row.companyName?.trim()) {
      searchResults.push({ row, bestMatch: null, status: 'error', matchCount: 0, errorMessage: 'Missing required field (name or company)' });
      continue;
    }

    try {
      const { items, status } = await searchSinglePerson(client, row);
      if (items.length === 0) {
        searchResults.push({ row, bestMatch: null, status: 'not_found', matchCount: 0 });
      } else {
        const best = pickBestMatch(items, row.designationTitle);
        searchResults.push({
          row,
          bestMatch: best,
          status: items.length > 1 ? 'multiple_matches' : 'found',
          matchCount: items.length,
        });
      }
    } catch (err: any) {
      searchResults.push({ row, bestMatch: null, status: 'error', matchCount: 0, errorMessage: err.message });
    }

    // Rate limiting between searches
    await delay(200);
  }

  // Phase 2: Batch-enrich all found contacts and companies
  const personIds: string[] = [];
  const companyIds: string[] = [];
  const matchMap = new Map<string, { row: CsvLookupRow; searchItem: any; status: CsvLookupResultItem['status']; matchCount: number }>();

  for (const sr of searchResults) {
    if (!sr.bestMatch) continue;
    const pid = String(sr.bestMatch.id || sr.bestMatch.personId || '');
    const cid = String(sr.bestMatch.company?.id || sr.bestMatch.companyId || '');
    if (pid) {
      personIds.push(pid);
      matchMap.set(pid, { row: sr.row, searchItem: sr.bestMatch, status: sr.status, matchCount: sr.matchCount });
    }
    if (cid) companyIds.push(cid);
  }

  const [contactEnrichedMap, companyEnrichedMap] = await Promise.all([
    personIds.length ? enrichContactsBatch(client, personIds) : Promise.resolve(new Map()),
    companyIds.length ? enrichCompaniesBatch(client, companyIds) : Promise.resolve(new Map()),
  ]);

  // Phase 3: Map to leads and build result items
  const results: CsvLookupResultItem[] = [];

  for (const sr of searchResults) {
    if (!sr.bestMatch) {
      results.push({ row: sr.row, status: sr.status, lead: null, errorMessage: sr.errorMessage, matchCount: sr.matchCount });
      continue;
    }

    const pid = String(sr.bestMatch.id || sr.bestMatch.personId || '');
    const cid = String(sr.bestMatch.company?.id || sr.bestMatch.companyId || '');
    const enrichedContact = contactEnrichedMap.get(pid) || {};
    const enrichedCompany = companyEnrichedMap.get(cid) || null;

    const lead = mapToLead(sr.bestMatch, enrichedContact, enrichedCompany, sr.row.companyName);

    // CRITICAL: Preserve the CSV's designation title
    lead.title = sr.row.designationTitle;

    results.push({ row: sr.row, status: sr.status, lead, matchCount: sr.matchCount });
  }

  const found = results.filter(r => r.lead).length;
  const notFound = results.filter(r => r.status === 'not_found').length;
  console.log(`[ZoomInfo CSV] Lookup complete: ${found} found, ${notFound} not found, ${results.length} total`);

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function lookupPeopleViaZoomInfo(
  rows: CsvLookupRow[],
): Promise<CsvLookupResultItem[]> {
  let client: Client;

  try {
    client = await getClient();
  } catch (err: any) {
    console.error('[ZoomInfo MCP] Connection failed:', err.message);
    resetClient();
    throw new Error(`ZoomInfo MCP connection failed: ${err.message}`);
  }

  try {
    return await lookupPeopleViaZoomInfoInternal(client, rows);
  } catch (err: any) {
    console.error('[ZoomInfo CSV] Lookup failed, retrying with fresh token:', err.message);
    resetClient();
    clearTokenCache();

    try {
      client = await getClient();
      return await lookupPeopleViaZoomInfoInternal(client, rows);
    } catch (retryErr: any) {
      resetClient();
      throw new Error(`ZoomInfo CSV lookup failed: ${retryErr.message}`);
    }
  }
}

export async function searchPeopleViaZoomInfo(
  companyName: string,
  titles: string[],
  filters: { location?: string; departments?: string[] }
): Promise<Partial<Lead>[]> {
  let client: Client;

  try {
    client = await getClient();
  } catch (err: any) {
    console.error('[ZoomInfo MCP] Connection failed:', err.message);
    resetClient();
    throw new Error(`ZoomInfo MCP connection failed: ${err.message}`);
  }

  try {
    return await callSearchAndParse(client, companyName, titles, filters);
  } catch (err: any) {
    console.error('[ZoomInfo MCP] Tool call failed, retrying with fresh token:', err.message);
    resetClient();
    clearTokenCache();

    try {
      client = await getClient();
      return await callSearchAndParse(client, companyName, titles, filters);
    } catch (retryErr: any) {
      resetClient();
      throw new Error(`ZoomInfo search failed: ${retryErr.message}`);
    }
  }
}
