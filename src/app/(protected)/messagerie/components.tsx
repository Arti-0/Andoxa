"use client";

import { useState } from "react";
import { initials, hue, STAGES, type Stage } from "./data";

export function Avatar({
  name,
  size = 36,
  pictureUrl,
}: {
  name: string;
  size?: number;
  pictureUrl?: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const h = hue(name);

  if (pictureUrl && !imgFailed) {
    return (
      <img
        src={pictureUrl}
        alt={name}
        onError={() => setImgFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, hsl(${h}, 42%, 58%), hsl(${(h + 30) % 360}, 42%, 48%))`,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

export function StagePill({ stage }: { stage: Stage }) {
  const s = STAGES[stage];
  return (
    <span
      className="m2-pill"
      style={{
        background: `color-mix(in srgb, ${s.dot} 16%, var(--m2-surface-elevated))`,
        color: s.dot,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: 5,
          background: s.dot,
          display: "inline-block",
        }}
      />
      {s.label}
    </span>
  );
}

export function ChannelMark({
  channel,
  size = 14,
}: {
  channel: "li" | "wa";
  size?: number;
}) {
  return (
    <span
      className={`m2-channel-mark ${channel === "li" ? "m2-ch-li" : "m2-ch-wa"}`}
      title={channel === "li" ? "LinkedIn" : "WhatsApp"}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
    >
      {channel === "li" ? "in" : "wa"}
    </span>
  );
}
