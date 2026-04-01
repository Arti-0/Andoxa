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

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
