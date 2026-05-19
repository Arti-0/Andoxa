import * as React from "react";
import Image from "next/image";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };
type LogoIconProps = { size?: number; className?: string };

// Real brand assets shipped in /public/assets/logofiles (used by the previous
// homepage). `logo_mark 1.svg` is the square mark; `logo_1/3.svg` are the
// light/dark wordmarks. The space in the mark filename is URL-encoded.
const MARK_SRC = "/assets/logofiles/logo_mark%201.svg";
const WORDMARK_LIGHT = "/assets/logofiles/logo_1.svg";
const WORDMARK_DARK = "/assets/logofiles/logo_3.svg";

/**
 * Andoxa square mark. Same `size` + `className` API as the lucide icons so it
 * drops into icon slots. Renders the real brand asset.
 */
export function AndoxaLogoIcon({ size = 16, className }: LogoIconProps) {
  return (
    <Image
      src={MARK_SRC}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, display: "block", objectFit: "contain" }}
    />
  );
}

/**
 * Andoxa wordmark — light/dark variants swapped via Tailwind `dark:`. Use in
 * the nav and footer. `height` sizes it; width auto-scales (~5.6:1).
 */
export function AndoxaWordmark({
  height = 26,
  className,
}: {
  height?: number;
  className?: string;
}) {
  const width = Math.round(height * 5.64);
  return (
    <span className={className} style={{ display: "inline-flex", height }}>
      <Image
        src={WORDMARK_LIGHT}
        alt="Andoxa"
        width={width}
        height={height}
        priority
        className="block h-full w-auto dark:hidden"
        style={{ width: "auto", height: "auto" }}
      />
      <Image
        src={WORDMARK_DARK}
        alt="Andoxa"
        width={width}
        height={height}
        priority
        className="hidden h-full w-auto dark:block"
        style={{ width: "auto", height: "auto" }}
      />
    </span>
  );
}

export function LinkedinIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

export function WhatsappIcon({ size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}
