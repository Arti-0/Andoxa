"use client";

import { useState, useEffect } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UpgradeButton } from '@/components/ui/UpgradeButton';
// import Link from 'next/link'; // Removed unused import

interface TrialBannerProps {
  trialDaysLeft?: number;
  isVisible?: boolean;
  onDismiss?: () => void;
}

export function TrialBanner({ trialDaysLeft = 0, isVisible = true, onDismiss }: TrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà fermé la bannière
    const dismissed = localStorage.getItem('trial-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Vérifier si le trial est expiré
    if (trialDaysLeft <= 0) {
      setIsExpired(true);
    }
  }, [trialDaysLeft]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('trial-banner-dismissed', 'true');
    onDismiss?.();
  };

  const handleUpgrade = () => {
    // Rediriger vers la page pricing
    window.location.href = '/pricing';
  };

  // Ne pas afficher si fermée ou si pas visible
  if (!isVisible || isDismissed) {
    return null;
  }

  // Si expiré, rediriger vers pricing
  if (isExpired) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Votre essai gratuit a expiré
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Choisissez un plan pour continuer à utiliser Andoxa.
              </p>
            </div>
          </div>
          <Button
            onClick={handleUpgrade}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Choisir un plan
          </Button>
        </div>
      </div>
    );
  }

  // Bannière normale pour trial actif
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="h-5 w-5 text-blue-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Essai gratuit en cours
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""} restant
              {trialDaysLeft > 1 ? "s" : ""} dans votre essai gratuit
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <UpgradeButton
            currentPlan="trial"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Passer à Essential
          </UpgradeButton>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
