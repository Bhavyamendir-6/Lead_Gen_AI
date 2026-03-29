# ZoomInfo MCP Integration

## Overview

The ZoomInfo MCP integration connects this platform to ZoomInfo's enterprise contact database using the **Model Context Protocol (MCP)** — a standardized protocol for AI agents to invoke external tools. It powers the **ZoomInfo Protocol** extraction mode, enabling retrieval of verified, enriched contacts (leads) for a target company without scraping.

Key advantages over the other extraction modes:
- **Verified data** — contacts sourced directly from ZoomInfo's database
- **No session required** — no LinkedIn cookies needed
- **Structured API** — deterministic results via MCP tool calls
- **Full enrichment** — contact and company data enriched via dedicated MCP tools

---

## Architecture

### Transport Mode

The service uses a single transport strategy:

| Mode | Transport Class | Endpoint |
|------|----------------|----------|
| **StreamableHTTP (default)** | `StreamableHTTPClientTransport` | `https://mcp.zoominfo.com/mcp` (or `ZOOMINFO_MCP_SSE_URL` override) |

> **Note:** The previous SSE and Stdio transport modes have been replaced by `StreamableHTTPClientTransport` from `@modelcontextprotocol/sdk/client/streamableHttp.js`. Stdio (local dev) mode is no longer supported.

### Authentication

Authentication uses **ZoomInfo OAuth Client Credentials** flow, handled by a dedicated auth service (`src/services/zoominfo-auth.service.ts`):

1. On first call, the auth service exchanges `ZOOMINFO_CLIENT_ID` + `ZOOMINFO_CLIENT_SECRET` for a Bearer token via `https://api.zoominfo.com/gtm/oauth/v1/token`.
2. The token is cached in memory with a 60-second pre-expiry buffer.
3. On subsequent calls, the cached token is reused until it expires.
4. On tool call failure, `clearTokenCache()` is called alongside `resetClient()` to force a fresh OAuth exchange on retry.

### Singleton Client

The MCP client is a module-level singleton (`mcpClient`). It tracks both the client instance and the token it was built with (`clientToken`). If a new token is acquired (e.g., after expiry), the old client is reset and a new one is initialized with the fresh token.

```
mcpClient (null) + clientToken (null)
    ↓ first call to getClient()
getZoomInfoToken() → OAuth exchange → Bearer token
    ↓
StreamableHTTPClientTransport initialized with Bearer token
    ↓
Client.connect(transport)
    ↓
mcpClient + clientToken cached — reused on future calls
(reset if token changes or on failure)
```

On any connection or tool-call failure, `resetClient()` nulls both the singleton and the tracked token so the next call re-initializes cleanly. A tool call failure also calls `clearTokenCache()` to force a fresh OAuth token on the retry attempt.

---

## Configuration

All configuration is done via environment variables in `.env.local`:

| Variable | Required | Description |
|----------|----------|-------------|
| `ZOOMINFO_CLIENT_ID` | **Yes** | ZoomInfo OAuth client ID. Missing → throws immediately. |
| `ZOOMINFO_CLIENT_SECRET` | **Yes** | ZoomInfo OAuth client secret. Missing → throws immediately. |
| `ZOOMINFO_MCP_SSE_URL` | No | Override the default MCP server URL (`https://mcp.zoominfo.com/mcp`). |

Minimal `.env.local` for production:

```bash
ZOOMINFO_CLIENT_ID=your_zoominfo_client_id
ZOOMINFO_CLIENT_SECRET=your_zoominfo_client_secret
```

> **Breaking change:** `ZOOMINFO_API_KEY` (static Bearer token) and `ZOOMINFO_MCP_SERVER_PATH` (Stdio mode) are no longer used.

---

## Data Flow

```
Extraction Lab UI  (src/app/extraction-lab/page.tsx)
        │
        │  User clicks "Auto Harvest" with ZoomInfo Protocol selected
        │  POST /api/extraction  { mode: 'zoominfo', proxyName, filters }
        ▼
API Route  (src/app/api/extraction/route.ts)
        │
        │  mode === 'zoominfo' branch
        │  Resolves job titles from targetTitles or filters.jobTitles
        │  Calls searchPeopleViaZoomInfo(proxyName, titles, filters)
        ▼
ZoomInfo Auth Service  (src/services/zoominfo-auth.service.ts)
        │
        │  getZoomInfoToken() → cached token or OAuth exchange
        ▼
ZoomInfo MCP Service  (src/services/zoominfo-mcp.service.ts)
        │
        │  [Step 1] client.callTool({ name: 'search_contacts', arguments: { ... } })
        │  [Step 2a] enrichContactsBatch() — enrich_contacts in batches of 10
        │  [Step 2b] enrichCompaniesBatch() — enrich_companies in batches of 10
        │  [Step 3] Merge enriched data + mapToLead() × N
        ▼
ZoomInfo MCP Server  (https://mcp.zoominfo.com/mcp)
        │
        │  Returns MCP content array with JSON text payload
        ▼
Partial<Lead>[]  returned to API route
        │
        │  NextResponse.json({ data: leads })
        ▼
Frontend  — setLeads() → renders in LeadAuditTable
```

---

## Key Files

| File | Role |
|------|------|
| [src/services/zoominfo-mcp.service.ts](../src/services/zoominfo-mcp.service.ts) | Core service: client lifecycle, search + enrich pipeline, lead mapping |
| [src/services/zoominfo-auth.service.ts](../src/services/zoominfo-auth.service.ts) | OAuth client credentials flow — token acquisition and caching |
| [src/app/api/extraction/route.ts](../src/app/api/extraction/route.ts) | API endpoint — routes `mode: 'zoominfo'` to this service |
| [src/app/extraction-lab/page.tsx](../src/app/extraction-lab/page.tsx) | UI — "ZoomInfo Protocol" mode selector button |
| [src/app/api/contact-validator/route.ts](../src/app/api/contact-validator/route.ts) | Secondary use — ZoomInfo as one of four contact validation sources |
| [src/types/leads.ts](../src/types/leads.ts) | `Lead` interface and `ExtractionMode` type (`'zoominfo'` variant) |
| [src/types/contact-validator.ts](../src/types/contact-validator.ts) | `ValidatedContact.ZoomInfoStatus` field |
| [src/store/usePortfolioStore.ts](../src/store/usePortfolioStore.ts) | Global state — stores leads with `verificationSource: 'ZoomInfo MCP'` |

---

## MCP Tool Calls

The service invokes three MCP tools in sequence:

### 1. `search_contacts` (Step 1 — Search)

**Arguments:**

| Argument | Source | Notes |
|----------|--------|-------|
| `companyName` | `proxyName` from request | Target company to search |
| `jobTitle` | `titles.join(' OR ')` | OR-joined string of title strings |
| `country` | `filters.location` | Optional geographic filter |
| `department` | `filters.departments` (validated) | Optional; comma-joined after mapping to valid ZoomInfo values |
| `pageSize` | `50` | Fixed page size |

**Response:** MCP `content` array with a `text` entry containing a JSON string. Handled shapes: plain array, `{ result: [] }`, `{ results: [] }`, `{ data: [] }`, `{ contacts: [] }`. Items with an `attributes` key are flattened (`{ id, ...attributes }`).

### 2. `enrich_contacts` (Step 2a — Contact Enrichment)

Called in batches of 10 person IDs extracted from search results.

**Requested fields:** `firstName`, `lastName`, `email`, `phone`, `mobilePhone`, `jobTitle`, `jobFunction`, `managementLevel`, `externalUrls`, `companyName`, `zoominfoCompanyId`, `contactAccuracyScore`

**Response shape:** `{ contact_1: { success, data }, contact_2: ..., totalEnriched, totalErrors }`

### 3. `enrich_companies` (Step 2b — Company Enrichment)

Called in batches of 10 unique company IDs extracted from search results. Runs in parallel with `enrich_contacts`.

**Requested fields:** `name`, `website`, `phone`, `description`, `socialMediaUrls`, `street`, `city`, `state`, `zipCode`, `country`, `employeeCount`, `employeeRange`, `revenueRange`, `revenue`, `primaryIndustry`, `industries`, `primarySubIndustryCode`, `parentName`, `parentId`, `foundedYear`

**Response shape:** `{ company_1: { success, data }, company_2: ..., totalEnriched, totalErrors }`

### 4. `lookup` (Department Validation — lazy, cached)

Called once per client lifetime to fetch valid ZoomInfo department values. Result is cached in `validDepartmentsCache`. Used to map caller-supplied department strings to valid ZoomInfo values via case-insensitive exact and substring matching. Unmatched values are dropped with a warning.

---

## Lead Mapping

Each ZoomInfo person record is merged with its enriched contact and company data, then transformed into a `Partial<Lead>` via `mapToLead()`. Enriched data wins over raw search data.

### Core Fields

| Lead Field | Source / Logic |
|-----------|----------------|
| `id` | `crypto.randomUUID()` |
| `name` | `firstName + lastName` |
| `title` | `contact.jobTitle` |
| `linkedinUrl` | Extracted from `contact.externalUrls` (LinkedIn entry) or `contact.linkedInUrl` |
| `urlStatus` | `'Canonical'` if LinkedIn URL present, else `'Search_Result'` |
| `confidenceScore` | `contact.contactAccuracyScore` or default `85` |
| `isVerified` | Always `true` |
| `verificationSource` | Always `'ZoomInfo MCP'` |
| `aiReasoning` | `"Sourced from ZoomInfo database for {company}"` |
| `signalTrustBridge` | Always `false` |
| `signalFunctionalWedge` | Always `true` |

### Enriched Contact Fields

| Lead Field | Source |
|-----------|--------|
| `firstName`, `lastName` | `contact.firstName`, `contact.lastName` |
| `email` | `contact.email` |
| `email2` | `contact.supplementalEmail` or `contact.email2` |
| `emailPersonal` | `contact.personalEmail` |
| `mobilePhone` | `contact.mobilePhone` |
| `directPhone` | `contact.phone` or `contact.directPhone` |
| `managementLevel` | `contact.managementLevel` |
| `contactStreet/City/State/Country/Zip` | `contact` address fields |
| `timeZone` | `contact.timeZone` |
| `yearsOfExperience` | `contact.yearsOfExperience` |
| `linkedinSummary` | `contact.linkedInSummary` |

### Enriched Company Fields

| Lead Field | Source |
|-----------|--------|
| `companyName` | `co.name` or `contact.companyName` |
| `companyStreet/City/State/Zip/Country` | `co` address fields |
| `employeeCount` | `co.employeeCount` |
| `employeeSizeRange` | `co.employeeRange` |
| `companyWebsite` | `co.website` |
| `companyPhone` | `co.phone` |
| `companyDescription` | `co.description` |
| `companyLinkedinUrl` | Extracted from `co.socialMediaUrls` |
| `industry` | `co.primaryIndustry` or first entry of `co.industries` |
| `subIndustry` | `co.primarySubIndustryCode` |
| `parentCompany` | `co.parentName` |
| `foundedYear` | `co.foundedYear` |
| `revenueRange` | `co.revenueRange` |
| `annualRevenue` | `co.revenue` (stringified) |

### CRM Fields

| Lead Field | Value |
|-----------|-------|
| `leadSourceGlobal` | `'ZoomInfo MCP'` |
| `segmentName` | `industry` |
| `sdrName`, `researcherName`, `dataRequesterDetails` | `''` (app-managed) |

> **Note:** `influenceScore` and title-based heuristics (`estimateInfluence`, `isDecisionMaker`) from the previous version have been removed. `signalAuthority` is no longer set.

---

## Error Handling & Retry Logic

| Scenario | Behavior |
|----------|----------|
| `ZOOMINFO_CLIENT_ID` or `ZOOMINFO_CLIENT_SECRET` not set | Auth service throws immediately with descriptive error |
| OAuth token exchange fails | Auth service throws with HTTP status and error body |
| Connection fails | Logs `[ZoomInfo MCP] Connection failed`, resets client, rethrows |
| Tool call fails (first attempt) | Logs retry message, resets client, clears token cache, re-acquires token, retries once |
| Tool call fails (second attempt) | Resets client, throws `ZoomInfo search failed: ...` |
| ZoomInfo validation error in response | `parseMcpResponse` detects `"Input parameter ... is invalid"` text and throws |
| Response JSON unparseable | Logs `[ZoomInfo MCP] Failed to parse response`, returns `[]` |
| Empty response content | Returns `[]` |
| Contact enrichment batch fails | Logs warning, skips batch, continues with remaining |
| Company enrichment batch fails | Logs warning, skips batch, continues with remaining |
| No valid department matches | Logs warning, skips department filter entirely |
| Successful connection | Logs `[ZoomInfo MCP] Connected. Available tools: [...]` |
| Successful extraction | Logs `[ZoomInfo MCP] FOUND: N leads for COMPANY` |

---

## Dependencies

```json
{
  "@modelcontextprotocol/sdk": "^1.27.1"
}
```

The MCP SDK provides:
- `Client` — base MCP client
- `StreamableHTTPClientTransport` — HTTP streaming transport (dynamically imported from `@modelcontextprotocol/sdk/client/streamableHttp.js`)

---

## Secondary Use: Contact Validator

Beyond lead extraction, ZoomInfo appears as one of four validation sources in the Contact Validator feature (`src/app/api/contact-validator/route.ts`). A Gemini-powered agent performs Google searches against `site:zoominfo.com` to verify contact existence and populates the `ZoomInfoStatus` field (`✅ PASS`, `⚠️ WARN`, `❌ FLAG`, `🔲 PENDING`) displayed in the validation table (`src/components/contact-validator/ValidationTable.tsx`).

This is a passive validation lookup — it does not invoke the MCP service.
