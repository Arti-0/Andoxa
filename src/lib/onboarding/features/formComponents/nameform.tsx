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
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/app/onboarding/store";
import { Card, CardContent } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const NameSchema = OnboardingSchema.pick({
  fullName: true,
});
type NameSchema = z.infer<typeof NameSchema>;

export default function NameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setData = useOnboardingStore((state) => state.setData);

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

  const form = useForm<NameSchema>({
    resolver: zodResolver(NameSchema),
    defaultValues: {
      fullName: "",
    },
  });

  const onSubmit = (data: NameSchema) => {
    // Save data to store (persisted in Zustand) - no URL params needed
    setData(data);
    // Navigate without URL params - data is persisted in store
    router.push("/onboarding/je");
  };

  return (
    <Card className="backdrop-blur-xl bg-white/10 dark:bg-black/20 border-white/20 dark:border-white/10 shadow-xl rounded-2xl">
      <CardContent className="p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nom complet
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Prénom Nom"
                      className="h-12 input-neumorphism"
                      {...field}
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
