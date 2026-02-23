"use client";

import { OnboardingSchema } from "../onboarding/schema";
import { z } from 'zod';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/app/onboarding/store";
import { createClient } from "@/lib/supabase/client";
import { preserveParamsInNavigation } from "@/lib/onboarding/utils/preserve-params";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { logger } from "@/lib/utils/logger";

const PasswordSchema = z.object({
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  confirmPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});
type PasswordSchema = z.infer<typeof PasswordSchema>;

export default function PasswordForm() {
  const router = useRouter();
  const setData = useOnboardingStore((state) => state.setData);
  const searchParams = useSearchParams();

  // Initialize sessionStorage from URL params on mount (only once)
  useEffect(() => {
    const plan = searchParams.get("plan");
    const frequency = searchParams.get("frequency");

    if (plan && frequency) {
      // Only set if not already set to avoid unnecessary updates
      const existingPlan = sessionStorage.getItem("selectedPlan");
      const existingFrequency = sessionStorage.getItem("selectedFrequency");
      
      if (existingPlan !== plan || existingFrequency !== frequency) {
      sessionStorage.setItem("selectedPlan", plan);
      sessionStorage.setItem("selectedFrequency", frequency);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const form = useForm<PasswordSchema>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: PasswordSchema) => {
    // Validation is already done by the schema refine
    // Store password data (though it won't be in OnboardingSchema, it's handled separately)
    setData(data as any);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (error) {
      form.setError("confirmPassword", {
        message: error.message,
      });
      return;
    }
    const nextUrl = preserveParamsInNavigation(
      "/onboarding/name",
      searchParams
    );
    router.push(nextUrl);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Explicitly prevent default form submission
    await form.handleSubmit(onSubmit)(e);
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      onChange={(e) => {
                        console.log(
                          "[PasswordForm] password input changed:",
                          e.target.value
                        );
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormDescription>Au moins 8 caractères.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirme le mot de passe</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      onChange={(e) => {
                        console.log(
                          "[PasswordForm] confirmPassword input changed:",
                          e.target.value
                        );
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-11 text-base font-medium">
              Suivant
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}