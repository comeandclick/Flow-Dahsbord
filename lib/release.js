export const RELEASE = {
  version: "1.22.39",
  deployedAt: "2026-04-03T23:58:00+02:00",
  summary: "Flow restaure les comptes retrouvés, réactive un store sain et bloque enfin la suppression destructrice côté admin.",
  changes: [
    {
      id: "restored-accounts",
      status: "done",
      title: "Comptes restaurés depuis les exports retrouvés",
      subtitle: "Le store a été recréé à partir des exports admin disponibles et remet en ligne les identités retrouvées sans effacer de données additionnelles.",
    },
    {
      id: "safe-store-reset",
      status: "done",
      title: "Store distant réactivé proprement",
      subtitle: "Flow pointe de nouveau vers un store valide en local et sur Vercel pour éviter les erreurs d’écriture 404.",
    },
    {
      id: "admin-soft-delete",
      status: "done",
      title: "Suppression admin rendue non destructive",
      subtitle: "L’action admin archive maintenant un compte au lieu de supprimer son profil, ses notes et ses données liées.",
    },
  ],
};
