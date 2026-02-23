"use client";

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const recipientId = searchParams.get("recipient");
  const campaignId = searchParams.get("campaign");

  const [loading, setLoading] = useState(false);
  const [unsubscribed, setUnsubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnsubscribe = async () => {
    if (!recipientId || !campaignId) {
      setError("Lien invalide");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipientId, campaignId }),
      });

      if (!response.ok) {
        throw new Error("Échec de la désinscription");
      }

      setUnsubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  if (unsubscribed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Désinscription confirmée</CardTitle>
            <CardDescription>
              Vous ne recevrez plus d&apos;emails de notre part.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>
              Si vous avez des questions, contactez-nous à{" "}
              <a
                href="mailto:support@andoxa.fr"
                className="text-primary hover:underline"
              >
                support@andoxa.fr
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>Se désabonner des emails</CardTitle>
          <CardDescription>
            Êtes-vous sûr de vouloir vous désabonner de nos emails ?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="w-full"
              variant="destructive"
            >
              {loading ? "En cours..." : "Confirmer la désinscription"}
            </Button>

            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full"
            >
              Annuler
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Vous ne recevrez plus d&apos;emails marketing de notre part. Les
            emails transactionnels (confirmations, etc.) peuvent toujours être
            envoyés.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Chargement...
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}

