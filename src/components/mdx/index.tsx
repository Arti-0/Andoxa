"use client";

import type { ComponentProps } from "react";
import Link from "next/link";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function H1(props: ComponentProps<"h1">) {
  return (
    <h1
      className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl"
      {...props}
    />
  );
}

export function H2(props: ComponentProps<"h2">) {
  return (
    <h2
      className="scroll-m-20 text-2xl font-semibold tracking-tight"
      {...props}
    />
  );
}

export function H3(props: ComponentProps<"h3">) {
  return (
    <h3
      className="scroll-m-20 text-xl font-semibold tracking-tight"
      {...props}
    />
  );
}

export function P(props: ComponentProps<"p">) {
  return <p className="leading-7 [&:not(:first-child)]:mt-4" {...props} />;
}

export function Ul(props: ComponentProps<"ul">) {
  return (
    <ul
      className="my-4 ml-6 list-disc [&>li]:mt-2"
      {...props}
    />
  );
}

export function Bold(props: ComponentProps<"strong">) {
  return <strong className="font-semibold" {...props} />;
}

export function CustomLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      className="font-medium text-primary underline underline-offset-4 hover:no-underline"
      {...props}
    />
  );
}

export function ChangelogEntry(props: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 text-card-foreground shadow-sm",
        props.className
      )}
      {...props}
    />
  );
}

export function ChangelogImage(props: ComponentProps<"img">) {
  return (
    <img
      className="rounded-lg border object-cover"
      {...props}
    />
  );
}
