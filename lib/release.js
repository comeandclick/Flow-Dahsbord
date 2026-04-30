export const RELEASE = {
  version: "1.23.6",
  deployedAt: "2026-04-30T00:14:00+02:00",
  summary: "Le shell Flow bloque désormais la page dans le viewport, densifie le dashboard utilisateur, assombrit le thème clair et donne à Shopify des filtres période plus propres.",
  changes: [
    {
      id: "shell-lock",
      status: "done",
      title: "Shell verrouillé et couches nettoyées",
      subtitle: "La page principale ne scrolle plus, les popups restent au premier plan et la sidebar fermée desktop n'affiche plus que la photo ou l'initiale.",
    },
    {
      id: "dashboard-user",
      status: "done",
      title: "Dashboard recentré sur le compte",
      subtitle: "Les cartes du haut deviennent cliquables, parlent des données utilisateur et le contenu du dashboard enlève une bonne partie des textes inutiles.",
    },
    {
      id: "shopify-periods",
      status: "done",
      title: "Shopify piloté par période",
      subtitle: "Les filtres Aujourd'hui, Hier, 7 jours, 1 mois, 1 an et Depuis toujours pilotent maintenant le widget dashboard, les KPI, le graphique et les dernières commandes.",
    },
  ],
};
