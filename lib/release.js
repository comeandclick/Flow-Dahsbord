export const RELEASE = {
  version: "1.23.4",
  deployedAt: "2026-04-29T20:32:00+02:00",
  summary: "Le shell Flow unifie mieux sa matière visuelle et stabilise le module Shopify avec des routes Vercel propres, un état de config silencieux et le même écran dédié.",
  changes: [
    {
      id: "panel-material",
      status: "done",
      title: "Matière visuelle unifiée sur tous les blocs",
      subtitle: "Les cartes, panneaux et surfaces utilisent maintenant une même couche gradient / opacité / blur plus proche de la référence trafic sombre.",
    },
    {
      id: "shopify-module",
      status: "done",
      title: "Nouveau module Shopify isolé du reste",
      subtitle: "Ajout d’une entrée Shopify dans la navigation, d’un widget dashboard et d’un écran dédié avec KPIs, graphique, commandes récentes et top produits.",
    },
    {
      id: "shopify-api",
      status: "done",
      title: "Routes Shopify stabilisées pour Vercel",
      subtitle: "Le callback OAuth et le proxy Shopify passent maintenant par des handlers Next API sans conflit de route, avec état de configuration propre avant l’ajout du token.",
    },
  ],
};
