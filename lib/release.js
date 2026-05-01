export const RELEASE = {
  version: "1.25.2",
  deployedAt: "2026-05-02T12:24:00+02:00",
  summary: "Flow débloque les comptes utilisateurs existants et sépare enfin le blocage Flow du blocage admin, pour qu’un compte admin garde son accès même si son compte Flow est bloqué.",
  changes: [
    {
      id: "glassmorphism-refonte",
      status: "done",
      title: "Refonte glassmorphism complète",
      subtitle: "Tous les éléments du site adoptent maintenant le design glassmorphism : sidebar, dashboard, boutons, inputs, cartes, panneaux et topbar dans une cohérence visuelle totale.",
    },
    {
      id: "new-color-palette",
      status: "done",
      title: "Nouvelle palette de couleurs",
      subtitle: "Remplacement complet de l'ancienne palette par le système sombre premium avec surfaces homogènes, coins arrondis et meilleure tenue du thème clair.",
    },
    {
      id: "effects-unification",
      status: "done",
      title: "Unification des effets visuels",
      subtitle: "Backdrop-filter, shadows, glow et animations sont appliqués uniformément, avec un halo immersif lissé pour éviter les traits et le rendu pixelisé.",
    },
    {
      id: "responsive-glass",
      status: "done",
      title: "Design responsive glassmorphism",
      subtitle: "La DA reste cohérente sur mobile, tablette et desktop, avec sidebar, blocs et Shopify ajustés pour mieux tenir dans le viewport.",
    },
    {
      id: "no-legacy-colors",
      status: "done",
      title: "Shopify simplifié",
      subtitle: "La connexion Shopify se fait maintenant en deux champs séparés et le module guide l’utilisateur pour récupérer son domaine et son token Admin API.",
    },
    {
      id: "flow-admin-separation",
      status: "done",
      title: "Blocage Flow séparé de l’admin",
      subtitle: "Bloquer un compte Flow n’empêche plus la connexion admin du même compte, et les comptes existants ont été débloqués côté Flow.",
    },
  ],
};
