// Professional Lead Gen Platform - Enterprise Module
// Robust Gemini AI Service: Analysis, Discovery, & Synthesis

import { GoogleGenerativeAI } from "@google/generative-ai";
import { SourceAccount, StrategicTrack, CompetitiveProxy, Lead } from "../types";

const API_KEYS = [
  process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  process.env.NEXT_PUBLIC_GEMINI_KEY_54,
  process.env.NEXT_PUBLIC_GEMINI_KEY_55,
  process.env.NEXT_PUBLIC_GEMINI_KEY_56,
  process.env.NEXT_PUBLIC_GEMINI_KEY_57,
  process.env.NEXT_PUBLIC_GEMINI_KEY_58,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

const getGenAI = () => {
  if (API_KEYS.length === 0) throw new Error("No Gemini API keys configured");
  return new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
};

const rotateKey = () => {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
};

const callWithRetry = async <T>(
  fn: (genAI: GoogleGenerativeAI, modelName: string) => Promise<T>,
  primaryModel = 'gemini-2.5-flash'
): Promise<T> => {
  let lastError: Error | null = null;
  const startIndex = FALLBACK_MODELS.indexOf(primaryModel);
  const modelsToTry = startIndex >= 0 ? FALLBACK_MODELS.slice(startIndex) : [primaryModel, ...FALLBACK_MODELS];

  for (const modelName of modelsToTry) {
    for (let i = 0; i < API_KEYS.length; i++) {
      try {
        return await fn(getGenAI(), modelName);
      } catch (err: any) {
        lastError = err;
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota');
        const is503 = err?.status === 503 || err?.message?.includes('503');
        if (is429 && API_KEYS.length > 1) {
          console.warn(`API key ${currentKeyIndex + 1} rate-limited, rotating to next key...`);
          rotateKey();
          continue;
        }
        if (is503) {
          console.warn(`Model ${modelName} unavailable (503), trying fallback model...`);
          break; // try next model
        }
        throw err;
      }
    }
  }
  throw lastError || new Error("All models and API keys exhausted");
};

/**
 * Helper to strip Markdown backticks and extract pure JSON string.
 * Handles cases where Gemini wraps output in ```json ... ```
 */
const sanitizeJsonResponse = (text: string): string => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

/**
 * 1. BLUEPRINTING: Analyzes a Source Account to create a strategic profile.
 */
export const analyzeSourceAccount = async (companyName: string): Promise<SourceAccount> => {
  return callWithRetry(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Analyze the company "${companyName}" for an enterprise B2B sales strategy.
      Return a JSON object with:
      1. "domain": Primary web domain.
      2. "subDomain": Technical niche (e.g. "Fintech Infrastructure").
      3. "techStack": Array of 5-8 primary technologies they likely use.
      4. "track": One of: "Market Penetration", "Product Expansion", "Competitive Mirroring".

      IMPORTANT: Return ONLY the JSON object. Do not include any explanations.
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanJson = sanitizeJsonResponse(rawText);
    const data = JSON.parse(cleanJson);

    return {
      id: crypto.randomUUID(),
      name: companyName,
      domain: data.domain,
      subDomain: data.subDomain,
      techStack: Array.isArray(data.techStack) ? data.techStack : [],
      track: data.track as StrategicTrack,
      createdAt: new Date(),
    };
  });
};

/**
 * 2. DISCOVERY: Finds Competitive Proxies (Rivals).
 * Supports "Load More" via existingNames exclusion.
 */
export const findCompetitiveProxies = async (source: SourceAccount, existingNames: string[] = []): Promise<CompetitiveProxy[]> => {
  return callWithRetry(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Identify 10 companies that are competitive proxies (direct rivals) for ${source.name} (${source.domain}).

      EXCLUDE these companies (we already have them): ${existingNames.join(', ')}.

      Please find NEW, unique alternatives.
      Return a JSON array of objects with: "name", "similarityScore", "proxyWedge", "techStackOverlap".
      IMPORTANT: Return ONLY the JSON array.
    `;

    const result = await model.generateContent(prompt);
    const rawText = result.response.text();
    const cleanJson = sanitizeJsonResponse(rawText);
    const data = JSON.parse(cleanJson);

    return data.map((p: any) => ({
      ...p,
      id: crypto.randomUUID(),
      sourceAccountId: source.id,
      techStackOverlap: Array.isArray(p.techStackOverlap)
        ? p.techStackOverlap
        : typeof p.techStackOverlap === 'string'
          ? p.techStackOverlap.split(',').map((s: string) => s.trim())
          : []
    }));
  });
};

/**
 * 3. TARGETING: Identifies Decision Makers.
 */
export const suggestDecisionMakers = async (company: string, modelId: string): Promise<string[]> => {
  return callWithRetry(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      Identify the top 5 specific job titles at ${company} that are most likely to be the "Economic Buyer" or "Technical Decision Maker" for enterprise software.
      Focus on Engineering, Product, or Data leadership.

      Return ONLY a comma-separated list of titles (e.g. "VP of Engineering, Chief Data Officer").
      No intro, no numbering.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.split(',').map((t: string) => t.trim());
  }, modelId);
};

/**
 * 4. SYNTHESIS: Generates the Mirror Hook.
 */
export const generateMirrorHook = async (
  lead: Lead,
  source: SourceAccount,
  proxy: CompetitiveProxy
): Promise<string> => {
  return callWithRetry(async (genAI, modelName) => {
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      As a B2B strategist, write a 1-sentence personalized reach-out hook.
      Target: ${lead.name}, ${lead.title} at ${proxy.name}.
      Context: They mirror ${source.name} (Tech Stack: ${source.techStack.join(', ')}).
      Strategic Wedge: ${proxy.proxyWedge}.
      Lead's Skills: ${lead.matchedSkills.join(', ')}.

      The hook must mention a shared technical challenge or market movement related to ${source.name}
      without being a hard sell. It should sound like peer-to-peer insight.

      Format: "Just a single sentence, no quotes."
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  });
};