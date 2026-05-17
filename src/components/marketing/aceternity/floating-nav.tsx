"use client";

import * as React from "react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/marketing/ui/button";
import { ThemeToggle } from "@/components/marketing/ui/theme-toggle";
import { AndoxaWordmark } from "@/components/marketing/icons/brand-icons";
import { cn } from "@/lib/utils";

export type NavItem = {
  name: string;
  href: string;
  children?: { name: string; href: string; description?: string }[];
};

/** Sticky nav that hides on scroll-down, reveals on scroll-up. */
export function FloatingNav({
  navItems,
  homeHref = "/",
  className,
}: {
  navItems: NavItem[];
  homeHref?: string;
  className?: string;
}) {
  const { scrollY } = useScroll();
  const [visible, setVisible] = React.useState(true);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const lastY = React.useRef(0);

  useMotionValueEvent(scrollY, "change", (current) => {
    const diff = current - lastY.current;
    if (current < 80) setVisible(true);
    else if (diff > 6) setVisible(false);
    else if (diff < -6) setVisible(true);
    lastY.current = current;
  });

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 1, y: -120 }}
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : -120 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "fixed inset-x-0 top-6 z-50 mx-auto flex w-fit max-w-[min(96%,_1100px)] items-center gap-3 rounded-full border border-[var(--border)] bg-background/95 px-3 py-2 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.10)] backdrop-blur-lg",
            className,
          )}
        >
          <Link
            href={homeHref}
            aria-label="Andoxa"
            className="flex shrink-0 items-center pl-1.5 pr-2"
          >
            <AndoxaWordmark height={20} />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <NavDropdown key={item.name} item={item} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.name}
                </Link>
              ),
            )}
          </nav>

          <div className="ml-1 flex items-center gap-1.5 md:ml-2">
            <ThemeToggle />
            <Button
              href="/auth/login"
              variant="ghost"
              size="md"
              className="hidden rounded-full px-4 sm:inline-flex"
            >
              Se connecter
            </Button>
            <Button href="/pricing" size="md" className="rounded-full px-4">
              Commencer
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-foreground transition-colors hover:bg-[var(--neutral-100)] md:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <MobileMenuSheet
        navItems={navItems}
        homeHref={homeHref}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}

function MobileMenuSheet({
  navItems,
  homeHref,
  open,
  onClose,
}: {
  navItems: NavItem[];
  homeHref: string;
  open: boolean;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) onClose();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] md:hidden"
        >
          <div
            onClick={onClose}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            initial={reduce ? false : { y: -16, opacity: 0 }}
            animate={reduce ? undefined : { y: 0, opacity: 1 }}
            exit={reduce ? undefined : { y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            role="dialog"
            aria-modal="true"
            className="absolute inset-x-3 top-3 max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl border border-[var(--border)] bg-card shadow-[0_20px_60px_-12px_rgba(0,0,0,0.28)]"
          >
            <div className="flex items-center justify-between p-4">
              <Link href={homeHref} onClick={onClose} aria-label="Andoxa" className="flex items-center">
                <AndoxaWordmark height={20} />
              </Link>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le menu"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[var(--border)] text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="h-px bg-[var(--border)]" />

            <nav className="p-2">
              {navItems.map((item) =>
                item.children && item.children.length > 0 ? (
                  <MobileNavGroup key={item.name} item={item} onSelect={onClose} />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className="block rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-[var(--neutral-50)]"
                  >
                    {item.name}
                  </Link>
                ),
              )}
            </nav>

            <div className="h-px bg-[var(--border)]" />

            <div className="grid grid-cols-2 gap-2 p-4">
              <Button
                href="/auth/login"
                variant="ghost"
                size="md"
                className="w-full justify-center rounded-full"
                onClick={onClose}
              >
                Se connecter
              </Button>
              <Button
                href="/pricing"
                size="md"
                className="w-full justify-center rounded-full"
                onClick={onClose}
              >
                Commencer
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MobileNavGroup({ item, onSelect }: { item: NavItem; onSelect: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-foreground transition-colors hover:bg-[var(--neutral-50)]"
      >
        {item.name}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="opacity-70"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <ul className="my-1 ml-3 space-y-0.5 border-l border-[var(--border)] pl-2">
              {item.children!.map((child) => (
                <li key={child.href}>
                  <Link
                    href={child.href}
                    onClick={onSelect}
                    className="block rounded-md px-3 py-2.5"
                  >
                    <span className="block text-[0.95rem] font-medium text-foreground">
                      {child.name}
                    </span>
                    {child.description && (
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {child.description}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "relative inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors",
          open ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {item.name}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="opacity-70"
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className="absolute left-1/2 top-[calc(100%+12px)] z-50 w-72 -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--border)] bg-card p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.22),_0_8px_18px_-8px_rgba(0,82,217,0.12)]"
          >
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="group flex flex-col gap-0.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--neutral-50)]/80"
              >
                <span className="text-sm font-medium text-foreground transition-colors group-hover:text-[var(--brand-blue)]">
                  {child.name}
                </span>
                {child.description && (
                  <span className="text-xs leading-5 text-muted-foreground">
                    {child.description}
                  </span>
                )}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
