"use client";

import { OnboardingSchema } from "../onboarding/schema";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/app/onboarding/store";
import { useEffect } from "react";
import { preserveParamsInNavigation } from "@/lib/onboarding/utils/preserve-params";
import { useSearchParams } from "next/navigation";

const JeSchema = OnboardingSchema.pick({
  jeRole: true,
});
type JeSchema = z.infer<typeof JeSchema>;

export default function JeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fullName = useOnboardingStore((state) => state.fullName);
  const setData = useOnboardingStore((state) => state.setData);
  const hasHydrated = useOnboardingStore((state) => state._hasHydrated);

  const form = useForm<JeSchema>({
    resolver: zodResolver(JeSchema),
    defaultValues: {
      jeRole: "",
    },
  });

  const onSubmit = (data: JeSchema) => {
    // Prevent default form submission (which would add params to URL)
    setData(data);
    const nextUrl = preserveParamsInNavigation("/onboarding/optional", searchParams);
    router.push(nextUrl);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Explicitly prevent default form submission
    form.handleSubmit(onSubmit)(e);
  };

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    if (!fullName) {
      // Use window.location to avoid RSC payload issues
      window.location.href = "/onboarding/name";
    }
  }, [hasHydrated, fullName]); // Remove router from deps

  return (
    <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="jeRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Rôle dans la Junior-Entreprise
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ex: Président, Trésorier, Responsable Projet..."
                      {...field}
                      maxLength={100}
                      className="h-12 input-neumorphism"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold btn-neumorphism glassmorphism btn-gradient-border rounded-full border-0 text-slate-800 dark:text-slate-100"
              >
              Suivant
            </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}