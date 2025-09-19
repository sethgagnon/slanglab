/**
 * Utility functions for handling source logos/icons in citations
 */

// Map of domain names to their corresponding logo file paths
const sourceLogoMap: Record<string, string> = {
  'urbandictionary.com': '/logos/urbandictionary.png',
  'reddit.com': '/logos/reddit.png',
  'tiktok.com': '/logos/tiktok.png',
  'knowyourmeme.com': '/logos/knowyourmeme.png',
};

/**
 * Extract domain from a URL
 */
export function extractDomain(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Get the logo path for a given citation URL
 */
export function getSourceLogo(url: string): string {
  const domain = extractDomain(url);
  return sourceLogoMap[domain] || '/logos/default.png';
}

/**
 * Get the source name from domain for alt text
 */
export function getSourceName(url: string): string {
  const domain = extractDomain(url);
  
  const sourceNames: Record<string, string> = {
    'urbandictionary.com': 'Urban Dictionary',
    'reddit.com': 'Reddit',
    'tiktok.com': 'TikTok',
    'knowyourmeme.com': 'Know Your Meme',
  };

  return sourceNames[domain] || domain || 'Source';
}