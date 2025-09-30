/**
 * Input Sanitization Utilities
 * 
 * Provides comprehensive input sanitization to prevent XSS attacks
 * and other security vulnerabilities in user-provided content.
 * 
 * @connorbowen 2025-01-29 - Created for chat interface XSS protection
 */

/**
 * Sanitizes user input to prevent XSS attacks and other security issues
 * @param input - The input string to sanitize
 * @returns Sanitized string safe for display
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove script tags and other potentially dangerous content
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<script>/gi, '') // Remove opening script tags
    .replace(/<\/script>/gi, '') // Remove closing script tags
    .replace(/<script/gi, '') // Remove partial script tags
    .replace(/<script.*?>/gi, '') // Remove any remaining script tags
    .replace(/<\/script.*?>/gi, '') // Remove any remaining closing script tags
    .replace(/<script[^>]*>/gi, '') // Remove any script opening tags
    .replace(/<\/script[^>]*>/gi, '') // Remove any script closing tags
    .replace(/<script/gi, '') // Remove any remaining script fragments
    .replace(/<\/script/gi, '') // Remove any remaining script fragments
    .trim();
  
  // Additional aggressive check for any remaining script content
  if (sanitized.includes('<script') || sanitized.includes('</script') || sanitized.includes('script')) {
    sanitized = sanitized
      .replace(/<script.*?<\/script>/gi, '')
      .replace(/<script[^>]*>/gi, '')
      .replace(/<\/script[^>]*>/gi, '')
      .replace(/script/gi, '');
  }
  
  return sanitized;
}

/**
 * Escapes HTML entities for safe display
 * @param input - The input string to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes input for display in chat messages
 * Combines sanitization and HTML escaping for maximum safety
 * @param input - The input string to sanitize
 * @returns Safe string for chat display
 */
export function sanitizeForChat(input: string): string {
  const sanitized = sanitizeInput(input);
  return escapeHtml(sanitized);
}
