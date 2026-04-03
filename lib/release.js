export const RELEASE = {
  version: "1.22.33",
  deployedAt: "2026-04-03T12:15:00+02:00",
  summary: "Flow nettoie le périmètre visible, stabilise l’entrée admin et rend le dashboard admin plus lisible avec une vraie zone données live.",
  changes: [
    {
      id: "visible-scope-cleanup",
      status: "done",
      title: "Périmètre visible resserré",
      subtitle: "Journal et Finance sortent du routing visible Flow sans suppression des données stockées ni des backups existants.",
    },
    {
      id: "admin-live-data",
      status: "done",
      title: "Zone données live admin",
      subtitle: "Le dashboard admin expose maintenant un panneau dédié au compte sélectionné avec profil, sécurité, forfait, activité et volumes module par module.",
    },
    {
      id: "admin-login-cleanup",
      status: "done",
      title: "Entrée admin stabilisée",
      subtitle: "La page de connexion admin ne dépend plus du traducteur DOM pour ses textes critiques et reste plus stable côté focus et rendu.",
    },
  ],
};
