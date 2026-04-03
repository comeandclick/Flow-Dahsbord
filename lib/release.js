export const RELEASE = {
  version: "1.22.36",
  deployedAt: "2026-04-03T13:44:00+02:00",
  summary: "Flow verrouille la passe admin bilingue avec un shell plus propre, des libellés mieux alignés et une base React explicitement sûre.",
  changes: [
    {
      id: "admin-react-cleanup",
      status: "done",
      title: "Base React admin explicitée",
      subtitle: "Le dashboard admin déclare maintenant explicitement ses hooks critiques et garde une structure de fichier plus propre pour la suite de la refonte.",
    },
    {
      id: "admin-copy-polish",
      status: "done",
      title: "Libellés admin encore resserrés",
      subtitle: "Les derniers titres, méta-libellés et compteurs restants du dashboard admin sont mieux harmonisés entre français et anglais.",
    },
    {
      id: "admin-release-alignment",
      status: "done",
      title: "Code, release et dépôt réalignés",
      subtitle: "La production, le fichier de release et le dépôt GitHub restent synchronisés après cette passe de consolidation admin.",
    },
  ],
};
