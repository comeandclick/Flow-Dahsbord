export const RELEASE = {
  version: "1.22.41",
  deployedAt: "2026-04-04T19:45:09+02:00",
  summary: "Flow ajoute une variante publique Aurora sur un lien dédié, sans toucher au site principal ni aux comptes existants.",
  changes: [
    {
      id: "aurora-route",
      status: "done",
      title: "Nouvelle variante Aurora accessible sur un lien dédié",
      subtitle: "Le site principal garde sa DA actuelle tandis qu’une seconde entrée publique expose exactement la même app sur `/aurora` avec une identité visuelle distincte.",
    },
    {
      id: "aurora-skin",
      status: "done",
      title: "Theme Aurora sombre et clair injecté comme skin",
      subtitle: "La variante Aurora applique une nouvelle palette, des rayons plus généreux, des surfaces plus profondes et des états interactifs plus lumineux sans casser les réglages du reste de l’app.",
    },
    {
      id: "shared-data",
      status: "done",
      title: "Même backend, mêmes comptes, mêmes fonctionnalités",
      subtitle: "La nouvelle entrée réutilise la même application Flow et les mêmes APIs, ce qui garde la connexion, les données et les modules alignés entre les deux liens.",
    },
  ],
};
