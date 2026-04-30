export const RELEASE = {
  version: "1.23.8",
  deployedAt: "2026-04-30T00:58:00+02:00",
  summary: "Flow protège maintenant la continuité des comptes en refusant toute bascule silencieuse vers un store vide, tout en gardant Shopify cohérent sur les commandes annulées.",
  changes: [
    {
      id: "store-continuity",
      status: "done",
      title: "Continuité des comptes verrouillée",
      subtitle: "En production, Flow ne recrée plus jamais un store vide sur erreur distante et renvoie une erreur claire si le stockage comptes est indisponible.",
    },
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
  ],
};
