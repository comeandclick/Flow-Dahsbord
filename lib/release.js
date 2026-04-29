export const RELEASE = {
  version: "1.23.1",
  deployedAt: "2026-04-29T17:04:00+02:00",
  summary: "Le socle Flow passe sur un vrai shell produit: auth minimale, dashboard d’accueil, sidebar hover/lock, recherche globale, notifications et double layout dark/light.",
  changes: [
    {
      id: "auth-minimal",
      status: "done",
      title: "Connexion réduite au strict nécessaire",
      subtitle: "La page d’accès ne garde plus que le bloc connexion, création de compte et reset, sans grand texte de présentation.",
    },
    {
      id: "dashboard-shell",
      status: "done",
      title: "Nouveau dashboard shell après connexion",
      subtitle: "Le compte connecté entre maintenant dans un vrai dashboard avec topbar, recherche, sidebar hover + lock et thème persistant.",
    },
    {
      id: "dual-layout",
      status: "done",
      title: "Deux structures visuelles maintenues",
      subtitle: "Le shell supporte déjà une vue tableau et une vue immersive, toutes deux branchées sur les mêmes données et sur le switch clair/sombre.",
    },
  ],
};
