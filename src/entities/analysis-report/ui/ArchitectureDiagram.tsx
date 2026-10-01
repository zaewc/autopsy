"use client";
import { useState } from "react";
import { Globe, Network, Layers, GitBranch, ArrowRight } from "lucide-react";
import "./architecture.css";
const NODES = [
  {
    name: "Browser",
    label: "Client",
    icon: Globe,
    evidence:
      "Observed in this sample: document, script, stylesheet, image, and font requests originate in the browser.",
  },
  {
    name: "Cloudflare",
    label: "Edge / CDN",
    icon: Network,
    evidence:
      "Observed in this sample: a cf-ray response header indicates Cloudflare handled the public response.",
  },
  {
    name: "Next.js",
    label: "Application",
    icon: Layers,
    evidence:
      "Observed in this sample: /_next/static resource paths identify the public application framework. Its private hosting topology is unknown.",
  },
  {
    name: "External API",
    label: "Inferred",
    icon: GitBranch,
    evidence:
      "Inferred only: client integration signals suggest an external service. Its server, database, and internal topology cannot be determined from this sample.",
  },
] as const;
export function ArchitectureDiagram() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <div className="architecture">
        <div className="architecture-line" />
        {NODES.map(({ name, label, icon: Icon }, index) => (
          <button
            className={`node ${index === 3 ? "inferred" : ""}`}
            aria-pressed={selected === index}
            key={name}
            onClick={() => setSelected(selected === index ? null : index)}
          >
            <span className="node-icon">
              <Icon size={19} />
            </span>
            <strong>{name}</strong>
            <small>{label}</small>
            {index < NODES.length - 1 && (
              <ArrowRight className="node-arrow" size={14} />
            )}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className="architecture-evidence" role="status">
          {NODES[selected].evidence}
        </p>
      )}
    </>
  );
}
