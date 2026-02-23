/**
 * API Error Handler - Gestion centralisée des erreurs API
 */

import { NextResponse } from 'next/server';
import { errorLogger } from './error-logger';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: Record<string, unknown>;
}

export class ApiErrorHandler {
  static createError(message: string, status: number, code?: string, details?: Record<string, unknown>): ApiError {
    return { message, status, code, details };
  }

  static handle(error: unknown, context?: { endpoint?: string; userId?: string }): NextResponse {
    // Log l'erreur
    errorLogger.error('API Error occurred', error instanceof Error ? error : new Error(String(error)), {
      action: 'api_request',
      metadata: context,
    });

    // Erreur de validation Zod
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: string[]; message: string }> };
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Les données fournies ne sont pas valides',
          details: zodError.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    // Erreur personnalisée API
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as ApiError;
      return NextResponse.json(
        {
          error: apiError.message,
          code: apiError.code,
          details: apiError.details,
        },
        { status: apiError.status }
      );
    }

    // Erreur Supabase
    if (error && typeof error === 'object' && 'message' in error && 'code' in error) {
      const supabaseError = error as { message: string; code: string };

      // Mapper les codes d'erreur Supabase vers des messages utilisateur
      const userMessage = this.mapSupabaseError(supabaseError.code, supabaseError.message);

      return NextResponse.json(
        {
          error: userMessage,
          code: supabaseError.code,
        },
        { status: 400 }
      );
    }

    // Erreur Stripe
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as { type: string; message: string };

      errorLogger.stripeError('API call', stripeError.message, context);

      return NextResponse.json(
        {
          error: 'Erreur de paiement',
          message: 'Une erreur est survenue lors du traitement du paiement',
          code: stripeError.type,
        },
        { status: 400 }
      );
    }

    // Erreur générique
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite';

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development'
          ? errorMessage
          : 'Une erreur interne s\'est produite. Veuillez réessayer plus tard.',
      },
      { status: 500 }
    );
  }

  private static mapSupabaseError(code: string, message: string): string {
    const errorMap: Record<string, string> = {
      '23505': 'Cette donnée existe déjà',
      '23503': 'Impossible de supprimer cette donnée car elle est utilisée ailleurs',
      '23502': 'Champ obligatoire manquant',
      '42501': 'Vous n\'avez pas les permissions nécessaires',
      '42P01': 'Table ou vue introuvable',
      'PGRST116': 'Aucune ligne trouvée',
      'PGRST301': 'Erreur de syntaxe dans la requête',
    };

    return errorMap[code] || message || 'Une erreur de base de données s\'est produite';
  }

  // Méthodes utilitaires pour des erreurs spécifiques
  static notFound(message = 'Ressource non trouvée'): NextResponse {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  static unauthorized(message = 'Non autorisé'): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  static forbidden(message = 'Accès interdit'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  static badRequest(message = 'Requête invalide', details?: Record<string, unknown>): NextResponse {
    return NextResponse.json({ error: message, details }, { status: 400 });
  }

  static conflict(message = 'Conflit de données'): NextResponse {
    return NextResponse.json({ error: message }, { status: 409 });
  }

  static tooManyRequests(message = 'Trop de requêtes'): NextResponse {
    return NextResponse.json({ error: message }, { status: 429 });
  }
}

// Fonction utilitaire pour wrapper les handlers API
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return ApiErrorHandler.handle(error);
    }
  };
}
