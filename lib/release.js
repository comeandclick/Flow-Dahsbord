export const RELEASE = {
  version: "1.23.0",
  deployedAt: "2026-04-29T13:32:00+02:00",
  summary: "Nouveau socle Flow recentré sur les systèmes critiques: auth, Google, releases, notifications de mise à jour et déploiement prêt pour Vercel.",
  changes: [
    {
      id: "core-surface",
      status: "done",
      title: "Surface principale reconstruite",
      subtitle: "Le site public repart sur une base minimale dédiée à l'authentification, au statut du compte et aux releases.",
    },
    {
      id: "auth-stack",
      status: "done",
      title: "Pile d'auth conservée et recentrée",
      subtitle: "Inscription, connexion, session mémorisée, reset mot de passe et Google OAuth restent branchés sur le backend existant.",
    },
    {
      id: "live-update",
      status: "done",
      title: "Mises à jour détectées puis rechargées",
      subtitle: "Le client surveille la release courante, notifie l'utilisateur et recharge la page quand une nouvelle version est publiée.",
    },
  ],
};
