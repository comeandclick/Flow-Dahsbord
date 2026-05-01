export const RELEASE = {
  version: "1.24.1",
  deployedAt: "2026-05-01T11:43:33+02:00",
  summary: "Flow rend maintenant le dashboard plus utile au compte connecté, densifie la page Paramètres et garde Shopify pilotable par utilisateur sans casser l’auth ni la persistance.",
  changes: [
    {
      id: "dashboard-user-focus",
      status: "done",
      title: "Dashboard recentré sur le compte",
      subtitle: "Les cartes et panneaux parlent davantage des tâches, événements, notifications, notes et signaux réels du compte au lieu du produit Flow lui-même.",
    },
    {
      id: "settings-expanded",
      status: "done",
      title: "Paramètres densifiés",
      subtitle: "La page Paramètres couvre maintenant compte, apparence, sécurité, intégrations, billing, notifications, langue, raccourcis et options avancées dans une structure plus proche d’une vraie settings app.",
    },
    {
      id: "shopify-user-config",
      status: "done",
      title: "Shopify par compte gardé intact",
      subtitle: "Le statut vide, la connexion boutique et le flux commandes restent cohérents par utilisateur, sans toucher aux boutiques déjà reliées ni aux données persistées.",
    },
    {
      id: "surface-polish",
      status: "wip",
      title: "Matière visuelle globale",
      subtitle: "La hiérarchie s’améliore, mais il reste encore à pousser tous les blocs vers une matière uniforme plus premium en dark et en light.",
    },
    {
      id: "drag-drop-shell",
      status: "todo",
      title: "Réorganisation des blocs",
      subtitle: "Le drag and drop sans trous avec mini tremblement et réagencement fluide reste à construire sur le dashboard et les futurs modules.",
    },
  ],
};
