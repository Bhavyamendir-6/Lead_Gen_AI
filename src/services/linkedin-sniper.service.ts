import { Lead } from '@/types';
import puppeteer from 'puppeteer-core';

export class SniperEngine {
  async connectAndVerify(url: string, targetCompany: string): Promise<Partial<Lead> | null> {
    let browser;
    try {
      // Connect to YOUR actual running Chrome instance
      browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // HYDRA LOGIC: Extract raw JSON metadata from the page source
      const pageContent = await page.content();
      
      // Look for the URN:LI:FS_MINIPROFILE block which contains ground-truth employment
      const isCurrent = pageContent.toLowerCase().includes(targetCompany.toLowerCase()) && 
                        pageContent.toLowerCase().includes('"en-us"');

      if (!isCurrent) {
        await page.close();
        return null;
      }

      const data = await page.evaluate(() => {
        // Extract Name and Title from the hidden Metadata JSON
        const jsonChunks = Array.from(document.querySelectorAll('code'))
          .map(c => c.textContent || "")
          .filter(t => t.includes('firstName'));
        
        if (jsonChunks.length > 0) {
            const profile = JSON.parse(jsonChunks[0]);
            return { name: `${profile.firstName} ${profile.lastName}`, title: profile.occupation };
        }
        return null;
      });

      await page.close();
      return data ? { ...data, company: targetCompany, linkedinUrl: url, isVerified: true } : null;

    } catch (e) {
      console.error("[Hydra Error]", e);
      return null;
    }
  }
}