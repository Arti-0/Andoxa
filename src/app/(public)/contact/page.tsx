"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Heart,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import AndoxaHeader from "@/components/content/AndoxaHeader";
import AndoxaFooter from "@/components/content/AndoxaFooter";
import { useState } from "react";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

interface FormStatus {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });

  const [status, setStatus] = useState<FormStatus>({ type: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "loading" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message:
            "Merci pour votre retour ! Votre expérience nous aide à améliorer Andoxa.",
        });
        setFormData({ firstName: "", lastName: "", email: "", message: "" });
      } else {
        setStatus({
          type: "error",
          message: result.error || "Erreur lors de l'envoi du message",
        });
      }
    } catch {
      setStatus({
        type: "error",
        message: "Erreur de connexion. Veuillez réessayer.",
      });
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className="min-h-screen bg-white dark:bg-slate-900">
      <AndoxaHeader />
      <div className="container mx-auto px-4 md:px-6 py-16 2xl:max-w-[1400px]">
        {/* Title */}
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl text-slate-900 dark:text-white">
            Partagez votre expérience
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-3">
            Votre avis compte ! Partagez votre expérience, bonne ou mauvaise,
            pour nous aider à améliorer Andoxa.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          <Card className="p-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <CardContent className="p-8 md:p-12">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
                  Votre feedback nous aide à progresser
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Que vous ayez adoré une fonctionnalité ou rencontré un
                  problème, votre retour est précieux pour faire évoluer
                  Andoxa.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Status Message */}
                {status.type !== "idle" && (
                  <div
                    className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                      status.type === "success"
                        ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                        : status.type === "error"
                        ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                        : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    {status.type === "success" && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    )}
                    {status.type === "error" && (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    {status.type === "loading" && (
                      <div className="h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                    )}
                    <p
                      className={`text-sm ${
                        status.type === "success"
                          ? "text-green-700 dark:text-green-300"
                          : status.type === "error"
                          ? "text-red-700 dark:text-red-300"
                          : "text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {status.type === "loading"
                        ? "Envoi en cours..."
                        : status.message}
                    </p>
                  </div>
                )}

                <div className="grid gap-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="firstname"
                        className="mb-2 text-slate-700 dark:text-slate-300"
                      >
                        Prénom
                      </Label>
                      <Input
                        type="text"
                        id="firstname"
                        placeholder="Votre prénom"
                        value={formData.firstName}
                        onChange={(e) =>
                          handleInputChange("firstName", e.target.value)
                        }
                        required
                        className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="lastname"
                        className="mb-2 text-slate-700 dark:text-slate-300"
                      >
                        Nom
                      </Label>
                      <Input
                        type="text"
                        id="lastname"
                        placeholder="Votre nom"
                        value={formData.lastName}
                        onChange={(e) =>
                          handleInputChange("lastName", e.target.value)
                        }
                        required
                        className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <Label
                      htmlFor="email"
                      className="mb-2 text-slate-700 dark:text-slate-300"
                    >
                      Email
                    </Label>
                    <Input
                      type="email"
                      id="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        handleInputChange("email", e.target.value)
                      }
                      required
                      className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="message"
                      className="mb-2 text-slate-700 dark:text-slate-300"
                    >
                      Votre expérience
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Décrivez votre expérience avec Andoxa... Qu'avez-vous aimé ? Qu'est-ce qui pourrait être amélioré ?"
                      rows={6}
                      value={formData.message}
                      onChange={(e) =>
                        handleInputChange("message", e.target.value)
                      }
                      required
                      className="mt-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Partagez tout ce qui vous passe par la tête, positif ou
                      négatif. Chaque détail compte !
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-primary hover:bg-primary/90"
                    disabled={status.type === "loading"}
                  >
                    {status.type === "loading" ? (
                      "Envoi en cours..."
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Envoyer mon feedback
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <Link
            href="https://calendly.com/andoxa/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="group hover:bg-slate-50 dark:hover:bg-slate-800 flex h-full flex-col rounded-lg p-4 text-center sm:p-6 transition-colors"
          >
            <MessageSquare className="text-slate-600 dark:text-slate-400 mx-auto size-9" />
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Discutons ensemble
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Planifiez un appel pour partager vos idées et suggestions en
                direct.
              </p>
              <p className="text-blue-600 dark:text-blue-400 mt-5 inline-flex items-center gap-x-1 font-medium">
                Planifier un appel
                <svg
                  className="size-4 transition ease-in-out group-hover:translate-x-1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </p>
            </div>
          </Link>

          <Link
            href={"/help"}
            className="group hover:bg-slate-50 dark:hover:bg-slate-800 flex h-full flex-col rounded-lg p-4 text-center sm:p-6 transition-colors"
          >
            <MessageSquare className="text-slate-600 dark:text-slate-400 mx-auto size-9" />
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Centre d&apos;aide
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Consultez notre documentation et nos guides pour utiliser
                Andoxa au mieux.
              </p>
              <p className="text-blue-600 dark:text-blue-400 mt-5 inline-flex items-center gap-x-1 font-medium">
                Accéder à l&apos;aide
                <svg
                  className="size-4 transition ease-in-out group-hover:translate-x-1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </p>
            </div>
          </Link>

          <Link
            href={"/changelog"}
            className="group hover:bg-slate-50 dark:hover:bg-slate-800 flex h-full flex-col rounded-lg p-4 text-center sm:p-6 transition-colors"
          >
            <Sparkles className="text-slate-600 dark:text-slate-400 mx-auto size-9" />
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Dernières nouveautés
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Découvrez les dernières améliorations apportées à Andoxa grâce
                à vos retours.
              </p>
              <p className="text-blue-600 dark:text-blue-400 mt-5 inline-flex items-center gap-x-1 font-medium">
                Voir le changelog
                <svg
                  className="size-4 transition ease-in-out group-hover:translate-x-1"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </p>
            </div>
          </Link>
        </div>
      </div>
      <AndoxaFooter />
    </main>
  );
}
