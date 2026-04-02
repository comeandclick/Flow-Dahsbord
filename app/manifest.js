export default function manifest() {
  return {
    id: "/",
    name: "Flow",
    short_name: "Flow",
    description: "Flow workspace en ligne",
    lang: "fr-FR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait",
    background_color: "#0e0e0e",
    theme_color: "#111111",
    categories: ["productivity", "utilities", "business"],
    icons: [
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
