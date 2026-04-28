"use client";

import { useEffect, useState } from "react";

export default function DevOverlays() {
  if (process.env.NODE_ENV !== "development") return null;

  const [Agentation, setAgentation] = useState(null);

  useEffect(() => {
    let active = true;

    import("agentation")
      .then((mod) => {
        if (active) {
          setAgentation(() => mod.Agentation || null);
        }
      })
      .catch(() => {
        if (active) {
          setAgentation(() => null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (!Agentation) return null;

  return (
    <Agentation
      className="flow-agentation"
      onCopy={(markdown) => {
        console.info("Agentation copied prompt", markdown);
      }}
      onSubmit={(markdown) => {
        console.info("Agentation submitted prompt", markdown);
      }}
    />
  );
}
