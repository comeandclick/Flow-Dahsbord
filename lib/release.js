export const RELEASE = {
  version: "1.22.46",
  deployedAt: "2026-04-29T00:33:00+02:00",
  summary: "La production Flow est republiée proprement avec les routes principales restaurées et un périmètre recentré sur le site principal et l'admin.",
  changes: [
    {
      id: "prod-restore",
      status: "done",
      title: "Production rétablie sur les routes clés",
      subtitle: "La republlication remet en place correctement la page Flow, l'admin et l'API de release qui ne doivent plus répondre en 404.",
    },
    {
      id: "single-surface",
      status: "done",
      title: "Périmètre Flow recentré",
      subtitle: "Le dépôt reste limité au Flow principal et au dashboard admin, sans surfaces parallèles ni variantes annexes.",
    },
    {
      id: "cleanup",
      status: "done",
      title: "Résidus locaux nettoyés",
      subtitle: "Les reliquats de vérification réapparus localement sont retirés pour éviter toute confusion avant publication.",
    },
  ],
};
