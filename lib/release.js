export const RELEASE = {
  version: "1.22.32",
  deployedAt: "2026-04-02T21:28:00+02:00",
  summary: "Flow rebascule sur un nouveau store distant sain pour supprimer les erreurs Store write failed (404).",
  changes: [
    {
      id: "store-recreated",
      status: "done",
      title: "Store distant recréé",
      subtitle: "Le blob distant cassé a été remplacé par un nouveau store chiffré valide pour rétablir lecture et écriture.",
    },
    {
      id: "admin-access-restored",
      status: "done",
      title: "Accès admin remis en place",
      subtitle: "Le compte super-admin a été reprovisionné dans le nouveau store pour débloquer connexion et administration.",
    },
    {
      id: "store-404-fixed",
      status: "done",
      title: "Erreurs 404 supprimées",
      subtitle: "Les opérations de connexion, création de compte et sauvegarde ne pointent plus vers un blob introuvable.",
    },
  ],
};
