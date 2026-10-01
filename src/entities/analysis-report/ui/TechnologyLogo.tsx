"use client";
import { useEffect, useState } from "react";
import type { SimpleIcon } from "simple-icons";
import "./technologyLogo.css";

type Icons = Readonly<Record<string, SimpleIcon>>;
let loading: Promise<Icons> | null = null;
/** The marks load on first use so they stay out of the initial bundle. */
function loadIcons() {
  loading ??= import("./technologyIcons").then(
    (module) => module.TECHNOLOGY_ICONS,
  );
  return loading;
}

/** Decorative single-color mark; the technology name stays the label. */
export function TechnologyLogo({ name }: { name: string }) {
  const [icons, setIcons] = useState<Icons | null>(null);
  useEffect(() => {
    let active = true;
    void loadIcons().then((loaded) => active && setIcons(loaded));
    return () => {
      active = false;
    };
  }, []);
  const icon = icons?.[name];
  if (!icon) return <span className="technology-logo" aria-hidden="true" />;
  return (
    <svg
      className="technology-logo"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-logo={name}
    >
      <path d={icon.path} />
    </svg>
  );
}
