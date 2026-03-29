// Professional Lead Gen Platform - Enterprise Module
// Global State Management (Supabase Persistent v3.5)

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase-client';
import { 
  SourceAccount, 
  CompetitiveProxy, 
  Lead, 
  CookieSession, 
  ProcessingStatus, 
  ExtractionFilters 
} from '@/types';

const supabase = createClient();

interface PortfolioState {
  sourceAccounts: SourceAccount[];
  selectedAccount: SourceAccount | null;
  competitiveProxies: CompetitiveProxy[];
  leads: Lead[];
  session: CookieSession | null;
  status: ProcessingStatus;
  extractionFilters: ExtractionFilters;
  selectedModel: string;

  // Actions
  syncWithCloud: () => Promise<void>;
  addAccount: (acc: Partial<SourceAccount>) => Promise<void>;
  addLead: (lead: Partial<Lead>) => Promise<void>;
  saveLeadsBulk: (leads: Partial<Lead>[]) => Promise<void>;
  saveProxiesToDB: (proxies: CompetitiveProxy[], sourceAccountId: string) => Promise<void>;
  setSourceAccounts: (accounts: SourceAccount[]) => void;
  selectAccount: (account: SourceAccount | null) => void;
  setProxies: (proxies: CompetitiveProxy[], append?: boolean) => void;
  setLeads: (leads: Lead[], append?: boolean) => void;
  updateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  setSession: (session: CookieSession | null) => Promise<void>;
  setProcessingStatus: (status: Partial<ProcessingStatus>) => void;
  setFilters: (filters: ExtractionFilters) => void;
  setSelectedModel: (model: string) => void;
  resetStore: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      sourceAccounts: [],
      selectedAccount: null,
      competitiveProxies: [],
      leads: [],
      session: null,
      selectedModel: 'gemini-2.5-flash',
      status: {
        analyzingSource: false,
        findingProxies: false,
        extractingLeads: false,
        extractingHarvestTarget: false,
        extractingAutoHarvest: false,
        generatingHookFor: null,
      },
      extractionFilters: {
        jobTitles: "VP, Director, Head of",
        departments: "Engineering, Product, Data",
        minExperience: 8,
        location: "United States",
        enableHumanMimicry: true
      },

      // 1. Full Cloud Hydration
      syncWithCloud: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [accounts, proxies, extractedLeads, profile] = await Promise.all([
          supabase.from('source_accounts').select('*').eq('user_id', user.id),
          supabase.from('competitive_proxies').select('*').eq('user_id', user.id),
          supabase.from('leads').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('*').eq('id', user.id).single()
        ]);

        const mappedAccounts = (accounts.data || []).map(acc => ({
          id: acc.id,
          name: acc.name,
          domain: acc.domain,
          subDomain: acc.sub_domain,
          techStack: acc.tech_stack,
          track: acc.track,
          createdAt: new Date(acc.created_at)
        }));

        const mappedProxies = (proxies.data || []).map(p => ({
          id: p.id,
          sourceAccountId: p.source_account_id,
          name: p.name,
          similarityScore: p.similarity_score,
          proxyWedge: p.proxy_wedge,
          techStackOverlap: p.tech_stack_overlap || [],
          websiteUrl: p.website_url,
          employeeCount: p.employee_count,
          industry: p.industry,
        }));

        const mappedLeads: Lead[] = (extractedLeads.data || []).map(l => ({
          id: l.id,
          proxyId: l.proxy_id,
          name: l.name,
          title: l.title,
          company: l.company || '',
          linkedinUrl: l.linkedin_url,
          urlStatus: l.url_status || 'Canonical',
          confidenceScore: l.confidence_score,
          isVerified: l.is_verified,
          generatedHook: l.generated_hook,
          matchedSkills: l.matched_skills || [],
          aiReasoning: l.ai_reasoning || '',
          influenceScore: l.influence_score || 0,
          signalTrustBridge: l.signal_trust_bridge || false,
          signalFunctionalWedge: l.signal_functional_wedge || false,
          signalAuthority: l.signal_authority || false,
        }));

        // Merge cloud data with local state — cloud wins on conflict, local-only entries are kept
        const mergeById = <T extends { id: string }>(local: T[], cloud: T[]): T[] => {
          const cloudIds = new Set(cloud.map(x => x.id));
          return [...cloud, ...local.filter(x => !cloudIds.has(x.id))];
        };

        set((currentState) => ({
          sourceAccounts: mergeById(currentState.sourceAccounts, mappedAccounts),
          competitiveProxies: mergeById(currentState.competitiveProxies, mappedProxies),
          leads: mergeById(currentState.leads, mappedLeads),
          session: profile.data ? {
            li_at: profile.data.encrypted_li_at,
            JSESSIONID: profile.data.encrypted_jsessionid,
            status: profile.data.session_status,
            lastValidated: new Date(profile.data.updated_at)
          } : currentState.session
        }));
      },

      // 2. Persistent Account Save
      addAccount: async (acc) => {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        const { data, error } = await supabase.from('source_accounts').insert([{
          user_id: userId,
          name: acc.name,
          domain: acc.domain,
          sub_domain: acc.subDomain,
          tech_stack: acc.techStack,
          track: acc.track
        }]).select().single();

        const saved: SourceAccount = error || !data
          ? { ...acc, id: acc.id || crypto.randomUUID(), createdAt: acc.createdAt || new Date() } as SourceAccount
          : { ...acc, id: data.id, createdAt: new Date(data.created_at) } as SourceAccount;

        if (error) console.warn("Supabase save failed, using local state:", error.message);
        set({ sourceAccounts: [...get().sourceAccounts, saved], selectedAccount: saved });
      },

      // 3. Persistent Individual Lead Save
      addLead: async (lead) => {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        const { data, error } = await supabase.from('leads').insert([{
          user_id: userId,
          proxy_id: lead.proxyId,
          name: lead.name,
          title: lead.title,
          linkedin_url: lead.linkedinUrl,
          confidence_score: lead.confidenceScore,
          is_verified: lead.isVerified,
          matched_skills: lead.matchedSkills
        }]).select().single();

        if (!error && data) {
          set({ leads: [...get().leads, { ...lead, id: data.id } as Lead] });
        }
      },

      // 4. Persistent Bulk Lead Save (For Extraction batches)
      saveLeadsBulk: async (newLeads) => {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // Collect candidate proxy IDs (valid UUIDs only)
        const candidateProxyIds = [...new Set(
          newLeads.map(l => l.proxyId).filter(id => uuidRegex.test(id ?? ''))
        )];

        // Verify which proxy IDs actually exist in DB to avoid FK violations
        let validProxyIds = new Set<string>();
        if (candidateProxyIds.length > 0) {
          const { data: existingProxies } = await supabase
            .from('competitive_proxies')
            .select('id')
            .in('id', candidateProxyIds);
          validProxyIds = new Set((existingProxies ?? []).map(p => p.id));
        }

        const dbLeads = newLeads
          .filter(l => l.proxyId && validProxyIds.has(l.proxyId))
          .map(l => ({
            user_id: userId,
            proxy_id: l.proxyId,
            name: l.name,
            title: l.title,
            linkedin_url: l.linkedinUrl,
            confidence_score: l.confidenceScore,
            is_verified: l.isVerified,
            matched_skills: l.matchedSkills
          }));

        if (dbLeads.length === 0) return;
        const { error } = await supabase.from('leads').insert(dbLeads);
        if (error) console.error("Bulk Save Error:", error.message);
      },

      // 5. Persistent Lead Update (Syncs Hook Generation)
      updateLead: async (leadId, updates) => {
        // Update Local State
        set((state) => ({
          leads: state.leads.map(l => l.id === leadId ? { ...l, ...updates } : l)
        }));

        // Sync to Supabase
        const dbUpdates: any = {};
        if (updates.generatedHook !== undefined) dbUpdates.generated_hook = updates.generatedHook;
        if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified;

        await supabase.from('leads').update(dbUpdates).eq('id', leadId);
      },

      // 6. Persistent Proxy Bulk Save (for newly discovered proxies)
      saveProxiesToDB: async (newProxies, sourceAccountId) => {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        const rows = newProxies.map(p => ({
          id: p.id,
          user_id: userId,
          source_account_id: sourceAccountId,
          name: p.name,
          similarity_score: p.similarityScore,
          proxy_wedge: p.proxyWedge,
          tech_stack_overlap: p.techStackOverlap,
          website_url: p.websiteUrl,
          employee_count: p.employeeCount,
          industry: p.industry,
        }));
        const { error } = await supabase.from('competitive_proxies').upsert(rows, { onConflict: 'id' });
        if (error) console.warn('Proxy save error:', error.message);
      },

      setSourceAccounts: (accounts) => set({ sourceAccounts: accounts }),
      selectAccount: (account) => set({ selectedAccount: account }),
      
      setProxies: (newProxies, append = false) => set((state) => {
        if (!append) return { competitiveProxies: newProxies };
        const existingNames = new Set(state.competitiveProxies.map(p => p.name.toLowerCase()));
        const unique = newProxies.filter(p => !existingNames.has(p.name.toLowerCase()));
        return { competitiveProxies: [...state.competitiveProxies, ...unique] };
      }),

      setLeads: (leads, append = false) => set((state) => ({ 
        leads: append ? [...state.leads, ...leads] : leads 
      })),
      
      setSession: async (sessionData) => {
        if (!sessionData) return;
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id ?? 'anonymous';
        await supabase.from('profiles').upsert({
          id: userId,
          encrypted_li_at: sessionData.li_at,
          encrypted_jsessionid: sessionData.JSESSIONID,
          session_status: 'Active',
          updated_at: new Date().toISOString()
        });
        set({ session: sessionData });
      },

      setProcessingStatus: (newStatus) => set((state) => ({ status: { ...state.status, ...newStatus } })),
      setFilters: (filters) => set({ extractionFilters: filters }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      resetStore: () => set({ sourceAccounts: [], competitiveProxies: [], leads: [], selectedAccount: null })
    }),
    {
      name: 'shorthills-portfolio-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sourceAccounts: state.sourceAccounts,
        selectedAccount: state.selectedAccount,
        competitiveProxies: state.competitiveProxies,
        leads: state.leads,
        extractionFilters: state.extractionFilters,
        session: state.session,
        selectedModel: state.selectedModel
      }),
    }
  )
);