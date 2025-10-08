/**
 * Logo service utilities for automatically fetching API logos
 */

// Clearbit logo service URL
const CLEARBIT_BASE_URL = 'https://logo.clearbit.com';

/**
 * Extract domain from a base URL
 */
export function extractDomainFromUrl(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl);
    return url.hostname.replace('www.', '');
  } catch (error) {
    return null;
  }
}

/**
 * Generate Clearbit logo URL for a domain
 */
export function getClearbitLogoUrl(domain: string): string {
  return `${CLEARBIT_BASE_URL}/${domain}`;
}

/**
 * Test if a logo URL is accessible
 */
export async function testLogoUrl(logoUrl: string, timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(logoUrl, { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Auto-fetch logo for an API using Clearbit service
 */
export async function autoFetchLogo(baseUrl: string, existingLogoUrl?: string): Promise<string | null> {
  // If logo already exists, return it
  if (existingLogoUrl) {
    return existingLogoUrl;
  }

  try {
    const domain = extractDomainFromUrl(baseUrl);
    if (!domain) {
      return null;
    }

    const clearbitLogoUrl = getClearbitLogoUrl(domain);
    const isAccessible = await testLogoUrl(clearbitLogoUrl);
    
    return isAccessible ? clearbitLogoUrl : null;
  } catch (error) {
    return null;
  }
}

/**
 * Batch update logos for multiple APIs
 */
export async function batchUpdateLogos(apis: Array<{ id: string; name: string; baseUrl: string; logoUrl?: string }>): Promise<Array<{ id: string; name: string; logoUrl: string | null; success: boolean; error?: string }>> {
  const results = [];
  
  for (const api of apis) {
    try {
      const logoUrl = await autoFetchLogo(api.baseUrl, api.logoUrl);
      
      results.push({
        id: api.id,
        name: api.name,
        logoUrl,
        success: true
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({
        id: api.id,
        name: api.name,
        logoUrl: null,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return results;
}
