"use client";

import { signInWithLinkedIn } from '@/lib/auth/linkedin-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { IconBrandLinkedin } from '@tabler/icons-react';
import { useState } from 'react';
import { logger } from '@/lib/utils/logger';

export function LinkedInLoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkedInLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await signInWithLinkedIn();
      // User will be redirected to LinkedIn, so we don't need to handle success here
    } catch (error: unknown) {
      logger.error('LinkedIn login error:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Une erreur est survenue lors de la connexion avec LinkedIn'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
        <CardContent className="p-12">
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
                Connectez-vous avec LinkedIn
              </h2>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            <Button
              onClick={handleLinkedInLogin}
              className="w-full h-12 text-base font-semibold btn-neumorphism glassmorphism btn-gradient-border rounded-full border-0 text-slate-800 dark:text-slate-100"
              disabled={isLoading}
              size="lg"
            >
              <IconBrandLinkedin className="mr-2 h-5 w-5" />
              {isLoading ? 'Connexion en cours...' : 'Continuer avec LinkedIn'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

