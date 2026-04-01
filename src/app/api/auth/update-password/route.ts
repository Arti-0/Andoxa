import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

type CookieOptions = Parameters<NextResponse['cookies']['set']>[2];

export async function POST(req: NextRequest) {
    let body: { password?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { error: 'Corps JSON invalide.' },
            { status: 400 }
        );
    }

    const password = body.password;
    if (!password || password.length < 8) {
        return NextResponse.json(
            { error: 'Mot de passe invalide.' },
            { status: 400 }
        );
    }

    // cookieCarrier collecte les cookies posés par refreshSession
    const cookieCarrier = NextResponse.json({});

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return req.cookies.getAll();
            },
            setAll(
                cookiesToSet: Array<{
                    name: string;
                    value: string;
                    options?: CookieOptions;
                }>
            ) {
                cookiesToSet.forEach(({ name, value, options }) =>
                    cookieCarrier.cookies.set(name, value, options)
                );
            },
        },
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();
    console.log('[update-password] user:', user?.id ?? 'null');

    if (!user) {
        return NextResponse.json(
            { error: 'Non authentifié.' },
            { status: 401 }
        );
    }

    // Mettre à jour le mot de passe via admin (invalide le JWT actuel)
    const admin = createServiceClient();
    const { error } = await admin.auth.admin.updateUserById(user.id, {
        password,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Forcer un refresh pour obtenir un nouveau JWT valide
    // et le poser dans cookieCarrier via setAll
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
        console.error('[update-password] refresh error:', refreshError.message);
        // Ne pas bloquer — l'update a réussi, le navigateur peut re-auth
    }

    console.log(
        '[update-password] Set-Cookie after refresh:',
        cookieCarrier.headers.getSetCookie?.() ?? []
    );

    // Copier les nouveaux cookies vers la réponse finale
    const out = NextResponse.json({ success: true });
    for (const line of cookieCarrier.headers.getSetCookie?.() ?? []) {
        out.headers.append('Set-Cookie', line);
    }
    return out;
}
