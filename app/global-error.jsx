"use client";

import { useEffect } from "react";
import { RELEASE } from "../lib/release";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[FlowGlobalError]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e0e",
          color: "#edebe6",
          padding: 20,
          fontFamily: "'Geist',system-ui,sans-serif",
        }}
        >
          <div style={{
            width: "min(520px,100%)",
            borderRadius: 24,
            border: "1px solid rgba(200,169,110,.22)",
            background: "linear-gradient(180deg,rgba(255,255,255,.03),transparent 24%),#161616",
            boxShadow: "0 24px 70px rgba(0,0,0,.38)",
            padding: 24,
          }}
          >
            <div style={{ color: "#c8a96e", fontSize: 12, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
              Recuperation Flow
            </div>
            <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>Une erreur globale a ete capturee.</h1>
            <p style={{ margin: "0 0 14px", color: "#a6a29a", lineHeight: 1.6 }}>
              Même dans ce cas, Flow montre maintenant un ecran de recuperation propre plutot qu'une page brute.
            </p>
            <div style={{
              borderRadius: 16,
              background: "rgba(255,255,255,.03)",
              border: "1px solid rgba(255,255,255,.06)",
              padding: 14,
              marginBottom: 14,
              fontSize: 13,
              color: "#d7d2c7",
              wordBreak: "break-word",
            }}
            >
              {error?.message || "Erreur globale capturee"}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "#c8a96e",
                  color: "#161411",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reessayer
              </button>
              <div style={{ color: "#8f897f", fontSize: 12 }}>
                Version {`v${RELEASE.version}`}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

