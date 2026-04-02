export const NOTE_CATEGORIES = [
  { key: "perso", label: "Perso", description: "Notes privees, maison, vie perso" },
  { key: "travail", label: "Travail", description: "Client, equipe, livrables, suivi" },
  { key: "idee", label: "Idee", description: "Brouillons, inspirations, concepts" },
];

export const WEEKDAY_OPTIONS = [
  { key: 0, short: "L", label: "Lundi" },
  { key: 1, short: "M", label: "Mardi" },
  { key: 2, short: "M", label: "Mercredi" },
  { key: 3, short: "J", label: "Jeudi" },
  { key: 4, short: "V", label: "Vendredi" },
  { key: 5, short: "S", label: "Samedi" },
  { key: 6, short: "D", label: "Dimanche" },
];

export const HABIT_ICON_PRESETS = [
  { value: "⭐", label: "Etoile" },
  { value: "📚", label: "Lecture" },
  { value: "💰", label: "Argent" },
  { value: "🛏️", label: "Sommeil" },
  { value: "🍽️", label: "Repas" },
  { value: "🏃", label: "Sport" },
  { value: "💧", label: "Hydratation" },
  { value: "🧘", label: "Calme" },
  { value: "💻", label: "Travail" },
  { value: "🎧", label: "Audio" },
  { value: "🧼", label: "Routine" },
  { value: "🚶", label: "Marche" },
];

export const TIME_OPTIONS = Array.from({ length: 16 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`);
export const DASHBOARD_WIDGET_KEYS = [
  "priority",
  "timeline",
  "overdue",
  "week",
  "messages",
  "goals",
  "shortcuts",
  "inbox",
  "contacts",
  "activity",
];

export const FILE_ATTACHMENT_LIMIT_BYTES = 320 * 1024;
export const IMAGE_ATTACHMENT_LIMIT_CHARS = 320000;
export const VOICE_ATTACHMENT_LIMIT_BYTES = 220 * 1024;
export const VOICE_ATTACHMENT_LIMIT_CHARS = 320000;
export const VOICE_RECORDING_LIMIT_SECONDS = 45;

export const SAVE_DEBOUNCE_MS = 1200;
export const ACCENT_PRESETS = [
  { key: "mono", label: "Monochrome", value: "#f2f2f4", accent2: "#cfcfd4", tint: "rgba(242,242,244,.12)", border: "rgba(242,242,244,.22)", rgb: "242 242 244" },
  { key: "azure", label: "Azure", value: "#2f7cff", accent2: "#8db5ff", tint: "rgba(47,124,255,.16)", border: "rgba(47,124,255,.28)", rgb: "47 124 255" },
  { key: "violet", label: "Violet", value: "#9f62ff", accent2: "#cfb2ff", tint: "rgba(159,98,255,.16)", border: "rgba(159,98,255,.28)", rgb: "159 98 255" },
];

export const FONT_SCALE_MAP = { sm: "14px", md: "14px", lg: "14px" };
export const FONT_FAMILY_MAP = {
  geist: "'Geist',system-ui,sans-serif",
  system: "system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  serif: "'Instrument Serif',Georgia,serif",
};

export const PLAN_DEFS = [
  { key: "starter", name: "Starter", priceMonth: "12€", priceYear: "120€", priceLife: "249€", desc: "Pour une organisation personnelle propre et simple.", features: ["Notes, taches et calendrier", "Synchronisation cloud", "Historique recent"] },
  { key: "pro", name: "Pro", priceMonth: "24€", priceYear: "240€", priceLife: "449€", desc: "Pour un usage intensif avec plus de personnalisation.", features: ["Reglages avances", "Exports et activite detaillee", "Priorite support"] },
  { key: "summit", name: "Summit", priceMonth: "49€", priceYear: "490€", priceLife: "899€", desc: "Le niveau le plus complet, active gratuitement pour l'instant.", features: ["Toutes les fonctions actuelles", "Messagerie et billing prets a brancher", "Acces prioritaire aux nouveautes"] },
];
