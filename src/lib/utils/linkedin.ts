/**
 * LinkedIn URL validation and formatting utilities
 */

/**
 * Validates if a string looks like a valid LinkedIn profile URL or slug
 * LinkedIn slugs typically:
 * - Use hyphens instead of spaces
 * - Can contain accented characters (e.g., andréas-bodin)
 * - Are alphanumeric with hyphens and underscores
 * - Usually between 3-100 characters
 */
function isValidLinkedInSlug(slug: string): boolean {
  // Remove common prefixes if present
  const cleanSlug = slug
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?linkedin\.com\/in\//, "")
    .replace(/^in\//, "")
    .trim();

  // LinkedIn slugs are typically:
  // - Can contain accented characters (LinkedIn supports Unicode in URLs)
  // - No spaces (use hyphens instead)
  // - Usually between 3-100 characters
  
  // Check if it contains spaces (likely a name, not a slug)
  if (/\s/.test(cleanSlug)) {
    return false;
  }

  // Check if it matches LinkedIn slug pattern
  // LinkedIn allows: a-z, 0-9, hyphens, underscores, and Unicode characters (including accents)
  // Pattern: alphanumeric, hyphens, underscores, and Unicode letters (including accents)
  const linkedinSlugPattern = /^[\p{L}0-9_-]{3,100}$/u;
  if (!linkedinSlugPattern.test(cleanSlug)) {
    return false;
  }

  return true;
}

/**
 * Validates and normalizes a LinkedIn URL or username
 * Returns null if the input is invalid (e.g., just a name)
 * 
 * @param input - LinkedIn URL, username, or potentially invalid input
 * @returns Normalized LinkedIn URL or null if invalid
 */
export function validateAndNormalizeLinkedIn(
  input: string | null | undefined
): string | null {
  if (!input || typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Remove common prefixes
  let cleaned = trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\.linkedin\.com\//, "")
    .replace(/^linkedin\.com\//, "")
    .replace(/^@/, "")
    .trim();

  // If it already contains /in/, extract the slug part
  if (cleaned.includes("/in/")) {
    cleaned = cleaned.replace(/^.*\/in\//, "").split("/")[0].split("?")[0];
  }

  // If the input is already a full URL with /in/, validate the slug part
  if (trimmed.includes("/in/")) {
    // Extract slug from URL
    const urlMatch = trimmed.match(/linkedin\.com\/in\/([^/?]+)/i);
    if (urlMatch && urlMatch[1]) {
      const slug = urlMatch[1];
      // Check if it's a valid LinkedIn slug (including accents)
      if (isValidLinkedInSlug(slug)) {
        // Preserve the original slug (including accents and case) as LinkedIn URLs are case-sensitive
        return `https://www.linkedin.com/in/${slug}`;
      }
    }
  }

  // Check if it's a valid LinkedIn slug
  if (!isValidLinkedInSlug(cleaned)) {
    // If it looks like someone just entered a name, return null
    return null;
  }

  // Preserve original case and accents (LinkedIn URLs are case-sensitive and preserve accents)
  // Only normalize if it's not already a full URL
  return `https://www.linkedin.com/in/${cleaned}`;
}

/**
 * Checks if a string is likely just a name rather than a LinkedIn URL/slug
 */
export function isLikelyName(input: string): boolean {
  if (!input || typeof input !== "string") {
    return false;
  }

  const trimmed = input.trim();
  
  // If it contains "linkedin.com/in/" or "/in/", it's definitely a URL, not just a name
  if (trimmed.includes("linkedin.com/in/") || trimmed.includes("/in/")) {
    return false;
  }
  
  // Contains spaces (names usually have spaces, but URLs don't)
  if (/\s/.test(trimmed)) {
    return true;
  }

  // Doesn't look like a URL or slug at all
  if (!trimmed.includes("linkedin") && !trimmed.includes("/") && !trimmed.includes(".")) {
    // If it's just a word without URL structure, might be a name
    // But if it contains hyphens and looks like a slug, it's probably a LinkedIn username
    if (trimmed.includes("-") && /^[\p{L}0-9_-]{3,100}$/u.test(trimmed)) {
      // Looks like a slug, not a name
      return false;
    }
    if (trimmed.length < 20 && /^[\p{L}\s-]+$/u.test(trimmed)) {
      return true;
    }
  }

  return false;
}







