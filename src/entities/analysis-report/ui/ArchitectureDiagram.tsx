"use client";
import { useState } from "react";
import {
  Globe,
  Network,
  Layers,
  GitBranch,
  ArrowRight,
  Server,
  Cloud,
} from "lucide-react";
import type {
  ArchitectureNode,
  ArchitectureRole,
} from "../lib/architectureNodes";
import "./architecture.css";
const ICONS: Readonly<Record<ArchitectureRole, typeof Globe>> = {
  client: Globe,
  edge: Network,
  hosting: Cloud,
  server: Server,
  application: Layers,
  unknown: GitBranch,
};
export function ArchitectureDiagram({
  nodes,
}: {
  nodes: readonly ArchitectureNode[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <>
      <div className="architecture">
        <div className="architecture-line" />
        {nodes.map(({ name, label, role, basis }, index) => {
          const Icon = ICONS[role];
          return (
            <button
              className={`node ${basis === "Observed" ? "" : "inferred"}`}
              aria-pressed={selected === index}
              key={`${role}-${name}`}
              onClick={() => setSelected(selected === index ? null : index)}
            >
              <span className="node-icon">
                <Icon size={19} />
              </span>
              <strong title={name}>{name}</strong>
              <small>{label}</small>
              {index < nodes.length - 1 && (
                <ArrowRight className="node-arrow" size={14} />
              )}
            </button>
          );
        })}
      </div>
      {selected !== null && nodes[selected] && (
        <p className="architecture-evidence" role="status">
          {nodes[selected].evidence}
        </p>
      )}
    </>
  );
}
