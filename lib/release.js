export const RELEASE = {
  version: "1.25.4",
  deployedAt: "2026-05-02T02:08:00+02:00",
  summary: "Flow ajoute un vrai module Notes avec catégories, liste, éditeur persistant, formatage utile et checklist, tout en retirant plusieurs textes de remplissage du dashboard et de Shopify.",
  changes: [
    {
      id: "glassmorphism-refonte",
      status: "done",
      title: "Refonte glassmorphism complète",
      subtitle: "Tous les éléments du site adoptent maintenant le design glassmorphism : sidebar, dashboard, boutons, inputs, cartes, panneaux et topbar dans une cohérence visuelle totale.",
    },
    {
      id: "new-color-palette",
      status: "done",
      title: "Nouvelle palette de couleurs",
      subtitle: "Remplacement complet de l'ancienne palette par le système sombre premium avec surfaces homogènes, coins arrondis et meilleure tenue du thème clair.",
    },
    {
      id: "effects-unification",
      status: "done",
      title: "Unification des effets visuels",
      subtitle: "Backdrop-filter, shadows, glow et animations sont appliqués uniformément, avec un halo immersif lissé pour éviter les traits et le rendu pixelisé.",
    },
    {
      id: "responsive-glass",
      status: "done",
      title: "Design responsive glassmorphism",
      subtitle: "La DA reste cohérente sur mobile, tablette et desktop, avec sidebar, blocs et Shopify ajustés pour mieux tenir dans le viewport.",
    },
    {
      id: "no-legacy-colors",
      status: "done",
      title: "Shopify simplifié",
      subtitle: "La connexion Shopify se fait maintenant en deux champs séparés et le module guide l’utilisateur pour récupérer son domaine et son token Admin API.",
    },
    {
      id: "flow-admin-separation",
      status: "done",
      title: "Blocage Flow séparé de l’admin",
      subtitle: "Bloquer un compte Flow n’empêche plus la connexion admin du même compte, et les comptes existants ont été débloqués côté Flow.",
    },
    {
      id: "front-popups-fixed",
      status: "done",
      title: "Popups Flow corrigés",
      subtitle: "Les notifications et la recherche s’ouvrent maintenant au premier plan, sous leurs boutons, avec un fond opaque et sans déplacer le site.",
    },
    {
      id: "admin-navigation-simplified",
      status: "done",
      title: "Admin simplifié",
      subtitle: "Le dashboard admin ouvre une seule section à la fois avec des raccourcis d’accueil pour éviter les superpositions et les zones bloquées.",
    },
    {
      id: "notes-module-live",
      status: "done",
      title: "Module Notes opérationnel",
      subtitle: "Flow affiche maintenant les catégories, la liste des notes et un éditeur persistant avec titre, texte, gras, couleur, police, taille et checklist.",
    },
  ],
};
