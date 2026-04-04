export const RELEASE = {
  version: "1.22.43",
  deployedAt: "2026-04-04T22:54:56+02:00",
  summary: "Flow ajoute `/atelier`, une nouvelle variante premium repartie du brief produit, tout en renforçant la QA utilisateur et la fiabilité du chargement client.",
  changes: [
    {
      id: "atelier-route",
      status: "done",
      title: "Nouvelle route publique `/atelier`",
      subtitle: "La variante Atelier repart du brief produit et du code fonctionnel existant pour proposer un environnement visuel totalement distinct, sans changer les comptes, les données ni les modules.",
    },
    {
      id: "atelier-shell",
      status: "done",
      title: "Thème Atelier entièrement séparé",
      subtitle: "Sidebar, shell, cartes, topbar, auth et composants principaux ont reçu une identité plus chaleureuse et habitable, indépendante des variantes déjà créées.",
    },
    {
      id: "ux-qa",
      status: "done",
      title: "QA utilisateur renforcée et bug middleware corrigé",
      subtitle: "Un script `check:ux` et le skill `flow-user-qa` valident les routes clés en desktop/mobile, tandis que le middleware n’intercepte plus les chunks statiques Next.",
    },
  ],
};
