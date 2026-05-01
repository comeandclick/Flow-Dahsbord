export const RELEASE = {
  version: "1.24.3",
  deployedAt: "2026-05-01T19:47:00.000Z",
  summary: "Déploiement production unifié avec nouvelle charte graphique sombre, arrière-plan à points et surfaces vitrées partagées entre l'app et le backoffice.",
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
      subtitle: "La sidebar mobile et la densité générale tiennent mieux dans le viewport, mais il reste encore des ajustements fins à faire sur certains panneaux, tables et hauteurs de contenu.",
    },
    {
      id: "release-journal",
      status: "done",
      title: "Journal de version dédié",
      subtitle: "Chaque push important laisse maintenant aussi une trace lisible dans un fichier dédié, en plus du popup et du README.",
    },
    {
      id: "final-cleanup",
      status: "todo",
      title: "Nettoyage final et mémoire IA",
      subtitle: "Quand la todo produit sera vraiment finie, il faudra trier les fichiers inutiles et finaliser une mémoire compacte pour la prochaine IA.",
    },
  ],
};
