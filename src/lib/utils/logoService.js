/**
 * Logo service utilities for automatically fetching API logos
 */

// Clearbit logo service URL
const CLEARBIT_BASE_URL = 'https://logo.clearbit.com';

/**
 * Extract domain from a base URL
 */
function extractDomainFromUrl(baseUrl) {
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
function getClearbitLogoUrl(domain) {
  return `${CLEARBIT_BASE_URL}/${domain}`;
}

/**
 * Test if a logo URL is accessible
 */
async function testLogoUrl(logoUrl, timeout = 5000) {
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
async function autoFetchLogo(baseUrl, existingLogoUrl) {
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
async function batchUpdateLogos(apis) {
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

module.exports = {
  extractDomainFromUrl,
  getClearbitLogoUrl,
  testLogoUrl,
  autoFetchLogo,
  batchUpdateLogos
};
