export const RELEASE = {
  version: "1.24.2",
  deployedAt: "2026-05-01T15:32:00+02:00",
  summary: "Flow pousse maintenant la matière visuelle commune, assombrit encore le thème clair et ajoute un premier drag-and-drop persistant sur le dashboard sans casser la connexion ni le store.",
  changes: [
    {
      id: "dashboard-drag",
      status: "done",
      title: "Réorganisation du dashboard",
      subtitle: "Les cartes principales, les blocs de focus et les mini-blocs du dashboard peuvent maintenant être déplacés sans trous, avec persistance sur le compte.",
    },
    {
      id: "surface-polish",
      status: "done",
      title: "Matière visuelle renforcée",
      subtitle: "Les cartes partagent maintenant un rendu plus uniforme en gradient, opacité, glow et blur sur le shell, le dashboard et Shopify.",
    },
    {
      id: "light-theme-refine",
      status: "done",
      title: "Thème clair assombri",
      subtitle: "Le mode clair reste lumineux mais ne bascule plus vers un blanc trop froid, avec une base plus minérale et plus cohérente avec le dark.",
    },
    {
      id: "mobile-polish",
      status: "wip",
      title: "Mobile bloc par bloc",
      subtitle: "La densité mobile progresse encore, mais il reste des ajustements fins à faire sur certains panneaux, tables et hauteurs de contenu.",
    },
    {
      id: "final-cleanup",
      status: "todo",
      title: "Nettoyage final et mémoire IA",
      subtitle: "Quand la todo produit sera vraiment finie, il faudra trier les fichiers inutiles et finaliser une mémoire compacte pour la prochaine IA.",
    },
  ],
};
