'use client';

import { EmailPasswordLoginForm } from '@/lib/auth/components/email-password-login-form';
import { UnifiedHeader } from '@/components/v3/homepage/UnifiedHeader';

export default function Page() {
    return (
        <div className="min-h-svh bg-slate-50 dark:bg-slate-900 relative overflow-hidden">
            <UnifiedHeader showMobileMenu={false} enableScrollEffect={false} />

            <div className="relative w-full min-h-screen overflow-hidden">
                <div className="absolute inset-0 pointer-events-none z-0">
                    <div className="auth-background-shape auth-shape-1" />
                    <div className="auth-background-shape auth-shape-2" />
                    <div className="auth-background-shape auth-shape-3" />
                </div>

                <div className="relative z-10 flex min-h-screen items-center justify-center">
                    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Connexion
                            </h1>
                        </div>

                        <div className="animate-in fade-in duration-500 space-y-6">
                            <EmailPasswordLoginForm />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
