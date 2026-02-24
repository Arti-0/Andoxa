"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Balancer from "react-wrap-balancer";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function HeroSectionV3() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Images hébergées sur Supabase Storage (bucket assets)
  const SUPABASE_ASSETS = {
    light:
      "https://uggsuchjyysjpcyeqqgy.supabase.co/storage/v1/object/public/assets/light.png",
    dark: "https://uggsuchjyysjpcyeqqgy.supabase.co/storage/v1/object/public/assets/dark.png",
  } as const;

  const dashboardImage =
    mounted && (resolvedTheme === "dark" || theme === "dark")
      ? SUPABASE_ASSETS.dark
      : SUPABASE_ASSETS.light;
  return (
    <section className="relative min-h-screen flex items-center justify-center ">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-2 md:px-4 lg:px-8 py-12 sm:py-16 md:py-24 w-full min-h-screen flex flex-col items-center justify-start">
        {/* Main Heading - Centered at top */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-black dark:text-white mb-8 sm:mb-12 mt-12 sm:mt-16 md:mt-20 px-4"
        >
          <Balancer>
            Gérez vos{" "}
            <span className="relative inline-block font-serif italic">
              <span className="relative z-10">prospects</span>
              <motion.span
                className="absolute bottom-2 left-0 right-0 h-4 bg-orange-400/30"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
              />
            </span>{" "}
            comme une{" "}
            <span className="relative inline-block font-serif italic">
              <span className="relative z-10">équipe pro</span>
              <motion.span
                className="absolute bottom-2 left-0 right-0 h-4 bg-orange-400/30"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.8, ease: "easeOut" }}
              />
            </span>
          </Balancer>
        </motion.h1>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12 md:mb-16 w-full sm:w-auto px-4 sm:px-0"
        >
          <Button
            asChild
            size="lg"
            className="h-12 sm:h-14 px-6 sm:px-8 text-base font-semibold text-slate-800 dark:text-slate-100 btn-neumorphism glassmorphism w-full sm:w-auto rounded-full border-0"
          >
            <Link
              href="/auth/sign-up"
              className="flex items-center justify-center gap-2 relative z-10"
            >
              Essai gratuit 14 jours
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>

          <Button
            asChild
            size="lg"
            className="h-12 sm:h-14 px-6 sm:px-8 text-base font-semibold text-slate-700 dark:text-slate-200 btn-neumorphism glassmorphism w-full sm:w-auto rounded-full border-0"
          >
            <Link
              href="https://calendly.com/andoxa/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              Voir une démo
            </Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="relative w-full max-w-7xl mt-auto px-4 sm:px-0"
        >
          <div className="relative overflow-hidden rounded-t-2xl sm:rounded-t-3xl">
            {mounted ? (
              <Image
                key={dashboardImage}
                src={dashboardImage}
                alt="Dashboard Andoxa - Tableau de bord KPI moderne avec analytics en temps réel"
                width={1400}
                height={900}
                className="w-full h-full object-cover object-top"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1400px"
              />
            ) : (
              <div className="w-full h-[600px] bg-slate-200 dark:bg-slate-800 animate-pulse rounded-t-2xl sm:rounded-t-3xl" />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
