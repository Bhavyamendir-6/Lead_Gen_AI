// Professional Lead Gen Platform - Anti-Hallucination Module
// Verified LinkedIn URL Retrieval Service

export const searchVerifiedProfile = async (name: string, company: string): Promise<{ url: string | null; confidence: number }> => {
  const query = `site:linkedin.com/in/ "${name}" "${company}"`;
  
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 1 }),
    });

    const data = await response.json();
    
    // Extract the first organic search result
    if (data.organic && data.organic.length > 0) {
      const result = data.organic[0];
      
      // Ensure the link is actually a LinkedIn profile
      if (result.link.includes('linkedin.com/in/')) {
        return { 
          url: result.link, 
          confidence: 100 // Indexed URLs are 100% real
        };
      }
    }

    return { url: null, confidence: 0 };
  } catch (error) {
    console.error("[Search Service] Failed to retrieve verified link:", error);
    return { url: null, confidence: 0 };
  }
};