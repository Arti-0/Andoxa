import { MetadataRoute } from 'next'
import { COMPARISONS } from '@/lib/marketing/comparisons'

// Canonical host is the www apex (matches the live Vercel project and the
// /www → / redirect). Keep this in sync with metadataBase in app/layout.tsx
// and the Sitemap line in public/robots.txt.
const BASE_URL = 'https://www.andoxa.fr'

type SitemapEntry = MetadataRoute.Sitemap[number]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const entry = (
    path: string,
    priority: number,
    changeFrequency: SitemapEntry['changeFrequency'] = 'monthly',
  ): SitemapEntry => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  })

  return [
    entry('', 1, 'weekly'),
    entry('/pricing', 0.9),
    // Comparison pages are driven by COMPARISONS so adding one = one entry there.
    entry('/comparatif', 0.7),
    ...COMPARISONS.map((c) => entry(c.href, 0.6)),
    // Resources / content
    entry('/resources', 0.6),
    entry('/resources/guide', 0.6),
    entry('/resources/roi-calculator', 0.6),
    entry('/changelog', 0.5, 'weekly'),
    entry('/contact', 0.5),
    entry('/help', 0.4),
    entry('/security', 0.4),
    entry('/auth/login', 0.4),
    // Legal
    entry('/cgu', 0.3),
    entry('/cgv', 0.3),
    entry('/mentions-legales', 0.3),
    entry('/privacy', 0.3),
  ]
}
