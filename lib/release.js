export const RELEASE = {
  version: "1.23.5",
  deployedAt: "2026-04-29T21:12:00+02:00",
  summary: "Le shell Flow allège son auth, garde la continuité des comptes, ajoute un fond importable par thème et enrichit le dashboard plus Shopify sans casser le store utilisateur.",
  changes: [
    {
      id: "auth-speed",
      status: "done",
      title: "Auth et démarrage allégés",
      subtitle: "La session hydrate d’abord le compte puis charge le reste en arrière-plan, avec un écran d’attente réduit et sans réinitialiser les données utilisateurs.",
    },
    {
      id: "background-control",
      status: "done",
      title: "Fond personnalisable par thème",
      subtitle: "Depuis Profil / Paramètres, l’utilisateur peut importer un fond pour le thème actif puis le retirer pour revenir au fond de base.",
    },
    {
      id: "shopify-module",
      status: "done",
      title: "Dashboard et Shopify enrichis",
      subtitle: "Ajout d’actions rapides, filtres 7/30 jours, filtres commandes, rafraîchissement manuel et rendu plus dense sur les cartes et panneaux.",
    },
  ],
};
