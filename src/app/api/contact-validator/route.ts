import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import type { ContactInput, ValidatedContact } from '@/types/contact-validator';

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-flash-preview-04-17': { input: 0.075, output: 0.30 },
  'gemini-2.5-pro-preview-05-06': { input: 3.50, output: 10.50 },
  'default': { input: 0.075, output: 0.30 },
};

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING.default;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

async function executeWithKeyRotation<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  allKeys: string[]
): Promise<T> {
  if (allKeys.length === 0) {
    throw new Error('No valid API keys available.');
  }

  let lastError: any;
  for (const key of allKeys) {
    const ai = new GoogleGenAI({ apiKey: key });
    try {
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      const msg = (error?.message ?? String(error)).toLowerCase();
      const isQuota =
        error?.status === 429 ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('too many requests') ||
        msg.includes('resource has been exhausted') ||
        msg.includes('api key not valid') ||
        msg.includes('invalid api key');
      if (!isQuota) throw error;
    }
  }
  throw new Error(`All API keys failed. Last error: ${lastError?.message ?? lastError}`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, contact, validatedContacts, modelName, customApiKeys = [] } = body;

    const systemKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';
    const allKeys = [systemKey, ...customApiKeys].filter(Boolean) as string[];

    if (action === 'validate') {
      const c = contact as ContactInput;
      const prompt = `
You are a dealer data validation specialist. Your job is to validate automotive dealership contact records across 4 sources: Rooftop Website, LinkedIn, ZoomInfo, and DealerRater.

For the following record, validate these fields:
- Name: ${c.name || 'Unknown'}
- Auto Group: ${c.autoGroup || 'Not provided'}
- Rooftop: ${c.rooftop || 'Not provided'}
- LinkedIn URL: ${c.linkedin || 'Not provided'}

CRITICAL INSTRUCTIONS:
1. **Auto Group**: Must be the dealer GROUP name, not the rooftop name (e.g. "Ken Garff Automotive Group" not "Ken Garff").
2. **Rooftop**: Specific dealership name, not HQ.
3. **Cleaned Title**: Must be an actual GM-level title. Flag anything that is not "General Manager" (e.g. "Schedules Manager", "Vice President", "Multi", "Assistant GM").
4. **Address**: Must be the rooftop address, not corporate HQ. Flag if it matches known HQs:
   - AutoNation: 200 SW 1st Ave, Fort Lauderdale
   - Hendrick: 6000 Monroe Rd
   - Penske: 2555 S Telegraph Rd
   - Lithia: 150 N Bartlett St
   - Steele: 8 Basinview Dr
5. **LinkedIn URL**: Verify if it points to the correct person.

SEARCH STRATEGY:
Use Google Search grounding to perform these searches:
- "${c.name} ${c.autoGroup} General Manager site:linkedin.com"
- "${c.name} ${c.autoGroup} General Manager site:zoominfo.com"
- "${c.name} ${c.autoGroup} General Manager site:dealerrater.com"
- Search for the dealership's official website staff or about page (e.g. "[Rooftop Name] staff directory").

STATUS ASSIGNMENT:
- ✅ PASS – Confirmed from that source
- ⚠️ WARN – Partial info, outdated, or concern found
- ❌ FLAG – Contradicted, wrong, or unusable
- 🔲 PENDING – Could not confirm

AUTOMATIC FLAGS:
1. Title is not "General Manager" -> ⚠️ WARN or ❌ FLAG.
2. Address is a known corporate HQ -> ⚠️ WARN on Rooftop Website.
3. Auto Group name is too generic or same as Rooftop -> ⚠️ WARN.
4. Address appears garbled or invalid -> ❌ FLAG.
5. Rooftop website lists a different person as GM -> ⚠️ WARN.

Return the result strictly as a JSON ARRAY of objects inside a markdown code block.
Each JSON object must have these keys:
- "Name"
- "AutoGroup"
- "Rooftop"
- "CleanedTitle"
- "Address"
- "LinkedinURL"
- "RooftopWebsiteStatus" (must be one of the 4 status strings)
- "LinkedInStatus" (must be one of the 4 status strings)
- "ZoomInfoStatus" (must be one of the 4 status strings)
- "DealerRaterStatus" (must be one of the 4 status strings)
- "OverallValidation" (must be one of the 4 status strings)
- "ConcernsNotes" (Explain every flag clearly)
`;

      try {
        const response = await executeWithKeyRotation(
          (ai) => ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] },
          }),
          allKeys
        );

        let text = response.text ?? '[]';
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch?.[1]) {
          text = jsonMatch[1];
        } else {
          const first = text.indexOf('[');
          const last = text.lastIndexOf(']');
          if (first !== -1 && last !== -1) text = text.substring(first, last + 1);
        }

        const parsed = JSON.parse(text);
        const data: ValidatedContact[] = Array.isArray(parsed) ? parsed : [parsed];

        const meta = (response as any).usageMetadata ?? {};
        const inputTokens: number = meta.promptTokenCount ?? 0;
        const outputTokens: number = meta.candidatesTokenCount ?? 0;
        const cost = calcCost(modelName, inputTokens, outputTokens);

        return NextResponse.json({ data, usage: { inputTokens, outputTokens, cost } });
      } catch (err: any) {
        const errData: ValidatedContact[] = [{
          Name: c.name || 'Error',
          AutoGroup: c.autoGroup || '',
          Rooftop: c.rooftop || '',
          CleanedTitle: 'Error',
          Address: '',
          LinkedinURL: c.linkedin || '',
          RooftopWebsiteStatus: '🔲 PENDING',
          LinkedInStatus: '🔲 PENDING',
          ZoomInfoStatus: '🔲 PENDING',
          DealerRaterStatus: '🔲 PENDING',
          OverallValidation: '❌ FLAG',
          ConcernsNotes: err?.message ?? 'Failed to verify due to an error.',
        }];
        return NextResponse.json({ data: errData, usage: { inputTokens: 0, outputTokens: 0, cost: 0 } });
      }
    }

    if (action === 'suggestions') {
      const prompt = `
Based on the following validated dealership contacts, provide some high-level suggestions for improvements.
This could include data quality issues, patterns in outdated information, or recommendations for better data collection.

Validated Data:
${JSON.stringify(validatedContacts, null, 2)}

Provide your suggestions in a clear, concise markdown format.
`;

      try {
        const response = await executeWithKeyRotation(
          (ai) => ai.models.generateContent({ model: modelName, contents: prompt }),
          allKeys
        );
        const suggestions = response.text ?? 'No suggestions available.';
        const meta = (response as any).usageMetadata ?? {};
        const inputTokens: number = meta.promptTokenCount ?? 0;
        const outputTokens: number = meta.candidatesTokenCount ?? 0;
        const cost = calcCost(modelName, inputTokens, outputTokens);
        return NextResponse.json({ suggestions, usage: { inputTokens, outputTokens, cost } });
      } catch (err: any) {
        return NextResponse.json({ suggestions: 'Failed to generate suggestions.', usage: { inputTokens: 0, outputTokens: 0, cost: 0 } });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}
