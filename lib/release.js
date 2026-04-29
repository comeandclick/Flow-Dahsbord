export const RELEASE = {
  version: "1.23.2",
  deployedAt: "2026-04-29T18:15:00+02:00",
  summary: "Le shell Flow passe sur une DA plus maîtrisée: correction des textes et chevauchements, vrais fonds dark/light, profil centralisé et vue immersive desktop sans sidebar.",
  changes: [
    {
      id: "shell-polish",
      status: "done",
      title: "Nettoyage des couleurs, polices et débordements",
      subtitle: "Les textes hors palette, les polices incohérentes, les overlaps et les contenus qui sortaient de leurs blocs ont été repris sur le shell principal.",
    },
    {
      id: "profile-layout",
      status: "done",
      title: "La structure du site passe par le profil utilisateur",
      subtitle: "Le switch de layout a quitté le dashboard: il vit maintenant dans Profil/Paramètres et pilote toute la structure desktop du site.",
    },
    {
      id: "immersive-desktop",
      status: "done",
      title: "Vue immersive desktop et mobile verrouillé en tableau",
      subtitle: "La vue immersive retire la sidebar, remonte les modules en haut du site et reste désactivée sur téléphone pour préserver la lisibilité.",
    },
  ],
};
