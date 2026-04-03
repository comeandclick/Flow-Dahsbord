export const RELEASE = {
  version: "1.22.37",
  deployedAt: "2026-04-03T14:02:00+02:00",
  summary: "Flow élargit fortement la couverture FR/EN visible et resserre son thème global avec un shell plus premium sur tout le produit.",
  changes: [
    {
      id: "shared-i18n-expansion",
      status: "done",
      title: "Couche FR/EN beaucoup plus large",
      subtitle: "Le dictionnaire partagé couvre maintenant bien plus de titres, états, placeholders, réglages, notifications et libellés Flow/Admin.",
    },
    {
      id: "placeholder-translation",
      status: "done",
      title: "Placeholders et attributs mieux traduits",
      subtitle: "La traduction DOM applique aussi davantage les placeholders, titres et aria-labels sans réintroduire les anciens bugs de focus.",
    },
    {
      id: "global-theme-polish",
      status: "done",
      title: "Thème global resserré",
      subtitle: "Le shell, l’auth, les fonds, les contrastes et les transitions communes gagnent une direction visuelle plus propre en sombre comme en clair.",
    },
  ],
};
