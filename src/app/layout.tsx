import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from 'next-themes';
import QueryProvider from '@/components/QueryProvider';
import { WorkspaceProvider } from '@/lib/workspace';
import { SentryClientInit } from '@/components/SentryClientInit';
import { Toaster } from '@/components/ui/sonner';
import { JsonLd } from '@/components/seo/json-ld';
import { organizationSchema, websiteSchema } from '@/lib/seo/structured-data';
import '@/app/globals.css';

export const metadata: Metadata = {
    // Canonical host for resolving relative OG/canonical URLs. Keep in sync with
    // BASE_URL in app/sitemap.ts and the Sitemap line in public/robots.txt.
    metadataBase: new URL('https://www.andoxa.fr'),
    title: {
        default: 'Andoxa — La prospection commerciale, de la liste au rendez-vous',
        template: '%s · Andoxa',
    },
    description:
        'Andoxa réunit CRM, campagnes LinkedIn, prise de rendez-vous et workflows pour transformer vos listes de prospects en rendez-vous signés.',
    openGraph: {
        type: 'website',
        siteName: 'Andoxa',
        locale: 'fr_FR',
        url: 'https://www.andoxa.fr',
        title: 'Andoxa — La prospection commerciale, de la liste au rendez-vous',
        description:
            'CRM, campagnes LinkedIn, booking et workflows. Transformez vos listes de prospects en rendez-vous.',
        // og:image is supplied automatically by app/opengraph-image.tsx.
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Andoxa — La prospection commerciale, de la liste au rendez-vous',
        description:
            'CRM, campagnes LinkedIn, booking et workflows. Transformez vos listes de prospects en rendez-vous.',
    },
    icons: {
        icon: [
            { url: '/assets/favicon/icon0.svg', type: 'image/svg+xml' },
            {
                url: '/assets/favicon/icon-32.png',
                type: 'image/png',
                sizes: '32x32',
            },
            {
                url: '/assets/favicon/icon-192.png',
                type: 'image/png',
                sizes: '192x192',
            },
            { url: '/assets/favicon/favicon.ico', sizes: 'any' },
        ],
        apple: '/assets/favicon/apple-touch-icon.png',
    },
    manifest: '/assets/favicon/manifest.json',
};

/**
 * Root Layout
 *
 * Minimal setup:
 * - Theme provider (dark/light mode)
 * - Global styles
 *
 * Note: Auth gates live in src/proxy.ts (middleware); workspace context is in (protected)/protected-layout-content.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html
            lang="fr"
            suppressHydrationWarning
            data-scroll-behavior="smooth"
            className={`${GeistSans.variable} ${GeistMono.variable}`}
        >
            <body className="min-h-screen bg-background font-sans antialiased">
                <JsonLd data={organizationSchema()} />
                <JsonLd data={websiteSchema()} />
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <QueryProvider>
                        <WorkspaceProvider>
                            {children}
                            <Toaster richColors position="bottom-right" />
                            <SentryClientInit />
                        </WorkspaceProvider>
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
