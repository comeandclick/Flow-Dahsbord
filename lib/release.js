export const RELEASE = {
  version: "1.24.0",
  deployedAt: "2026-05-01T11:06:04+02:00",
  summary: "Flow pousse maintenant un shell plus propre avec paramètres structurés, Shopify par compte et un mode de remplissage de démo pour accélérer le développement sans toucher aux vraies boutiques.",
  changes: [
    {
      id: "settings-shell",
      status: "done",
      title: "Paramètres et shell structurés",
      subtitle: "La page Paramètres est réorganisée en sections stables, les couches du shell restent devant et les parcours profil / apparence / intégrations sont regroupés proprement.",
    },
    {
      id: "shopify-user-config",
      status: "done",
      title: "Shopify par compte",
      subtitle: "Chaque utilisateur peut maintenant brancher sa propre boutique, voir son état de connexion et utiliser un écran commandes séparé sans dépendre d'une configuration globale.",
    },
    {
      id: "demo-dev-fill",
      status: "done",
      title: "Remplissage de démo contrôlé",
      subtitle: "Un bouton de développement peut injecter des données cohérentes pour accélérer les tests visuels, sans écraser une vraie boutique Shopify déjà connectée.",
    },
    {
      id: "dashboard-polish",
      status: "wip",
      title: "Dashboard centré utilisateur",
      subtitle: "La densité, la hiérarchie et la matière visuelle du dashboard avancent, mais il reste du travail pour atteindre le niveau de finition du module Shopify.",
    },
    {
      id: "drag-drop-shell",
      status: "todo",
      title: "Réorganisation des blocs",
      subtitle: "Le drag and drop sans trous avec mini tremblement et réagencement fluide reste à construire sur le dashboard et les futurs modules.",
    },
  ],
};
