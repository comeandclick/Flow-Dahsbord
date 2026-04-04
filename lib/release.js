export const RELEASE = {
  version: "1.22.40",
  deployedAt: "2026-04-04T16:58:36+02:00",
  summary: "Flow adopte une nouvelle direction visuelle, stabilise le menu latéral et nettoie enfin la recherche Ctrl+K.",
  changes: [
    {
      id: "shell-refresh",
      status: "done",
      title: "Shell premium retravaillé sur tout le site",
      subtitle: "Le fond, les cartes, la sidebar et la topbar passent sur un rendu plus premium et plus stable, sans halo agressif ni effet d’ampoule défectueuse.",
    },
    {
      id: "sidebar-memory",
      status: "done",
      title: "Sidebar hover / lock fiabilisée et mémorisée",
      subtitle: "Le menu ne se ferme plus au clic en mode desktop ouvert, se referme seulement à la sortie du hover, et retient maintenant l’état verrouillé ou déverrouillé entre les visites.",
    },
    {
      id: "command-palette-cleanup",
      status: "done",
      title: "Command palette animée et résultats épurés",
      subtitle: "Ctrl+K gagne une animation d’entrée et de sortie, retire les doublons de navigation et affiche des aperçus plus utiles dans les résultats.",
    },
  ],
};
