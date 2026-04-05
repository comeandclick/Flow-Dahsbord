export const RELEASE = {
  version: "1.22.45",
  deployedAt: "2026-04-05T13:38:00+02:00",
  summary: "Flow revient à une base claire avec un seul site principal, un dashboard admin amélioré et un périmètre produit nettoyé.",
  changes: [
    {
      id: "single-surface",
      status: "done",
      title: "Suppression des routes parallèles",
      subtitle: "Le dépôt et la production ne gardent plus que le Flow principal et le dashboard admin, sans routes annexes `aurora` ou `atelier`.",
    },
    {
      id: "admin-ux",
      status: "done",
      title: "Expérience admin rendue plus robuste",
      subtitle: "Le login admin valide mieux les entrées, la section utilisateurs gagne un reset de filtres et les actions rapides sont plus sûres à utiliser.",
    },
    {
      id: "docs-cleanup",
      status: "done",
      title: "Documentation resynchronisée avec le périmètre réel",
      subtitle: "Le journal de version et les documents de reprise reflètent maintenant un seul produit Flow public et son admin associé.",
    },
  ],
};
