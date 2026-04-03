export const RELEASE = {
  version: "1.22.34",
  deployedAt: "2026-04-03T13:05:00+02:00",
  summary: "Flow protège mieux les créations locales contre les retours serveur en retard et affine la lecture live du dashboard admin.",
  changes: [
    {
      id: "db-reconciliation",
      status: "done",
      title: "Réconciliation du store renforcée",
      subtitle: "Les retours serveur du workspace fusionnent maintenant mieux avec l’état local pour éviter les disparitions de notes ou tâches juste après création.",
    },
    {
      id: "notes-task-creation",
      status: "done",
      title: "Création notes et tâches stabilisée",
      subtitle: "Les créations rapides et modales Notes/Tâches passent par un flux plus cohérent, avec ouverture plus fiable juste après insertion.",
    },
    {
      id: "admin-live-presence",
      status: "done",
      title: "Présence live admin clarifiée",
      subtitle: "La vue générale admin met davantage en avant la présence récente, les nouveaux comptes et les données live réellement utiles.",
    },
  ],
};
