"use client";

import { Agentation } from "agentation";

export default function DevOverlays() {
  if (process.env.NODE_ENV !== "development") return null;

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
