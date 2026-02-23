/**
 * Avatar utility - Filter invalid avatar URLs
 *
 * Only allow Supabase storage URLs, filter out external services
 */

export function getValidAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Allow only Supabase storage URLs
  if (url.includes('.supabase.co/storage/')) {
    return url;
  }

  // Filter out external services (ui-avatars, gravatar, etc.)
  if (
    url.includes('ui-avatars.com') ||
    url.includes('gravatar.com') ||
    url.includes('placeholder')
  ) {
    return undefined; // Use fallback instead
  }

  // Allow other valid URLs (if user uploaded elsewhere)
  return url;
}

