export const RELEASE = {
  version: "1.23.7",
  deployedAt: "2026-04-30T00:24:00+02:00",
  summary: "Flow exclut maintenant les commandes Shopify annulées de tous les calculs utiles, tout en gardant le shell bloqué dans le viewport et le dashboard plus dense.",
  changes: [
    {
      id: "shopify-cancelled",
      status: "done",
      title: "Commandes annulées neutralisées",
      subtitle: "Les commandes Shopify annulées ne comptent plus dans le CA, le non fulfillé, le top produits du mois ni le widget Shopify du dashboard.",
    },
    {
      id: "shell-lock",
      status: "done",
      title: "Shell verrouillé et couches nettoyées",
      subtitle: "La page principale ne scrolle plus, les popups restent au premier plan et la sidebar fermée desktop n'affiche plus que la photo ou l'initiale.",
    },
    {
      id: "shopify-periods",
      status: "done",
      title: "Shopify piloté par période",
      subtitle: "Les filtres Aujourd'hui, Hier, 7 jours, 1 mois, 1 an et Depuis toujours pilotent maintenant le widget dashboard, les KPI, le graphique et les dernières commandes.",
    },
  ],
};
