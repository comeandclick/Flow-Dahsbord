"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ReleaseBadge, ReleaseWidget } from "./flow/release-ui";
import { useVoiceRecorder } from "./flow/useVoiceRecorder";
import {
  ACCENT_PRESETS,
  DASHBOARD_WIDGET_KEYS,
  FILE_ATTACHMENT_LIMIT_BYTES,
  FONT_FAMILY_MAP,
  FONT_SCALE_MAP,
  HABIT_ICON_PRESETS,
  IMAGE_ATTACHMENT_LIMIT_CHARS,
  NOTE_CATEGORIES,
  PLAN_DEFS,
  SAVE_DEBOUNCE_MS,
  TIME_OPTIONS,
  WEEKDAY_OPTIONS,
} from "../lib/flow/constants";
import {
  buildCalendarCells,
  buildJitsiRoomUrl,
  fmtDurationSeconds,
  parseCallRoomName,
  reorderKeys,
  sortConversationsList,
} from "../lib/flow/ui-helpers";
import { getStoredLocale, installDomTranslator, storeLocale } from "../lib/i18n";
import { RELEASE } from "../lib/release";

/* ═══════════════════════════════════════════════════════════
   FLOW — Complete Workspace App
   Auth distante · Sync multi-appareils · 12 modules
   ═══════════════════════════════════════════════════════════ */

// ── Utility helpers ──
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().split("T")[0];
const dayKeyFrom = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};
const shiftDayKey = (value, days) => {
  const base = new Date(`${value || todayStr()}T12:00:00`);
  if (Number.isNaN(base.getTime())) return value || todayStr();
  base.setDate(base.getDate() + days);
  return dayKeyFrom(base);
};
const esc = (s) => (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const noteTextFromHtml = (value) => `${value || ""}`
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();
const noteHtmlFromPlainText = (value) => `${esc(value || "")}`.replace(/\n/g, "<br>");
const noteHtmlFromStoredContent = (value) => {
  const raw = `${value || ""}`;
  return /<\/?[a-z][\s\S]*>/i.test(raw) ? raw : noteHtmlFromPlainText(raw);
};
const notePreviewFromContent = (value, limit = 140) => {
  const text = noteTextFromHtml(value);
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
};
const encodeSharedNotePayload = (payload) => {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } catch {
    return "";
  }
};
const decodeSharedNotePayload = (value) => {
  try {
    const normalized = `${value || ""}`.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(normalized))));
  } catch {
    return null;
  }
};
const fmtDate = (d) => { if (!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); };
const fmtRel = (iso) => { if (!iso) return ""; const diff = (Date.now() - new Date(iso).getTime()) / 1000; if (diff < 60) return "à l'instant"; if (diff < 3600) return `il y a ${Math.floor(diff / 60)}m`; if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`; return fmtDate(iso); };
const fmtRelease = (iso) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(",", " ·");
const fmtMoney = (value) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
function getDashboardWindow(range, referenceDate = new Date()) {
  const base = new Date(referenceDate);
  base.setHours(12, 0, 0, 0);
  const today = dayKeyFrom(base);

  if (range === "yesterday") {
    const start = shiftDayKey(today, -1);
    return { start, end: start, label: "Hier", accentDate: start };
  }

  if (range === "today") {
    return { start: today, end: today, label: "Aujourd'hui", accentDate: today };
  }

  if (range === "week") {
    const dates = getWeekDatesFrom(base);
    return {
      start: dates[0],
      end: dates[dates.length - 1],
      label: `${fmtDate(dates[0])} - ${fmtDate(dates[dates.length - 1])}`,
      accentDate: today,
    };
  }

  if (range === "year") {
    const year = base.getFullYear();
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      label: `${year}`,
      accentDate: today,
    };
  }

  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1, 12);
  const monthEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 12);
  return {
    start: dayKeyFrom(monthStart),
    end: dayKeyFrom(monthEnd),
    label: monthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    accentDate: today,
  };
}

function shiftDashboardReferenceDate(referenceDate, range, step) {
  const next = new Date(referenceDate);
  next.setHours(12, 0, 0, 0);
  if (range === "week") next.setDate(next.getDate() + (7 * step));
  else if (range === "month") next.setMonth(next.getMonth() + step);
  else if (range === "year") next.setFullYear(next.getFullYear() + step);
  else next.setDate(next.getDate() + step);
  return next;
}
const normalizeUsernameInput = (value) => `${value || ""}`.trim().replace(/\s+/g, "").toLowerCase();
const normalizePhoneInput = (value) => {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  return raw.startsWith("+")
    ? `+${raw.slice(1).replace(/\D/g, "")}`
    : raw.replace(/\D/g, "");
};
const isHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};
const isSupportedPhotoSource = (value) => !value || isHttpUrl(value) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(`${value || ""}`);

function ModalField({ label, id, type = "text", placeholder, as, ...props }) {
  return (
    <div className="field">
      <label>{label}</label>
      {as === "textarea" ? <textarea className="finput" id={id} placeholder={placeholder} style={{ minHeight: 70, resize: "vertical" }} {...props} />
        : as === "select" ? <select className="finput" id={id} {...props}>{props.children}</select>
        : <input className="finput" id={id} type={type} placeholder={placeholder} {...props} />}
    </div>
  );
}

function isTextEntryActive() {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  if (!active) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) || active.isContentEditable;
}

function normalizeSearchText(value) {
  return `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getFuzzyScore(value, query) {
  const text = normalizeSearchText(value);
  const needle = normalizeSearchText(query);
  if (!needle) return 0;
  if (!text) return -1;
  if (text.includes(needle)) {
    return 120 - (text.indexOf(needle) * 2) - Math.max(0, text.length - needle.length) * 0.1;
  }

  let score = 0;
  let cursor = -1;
  for (const char of needle) {
    const nextIndex = text.indexOf(char, cursor + 1);
    if (nextIndex === -1) return -1;
    score += 8;
    if (nextIndex === cursor + 1) score += 5;
    if (nextIndex <= 1) score += 3;
    cursor = nextIndex;
  }

  return score - Math.max(0, text.length - needle.length) * 0.08;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

const SHORTCUT_ACTIONS = [
  { key: "commandPalette", label: "Ouvrir la Command Palette", description: "Recherche universelle et actions rapides.", group: "general", defaultCombo: "mod+k", allowInInput: true },
  { key: "toggleTheme", label: "Basculer le thème", description: "Passe instantanément du mode sombre au mode clair.", group: "general", defaultCombo: "mod+shift+l" },
  { key: "newNote", label: "Nouvelle note", description: "Ouvre la création de note dans le module Notes.", group: "create", defaultCombo: "mod+shift+n" },
  { key: "newTask", label: "Nouvelle tâche", description: "Ouvre la création de tâche Kanban.", group: "create", defaultCombo: "mod+shift+t" },
  { key: "newEvent", label: "Nouvel événement", description: "Ouvre la création d'événement calendrier.", group: "create", defaultCombo: "mod+shift+e" },
  { key: "newBookmark", label: "Nouveau signet", description: "Ouvre la création d'un signet.", group: "create", defaultCombo: "mod+shift+b" },
  { key: "goDashboard", label: "Aller au tableau de bord", description: "Ouvre l'accueil du workspace.", group: "navigation", defaultCombo: "mod+1" },
  { key: "goNotes", label: "Aller à Notes", description: "Ouvre le module Notes.", group: "navigation", defaultCombo: "mod+2" },
  { key: "goProjects", label: "Aller à Projets", description: "Ouvre le Kanban.", group: "navigation", defaultCombo: "mod+3" },
  { key: "goCalendar", label: "Aller à Calendrier", description: "Ouvre le module Calendrier.", group: "navigation", defaultCombo: "mod+4" },
  { key: "goConversations", label: "Aller à Conversations", description: "Ouvre la messagerie.", group: "navigation", defaultCombo: "mod+5" },
  { key: "goHabits", label: "Aller à Habitudes", description: "Ouvre le suivi des habitudes.", group: "navigation", defaultCombo: "mod+6" },
  { key: "goGoals", label: "Aller à Objectifs", description: "Ouvre le suivi des objectifs.", group: "navigation", defaultCombo: "mod+8" },
  { key: "goFocus", label: "Aller à Focus", description: "Ouvre le minuteur Focus.", group: "navigation", defaultCombo: "mod+9" },
  { key: "goBookmarks", label: "Aller à Signets", description: "Ouvre les signets enregistrés.", group: "navigation", defaultCombo: "mod+0" },
  { key: "goSettings", label: "Aller à Paramètres", description: "Ouvre les paramètres du compte.", group: "navigation", defaultCombo: "mod+," },
];

const SHORTCUT_GROUP_LABELS = {
  general: "Général",
  create: "Création",
  navigation: "Navigation",
};

const DEFAULT_SHORTCUTS = SHORTCUT_ACTIONS.reduce((acc, action) => {
  acc[action.key] = action.defaultCombo;
  return acc;
}, {});

function normalizeShortcutKey(value) {
  const key = `${value || ""}`.toLowerCase();
  if (!key) return "";
  if (key === " ") return "space";
  if (key === "escape") return "esc";
  if (key === "arrowup") return "up";
  if (key === "arrowdown") return "down";
  if (key === "arrowleft") return "left";
  if (key === "arrowright") return "right";
  if (key === "control") return "ctrl";
  if (key === "meta") return "meta";
  return key;
}

function normalizeShortcutCombo(combo) {
  if (!combo) return "";
  const rawParts = `${combo}`.split("+").map((part) => normalizeShortcutKey(part.trim())).filter(Boolean);
  const modifiers = ["mod", "shift", "alt"].filter((part) => rawParts.includes(part));
  const key = rawParts.find((part) => !["mod", "shift", "alt", "ctrl", "meta"].includes(part)) || "";
  return [...modifiers, key].filter(Boolean).join("+");
}

function shortcutFromKeyboardEvent(event) {
  const key = normalizeShortcutKey(event.key);
  if (!key || ["shift", "alt", "ctrl", "meta"].includes(key)) return "";
  const parts = [];
  if (event.metaKey || event.ctrlKey) parts.push("mod");
  if (event.shiftKey) parts.push("shift");
  if (event.altKey) parts.push("alt");
  parts.push(key);
  return normalizeShortcutCombo(parts.join("+"));
}

function formatShortcutLabel(combo) {
  const normalized = normalizeShortcutCombo(combo);
  if (!normalized) return "Non attribué";
  return normalized.split("+").map((part) => {
    if (part === "mod") return "⌘/Ctrl";
    if (part === "shift") return "Shift";
    if (part === "alt") return "Alt";
    if (part === "space") return "Espace";
    if (part === "esc") return "Échap";
    if (part === ",") return ",";
    return part.length === 1 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1);
  }).join(" + ");
}

function getWeekDatesFrom(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const dow = current.getDay() === 0 ? 6 : current.getDay() - 1;
  const monday = new Date(current);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(current.getDate() - dow);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date.toISOString().split("T")[0];
  });
}

function getWeekdayIndex(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}

function getHabitEntries(habit) {
  return habit?.entries && typeof habit.entries === "object" ? habit.entries : {};
}

function getHabitTargetMinutes(habit) {
  return Math.max(1, Number(habit?.targetMinutes) || 1);
}

function isHabitScheduledForDate(habit, dateStr) {
  const days = Array.isArray(habit?.days) && habit.days.length ? habit.days : WEEKDAY_OPTIONS.map((item) => item.key);
  return days.includes(getWeekdayIndex(dateStr));
}

function getHabitMinutesForDate(habit, dateStr) {
  const entries = getHabitEntries(habit);
  const entryValue = Number(entries?.[dateStr]);
  if (Number.isFinite(entryValue) && entryValue > 0) return entryValue;
  if (habit?.done?.[dateStr]) return getHabitTargetMinutes(habit);
  return 0;
}

function isHabitDoneForDate(habit, dateStr) {
  return getHabitMinutesForDate(habit, dateStr) >= getHabitTargetMinutes(habit);
}

function computeHabitStreak(habit) {
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().split("T")[0];
    if (isHabitScheduledForDate(habit, dateStr)) {
      if (isHabitDoneForDate(habit, dateStr)) streak += 1;
      else break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
function getAccentPreset(value) {
  return ACCENT_PRESETS.find((preset) => preset.value === value) || ACCENT_PRESETS[0];
}

function buildProfileDraft(db, user) {
  return {
    name: db?.profile?.name || user?.name || "",
    username: db?.profile?.username || "",
    fullName: db?.profile?.fullName || db?.profile?.name || user?.name || "",
    email: db?.profile?.email || user?.email || "",
    phone: db?.profile?.phone || "",
    phoneVisible: db?.profile?.phoneVisible ? "public" : "private",
    photoUrl: db?.profile?.photoUrl || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
}

function buildAppearanceDraft(db) {
  return {
    theme: db?.settings?.theme || "dark",
    accent: db?.settings?.accent || ACCENT_PRESETS[0].value,
    locale: db?.settings?.locale || "fr",
    fontScale: db?.settings?.fontScale || "md",
    fontFamily: db?.settings?.fontFamily || "geist",
    focusDur: db?.settings?.focusDur || 25,
    shortBreak: db?.settings?.shortBreak || 5,
    longBreak: db?.settings?.longBreak || 15,
  };
}

const UI_STUDIO_BLOCKS = [
  { key: "sidebar", label: "Barre de menu" },
  { key: "topbar", label: "Barre d'en-tête" },
  { key: "dashboard-summary", label: "Stats dashboard" },
  { key: "dashboard-hero", label: "Hero dashboard" },
  { key: "dashboard-quick", label: "Vue rapide" },
  { key: "dashboard-widgets", label: "Widgets dashboard" },
  { key: "notes-sidebar", label: "Barre catégories notes" },
  { key: "notes-board", label: "Grille notes" },
  { key: "note-editor-sidebar", label: "Barre note ouverte" },
  { key: "note-editor-main", label: "Éditeur de note" },
  { key: "settings-nav", label: "Navigation paramètres" },
  { key: "settings-panel", label: "Panneau paramètres" },
];

function normalizeUiOverrideEntry(input = {}) {
  return {
    x: Math.max(-400, Math.min(400, Number(input?.x) || 0)),
    y: Math.max(-400, Math.min(400, Number(input?.y) || 0)),
    width: Math.max(0, Math.min(1600, Number(input?.width) || 0)),
    minHeight: Math.max(0, Math.min(1600, Number(input?.minHeight) || 0)),
    padding: Math.max(0, Math.min(120, Number(input?.padding) || 0)),
    radius: Math.max(0, Math.min(120, Number(input?.radius) || 0)),
    fontScale: Math.max(0.7, Math.min(1.8, Number(input?.fontScale) || 1)),
    opacity: Math.max(0.4, Math.min(1, Number(input?.opacity) || 1)),
    blur: Math.max(0, Math.min(24, Number(input?.blur) || 0)),
  };
}

function normalizeUiOverrideProfile(input = {}) {
  if (input && (input.desktop || input.mobile)) {
    return {
      desktop: normalizeUiOverrideEntry(input.desktop || {}),
      mobile: normalizeUiOverrideEntry(input.mobile || {}),
    };
  }
  const entry = normalizeUiOverrideEntry(input || {});
  return {
    desktop: entry,
    mobile: normalizeUiOverrideEntry({}),
  };
}

function buildUiEditableStyle(profile = {}, device = "desktop") {
  const override = normalizeUiOverrideEntry((normalizeUiOverrideProfile(profile) || {})[device] || {});
  return {
    transform: override.x || override.y ? `translate(${override.x}px, ${override.y}px)` : undefined,
    width: override.width ? `${override.width}px` : undefined,
    minHeight: override.minHeight ? `${override.minHeight}px` : undefined,
    padding: override.padding ? `${override.padding}px` : undefined,
    borderRadius: override.radius ? `${override.radius}px` : undefined,
    "--ui-font-scale": `${override.fontScale || 1}`,
    opacity: override.opacity !== 1 ? override.opacity : undefined,
    filter: override.blur ? `blur(${override.blur}px)` : undefined,
  };
}

function buildUiOverrideRule(blockKey, override = {}) {
  const clean = normalizeUiOverrideEntry(override);
  return [
    `[data-ui-block="${blockKey}"] {`,
    clean.x || clean.y ? `  transform: translate(${clean.x}px, ${clean.y}px);` : null,
    clean.width ? `  width: ${clean.width}px;` : null,
    clean.minHeight ? `  min-height: ${clean.minHeight}px;` : null,
    clean.padding ? `  padding: ${clean.padding}px;` : null,
    clean.radius ? `  border-radius: ${clean.radius}px;` : null,
    clean.fontScale !== 1 ? `  --ui-font-scale: ${clean.fontScale};` : null,
    clean.opacity !== 1 ? `  opacity: ${clean.opacity};` : null,
    clean.blur ? `  filter: blur(${clean.blur}px);` : null,
    `}`,
  ].filter(Boolean).join("\n");
}

function buildUiOverrideSnippet(blockKey, profile = {}) {
  const normalized = normalizeUiOverrideProfile(profile);
  return [
    `/* ${blockKey} */`,
    buildUiOverrideRule(blockKey, normalized.desktop),
    "",
    "@media (max-width: 768px) {",
    buildUiOverrideRule(blockKey, normalized.mobile).split("\n").map((line) => `  ${line}`).join("\n"),
    "}",
  ].join("\n");
}

function toTimeNumber(value) {
  const [hours = "0", minutes = "0"] = `${value || "00:00"}`.split(":");
  return (parseInt(hours, 10) || 0) * 60 + (parseInt(minutes, 10) || 0);
}

function addMinutesToTime(value, minutesToAdd) {
  const total = Math.max(0, Math.min((24 * 60) - 1, toTimeNumber(value || "09:00") + minutesToAdd));
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatTimeLabel(value) {
  if (!value) return "";
  const [hours = "00", minutes = "00"] = `${value}`.split(":");
  return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

function formatEventWindow(event) {
  const start = formatTimeLabel(event?.time);
  const end = formatTimeLabel(event?.endTime);
  if (!start && !end) return "Horaire libre";
  if (start && end && start !== end) return `${start} → ${end}`;
  return start || end || "Horaire libre";
}

function sortEventsByDateTime(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const keyA = `${a?.date || ""} ${a?.time || "23:59"}`;
    const keyB = `${b?.date || ""} ${b?.time || "23:59"}`;
    return keyA.localeCompare(keyB);
  });
}

function buildEventDraft(input = {}) {
  const startTime = input.time || "09:00";
  return {
    id: input.sharedEventId || input.id || "",
    createdBy: input.createdBy || "",
    title: input.title || "",
    date: input.date || todayStr(),
    time: startTime,
    endTime: input.endTime || addMinutesToTime(startTime, 60),
    desc: input.desc || "",
    attendeeIds: Array.isArray(input.attendeeIds) ? input.attendeeIds : [],
    attendees: Array.isArray(input.attendees) ? input.attendees : [],
    color: input.color || "#3f97ff",
    links: input.links || createEmptyLinks(),
  };
}

function getEventId(event) {
  return event?.sharedEventId || event?.id || "";
}

function getEventStatusLabel(status) {
  if (status === "confirmed") return "Accepté";
  if (status === "maybe") return "Peut-être";
  if (status === "declined") return "Refusé";
  return "En attente";
}

function getEventStatusTone(status) {
  if (status === "confirmed") return "var(--green)";
  if (status === "maybe") return "var(--orange)";
  if (status === "declined") return "var(--red)";
  return "var(--muted)";
}

function buildBookmarkDraft(input = {}) {
  return {
    id: input.id || "",
    type: input.type || "link",
    title: input.title || "",
    url: input.url || "",
    icon: input.icon || "🔖",
    text: input.text || "",
    note: input.note || "",
    coverUrl: input.coverUrl || "",
    previewTitle: input.previewTitle || "",
    previewText: input.previewText || "",
    sourceLabel: input.sourceLabel || "",
    mediaKind: input.mediaKind || "",
    links: input.links || createEmptyLinks(),
  };
}

function getBookmarkSourceLabel(bookmark) {
  if (bookmark?.sourceLabel) return bookmark.sourceLabel;
  if (!bookmark?.url) return bookmark?.type === "text" ? "Texte" : bookmark?.type === "image" ? "Image" : "Signet";
  try {
    return new URL(bookmark.url).hostname.replace(/^www\./, "");
  } catch {
    return "Lien";
  }
}

function getBookmarkCover(bookmark) {
  return bookmark?.coverUrl || "";
}

function getBookmarkSummary(bookmark) {
  return bookmark?.previewText || bookmark?.note || bookmark?.text || bookmark?.url || "";
}

async function readImageFileAsDataUrl(file, maxDimension = 1280, quality = 0.84) {
  if (!file) return "";
  const originalDataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result || ""}`);
    reader.onerror = () => reject(new Error("Lecture image impossible"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Chargement image impossible"));
    image.src = originalDataUrl;
  });

  const ratio = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
  const width = Math.max(1, Math.round((img.width || 1) * ratio));
  const height = Math.max(1, Math.round((img.height || 1) * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return originalDataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let payload = {};
  try { payload = await response.json(); } catch {}

  if (!response.ok) {
    throw new Error(payload?.error || "Erreur réseau");
  }

  return payload;
}

// ── Default DB ──
const emptyDB = () => ({
  notes: [], tasks: [], taskTemplates: [], projects: [], events: [], habits: [],
  journal: [], transactions: [], bookmarks: [], goals: [],
  activity: [],
  notifications: [],
  settings: { theme: "dark", accent: "#f2f2f4", weekStart: 1, focusDur: 25, shortBreak: 5, longBreak: 15, locale: "fr", fontScale: "md", fontFamily: "geist", uiOverrides: {} },
  profile: { name: "", email: "", username: "", fullName: "", phone: "", phoneVisible: false, photoUrl: "" },
  subscription: { plan: "summit", status: "complimentary", billingCycle: "lifetime", startedAt: "", renewsAt: "", stripeCustomerId: "", stripeSubscriptionId: "", stripePriceId: "", stripeCheckoutSessionId: "" }
});

const LOCAL_DB_CACHE_PREFIX = "flow-cache:v1";
const LOCAL_SESSION_SNAPSHOT_KEY = "flow-last-session:v1";

function getLocalDbCacheKey(userLike) {
  const identity = userLike?.uid || userLike?.email;
  return identity ? `${LOCAL_DB_CACHE_PREFIX}:${identity}` : "";
}

function readLocalDbCache(userLike) {
  if (typeof window === "undefined") return null;
  const key = getLocalDbCacheKey(userLike);
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.db && typeof parsed.db === "object" ? parsed.db : null;
  } catch {
    return null;
  }
}

function writeLocalDbCache(userLike, db) {
  if (typeof window === "undefined") return;
  const key = getLocalDbCacheKey(userLike);
  if (!key || !db || typeof db !== "object") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), db }));
  } catch {}
}

function readLocalSessionSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?.uid ? parsed.user : null;
  } catch {
    return null;
  }
}

function writeLocalSessionSnapshot(userLike) {
  if (typeof window === "undefined" || !userLike?.uid) return;
  try {
    window.localStorage.setItem(LOCAL_SESSION_SNAPSHOT_KEY, JSON.stringify({
      user: {
        uid: userLike.uid,
        name: userLike.name || "",
        email: userLike.email || "",
      },
      savedAt: Date.now(),
    }));
  } catch {}
}

function clearLocalSessionSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOCAL_SESSION_SNAPSHOT_KEY);
  } catch {}
}

function buildTransactionDraft(input = {}) {
  return {
    id: input.id || "",
    description: input.description || "",
    amount: input.amount !== undefined && input.amount !== null ? String(input.amount) : "",
    type: input.type || "expense",
    category: input.category || "",
    date: input.date || todayStr(),
  };
}

function addActivityEntry(db, entry) {
  const next = {
    id: uid(),
    type: entry?.type || "system",
    title: entry?.title || "Mise à jour",
    detail: entry?.detail || "",
    createdAt: new Date().toISOString(),
  };
  db.activity = [next, ...(Array.isArray(db.activity) ? db.activity : [])].slice(0, 120);
}

function addNotificationEntry(db, notification) {
  const next = {
    id: uid(),
    type: notification?.type || "system",
    title: notification?.title || "Notification",
    detail: notification?.detail || "",
    createdAt: new Date().toISOString(),
    readAt: "",
    href: notification?.href || "",
    entityId: notification?.entityId || "",
  };
  db.notifications = [next, ...(Array.isArray(db.notifications) ? db.notifications : [])].slice(0, 120);
}

function createEmptyLinks() {
  return {
    contacts: [],
    conversations: [],
    events: [],
    bookmarks: [],
    notes: [],
  };
}

function normalizeTaskStatusFromColumn(colIdx) {
  if (colIdx === 1) return "in_progress";
  if (colIdx === 2) return "review";
  if (colIdx === 3) return "done";
  return "todo";
}

function columnFromTaskStatus(status, fallback = 0) {
  if (status === "in_progress") return 1;
  if (status === "review") return 2;
  if (status === "done") return 3;
  return Number.isFinite(fallback) ? fallback : 0;
}

function addDays(dateStr, days) {
  const base = new Date(`${dateStr || todayStr()}T12:00:00`);
  if (Number.isNaN(base.getTime())) return dateStr || todayStr();
  base.setDate(base.getDate() + days);
  return base.toISOString().split("T")[0];
}

function percentFromSubtasks(subtasks) {
  if (!Array.isArray(subtasks) || !subtasks.length) return 0;
  const done = subtasks.filter((item) => item?.done).length;
  return Math.round((done / subtasks.length) * 100);
}

function getTaskMemberRole(task, user) {
  if (!task || !user?.uid) return "editor";
  if (!Array.isArray(task.members) || !task.members.length) return "editor";
  return task.members.find((member) => member.uid === user.uid)?.role || "viewer";
}

function buildTaskMember(user, role = "editor") {
  return {
    uid: user?.uid || "",
    name: user?.name || "Utilisateur",
    email: user?.email || "",
    username: "",
    role,
  };
}

function buildTaskFromTemplate(template, user, extra = {}) {
  const createdAt = new Date().toISOString();
  const dueOffsetDays = Math.max(0, Number(template?.dueOffsetDays) || 0);
  return {
    id: uid(),
    title: template?.title || "",
    desc: template?.desc || "",
    prio: template?.prio || "none",
    due: dueOffsetDays ? addDays(todayStr(), dueOffsetDays) : "",
    colIdx: 0,
    status: "todo",
    projectId: "",
    templateId: template?.id || "",
    ownerId: user?.uid || "",
    createdAt,
    updatedAt: createdAt,
    links: createEmptyLinks(),
    reactions: {},
    comments: [],
    subtasks: Array.isArray(template?.subtasks)
      ? template.subtasks.map((subtask) => ({
          id: uid(),
          title: subtask?.title || "",
          done: false,
          createdAt,
          doneAt: "",
        }))
      : [],
    members: (() => {
      const templateMembers = Array.isArray(template?.members) ? template.members.filter((member) => member?.uid) : [];
      const ownerMember = buildTaskMember(user, "editor");
      const members = [...templateMembers, ownerMember, ...(Array.isArray(extra?.members) ? extra.members : [])];
      return [...new Map(members.filter((member) => member?.uid).map((member) => [member.uid, { ...member }])).values()];
    })(),
  };
}

function FlowLogo({ size = 20 }) {
  return <img src="/flow-logo.png" alt="" aria-hidden="true" style={{ width: size, height: size, display: "block" }} />;
}

function SkeletonBlock({ className = "", style = {} }) {
  return <div className={`skeleton ${className}`.trim()} style={style} aria-hidden="true" />;
}

function LoadingWorkspaceShell({ exiting = false, reverse = false }) {
  return (
    <div className={`flow-splash ${exiting ? "exit" : ""} ${reverse ? "reverse" : ""}`.trim()} aria-label="Chargement de Flow">
      <div className="flow-splash-core">
        <div className="flow-splash-logo"><FlowLogo size={116} /></div>
        <div className="flow-splash-word">Flow</div>
      </div>
    </div>
  );
}

// ── Icons (inline SVGs) ──
const I = {
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
  edit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  kanban: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="5" height="14" rx="1"/><rect x="10" y="3" width="5" height="9" rx="1"/><rect x="17" y="3" width="5" height="18" rx="1"/></svg>,
  cal: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  book: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  dollar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  bookmark: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>,
  target: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  gear: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  logout: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  play: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  pause: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  chev: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  bell: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5"/><path d="M9.5 17a2.5 2.5 0 005 0"/></svg>,
  help: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12" y2="17"/></svg>,
  msg: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  user: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 10-16 0"/><circle cx="12" cy="8" r="4"/></svg>,
  panel: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>,
  phone: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.08 4.18 2 2 0 014.06 2h3a2 2 0 012 1.72c.12.9.34 1.78.65 2.62a2 2 0 01-.45 2.11L8.1 9.91a16 16 0 006 6l1.46-1.16a2 2 0 012.11-.45c.84.31 1.72.53 2.62.65A2 2 0 0122 16.92z"/></svg>,
  video: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="15" height="12" rx="2"/><path d="M18 10l3-2v8l-3-2z"/></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  type: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>,
  list: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M4 6h.01"/><path d="M4 12h.01"/><path d="M4 18h.01"/></svg>,
  paperclip: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-8.49 8.49a6 6 0 01-8.49-8.49l8.49-8.49a4 4 0 015.66 5.66l-8.49 8.49a2 2 0 01-2.83-2.83l7.78-7.78"/></svg>,
  share: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M12 16V3"/><path d="M7 8l5-5 5 5"/></svg>,
  reply: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 8L4 12l5 4"/><path d="M20 12H4"/><path d="M12 5c4.5 0 8 3.4 8 7.9V19"/></svg>,
  more: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>,
  attachImage: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  lock: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/></svg>,
  star: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
};

// ── CSS (all styles as a string) ──
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

:root {
  --bg:#111113;--bg2:#161619;--bg3:#1b1b1f;--bg4:#25252a;--line:#26262c;--line2:#33333b;
  --muted:#777781;--sub:#a3a3ad;--sub2:#ececf2;--text:#f5f5f7;--text2:#d7d7df;
  --accent:#f2f2f4;--accent2:#ffffff;--accent-d:rgba(255,255,255,.065);--accent-b:rgba(255,255,255,.14);--accent-rgb:242 242 244;
  --red:#ff9e9e;--red-d:rgba(255,158,158,.14);--green:#9fe0b8;--green-d:rgba(159,224,184,.14);
  --blue:#b9c0cc;--blue-d:rgba(185,192,204,.14);--orange:#e6c089;--violet:#d7d7df;
  --r:18px;--r-sm:14px;--serif:'Instrument Serif',Georgia,serif;--sans:'Geist',system-ui,sans-serif;--mono:'Geist Mono',monospace;--menu-font:'Geist',system-ui,sans-serif;
  --shell:#131317;--shell-2:#17171b;--shell-border:#222228;--shell-card:#1a1a1f;--shell-input:#18181c;
  --shadow:0 26px 72px rgba(0,0,0,.44);
}
[data-t="light"]{--bg:#ececef;--bg2:#f7f7fa;--bg3:#efeff3;--bg4:#e4e4ea;--line:#d5d5de;--line2:#c5c5d0;--muted:#7b7b86;--sub:#61616d;--sub2:#2f2f36;--text:#16161a;--text2:#222228;--shell:#f4f4f8;--shell-2:#fbfbfd;--shell-border:#d7d7df;--shell-card:#f8f8fb;--shell-input:#efeff4;--shadow:0 18px 42px rgba(38,38,52,.10)}

*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body,#root{height:100%;overflow:hidden;overflow-x:hidden;background:var(--bg)}
body{font-family:var(--sans);background:
  radial-gradient(circle at 12% -2%,rgba(255 255 255 / .06) 0%,rgba(255 255 255 / .025) 14%,transparent 34%),
  linear-gradient(180deg,#151519 0%,#111113 100%);
color:var(--text);font-size:var(--app-font-size,14px);line-height:1.5;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s,font-size .2s;overscroll-behavior:none}
html[data-t="light"] body{background:
  radial-gradient(circle at 12% -2%,rgba(255 255 255 / .72) 0%,rgba(255 255 255 / .32) 18%,transparent 38%),
  linear-gradient(180deg,#f7f7fb 0%,#ececf2 100%);
color:var(--text)}
body::after{content:'';position:fixed;inset:auto;pointer-events:none;z-index:0;border-radius:999px;opacity:.12;width:220px;height:220px;right:-50px;bottom:-50px;filter:blur(72px);background:radial-gradient(circle,rgba(255 255 255 / .025) 0%,transparent 72%)}
html[data-t="light"] body::after{opacity:.16}
input,textarea,select,button{font-family:inherit;font-size:inherit;color:inherit;border:none;background:none;outline:none}
button{cursor:pointer}
*{scrollbar-width:none}
::-webkit-scrollbar{width:0;height:0;display:none}

.auth-wrap{height:100vh;display:flex;align-items:center;justify-content:center;background:transparent;padding:20px;position:relative;isolation:isolate}
.auth-card{width:100%;max-width:430px;background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.012) 18%,transparent 48%),rgba(15,15,19,.9);border:1px solid rgba(255,255,255,.06);border-radius:32px;padding:36px 32px;box-shadow:0 32px 90px rgba(0,0,0,.5);position:relative;overflow:hidden;animation:panelIn .45s cubic-bezier(.2,.8,.2,1);backdrop-filter:blur(20px)}
.auth-card.exit{opacity:0;transform:translateY(18px) scale(.98);filter:blur(8px);transition:opacity .26s ease,transform .26s ease,filter .26s ease}
.auth-card::after{content:'';position:absolute;left:18%;right:-18%;bottom:-44%;height:200px;background:radial-gradient(circle,rgba(var(--accent-rgb) / .18) 0%,transparent 70%);pointer-events:none}
.auth-light{position:absolute;top:-36px;left:-18px;width:210px;height:210px;background:radial-gradient(circle,rgba(255 255 255 / .18) 0%,rgba(var(--accent-rgb) / .22) 18%,transparent 70%);filter:blur(10px);pointer-events:none}
.auth-logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}
.auth-mark{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 10px 22px rgba(var(--accent-rgb) / .18))}
.auth-mark svg{width:100%;height:100%;display:block}
.auth-name{font-family:var(--serif);font-size:24px;flex:1}
.auth-welcome{display:flex;flex-direction:column;gap:10px;margin-bottom:20px}
.auth-welcome h1{font-size:38px;line-height:.95;letter-spacing:-.06em;max-width:10ch}
.auth-inline-link{display:flex;justify-content:flex-end;margin-top:-6px;margin-bottom:4px}
.auth-inline-link button,.auth-switch-copy button{color:var(--accent2);font-weight:600}
.auth-inline-link button:disabled,.auth-switch-copy button:disabled{opacity:.55;cursor:not-allowed}
.auth-divider{display:flex;align-items:center;gap:12px;color:var(--muted);font-size:11px;letter-spacing:.12em;text-transform:uppercase;margin:16px 0 14px}
.auth-divider::before,.auth-divider::after{content:'';height:1px;flex:1;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)}
.auth-google-btn{width:100%;padding:13px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;gap:10px;font-weight:600;transition:transform .18s,border-color .18s,background .18s}
.auth-google-btn:hover{transform:translateY(-1px);border-color:var(--line2);background:rgba(255,255,255,.06)}
.auth-google-btn:disabled{opacity:.58;cursor:not-allowed;transform:none}
.auth-google-icon{width:26px;height:26px;border-radius:999px;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-weight:700}
.auth-switch-copy{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;font-size:12px;color:var(--sub)}
.auth-helper-card{margin:14px 0 0;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);display:grid;gap:12px}
.auth-helper-card strong{font-size:13px}
.auth-helper-card p{font-size:12px;color:var(--sub);line-height:1.55}
.auth-helper-actions{display:flex;gap:8px;flex-wrap:wrap}
.auth-helper-actions .btn{flex:1;justify-content:center}
.auth-helper-note{font-size:11px;color:var(--muted);line-height:1.5}
.loading-orbit{position:relative;width:70px;height:70px;border-radius:24px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}
.loading-orbit::before,.loading-orbit::after{content:'';position:absolute;inset:-8px;border-radius:28px;border:1px solid rgba(255,255,255,.06)}
.loading-orbit::after{inset:-16px;border-color:rgba(255,255,255,.03);animation:spin 8s linear infinite}
.loading-orbit .auth-mark{width:42px;height:42px;border-radius:14px}
.loading-copy strong{display:block;font-size:17px}
.loading-copy span{display:block;font-size:12px;color:var(--sub);margin-top:4px}
.auth-release,.sb-release{display:inline-flex;align-items:center;padding:6px 10px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:rgba(255,255,255,.04);color:var(--sub2);font-size:10px;font-weight:600;letter-spacing:.2px;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.release-click{appearance:none;cursor:pointer;transition:transform .15s,border-color .15s,color .15s,background .15s,box-shadow .15s}
.release-click:hover{transform:translateY(-1px);border-color:var(--accent);color:var(--text);box-shadow:0 10px 24px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.06)}
.release-pill{justify-content:flex-start}
.release-pill-sm{padding:5px 10px}
.release-widget-backdrop{position:fixed;inset:0;z-index:520;background:rgba(0,0,0,.56);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px}
.release-widget{width:min(680px,100%);max-height:min(78vh,760px);overflow:auto;border-radius:24px;border:1px solid var(--line2);background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 18%),var(--bg2);box-shadow:var(--shadow);padding:22px}
.release-widget-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
.release-widget-kicker{font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
.release-widget h3{font-size:22px;margin-bottom:6px}
.release-widget p{font-size:13px;color:var(--sub)}
.release-close{padding:8px 12px;border-radius:999px;border:1px solid var(--line);background:var(--bg3);color:var(--sub);transition:all .15s;flex-shrink:0}
.release-close:hover{color:var(--text);border-color:var(--line2);transform:translateY(-1px)}
.release-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
.release-stat{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--line);border-radius:16px}
.release-stat strong{font-size:16px}
.release-stat span:last-child{font-size:12px;color:var(--sub)}
.release-list{display:grid;gap:10px}
.release-entry{border:1px solid var(--line);border-radius:18px;padding:14px}
.release-entry-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.release-entry-head strong{display:block;font-size:14px;margin-bottom:4px}
.release-entry-head span{display:block;font-size:12px;color:var(--sub)}
.release-status{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;border:1px solid var(--line);font-size:11px;font-weight:700;white-space:nowrap}
.release-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.auth-tabs{display:flex;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden;margin-bottom:24px}
.auth-tab{flex:1;padding:9px;text-align:center;font-size:13px;font-weight:500;cursor:pointer;color:var(--sub);background:transparent;transition:all .15s}
.auth-tab.on{background:var(--accent);color:#0e0e0e}
.field{margin-bottom:14px}
.field label{display:block;font-size:11.5px;font-weight:500;color:var(--sub);margin-bottom:5px}
.finput{width:100%;padding:10px 13px;background:var(--bg3);border:1px solid var(--line);border-radius:var(--r-sm);color:var(--text);transition:border-color .15s}
.finput:focus{border-color:var(--accent)}
.finput::placeholder{color:var(--muted)}
.finput:-webkit-autofill{animation-name:flowAutofill;animation-duration:.01s;animation-iteration-count:1}
.auth-btn{width:100%;padding:11px;background:var(--accent);color:#0e0e0e;font-weight:600;border-radius:var(--r-sm);cursor:pointer;transition:all .18s;margin-top:6px;transform:translateY(0);box-shadow:0 10px 24px rgba(var(--accent-rgb) / .16)}
.auth-btn:hover{background:var(--accent2);transform:translateY(-1px);box-shadow:0 14px 28px rgba(var(--accent-rgb) / .22)}
.auth-btn:disabled{opacity:.78;cursor:wait;transform:none;box-shadow:none}
.auth-err{font-size:12px;color:var(--red);padding:8px 0;min-height:28px}
.flow-splash{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#000;overflow:hidden;opacity:1;visibility:visible;transition:opacity .52s ease,visibility .52s ease}
.flow-splash.exit{opacity:0;visibility:hidden}
.flow-splash::before{content:'';position:absolute;inset:-28%;background:
radial-gradient(circle at 50% 50%,rgba(255,255,255,.24) 0%,rgba(255,255,255,.11) 12%,transparent 40%);
filter:blur(30px);opacity:.86;animation:flowSplashGlow 1.9s ease forwards}
.flow-splash-core{position:relative;z-index:1;display:flex;align-items:center;justify-content:center;gap:22px;padding:24px;transform:perspective(1800px) translateZ(-1200px) scale(.16);opacity:0;animation:flowSplashZoom .96s cubic-bezier(.18,.82,.2,1) forwards}
.flow-splash.exit .flow-splash-core{animation:flowSplashExit .46s cubic-bezier(.4,0,.2,1) forwards}
.flow-splash.reverse .flow-splash-core{transform:scale(1);opacity:1;animation:flowSplashReverse .48s cubic-bezier(.4,0,.2,1) forwards}
.flow-splash-logo{display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 26px 72px rgba(255,255,255,.2))}
.flow-splash-logo img{width:clamp(164px,15vw,232px)!important;height:clamp(164px,15vw,232px)!important}
.flow-splash-word{font-family:var(--serif);font-size:clamp(82px,14vw,168px);letter-spacing:-.065em;line-height:.88;color:#fff;text-shadow:0 24px 60px rgba(255,255,255,.18)}

.app{display:flex;height:100dvh;min-height:100dvh;max-width:100vw;overflow:hidden;position:relative;isolation:isolate;padding:12px;background:color-mix(in srgb,var(--bg) 96%, black 4%)}
.sb{width:258px;flex-shrink:0;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.008) 18%,transparent 44%),var(--shell);border:1px solid var(--shell-border);display:flex;flex-direction:column;z-index:220;transition:transform .34s cubic-bezier(.22,1,.36,1),background .3s,width .24s,left .24s;position:absolute;left:12px;top:12px;bottom:12px;overflow:visible;box-shadow:0 30px 80px rgba(0,0,0,.28);border-radius:30px;will-change:transform,width}
.sb,.sb *{font-family:var(--menu-font)}
.sb-top{padding:18px 18px 14px;border-bottom:1px solid var(--line)}
.sb-logo{display:flex;align-items:center;gap:9px}
.sb-pin{margin-left:auto;width:32px;height:32px;border-radius:999px;color:var(--sub);background:transparent;display:inline-flex;align-items:center;justify-content:center;transition:background .16s,color .16s,transform .16s,box-shadow .16s}
.sb-pin:hover{color:var(--text);background:rgba(255,255,255,.06);transform:translateY(-1px)}
.sb-pin.on{background:rgba(255,255,255,.1);color:var(--text);box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 10px 20px rgba(0,0,0,.18)}
.sb-mark{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;filter:drop-shadow(0 8px 18px rgba(var(--accent-rgb) / .16))}
.sb-mark svg{width:100%;height:100%;display:block}
.sb-name{font-size:28px;font-weight:700;letter-spacing:-.04em}
.sb-nav{flex:1;overflow:hidden;padding:6px 9px 8px;display:flex;flex-direction:column;gap:8px}
.sb-nav-main,.sb-nav-bottom{display:flex;flex-direction:column;gap:2px}
.sb-nav-bottom{margin-top:auto;padding-top:8px;border-top:1px solid var(--line)}
.sb-sec{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7d7d7d;padding:6px 12px 3px}
.ni{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:16px;color:var(--sub2);font-size:13px;cursor:pointer;transition:background .14s,color .14s,transform .14s,border-color .14s,box-shadow .14s;position:relative;user-select:none;border:1px solid transparent;min-height:44px}
.ni:hover{background:rgba(255,255,255,.04);color:var(--text);border-color:rgba(255,255,255,.05)}
.ni.on{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015)),color-mix(in srgb,var(--shell-card) 94%, black 6%);color:var(--text2);border-color:color-mix(in srgb,var(--line2) 92%, transparent);box-shadow:0 12px 28px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.04)}
.ni.on::before{content:'';position:absolute;left:10px;top:50%;transform:translateY(-50%);height:22px;width:3px;background:var(--accent);border-radius:999px;box-shadow:0 0 14px rgba(var(--accent-rgb) / .24)}
.ni-icon{width:22px;height:22px;display:grid;place-items:center;flex-shrink:0;line-height:0}
.ni-icon > *,.ni-icon svg{width:20px;height:20px;display:block;flex:none;margin:auto}
.ni svg{flex-shrink:0;opacity:.92}.ni.on svg{opacity:1}
.ni-badge{margin-left:auto;font-size:10px;font-family:var(--mono);background:var(--bg4);color:var(--sub);padding:1px 6px;border-radius:99px}
.sb-user{padding:12px 14px;border-top:1px solid var(--line);display:flex;flex-direction:column;align-items:stretch;gap:10px}
.sb-user-main{display:flex;align-items:center;gap:9px;flex:1;min-width:0;padding:12px 14px;border-radius:20px;transition:background .15s,transform .15s,border-color .15s;cursor:pointer;border:1px solid rgba(255,255,255,.06);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.012))}
.sb-user-main:hover{background:var(--bg3);transform:translateY(-1px);border-color:var(--line2)}
.sb-av{width:34px;height:34px;border-radius:50%;background:var(--accent-d);border:1px solid var(--accent-b);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;font-family:var(--serif);color:var(--accent);flex-shrink:0;overflow:hidden}
.sb-av img{width:100%;height:100%;object-fit:cover}
.sb-user-meta{display:flex;flex-direction:column;min-width:0;flex:1}
.sb-uname{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-plan{font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:.4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-logout{color:var(--sub);cursor:pointer;padding:4px;border-radius:4px;transition:color .15s}.sb-logout:hover{color:var(--red)}
.sb-bottom-upgrade{display:flex;flex-direction:column;gap:10px;padding:14px 14px 12px;border-radius:22px;border:1px solid rgba(var(--accent-rgb) / .18);background:linear-gradient(180deg,rgba(var(--accent-rgb) / .14),rgba(255,255,255,.03) 20%,color-mix(in srgb,var(--shell) 94%, black 6%));box-shadow:0 18px 30px rgba(0,0,0,.16);animation:sidebarSlideIn .28s cubic-bezier(.2,.8,.2,1);position:relative}
.sb-bottom-upgrade strong{display:block;font-size:15px;line-height:1.2}
.sb-bottom-upgrade span{display:block;font-size:11px;color:var(--sub);line-height:1.5}
.sb-bottom-upgrade .btn{justify-content:center}
.sb-upgrade-close{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;color:var(--sub2)}
.sb.compact{width:84px}
.sb.compact .sb-release,.sb.compact .sb-sec,.sb.compact .ni-label,.sb.compact .ni-badge,.sb.compact .sb-user-meta{opacity:0;width:0;overflow:hidden;pointer-events:none}
.sb.compact .sb-logo{justify-content:center;gap:0}
.sb.compact .sb-pin{display:none}
.sb.compact .sb-top{padding:14px 10px 10px}
.sb.compact .sb-name{display:none}
.sb.compact .sb-nav{padding:8px 6px 8px;display:flex;flex-direction:column;align-items:center;gap:8px}
.sb.compact .sb-nav-main,.sb.compact .sb-nav-bottom{align-items:center;width:100%}
.sb.compact .sb-nav-bottom{padding-top:8px;margin-top:auto;border-top:1px solid rgba(255,255,255,.05)}
.sb.compact .ni{justify-content:center;align-items:center;padding:0;width:58px;height:58px;border-radius:18px;margin:0 auto;transform:none;background:rgba(255,255,255,.02);border:1px solid transparent;box-shadow:none;min-width:0}
.sb.compact .ni.on::before{display:none}
.sb.compact .ni:hover,.sb.compact .ni.on{transform:none}
.sb.compact .ni:hover{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.05)}
.sb.compact .ni.on{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02)),rgba(255,255,255,.03);border-color:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 12px 24px rgba(0,0,0,.18)}
.sb.compact .ni-icon{width:26px;height:26px;color:var(--sub2);display:grid;place-items:center;opacity:1;line-height:0}
.sb.compact .ni-icon svg{width:22px;height:22px;display:block;opacity:1;stroke:currentColor;margin:auto}
.sb.compact .ni.on .ni-icon{color:var(--accent2);filter:drop-shadow(0 0 12px rgba(var(--accent-rgb) / .34))}
.sb.compact .sb-user{justify-content:center;padding:10px 0 12px}
.sb.compact .sb-user-main{padding:12px;justify-content:center;flex:none;width:56px;height:56px;border-radius:20px}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;max-width:100%;position:relative;background:linear-gradient(180deg,rgba(255,255,255,.02),transparent 26%),var(--shell);border:1px solid var(--shell-border);border-radius:32px;box-shadow:0 24px 80px rgba(0,0,0,.32);margin-left:108px;transition:margin-left .28s cubic-bezier(.22,1,.36,1)}
.app.sidebar-pinned .main{margin-left:282px}
.topbar{height:78px;min-height:78px;display:flex;align-items:center;padding:0 22px;border-bottom:1px solid var(--line);gap:14px;background:color-mix(in srgb,var(--shell) 94%, transparent);backdrop-filter:blur(16px);position:relative;z-index:5}
.tb-menu{display:none;color:var(--sub);padding:4px}
.tb-search{width:min(360px,34vw);position:relative;flex-shrink:0}
.tb-search input{width:100%;padding:14px 84px 14px 44px;background:var(--shell-input);border:1px solid color-mix(in srgb,var(--line2) 80%, transparent);border-radius:18px;font-size:13px;color:var(--text);transition:border-color .15s,box-shadow .15s}
.tb-search input:focus{box-shadow:0 0 0 4px var(--accent-d)}
.tb-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted)}
.tb-search-kbd{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:10px;font-family:var(--mono);padding:4px 7px;border-radius:10px;border:1px solid var(--line2);background:color-mix(in srgb,var(--bg4) 92%, transparent);color:var(--muted)}
.tb-focus{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:12px;min-width:min(320px,44vw);max-width:min(380px,52vw);padding:10px 14px;border-radius:18px;border:1px solid color-mix(in srgb,var(--accent-b) 72%, transparent);background:linear-gradient(180deg,rgba(var(--accent-rgb) / .16),rgba(255,255,255,.02)),var(--shell-input);box-shadow:0 16px 32px rgba(0,0,0,.2);cursor:pointer;animation:panelIn .24s cubic-bezier(.2,.8,.2,1)}
.tb-focus-copy{display:flex;flex-direction:column;min-width:0;flex:1}
.tb-focus-copy strong{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--sub2)}
.tb-focus-copy span{font-size:15px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tb-focus-bar{width:92px;height:4px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;flex-shrink:0}
.tb-focus-bar span{display:block;height:100%;border-radius:inherit;background:var(--accent)}
.tb-spacer{flex:1;min-width:24px}
.tb-right{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-shrink:0}
.tb-mobile-slot{display:none;flex:1;min-width:0}
.tb-mobile-search{width:100%;height:44px;border-radius:15px;border:1px solid color-mix(in srgb,var(--line2) 80%, transparent);background:var(--shell-input);display:flex;align-items:center;justify-content:flex-start;gap:10px;padding:0 14px;color:var(--muted);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);text-align:left}
.tb-mobile-search span{flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tb-icon{width:46px;height:46px;border-radius:16px;border:1px solid color-mix(in srgb,var(--line2) 80%, transparent);background:var(--shell-input);display:flex;align-items:center;justify-content:center;color:var(--text2);position:relative;transition:all .16s;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.tb-icon:hover{color:var(--text);border-color:var(--line2);transform:translateY(-1px);background:var(--bg4)}
.tb-icon:active,.tb-avatar-btn:active,.tb-mobile-search:active,.tb-menu:active,.btn:active,.choice-pill:active,.settings-tab:active,.account-link:active,.panel-item:active,.notif-card:active{transform:scale(.98)}
.tb-count{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--accent);color:#111;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700}
.tb-avatar{width:42px;height:42px;border-radius:15px;border:1px solid var(--line);overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.015)),var(--bg3);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--accent);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.tb-avatar img{width:100%;height:100%;object-fit:cover}
.tb-avatar-btn{transition:transform .16s,border-color .16s,box-shadow .16s,background .16s}
.tb-avatar-btn:hover{transform:translateY(-1px);border-color:var(--line2);box-shadow:0 14px 28px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.06)}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;transition:all .16s;white-space:nowrap;position:relative;overflow:hidden;transform:translateY(0)}
.btn::after{content:'';position:absolute;top:0;bottom:0;left:-35%;width:28%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-18deg);opacity:0;transition:transform .4s,opacity .25s}
.btn:hover::after{transform:translateX(320%) skewX(-18deg);opacity:1}
.btn-p{background:linear-gradient(180deg,#f5f5f7,#d9d9df);color:#111215;box-shadow:0 16px 28px rgba(255 255 255 / .10)}.btn-p:hover{background:linear-gradient(180deg,#ffffff,#ddddE4);transform:translateY(-1px)}
.btn-g{color:var(--text2);border:1px solid var(--line);background:var(--shell-input)}.btn-g:hover{background:var(--bg4);color:var(--text);transform:translateY(-1px)}
.btn-d{color:var(--red);border:1px solid rgba(216,92,92,.3)}.btn-d:hover{background:var(--red-d);transform:translateY(-1px)}
.btn-sm{padding:5px 10px;font-size:11px}

.content{flex:1;overflow-y:auto;overflow-x:hidden;padding:16px;animation:fadeIn .25s ease;overscroll-behavior:none;position:relative;max-width:100%}
.view-stage{animation:moduleSlide .24s ease}
.view-stage-history-back{animation:moduleSlideBack .28s cubic-bezier(.2,.8,.2,1)}
.view-stage-history-forward{animation:moduleSlideForward .28s cubic-bezier(.2,.8,.2,1)}
.pull-indicator{position:absolute;left:50%;top:-26px;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;border:1px solid var(--line);background:color-mix(in srgb,var(--bg2) 94%, transparent);box-shadow:var(--shadow);z-index:7;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}
.pull-indicator.show{opacity:1}
.pull-indicator span{font-size:11px;color:var(--sub)}
.pull-wheel{width:22px;height:22px;border-radius:50%;border:2px solid color-mix(in srgb,var(--accent) 28%, transparent);border-top-color:var(--accent2);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--accent2)}
.pull-wheel.busy{animation:spin 1s linear infinite}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes moduleSlide{from{opacity:0;transform:translate3d(18px,0,0)}to{opacity:1;transform:none}}
@keyframes moduleSlideBack{from{opacity:.72;transform:translate3d(-28px,0,0)}to{opacity:1;transform:none}}
@keyframes moduleSlideForward{from{opacity:.72;transform:translate3d(28px,0,0)}to{opacity:1;transform:none}}
@keyframes panelIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
@keyframes drawerIn{from{opacity:0;transform:translate3d(28px,0,0)}to{opacity:1;transform:none}}
@keyframes sidebarSlideIn{from{opacity:0;transform:translateX(-22px)}to{opacity:1;transform:none}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes drift{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(14px,18px,0)}}
@keyframes wiggle{0%,100%{transform:rotate(-1.5deg) scale(1.02)}50%{transform:rotate(1.5deg) scale(1.02)}}
@keyframes skeleton{0%{background-position:200% 0}100%{background-position:-200% 0}}
@keyframes voicePulse{0%{box-shadow:0 0 0 0 rgba(216,92,92,.38)}70%{box-shadow:0 0 0 10px rgba(216,92,92,0)}100%{box-shadow:0 0 0 0 rgba(216,92,92,0)}}
@keyframes pulseDot{0%{box-shadow:0 0 0 0 rgba(74,158,110,.45)}70%{box-shadow:0 0 0 8px rgba(74,158,110,0)}100%{box-shadow:0 0 0 0 rgba(74,158,110,0)}}
@keyframes pingDot{0%{box-shadow:0 0 0 0 rgba(74,126,200,.45)}70%{box-shadow:0 0 0 8px rgba(74,126,200,0)}100%{box-shadow:0 0 0 0 rgba(74,126,200,0)}}

.card{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015) 20%,transparent 48%),var(--bg2);border:1px solid var(--line);border-radius:22px;padding:18px;transition:background .3s,transform .18s,border-color .18s,box-shadow .18s}
.card:hover{transform:translateY(-2px);border-color:var(--line2);box-shadow:var(--shadow)}
.card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-title{font-family:var(--serif);font-size:15px}

.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:18px}
.stat{background:linear-gradient(180deg,rgba(255,255,255,.02),transparent 30%),var(--bg2);border:1px solid var(--line);border-radius:16px;padding:14px;transition:background .3s,transform .18s,border-color .18s,box-shadow .18s}
.stat:hover{transform:translateY(-2px);border-color:var(--line2);box-shadow:var(--shadow)}
.stat-label{font-size:10.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
.stat-val{font-family:var(--serif);font-size:24px;letter-spacing:-1px}
.stat-sub{font-size:11px;color:var(--sub);margin-top:2px}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.note-zone-grid{display:flex;flex-direction:column;gap:10px}
.note-zone-card{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px;border-radius:22px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 32%),var(--bg2);transition:border-color .16s,transform .16s,box-shadow .16s;position:relative;overflow:hidden;text-align:left}
.note-zone-card:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.note-zone-card.on{border-color:var(--accent-b);background:linear-gradient(180deg,var(--accent-d),transparent 46%),var(--bg2)}
.note-zone-card strong{display:block;font-size:14px;margin-bottom:4px;text-align:left}
.note-zone-card div span{font-size:12px;color:var(--sub);text-align:left}
.note-card{background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 32%),var(--bg2);border:1px solid var(--line);border-radius:22px;padding:16px;cursor:pointer;transition:border-color .14s,background .3s,transform .14s,box-shadow .14s;position:relative;overflow:hidden}
.note-card:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.note-card-drag{position:absolute;top:0;left:0;right:0;height:18px;cursor:grab;z-index:2}
.note-card-drag:active{cursor:grabbing}
.note-accent{position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--r) var(--r) 0 0}
.note-title{font-size:14px;font-weight:500;margin-bottom:4px;margin-top:6px}
.note-preview{font-size:12px;color:var(--sub);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.note-foot{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.tag{font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg4);color:var(--sub)}
.chip-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.filter-chip{padding:8px 12px;border-radius:999px;border:1px solid var(--line);background:var(--bg2);color:var(--sub);font-size:12px;transition:border-color .14s,background .14s,color .14s}
.filter-chip.on{background:var(--accent-d);border-color:var(--accent-b);color:var(--accent)}

.ne-wrap{display:flex;flex-direction:column;height:100%}
.ne-bar{display:flex;align-items:center;gap:8px;padding:10px 0;flex-wrap:wrap;border-bottom:1px solid var(--line);margin-bottom:12px}
.ne-title{font-size:20px;font-weight:600;background:none;border:none;color:var(--text);width:100%;font-family:var(--serif)}
.ne-title::placeholder{color:var(--muted)}
.ne-body{flex:1;display:flex;min-height:0}
.ne-body textarea{flex:1;background:none;border:none;color:var(--text);resize:none;font-size:14px;line-height:1.7;font-family:var(--sans)}
.ne-body textarea::placeholder{color:var(--muted)}
.ne-foot{display:flex;align-items:center;gap:12px;padding:8px 0;font-size:11px;color:var(--muted);border-top:1px solid var(--line);margin-top:8px}

.k-board{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;min-height:0;flex:1;align-items:flex-start}
.k-col{flex-shrink:0;width:268px;background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 28%),var(--bg2);border:1px solid var(--line);border-radius:24px;display:flex;flex-direction:column;max-height:calc(100vh - 180px);transition:background .3s}
.k-col-hd{display:flex;align-items:center;gap:7px;padding:10px 12px;border-bottom:1px solid var(--line);flex-shrink:0}
.k-col-pip{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.k-col-nm{font-size:11px;font-weight:600;flex:1;text-transform:uppercase;letter-spacing:.5px;color:var(--sub)}
.k-col-ct{font-size:10px;font-family:var(--mono);background:var(--bg4);color:var(--muted);padding:1px 6px;border-radius:99px}
.k-cards{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:7px;scrollbar-width:none}
.k-cards::-webkit-scrollbar{display:none}
.k-card{background:var(--shell-input);border:1px solid var(--line);border-radius:18px;padding:12px;cursor:pointer;transition:border-color .12s,box-shadow .12s,background .3s,transform .12s}
.k-card:hover{border-color:var(--line2);box-shadow:var(--shadow);transform:translateY(-2px)}
.k-card.ring{border-color:var(--accent-b);box-shadow:0 0 0 1px var(--accent-b),var(--shadow)}
.k-card-title{font-size:13px;font-weight:500;margin-bottom:4px}
.k-card-desc{font-size:11px;color:var(--sub);margin-bottom:6px}
.k-card-ft{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.task-modal{background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 22%),var(--bg2);border:1px solid var(--line2);border-radius:24px;width:min(1100px,96vw);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow)}
.task-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}
.task-modal-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);min-height:0;overflow:hidden}
.task-modal-main,.task-modal-side{padding:18px;overflow:auto}
.task-modal-main{border-right:1px solid var(--line)}
.task-modal-stack{display:grid;gap:14px}
.task-modal-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.task-modal-actions{display:flex;gap:8px;flex-wrap:wrap}
.task-modal-quiet{font-size:12px;color:var(--sub)}
.prio{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.k-due{font-size:10px;color:var(--muted);font-family:var(--mono)}
.k-due.over{color:var(--red)}
.k-add{margin:0 8px 8px;border:1px dashed var(--line);border-radius:var(--r-sm);padding:8px;text-align:center;font-size:12px;color:var(--muted);cursor:pointer;transition:all .12s}
.k-add:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-d)}

.cal-shell{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);gap:14px;align-items:start}
.calendar-topbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;flex-wrap:wrap}
.calendar-month-nav{display:flex;align-items:center;gap:10px}
.calendar-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,.7fr);gap:16px;align-items:start}
.calendar-main-surface{display:flex;flex-direction:column;gap:14px;min-height:0}
.calendar-day-shell{display:grid;gap:14px}
.calendar-day-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.calendar-day-actions{display:flex;gap:8px;flex-wrap:wrap}
.calendar-agenda-list{display:flex;flex-direction:column;gap:10px;max-height:calc(100vh - 250px);overflow:auto;padding-right:2px}
.calendar-rail{display:flex;flex-direction:column;gap:10px}
.calendar-event-card{padding:14px 15px;border-radius:18px;border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);background:var(--shell-input);text-align:left;display:flex;flex-direction:column;gap:8px;transition:border-color .15s,transform .15s,box-shadow .15s}
.calendar-event-card:hover{border-color:var(--line2);transform:translateY(-1px);box-shadow:var(--shadow)}
.calendar-event-card strong{font-size:14px;line-height:1.35}
.calendar-event-meta{display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:var(--sub)}
.calendar-event-desc{font-size:12px;color:var(--sub);line-height:1.55}
.calendar-panel{display:flex;flex-direction:column;gap:14px}
.calendar-side-list{display:flex;flex-direction:column;gap:10px;max-height:calc(100vh - 240px);overflow:auto;padding-right:2px}
.calendar-schedule{display:flex;flex-direction:column;gap:10px;max-height:calc(100vh - 260px);overflow:auto;padding-right:2px}
.calendar-inline-actions{display:flex;gap:8px;flex-wrap:wrap}
.calendar-empty-big{padding:20px;border-radius:16px;border:1px dashed var(--line2);background:var(--bg3);font-size:12px;color:var(--sub)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.cal-wd{font-size:10px;font-weight:600;color:var(--muted);text-align:center;padding:8px 0;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--line)}
.cal-cell{min-height:72px;padding:6px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);cursor:pointer;transition:background .1s;position:relative;appearance:none;text-align:left;background:transparent}
.cal-cell:nth-child(7n){border-right:none}
.cal-cell:hover{background:var(--bg3)}
.cal-cell.oth{opacity:.3}
.cal-cell.today{background:rgba(var(--accent-rgb) / .08)}
.cal-cell.selected{background:var(--accent-d)}
.cal-dn{font-size:12px;font-weight:500;margin-bottom:3px}
.cal-cell.today .cal-dn{background:var(--accent);color:#0e0e0e;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600}
.cal-ev{font-size:9px;padding:1px 4px;border-radius:3px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0e0e0e;font-weight:500}
.cal-dot-row{display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:6px}
.cal-dot{width:6px;height:6px;border-radius:999px;background:var(--accent);opacity:.88}
.day-view{display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin-top:14px}
.day-agenda{display:flex;flex-direction:column;gap:10px;max-height:520px;overflow:auto;padding-right:2px}
.day-slot{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:start}
.day-slot-hour{font-size:11px;color:var(--muted);padding-top:10px}
.day-slot-body{min-height:72px;border-radius:16px;border:1px dashed var(--line2);background:var(--bg3);padding:10px;text-align:left;display:flex;flex-direction:column;gap:8px}
.day-slot-body:hover{border-color:var(--accent-b);background:var(--accent-d)}
.day-slot-body.has-events{border-style:solid;background:var(--bg3)}
.day-slot-body.has-events:hover{background:var(--bg3)}
.day-slot-empty{font-size:12px;color:var(--sub)}
.day-event-card{padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--bg2);display:flex;flex-direction:column;gap:4px}
.day-event-card strong{font-size:13px}
.day-event-card span{font-size:11px;color:var(--sub)}
.event-attendee-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.event-attendee-pill{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid var(--line2);font-size:10px;font-weight:600;background:var(--bg3)}
.event-action-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}

.segmented-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.segmented-card{padding:14px;border-radius:14px;border:1px solid var(--line);background:var(--bg3);text-align:left;transition:border-color .15s,background .15s,transform .15s}
.segmented-card strong{display:block;font-size:13px;margin-bottom:4px}
.segmented-card span{display:block;font-size:11px;color:var(--sub);line-height:1.45}
.segmented-card.on{border-color:var(--accent-b);background:var(--accent-d)}
.icon-preset-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.icon-preset{padding:10px 8px;border-radius:14px;border:1px solid var(--line);background:var(--bg3);display:flex;flex-direction:column;align-items:center;gap:6px;transition:border-color .15s,background .15s,transform .15s}
.icon-preset span{font-size:20px}
.icon-preset small{font-size:10px;color:var(--sub)}
.icon-preset.on{border-color:var(--accent-b);background:var(--accent-d)}
.day-picker{display:flex;flex-wrap:wrap;gap:8px}
.day-chip{padding:8px 12px;border-radius:999px;border:1px solid var(--line);background:var(--bg3);font-size:12px;color:var(--sub);transition:border-color .15s,background .15s,color .15s}
.day-chip.on{border-color:var(--accent-b);background:var(--accent-d);color:var(--accent)}
.day-chip.all{font-weight:600}

.habit-week-summary{margin:-4px 0 12px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg2);font-size:12px;color:var(--sub)}
.habit-row{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:13px 15px;display:flex;align-items:center;gap:13px;transition:border-color .12s,background .3s,transform .12s,box-shadow .12s;margin-bottom:8px;flex-wrap:wrap}
.habit-row:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.habit-main{display:flex;align-items:center;gap:13px;flex:1;min-width:220px;text-align:left}
.habit-icon{font-size:20px;width:32px;text-align:center}
.habit-info{flex:1;min-width:0}
.habit-nm{font-size:14px;font-weight:500}
.habit-meta{font-size:11px;color:var(--muted)}
.habit-days{display:flex;gap:6px;flex-wrap:wrap}
.hday{width:36px;height:40px;border-radius:10px;border:1px solid var(--line2);background:var(--bg3);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:9px;color:var(--muted);cursor:pointer;transition:all .15s;font-weight:600}
.hday:hover{border-color:var(--muted)}
.hday.done{background:var(--green);border-color:var(--green);color:#0e0e0e}
.hday.off{opacity:.45;border-style:dashed}
.hday small{font-size:9px;line-height:1;margin-top:2px}
.habit-actions{display:flex;gap:8px;flex-wrap:wrap;opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s}
.habit-row:hover .habit-actions,.habit-row:focus-within .habit-actions{opacity:1;transform:none}
.habit-streak{text-align:right;font-size:20px;font-weight:700;color:var(--accent);font-family:var(--serif);min-width:40px}
.habit-streak small{display:block;font-size:10px;font-weight:400;color:var(--muted);font-family:var(--sans)}

.focus-center{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:24px;padding:40px 0}
.focus-modes{display:flex;gap:6px}
.focus-mode{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:500;color:var(--sub);cursor:pointer;transition:all .15s}
.focus-mode.on{background:var(--accent-d);color:var(--accent)}
.focus-mode:hover{color:var(--text)}
.focus-display{font-family:var(--serif);font-size:72px;letter-spacing:-2px;line-height:1;transition:color .3s}
.focus-display.running{color:var(--accent)}
.focus-lbl{font-size:13px;color:var(--sub);min-height:18px}
.focus-prog{width:280px;height:3px;background:var(--bg4);border-radius:99px;overflow:hidden}
.focus-prog-bar{height:100%;background:var(--accent);border-radius:99px;transition:width 1s linear}
.focus-ctrls{display:flex;gap:8px;align-items:center}
.focus-btn-main{width:52px;height:52px;border-radius:50%;background:var(--accent);color:#0e0e0e;display:flex;align-items:center;justify-content:center;transition:all .15s;box-shadow:0 18px 34px rgba(var(--accent-rgb) / .18)}
.focus-btn-main:hover{background:var(--accent2);transform:scale(1.05)}
.focus-btn-sec{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);color:var(--sub);display:flex;align-items:center;justify-content:center;transition:all .15s}
.focus-btn-sec:hover{background:var(--bg3);color:var(--text)}

.journal-entry{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:16px;margin-bottom:10px;cursor:pointer;transition:border-color .12s,transform .12s,box-shadow .12s}
.journal-entry:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.journal-date{font-family:var(--serif);font-size:16px;margin-bottom:4px}
.journal-mood{font-size:18px;margin-right:8px}
.journal-text{font-size:13px;color:var(--sub);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

.tx-table{width:100%;border-collapse:collapse}
.tx-table th{text-align:left;padding:8px 12px;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--line)}
.tx-table td{padding:10px 12px;font-size:13px;border-bottom:1px solid var(--line)}
.tx-table tr:hover td{background:var(--bg3)}
.tx-amt{font-weight:600;font-variant-numeric:tabular-nums;font-family:var(--mono)}
.tx-in{color:var(--green)}.tx-out{color:var(--red)}

.bm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.bm-grid.rich{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));align-items:start}
.bm-item{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border-color .12s,transform .12s,box-shadow .12s}
.bm-item:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow)}
.bm-fav{width:36px;height:36px;border-radius:var(--r-sm);background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.bm-info{flex:1;min-width:0}.bm-info h4{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bm-info p{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bm-card{display:flex;flex-direction:column;overflow:hidden;border-radius:20px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 22%),var(--bg2);box-shadow:var(--shadow)}
.bm-card-cover{position:relative;aspect-ratio:1.2/1;background:linear-gradient(135deg,var(--accent-d),var(--bg3));overflow:hidden}
.bm-card-cover img{width:100%;height:100%;object-fit:cover;display:block}
.bm-card-fallback{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:48px;color:var(--accent)}
.bm-card-overlay{position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:flex-start}
.bm-card-body{padding:14px;display:flex;flex-direction:column;gap:12px}
.bm-card-head{display:flex;align-items:center;gap:10px}
.bm-card-text{font-size:12px;color:var(--sub);line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bm-card-note{padding:10px 12px;border-radius:14px;background:var(--bg3);border:1px solid var(--line);font-size:12px;color:var(--text);line-height:1.6;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.bm-card-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}

.goal-card{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:16px;transition:border-color .12s,transform .12s,box-shadow .12s}
.goal-card:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.goal-title{font-size:14px;font-weight:500;margin-bottom:10px}
.goal-bar{height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:6px}
.goal-fill{height:100%;background:var(--accent);border-radius:3px;transition:width .5s}
.goal-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--sub)}

.s-group{background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 28%),var(--bg2);border:1px solid var(--line);border-radius:22px;overflow:hidden;margin-bottom:12px}
.s-row{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid var(--line);gap:12px}
.s-row:last-child{border-bottom:none}
.s-lbl{font-size:13px;font-weight:500}
.s-sub{font-size:11px;color:var(--sub);margin-top:1px}
.s-select{background:var(--bg3);border:1px solid var(--line);border-radius:var(--r-sm);padding:6px 10px;font-size:12px;color:var(--text);min-width:130px;cursor:pointer}
.s-select option{background:var(--bg2)}
.settings-shell{display:grid;grid-template-columns:minmax(280px,320px) minmax(0,1fr);gap:16px;align-items:start}
.settings-nav{display:grid;gap:14px}
.settings-profile-card{display:flex;align-items:center;gap:14px;padding:18px;border-radius:26px;border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.018) 24%,transparent 72%),var(--shell-2);text-align:left;box-shadow:var(--shadow);transition:transform .18s,border-color .18s,box-shadow .18s}
.settings-profile-card:hover{transform:translateY(-2px);border-color:var(--line2);box-shadow:0 20px 44px rgba(0,0,0,.18)}
.settings-profile-avatar{width:58px;height:58px;border-radius:20px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(var(--accent-rgb) / .22),rgba(255,255,255,.03)),var(--bg3);border:1px solid color-mix(in srgb,var(--accent) 28%, transparent);color:var(--accent);font-size:20px;font-weight:700;flex-shrink:0}
.settings-profile-avatar img{width:100%;height:100%;object-fit:cover}
.settings-profile-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.settings-profile-copy strong{font-size:16px;line-height:1.25}
.settings-profile-copy span,.settings-profile-copy small{color:var(--sub);font-size:12px;line-height:1.4}
.settings-nav-group{display:grid;gap:8px}
.settings-nav-group-title{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);padding:0 6px}
.settings-nav-card{display:grid;border-radius:24px;border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);background:var(--bg2);overflow:hidden}
.settings-tab{display:flex;align-items:center;gap:12px;padding:15px 16px;border-radius:0;border:none;border-bottom:1px solid color-mix(in srgb,var(--line) 92%, transparent);background:transparent;color:var(--sub);transition:all .16s;text-align:left}
.settings-nav-card .settings-tab:last-child{border-bottom:none}
.settings-tab:hover{border-color:var(--line2);transform:translateY(-1px);color:var(--text)}
.settings-tab.on{background:linear-gradient(180deg,rgba(var(--accent-rgb) / .14),transparent 120%),var(--bg3);color:var(--text)}
.settings-tab-icon{width:42px;height:42px;border-radius:15px;background:color-mix(in srgb,var(--accent) 12%, transparent);border:1px solid color-mix(in srgb,var(--accent) 24%, transparent);display:grid;place-items:center;color:var(--accent2);flex-shrink:0;line-height:0}
.settings-tab-icon > *,.settings-tab-icon svg{width:20px;height:20px;display:block;flex:none;margin:auto}
.settings-tab-copy{min-width:0;flex:1}
.settings-tab strong{display:block;font-size:15px}
.settings-tab span{display:block;font-size:11px;opacity:.84;margin-top:3px;line-height:1.45}
.settings-nav-chevron{display:inline-flex;align-items:center;justify-content:center;color:var(--muted);flex-shrink:0}
.settings-panel{min-width:0}
.settings-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;background:linear-gradient(180deg,rgba(255,255,255,.02),transparent 40%),var(--bg2);border:1px solid var(--line);border-radius:26px;padding:20px;margin-bottom:16px;overflow:hidden;position:relative;box-shadow:var(--shadow)}
.settings-hero::after{content:'';position:absolute;right:-40px;top:-40px;width:160px;height:160px;border-radius:999px;background:radial-gradient(circle,var(--accent-b) 0%,transparent 70%);pointer-events:none}
.settings-hero-copy{position:relative}
.settings-hero-kicker{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.settings-hero h2{font-family:var(--serif);font-size:28px;margin-bottom:6px;position:relative}
.settings-hero p{font-size:12px;color:var(--sub);max-width:520px;position:relative;line-height:1.55}
.settings-hero-meta{display:flex;flex-direction:column;align-items:flex-end;gap:10px;position:relative}
.settings-hero-badges{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.settings-back-btn{display:none;align-items:center;gap:8px;margin-bottom:14px;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--shell-input);color:var(--text2)}
.settings-back-btn span:first-child{display:inline-flex;transform:rotate(180deg)}
.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.settings-card{background:var(--bg2);border:1px solid var(--line);border-radius:16px;padding:16px}
.settings-card h3{font-family:var(--serif);font-size:17px;margin-bottom:4px}
.settings-card p{font-size:12px;color:var(--sub);margin-bottom:14px}
.settings-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.settings-form .field{margin-bottom:0}
.settings-form .field.span-2{grid-column:1 / -1}
.settings-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px;flex-wrap:wrap}
.settings-note{font-size:11px;color:var(--sub);margin-top:10px}
.shortcut-groups{display:grid;gap:14px}
.shortcut-group{padding:16px;border-radius:18px;border:1px solid var(--line);background:var(--bg2)}
.shortcut-row{align-items:center}
.shortcut-copy{min-width:0;flex:1}
.shortcut-default{margin-top:6px;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.35px}
.shortcut-trigger{min-width:220px;padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg3);font-family:var(--mono);font-size:12px;color:var(--text);text-align:center;transition:border-color .16s,background .16s,transform .16s}
.shortcut-trigger:hover{border-color:var(--line2);transform:translateY(-1px)}
.shortcut-trigger.on{border-color:var(--accent-b);background:var(--accent-d);color:var(--accent)}
.appearance-swatches{display:flex;gap:10px;flex-wrap:wrap}
.appearance-swatch{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:var(--bg3);color:var(--sub);transition:all .16s}
.appearance-swatch.on{border-color:var(--accent-b);background:var(--accent-d);color:var(--text)}
.activity-list{display:flex;flex-direction:column;gap:10px}
.activity-item{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg2)}
.activity-dot{width:10px;height:10px;border-radius:50%;margin-top:5px;background:var(--accent);box-shadow:0 0 0 6px var(--accent-d)}
.activity-copy strong{display:block;font-size:13px}
.activity-copy span{display:block;font-size:11px;color:var(--sub);margin-top:2px}
.plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.plan-card{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:16px;border:1px solid var(--line);background:var(--bg2);position:relative;overflow:hidden}
.plan-card.current{border-color:var(--accent-b);box-shadow:0 10px 28px rgba(0,0,0,.14)}
.plan-card.current::before{content:'Actif';position:absolute;top:14px;right:14px;padding:4px 8px;border-radius:999px;background:var(--accent);color:#0e0e0e;font-size:10px;font-weight:700}
.plan-head h3{font-family:var(--serif);font-size:18px}
.plan-desc{font-size:12px;color:var(--sub)}
.plan-price{font-size:24px;font-family:var(--serif)}
.plan-features{display:flex;flex-direction:column;gap:8px;font-size:12px;color:var(--text2)}
.plan-features div{display:flex;gap:8px;align-items:flex-start}
.muted-box{padding:12px 14px;border-radius:14px;border:1px dashed var(--line2);background:var(--bg3);font-size:12px;color:var(--sub)}
.dashboard-shell{display:flex;flex-direction:column;gap:16px;height:100%;min-height:0}
.dashboard-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}
.dashboard-title{font-size:34px;font-weight:700;letter-spacing:-.04em}
.dashboard-subtitle{font-size:13px;color:var(--sub);margin-top:6px;max-width:620px}
.dashboard-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dashboard-segmented{display:flex;gap:8px;flex-wrap:wrap;padding:8px;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid var(--line)}
.dashboard-range-btn{padding:10px 14px;border-radius:14px;color:var(--sub);font-size:12px;font-weight:600;transition:all .18s}
.dashboard-range-btn.on{background:rgba(255,255,255,.08);color:var(--text);box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 12px 24px rgba(0,0,0,.18)}
.dashboard-date-pill{padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:var(--shell-input);font-size:12px;color:var(--text2)}
.dashboard-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.dashboard-stat-card{padding:18px;border-radius:24px;border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02) 40%,transparent 100%),var(--shell-card)}
.dashboard-stat-card.primary{background:linear-gradient(135deg,rgba(255,255,255,.05),rgba(var(--accent-rgb) / .14)),var(--shell-card)}
.dashboard-stat-card span{display:block;font-size:12px;color:var(--sub)}
.dashboard-stat-card strong{display:block;font-size:34px;letter-spacing:-.04em;margin-top:10px}
.dashboard-stat-card small{display:block;font-size:11px;color:var(--muted);margin-top:8px}
.hero-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:16px}
.dashboard-hero-main{min-height:320px}
.dashboard-hero-head{align-items:stretch}
.dashboard-hero-side{display:flex;align-items:stretch;justify-content:flex-end}
.dashboard-mini-calendar{width:min(320px,100%);padding:18px;border-radius:26px;border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);background:rgba(255,255,255,.03)}
.dashboard-mini-calendar-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}
.dashboard-mini-calendar-head button{width:34px;height:34px;border-radius:12px;border:1px solid var(--line);background:var(--shell-input);display:flex;align-items:center;justify-content:center;color:var(--text2)}
.dashboard-mini-calendar-strip{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.dashboard-mini-day{padding:12px 10px;border-radius:18px;border:1px solid transparent;background:rgba(255,255,255,.02);text-align:center}
.dashboard-mini-day span{display:block;font-size:10px;color:var(--muted);text-transform:uppercase}
.dashboard-mini-day strong{display:block;font-size:18px;margin-top:8px}
.dashboard-mini-day.on{background:rgba(255,255,255,.08);border-color:var(--line2);box-shadow:0 14px 28px rgba(0,0,0,.18)}
.dashboard-side-panel{min-height:320px}
.hero-main{padding:28px;border-radius:30px;background:
  radial-gradient(circle at top left,rgba(var(--accent-rgb) / .14),transparent 34%),
  linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.018) 26%,transparent 60%),
  var(--shell-2);border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);box-shadow:var(--shadow);position:relative;overflow:hidden}
.hero-main::after{content:'';position:absolute;inset:-24% auto auto -10%;width:260px;height:220px;background:radial-gradient(circle,rgba(var(--accent-rgb) / .12) 0%,transparent 72%);pointer-events:none}
.hero-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}
.hero-title{font-size:52px;line-height:1.02;font-weight:800;letter-spacing:-.055em;max-width:12ch}
.hero-sub{font-size:15px;color:var(--sub);max-width:620px;margin-top:10px;line-height:1.65}
.hero-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.hero-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.hero-mini{padding:20px;border-radius:24px;background:var(--shell-card);border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);min-height:150px;display:flex;flex-direction:column;justify-content:space-between}
.hero-mini h4{font-size:13px;color:var(--sub);margin-bottom:10px}
.hero-mini .big{font-size:38px;font-weight:700;letter-spacing:-1.3px}
.hero-mini .muted{font-size:12px;color:var(--sub);margin-top:8px;line-height:1.55}
.surface{background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.012) 22%,transparent 54%),var(--shell-2);border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);border-radius:30px;padding:20px;box-shadow:var(--shadow)}
.surface-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.surface-title{font-size:20px;font-weight:700;letter-spacing:-.02em}
.surface-sub{font-size:12px;color:var(--sub);line-height:1.55}
.bar-chart{display:flex;align-items:flex-end;gap:12px;height:220px;padding-top:16px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:10px}
.bar-stick{width:100%;max-width:34px;border-radius:14px 14px 10px 10px;background:linear-gradient(180deg,var(--accent2),rgba(93,143,214,.24));border:1px solid var(--accent-b);min-height:14px}
.bar-label{font-size:11px;color:var(--muted)}
.list-rows{display:flex;flex-direction:column;gap:10px}
.list-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;border-radius:18px;background:var(--shell-input);border:1px solid color-mix(in srgb,var(--line2) 86%, transparent)}
.list-row.clickable{text-align:left;transition:border-color .15s,transform .15s,box-shadow .15s}
.list-row.clickable:hover{border-color:var(--line2);transform:translateY(-1px);box-shadow:var(--shadow)}
.list-main{display:flex;align-items:center;gap:10px;min-width:0}
.list-icon{width:42px;height:42px;border-radius:14px;background:color-mix(in srgb, var(--accent) 12%, transparent);border:1px solid color-mix(in srgb, var(--accent) 30%, transparent);display:flex;align-items:center;justify-content:center;color:var(--accent2);box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.list-copy{min-width:0}
.list-copy strong{display:block;font-size:13px;white-space:normal;overflow:hidden;text-overflow:ellipsis;line-height:1.35}
.list-copy span{display:block;font-size:11px;color:var(--sub);margin-top:3px;line-height:1.45}
.dashboard-widgets{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;min-height:0;flex:1;align-content:start;align-items:start;grid-auto-rows:max-content}
.dashboard-widget{min-height:0;grid-column:auto;overflow:hidden;align-self:start;contain:layout paint}
.dashboard-widget,.note-card,.k-card,.k-col{transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease,background .22s ease,width .22s ease}
.dashboard-widget.dragging,.note-card.dragging,.k-card.dragging{opacity:.92;transform:rotate(-1.6deg) scale(1.02);box-shadow:0 22px 44px rgba(0,0,0,.28)}
.dashboard-widget{cursor:default}
.dashboard-widget-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;cursor:grab;user-select:none}
.dashboard-widget-head:active{cursor:grabbing}
.dashboard-widget .list-rows{gap:10px}
.dashboard-widget-activity .list-rows{max-height:420px;overflow:auto;padding-right:4px}
.dashboard-widget-week .bar-chart{overflow:hidden}
.dashboard-widget .list-row{padding:12px 14px}
.quick-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.quick-card{padding:18px;border-radius:22px;border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);background:var(--shell-card);text-align:left;transition:border-color .16s,transform .16s,box-shadow .16s;min-height:140px;display:flex;flex-direction:column;justify-content:space-between}
.quick-card:hover{border-color:var(--line2);transform:translateY(-1px);box-shadow:var(--shadow)}
.quick-card .list-icon{margin-bottom:14px}
.quick-card strong{display:block;font-size:15px;line-height:1.3}
.quick-card span{display:block;font-size:12px;color:var(--sub);margin-top:6px;line-height:1.45}
.contact-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.contact-card{display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px;border-radius:22px;border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);background:var(--shell-card);text-align:left;transition:border-color .16s,transform .16s,box-shadow .16s;min-height:160px}
.contact-card:hover{border-color:var(--line2);transform:translateY(-1px);box-shadow:var(--shadow)}
.contact-card .conv-avatar{width:48px;height:48px;border-radius:16px}
.contact-card strong{display:block;font-size:14px;line-height:1.35}
.contact-card span{display:block;font-size:12px;color:var(--sub);line-height:1.45}
.pill{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;background:var(--shell-input);border:1px solid color-mix(in srgb,var(--line2) 86%, transparent);font-size:11px;color:var(--sub2)}
.choice-row{display:flex;gap:8px;flex-wrap:wrap}
.choice-pill{padding:8px 11px;border-radius:12px;border:1px solid var(--line);background:var(--bg3);color:var(--sub);transition:all .15s}
.choice-pill.on{background:var(--accent-d);border-color:var(--accent-b);color:var(--text)}
.panel-pop{position:absolute;top:62px;right:16px;width:min(396px,calc(100vw - 32px));border-radius:28px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 24%),var(--bg2);box-shadow:var(--shadow);padding:16px;z-index:450;backdrop-filter:blur(18px);animation:panelIn .22s cubic-bezier(.2,.8,.2,1)}
.sb-account-pop{position:absolute;left:calc(100% + 12px);right:auto;bottom:16px;width:286px;border-radius:24px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 24%),var(--bg2);box-shadow:var(--shadow);padding:14px;z-index:260;backdrop-filter:blur(18px);animation:panelIn .22s cubic-bezier(.2,.8,.2,1)}
.sb.compact .sb-account-pop{left:calc(100% + 12px);right:auto;bottom:12px;width:286px}
.sb-help-pop{position:absolute;left:calc(100% + 12px);bottom:124px;width:286px;border-radius:24px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 24%),var(--bg2);box-shadow:var(--shadow);padding:14px;z-index:260;backdrop-filter:blur(18px);animation:panelIn .22s cubic-bezier(.2,.8,.2,1)}
.sb.compact .sb-help-pop{left:calc(100% + 12px);bottom:116px;width:286px}
.sb-account-pop::before,.sb-help-pop::before{content:"";position:absolute;top:0;bottom:0;left:-18px;width:24px;background:transparent}
.panel-pop h4{font-size:15px;margin-bottom:4px}
.panel-pop p{font-size:12px;color:var(--sub);margin-bottom:12px}
.panel-list{display:flex;flex-direction:column;gap:10px;max-height:420px;overflow:auto}
.panel-item{padding:12px 13px;border-radius:16px;background:var(--shell-input);border:1px solid var(--line);width:100%;text-align:left}
.panel-item.selected{background:var(--accent-d);border-color:var(--accent-b)}
.panel-item strong{display:block;font-size:13px}
.panel-item span{display:block;font-size:11px;color:var(--sub);margin-top:3px}
.panel-item.slim{display:flex;align-items:center;justify-content:space-between;gap:12px}
.panel-item.slim strong{margin:0}
.account-panel-head{display:flex;align-items:center;gap:14px;padding:10px 4px 16px;margin-bottom:12px;border-bottom:1px solid var(--line)}
.sb-account-pop .account-panel-head{padding:4px 2px 12px;margin-bottom:10px}
.account-panel-avatar{width:56px;height:56px;border-radius:18px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(var(--accent-rgb) / .22),rgba(255,255,255,.03)),var(--bg3);border:1px solid color-mix(in srgb,var(--accent) 28%, transparent);color:var(--accent);font-size:18px;font-weight:700;flex-shrink:0}
.account-panel-avatar img{width:100%;height:100%;object-fit:cover}
.account-panel-meta strong{display:block;font-size:17px;line-height:1.2}
.account-panel-meta span,.account-panel-meta small{display:block;font-size:12px;color:var(--sub);margin-top:4px}
.account-grid{display:grid;gap:10px}
.sb-account-pop .account-grid{gap:8px}
.account-group-sep{height:1px;background:linear-gradient(90deg,transparent,var(--line2),transparent);margin:2px 0}
.account-link{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:18px;border:1px solid color-mix(in srgb, var(--line2) 88%, transparent);background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 88%),rgba(255,255,255,.02);text-align:left;transition:border-color .18s,background .18s,transform .18s,box-shadow .18s}
.account-link:hover{border-color:var(--line2);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 88%),rgba(255,255,255,.03);transform:translateY(-1px);box-shadow:0 16px 32px rgba(0,0,0,.16)}
.account-link-copy{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
.account-link strong{display:block;font-size:14px;line-height:1.25}
.account-link span{display:block;font-size:11px;color:var(--sub);margin-top:0;line-height:1.45}
.account-link-icon{width:42px;height:42px;border-radius:14px;background:color-mix(in srgb, var(--accent) 11%, transparent);border:1px solid color-mix(in srgb, var(--accent) 24%, transparent);display:grid;place-items:center;color:var(--accent2);flex-shrink:0;line-height:0}
.account-link-icon > *,.account-link-icon svg{width:20px;height:20px;display:block;flex:none;margin:auto}
.account-link-arrow{display:inline-flex;align-items:center;justify-content:center;color:var(--muted);flex-shrink:0}
.notif-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin-bottom:10px;border-radius:16px;background:linear-gradient(180deg,rgba(var(--accent-rgb) / .08),transparent 70%),#1a1c20;border:1px solid var(--line)}
.notif-summary strong{font-size:13px}
.notif-summary span{font-size:11px;color:var(--sub)}
.sheet-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.48);backdrop-filter:blur(10px);z-index:430;animation:fadeIn .18s ease}
.sheet{position:fixed;top:18px;right:18px;bottom:18px;width:min(430px,calc(100vw - 24px));border-radius:30px;border:1px solid var(--line2);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 18%),var(--bg2);box-shadow:0 24px 80px rgba(0,0,0,.28);z-index:440;padding:18px;display:flex;flex-direction:column;animation:drawerIn .24s cubic-bezier(.2,.8,.2,1)}
.sheet-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:14px}
.sheet-kicker{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-bottom:6px}
.sheet-head h4{font-size:24px;margin-bottom:6px}
.sheet-head p{font-size:12px;color:var(--sub);line-height:1.5}
.sheet-close{width:42px;height:42px;border-radius:14px;border:1px solid var(--line);background:var(--shell-input);display:flex;align-items:center;justify-content:center;color:var(--sub2);flex-shrink:0}
.sheet-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.sheet-list{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto;padding-right:2px}
.notif-device-card{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 15px;border-radius:20px;border:1px solid color-mix(in srgb,var(--accent) 22%, transparent);background:linear-gradient(180deg,rgba(var(--accent-rgb) / .14),rgba(255,255,255,.03) 24%,transparent 100%),var(--shell-input);margin-bottom:12px}
.notif-device-copy{min-width:0;flex:1}
.notif-device-copy strong{display:block;font-size:14px;line-height:1.35}
.notif-device-copy span{display:block;font-size:11px;color:var(--sub);margin-top:4px;line-height:1.5}
.notif-card{display:flex;align-items:flex-start;gap:12px;width:100%;padding:14px;border-radius:20px;border:1px solid var(--line);background:var(--shell-input);text-align:left;transition:border-color .16s,transform .16s,background .16s,box-shadow .16s}
.notif-card:hover{border-color:var(--line2);transform:translateY(-1px);box-shadow:var(--shadow)}
.notif-card.unread{border-color:color-mix(in srgb,var(--accent) 26%, var(--line));background:linear-gradient(180deg,rgba(var(--accent-rgb) / .12),transparent 100%),var(--shell-input)}
.notif-card-icon{width:42px;height:42px;border-radius:15px;background:color-mix(in srgb, var(--accent) 11%, transparent);border:1px solid color-mix(in srgb, var(--accent) 24%, transparent);display:flex;align-items:center;justify-content:center;color:var(--accent2);flex-shrink:0}
.notif-card-copy{min-width:0;flex:1}
.notif-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.notif-card-head strong{font-size:13px;line-height:1.4}
.notif-card-head span{font-size:10px;color:var(--muted);white-space:nowrap}
.notif-card-copy > span{display:block;font-size:11px;color:var(--sub);margin-top:5px;line-height:1.5}
.notif-item{display:flex;align-items:flex-start;gap:12px}
.notif-copy{min-width:0;flex:1}
.notif-copy strong{display:block;font-size:13px;line-height:1.35}
.notif-copy span{display:block;font-size:11px;color:var(--sub);margin-top:4px;line-height:1.45}
.notif-meta{font-size:10px;color:var(--muted);white-space:nowrap}
.account-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.account-tool{flex:1;min-width:120px;padding:10px 12px;border-radius:14px;border:1px solid var(--line);background:var(--bg3);display:flex;align-items:center;justify-content:center;gap:8px;font-size:11px;font-weight:600;color:var(--text2);transition:all .16s}
.account-tool:hover{border-color:var(--accent-b);background:var(--accent-d);color:var(--text)}
.confirm-overlay{position:fixed;inset:0;z-index:990;background:rgba(0,0,0,.56);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:18px}
.confirm-card{width:min(440px,100%);border-radius:26px;border:1px solid var(--line2);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 18%),var(--bg2);box-shadow:var(--shadow);padding:22px}
.confirm-card h3{font-size:20px;margin-bottom:8px}
.confirm-card p{font-size:13px;color:var(--sub);line-height:1.6}
.confirm-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;flex-wrap:wrap}
.note-shell{display:flex;flex-direction:column;gap:16px;height:100%;min-height:0}
.note-header-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.note-search-wrap{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.note-search{position:relative;min-width:240px;flex:1;max-width:420px}
.note-search input{width:100%;padding:13px 16px 13px 42px;background:var(--shell-input);border:1px solid color-mix(in srgb,var(--line2) 80%, transparent);border-radius:18px;transition:border-color .16s,box-shadow .16s,transform .12s}
.note-search input:focus{border-color:var(--accent-b);box-shadow:0 0 0 3px rgba(var(--accent-rgb) / .14),0 0 18px rgba(var(--accent-rgb) / .18);transform:translateY(-1px)}
.note-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)}
.note-back-btn{width:48px;height:48px;border-radius:16px;border:1px solid color-mix(in srgb,var(--line2) 80%, transparent);background:linear-gradient(180deg,rgba(255,255,255,.045),transparent 100%),var(--shell-input);display:flex;align-items:center;justify-content:center;color:var(--text2);box-shadow:var(--shadow);transition:border-color .16s,transform .16s,box-shadow .16s,color .16s}
.note-back-btn:hover{border-color:var(--accent-b);color:var(--text);transform:translateY(-1px);box-shadow:0 16px 36px rgba(0,0,0,.24)}
.note-search-pop{position:absolute;top:calc(100% + 8px);left:0;right:0;display:grid;gap:6px;padding:10px;border-radius:18px;border:1px solid var(--line);background:var(--bg2);box-shadow:var(--shadow);z-index:80}
.note-search-item,.note-search-empty{padding:10px 12px;border-radius:14px;text-align:left}
.note-search-item:hover{background:var(--bg3)}
.note-search-item strong{display:block;font-size:13px}
.note-search-item span,.note-search-empty{display:block;font-size:11px;color:var(--sub);margin-top:4px}
.note-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.note-toolbar-group{display:flex;align-items:center;gap:6px;padding:6px;border-radius:22px;border:1px solid var(--line);background:var(--shell-input);position:relative}
.note-tool{width:48px;height:48px;border-radius:16px;border:1px solid transparent;display:flex;align-items:center;justify-content:center;color:var(--text2);transition:all .16s;position:relative}
.note-tool:hover,.note-tool.on{background:var(--accent-d);border-color:var(--accent-b);color:var(--text)}
.note-pop{position:absolute;top:62px;left:0;min-width:260px;border-radius:24px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 24%),var(--bg2);box-shadow:var(--shadow);padding:14px;z-index:520}
.note-pop.right{left:auto;right:0}
.note-type-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.note-type-size{display:flex;align-items:center;gap:8px}
.note-type-size select{min-width:74px}
.note-context-menu{position:fixed;z-index:700;min-width:240px;border-radius:22px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 24%),var(--bg2);box-shadow:var(--shadow);padding:10px}
.note-menu-list{display:flex;flex-direction:column;gap:6px}
.note-menu-btn{display:flex;align-items:center;gap:12px;padding:11px 10px;border-radius:14px;text-align:left}
.note-menu-btn:hover{background:var(--bg3)}
.note-editor-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;min-height:0;flex:1;align-items:stretch}
.note-editor-grid.with-sidebar{grid-template-columns:300px minmax(0,1fr);flex:1;align-items:stretch}
.note-editor-main{display:flex;flex-direction:column;min-height:0}
.note-editor-card{position:relative;display:flex;flex-direction:column;min-height:calc(100vh - 220px);max-height:calc(100vh - 220px);padding:22px 22px 18px;border-radius:28px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015) 20%,transparent 48%),var(--bg2);border:1px solid var(--line);overflow:hidden}
.note-editor-title{font-size:34px;font-weight:800;letter-spacing:-.04em;background:none;border:none;color:var(--text);margin-bottom:12px}
.note-editor-card.locked .note-editor-text{opacity:0;pointer-events:none;user-select:none}
.note-editor-text{flex:1;min-height:0;padding:0 2px 8px 0;background:none;border:none;color:var(--text);font-size:15px;line-height:1.75;overflow-y:auto;outline:none;white-space:pre-wrap}
.note-editor-text img{max-width:100%;border-radius:18px;display:block}
.note-editor-text .note-check-row{display:inline-flex;align-items:center;gap:12px;margin:0 0 0 2px;min-width:0;max-width:100%;vertical-align:middle}
.note-editor-text .note-check-row input{appearance:none;-webkit-appearance:none;width:28px;height:28px;border-radius:999px;border:2px solid color-mix(in srgb,var(--accent) 42%, var(--line));background:transparent;cursor:pointer;flex-shrink:0;position:relative;transition:transform .14s,border-color .16s,background .18s,box-shadow .18s;margin-top:2px}
.note-editor-text .note-check-row input:hover{transform:scale(1.04);box-shadow:0 0 0 3px rgba(var(--accent-rgb) / .12)}
.note-editor-text .note-check-row input:checked{background:var(--accent);border-color:var(--accent)}
.note-editor-text .note-check-row input:checked::after{content:"✓";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:#111;animation:checkPop .16s ease}
.note-editor-text .note-check-row span{flex:1;display:inline;min-width:0}
.note-embed{position:relative;display:inline-block;max-width:100%;min-width:180px;resize:both;overflow:auto;margin:14px 0;border-radius:22px}
.note-embed::after{content:"";position:absolute;right:8px;bottom:8px;width:12px;height:12px;border-right:2px solid rgba(255,255,255,.75);border-bottom:2px solid rgba(255,255,255,.75);opacity:0;transition:opacity .16s;pointer-events:none}
.note-embed:hover::after{opacity:1}
.note-embed.selected{outline:1px solid var(--accent-b);box-shadow:0 0 0 3px rgba(var(--accent-rgb) / .12)}
.note-inline-image{margin:0;display:block;width:100%;height:auto}
.note-inline-file{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px;border-radius:22px;background:#6a615f;border:1px solid rgba(255,255,255,.08);margin:0;color:#f4eeea;min-height:118px}
.note-inline-file strong{display:block;font-size:16px}
.note-inline-file span{display:block;font-size:11px;opacity:.78;margin-top:4px}
.note-inline-file-icon{width:48px;height:48px;border-radius:16px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.note-locked-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(17,18,21,.42);backdrop-filter:blur(8px)}
.note-attachments{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.note-attachment-chip{display:inline-flex;align-items:center;gap:8px;padding:8px 11px;border-radius:12px;border:1px solid var(--line);background:var(--bg3);font-size:11px}
.note-side-card{padding:16px;border-radius:24px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015) 20%,transparent 48%),var(--bg2);border:1px solid var(--line);display:flex;flex-direction:column;gap:12px;min-height:calc(100vh - 220px);overflow:auto;height:100%;align-self:stretch}
.note-side-title{font-size:15px;font-weight:700}
.note-zone-layout{display:grid;grid-template-columns:300px minmax(0,1fr);gap:16px;align-items:stretch;min-height:0;flex:1}
.note-zone-side{display:grid;gap:12px}
.note-zone-divider{padding-right:16px;border-right:1px solid var(--line)}
.note-zone-lined{padding-left:16px}
.note-zone-metrics{display:grid;gap:10px}
.note-zone-metric{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 13px;border-radius:16px;border:1px solid var(--line);background:var(--shell-input)}
.note-zone-metric strong{font-size:13px}
.note-zone-metric span{font-size:11px;color:var(--sub)}
.note-zone-main{display:grid;gap:12px;min-height:0}
.note-zone-main-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.note-zone-main-head h3{font-size:18px}
.note-zone-main-head p{font-size:12px;color:var(--sub)}
.note-zone-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.note-star-badge{position:absolute;top:14px;right:14px;width:28px;height:28px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:var(--accent-d);border:1px solid var(--accent-b);color:var(--accent)}
.note-view-panel{display:flex;flex-direction:column;min-height:0;flex:1}
.note-side-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.note-side-list{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto;padding-right:2px}
.note-stage{animation:noteStageIn .2s ease}
.note-stage.back{animation:noteStageBack .2s ease}
.note-stage-title{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.note-stage-title h3{font-size:18px}
.note-stage-title span{font-size:11px;color:var(--sub)}
.note-group-stack{display:flex;flex-direction:column;gap:18px}
.note-group-row{display:flex;flex-direction:column;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--line)}
.note-group-row:last-child{border-bottom:none;padding-bottom:0}
.note-group-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.note-group-head strong{font-size:15px}
.note-group-head span{font-size:11px;color:var(--sub)}
@keyframes checkPop{from{transform:scale(.7);opacity:.4}to{transform:scale(1);opacity:1}}
@keyframes flowSplashZoom{0%{transform:perspective(1800px) translateZ(-1600px) scale(.08);opacity:0}46%{opacity:1}100%{transform:perspective(1800px) translateZ(0) scale(1);opacity:1}}
@keyframes flowSplashExit{from{transform:scale(1);opacity:1;filter:blur(0)}to{transform:scale(.88);opacity:0;filter:blur(10px)}}
@keyframes flowSplashReverse{from{transform:perspective(1800px) translateZ(0) scale(1);opacity:1;filter:blur(0)}to{transform:perspective(1800px) translateZ(1200px) scale(3.2);opacity:0;filter:blur(8px)}}
@keyframes flowSplashGlow{from{transform:scale(.92);opacity:.24}to{transform:scale(1);opacity:.75}}
@keyframes flowAutofill{from{opacity:1}to{opacity:1}}
@keyframes noteStageIn{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
@keyframes noteStageBack{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
.widget-hidden{display:none !important}
.cp-overlay{position:fixed;inset:0;z-index:980;background:rgba(0,0,0,.56);backdrop-filter:blur(8px);display:flex;align-items:flex-start;justify-content:center;padding:88px 18px 18px}
.cp-shell{width:min(720px,100%);border-radius:26px;border:1px solid var(--line2);background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 18%),var(--bg2);box-shadow:var(--shadow);overflow:hidden}
.cp-head{padding:16px;border-bottom:1px solid var(--line)}
.cp-search{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;border:1px solid var(--line);background:var(--bg3)}
.cp-search svg{color:var(--muted);flex-shrink:0}
.cp-search input{width:100%;font-size:15px}
.cp-search-meta{display:flex;align-items:center;gap:8px;padding:10px 16px 0;color:var(--sub);font-size:11px}
.cp-body{padding:8px;display:flex;flex-direction:column;gap:8px;max-height:min(62vh,560px);overflow:auto}
.cp-item{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-radius:18px;border:1px solid transparent;background:transparent;transition:border-color .15s,background .15s,transform .15s;text-align:left;width:100%}
.cp-item:hover,.cp-item.on{background:var(--accent-d);border-color:var(--accent-b);transform:translateY(-1px)}
.cp-item-copy{min-width:0}
.cp-item-copy strong{display:block;font-size:14px}
.cp-item-copy span{display:block;font-size:12px;color:var(--sub);margin-top:4px}
.cp-kind{padding:5px 8px;border-radius:999px;background:var(--bg3);border:1px solid var(--line);font-size:10px;font-weight:700;letter-spacing:.35px;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.cp-empty{padding:28px 20px;text-align:center;color:var(--sub);font-size:12px}
.cp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--line);font-size:11px;color:var(--sub);background:rgba(255,255,255,.01)}
.cp-hints{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cp-kbd{padding:3px 6px;border-radius:8px;border:1px solid var(--line2);background:var(--bg3);font-family:var(--mono);font-size:10px;color:var(--text2)}
.link-pack{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.link-chip{padding:6px 10px;border-radius:999px;border:1px solid var(--line);background:var(--bg3);font-size:11px;color:var(--sub);transition:all .15s}
.link-chip:hover{border-color:var(--accent-b);color:var(--text);background:var(--accent-d)}
.drag-target,.drop-preview{border-color:var(--accent-b) !important;background:linear-gradient(180deg,rgba(59,130,246,.16),rgba(59,130,246,.08)) !important;box-shadow:0 0 0 1px rgba(96,165,250,.22),0 18px 34px rgba(16,24,40,.22)}
.offline-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(216,92,92,.14);border:1px solid rgba(216,92,92,.28);color:#ffd3d3;font-size:11px;font-weight:700}
.skeleton{position:relative;overflow:hidden;background:linear-gradient(90deg,#232323 0%,#2c2c2c 48%,#232323 100%);background-size:200% 100%;animation:skeleton 1.25s ease-in-out infinite;border:1px solid rgba(255,255,255,.03)}
.conv-shell{display:grid;grid-template-columns:320px minmax(0,1fr);gap:14px;height:calc(100vh - 112px)}
.conv-sidebar,.conv-main{background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 24%),var(--bg2);border:1px solid var(--line);border-radius:22px;min-height:0}
.conv-sidebar{display:flex;flex-direction:column;padding:14px}
.conv-search{margin-bottom:12px}
.conv-list{display:flex;flex-direction:column;gap:8px;overflow:auto;padding-right:2px}
.conv-item{padding:12px;border-radius:16px;border:1px solid var(--line);background:var(--bg3);text-align:left;transition:all .15s}
.conv-item.on{border-color:var(--accent-b);background:var(--accent-d)}
.conv-item-row{display:flex;align-items:center;gap:10px}
.conv-avatar{width:40px;height:40px;border-radius:14px;background:var(--bg4);overflow:hidden;display:flex;align-items:center;justify-content:center;color:var(--accent);font-weight:700}
.conv-avatar img{width:100%;height:100%;object-fit:cover}
.conv-copy{min-width:0;flex:1}
.conv-copy strong{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.conv-copy span{display:block;font-size:11px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.conv-main{display:flex;flex-direction:column;min-width:0}
.conv-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid var(--line)}
.conv-head-actions{display:flex;gap:8px;align-items:center}
.conv-thread{flex:1;overflow:auto;padding:18px;display:flex;flex-direction:column;gap:12px}
.bubble-wrap{display:flex;gap:10px}
.bubble-wrap.self{justify-content:flex-end}
.bubble{max-width:min(72%,620px);padding:12px 14px;border-radius:18px;border:1px solid var(--line);background:var(--bg3)}
.bubble.self{background:linear-gradient(180deg,rgba(255,255,255,.06),transparent 40%),var(--accent-d);border-color:var(--accent-b)}
.bubble-meta{font-size:10px;color:var(--muted);margin-top:6px}
.bubble-actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.bubble-reaction{padding:4px 8px;border-radius:999px;background:var(--bg2);border:1px solid var(--line);font-size:11px}
.composer{padding:16px 18px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:10px}
.composer-row{display:flex;gap:8px;align-items:flex-end}
.composer textarea{flex:1;min-height:84px;max-height:220px;resize:vertical}
.composer-preview{padding:8px 10px;border-radius:12px;background:var(--bg3);border:1px solid var(--line);font-size:12px;color:var(--sub);display:flex;align-items:center;justify-content:space-between;gap:8px}
.composer-preview-main{display:flex;flex-direction:column;gap:4px}
.composer-attach{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:var(--bg3);display:flex;align-items:center;justify-content:center;color:var(--sub)}
.composer-attach:hover{color:var(--text);border-color:var(--line2)}
.attach-actions{display:flex;gap:8px;flex-wrap:wrap}
.voice-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:var(--bg3);color:var(--text)}
.voice-pill.live{border-color:rgba(216,92,92,.38);background:rgba(216,92,92,.08);color:#f4d7d7}
.voice-dot{width:9px;height:9px;border-radius:999px;background:var(--red);box-shadow:0 0 0 0 rgba(216,92,92,.45);animation:voicePulse 1.2s ease-out infinite}
.voice-preview{display:flex;flex-direction:column;gap:6px}
.voice-preview audio,.voice-bubble audio{width:min(280px,100%)}
.voice-meta{font-size:11px;color:var(--sub)}
.voice-actions{display:flex;gap:8px;flex-wrap:wrap}
.voice-bubble{display:flex;flex-direction:column;gap:8px}
.voice-bubble-head{font-size:12px;font-weight:600;color:var(--text)}
.call-modal{background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 22%),var(--bg2);border:1px solid var(--line2);border-radius:22px;padding:14px;width:min(960px,96vw);max-height:92vh;display:flex;flex-direction:column;gap:12px;box-shadow:var(--shadow)}
.call-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.call-frame{width:100%;height:min(72vh,760px);border:none;border-radius:18px;background:#000}
.mini-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.mini-calendar-wd{font-size:10px;color:var(--muted);text-transform:uppercase;text-align:center;padding:4px 0}
.mini-calendar-day{aspect-ratio:1/1;min-height:34px;border-radius:12px;border:1px solid var(--line);background:var(--bg3);display:flex;align-items:center;justify-content:center;position:relative;font-size:12px;transition:border-color .15s,background .15s,color .15s}
.mini-calendar-day.other{opacity:.35}
.mini-calendar-day.on{background:var(--accent-d);border-color:var(--accent-b);color:var(--accent)}
.mini-calendar-day.today{box-shadow:inset 0 0 0 1px var(--accent-b)}
.mini-calendar-dot{position:absolute;bottom:6px;width:5px;height:5px;border-radius:999px;background:var(--accent)}
.time-pill-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.note-card[draggable="true"],.k-card[draggable="true"],.dashboard-widget[draggable="true"]{cursor:grab}
.note-card:active,.k-card:active,.dashboard-widget:active{cursor:grabbing}
.context-menu{position:fixed;z-index:1200;width:220px;padding:10px;border-radius:18px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 22%),var(--bg2);box-shadow:var(--shadow)}
.context-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.context-btn{width:100%;padding:10px 12px;border-radius:12px;background:var(--bg3);border:1px solid var(--line);text-align:left;font-size:12px;color:var(--text)}
.message-reactions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.message-reaction-chip{padding:4px 8px;border-radius:999px;background:var(--bg2);border:1px solid var(--line);font-size:11px}
.call-link{margin-top:10px}
.empty-state{height:100%;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:var(--muted)}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s}
.modal{background:linear-gradient(180deg,rgba(255,255,255,.04),transparent 22%),var(--bg2);border:1px solid var(--line2);border-radius:24px;padding:24px;width:420px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow);animation:panelIn .28s ease}
.modal h3{font-family:var(--serif);font-size:18px;margin-bottom:16px}
.modal-ft{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}
.confirm-dialog{max-width:480px}
.confirm-copy{font-size:13px;color:var(--sub);line-height:1.65;margin-top:-6px}

.toast-container{position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px}
.toast{padding:10px 16px;border-radius:var(--r-sm);font-size:13px;font-weight:500;animation:slideIn .2s ease;box-shadow:var(--shadow)}
.toast-ok{background:var(--green-d);border:1px solid rgba(74,158,110,.3);color:var(--green)}
.toast-err{background:var(--red-d);border:1px solid rgba(216,92,92,.3);color:var(--red)}
.toast-info{background:var(--blue-d);border:1px solid rgba(74,126,200,.3);color:var(--blue)}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}

.empty{text-align:center;padding:60px 20px;color:var(--muted)}
.empty p{font-size:14px;margin-bottom:14px}

.swatch{width:20px;height:20px;border-radius:50%;cursor:pointer;border:2px solid transparent;transition:border-color .12s}
.swatch.on{border-color:var(--text)}

@media(max-width:768px){
  .app{padding:0;gap:0;background:var(--bg);touch-action:pan-y}
  .sb{position:fixed;left:10px;top:max(10px,env(safe-area-inset-top,0px) + 10px);bottom:max(10px,env(safe-area-inset-bottom,0px) + 10px);transform:translateX(calc((-100% - 16px) * (1 - var(--sb-mobile-progress,0))));z-index:300;max-width:min(75vw,276px);width:min(75vw,276px);transition:transform .34s cubic-bezier(.22,1,.36,1)}
  .sb.open{transform:translateX(0)}
  .sb-veil{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:299;opacity:0;pointer-events:none;transition:opacity .34s cubic-bezier(.22,1,.36,1)}
  .sb-veil.show{opacity:1;pointer-events:auto}
  .tb-menu{display:flex}
  .main{border-radius:0;border:none;min-height:100dvh;margin-left:0}
  .topbar{padding:calc(env(safe-area-inset-top,0px) + 8px) 14px 10px;gap:10px;justify-content:space-between;height:auto;min-height:72px}
  .tb-mobile-slot{display:flex;flex:1 1 auto}
  .tb-spacer{display:none}
  .tb-right{gap:6px}
  .tb-icon{width:40px;height:40px;border-radius:12px}
  .tb-search{display:none}
  .tb-search-kbd{display:none}
  .sb-top{padding:12px 12px 8px}
  .sb-logo{gap:8px}
  .sb-release{display:none}
  .sb-name{font-size:24px}
  .sb-nav{padding:4px 8px 6px;gap:4px}
  .sb-nav-main,.sb-nav-bottom{gap:1px}
  .sb-sec{font-size:8px;padding:4px 10px 2px}
  .ni{min-height:34px;padding:7px 10px;font-size:12px;gap:9px;border-radius:14px}
  .ni-icon{width:20px;height:20px}
  .ni-badge{font-size:9px;padding:1px 5px}
  .sb-user{padding:8px 10px;gap:8px}
  .sb-user-main{padding:10px 12px;border-radius:16px}
  .sb-av{width:30px;height:30px}
  .sb-uname{font-size:12px}
  .sb-plan{font-size:9px}
  .sb-bottom-upgrade{display:flex}
  .sb-bottom-upgrade{gap:8px;padding:12px 12px 10px}
  .sb-bottom-upgrade strong{font-size:13px;padding-right:26px}
  .sb-bottom-upgrade span{font-size:10px;line-height:1.35}
  .sb-bottom-upgrade .btn{padding:7px 10px;font-size:10px}
  .sb-upgrade-close{top:8px;right:8px;width:24px;height:24px}
  .cp-overlay{padding-top:70px}
  .cp-shell{border-radius:22px}
  .cp-item{padding:12px 14px}
  .cp-foot{display:none}
  .shortcut-row{align-items:flex-start}
  .shortcut-trigger{min-width:0;width:100%}
  .grid2{grid-template-columns:1fr}
  .content{padding:12px 12px calc(18px + env(safe-area-inset-bottom,0px))}
  .content.dashboard-content{overflow:auto;padding:12px 12px calc(18px + env(safe-area-inset-bottom,0px))}
  .dashboard-topbar,.dashboard-filters,.dashboard-summary-grid{grid-template-columns:1fr}
  .dashboard-summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
  .dashboard-filters{display:grid;gap:10px}
  .dashboard-segmented{overflow:auto;flex-wrap:nowrap;padding-bottom:10px}
  .dashboard-range-btn{white-space:nowrap}
  .dashboard-hero-head{flex-direction:column}
  .dashboard-mini-calendar{width:100%}
  .dashboard-shell{display:flex;flex-direction:column;gap:12px;height:auto}
  .dashboard-widgets{grid-template-columns:1fr;gap:14px;height:auto}
  .dashboard-widget{grid-column:auto}
  .hero-grid{grid-template-columns:1fr;height:auto;gap:14px}
  .hero-title{font-size:28px;max-width:none;line-height:1.05}
  .hero-sub{display:block;font-size:12px}
  .hero-main,.surface,.dashboard-widget{min-height:0;overflow:hidden}
  .hero-main{padding:16px;border-radius:24px;display:flex;flex-direction:column}
  .hero-head{margin-bottom:14px;gap:10px;flex-direction:column;align-items:flex-start}
  .hero-actions{display:flex;flex-wrap:wrap}
  .hero-actions .btn{flex:1 1 calc(50% - 6px);justify-content:center}
  .hero-mini-grid{gap:10px;grid-template-columns:repeat(2,minmax(0,1fr))}
  .hero-mini{min-height:126px;padding:14px;border-radius:20px}
  .hero-mini h4{font-size:12px;margin-bottom:8px}
  .hero-mini .big{font-size:28px}
  .hero-mini .muted{font-size:12px;line-height:1.5;display:block;overflow:visible}
  .surface{padding:16px;border-radius:24px}
  .surface-head{margin-bottom:10px}
  .surface-title{font-size:18px}
  .surface-sub{font-size:12px}
  .quick-grid,.contact-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  .quick-card,.contact-card{min-height:126px;padding:14px;border-radius:20px}
  .quick-card .list-icon{margin-bottom:12px}
  .quick-card strong,.contact-card strong{font-size:14px}
  .quick-card span,.contact-card span{font-size:12px;line-height:1.5}
  .contact-card .conv-avatar{width:46px;height:46px;border-radius:15px}
  .dashboard-widget{padding:16px;display:flex;flex-direction:column;border-radius:24px;overflow:hidden}
  .dashboard-widget .surface-head{margin-bottom:12px}
  .dashboard-widget .surface-sub{display:block}
  .dashboard-widget .list-rows{gap:10px;overflow:hidden;min-height:0;padding-right:0}
  .dashboard-widget .list-row{padding:12px;border-radius:16px;align-items:flex-start}
  .dashboard-widget .list-main{align-items:flex-start}
  .dashboard-widget .list-copy strong,.dashboard-widget .list-copy span{white-space:normal}
  .dashboard-widget .pill{padding:6px 10px;font-size:11px}
  .list-icon{width:40px;height:40px}
  .cal-shell{grid-template-columns:1fr}
  .calendar-side-list,.calendar-schedule,.calendar-agenda-list{max-height:none}
  .day-view{grid-template-columns:1fr}
  .day-slot{grid-template-columns:56px minmax(0,1fr)}
  .notes-grid{grid-template-columns:1fr}
  .note-editor-grid{grid-template-columns:1fr}
  .note-editor-grid.with-sidebar{grid-template-columns:1fr}
  .note-zone-layout{grid-template-columns:1fr}
  .note-side-card{min-height:auto}
  .note-zone-list{grid-template-columns:1fr}
  .note-zone-grid,.segmented-grid,.icon-preset-grid,.time-pill-grid{grid-template-columns:1fr}
  .note-zone-divider{padding-right:0;border-right:none;padding-bottom:14px;border-bottom:1px solid var(--line)}
  .note-zone-lined{padding-left:0;padding-top:14px}
  .tb-focus{position:static;transform:none;min-width:0;max-width:none;width:100%;margin:0 0 0 auto}
  .k-board{flex-direction:column;align-items:stretch}
  .k-col{width:100%}
  .stat-grid{grid-template-columns:repeat(2,1fr)}
  .habit-main,.habit-actions,.habit-streak{width:100%}
  .habit-actions{opacity:1;transform:none}
  .conv-shell{grid-template-columns:1fr;height:calc(100vh - 92px)}
  .conv-shell.mobile-detail .conv-sidebar{display:none}
  .conv-shell.mobile-list .conv-main{display:none}
  .panel-pop{right:12px;left:12px;width:auto}
  .sb-account-pop{left:12px;right:12px;bottom:86px;width:auto}
  .sb-help-pop{left:12px;right:12px;bottom:86px;width:auto}
  .sheet{top:10px;right:10px;bottom:10px;left:10px;width:auto;padding:14px;border-radius:24px}
  .sheet-head{gap:10px}
  .notif-device-card{flex-direction:column;align-items:stretch}
  .settings-profile-card{padding:16px;border-radius:22px}
  .settings-nav-card{border-radius:20px}
  .settings-tab{padding:14px}
  .settings-tab-icon{width:38px;height:38px;border-radius:13px}
  .settings-hero-meta{align-items:flex-start}
  .settings-hero-badges{justify-content:flex-start}
  .settings-back-btn{display:inline-flex}
  .calendar-layout{grid-template-columns:1fr}
  .calendar-day-head{align-items:stretch}
  .release-widget{padding:16px;border-radius:20px}
  .release-widget-head,.release-entry-head{flex-direction:column}
  .release-stats{grid-template-columns:1fr}
  .settings-shell{grid-template-columns:1fr}
  .settings-grid,.settings-form,.plan-grid{grid-template-columns:1fr}
  .settings-hero{flex-direction:column}
  .s-row{align-items:flex-start;flex-direction:column}
  .bm-grid.rich{grid-template-columns:1fr}
  .call-modal{padding:10px;border-radius:18px}
  .task-modal{width:min(100%,96vw);max-height:94vh}
  .task-modal-grid{grid-template-columns:1fr}
  .task-modal-main{border-right:none;border-bottom:1px solid var(--line)}
  .task-modal-meta{grid-template-columns:1fr}
  .call-frame{height:min(68vh,620px)}
  .voice-preview audio,.voice-bubble audio{width:100%}
}

@media(min-width:769px) and (max-width:1100px){
  .dashboard-content{overflow:hidden}
  .dashboard-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .hero-grid{grid-template-columns:1fr}
  .dashboard-widgets{grid-template-columns:1fr}
  .dashboard-widget{grid-column:auto}
  .note-zone-layout{grid-template-columns:1fr}
  .cal-shell{grid-template-columns:1fr}
}
`;

// ═══════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════
export default function FlowApp() {
  const releaseBadgeLabel = useMemo(() => `v${RELEASE.version}`, []);
  const releaseLabel = useMemo(() => `v${RELEASE.version} · ${fmtRelease(RELEASE.deployedAt)}`, []);
  const [releaseWidgetOpen, setReleaseWidgetOpen] = useState(false);

  // ── Auth state ──
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [authErr, setAuthErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authRecoveryMode, setAuthRecoveryMode] = useState("idle");
  const [authRecoveryBusy, setAuthRecoveryBusy] = useState(false);
  const [authRecoveryEmail, setAuthRecoveryEmail] = useState("");
  const [authRecoveryCode, setAuthRecoveryCode] = useState("");
  const [authGoogleEnabled, setAuthGoogleEnabled] = useState(false);
  const [authEmailRecoveryEnabled, setAuthEmailRecoveryEnabled] = useState(false);
  const [authScreenClosing, setAuthScreenClosing] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [introReverse, setIntroReverse] = useState(false);
  const [introPhase, setIntroPhase] = useState("enter");
  const [saveState, setSaveState] = useState("saved");
  const [isOffline, setIsOffline] = useState(false);

  // ── App state ──
  const [db, setDb] = useState(() => emptyDB());
  const [view, setView] = useState("dashboard");
  const [sbOpen, setSbOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [reportDialog, setReportDialog] = useState({ open: false, messageId: "", reason: "abus", details: "" });
  const [theme, setTheme] = useState(() => db.settings?.theme || "dark");
  const [toolbarPanel, setToolbarPanel] = useState(null);
  const [connectionNoticeOpen, setConnectionNoticeOpen] = useState(false);
  const [connectionNoticeIds, setConnectionNoticeIds] = useState([]);
  const [devicePushSupported, setDevicePushSupported] = useState(false);
  const [devicePushEnabled, setDevicePushEnabled] = useState(false);
  const [devicePushPermission, setDevicePushPermission] = useState("default");
  const [devicePushBusy, setDevicePushBusy] = useState(false);
  const [globalQuery, setGlobalQuery] = useState("");
  const [uiStudioOpen, setUiStudioOpen] = useState(false);
  const [uiStudioSelection, setUiStudioSelection] = useState("dashboard-hero");
  const [uiStudioDevice, setUiStudioDevice] = useState("desktop");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState("");
  const [commandPaletteIndex, setCommandPaletteIndex] = useState(0);
  const [draggingDashboardWidget, setDraggingDashboardWidget] = useState("");
  const [dashboardDropTarget, setDashboardDropTarget] = useState("");
  const [dashboardRange, setDashboardRange] = useState("month");
  const [dashboardReferenceDate, setDashboardReferenceDate] = useState(() => new Date());
  const [draggingNoteId, setDraggingNoteId] = useState("");
  const [noteDropTarget, setNoteDropTarget] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState("");
  const [taskDropTarget, setTaskDropTarget] = useState(-1);
  const [shortcutCaptureAction, setShortcutCaptureAction] = useState("");
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversationSearch, setConversationSearch] = useState("");
  const [conversationMatches, setConversationMatches] = useState([]);
  const [reportedMessages, setReportedMessages] = useState([]);
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationSearch, setNewConversationSearch] = useState("");
  const [conversationInfoQuery, setConversationInfoQuery] = useState("");
  const [conversationBusy, setConversationBusy] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [attachmentDraft, setAttachmentDraft] = useState({ name: "", url: "", type: "file" });
  const [attachmentChooserOpen, setAttachmentChooserOpen] = useState(false);
  const [groupDraftTitle, setGroupDraftTitle] = useState("");
  const [groupDraftMembers, setGroupDraftMembers] = useState([]);
  const [conversationManageOpen, setConversationManageOpen] = useState(false);
  const [groupManageTitle, setGroupManageTitle] = useState("");
  const [groupManageMembers, setGroupManageMembers] = useState([]);
  const [groupManageSearch, setGroupManageSearch] = useState("");
  const [groupManageMatches, setGroupManageMatches] = useState([]);
  const [messageEdit, setMessageEdit] = useState({ id: "", text: "" });
  const [messageMenu, setMessageMenu] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [moduleTransitionKey, setModuleTransitionKey] = useState(0);
  const [moduleTransitionMode, setModuleTransitionMode] = useState("module");
  const [mobileSidebarProgress, setMobileSidebarProgress] = useState(0);
  const [historySwipeOffset, setHistorySwipeOffset] = useState(0);

  const [historySwipeDirection, setHistorySwipeDirection] = useState("");
  const [pullRefreshOffset, setPullRefreshOffset] = useState(0);
  const [pullRefreshArmed, setPullRefreshArmed] = useState(false);
  const [pullRefreshBusy, setPullRefreshBusy] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskCommentDraft, setTaskCommentDraft] = useState("");
  const [taskSubtaskDraft, setTaskSubtaskDraft] = useState("");
  const [taskTemplateDraft, setTaskTemplateDraft] = useState({
    title: "",
    desc: "",
    prio: "none",
    dueOffsetDays: "0",
    subtasksText: "",
  });

  // ── Module states ──
  const [editNote, setEditNote] = useState(null);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState("");
  const [noteModalCategory, setNoteModalCategory] = useState(NOTE_CATEGORIES[0].key);
  const [noteView, setNoteView] = useState("overview");
  const [noteSearchQuery, setNoteSearchQuery] = useState("");
  const [noteEditorMenu, setNoteEditorMenu] = useState("");
  const [noteShareDialog, setNoteShareDialog] = useState({ open: false, noteId: "", target: "", role: "reader" });
  const [noteContextMenu, setNoteContextMenu] = useState(null);
  const [noteUnlockDialog, setNoteUnlockDialog] = useState({ open: false, noteId: "", password: "", busy: false });
  const [noteTypeSize, setNoteTypeSize] = useState(16);
  const [noteTypeFontFamily, setNoteTypeFontFamily] = useState("var(--sans)");
  const releaseReloadTimerRef = useRef(null);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayStr());
  const [calendarDayOpen, setCalendarDayOpen] = useState(false);
  const [eventPickerMonth, setEventPickerMonth] = useState(new Date().getMonth());
  const [eventPickerYear, setEventPickerYear] = useState(new Date().getFullYear());
  const [eventDraft, setEventDraft] = useState(() => buildEventDraft());
  const [eventBusy, setEventBusy] = useState(false);
  const [eventActionId, setEventActionId] = useState("");
  const [focusState, setFocusState] = useState({ running: false, mode: "focus", sec: 25 * 60, total: 25 * 60 });
  const [habitDraft, setHabitDraft] = useState({
    id: "",
    name: "",
    icon: HABIT_ICON_PRESETS[0].value,
    desc: "",
    targetMinutes: "15",
    days: WEEKDAY_OPTIONS.map((item) => item.key),
  });
  const [habitLogDraft, setHabitLogDraft] = useState({ habitId: "", date: todayStr(), minutes: "" });
  const [settingsTab, setSettingsTab] = useState("profile");
  const [settingsDetailOpen, setSettingsDetailOpen] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState("");
  const [backupImportDialog, setBackupImportDialog] = useState({ open: false, raw: "", name: "" });
  const [settingsActivityFilter, setSettingsActivityFilter] = useState("all");
  const [profileDraft, setProfileDraft] = useState(() => buildProfileDraft(emptyDB(), { name: "", email: "" }));
  const [appearanceDraft, setAppearanceDraft] = useState(() => buildAppearanceDraft(emptyDB()));
  const [bookmarkDraft, setBookmarkDraft] = useState(() => buildBookmarkDraft());
  const [transactionDraft, setTransactionDraft] = useState(() => buildTransactionDraft());
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [activeCall, setActiveCall] = useState({ open: false, roomName: "", mode: "video", title: "" });
  const focusRef = useRef(null);
  const [editJournal, setEditJournal] = useState(null);
  const saveTimerRef = useRef(null);
  const saveRetryRef = useRef(null);
  const dbRef = useRef(db);
  const filePickerRef = useRef(null);
  const imagePickerRef = useRef(null);
  const profilePhotoInputRef = useRef(null);
  const bookmarkImageInputRef = useRef(null);
  const noteAttachmentInputRef = useRef(null);
  const backupImportInputRef = useRef(null);
  const noteEditorRef = useRef(null);
  const noteSearchInputRef = useRef(null);
  const noteSavedSelectionRef = useRef(null);
  const pendingNoteIdRef = useRef("");
  const authEmailInputRef = useRef(null);
  const authPasswordInputRef = useRef(null);
  const authNameInputRef = useRef(null);
  const authPasswordConfirmInputRef = useRef(null);
  const introTimersRef = useRef([]);
  const authAutofillTimerRef = useRef(null);
  const contentRef = useRef(null);
  const sidebarRef = useRef(null);
  const accountPanelRef = useRef(null);
  const helpPanelRef = useRef(null);
  const uiStudioPanelRef = useRef(null);
  const uiStudioImportRef = useRef(null);
  const appearanceAutoSaveRef = useRef(null);
  const appearanceReadyRef = useRef(false);
  const longPressRef = useRef(null);
  const editMessageRef = useRef(null);
  const seenBrowserNotificationsRef = useRef(new Set());
  const seenConnectionNoticeRef = useRef("");
  const conversationThreadRef = useRef(null);
  const commandPaletteInputRef = useRef(null);
  const viewBackStackRef = useRef([]);
  const viewForwardStackRef = useRef([]);
  const skipViewHistoryRef = useRef(false);
  const noteCategories = useMemo(() => {
    const raw = Array.isArray(db.settings?.noteCategories) ? db.settings.noteCategories : [];
    if (!raw.length) return NOTE_CATEGORIES.map((category) => ({ ...category, color: "", icon: "" }));
    return raw
      .map((category, index) => ({
        key: `${category?.key || `note-category-${index}`}`.slice(0, 60),
        label: `${category?.label || category?.title || `Catégorie ${index + 1}`}`.slice(0, 60),
        description: `${category?.description || ""}`.slice(0, 180),
        color: `${category?.color || ""}`.slice(0, 24),
        icon: `${category?.icon || ""}`.slice(0, 8),
      }))
      .filter((category) => category.key && category.label);
  }, [db.settings?.noteCategories]);
  const firstNoteCategoryKey = noteCategories[0]?.key || NOTE_CATEGORIES[0].key;
  const previousViewRef = useRef("dashboard");
  const pendingTransitionModeRef = useRef("module");
  const touchGestureRef = useRef({
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    active: false,
    handled: false,
    mode: "",
    lockAxis: "",
    sidebarStartProgress: 0,
  });

  // ── Toast ──
  const toast = useCallback((msg, type = "ok") => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const runFlowIntro = useCallback(({ reload = false } = {}) => {
    if (typeof window === "undefined") return;
    introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    introTimersRef.current = [];
    setIntroReverse(false);
    setIntroPhase("enter");
    const exitTimer = window.setTimeout(() => setIntroPhase("exit"), 1500);
    const endTimer = window.setTimeout(() => {
      if (reload) {
        window.location.reload();
        return;
      }
      setIntroPhase("hidden");
    }, 2020);
    introTimersRef.current = [exitTimer, endTimer];
  }, []);

  const playFlowIntroAndReload = useCallback(() => {
    if (typeof window === "undefined") return;
    if (releaseReloadTimerRef.current) return;
    setIntroReverse(false);
    setIntroPhase("enter");
    releaseReloadTimerRef.current = window.setTimeout(() => {
      setIntroPhase("exit");
      releaseReloadTimerRef.current = window.setTimeout(() => {
        window.location.reload();
      }, 460);
    }, 1500);
  }, []);

  useEffect(() => {
    runFlowIntro();
    return () => {
      introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (authAutofillTimerRef.current) window.clearTimeout(authAutofillTimerRef.current);
      if (releaseReloadTimerRef.current) window.clearTimeout(releaseReloadTimerRef.current);
    };
  }, [runFlowIntro]);

  useEffect(() => {
    if (user || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) {
        active.blur();
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [authRecoveryMode, authTab, user]);

  useEffect(() => {
    if (!isMobileViewport) return undefined;
    const frame = window.requestAnimationFrame(() => {
      setMobileSidebarProgress(sbOpen ? 1 : 0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isMobileViewport, sbOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLocale = getStoredLocale();
    if (storedLocale !== (db.settings?.locale || "fr")) {
      setDb((prev) => ({
        ...prev,
        settings: {
          ...(prev.settings || {}),
          locale: storedLocale,
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("authGoogle") || "";
    const authMode = params.get("auth") || "";
    if (authMode === "forgot") setAuthRecoveryMode("request");
    if (googleStatus) {
      if (googleStatus === "success") toast("Connexion Google active");
      else if (googleStatus === "cancelled") setAuthErr("Connexion Google annulee");
      else setAuthErr("Connexion Google impossible pour le moment");
    }
    void api("/api/auth/providers", { method: "GET" })
      .then((payload) => {
        setAuthGoogleEnabled(Boolean(payload?.google));
        setAuthEmailRecoveryEnabled(Boolean(payload?.email));
      })
      .catch(() => {
        setAuthGoogleEnabled(false);
        setAuthEmailRecoveryEnabled(false);
      });
  }, [toast]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const locale = db.settings?.locale === "en" ? "en" : "fr";
    document.documentElement.lang = locale;
    storeLocale(locale);
    const cleanup = installDomTranslator(document.body, locale);
    return cleanup;
  }, [db.settings?.locale]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return undefined;
    const onMessage = (event) => {
      if (event.data?.type === "flow-release-refresh") {
        playFlowIntroAndReload();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [playFlowIntroAndReload]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setToolbarPanel(null);
      setReleaseWidgetOpen(false);
      setNoteContextMenu(null);
      setNoteEditorMenu("");
      setModal(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setToolbarPanel(null);
    setNoteContextMenu(null);
    setNoteEditorMenu("");
  }, [view]);

  useEffect(() => {
    if (!sbOpen) {
      setToolbarPanel(null);
    }
  }, [sbOpen]);

  useEffect(() => {
    if (view === "settings") {
      setSettingsTab("profile");
    }
  }, [view]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;

    const checkReleaseVersion = async () => {
      try {
        const response = await fetch(`/api/release/current?ts=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && payload?.version && `${payload.version}` !== `${RELEASE.version}`) {
          playFlowIntroAndReload();
        }
      } catch {}
    };

    const timer = window.setInterval(() => { void checkReleaseVersion(); }, 45000);
    void checkReleaseVersion();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [playFlowIntroAndReload]);

  const requestConfirm = useCallback(({ title, detail = "", confirmLabel = "Confirmer", cancelLabel = "Annuler", tone = "danger" }) => (
    new Promise((resolve) => {
      setConfirmDialog({
        title,
        detail,
        confirmLabel,
        cancelLabel,
        tone,
        resolve,
      });
    })
  ), []);
  const askLogout = useCallback(async () => {
    const ok = await requestConfirm({
      title: "Se déconnecter ?",
      detail: "Vous quitterez Flow sur cet appareil. Les changements en attente seront sauvegardés avant la déconnexion.",
      confirmLabel: "Se déconnecter",
      tone: "danger",
    });
    if (!ok) return;
    await doLogout();
  }, [requestConfirm]);
  const {
    clearVoiceDraft,
    cancelVoiceRecording,
    resetVoiceRecorder,
    startVoiceRecording,
    stopVoiceRecording,
    voiceDraft,
    voiceState,
  } = useVoiceRecorder({
    toast,
    onRecordStart: () => {
      setAttachmentChooserOpen(false);
      setAttachmentDraft({ name: "", url: "", type: "file" });
    },
  });

  const flushSave = useCallback(async (payload) => {
    if (!user) return;
    setSaveState("saving");
    try {
      await api("/api/db", { method: "PUT", body: JSON.stringify({ db: payload }) });
      if (saveRetryRef.current) {
        clearTimeout(saveRetryRef.current);
        saveRetryRef.current = null;
      }
      writeLocalDbCache(user, payload);
      writeLocalSessionSnapshot(user);
      setSaveState("saved");
    } catch (error) {
      const message = `${error?.message || ""}`;
      if (message.includes("Store write failed (404)") || message.includes("Store read failed (404)")) {
        writeLocalDbCache(user, payload);
        writeLocalSessionSnapshot(user);
        setSaveState("saved");
        return;
      }
      if (message.includes("Store write failed (429)") || message.includes("429")) {
        writeLocalDbCache(user, payload);
        writeLocalSessionSnapshot(user);
        setSaveState("dirty");
        if (!saveRetryRef.current) {
          saveRetryRef.current = setTimeout(() => {
            saveRetryRef.current = null;
            void flushSave(dbRef.current);
          }, 2500);
        }
        return;
      }
      setSaveState("dirty");
      toast(message || "Sauvegarde distante impossible", "err");
    }
  }, [toast, user]);

  const save = useCallback((newDb, immediate = false) => {
    if (!user) return;
    dbRef.current = newDb;
    writeLocalDbCache(user, newDb);
    writeLocalSessionSnapshot(user);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (immediate) {
      void flushSave(newDb);
      return;
    }

    setSaveState("dirty");
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushSave(dbRef.current);
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave, user]);

  const mergeBackupDb = useCallback((currentDb, importedDb) => {
    const current = currentDb || emptyDB();
    const incoming = importedDb || emptyDB();
    const mergeById = (left = [], right = []) => {
      const map = new Map();
      [...left, ...right].forEach((item) => {
        const key = `${item?.id || uid()}`;
        if (!map.has(key)) map.set(key, item);
      });
      return [...map.values()];
    };

    return {
      ...current,
      notes: mergeById(current.notes, incoming.notes),
      tasks: mergeById(current.tasks, incoming.tasks),
      taskTemplates: mergeById(current.taskTemplates, incoming.taskTemplates),
      projects: mergeById(current.projects, incoming.projects),
      events: mergeById(current.events, incoming.events),
      habits: mergeById(current.habits, incoming.habits),
      journal: mergeById(current.journal, incoming.journal),
      transactions: mergeById(current.transactions, incoming.transactions),
      bookmarks: mergeById(current.bookmarks, incoming.bookmarks),
      goals: mergeById(current.goals, incoming.goals),
      activity: [...(incoming.activity || []), ...(current.activity || [])].slice(0, 120),
      notifications: [...(incoming.notifications || []), ...(current.notifications || [])].slice(0, 120),
      settings: {
        ...(current.settings || {}),
        ...(incoming.settings?.noteCategories ? { noteCategories: incoming.settings.noteCategories } : {}),
        ...(incoming.settings?.shortcuts ? { shortcuts: incoming.settings.shortcuts } : {}),
      },
      profile: { ...(current.profile || {}) },
      subscription: { ...(current.subscription || {}) },
    };
  }, []);

  const applyBackupImport = useCallback(async (raw, mode = "merge") => {
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const nextPayloadDb = mode === "replace" ? parsed : mergeBackupDb(dbRef.current, parsed);
      const payload = await api("/api/db", {
        method: "PUT",
        body: JSON.stringify({ db: nextPayloadDb }),
      });
      const nextDb = payload.db || emptyDB();
      setDb(nextDb);
      writeLocalDbCache(user, nextDb);
      setBackupImportDialog({ open: false, raw: "", name: "" });
      toast(mode === "replace" ? "Backup remplacé" : "Backup fusionné");
    } catch (error) {
      toast(error.message || "Import impossible", "err");
    }
  }, [mergeBackupDb, toast, user]);

  const importBackupFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const raw = await file.text();
      JSON.parse(raw);
      setBackupImportDialog({ open: true, raw, name: file.name || "backup.json" });
    } catch (error) {
      toast(error.message || "Import impossible", "err");
    }
  }, [toast]);

  const updateDb = useCallback((fn) => {
    setDb(prev => {
      const next = { ...prev };
      fn(next);
      save(next);
      return next;
    });
  }, [save]);

  const ensurePushSubscription = useCallback(async () => {
    if (!user || typeof window === "undefined") return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
    if (Notification.permission !== "granted") return false;

    try {
      const keyPayload = await api("/api/push/public-key", { method: "GET" });
      if (!keyPayload?.enabled || !keyPayload?.publicKey) return false;

      const registration = await navigator.serviceWorker.register("/sw.js");
      const readyRegistration = await navigator.serviceWorker.ready;
      let subscription = await readyRegistration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await readyRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyPayload.publicKey),
        });
      }

      await api("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({
          subscription,
          platform: navigator.userAgent,
        }),
      });
      setDevicePushSupported(true);
      setDevicePushPermission(Notification.permission);
      setDevicePushEnabled(true);
      return true;
    } catch {
      return false;
    }
  }, [user]);

  const syncDevicePushState = useCallback(async () => {
    if (typeof window === "undefined") return;
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setDevicePushSupported(supported);
    setDevicePushPermission(supported ? Notification.permission : "unsupported");
    if (!supported || !user) {
      setDevicePushEnabled(false);
      return;
    }
    try {
      await navigator.serviceWorker.register("/sw.js");
      const readyRegistration = await navigator.serviceWorker.ready;
      const subscription = await readyRegistration.pushManager.getSubscription();
      setDevicePushEnabled(Boolean(subscription && Notification.permission === "granted"));
    } catch {
      setDevicePushEnabled(false);
    }
  }, [user]);

  const toggleDevicePushNotifications = useCallback(async () => {
    if (!user) return;
    if (!devicePushSupported) {
      toast("Notifications web indisponibles sur cet appareil", "err");
      return;
    }

    setDevicePushBusy(true);
    try {
      if (devicePushEnabled) {
        await navigator.serviceWorker.register("/sw.js");
        const readyRegistration = await navigator.serviceWorker.ready;
        const subscription = await readyRegistration.pushManager.getSubscription();
        if (subscription) {
          await api("/api/push/subscribe", {
            method: "DELETE",
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe().catch(() => {});
        }
        setDevicePushEnabled(false);
        setDevicePushPermission(Notification.permission);
        toast("Notifications désactivées sur cet appareil", "info");
        return;
      }

      if (Notification.permission === "denied") {
        setDevicePushPermission("denied");
        toast("Autorisez d'abord les notifications dans le navigateur ou l'app installée", "err");
        return;
      }

      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        setDevicePushPermission(permission);
        if (permission !== "granted") {
          toast("Autorisation de notifications non accordée", "info");
          return;
        }
      }

      const subscribed = await ensurePushSubscription();
      if (subscribed) toast("Notifications activées sur cet appareil");
      else toast("Activation des notifications impossible", "err");
    } finally {
      setDevicePushBusy(false);
    }
  }, [devicePushEnabled, devicePushSupported, ensurePushSubscription, toast, user]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "auto" });
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [view, editNote, noteView, calendarDayOpen]);

  useEffect(() => {
    if (view !== "settings") {
      setSettingsDetailOpen(false);
    }
  }, [view]);

  const currentPlan = useMemo(
    () => PLAN_DEFS.find((plan) => plan.key === db.subscription?.plan) || PLAN_DEFS[2],
    [db.subscription?.plan],
  );
  const uiOverrides = useMemo(() => {
    const raw = db.settings?.uiOverrides;
    if (!raw || typeof raw !== "object") return {};
    return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, normalizeUiOverrideProfile(value)]));
  }, [db.settings?.uiOverrides]);
  const selectedUiBlock = useMemo(
    () => UI_STUDIO_BLOCKS.find((block) => block.key === uiStudioSelection) || UI_STUDIO_BLOCKS[0],
    [uiStudioSelection],
  );
  const selectedUiProfile = uiOverrides[selectedUiBlock.key] || normalizeUiOverrideProfile();
  const selectedUiOverride = selectedUiProfile[uiStudioDevice] || normalizeUiOverrideEntry();
  const uiStudioSnippet = useMemo(
    () => buildUiOverrideSnippet(selectedUiBlock.key, selectedUiProfile),
    [selectedUiBlock.key, selectedUiProfile],
  );
  const liveUiDevice = isMobileViewport ? "mobile" : "desktop";
  const sidebarCompact = !isMobileViewport && !sidebarPinned && !sidebarHover;
  const closeTransientSidebar = useCallback(() => {
    if (isMobileViewport) {
      setSbOpen(false);
      setMobileSidebarProgress(0);
      setToolbarPanel(null);
      return;
    }
    if (!sidebarPinned) {
      setSidebarHover(false);
      setToolbarPanel(null);
    }
  }, [isMobileViewport, sidebarPinned]);
  const updateUiStudioValue = useCallback((blockKey, device, field, value) => {
    updateDb((draft) => {
      const currentProfile = normalizeUiOverrideProfile(draft.settings?.uiOverrides?.[blockKey] || {});
      const next = normalizeUiOverrideEntry({ ...currentProfile[device], [field]: value });
      draft.settings.uiOverrides = {
        ...(draft.settings?.uiOverrides || {}),
        [blockKey]: {
          ...currentProfile,
          [device]: next,
        },
      };
    });
  }, [updateDb]);
  const resetUiStudioBlock = useCallback((blockKey, device) => {
    updateDb((draft) => {
      const next = { ...(draft.settings?.uiOverrides || {}) };
      const current = normalizeUiOverrideProfile(next[blockKey] || {});
      if (device === "all") {
        delete next[blockKey];
      } else {
        next[blockKey] = {
          ...current,
          [device]: normalizeUiOverrideEntry({}),
        };
      }
      draft.settings.uiOverrides = next;
    });
  }, [updateDb]);
  const resetUiStudioAll = useCallback(() => {
    updateDb((draft) => {
      draft.settings.uiOverrides = {};
    });
  }, [updateDb]);
  const copyUiStudioDesktopToMobile = useCallback((blockKey) => {
    updateDb((draft) => {
      const current = normalizeUiOverrideProfile(draft.settings?.uiOverrides?.[blockKey] || {});
      draft.settings.uiOverrides = {
        ...(draft.settings?.uiOverrides || {}),
        [blockKey]: {
          ...current,
          mobile: normalizeUiOverrideEntry(current.desktop),
        },
      };
    });
  }, [updateDb]);
  const exportUiStudioPreset = useCallback(() => {
    if (typeof window === "undefined") return;
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      uiOverrides: db.settings?.uiOverrides || {},
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `flow-ui-studio-${todayStr()}.json`;
    a.click();
    toast("Preset UI exporté");
  }, [db.settings?.uiOverrides, toast]);
  const importUiStudioPreset = useCallback(async (file) => {
    if (!file) return;
    const raw = await file.text().catch(() => "");
    if (!raw) return toast("Preset UI illisible", "err");
    try {
      const parsed = JSON.parse(raw);
      const incoming = parsed?.uiOverrides && typeof parsed.uiOverrides === "object" ? parsed.uiOverrides : null;
      if (!incoming) throw new Error("Preset vide");
      updateDb((draft) => {
        draft.settings.uiOverrides = Object.fromEntries(
          Object.entries(incoming).map(([key, value]) => [key, normalizeUiOverrideProfile(value)]),
        );
      });
      toast("Preset UI importé");
    } catch (error) {
      toast(error.message || "Import UI impossible", "err");
    }
  }, [toast, updateDb]);
  const selectCalendarDate = useCallback((date, { openDay = true } = {}) => {
    if (!date) return;
    setSelectedCalendarDate(date);
    setCalendarDayOpen(openDay);
  }, []);
  const openCallRoom = useCallback(({ roomName, mode = "video", title = "" }) => {
    const safeRoom = `${roomName || ""}`.replace(/[^a-z0-9-]/gi, "").slice(0, 80);
    if (!safeRoom) return;
    setActiveCall({ open: true, roomName: safeRoom, mode, title });
  }, []);
  const openNoteModal = useCallback((category = selectedNoteCategory) => {
    setNoteModalCategory(category || selectedNoteCategory || firstNoteCategoryKey);
    setModal("note");
  }, [firstNoteCategoryKey, selectedNoteCategory]);
  const createQuickNote = useCallback((category = selectedNoteCategory) => {
    const nextId = uid();
    const targetCategory = category || selectedNoteCategory || firstNoteCategoryKey;
    pendingNoteIdRef.current = nextId;
    updateDb((draft) => {
      draft.notes.push({
        id: nextId,
        title: "",
        content: "",
        cat: targetCategory,
        color: draft.settings?.accent || "#3f97ff",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        links: createEmptyLinks(),
        attachments: [],
        favorite: false,
        locked: false,
        sharedWith: [],
        sharedByName: "",
        sharedImportToken: "",
        sharedRole: "",
      });
      addActivityEntry(draft, { type: "note", title: "Note créée", detail: targetCategory });
    });
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        setSelectedNoteCategory(targetCategory);
        setNoteView("note");
        setEditNote(nextId);
        setNoteEditorMenu("");
      });
    } else {
      setSelectedNoteCategory(targetCategory);
      setNoteView("note");
      setEditNote(nextId);
      setNoteEditorMenu("");
    }
    return nextId;
  }, [firstNoteCategoryKey, selectedNoteCategory, updateDb]);

  const openHabitModal = useCallback((habit = null) => {
    setHabitDraft({
      id: habit?.id || "",
      name: habit?.name || "",
      icon: habit?.icon || HABIT_ICON_PRESETS[0].value,
      desc: habit?.desc || "",
      targetMinutes: String(getHabitTargetMinutes(habit || {})),
      days: Array.isArray(habit?.days) && habit.days.length ? habit.days : WEEKDAY_OPTIONS.map((item) => item.key),
    });
    setModal("habit");
  }, []);

  const openHabitLogModal = useCallback((habit, date = todayStr()) => {
    if (!habit?.id) return;
    setHabitLogDraft({
      habitId: habit.id,
      date,
      minutes: String(getHabitMinutesForDate(habit, date) || getHabitTargetMinutes(habit)),
    });
    setModal("habit-log");
  }, []);

  const openEventModal = useCallback((input = {}) => {
    if (input.date) {
      selectCalendarDate(input.date, { openDay: true });
      const baseDate = new Date(`${input.date}T12:00:00`);
      if (!Number.isNaN(baseDate.getTime())) {
        setEventPickerMonth(baseDate.getMonth());
        setEventPickerYear(baseDate.getFullYear());
      }
    }
    const attendeeIds = Array.isArray(input.attendeeIds)
      ? input.attendeeIds
      : Array.isArray(input.participantIds)
        ? input.participantIds.filter((uid) => uid !== user?.uid)
        : [];
    setEventDraft(buildEventDraft({ ...input, attendeeIds }));
    setModal("event");
  }, [selectCalendarDate, user?.uid]);

  const openBookmarkModal = useCallback((input = {}) => {
    setBookmarkDraft(buildBookmarkDraft(input));
    setModal("bookmark");
  }, []);

  const openTransactionModal = useCallback((input = {}) => {
    setTransactionDraft(buildTransactionDraft(input));
    setModal("transaction");
  }, []);

  const openSettingsSection = useCallback((tab = "profile", options = {}) => {
    const { openView = false } = options;
    setSettingsTab(tab);
    setSettingsDetailOpen(isCompactViewport);
    setToolbarPanel(null);
    if (openView) setView("settings");
  }, [isCompactViewport]);

  const startBillingCheckout = useCallback(async (planKey, cycleKey) => {
    setBillingBusy(`${planKey}:${cycleKey}`);
    try {
      const payload = await api("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: planKey, cycle: cycleKey }),
      });
      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }
      throw new Error("Session Stripe introuvable");
    } catch (error) {
      toast(error.message || "Paiement Stripe impossible", "err");
    } finally {
      setBillingBusy("");
    }
  }, [toast]);

  const openBillingPortal = useCallback(async () => {
    setBillingBusy("portal");
    try {
      const payload = await api("/api/billing/portal", { method: "POST" });
      if (payload?.url) {
        window.location.href = payload.url;
        return;
      }
      throw new Error("Portail client Stripe introuvable");
    } catch (error) {
      toast(error.message || "Portail Stripe impossible", "err");
    } finally {
      setBillingBusy("");
    }
  }, [toast]);

  const cancelBillingSubscription = useCallback(async () => {
    setBillingBusy("cancel");
    try {
      const ok = await requestConfirm({
        title: "Annuler l'abonnement ?",
        detail: "L'abonnement récurrent sera arrêté à la fin de la période en cours.",
        confirmLabel: "Annuler l'abonnement",
        tone: "danger",
      });
      if (!ok) return;
      const payload = await api("/api/billing/cancel", { method: "POST" });
      if (payload?.db) {
        setDb(payload.db);
        writeLocalDbCache(user, payload.db);
      }
      toast("Abonnement annulé en fin de période");
    } catch (error) {
      toast(error.message || "Annulation impossible", "err");
    } finally {
      setBillingBusy("");
    }
  }, [requestConfirm, toast, user]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const billingState = params.get("billing") || "";
    const openSection = params.get("open") || "";
    const viewParam = params.get("view") || "";
    if (!billingState && openSection !== "billing" && viewParam !== "settings") return;

    setView("settings");
    openSettingsSection("billing");

    if (billingState === "success") {
      toast("Paiement Stripe confirmé");
      void api("/api/session", { method: "GET" })
        .then((payload) => {
          if (payload?.user) {
            setUser(payload.user);
            setDb(payload.db || emptyDB());
            writeLocalDbCache(payload.user, payload.db || emptyDB());
          }
        })
        .catch(() => {});
    } else if (billingState === "cancel") {
      toast("Paiement Stripe annulé", "info");
    }

    params.delete("billing");
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [openSettingsSection, toast, user]);

  const createTaskFromTemplate = useCallback((template) => {
    if (!template?.id) return;
    const nextTask = buildTaskFromTemplate(template, user);
    updateDb((draft) => {
      draft.tasks.push(nextTask);
      addActivityEntry(draft, { type: "task", title: "Tâche créée depuis un template", detail: nextTask.title || "Tâche" });
      addNotificationEntry(draft, { type: "task", title: nextTask.title || "Nouvelle tâche", detail: "Créée depuis un template", href: "projects", entityId: nextTask.id });
    });
    setSelectedTaskId(nextTask.id);
    setView("projects");
    toast("Tâche créée depuis le template");
  }, [toast, updateDb, user]);

  const saveTaskTemplateDraft = useCallback(() => {
    const title = taskTemplateDraft.title.trim();
    if (!title) {
      toast("Titre du template requis", "err");
      return;
    }
    const subtasks = taskTemplateDraft.subtasksText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 24)
      .map((line) => ({ id: uid(), title: line }));
    const now = new Date().toISOString();
    updateDb((draft) => {
      draft.taskTemplates = [
        {
          id: uid(),
          title,
          desc: taskTemplateDraft.desc.trim(),
          prio: taskTemplateDraft.prio || "none",
          dueOffsetDays: Math.max(0, parseInt(taskTemplateDraft.dueOffsetDays, 10) || 0),
          subtasks,
          members: [buildTaskMember(user, "editor")],
          createdAt: now,
          updatedAt: now,
        },
        ...(Array.isArray(draft.taskTemplates) ? draft.taskTemplates : []),
      ];
      addActivityEntry(draft, { type: "task", title: "Template de tâche créé", detail: title });
    });
    setTaskTemplateDraft({ title: "", desc: "", prio: "none", dueOffsetDays: "0", subtasksText: "" });
    setModal(null);
    toast("Template enregistré");
  }, [taskTemplateDraft, toast, updateDb, user]);

  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
    setCommandPaletteQuery("");
    setCommandPaletteIndex(0);
  }, []);

  const openCommandPalette = useCallback((nextQuery = "") => {
    setToolbarPanel(null);
    setCommandPaletteQuery(nextQuery);
    setCommandPaletteIndex(0);
    setCommandPaletteOpen(true);
  }, []);

  const openSearchResult = (item) => {
    setToolbarPanel(null);
    setGlobalQuery("");
    setView(item.view);
    if (item.kind === "conversation") {
      setSelectedConversationId(item.entityId);
    }
    if (item.kind === "contact") {
      const conversation = conversations.find((entry) => entry.type === "direct" && (entry.participants || []).some((participant) => participant.uid === item.entityId));
      if (conversation) setSelectedConversationId(conversation.id);
    }
    if (item.kind === "note") {
      setEditNote(item.entityId);
    }
    if (item.kind === "task" && item.entityId) {
      setSelectedTaskId(item.entityId);
    }
    if (item.kind === "task-template" && item.entityId) {
      const template = db.taskTemplates.find((entry) => entry.id === item.entityId);
      if (template) createTaskFromTemplate(template);
    }
    if (item.kind === "event") {
      const event = db.events.find((entry) => entry.id === item.entityId);
      if (event?.date) selectCalendarDate(event.date, { openDay: true });
    }
    if (item.kind === "bookmark" && item.entityId) {
      const bookmark = db.bookmarks.find((entry) => entry.id === item.entityId);
      if (bookmark?.url) {
        window.open(bookmark.url, "_blank", "noopener,noreferrer");
      }
    }
    if (item.kind === "transaction" && item.entityId) {
      const transaction = db.transactions.find((entry) => entry.id === item.entityId);
      if (transaction) openTransactionModal(transaction);
    }
  };

  const executeCommandPaletteItem = useCallback((item) => {
    if (!item) return;
    closeCommandPalette();
    if (item.kind === "action") {
      if (item.action === "new-note") {
        setView("notes");
        openNoteModal(selectedNoteCategory);
      }
      if (item.action === "new-task") {
        setView("projects");
        setModal("task");
      }
      if (item.action === "new-task-template") {
        setView("projects");
        setModal("task-template");
      }
      return;
    }
    openSearchResult(item);
    if (item.kind === "habit") setView("habits");
    if (item.kind === "task") setView("projects");
  }, [closeCommandPalette, openNoteModal, selectedNoteCategory]);

  useEffect(() => {
    document.documentElement.setAttribute("data-t", theme);
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
    const accent = getAccentPreset(db.settings?.accent);
    document.documentElement.style.setProperty("--accent", accent.value);
    document.documentElement.style.setProperty("--accent2", accent.accent2);
    document.documentElement.style.setProperty("--accent-d", accent.tint);
    document.documentElement.style.setProperty("--accent-b", accent.border);
    document.documentElement.style.setProperty("--accent-rgb", accent.rgb || "63 151 255");
    document.documentElement.style.setProperty("--app-font-size", FONT_SCALE_MAP[db.settings?.fontScale] || FONT_SCALE_MAP.md);
    document.documentElement.style.setProperty("--sans", FONT_FAMILY_MAP[db.settings?.fontFamily] || FONT_FAMILY_MAP.geist);
    document.documentElement.style.setProperty("--serif", "'Instrument Serif', Georgia, serif");
    document.documentElement.style.setProperty("--mono", "'Geist Mono', monospace");
  }, [db.settings?.accent, db.settings?.fontFamily, db.settings?.fontScale, theme]);

  useEffect(() => { dbRef.current = db; }, [db]);

  useEffect(() => {
    setProfileDraft(buildProfileDraft(db, user || { name: "", email: "" }));
  }, [db.profile, user?.email, user?.name]);

  useEffect(() => {
    setAppearanceDraft(buildAppearanceDraft(db));
  }, [db.settings]);

  const applyAppearanceChoice = useCallback((patch) => {
    setAppearanceDraft((prev) => ({ ...prev, ...patch }));
    if (patch.theme) setTheme(patch.theme);
    updateDb((draft) => {
      draft.settings.theme = patch.theme || draft.settings.theme;
      draft.settings.locale = patch.locale || draft.settings.locale;
      draft.settings.accent = patch.accent || draft.settings.accent;
    });
  }, [updateDb]);

  useEffect(() => {
    if (!user) return;

    const current = buildAppearanceDraft(db);
    const changed =
      appearanceDraft.theme !== current.theme
      || appearanceDraft.accent !== current.accent
      || appearanceDraft.locale !== current.locale;

    if (!appearanceReadyRef.current) {
      appearanceReadyRef.current = true;
      return;
    }

    if (!changed) return;

    clearTimeout(appearanceAutoSaveRef.current);
    appearanceAutoSaveRef.current = setTimeout(() => {
      setTheme(appearanceDraft.theme);
      updateDb((draft) => {
        draft.settings.theme = appearanceDraft.theme;
        draft.settings.accent = appearanceDraft.accent;
        draft.settings.locale = appearanceDraft.locale;
      });
    }, 120);

    return () => clearTimeout(appearanceAutoSaveRef.current);
  }, [
    appearanceDraft.accent,
    appearanceDraft.locale,
    appearanceDraft.theme,
    db,
    updateDb,
    user,
  ]);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobileViewport(window.innerWidth <= 768);
      setIsCompactViewport(window.innerWidth <= 1100);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      setSidebarHover(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (isAdmin) return;
    setUiStudioOpen(false);
  }, [isAdmin]);

  useEffect(() => {
    if (isMobileViewport || sidebarPinned || !sidebarHover) return undefined;
    const pointInRect = (x, y, rect) => (
      rect
      && x >= rect.left
      && x <= rect.right
      && y >= rect.top
      && y <= rect.bottom
    );
    const onMove = (event) => {
      const x = event.clientX;
      const y = event.clientY;
      const sidebarRect = sidebarRef.current?.getBoundingClientRect?.();
      const panelRect = (toolbarPanel === "account" ? accountPanelRef.current : toolbarPanel === "help" ? helpPanelRef.current : null)?.getBoundingClientRect?.();
      const insideSidebar = pointInRect(x, y, sidebarRect);
      const insidePanel = pointInRect(x, y, panelRect);
      const insideBridge = sidebarRect && panelRect
        && x >= Math.min(sidebarRect.right, panelRect.left) - 20
        && x <= Math.max(sidebarRect.right, panelRect.left) + 6
        && y >= Math.min(sidebarRect.top, panelRect.top)
        && y <= Math.max(sidebarRect.bottom, panelRect.bottom);
      if (!insideSidebar && !insidePanel && !insideBridge) {
        setSidebarHover(false);
        setToolbarPanel(null);
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [isMobileViewport, sidebarHover, sidebarPinned, toolbarPanel]);

  useEffect(() => {
    setToolbarPanel(null);
  }, [view, closeTransientSidebar]);

  useEffect(() => {
    if (!isMobileViewport) {
      setSbOpen(false);
      setMobileSidebarProgress(0);
      setHistorySwipeOffset(0);
      setHistorySwipeDirection("");
      setPullRefreshOffset(0);
      setPullRefreshArmed(false);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (previousViewRef.current === view) return;
    setModuleTransitionMode(pendingTransitionModeRef.current || "module");
    setModuleTransitionKey((prev) => prev + 1);
    pendingTransitionModeRef.current = "module";
    if (!skipViewHistoryRef.current) {
      viewBackStackRef.current = [...viewBackStackRef.current.slice(-24), previousViewRef.current];
      viewForwardStackRef.current = [];
    } else {
      skipViewHistoryRef.current = false;
    }
    previousViewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentState = window.history.state || {};
    if (currentState?.flowView !== view) {
      window.history.pushState({ ...currentState, flowView: view }, "", window.location.href);
    }
  }, [view]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.history.state?.flowView) {
      window.history.replaceState({ ...(window.history.state || {}), flowView: view }, "", window.location.href);
    }
    const onPop = (event) => {
      const nextView = event.state?.flowView;
      if (!nextView || nextView === view) return;
      pendingTransitionModeRef.current = "history-back";
      skipViewHistoryRef.current = true;
      setToolbarPanel(null);
      setSbOpen(false);
      setView(nextView);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [view]);

  useEffect(() => {
    if (!isMobileViewport) return;
    setMobileSidebarProgress(sbOpen ? 1 : 0);
  }, [isMobileViewport, sbOpen]);

  useEffect(() => {
    const syncOffline = () => setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    syncOffline();
    window.addEventListener("online", syncOffline);
    window.addEventListener("offline", syncOffline);
    return () => {
      window.removeEventListener("online", syncOffline);
      window.removeEventListener("offline", syncOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const payload = await api("/api/session", { method: "GET" });
        if (cancelled) return;

        if (payload.user) {
          const loadedDb = payload.db || readLocalDbCache(payload.user) || emptyDB();
          setUser(payload.user);
          setIsAdmin(Boolean(payload.admin));
          setDb(loadedDb);
          setTheme(loadedDb.settings?.theme || "dark");
          writeLocalDbCache(payload.user, loadedDb);
          writeLocalSessionSnapshot(payload.user);
        } else {
          setUser(null);
          setIsAdmin(false);
          setDb(emptyDB());
          clearLocalSessionSnapshot();
        }
      } catch {
        if (!cancelled) {
          const cachedUser = readLocalSessionSnapshot();
          const cachedDb = readLocalDbCache(cachedUser);
          if (cachedUser && cachedDb) {
            setUser(cachedUser);
            setIsAdmin(false);
            setDb(cachedDb);
            setTheme(cachedDb.settings?.theme || "dark");
            setSaveState("dirty");
            toast("Mode hors ligne: dernière session locale restaurée", "info");
          } else {
            setUser(null);
            setIsAdmin(false);
            setDb(emptyDB());
            clearLocalSessionSnapshot();
          }
        }
      } finally {
        if (!cancelled) setLoadingSession(false);
      }
    };

    void loadSession();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const flushWithBeacon = () => {
      if (!user || saveState !== "dirty") return;
      const body = new Blob([JSON.stringify({ db: dbRef.current })], { type: "application/json" });
      navigator.sendBeacon("/api/db", body);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushWithBeacon();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", flushWithBeacon);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", flushWithBeacon);
    };
  }, [saveState, user]);

  useEffect(() => () => clearTimeout(saveTimerRef.current), []);
  useEffect(() => () => clearTimeout(appearanceAutoSaveRef.current), []);

  const refreshConversations = useCallback(async ({ force = false } = {}) => {
    if (!user || (!force && isTextEntryActive())) return;
    try {
      const payload = await api("/api/conversations", { method: "GET" });
      setConversations(Array.isArray(payload.conversations) ? payload.conversations : []);
    } catch {}
  }, [user]);

  const refreshReports = useCallback(async () => {
    if (!user) return;
    try {
      const payload = await api("/api/conversations?view=reports", { method: "GET" });
      setReportedMessages(Array.isArray(payload.reports) ? payload.reports : []);
    } catch {}
  }, [user]);

  const refreshSessionState = useCallback(async () => {
    if (!user || saveState === "dirty" || saveState === "saving" || isTextEntryActive()) return;
    try {
      const payload = await api("/api/session", { method: "GET" });
      if (payload?.user) {
        setIsAdmin(Boolean(payload.admin));
        setDb((prev) => {
          const next = payload.db || prev;
          dbRef.current = next;
          return next;
        });
      } else {
        setIsAdmin(false);
      }
    } catch {}
  }, [saveState, user]);

  const reloadWorkspaceData = useCallback(async ({ silent = false } = {}) => {
    if (!user || pullRefreshBusy) return false;
    try {
      setPullRefreshBusy(true);
      const payload = await api("/api/session", { method: "GET" });
      if (!payload?.user) return false;
      const loadedDb = payload.db || emptyDB();
      setIsAdmin(Boolean(payload.admin));
      setDb(loadedDb);
      dbRef.current = loadedDb;
      setTheme(loadedDb.settings?.theme || "dark");
      await Promise.all([
        refreshConversations({ force: true }),
        settingsTab === "activity" ? refreshReports() : Promise.resolve(),
      ]);
      if (!silent) toast("Données mises à jour", "info");
      return true;
    } catch {
      if (!silent) toast("Actualisation impossible", "err");
      return false;
    } finally {
      setPullRefreshBusy(false);
      setPullRefreshOffset(0);
      setPullRefreshArmed(false);
    }
  }, [pullRefreshBusy, refreshConversations, refreshReports, settingsTab, toast, user]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setReportedMessages([]);
      setSelectedConversationId(null);
      return;
    }
    void refreshConversations({ force: true });
  }, [refreshConversations, user]);

  const openSupportConversation = useCallback(async () => {
    try {
      const response = await api("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ action: "open-support" }),
      });
      if (response?.conversation?.id) {
        setView("conversations");
        setSelectedConversationId(response.conversation.id);
        setToolbarPanel(null);
        await refreshConversations({ force: true });
        toast("Conversation support ouverte");
      }
    } catch (error) {
      toast(error.message || "Support indisponible", "err");
    }
  }, [refreshConversations, toast]);

  useEffect(() => {
    if (!user || settingsTab !== "activity") return;
    void refreshReports();
  }, [refreshReports, settingsTab, user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      if (isTextEntryActive()) return;
      void refreshConversations();
      void refreshSessionState();
    }, document.visibilityState === "visible" ? 1200 : 3000);
    return () => clearInterval(interval);
  }, [refreshConversations, refreshSessionState, user]);

  useEffect(() => {
    if (!user) return undefined;

    let stopped = false;
    const beat = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        await fetch("/api/presence", {
          method: "POST",
          credentials: "include",
          keepalive: true,
        });
      } catch {}
    };

    void beat();
    const interval = setInterval(() => { void beat(); }, 20000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user]);

  const contactDirectory = useMemo(() => {
    const map = new Map();
    conversations.forEach((conversation) => {
      (conversation.participants || []).forEach((participant) => {
        if (participant.uid === user?.uid) return;
        map.set(participant.uid, participant);
      });
    });
    return [...map.values()].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [conversations, user?.uid]);

  const orderedConversations = useMemo(
    () => sortConversationsList(conversations, db.settings?.conversationPrefs || {}),
    [conversations, db.settings?.conversationPrefs],
  );
  const selectedConversation = useMemo(
    () => {
      if (isMobileViewport && !selectedConversationId) return null;
      return orderedConversations.find((conversation) => conversation.id === selectedConversationId) || orderedConversations[0] || null;
    },
    [isMobileViewport, orderedConversations, selectedConversationId],
  );
  const filteredConversations = useMemo(() => {
    const needle = conversationSearch.trim().toLowerCase();
    if (!needle) return orderedConversations;
    return orderedConversations.filter((conversation) => {
      const participants = (conversation.participants || []).map((participant) => [participant.name, participant.email, participant.username, participant.phone].filter(Boolean).join(" "));
      return [conversation.title, conversation.lastMessage?.body, ...participants].join(" ").toLowerCase().includes(needle);
    });
  }, [conversationSearch, orderedConversations]);

  const selectedTask = useMemo(
    () => db.tasks.find((task) => task.id === selectedTaskId) || null,
    [db.tasks, selectedTaskId],
  );
  const selectedTaskRole = useMemo(
    () => getTaskMemberRole(selectedTask, user),
    [selectedTask, user],
  );
  const selectedTaskProgress = useMemo(
    () => percentFromSubtasks(selectedTask?.subtasks || []),
    [selectedTask?.subtasks],
  );

  const selectedConversationMessages = useMemo(() => {
    const messages = selectedConversation?.messages || [];
    const needle = conversationInfoQuery.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((message) => `${message.body || ""}`.toLowerCase().includes(needle));
  }, [conversationInfoQuery, selectedConversation?.messages]);

  useEffect(() => {
    if (!selectedConversation && orderedConversations[0] && !isMobileViewport) {
      setSelectedConversationId(orderedConversations[0].id);
    }
  }, [isMobileViewport, orderedConversations, selectedConversation]);

  useEffect(() => {
    if (selectedTaskId && !db.tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [db.tasks, selectedTaskId]);

  useEffect(() => {
    if (pendingNoteIdRef.current && db.notes.some((note) => note.id === pendingNoteIdRef.current)) {
      pendingNoteIdRef.current = "";
    }
  }, [db.notes]);

  useEffect(() => {
    if (view === "journal" || view === "finance") {
      setView("dashboard");
    }
  }, [view]);

  useEffect(() => {
    if (!editNote || !noteEditorRef.current) return;
    const note = db.notes.find((entry) => entry.id === editNote);
    if (!note) return;
    const nextHtml = noteHtmlFromStoredContent(note.content || "");
    if (noteEditorRef.current.innerHTML !== nextHtml) {
      noteEditorRef.current.innerHTML = nextHtml;
    }
  }, [db.notes, editNote]);

  useEffect(() => {
    setNoteEditorMenu("");
    setNoteContextMenu(null);
  }, [editNote, noteView, view]);

  useEffect(() => {
    if (!noteEditorMenu && !noteContextMenu) return undefined;
    const closeMenus = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "mousedown") {
        if (event.target.closest?.(".note-pop") || event.target.closest?.(".note-tool") || event.target.closest?.(".note-context-menu")) return;
      }
      setNoteEditorMenu("");
      setNoteContextMenu(null);
    };
    window.addEventListener("mousedown", closeMenus);
    window.addEventListener("keydown", closeMenus);
    return () => {
      window.removeEventListener("mousedown", closeMenus);
      window.removeEventListener("keydown", closeMenus);
    };
  }, [noteContextMenu, noteEditorMenu]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const shared = decodeSharedNotePayload(params.get("sharedNote"));
    if (!shared?.token || !shared?.title) return;
    const alreadyImported = db.notes.some((note) => note.sharedImportToken === shared.token);
    if (!alreadyImported) {
      updateDb((draft) => {
        draft.notes.unshift({
          id: uid(),
          title: shared.title,
          content: shared.content || "",
          cat: shared.cat || firstNoteCategoryKey,
          color: draft.settings?.accent || "#3f97ff",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          links: shared.links || createEmptyLinks(),
          attachments: shared.attachments || [],
          favorite: false,
          locked: false,
          sharedWith: [],
          sharedByName: shared.sharedBy || "",
          sharedImportToken: shared.token,
          sharedRole: shared.role || "reader",
        });
      });
      toast("Note partagée importée");
    }
    params.delete("sharedNote");
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }, [db.notes, toast, updateDb, user]);

  useEffect(() => {
    if (!selectedConversation) return;
    const thread = conversationThreadRef.current;
    if (!thread) return;
    requestAnimationFrame(() => {
      thread.scrollTop = thread.scrollHeight;
    });
  }, [selectedConversation?.id, selectedConversation?.messages?.length]);

  useEffect(() => {
    setConversationManageOpen(false);
    setAttachmentChooserOpen(false);
    clearVoiceDraft();
    resetVoiceRecorder();
    setGroupManageSearch("");
    setGroupManageMatches([]);
    if (!selectedConversation || selectedConversation.type !== "group") {
      setGroupManageTitle("");
      setGroupManageMembers([]);
      return;
    }
    setGroupManageTitle(selectedConversation.title || "");
    setGroupManageMembers(
      (selectedConversation.participants || [])
        .filter((participant) => participant.uid !== user?.uid)
        .map((participant) => participant.uid),
    );
  }, [resetVoiceRecorder, selectedConversation?.id, selectedConversation?.type, selectedConversation?.title, (selectedConversation?.participants || []).map((participant) => participant.uid).join(","), user?.uid]);

  const appNotifications = useMemo(() => {
    const fromDb = (Array.isArray(db.notifications) ? db.notifications : []).filter((notification) => notification?.type !== "update");
    const eventNow = new Date();
    const eventDerived = db.events.flatMap((event) => {
      if (!event.date) return [];
      const dateTime = new Date(`${event.date}T${event.time || "09:00"}:00`);
      const diffMs = dateTime.getTime() - eventNow.getTime();
      if (diffMs > 0 && diffMs < 1000 * 60 * 60 * 30) {
        return [{
          id: `event-upcoming-${event.id}`,
          type: "event",
          title: "Événement en approche",
          detail: `${event.title} · ${fmtDate(event.date)}${event.time ? ` ${event.time}` : ""}`,
          createdAt: event.date,
          readAt: "",
          href: "calendar",
          entityId: event.id,
        }];
      }
      if (diffMs < 0 && diffMs > -(1000 * 60 * 60 * 18)) {
        return [{
          id: `event-ended-${event.id}`,
          type: "event",
          title: "Événement terminé",
          detail: `${event.title} est passé.`,
          createdAt: event.date,
          readAt: "",
          href: "calendar",
          entityId: event.id,
        }];
      }
      return [];
    });

    return [...fromDb, ...eventDerived].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [db.events, db.notifications]);

  const unreadNotifications = useMemo(
    () => appNotifications.filter((notification) => !notification.readAt).length,
    [appNotifications],
  );

  const connectionNotifications = useMemo(
    () => appNotifications
      .filter((notification) => (
        !notification.readAt
        && ["admin", "security", "billing"].includes(notification.type)
      ))
      .slice(0, 3),
    [appNotifications],
  );

  const connectionNotificationSignature = useMemo(
    () => connectionNotifications.map((notification) => notification.id).join(","),
    [connectionNotifications],
  );

  const searchableLinks = useMemo(() => ({
    contacts: contactDirectory,
    conversations: conversations.map((conversation) => ({ id: conversation.id, title: conversation.title })),
    events: db.events.map((event) => ({ id: event.id, title: event.title, date: event.date })),
    bookmarks: db.bookmarks.map((bookmark) => ({ id: bookmark.id, title: bookmark.title, url: bookmark.url })),
    notes: db.notes.map((note) => ({ id: note.id, title: note.title })),
  }), [contactDirectory, conversations, db.bookmarks, db.events, db.notes]);

  const globalSearchResults = useMemo(() => {
    const needle = globalQuery.trim().toLowerCase();
    if (!needle) return [];
    const globalModules = [
      { key: "dashboard", label: "Tableau de bord" },
      { key: "notes", label: "Notes" },
      { key: "projects", label: "Projets" },
      { key: "calendar", label: "Calendrier" },
      { key: "conversations", label: "Conversations" },
      { key: "habits", label: "Habitudes" },
      { key: "goals", label: "Objectifs" },
      { key: "focus", label: "Focus" },
      { key: "bookmarks", label: "Signets" },
      { key: "settings", label: "Paramètres" },
    ];

    const items = [
      ...globalModules.map((item) => ({ id: `nav-${item.key}`, title: item.label, meta: "Module", kind: "nav", view: item.key })),
      ...db.notes.map((item) => ({ id: `note-${item.id}`, title: item.title || "Note", meta: item.content || "Note", kind: "note", view: "notes", entityId: item.id })),
      ...db.tasks.map((item) => ({ id: `task-${item.id}`, title: item.title || "Tâche", meta: item.due || item.desc || "Projet", kind: "task", view: "projects", entityId: item.id })),
      ...db.taskTemplates.map((item) => ({ id: `task-template-${item.id}`, title: item.title || "Template", meta: "Template de tâche", kind: "task-template", view: "projects", entityId: item.id })),
      ...db.events.map((item) => ({ id: `event-${item.id}`, title: item.title || "Événement", meta: `${item.date || ""} ${item.time || ""}`.trim(), kind: "event", view: "calendar" })),
      ...db.goals.map((item) => ({ id: `goal-${item.id}`, title: item.title || "Objectif", meta: `${item.progress || 0}% · ${item.deadline || "Sans date"}`, kind: "goal", view: "goals", entityId: item.id })),
      ...db.bookmarks.map((item) => ({ id: `bookmark-${item.id}`, title: item.title || "Signet", meta: item.url || "Signet", kind: "bookmark", view: "bookmarks", entityId: item.id })),
      ...conversations.map((item) => ({ id: `conv-${item.id}`, title: item.title || "Conversation", meta: item.lastMessage?.body || "Conversation", kind: "conversation", view: "conversations", entityId: item.id })),
      ...contactDirectory.map((item) => ({ id: `contact-${item.uid}`, title: item.name || item.username || item.email || "Contact", meta: [item.username ? `@${item.username}` : "", item.email || "", item.phone || ""].filter(Boolean).join(" · "), kind: "contact", view: "conversations", entityId: item.uid })),
      { id: "hidden-settings", title: "Paramètres", meta: "Profil, apparence, activité, forfait", kind: "nav", view: "settings" },
      { id: "hidden-focus", title: "Focus", meta: "Minuteur et pauses", kind: "nav", view: "focus" },
    ];

    return items
      .filter((item) => `${item.title} ${item.meta}`.toLowerCase().includes(needle))
      .slice(0, 10);
  }, [contactDirectory, conversations, db.bookmarks, db.events, db.goals, db.notes, db.taskTemplates, db.tasks, globalQuery]);

  const commandPaletteItems = useMemo(() => {
    const modules = [
      { key: "dashboard", label: "Tableau de bord", meta: "Module · accueil" },
      { key: "notes", label: "Notes", meta: "Module · capture et édition" },
      { key: "projects", label: "Projets", meta: "Module · kanban" },
      { key: "calendar", label: "Calendrier", meta: "Module · événements" },
      { key: "conversations", label: "Conversations", meta: "Module · messages" },
      { key: "habits", label: "Habitudes", meta: "Module · routines" },
      { key: "goals", label: "Objectifs", meta: "Module · progression" },
      { key: "focus", label: "Focus", meta: "Module · minuteur" },
      { key: "bookmarks", label: "Signets", meta: "Module · liens" },
      { key: "settings", label: "Paramètres", meta: "Module · profil et préférences" },
    ];

    return [
      {
        id: "action-new-note",
        title: "Nouvelle note",
        meta: "Action rapide",
        kind: "action",
        action: "new-note",
        priority: 20,
        keywords: "creer note nouvelle capture",
      },
      {
        id: "action-new-task",
        title: "Nouvelle tâche",
        meta: "Action rapide",
        kind: "action",
        action: "new-task",
        priority: 20,
        keywords: "creer tache nouvelle projet kanban",
      },
      {
        id: "action-new-task-template",
        title: "Nouveau template de tâche",
        meta: "Action rapide",
        kind: "action",
        action: "new-task-template",
        priority: 19,
        keywords: "template tache modele reutilisable kanban",
      },
      ...modules.flatMap((module) => ([
        {
          id: `goto-${module.key}`,
          title: `Aller à ${module.label}`,
          meta: module.meta,
          kind: "nav",
          view: module.key,
          priority: 18,
          keywords: `${module.label} module navigation ouvrir`,
        },
        {
          id: `module-${module.key}`,
          title: module.label,
          meta: module.meta,
          kind: "nav",
          view: module.key,
          priority: 14,
          keywords: `${module.label} module`,
        },
      ])),
      ...db.notes.map((item) => ({
        id: `cp-note-${item.id}`,
        title: item.title || "Note",
        meta: item.content || "Note",
        kind: "note",
        view: "notes",
        entityId: item.id,
        priority: 12,
        keywords: `${item.cat || ""} note`,
      })),
      ...db.tasks.map((item) => ({
        id: `cp-task-${item.id}`,
        title: item.title || "Tâche",
        meta: [item.desc || "", item.due || "", item.prio || ""].filter(Boolean).join(" · ") || "Tâche",
        kind: "task",
        view: "projects",
        entityId: item.id,
        priority: 12,
        keywords: `${item.prio || ""} ${item.due || ""} kanban projet`,
      })),
      ...db.taskTemplates.map((item) => ({
        id: `cp-task-template-${item.id}`,
        title: item.title || "Template de tâche",
        meta: item.desc || "Template réutilisable",
        kind: "task-template",
        view: "projects",
        entityId: item.id,
        priority: 11,
        keywords: `template modele tache ${item.prio || ""}`,
      })),
      ...db.events.map((item) => ({
        id: `cp-event-${item.id}`,
        title: item.title || "Événement",
        meta: `${item.date || ""} ${item.time || ""}`.trim() || "Événement",
        kind: "event",
        view: "calendar",
        entityId: item.id,
        priority: 11,
        keywords: `${item.date || ""} ${item.time || ""} calendrier event`,
      })),
      ...db.habits.map((item) => ({
        id: `cp-habit-${item.id}`,
        title: item.name || "Habitude",
        meta: item.desc || "Habitude",
        kind: "habit",
        view: "habits",
        entityId: item.id,
        priority: 10,
        keywords: `${item.icon || ""} routine habitude`,
      })),
      ...db.bookmarks.map((item) => ({
        id: `cp-bookmark-${item.id}`,
        title: item.title || "Signet",
        meta: item.url || item.note || "Signet",
        kind: "bookmark",
        view: "bookmarks",
        entityId: item.id,
        priority: 9,
        keywords: "signet bookmark lien",
      })),
      ...conversations.map((item) => ({
        id: `cp-conversation-${item.id}`,
        title: item.title || "Conversation",
        meta: item.lastMessage?.body || "Conversation",
        kind: "conversation",
        view: "conversations",
        entityId: item.id,
        priority: 9,
        keywords: "message conversation discussion",
      })),
    ];
  }, [conversations, db.bookmarks, db.events, db.habits, db.notes, db.taskTemplates, db.tasks]);

  const commandPaletteResults = useMemo(() => {
    const needle = commandPaletteQuery.trim();
    const items = !needle
      ? commandPaletteItems
        .slice()
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, 10)
      : commandPaletteItems
        .map((item) => {
          const haystack = `${item.title} ${item.meta || ""} ${item.keywords || ""}`;
          const score = Math.max(
            getFuzzyScore(item.title, needle) + 10,
            getFuzzyScore(haystack, needle),
          );
          return { item, score };
        })
        .filter(({ score }) => score >= 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if ((b.item.priority || 0) !== (a.item.priority || 0)) return (b.item.priority || 0) - (a.item.priority || 0);
          return `${a.item.title}`.localeCompare(`${b.item.title}`, "fr");
        })
        .slice(0, 12)
        .map(({ item }) => item);

    return items;
  }, [commandPaletteItems, commandPaletteQuery]);

  const shortcutBindings = useMemo(() => {
    const stored = db.settings?.shortcuts && typeof db.settings.shortcuts === "object" ? db.settings.shortcuts : {};
    return Object.entries({ ...DEFAULT_SHORTCUTS, ...stored }).reduce((acc, [key, combo]) => {
      acc[key] = normalizeShortcutCombo(combo);
      return acc;
    }, {});
  }, [db.settings?.shortcuts]);

  const syncAuthUrl = useCallback((mode = "login") => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (mode === "forgot") url.searchParams.set("auth", "forgot");
    else url.searchParams.delete("auth");
    url.searchParams.delete("authGoogle");
    window.history.replaceState({}, "", url.toString());
  }, []);

  // ── Auth functions ──
  const doAuth = async (isRegister) => {
    const email = authEmailInputRef.current?.value?.trim();
    const pwd = authPasswordInputRef.current?.value;
    const name = authNameInputRef.current?.value?.trim();
    const pwd2 = authPasswordConfirmInputRef.current?.value;
    setAuthErr("");
    if (!email || !pwd) return setAuthErr("Email et mot de passe requis");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setAuthErr("Email invalide");
    if (pwd.length < 8) return setAuthErr("Mot de passe : 8 caractères minimum");

    try {
      setAuthBusy(true);

      if (isRegister) {
        if (!name) return setAuthErr("Nom requis");
        if (pwd !== pwd2) return setAuthErr("Les mots de passe ne correspondent pas");
      }

      const payload = await api(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(isRegister ? { name, email, password: pwd } : { email, password: pwd }),
      });

      setIntroReverse(true);
      setIntroPhase("enter");
      setAuthScreenClosing(true);
      await new Promise((resolve) => window.setTimeout(resolve, 420));
      const loadedDb = payload.db || emptyDB();
      setUser(payload.user);
      setIsAdmin(Boolean(payload.admin));
      setDb(loadedDb);
      setTheme(loadedDb.settings?.theme || "dark");
      writeLocalDbCache(payload.user, loadedDb);
      writeLocalSessionSnapshot(payload.user);
      setView("dashboard");
      setSaveState("saved");
      setAuthRecoveryMode("idle");
      syncAuthUrl("login");
      setIntroReverse(false);
      setIntroPhase("hidden");
      toast(isRegister ? "Compte créé !" : "Connecté !");
    } catch (error) {
      setAuthErr(error.message || "Connexion impossible");
    } finally {
      setAuthBusy(false);
      setAuthScreenClosing(false);
    }
  };

  const requestPasswordReset = async () => {
    const email = authEmailInputRef.current?.value?.trim();
    setAuthErr("");
    if (!email) return setAuthErr("Entrez votre email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setAuthErr("Email invalide");

    try {
      setAuthRecoveryBusy(true);
      const payload = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      if (payload?.sent) {
        setAuthRecoveryEmail(email);
        setAuthRecoveryCode("");
        setAuthRecoveryMode("code");
        syncAuthUrl("forgot");
        toast(payload?.message || "Code envoyé par email");
      } else {
        setAuthRecoveryEmail(email);
        setAuthRecoveryCode("");
        setAuthRecoveryMode("request");
        syncAuthUrl("forgot");
        toast(payload?.message || "Si un compte existe pour cet email, un message sera envoyé.");
      }
    } catch (error) {
      setAuthErr(error.message || "Envoi impossible");
    } finally {
      setAuthRecoveryBusy(false);
    }
  };

  const verifyPasswordResetCode = async () => {
    const email = authRecoveryEmail.trim().toLowerCase();
    const code = authRecoveryCode.trim();
    setAuthErr("");
    if (!email || !code) return setAuthErr("Email et code requis");
    try {
      setAuthRecoveryBusy(true);
      await api("/api/auth/reset-password", {
        method: "PUT",
        body: JSON.stringify({ email, code }),
      });
      setAuthRecoveryMode("reset");
      toast("Code validé");
    } catch (error) {
      setAuthErr(error.message || "Vérification impossible");
    } finally {
      setAuthRecoveryBusy(false);
    }
  };

  const applyPasswordReset = async () => {
    const pwd = authPasswordInputRef.current?.value || "";
    const pwd2 = authPasswordConfirmInputRef.current?.value || "";
    setAuthErr("");
    if (!authRecoveryEmail.trim() || !authRecoveryCode.trim()) return setAuthErr("Code invalide ou expiré");
    if (pwd.length < 8) return setAuthErr("Mot de passe : 8 caractères minimum");
    if (pwd !== pwd2) return setAuthErr("Les mots de passe ne correspondent pas");

    try {
      setAuthRecoveryBusy(true);
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: authRecoveryEmail.trim().toLowerCase(), code: authRecoveryCode.trim(), password: pwd }),
      });
      setAuthRecoveryMode("done");
      toast("Mot de passe réinitialisé");
    } catch (error) {
      setAuthErr(error.message || "Réinitialisation impossible");
    } finally {
      setAuthRecoveryBusy(false);
    }
  };

  const doLogout = useCallback(async () => {
    try {
      if (saveState === "dirty") {
        await flushSave(dbRef.current);
      }
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setIsAdmin(false);
    setDb(emptyDB());
    setView("dashboard");
    setSaveState("saved");
    setAuthTab("login");
    setAuthErr("");
    setAuthRecoveryMode("idle");
    setAuthRecoveryEmail("");
    setAuthRecoveryCode("");
    clearLocalSessionSnapshot();
    syncAuthUrl("login");
    runFlowIntro();
    toast("Déconnecté", "info");
  }, [flushSave, runFlowIntro, saveState, syncAuthUrl, toast]);

  useEffect(() => {
    let cancelled = false;
    const runSearch = async () => {
      if (!newConversationSearch.trim()) {
        setConversationMatches([]);
        return;
      }
      try {
        const payload = await api("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ action: "search-users", query: newConversationSearch }),
        });
        if (!cancelled) {
          setConversationMatches(Array.isArray(payload.users) ? payload.users : []);
        }
      } catch {
        if (!cancelled) setConversationMatches([]);
      }
    };
    void runSearch();
    return () => { cancelled = true; };
  }, [newConversationSearch]);

  useEffect(() => {
    let cancelled = false;
    const runSearch = async () => {
      if (!groupManageSearch.trim()) {
        setGroupManageMatches([]);
        return;
      }
      try {
        const payload = await api("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ action: "search-users", query: groupManageSearch }),
        });
        if (!cancelled) {
          setGroupManageMatches(Array.isArray(payload.users) ? payload.users : []);
        }
      } catch {
        if (!cancelled) setGroupManageMatches([]);
      }
    };
    void runSearch();
    return () => { cancelled = true; };
  }, [groupManageSearch]);

  const runConversationAction = useCallback(async (action, payload = {}) => {
    setConversationBusy(true);
    try {
      const response = await api("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ action, ...payload }),
      });
      if (response.conversation) {
        setConversations((prev) => {
          const others = prev.filter((conversation) => conversation.id !== response.conversation.id);
          return [response.conversation, ...others];
        });
        setSelectedConversationId(response.conversation.id);
        void refreshConversations({ force: true });
      } else if (response.ok) {
        void refreshConversations({ force: true });
      }
      if (response.deletedConversationId && selectedConversationId === response.deletedConversationId) {
        setSelectedConversationId(null);
        setConversations((prev) => prev.filter((conversation) => conversation.id !== response.deletedConversationId));
      }
      return response;
    } finally {
      setConversationBusy(false);
    }
  }, [refreshConversations, selectedConversationId]);

  const submitReport = useCallback(async ({ messageId = "", reason = "", details = "" } = {}) => {
    const normalizedReason = `${reason}`.trim();
    if (!normalizedReason) return;

    if (messageId) {
      if (!selectedConversationId) return;
      try {
        await runConversationAction("report-message", {
          conversationId: selectedConversationId,
          messageId,
          reason: details.trim() ? `${normalizedReason} · ${details.trim()}` : normalizedReason,
        });
        void refreshReports();
        toast("Message signalé");
      } catch (error) {
        toast(error.message || "Signalement impossible", "err");
      }
      return;
    }

    try {
      await runConversationAction("report-issue", {
        reason: normalizedReason,
        details,
      });
      void refreshReports();
      toast("Bug signalé");
    } catch (error) {
      toast(error.message || "Signalement impossible", "err");
    }
  }, [refreshReports, runConversationAction, selectedConversationId, toast]);

  const markNotificationsAsRead = () => {
    updateDb((draft) => {
      draft.notifications = (draft.notifications || []).map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      }));
    });
  };

  const markNotificationIdsAsRead = useCallback((ids = []) => {
    if (!ids.length) return;
    updateDb((draft) => {
      draft.notifications = (draft.notifications || []).map((notification) => (
        ids.includes(notification.id)
          ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
          : notification
      ));
    });
  }, [updateDb]);

  const dismissViewedNotifications = useCallback(() => {
    updateDb((draft) => {
      draft.notifications = (draft.notifications || []).filter((notification) => !notification.readAt);
    });
  }, [updateDb]);

  const openNotificationTarget = useCallback((notification, options = {}) => {
    const { closePanel = false, markRead = true } = options;
    if (markRead && notification?.id) {
      markNotificationIdsAsRead([notification.id]);
    }
    if (closePanel) {
      setToolbarPanel(null);
    }
    if (notification?.href) setView(notification.href);
    if (notification?.href === "conversations" && notification.entityId) setSelectedConversationId(notification.entityId);
    if (notification?.href === "calendar" && notification.entityId) {
      const event = db.events.find((entry) => entry.id === notification.entityId);
      if (event?.date) selectCalendarDate(event.date, { openDay: true });
    }
  }, [db.events, markNotificationIdsAsRead, selectCalendarDate]);

  useEffect(() => {
    if (!user || loadingSession) return;
    if (!connectionNotificationSignature) {
      setConnectionNoticeOpen(false);
      setConnectionNoticeIds([]);
      seenConnectionNoticeRef.current = "";
      return;
    }
    if (seenConnectionNoticeRef.current === connectionNotificationSignature) return;
    seenConnectionNoticeRef.current = connectionNotificationSignature;
    setConnectionNoticeIds(connectionNotifications.map((notification) => notification.id));
    setConnectionNoticeOpen(true);
  }, [connectionNotificationSignature, connectionNotifications, loadingSession, user]);

  useEffect(() => {
    if (!messageEdit.id) return;
    editMessageRef.current?.focus();
  }, [messageEdit.id]);

  useEffect(() => {
    if (!user) return;
    void syncDevicePushState();
    void ensurePushSubscription();
  }, [ensurePushSubscription, syncDevicePushState, user]);

  useEffect(() => {
    if (!messageMenu) return;
    const close = () => setMessageMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [messageMenu]);

  useEffect(() => {
    if (!selectedConversation?.id || !selectedConversation.unreadCount) return;
    void runConversationAction("mark-read", { conversationId: selectedConversation.id });
  }, [runConversationAction, selectedConversation?.id, selectedConversation?.unreadCount]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    appNotifications.forEach((notification) => {
      if (notification.readAt || seenBrowserNotificationsRef.current.has(notification.id)) return;
      seenBrowserNotificationsRef.current.add(notification.id);
      if (notification.type === "call") {
        try {
          const audio = new AudioContext();
          const playTone = (delay, frequency) => {
            const osc = audio.createOscillator();
            const gain = audio.createGain();
            osc.type = "sine";
            osc.frequency.value = frequency;
            osc.connect(gain);
            gain.connect(audio.destination);
            const startAt = audio.currentTime + delay;
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.4);
            osc.start(startAt);
            osc.stop(startAt + 0.42);
          };
          playTone(0, 660);
          playTone(0.5, 660);
        } catch {}
      }
      if (document.visibilityState === "hidden" && Notification.permission === "granted" && ["message", "call", "reaction", "event", "update", "admin", "security"].includes(notification.type)) {
        new Notification(notification.title, { body: notification.detail || "Nouvelle activité sur Flow" });
      }
    });
  }, [appNotifications]);

  // ── Greeting ──
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Bonne nuit";
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }, []);

  // ── Focus timer ──
  const toggleFocus = () => {
    if (focusState.running) {
      clearInterval(focusRef.current);
      setFocusState(p => ({ ...p, running: false }));
    } else {
      setFocusState(p => ({ ...p, running: true }));
      focusRef.current = setInterval(() => {
        setFocusState(prev => {
          if (prev.sec <= 1) {
            clearInterval(focusRef.current);
            try { const ac = new AudioContext(); const o = ac.createOscillator(); o.frequency.value = 880; const g = ac.createGain(); o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.3, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8); o.start(); o.stop(ac.currentTime + 0.8); } catch {}
            const dur = db.settings?.focusDur || 25;
            const sb = db.settings?.shortBreak || 5;
            updateDb((draft) => {
              addNotificationEntry(draft, {
                type: "focus",
                title: prev.mode === "focus" ? "Session focus terminée" : "Pause terminée",
                detail: prev.mode === "focus" ? "Votre minuterie a fini, place à la pause." : "La pause est terminée, vous pouvez reprendre.",
                href: "focus",
              });
            });
            toast(prev.mode === "focus" ? "Focus terminé" : "Pause terminée", "info");
            if (prev.mode === "focus") {
              return { running: false, mode: "short", sec: sb * 60, total: sb * 60 };
            }
            return { running: false, mode: "focus", sec: dur * 60, total: dur * 60 };
          }
          return { ...prev, sec: prev.sec - 1 };
        });
      }, 1000);
    }
  };

  const resetFocus = () => {
    clearInterval(focusRef.current);
    const dur = db.settings?.focusDur || 25;
    setFocusState({ running: false, mode: "focus", sec: dur * 60, total: dur * 60 });
  };

  const applyThemeToggle = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setAppearanceDraft((prev) => ({ ...prev, theme: nextTheme }));
    setTheme(nextTheme);
    updateDb((draft) => {
      draft.settings.theme = nextTheme;
      addActivityEntry(draft, { type: "appearance", title: "Thème changé rapidement", detail: nextTheme === "dark" ? "Mode sombre" : "Mode clair" });
    });
  }, [theme, updateDb]);

  const goToHistoryView = useCallback((direction) => {
    if (direction === "back") {
      const previous = viewBackStackRef.current.at(-1);
      if (!previous) return false;
      viewBackStackRef.current = viewBackStackRef.current.slice(0, -1);
      viewForwardStackRef.current = [...viewForwardStackRef.current, view];
      skipViewHistoryRef.current = true;
      pendingTransitionModeRef.current = "history-back";
      setToolbarPanel(null);
      setSbOpen(false);
      setView(previous);
      return true;
    }

    const next = viewForwardStackRef.current.at(-1);
    if (!next) return false;
    viewForwardStackRef.current = viewForwardStackRef.current.slice(0, -1);
    viewBackStackRef.current = [...viewBackStackRef.current, view];
    skipViewHistoryRef.current = true;
    pendingTransitionModeRef.current = "history-forward";
    setToolbarPanel(null);
    setSbOpen(false);
    setView(next);
    return true;
  }, [view]);

  const handleAppTouchStart = useCallback((event) => {
    if (!isMobileViewport || !event.touches?.[0]) return;
    const touch = event.touches[0];
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const contentScrollTop = contentRef.current?.scrollTop || 0;
    const contentRect = contentRef.current?.getBoundingClientRect();
    const sidebarRect = sidebarRef.current?.getBoundingClientRect();
    let mode = "";

    if (!sbOpen && touch.clientX <= 30) mode = "sidebar-open";
    else if (sbOpen && sidebarRect && touch.clientX >= sidebarRect.left && touch.clientX <= sidebarRect.right && touch.clientY >= sidebarRect.top && touch.clientY <= sidebarRect.bottom) mode = "sidebar-close";
    else if (!sbOpen && contentRect && contentScrollTop <= 0 && touch.clientY >= contentRect.top && touch.clientY <= contentRect.top + 120) mode = "pull-refresh";
    else if (!sbOpen && touch.clientX >= 58 && touch.clientX <= 138 && contentRect && touch.clientY >= contentRect.top) mode = "history-back";
    else if (!sbOpen && touch.clientX <= viewportWidth - 58 && touch.clientX >= viewportWidth - 138 && contentRect && touch.clientY >= contentRect.top) mode = "history-forward";

    touchGestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      lastX: touch.clientX,
      lastY: touch.clientY,
      active: true,
      handled: false,
      mode,
      lockAxis: "",
      sidebarStartProgress: mobileSidebarProgress,
    };
  }, [isMobileViewport, mobileSidebarProgress, sbOpen]);

  const handleAppTouchMove = useCallback((event) => {
    if (!isMobileViewport || !touchGestureRef.current.active || !event.touches?.[0]) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchGestureRef.current.startX;
    const deltaY = touch.clientY - touchGestureRef.current.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const sidebarWidth = sidebarRef.current?.getBoundingClientRect().width || Math.min((typeof window !== "undefined" ? window.innerWidth : 0) * 0.86, 320);

    if (!touchGestureRef.current.lockAxis && (absX > 10 || absY > 10)) {
      touchGestureRef.current.lockAxis = absX > absY ? "x" : "y";
    }

    touchGestureRef.current.lastX = touch.clientX;
    touchGestureRef.current.lastY = touch.clientY;
    if (touchGestureRef.current.mode === "sidebar-open" || touchGestureRef.current.mode === "sidebar-close") {
      if (touchGestureRef.current.lockAxis === "x") {
        event.preventDefault();
        const rawProgress = touchGestureRef.current.mode === "sidebar-open"
          ? deltaX / Math.max(sidebarWidth, 1)
          : 1 + (deltaX / Math.max(sidebarWidth, 1));
        setMobileSidebarProgress(Math.max(0, Math.min(1, rawProgress)));
      }
      return;
    }

    if (touchGestureRef.current.mode === "history-back" || touchGestureRef.current.mode === "history-forward") {
      if (touchGestureRef.current.lockAxis === "x") {
        const offset = touchGestureRef.current.mode === "history-back"
          ? Math.max(0, deltaX)
          : Math.min(0, deltaX);
        if (Math.abs(offset) > 0) {
          event.preventDefault();
          setHistorySwipeDirection(touchGestureRef.current.mode === "history-back" ? "back" : "forward");
          setHistorySwipeOffset(offset);
        }
      }
      return;
    }

    if (touchGestureRef.current.mode === "pull-refresh" && touchGestureRef.current.lockAxis !== "x" && deltaY > 0) {
      event.preventDefault();
      const easedOffset = Math.min(118, deltaY * 0.52);
      setPullRefreshOffset(easedOffset);
      setPullRefreshArmed(easedOffset >= 72);
    }
  }, [isMobileViewport]);

  const handleAppTouchEnd = useCallback(async () => {
    if (!isMobileViewport || !touchGestureRef.current.active || touchGestureRef.current.handled) {
      touchGestureRef.current.active = false;
      return;
    }

    const { startX, startY, lastX, lastY, mode } = touchGestureRef.current;
    touchGestureRef.current.active = false;
    const deltaX = lastX - startX;
    const deltaY = lastY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const sidebarWidth = sidebarRef.current?.getBoundingClientRect().width || Math.min(viewportWidth * 0.86, 320);

    if (mode === "sidebar-open") {
      const shouldOpen = mobileSidebarProgress > 0.42 || deltaX > sidebarWidth * 0.16;
      setSbOpen(shouldOpen);
      setMobileSidebarProgress(shouldOpen ? 1 : 0);
      return;
    }

    if (mode === "sidebar-close") {
      const shouldStayOpen = mobileSidebarProgress > 0.42 && deltaX > -(sidebarWidth * 0.12);
      setSbOpen(shouldStayOpen);
      setMobileSidebarProgress(shouldStayOpen ? 1 : 0);
      return;
    }

    if (mode === "pull-refresh") {
      if (pullRefreshArmed && pullRefreshOffset >= 72) {
        setPullRefreshOffset(72);
        await reloadWorkspaceData({ silent: true });
      } else {
        setPullRefreshOffset(0);
        setPullRefreshArmed(false);
      }
      return;
    }

    if (mode === "history-back" || mode === "history-forward") {
      const threshold = Math.min(96, viewportWidth * 0.22);
      const accepted = mode === "history-back"
        ? historySwipeOffset >= threshold
        : Math.abs(historySwipeOffset) >= threshold;
      setHistorySwipeOffset(0);
      setHistorySwipeDirection("");
      if (accepted) {
        if (goToHistoryView(mode === "history-back" ? "back" : "forward")) {
          touchGestureRef.current.handled = true;
        }
      }
      return;
    }

    if (absX < 56 || absX < absY * 1.25) return;

    if (!sbOpen && startX <= 24 && deltaX > 72) {
      setSbOpen(true);
      touchGestureRef.current.handled = true;
      return;
    }

    if (sbOpen && startX <= Math.min(viewportWidth * 0.82, 320) && deltaX < -72) {
      setSbOpen(false);
      touchGestureRef.current.handled = true;
      return;
    }

    if (!sbOpen && startX > 56 && startX < viewportWidth - 56 && deltaX > 88) {
      if (goToHistoryView("back")) touchGestureRef.current.handled = true;
      return;
    }

    if (!sbOpen && startX >= viewportWidth - 64 && deltaX < -88) {
      if (goToHistoryView("forward")) touchGestureRef.current.handled = true;
    }
  }, [goToHistoryView, historySwipeOffset, isMobileViewport, mobileSidebarProgress, pullRefreshArmed, pullRefreshOffset, reloadWorkspaceData, sbOpen]);

  const runShortcutAction = useCallback((actionKey) => {
    setToolbarPanel(null);
    if (actionKey !== "commandPalette") closeCommandPalette();

    if (actionKey === "commandPalette") {
      if (commandPaletteOpen) closeCommandPalette();
      else openCommandPalette(globalQuery);
      return;
    }
    if (actionKey === "toggleTheme") return applyThemeToggle();
    if (actionKey === "newNote") {
      setView("notes");
      openNoteModal(selectedNoteCategory);
      return;
    }
    if (actionKey === "newTask") {
      setView("projects");
      setModal("task");
      return;
    }
    if (actionKey === "newEvent") {
      setView("calendar");
      openEventModal({ date: selectedCalendarDate || todayStr(), time: "09:00" });
      return;
    }
    if (actionKey === "newBookmark") {
      setView("bookmarks");
      openBookmarkModal();
      return;
    }

    const viewMap = {
      goDashboard: "dashboard",
      goNotes: "notes",
      goProjects: "projects",
      goCalendar: "calendar",
      goConversations: "conversations",
      goHabits: "habits",
      goGoals: "goals",
      goFocus: "focus",
      goBookmarks: "bookmarks",
      goSettings: "settings",
    };
    const targetView = viewMap[actionKey];
    if (targetView) {
      setView(targetView);
      if (targetView === "calendar") setCalendarDayOpen(false);
      if (targetView !== "notes") setEditNote(null);
    }
  }, [
    applyThemeToggle,
    closeCommandPalette,
    commandPaletteOpen,
    globalQuery,
    openBookmarkModal,
    openCommandPalette,
    openEventModal,
    openNoteModal,
    selectedCalendarDate,
    selectedNoteCategory,
  ]);

  const saveShortcutBinding = useCallback((actionKey, combo) => {
    const normalized = normalizeShortcutCombo(combo);
    updateDb((draft) => {
      draft.settings.shortcuts = {
        ...(draft.settings.shortcuts || {}),
        [actionKey]: normalized,
      };
      addActivityEntry(draft, {
        type: "appearance",
        title: "Raccourci mis à jour",
        detail: `${SHORTCUT_ACTIONS.find((action) => action.key === actionKey)?.label || actionKey} · ${formatShortcutLabel(normalized)}`,
      });
    });
  }, [updateDb]);

  const resetShortcutBindings = useCallback(() => {
    updateDb((draft) => {
      draft.settings.shortcuts = { ...DEFAULT_SHORTCUTS };
      addActivityEntry(draft, { type: "appearance", title: "Raccourcis réinitialisés", detail: "Les raccourcis par défaut Flow ont été restaurés." });
    });
    setShortcutCaptureAction("");
    toast("Raccourcis réinitialisés");
  }, [toast, updateDb]);

  useEffect(() => { return () => clearInterval(focusRef.current); }, []);
  useEffect(() => {
    if (!releaseWidgetOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setReleaseWidgetOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [releaseWidgetOpen]);
  useEffect(() => {
    if (!commandPaletteOpen) return undefined;
    const timer = window.setTimeout(() => {
      commandPaletteInputRef.current?.focus();
      commandPaletteInputRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [commandPaletteOpen]);
  useEffect(() => {
    setCommandPaletteIndex(0);
  }, [commandPaletteQuery]);
  useEffect(() => {
    if (commandPaletteIndex <= commandPaletteResults.length - 1) return;
    setCommandPaletteIndex(0);
  }, [commandPaletteIndex, commandPaletteResults.length]);
  useEffect(() => {
    if (!shortcutCaptureAction) return undefined;
    const onKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setShortcutCaptureAction("");
        return;
      }
      if (["Backspace", "Delete"].includes(event.key)) {
        saveShortcutBinding(shortcutCaptureAction, "");
        setShortcutCaptureAction("");
        toast("Raccourci retiré", "info");
        return;
      }
      const combo = shortcutFromKeyboardEvent(event);
      if (!combo) return;
      saveShortcutBinding(shortcutCaptureAction, combo);
      setShortcutCaptureAction("");
      toast(`Raccourci enregistré: ${formatShortcutLabel(combo)}`);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [saveShortcutBinding, shortcutCaptureAction, toast]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!user || shortcutCaptureAction) return;
      if (commandPaletteOpen) return;
      const combo = shortcutFromKeyboardEvent(event);
      if (!combo) return;
      const action = SHORTCUT_ACTIONS.find((item) => shortcutBindings[item.key] === combo);
      if (!action) return;
      if (isTextEntryActive() && !action.allowInInput) return;
      event.preventDefault();
      runShortcutAction(action.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, runShortcutAction, shortcutBindings, shortcutCaptureAction, user]);
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!commandPaletteOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeCommandPalette();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandPaletteIndex((prev) => (commandPaletteResults.length ? (prev + 1) % commandPaletteResults.length : 0));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandPaletteIndex((prev) => (commandPaletteResults.length ? (prev - 1 + commandPaletteResults.length) % commandPaletteResults.length : 0));
        return;
      }
      if (event.key === "Enter") {
        const target = commandPaletteResults[commandPaletteIndex];
        if (!target) return;
        event.preventDefault();
        executeCommandPaletteItem(target);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    closeCommandPalette,
    commandPaletteIndex,
    commandPaletteOpen,
    commandPaletteResults,
    executeCommandPaletteItem,
  ]);

  // ── Navigation items ──
  const NAV = [
    { key: "dashboard", label: "Tableau de bord", icon: I.home },
    { key: "notes", label: "Notes", icon: I.edit, badge: db.notes.length || null },
    { key: "projects", label: "Projets", icon: I.kanban, badge: db.tasks.length || null },
    { key: "calendar", label: "Calendrier", icon: I.cal, badge: db.events.filter(e => e.date >= todayStr()).length || null },
    { key: "conversations", label: "Conversations", icon: I.msg, badge: conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0) || null },
    { key: "habits", label: "Habitudes", icon: I.check, badge: db.habits.length || null },
    { key: "goals", label: "Objectifs", icon: I.target, badge: db.goals.filter((goal) => (goal.progress || 0) < 100).length || null },
    { key: "focus", label: "Focus", icon: I.clock, badge: focusState.running ? "●" : null },
    { key: "bookmarks", label: "Signets", icon: I.bookmark },
  ];
  const spaceNav = NAV.filter((item) => ["dashboard", "notes", "projects", "calendar", "conversations"].includes(item.key));
  const organizationNav = NAV.filter((item) => ["habits", "goals", "focus", "bookmarks"].includes(item.key));
  const generalNav = [
    { key: "help", label: "Aide et support", icon: I.help, onClick: () => setToolbarPanel((prev) => prev === "help" ? null : "help") },
    { key: "logout", label: "Se déconnecter", icon: I.logout, onClick: () => { void askLogout(); } },
  ];

  const TITLES = {};
  NAV.forEach(n => TITLES[n.key] = n.label);
  TITLES.settings = "Paramètres";
  const releaseWidget = releaseWidgetOpen ? (
    <ReleaseWidget
      release={RELEASE}
      label={releaseLabel}
      onClose={() => setReleaseWidgetOpen(false)}
    />
  ) : null;
  const splashOverlay = introPhase !== "hidden" ? <LoadingWorkspaceShell exiting={introPhase === "exit"} reverse={introReverse} /> : null;

  if (loadingSession) {
    return (
      <>
        <style>{CSS}</style>
        {splashOverlay}
      </>
    );
  }

  // ═══════ AUTH SCREEN ═══════
  if (!user) {
    const isForgotFlow = authRecoveryMode !== "idle";
    const authTitle = authRecoveryMode === "request"
      ? "Réinitialiser le mot de passe."
      : authRecoveryMode === "code"
        ? "Entre le code reçu."
        : authRecoveryMode === "reset"
          ? "Choisis un nouveau mot de passe."
          : authRecoveryMode === "done"
            ? "Mot de passe mis à jour."
            : authTab === "login"
              ? "Entre dans Flow."
              : "Crée ton espace Flow.";
    return (
      <>
        <style>{CSS}</style>
        <div className="auth-wrap">
          <div className={`auth-card ${authScreenClosing ? "exit" : ""}`}>
            <div className="auth-light" />
            <div className="auth-logo">
              <div className="auth-mark"><FlowLogo size={36} /></div>
              <div className="auth-name">Flow</div>
              <ReleaseBadge className="auth-release" label={releaseBadgeLabel} onClick={() => setReleaseWidgetOpen(true)} />
            </div>
            <div className="auth-welcome">
              <h1>{authTitle}</h1>
            </div>
            <form
              style={introPhase !== "hidden" ? { pointerEvents: "none" } : undefined}
              onSubmit={(event) => {
                event.preventDefault();
                if (authRecoveryMode === "request") {
                  void requestPasswordReset();
                  return;
                }
                if (authRecoveryMode === "code") {
                  void verifyPasswordResetCode();
                  return;
                }
                if (authRecoveryMode === "reset") {
                  void applyPasswordReset();
                  return;
                }
                void doAuth(authTab === "register");
              }}
            >
              {authRecoveryMode === "request" ? (
                <div className="field">
                  <label>Entrer votre mail</label>
                  <input ref={authEmailInputRef} className="finput" id="a-email" type="email" placeholder="email@exemple.com" autoComplete="off" spellCheck="false" autoCapitalize="none" />
                </div>
              ) : authRecoveryMode === "code" ? (
                <>
                  <div className="field">
                    <label>Email</label>
                    <input ref={authEmailInputRef} className="finput" id="a-email" type="email" value={authRecoveryEmail} onChange={(event) => setAuthRecoveryEmail(event.target.value)} placeholder="email@exemple.com" autoComplete="off" spellCheck="false" autoCapitalize="none" />
                  </div>
                  <div className="field">
                    <label>Code reçu par email</label>
                    <input className="finput" value={authRecoveryCode} onChange={(event) => setAuthRecoveryCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" inputMode="numeric" autoComplete="one-time-code" />
                  </div>
                </>
              ) : authRecoveryMode === "reset" ? (
                <>
                  <div className="field"><label>Nouveau mot de passe</label><input ref={authPasswordInputRef} className="finput" id="a-reset-pwd" type="password" placeholder="8 caractères min." autoComplete="new-password" /></div>
                  <div className="field"><label>Confirmer</label><input ref={authPasswordConfirmInputRef} className="finput" id="a-reset-pwd2" type="password" placeholder="Confirmez le mot de passe" autoComplete="new-password" /></div>
                </>
              ) : (
                <>
                  {authTab === "register" && (
                    <div className="field"><label>Nom complet</label><input ref={authNameInputRef} className="finput" id="a-name" placeholder="Votre nom" autoComplete="name" /></div>
                  )}
                  <div className="field"><label>Email</label><input ref={authEmailInputRef} className="finput" id="a-email" type="email" placeholder="email@exemple.com" autoComplete="off" spellCheck="false" autoCapitalize="none" /></div>
                  <div className="field"><label>Mot de passe</label><input ref={authPasswordInputRef} className="finput" id="a-pwd" type="password" placeholder="8 caractères min." autoComplete="off" /></div>
                  {authTab === "login" && (
                    <div className="auth-inline-link">
                      <button type="button" disabled={authRecoveryBusy || !authEmailRecoveryEnabled} onClick={() => { setAuthRecoveryMode("request"); setAuthErr(""); syncAuthUrl("forgot"); }}>Mot de passe oublié ?</button>
                    </div>
                  )}
                  {authTab === "register" && (
                    <div className="field"><label>Confirmer le mot de passe</label><input ref={authPasswordConfirmInputRef} className="finput" id="a-pwd2" type="password" placeholder="Confirmez" autoComplete="new-password" /></div>
                  )}
                </>
              )}
            <div className="auth-err">{authErr}</div>
              {authRecoveryMode === "request" && <button className="auth-btn" id="auth-submit" disabled={authRecoveryBusy || !authEmailRecoveryEnabled}>{authRecoveryBusy ? "Envoi…" : "Envoyer le lien"}</button>}
              {authRecoveryMode === "code" && <button className="auth-btn" id="auth-submit" disabled={authRecoveryBusy}>{authRecoveryBusy ? "Vérification…" : "Valider le code"}</button>}
              {authRecoveryMode === "reset" && <button className="auth-btn" id="auth-submit" disabled={authRecoveryBusy}>{authRecoveryBusy ? "Patientez…" : "Enregistrer le nouveau mot de passe"}</button>}
              {authRecoveryMode === "done" && (
                <div className="auth-helper-card">
                  <strong>Mot de passe mis à jour</strong>
                  <div className="auth-helper-actions">
                    <button className="btn btn-g" type="button" onClick={() => { setAuthRecoveryMode("idle"); setAuthRecoveryCode(""); setAuthRecoveryEmail(""); setAuthTab("login"); setAuthErr(""); syncAuthUrl("login"); }}>Retour à la connexion</button>
                  </div>
                </div>
              )}
              {!isForgotFlow && <button className="auth-btn" id="auth-submit" disabled={authBusy}>{authBusy ? "Patientez…" : authTab === "login" ? "Se connecter" : "Créer un compte"}</button>}
              {(authRecoveryMode === "request" || authRecoveryMode === "code" || authRecoveryMode === "reset") && (
                <div className="auth-helper-actions" style={{ marginTop: 12 }}>
                  <button className="btn btn-g" type="button" onClick={() => { setAuthRecoveryMode("idle"); setAuthRecoveryCode(""); setAuthErr(""); syncAuthUrl("login"); }}>Retour à la connexion</button>
                </div>
              )}
              {!isForgotFlow && authGoogleEnabled && (
                <>
                <div className="auth-divider"><span>ou</span></div>
                <button className="auth-google-btn" type="button" onClick={() => { window.location.href = "/api/auth/google/start"; }}>
                  <span className="auth-google-icon">G</span>
                  <span>Continuer avec Google</span>
                </button>
                </>
              )}
              {!isForgotFlow && (
                <div className="auth-switch-copy">
                  {authTab === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}
                  <button type="button" onClick={() => { setAuthTab((prev) => prev === "login" ? "register" : "login"); setAuthErr(""); setAuthRecoveryMode("idle"); syncAuthUrl("login"); }}>
                    {authTab === "login" ? "S'inscrire" : "Se connecter"}
                  </button>
                </div>
              )}
            </form>
          </div>
          {releaseWidget}
        </div>
        {splashOverlay}
      </>
    );
  }

  const renderLinkChecklist = (prefix) => {
    const sections = [
      { key: "contacts", label: "Contacts", items: searchableLinks.contacts, textOf: (item) => item.name || item.username || item.email || "Contact" },
      { key: "conversations", label: "Conversations", items: searchableLinks.conversations, textOf: (item) => item.title || "Conversation" },
      { key: "events", label: "Événements", items: searchableLinks.events, textOf: (item) => item.title || "Événement" },
      { key: "bookmarks", label: "Signets", items: searchableLinks.bookmarks, textOf: (item) => item.title || "Signet" },
      { key: "notes", label: "Notes", items: searchableLinks.notes, textOf: (item) => item.title || "Note" },
    ];

    return (
      <div className="field">
        <label>Lier avec d'autres modules</label>
        <div style={{ display: "grid", gap: 8, maxHeight: 220, overflow: "auto", paddingRight: 2 }}>
          {sections.map((section) => section.items.length ? (
            <div key={section.key} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 10, background: "var(--bg3)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 8 }}>{section.label}</div>
              <div style={{ display: "grid", gap: 6 }}>
                {section.items.slice(0, 6).map((item) => (
                  <label key={`${section.key}-${item.id}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <input type="checkbox" data-link-kind={section.key} data-link-prefix={prefix} data-link-id={item.id} data-link-label={section.textOf(item)} data-link-extra={item.date || item.url || item.username || item.phone || ""} />
                    <span>{section.textOf(item)}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null)}
        </div>
      </div>
    );
  };

  const readLinksFromForm = (prefix) => {
    const links = createEmptyLinks();
    document.querySelectorAll(`[data-link-prefix="${prefix}"]`).forEach((input) => {
      if (!(input instanceof HTMLInputElement) || !input.checked) return;
      const kind = input.dataset.linkKind;
      const entry = { id: input.dataset.linkId || "", title: input.dataset.linkLabel || "" };
      if (kind === "contacts") {
        links.contacts.push({
          id: input.dataset.linkId || "",
          name: input.dataset.linkLabel || "",
          username: input.dataset.linkExtra || "",
          phone: input.dataset.linkExtra || "",
        });
      }
      if (kind === "conversations") links.conversations.push(entry);
      if (kind === "events") links.events.push({ ...entry, date: input.dataset.linkExtra || "" });
      if (kind === "bookmarks") links.bookmarks.push({ ...entry, url: input.dataset.linkExtra || "" });
      if (kind === "notes") links.notes.push(entry);
    });
    return links;
  };

  const openLinkedItem = (kind, item) => {
    if (kind === "contacts") {
      const directConversation = conversations.find((conversation) =>
        conversation.type === "direct" && (conversation.participants || []).some((participant) => participant.uid === item.id),
      );
      setView("conversations");
      if (directConversation) {
        setSelectedConversationId(directConversation.id);
      }
      return;
    }
    if (kind === "conversations") {
      setView("conversations");
      setSelectedConversationId(item.id);
      return;
    }
    if (kind === "events") {
      setView("calendar");
      if (item.date) selectCalendarDate(item.date, { openDay: true });
      return;
    }
    if (kind === "notes") {
      setView("notes");
      setEditNote(item.id);
      return;
    }
    if (kind === "bookmarks" && item.url) {
      setView("bookmarks");
      window.open(item.url, "_blank", "noopener,noreferrer");
    }
  };

  const renderLinksInline = (links) => {
    const entries = [
      ...(links?.contacts || []).map((item) => ({ kind: "contacts", item, label: item.name || item.username || "Contact" })),
      ...(links?.conversations || []).map((item) => ({ kind: "conversations", item, label: item.title || "Conversation" })),
      ...(links?.events || []).map((item) => ({ kind: "events", item, label: item.title || "Événement" })),
      ...(links?.bookmarks || []).map((item) => ({ kind: "bookmarks", item, label: item.title || "Signet" })),
      ...(links?.notes || []).map((item) => ({ kind: "notes", item, label: item.title || "Note" })),
    ];

    if (!entries.length) return null;

    return (
      <div className="link-pack">
        {entries.map(({ kind, item, label }) => (
          <button
            key={`${kind}-${item.id}`}
            className="link-chip"
            onClick={(event) => {
              event.stopPropagation();
              openLinkedItem(kind, item);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    );
  };

  const readAttachmentFile = async (file, type) => {
    if (!file) return;
    let dataUrl = "";

    if (type === "image") {
      dataUrl = await readImageFileAsDataUrl(file, 1440, 0.82).catch(() => "");
      if (!dataUrl) {
        toast("Lecture image impossible", "err");
        return;
      }
      if (dataUrl.length > IMAGE_ATTACHMENT_LIMIT_CHARS) {
        toast("Image trop lourde, choisissez une image plus légère", "err");
        return;
      }
    } else {
      if (file.size > FILE_ATTACHMENT_LIMIT_BYTES) {
        toast("Fichier limité à 320 Ko pour garder Flow fluide", "err");
        return;
      }
      dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(`${reader.result || ""}`);
        reader.onerror = () => reject(new Error("Lecture fichier impossible"));
        reader.readAsDataURL(file);
      }).catch(() => "");
    }

    if (!dataUrl) return;
    clearVoiceDraft();
    setAttachmentDraft({
      name: file.name,
      url: `${dataUrl}`,
      type,
    });
    setAttachmentChooserOpen(false);
  };

  const saveEventDraft = async () => {
    const title = eventDraft.title.trim();
    if (!title || !eventDraft.date) {
      toast("Titre et date requis", "err");
      return;
    }
    if (eventDraft.endTime && toTimeNumber(eventDraft.endTime) <= toTimeNumber(eventDraft.time)) {
      toast("L'heure de fin doit être après le début", "err");
      return;
    }

    setEventBusy(true);
    try {
      const isEditingEvent = Boolean(eventDraft.id);
      const payload = await api("/api/events", {
        method: "POST",
        body: JSON.stringify({
          action: isEditingEvent ? "update-event" : "create-event",
          eventId: eventDraft.id,
          title,
          date: eventDraft.date,
          time: eventDraft.time,
          endTime: eventDraft.endTime,
          desc: eventDraft.desc,
          color: eventDraft.color,
          participantIds: eventDraft.attendeeIds,
          links: isEditingEvent ? eventDraft.links : createEmptyLinks(),
        }),
      });
      setDb(payload.db || dbRef.current);
      selectCalendarDate(eventDraft.date, { openDay: true });
      setEventDraft(buildEventDraft());
      setModal(null);
      toast(
        isEditingEvent
          ? "Événement mis à jour"
          : payload.invitedCount
            ? `Événement créé et ${payload.invitedCount} invité(s) notifié(s)`
            : "Événement créé",
      );
    } catch (error) {
      toast(error.message || (eventDraft.id ? "Mise à jour impossible" : "Création d'événement impossible"), "err");
    } finally {
      setEventBusy(false);
    }
  };

  const respondToEventInvite = async (event, status) => {
    const eventId = getEventId(event);
    if (!eventId) return;
    setEventActionId(`${eventId}:${status}`);
    try {
      const payload = await api("/api/events", {
        method: "POST",
        body: JSON.stringify({
          action: "respond-event",
          eventId,
          status,
        }),
      });
      setDb(payload.db || dbRef.current);
      toast(`Invitation ${status === "confirmed" ? "acceptée" : status === "maybe" ? "mise en peut-être" : "refusée"}`);
    } catch (error) {
      toast(error.message || "Réponse impossible", "err");
    } finally {
      setEventActionId("");
    }
  };

  const deleteSharedEvent = async (event) => {
    const eventId = getEventId(event);
    if (!eventId) return;
    const ok = await requestConfirm({
      title: "Supprimer cet événement ?",
      detail: "Cette action retirera l'événement pour tous les participants.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    setEventActionId(`${eventId}:delete`);
    try {
      const payload = await api("/api/events", {
        method: "POST",
        body: JSON.stringify({
          action: "delete-event",
          eventId,
        }),
      });
      setDb(payload.db || dbRef.current);
      toast("Événement supprimé");
    } catch (error) {
      toast(error.message || "Suppression impossible", "err");
    } finally {
      setEventActionId("");
    }
  };

  const hydrateBookmarkPreview = async (url) => {
    if (!url || !isHttpUrl(url)) return;
    setBookmarkBusy(true);
    try {
      const payload = await api(`/api/link-preview?url=${encodeURIComponent(url)}`, { method: "GET", headers: { "Content-Type": "application/json" } });
      const preview = payload.preview || {};
      setBookmarkDraft((prev) => ({
        ...prev,
        title: prev.title || preview.title || prev.url,
        previewTitle: preview.title || prev.previewTitle,
        previewText: preview.description || prev.previewText,
        coverUrl: prev.coverUrl || preview.coverUrl || "",
        sourceLabel: preview.sourceLabel || prev.sourceLabel,
        mediaKind: preview.mediaKind || prev.mediaKind,
      }));
      toast("Aperçu récupéré");
    } catch (error) {
      toast(error.message || "Aperçu indisponible", "err");
    } finally {
      setBookmarkBusy(false);
    }
  };

  const handleBookmarkImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Choisissez une image valide", "err");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast("Image limitée à 5 Mo", "err");
      return;
    }
    try {
      const dataUrl = await readImageFileAsDataUrl(file, 1280, 0.84);
      setBookmarkDraft((prev) => ({
        ...prev,
        type: "image",
        title: prev.title || file.name.replace(/\.[^.]+$/, ""),
        coverUrl: dataUrl,
        mediaKind: "image",
        sourceLabel: prev.sourceLabel || "Galerie",
      }));
      toast("Image prête à être enregistrée");
    } catch {
      toast("Impossible de charger l'image", "err");
    }
  };

  const saveBookmarkDraft = () => {
    const title = bookmarkDraft.title.trim() || bookmarkDraft.previewTitle.trim();
    if (!title) {
      toast("Titre requis", "err");
      return;
    }
    if (bookmarkDraft.type === "link" && bookmarkDraft.url && !isHttpUrl(bookmarkDraft.url)) {
      toast("Lien invalide", "err");
      return;
    }
    if (bookmarkDraft.type === "image" && !bookmarkDraft.coverUrl) {
      toast("Ajoutez une image", "err");
      return;
    }
    if (bookmarkDraft.type === "text" && !bookmarkDraft.text.trim()) {
      toast("Ajoutez un texte", "err");
      return;
    }

    updateDb((draft) => {
      const payload = {
        id: bookmarkDraft.id || uid(),
        type: bookmarkDraft.type,
        title,
        url: bookmarkDraft.url.trim(),
        icon: bookmarkDraft.icon.trim() || (bookmarkDraft.type === "text" ? "📝" : bookmarkDraft.type === "image" ? "🖼️" : "🔖"),
        text: bookmarkDraft.text.trim(),
        note: bookmarkDraft.note.trim(),
        coverUrl: bookmarkDraft.coverUrl,
        previewTitle: bookmarkDraft.previewTitle.trim(),
        previewText: bookmarkDraft.previewText.trim(),
        sourceLabel: bookmarkDraft.sourceLabel.trim(),
        mediaKind: bookmarkDraft.mediaKind.trim(),
        createdAt: bookmarkDraft.id
          ? (draft.bookmarks.find((entry) => entry.id === bookmarkDraft.id)?.createdAt || new Date().toISOString())
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        links: bookmarkDraft.id ? bookmarkDraft.links : readLinksFromForm("bookmark"),
      };

      if (bookmarkDraft.id) {
        draft.bookmarks = draft.bookmarks.map((entry) => (entry.id === bookmarkDraft.id ? { ...entry, ...payload } : entry));
        addActivityEntry(draft, { type: "bookmark", title: "Signet modifié", detail: title });
      } else {
        draft.bookmarks.push(payload);
        addActivityEntry(draft, { type: "bookmark", title: "Signet ajouté", detail: title });
        addNotificationEntry(draft, { type: "bookmark", title, detail: bookmarkDraft.url.trim() || bookmarkDraft.type, href: "bookmarks" });
      }
    });
    setBookmarkDraft(buildBookmarkDraft());
    setModal(null);
    toast(bookmarkDraft.id ? "Signet mis à jour" : "Signet enregistré");
  };

  const deleteBookmark = async (bookmark) => {
    if (!bookmark?.id) return;
    const ok = await requestConfirm({
      title: "Supprimer ce signet ?",
      detail: "Le signet, sa couverture et sa note liée seront retirés du workspace.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!ok) return;
    updateDb((draft) => {
      draft.bookmarks = draft.bookmarks.filter((entry) => entry.id !== bookmark.id);
      addActivityEntry(draft, { type: "bookmark", title: "Signet supprimé", detail: bookmark.title || "Signet" });
    });
    toast("Signet supprimé", "info");
  };

  const openMessageContextMenu = (point, message) => {
    setMessageMenu({
      x: Math.min(point.x, window.innerWidth - 240),
      y: Math.min(point.y, window.innerHeight - 220),
      messageId: message.id,
      canEdit: message.senderId === user?.uid && !message.deletedAt,
      canReport: message.senderId !== user?.uid && !message.deletedAt,
    });
  };

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  const updateNoteField = (noteId, patch) => {
    updateDb((draft) => {
      const note = draft.notes.find((item) => item.id === noteId);
      if (!note) return;
      Object.assign(note, patch);
      note.updatedAt = new Date().toISOString();
    });
  };

  const saveCurrentNoteSelection = () => {
    if (!noteEditorRef.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!noteEditorRef.current.contains(range.commonAncestorContainer)) return;
    noteSavedSelectionRef.current = range.cloneRange();
  };

  const restoreCurrentNoteSelection = () => {
    if (!noteSavedSelectionRef.current) return null;
    const selection = window.getSelection();
    if (!selection) return null;
    selection.removeAllRanges();
    selection.addRange(noteSavedSelectionRef.current);
    return noteSavedSelectionRef.current;
  };

  const syncNoteEditorHtml = (noteIdOverride = editNote) => {
    if (!noteIdOverride || !noteEditorRef.current) return;
    updateNoteField(noteIdOverride, { content: noteEditorRef.current.innerHTML });
  };

  const insertNoteHtmlAtCursor = (html) => {
    if (!editNote || !noteEditorRef.current || !html) return;
    noteEditorRef.current.focus();
    let range = restoreCurrentNoteSelection();
    const selection = window.getSelection();
    if (!range || !selection) {
      range = document.createRange();
      range.selectNodeContents(noteEditorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    range.deleteContents();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    const fragment = document.createDocumentFragment();
    let lastNode = null;
    while (wrapper.firstChild) {
      lastNode = fragment.appendChild(wrapper.firstChild);
    }
    range.insertNode(fragment);
    if (lastNode) {
      range = document.createRange();
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      noteSavedSelectionRef.current = range.cloneRange();
    }
    syncNoteEditorHtml(editNote);
  };

  const applyTypingStyle = (styles = {}) => {
    if (!editNote || !noteEditorRef.current) return;
    noteEditorRef.current.focus();
    const selection = window.getSelection();
    let range = restoreCurrentNoteSelection() || (selection && selection.rangeCount ? selection.getRangeAt(0) : null);
    if (!range || !range.collapsed) return;
    const span = document.createElement("span");
    Object.entries(styles).forEach(([key, value]) => {
      span.style[key] = value;
    });
    const marker = document.createTextNode("\u200b");
    span.appendChild(marker);
    range.insertNode(span);
    range = document.createRange();
    range.setStart(marker, 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    noteSavedSelectionRef.current = range.cloneRange();
    syncNoteEditorHtml(editNote);
  };

  const wrapCurrentNoteSelection = (styles = {}) => {
    if (!editNote || !noteEditorRef.current) return;
    noteEditorRef.current.focus();
    const selection = window.getSelection();
    const range = restoreCurrentNoteSelection() || (selection && selection.rangeCount ? selection.getRangeAt(0) : null);
    if (!range || !noteEditorRef.current.contains(range.commonAncestorContainer)) return;
    if (range.collapsed) {
      applyTypingStyle(styles);
      return;
    }
    const wrapper = document.createElement("span");
    Object.entries(styles).forEach(([key, value]) => {
      wrapper.style[key] = value;
    });
    const fragment = range.extractContents();
    wrapper.appendChild(fragment);
    range.insertNode(wrapper);
    const nextRange = document.createRange();
    nextRange.selectNodeContents(wrapper);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    noteSavedSelectionRef.current = nextRange.cloneRange();
    syncNoteEditorHtml(editNote);
  };

  const toggleCurrentNoteStyle = (command) => {
    if (!editNote || !noteEditorRef.current) return;
    noteEditorRef.current.focus();
    restoreCurrentNoteSelection();
    document.execCommand(command, false);
    syncNoteEditorHtml(editNote);
  };

  const insertChecklistIntoActiveNote = () => {
    if (!editNote || !noteEditorRef.current) return;
    noteEditorRef.current.focus();
    const selection = window.getSelection();
    let range = restoreCurrentNoteSelection() || (selection && selection.rangeCount ? selection.getRangeAt(0) : null);
    if (!range) return;
    const text = range.toString();
    if (!range.collapsed) range.deleteContents();
    const row = document.createElement("span");
    row.className = "note-check-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.setAttribute("data-note-check", "1");
    checkbox.contentEditable = "false";
    const label = document.createElement("span");
    label.textContent = text || "";
    row.appendChild(checkbox);
    row.appendChild(label);
    const startNode = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
    const block = startNode?.closest?.("p,div,li,blockquote");
    if (startNode?.closest?.(".note-check-row") || block?.querySelector?.('[data-note-check="1"]')) {
      return;
    }
    if (block && block !== noteEditorRef.current) {
      block.insertBefore(row, block.firstChild);
      if (label.textContent && block.textContent?.trim() === label.textContent.trim()) {
        Array.from(block.childNodes).forEach((child) => {
          if (child !== row) label.appendChild(child);
        });
      }
    } else {
      range.insertNode(row);
    }
    const spacer = document.createTextNode("\u00A0");
    row.after(spacer);
    const nextRange = document.createRange();
    nextRange.setStart(label, label.childNodes.length);
    nextRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    noteSavedSelectionRef.current = nextRange.cloneRange();
    syncNoteEditorHtml(editNote);
  };

  const lockOrUnlockNote = async (note) => {
    if (!note) return;
    if (!note.locked) {
      updateNoteField(note.id, { locked: true });
      setNoteEditorMenu("");
      return;
    }
    setNoteUnlockDialog({ open: true, noteId: note.id, password: "", busy: false });
  };

  const duplicateNote = (note) => {
    if (!note) return;
    const nextId = uid();
    updateDb((draft) => {
      draft.notes.unshift({
        ...note,
        id: nextId,
        title: note.title ? `${note.title} (copie)` : "Copie de note",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        favorite: false,
      });
      addActivityEntry(draft, { type: "note", title: "Note dupliquée", detail: note.title || "Note" });
    });
    setSelectedNoteCategory(note.cat || firstNoteCategoryKey);
    setEditNote(nextId);
    setNoteContextMenu(null);
  };

  const handleNoteAttachmentFile = async (file) => {
    if (!file || !editNote) return;
    let url = "";
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      url = await readImageFileAsDataUrl(file, 1440, 0.84).catch(() => "");
    } else {
      url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(`${reader.result || ""}`);
        reader.onerror = () => reject(new Error("Lecture impossible"));
        reader.readAsDataURL(file);
      }).catch(() => "");
    }
    if (!url) {
      toast("Pièce jointe impossible", "err");
      return;
    }
    const fileSizeLabel = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`
      : `${Math.max(1, Math.round(file.size / 1024))} Ko`;
    if (isImage) {
      insertNoteHtmlAtCursor(`<div class="note-embed" contenteditable="false" style="width:min(420px,100%)"><img class="note-inline-image" src="${url}" alt="${esc(file.name)}" /></div>`);
    } else {
      insertNoteHtmlAtCursor(`<div class="note-embed" contenteditable="false" style="width:min(380px,100%)"><div class="note-inline-file"><div><strong>${esc(file.name)}</strong><span>${esc(file.type || "Fichier")} · ${fileSizeLabel}</span></div><span class="note-inline-file-icon">↓</span></div></div>`);
    }
    syncNoteEditorHtml(editNote);
    updateDb((draft) => {
      const note = draft.notes.find((item) => item.id === editNote);
      if (!note) return;
      note.attachments = [
        ...(Array.isArray(note.attachments) ? note.attachments : []),
        { id: uid(), name: file.name, type: isImage ? "image" : "file", url, sizeLabel: fileSizeLabel },
      ];
      note.updatedAt = new Date().toISOString();
    });
    setNoteEditorMenu("");
    toast("Pièce jointe ajoutée");
  };

  // ═══════ MODAL RENDERER ═══════
  const renderModal = () => {
    if (!modal) return null;
    const close = () => setModal(null);

    if (modal === "note") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvelle note</h3>
          <ModalField label="Titre" id="m-n-title" placeholder="Titre…" />
          <div className="field">
            <label>Zone</label>
            <div className="segmented-grid">
              {noteCategories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={`segmented-card ${noteModalCategory === category.key ? "on" : ""}`}
                  onClick={() => setNoteModalCategory(category.key)}
                >
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-n-title")?.value?.trim();
            if (!t) return toast("Titre requis", "err");
            const nextId = uid();
            updateDb(d => {
              d.notes.push({ id: nextId, title: t, content: "", cat: noteModalCategory || firstNoteCategoryKey, color: d.settings?.accent || "#3f97ff", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), links: createEmptyLinks(), attachments: [], favorite: false, locked: false, sharedWith: [], sharedByName: "", sharedImportToken: "", sharedRole: "" });
              addActivityEntry(d, { type: "note", title: "Note créée", detail: t });
              addNotificationEntry(d, { type: "note", title: "Nouvelle note enregistrée", detail: t, href: "notes" });
            });
            setSelectedNoteCategory(noteModalCategory || firstNoteCategoryKey);
            setEditNote(nextId);
            close(); toast("Note créée");
          }}>Créer</button></div>
        </div>
      </div>
    );

    if (modal === "note-category") {
      const iconChoices = ["🗂️", "📝", "💼", "💡", "📚", "🏠", "🎯", "⭐"];
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <h3>Nouvelle catégorie</h3>
            <ModalField label="Titre" id="m-nc-title" placeholder="Nom de la catégorie" />
            <ModalField label="Couleur" id="m-nc-color" type="color" />
            <div className="field">
              <label>Icône</label>
              <div className="choice-row">
                {iconChoices.map((icon, index) => (
                  <button key={icon} type="button" className={`choice-pill ${index === 0 ? "on" : ""}`} onClick={() => { const input = document.getElementById("m-nc-icon"); if (input) input.value = icon; }}>
                    {icon}
                  </button>
                ))}
              </div>
              <input id="m-nc-icon" className="finput" placeholder="🗂️" defaultValue="🗂️" style={{ marginTop: 10 }} />
            </div>
            <div className="modal-ft">
              <button className="btn btn-g" onClick={close}>Annuler</button>
              <button className="btn btn-p" onClick={() => {
                const title = document.getElementById("m-nc-title")?.value?.trim();
                const color = document.getElementById("m-nc-color")?.value?.trim() || "#d8d8de";
                const icon = document.getElementById("m-nc-icon")?.value?.trim() || "🗂️";
                if (!title) return toast("Titre requis", "err");
                updateDb((draft) => {
                  const current = Array.isArray(draft.settings?.noteCategories) && draft.settings.noteCategories.length
                    ? draft.settings.noteCategories
                    : NOTE_CATEGORIES.map((category) => ({ ...category, color: "", icon: "" }));
                  draft.settings = draft.settings || {};
                  draft.settings.noteCategories = [
                    ...current,
                    {
                      key: uid().slice(0, 12),
                      label: title,
                      description: "",
                      color,
                      icon,
                    },
                  ];
                });
                close();
                toast("Catégorie créée");
              }}>Créer</button>
            </div>
          </div>
        </div>
      );
    }

    if (modal === "task") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvelle tâche</h3>
          {!!db.taskTemplates?.length && (
            <div className="field">
              <label>Créer depuis un template</label>
              <div className="choice-row" style={{ flexWrap: "wrap" }}>
                {db.taskTemplates.slice(0, 6).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className="btn btn-g btn-sm"
                    onClick={() => {
                      close();
                      createTaskFromTemplate(template);
                    }}
                  >
                    {template.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ModalField label="Titre" id="m-t-title" placeholder="Titre de la tâche" />
          <ModalField label="Description" id="m-t-desc" as="textarea" placeholder="Détails…" />
          <div style={{ display: "flex", gap: 10 }}>
            <ModalField label="Priorité" id="m-t-prio" as="select"><option value="none">Aucune</option><option value="low">Basse</option><option value="med">Moyenne</option><option value="high">Haute</option></ModalField>
            <ModalField label="Date limite" id="m-t-due" type="date" />
          </div>
          {renderLinkChecklist("task")}
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-g" onClick={() => {
            close();
            setModal("task-template");
          }}>Nouveau template</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-t-title")?.value?.trim();
            if (!t) return toast("Titre requis", "err");
            const now = new Date().toISOString();
            const taskId = uid();
            updateDb(d => {
              d.tasks.push({
                id: taskId,
                title: t,
                desc: document.getElementById("m-t-desc")?.value || "",
                prio: document.getElementById("m-t-prio")?.value || "none",
                due: document.getElementById("m-t-due")?.value || "",
                colIdx: 0,
                status: "todo",
                projectId: db.projects[0]?.id || "",
                ownerId: user?.uid || "",
                templateId: "",
                createdAt: now,
                updatedAt: now,
                links: readLinksFromForm("task"),
                reactions: {},
                comments: [],
                subtasks: [],
                members: [buildTaskMember(user, "editor")],
              });
              addActivityEntry(d, { type: "task", title: "Tâche ajoutée", detail: t });
              addNotificationEntry(d, { type: "task", title: "Nouvelle tâche ajoutée", detail: t, href: "projects", entityId: taskId });
            });
            setSelectedTaskId(taskId);
            close(); toast("Tâche créée");
          }}>Créer</button></div>
        </div>
      </div>
    );

    if (modal === "task-template") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouveau template de tâche</h3>
          <ModalField label="Titre" id="m-tt-title" placeholder="Template sprint, bug, onboarding…" value={taskTemplateDraft.title} onChange={(e) => setTaskTemplateDraft((prev) => ({ ...prev, title: e.target.value }))} />
          <ModalField label="Description" id="m-tt-desc" as="textarea" placeholder="Base réutilisable…" value={taskTemplateDraft.desc} onChange={(e) => setTaskTemplateDraft((prev) => ({ ...prev, desc: e.target.value }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <ModalField label="Priorité" id="m-tt-prio" as="select" value={taskTemplateDraft.prio} onChange={(e) => setTaskTemplateDraft((prev) => ({ ...prev, prio: e.target.value }))}><option value="none">Aucune</option><option value="low">Basse</option><option value="med">Moyenne</option><option value="high">Haute</option></ModalField>
            <ModalField label="Décalage date limite (jours)" id="m-tt-due-offset" type="number" value={taskTemplateDraft.dueOffsetDays} onChange={(e) => setTaskTemplateDraft((prev) => ({ ...prev, dueOffsetDays: e.target.value }))} />
          </div>
          <ModalField label="Sous-tâches par ligne" id="m-tt-subtasks" as="textarea" placeholder={"Cadrage\nChecklist QA\nLivraison"} value={taskTemplateDraft.subtasksText} onChange={(e) => setTaskTemplateDraft((prev) => ({ ...prev, subtasksText: e.target.value }))} />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={saveTaskTemplateDraft}>Enregistrer le template</button></div>
        </div>
      </div>
    );

    if (modal === "event") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal" style={{ width: 620, maxWidth: "96vw" }}><h3>{eventDraft.id ? "Modifier l’événement" : "Nouvel événement"}</h3>
          <ModalField label="Titre" id="m-e-title" placeholder="Réunion, appel…" value={eventDraft.title} onChange={(e) => setEventDraft((prev) => ({ ...prev, title: e.target.value }))} />
          <div className="field">
            <label>Date</label>
            <div className="surface" style={{ padding: 12 }}>
              <div className="surface-head" style={{ marginBottom: 10 }}>
                <button type="button" className="btn btn-g btn-sm" onClick={() => {
                  if (eventPickerMonth === 0) {
                    setEventPickerMonth(11);
                    setEventPickerYear((prev) => prev - 1);
                  } else {
                    setEventPickerMonth((prev) => prev - 1);
                  }
                }}>‹</button>
                <div className="surface-title" style={{ fontSize: 15 }}>{MNAMES[eventPickerMonth]} {eventPickerYear}</div>
                <button type="button" className="btn btn-g btn-sm" onClick={() => {
                  if (eventPickerMonth === 11) {
                    setEventPickerMonth(0);
                    setEventPickerYear((prev) => prev + 1);
                  } else {
                    setEventPickerMonth((prev) => prev + 1);
                  }
                }}>›</button>
              </div>
              <div className="mini-calendar" style={{ marginBottom: 10 }}>
                {["L", "M", "M", "J", "V", "S", "D"].map((day) => <div key={day} className="mini-calendar-wd">{day}</div>)}
                {buildCalendarCells(eventPickerYear, eventPickerMonth, db.events).map((cell, index) => (
                  <button
                    key={`${cell.ds || "other"}-${index}`}
                    type="button"
                    className={`mini-calendar-day ${cell.other ? "other" : ""} ${cell.today ? "today" : ""} ${cell.ds === eventDraft.date ? "on" : ""}`}
                    onClick={() => {
                      if (!cell.ds) return;
                      setEventDraft((prev) => ({ ...prev, date: cell.ds }));
                      selectCalendarDate(cell.ds, { openDay: true });
                    }}
                  >
                    <span>{cell.num}</span>
                    {!!cell.events?.length && !cell.other && <span className="mini-calendar-dot" />}
                  </button>
                ))}
              </div>
              <div className="settings-note">Date choisie: {fmtDate(eventDraft.date)}</div>
            </div>
          </div>
          <div className="field">
            <label>Début</label>
            <div className="time-pill-grid">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={`start-${time}`}
                  type="button"
                  className={`choice-pill ${eventDraft.time === time ? "on" : ""}`}
                  onClick={() => setEventDraft((prev) => {
                    const nextEnd = !prev.endTime || toTimeNumber(prev.endTime) <= toTimeNumber(time)
                      ? addMinutesToTime(time, 60)
                      : prev.endTime;
                    return { ...prev, time, endTime: nextEnd };
                  })}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Fin</label>
              <div className="time-pill-grid">
                {TIME_OPTIONS.filter((time) => toTimeNumber(time) > toTimeNumber(eventDraft.time || "00:00")).map((time) => (
                  <button
                    key={`end-${time}`}
                    type="button"
                    className={`choice-pill ${eventDraft.endTime === time ? "on" : ""}`}
                    onClick={() => setEventDraft((prev) => ({ ...prev, endTime: time }))}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <ModalField label="Couleur" id="m-e-color" type="color" value={eventDraft.color} onChange={(e) => setEventDraft((prev) => ({ ...prev, color: e.target.value }))} />
          </div>
          <ModalField label="Description" id="m-e-desc" as="textarea" placeholder="Détails…" value={eventDraft.desc} onChange={(e) => setEventDraft((prev) => ({ ...prev, desc: e.target.value }))} />
          <div className="field">
            <label>Invités</label>
            {!eventDraft.id && contactDirectory.length ? (
              <>
                <div className="choice-row">
                  {contactDirectory.map((contact) => {
                    const selected = eventDraft.attendeeIds.includes(contact.uid);
                    return (
                      <button
                        key={contact.uid}
                        type="button"
                        className={`choice-pill ${selected ? "on" : ""}`}
                        onClick={() => setEventDraft((prev) => ({
                          ...prev,
                          attendeeIds: selected
                            ? prev.attendeeIds.filter((uid) => uid !== contact.uid)
                            : [...prev.attendeeIds, contact.uid],
                        }))}
                      >
                        {contact.name}
                      </button>
                    );
                  })}
                </div>
                <div className="settings-note">Les invités reçoivent une notification et voient l’événement apparaître dans leur calendrier.</div>
              </>
            ) : eventDraft.id ? (
              eventDraft.attendees.length ? (
                <>
                  <div className="choice-row">
                    {eventDraft.attendees.map((attendee) => (
                      <span
                        key={attendee.uid}
                        className="choice-pill on"
                        style={{ cursor: "default", borderColor: getEventStatusTone(attendee.status), color: getEventStatusTone(attendee.status) }}
                      >
                        {attendee.name} · {getEventStatusLabel(attendee.status)}
                      </span>
                    ))}
                  </div>
                  <div className="settings-note">Les invités déjà ajoutés sont conservés pendant l’édition pour éviter toute perte de synchro.</div>
                </>
              ) : (
                <div className="muted-box">Aucun invité sur cet événement.</div>
              )
            ) : (
              <div className="muted-box">Ajoutez d’abord des contacts via les conversations pour pouvoir les inviter ici.</div>
            )}
          </div>
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" disabled={eventBusy} onClick={() => void saveEventDraft()}>{eventBusy ? (eventDraft.id ? "Mise à jour…" : "Création…") : (eventDraft.id ? "Enregistrer" : "Créer")}</button></div>
        </div>
      </div>
    );

    if (modal === "habit") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>{habitDraft.id ? "Modifier l’habitude" : "Nouvelle habitude"}</h3>
          <ModalField
            label="Titre"
            id="m-h-name"
            placeholder="Lecture, sport, hydratation…"
            value={habitDraft.name}
            onChange={(event) => setHabitDraft((prev) => ({ ...prev, name: event.target.value }))}
          />
          <div className="field">
            <label>Icône</label>
            <div className="icon-preset-grid">
              {HABIT_ICON_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className={`icon-preset ${habitDraft.icon === preset.value ? "on" : ""}`}
                  title={preset.label}
                  onClick={() => setHabitDraft((prev) => ({ ...prev, icon: preset.value }))}
                >
                  <span>{preset.value}</span>
                  <small>{preset.label}</small>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <ModalField
              label="Durée cible (minutes)"
              id="m-h-target"
              type="number"
              min="1"
              placeholder="15"
              value={habitDraft.targetMinutes}
              onChange={(event) => setHabitDraft((prev) => ({ ...prev, targetMinutes: event.target.value }))}
            />
            <ModalField
              label="Icône manuelle"
              id="m-h-icon"
              placeholder="⭐"
              value={habitDraft.icon}
              onChange={(event) => setHabitDraft((prev) => ({ ...prev, icon: event.target.value || HABIT_ICON_PRESETS[0].value }))}
            />
          </div>
          <ModalField
            label="Description"
            id="m-h-desc"
            placeholder="Optionnel"
            value={habitDraft.desc}
            onChange={(event) => setHabitDraft((prev) => ({ ...prev, desc: event.target.value }))}
          />
          <div className="field">
            <label>Jours prévus</label>
            <div className="day-picker">
              <button
                type="button"
                className={`day-chip all ${habitDraft.days.length === WEEKDAY_OPTIONS.length ? "on" : ""}`}
                onClick={() => setHabitDraft((prev) => ({
                  ...prev,
                  days: prev.days.length === WEEKDAY_OPTIONS.length ? [] : WEEKDAY_OPTIONS.map((item) => item.key),
                }))}
              >
                Tous les jours
              </button>
              {WEEKDAY_OPTIONS.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  className={`day-chip ${habitDraft.days.includes(day.key) ? "on" : ""}`}
                  onClick={() => setHabitDraft((prev) => {
                    const exists = prev.days.includes(day.key);
                    const nextDays = exists ? prev.days.filter((value) => value !== day.key) : [...prev.days, day.key].sort((a, b) => a - b);
                    return { ...prev, days: nextDays };
                  })}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const name = habitDraft.name.trim();
            const targetMinutes = Math.max(1, Number(habitDraft.targetMinutes) || 1);
            const nextDays = habitDraft.days.length ? habitDraft.days : WEEKDAY_OPTIONS.map((item) => item.key);
            if (!name) return toast("Nom requis", "err");
            updateDb(d => {
              const existing = habitDraft.id ? d.habits.find((habit) => habit.id === habitDraft.id) : null;
              if (existing) {
                existing.name = name;
                existing.icon = habitDraft.icon || HABIT_ICON_PRESETS[0].value;
                existing.desc = habitDraft.desc || "";
                existing.targetMinutes = targetMinutes;
                existing.days = nextDays;
                existing.updatedAt = new Date().toISOString();
                addActivityEntry(d, { type: "habit", title: "Habitude modifiée", detail: name });
              } else {
                d.habits.push({
                  id: uid(),
                  name,
                  icon: habitDraft.icon || HABIT_ICON_PRESETS[0].value,
                  desc: habitDraft.desc || "",
                  done: {},
                  entries: {},
                  targetMinutes,
                  days: nextDays,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                addActivityEntry(d, { type: "habit", title: "Habitude ajoutée", detail: name });
              }
            });
            close(); toast(habitDraft.id ? "Habitude modifiée" : "Habitude ajoutée");
          }}>{habitDraft.id ? "Enregistrer" : "Ajouter"}</button></div>
        </div>
      </div>
    );

    if (modal === "habit-log") {
      const habit = db.habits.find((item) => item.id === habitLogDraft.habitId);
      const weekDates = getWeekDatesFrom();
      return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal"><h3>Ajouter du temps</h3>
            <div className="muted-box" style={{ marginBottom: 14 }}>
              {habit?.icon || "⭐"} {habit?.name || "Habitude"} · objectif {getHabitTargetMinutes(habit)} min
            </div>
            <div className="field">
              <label>Jour de la semaine</label>
              <div className="day-picker">
                {weekDates.map((date) => (
                  <button
                    key={date}
                    type="button"
                    className={`day-chip ${habitLogDraft.date === date ? "on" : ""}`}
                    onClick={() => setHabitLogDraft((prev) => ({ ...prev, date }))}
                  >
                    {WEEKDAY_OPTIONS[getWeekdayIndex(date)].label}
                  </button>
                ))}
              </div>
            </div>
            <ModalField
              label="Temps réellement fait (minutes)"
              id="m-h-log-minutes"
              type="number"
              min="1"
              placeholder="10"
              value={habitLogDraft.minutes}
              onChange={(event) => setHabitLogDraft((prev) => ({ ...prev, minutes: event.target.value }))}
            />
            <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
              const minutes = Math.max(0, Number(habitLogDraft.minutes) || 0);
              if (!habit?.id || !habitLogDraft.date || minutes <= 0) return toast("Temps requis", "err");
              updateDb((draftDb) => {
                const currentHabit = draftDb.habits.find((item) => item.id === habit.id);
                if (!currentHabit) return;
                currentHabit.entries = { ...(currentHabit.entries || {}), [habitLogDraft.date]: minutes };
                currentHabit.done = { ...(currentHabit.done || {}), [habitLogDraft.date]: minutes >= getHabitTargetMinutes(currentHabit) };
                currentHabit.updatedAt = new Date().toISOString();
                addActivityEntry(draftDb, { type: "habit", title: "Habitude journalisée", detail: `${currentHabit.name} · ${minutes} min` });
              });
              close();
              toast("Temps ajouté");
            }}>Enregistrer</button></div>
          </div>
        </div>
      );
    }

    if (modal === "transaction") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>{transactionDraft.id ? "Modifier la transaction" : "Nouvelle transaction"}</h3>
          <ModalField label="Description" id="m-tx-desc" placeholder="Description" value={transactionDraft.description} onChange={(event) => setTransactionDraft((prev) => ({ ...prev, description: event.target.value }))} />
          <div style={{ display: "flex", gap: 10 }}>
            <ModalField label="Montant (€)" id="m-tx-amt" type="number" placeholder="0.00" value={transactionDraft.amount} onChange={(event) => setTransactionDraft((prev) => ({ ...prev, amount: event.target.value }))} />
            <ModalField label="Type" id="m-tx-type" as="select" value={transactionDraft.type} onChange={(event) => setTransactionDraft((prev) => ({ ...prev, type: event.target.value }))}><option value="expense">Dépense</option><option value="income">Revenu</option></ModalField>
          </div>
          <ModalField label="Catégorie" id="m-tx-cat" placeholder="Alimentation, Transport…" value={transactionDraft.category} onChange={(event) => setTransactionDraft((prev) => ({ ...prev, category: event.target.value }))} />
          <ModalField label="Date" id="m-tx-date" type="date" value={transactionDraft.date} onChange={(event) => setTransactionDraft((prev) => ({ ...prev, date: event.target.value }))} />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const description = transactionDraft.description.trim();
            const amount = Math.abs(parseFloat(transactionDraft.amount));
            if (!description || !Number.isFinite(amount) || amount <= 0) return toast("Description et montant valides requis", "err");
            updateDb((draftDb) => {
              const existing = transactionDraft.id ? draftDb.transactions.find((item) => item.id === transactionDraft.id) : null;
              const nextTransaction = {
                id: transactionDraft.id || uid(),
                description,
                amount,
                type: transactionDraft.type || "expense",
                category: transactionDraft.category.trim(),
                date: transactionDraft.date || todayStr(),
              };
              if (existing) Object.assign(existing, nextTransaction);
              else draftDb.transactions.push(nextTransaction);
              addActivityEntry(draftDb, { type: "finance", title: existing ? "Transaction modifiée" : "Transaction ajoutée", detail: `${description} · ${fmtMoney(amount)}` });
            });
            setTransactionDraft(buildTransactionDraft());
            close(); toast(transactionDraft.id ? "Transaction modifiée" : "Transaction ajoutée");
          }}>{transactionDraft.id ? "Enregistrer" : "Ajouter"}</button></div>
        </div>
      </div>
    );

    if (modal === "bookmark") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>{bookmarkDraft.id ? "Modifier le signet" : "Nouveau signet"}</h3>
          <div className="field">
            <label>Type</label>
            <div className="choice-row">
              <button type="button" className={`choice-pill ${bookmarkDraft.type === "link" ? "on" : ""}`} onClick={() => setBookmarkDraft((prev) => ({ ...prev, type: "link" }))}>Lien</button>
              <button type="button" className={`choice-pill ${bookmarkDraft.type === "image" ? "on" : ""}`} onClick={() => setBookmarkDraft((prev) => ({ ...prev, type: "image" }))}>Image</button>
              <button type="button" className={`choice-pill ${bookmarkDraft.type === "text" ? "on" : ""}`} onClick={() => setBookmarkDraft((prev) => ({ ...prev, type: "text" }))}>Texte</button>
            </div>
          </div>
          <ModalField label="Titre" id="m-bm-title" placeholder="Titre du contenu" value={bookmarkDraft.title} onChange={(e) => setBookmarkDraft((prev) => ({ ...prev, title: e.target.value }))} />
          {bookmarkDraft.type === "link" && (
            <>
              <ModalField label="URL" id="m-bm-url" placeholder="https://…" value={bookmarkDraft.url} onChange={(e) => setBookmarkDraft((prev) => ({ ...prev, url: e.target.value }))} />
              <div className="choice-row" style={{ marginTop: -4 }}>
                <button type="button" className="btn btn-g btn-sm" disabled={bookmarkBusy || !bookmarkDraft.url.trim()} onClick={() => void hydrateBookmarkPreview(bookmarkDraft.url.trim())}>{bookmarkBusy ? "Analyse…" : "Récupérer l’aperçu"}</button>
              </div>
            </>
          )}
          {bookmarkDraft.type === "text" && (
            <ModalField label="Contenu" id="m-bm-text" as="textarea" placeholder="Texte libre, mémo, idée, citation…" value={bookmarkDraft.text} onChange={(e) => setBookmarkDraft((prev) => ({ ...prev, text: e.target.value }))} />
          )}
          <div className="field">
            <label>Image de couverture</label>
            <div className="choice-row">
              <button type="button" className="btn btn-g btn-sm" onClick={() => bookmarkImageInputRef.current?.click()}>Choisir une image</button>
              {!!bookmarkDraft.coverUrl && <button type="button" className="btn btn-g btn-sm" onClick={() => setBookmarkDraft((prev) => ({ ...prev, coverUrl: "", mediaKind: prev.type === "image" ? "" : prev.mediaKind }))}>Retirer l’image</button>}
            </div>
            <input
              ref={bookmarkImageInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(event) => {
                void handleBookmarkImageFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input className="finput" value={bookmarkDraft.coverUrl} onChange={(e) => setBookmarkDraft((prev) => ({ ...prev, coverUrl: e.target.value }))} placeholder="https://image... ou image locale" style={{ marginTop: 10 }} />
          </div>
          <ModalField label="Note rapide" id="m-bm-note" as="textarea" placeholder="Pourquoi vous gardez ce contenu ?" value={bookmarkDraft.note} onChange={(e) => setBookmarkDraft((prev) => ({ ...prev, note: e.target.value }))} />
          <ModalField label="Icône" id="m-bm-icon" placeholder="🔖" value={bookmarkDraft.icon} onChange={(e) => setBookmarkDraft((prev) => ({ ...prev, icon: e.target.value }))} />
          <div className="muted-box" style={{ marginBottom: 10 }}>
            <strong style={{ display: "block", marginBottom: 4 }}>{bookmarkDraft.title || bookmarkDraft.previewTitle || "Aperçu du signet"}</strong>
            <span>{bookmarkDraft.previewText || bookmarkDraft.note || bookmarkDraft.text || bookmarkDraft.url || "Ajoutez un lien, une image ou du texte pour construire une carte riche."}</span>
          </div>
          {!bookmarkDraft.id && renderLinkChecklist("bookmark")}
          {bookmarkDraft.id && !!bookmarkDraft.links && (
            <div className="muted-box">Les liaisons existantes sont conservées pendant cette édition pour éviter toute perte de contexte.</div>
          )}
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={saveBookmarkDraft}>{bookmarkDraft.id ? "Enregistrer" : "Ajouter"}</button></div>
        </div>
      </div>
    );

    if (modal === "goal") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvel objectif</h3>
          <ModalField label="Titre" id="m-gl-title" placeholder="Lancer le site, apprendre…" />
          <ModalField label="Deadline" id="m-gl-dead" type="date" />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-gl-title")?.value?.trim();
            if (!t) return toast("Titre requis", "err");
            updateDb(d => {
              d.goals.push({ id: uid(), title: t, deadline: document.getElementById("m-gl-dead")?.value || "", progress: 0 });
              addActivityEntry(d, { type: "goal", title: "Objectif créé", detail: t });
            });
            close(); toast("Objectif créé");
          }}>Créer</button></div>
        </div>
      </div>
    );

    return null;
  };

  // ═══════ VIEWS ═══════

  // ── Dashboard ──
  const ViewDashboard = () => {
    const done = db.tasks.filter((task) => columnFromTaskStatus(task.status, task.colIdx) === 3).length;
    const todayDone = db.habits.filter((habit) => isHabitScheduledForDate(habit, todayStr()) && isHabitDoneForDate(habit, todayStr())).length;
    const unreadMessages = orderedConversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
    const activityItems = Array.isArray(db.activity) ? db.activity : [];
    const upcomingEvents = sortEventsByDateTime(db.events.filter((event) => event.date >= todayStr()));
    const dashboardWindow = getDashboardWindow(dashboardRange, dashboardReferenceDate);
    const isInDashboardWindow = (value) => {
      const dayKey = `${value || ""}`.slice(0, 10);
      return Boolean(dayKey && dayKey >= dashboardWindow.start && dayKey <= dashboardWindow.end);
    };
    const notesInRange = db.notes.filter((note) => isInDashboardWindow(note.updatedAt || note.createdAt));
    const tasksInRange = db.tasks.filter((task) => isInDashboardWindow(task.due || task.updatedAt || task.createdAt));
    const eventsInRange = sortEventsByDateTime(db.events.filter((event) => isInDashboardWindow(event.date)));
    const messagesInRange = orderedConversations.filter((conversation) => isInDashboardWindow(conversation.lastMessage?.createdAt));
    const unreadMessagesInRange = messagesInRange.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);
    const completedTasksInRange = tasksInRange.filter((task) => columnFromTaskStatus(task.status, task.colIdx) === 3).length;
    const rangeFocusLabel = dashboardRange === "today" ? "du jour" : dashboardRange === "yesterday" ? "d'hier" : dashboardRange === "week" ? "de la semaine" : dashboardRange === "year" ? "de l'année" : "du mois";
    const d = new Date();
    const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const MONS = ["janv", "fev", "mars", "avr", "mai", "juin", "juil", "aout", "sept", "oct", "nov", "dec"];
    const topPriorities = [
      ...db.tasks.filter((task) => columnFromTaskStatus(task.status, task.colIdx) !== 3).sort((a, b) => `${a.due || "9999"}${a.prio || ""}`.localeCompare(`${b.due || "9999"}${b.prio || ""}`)).slice(0, 2).map((task) => ({ id: `task-${task.id}`, icon: I.kanban, title: task.title || "Tâche", meta: task.due ? `À faire avant ${fmtDate(task.due)}` : "Action ouverte", onClick: () => { setView("projects"); setSelectedTaskId(task.id); } })),
      ...upcomingEvents.slice(0, 1).map((event) => ({ id: `event-${event.id}`, icon: I.cal, title: event.title || "Événement", meta: `${fmtDate(event.date)} · ${formatEventWindow(event)}`, onClick: () => { setView("calendar"); selectCalendarDate(event.date, { openDay: true }); } })),
    ].slice(0, 3);
    const timelineToday = [
      ...sortEventsByDateTime(db.events.filter((event) => event.date === todayStr())).map((event) => ({ id: `event-${event.id}`, icon: I.cal, title: event.title || "Événement", meta: formatEventWindow(event), onClick: () => { setView("calendar"); selectCalendarDate(event.date, { openDay: true }); } })),
      ...db.tasks.filter((task) => task.due === todayStr()).map((task) => ({ id: `task-${task.id}`, icon: I.kanban, title: task.title || "Tâche", meta: "Échéance aujourd’hui", onClick: () => { setView("projects"); setSelectedTaskId(task.id); } })),
    ].slice(0, 6);
    const overdueItems = [
      ...db.tasks.filter((task) => task.due && task.due < todayStr() && columnFromTaskStatus(task.status, task.colIdx) !== 3).map((task) => ({ id: `task-${task.id}`, icon: I.kanban, title: task.title || "Tâche", meta: `En retard depuis ${fmtDate(task.due)}`, onClick: () => { setView("projects"); setSelectedTaskId(task.id); } })),
      ...db.habits.filter((habit) => isHabitScheduledForDate(habit, todayStr()) && !isHabitDoneForDate(habit, todayStr())).slice(0, 2).map((habit) => ({ id: `habit-${habit.id}`, icon: I.check, title: habit.name || "Habitude", meta: "À reprendre aujourd’hui", onClick: () => setView("habits") })),
    ].slice(0, 5);
    const nowAgenda = upcomingEvents
      .filter((event) => {
        const dt = new Date(`${event.date}T${event.time || "09:00"}:00`);
        return dt.getTime() >= Date.now() - (60 * 60 * 1000);
      })
      .slice(0, 3);
    const weekDates = getWeekDatesFrom();
    const weeklyProgress = weekDates.map((date) => {
      const target = db.habits.filter((habit) => isHabitScheduledForDate(habit, date)).length || 1;
      const doneCount = db.habits.filter((habit) => isHabitScheduledForDate(habit, date) && isHabitDoneForDate(habit, date)).length;
      return { date, value: Math.round((doneCount / target) * 100) };
    });
    const importantMessages = orderedConversations
      .filter((conversation) => conversation.unreadCount || `${conversation.lastMessage?.body || ""}`.includes("@"))
      .slice(0, 4)
      .map((conversation) => ({
        id: conversation.id,
        icon: I.msg,
        title: conversation.title,
        meta: conversation.lastMessage?.body || `${conversation.unreadCount || 0} message(s) non lus`,
        onClick: () => { setView("conversations"); setSelectedConversationId(conversation.id); },
      }));
    const activeGoals = db.goals.filter((goal) => (goal.progress || 0) < 100).slice(0, 3);
    const smartShortcuts = [
      { id: "smart-note", icon: I.edit, title: "Nouvelle note", meta: "Capturer une idée sans passer par une popup", onClick: () => createQuickNote(selectedNoteCategory) },
      { id: "smart-calendar", icon: I.cal, title: "Voir aujourd’hui", meta: "Ouvrir le jour en cours dans le calendrier", onClick: () => { setView("calendar"); selectCalendarDate(todayStr(), { openDay: true }); } },
      { id: "smart-msg", icon: I.msg, title: "Reprendre la messagerie", meta: unreadMessages ? `${unreadMessages} message(s) à lire` : "Relancer un échange", onClick: () => setView("conversations") },
    ];
    const compactActivity = activityItems.slice(0, 4).map((item) => ({
      id: item.id,
      icon: I.clock,
      title: item.title,
      meta: item.detail || fmtRel(item.createdAt),
    }));
    const dashboardRangeOptions = [
      { key: "yesterday", label: "Hier" },
      { key: "today", label: "Aujourd'hui" },
      { key: "week", label: "Semaine" },
      { key: "month", label: "Mois" },
      { key: "year", label: "Année" },
    ];
    const dashboardSummaryCards = [
      { key: "notes", label: "Notes touchées", value: notesInRange.length, delta: `${db.notes.length} au total` },
      { key: "tasks", label: "Tâches dans la période", value: tasksInRange.length, delta: `${completedTasksInRange} terminées sur ${rangeFocusLabel}` },
      { key: "messages", label: "Messages sur la période", value: messagesInRange.length, delta: unreadMessagesInRange ? `${unreadMessagesInRange} non lus` : `${orderedConversations.length} discussions` },
      { key: "events", label: "Événements sur la période", value: eventsInRange.length, delta: eventsInRange[0] ? `Prochain: ${eventsInRange[0].title}` : "Agenda calme" },
    ];
    const inboxItems = [
      ...orderedConversations
        .filter((conversation) => conversation.unreadCount)
        .map((conversation) => ({
          id: `conv-${conversation.id}`,
          icon: I.msg,
          title: conversation.title,
          meta: conversation.lastMessage?.body || "Nouveau message",
          onClick: () => {
            setView("conversations");
            setSelectedConversationId(conversation.id);
          },
          badge: conversation.unreadCount,
        })),
      ...appNotifications
        .filter((notification) => !notification.readAt)
        .slice(0, 2)
        .map((notification) => ({
          id: `notif-${notification.id}`,
          icon: notification.type === "event" ? I.cal : notification.type === "bookmark" ? I.bookmark : notification.type === "call" ? I.phone : I.bell,
          title: notification.detail || notification.title,
          meta: fmtRel(notification.createdAt),
          onClick: () => {
            if (notification.href) setView(notification.href);
            if (notification.href === "conversations" && notification.entityId) setSelectedConversationId(notification.entityId);
            if (notification.href === "calendar" && notification.entityId) {
              const event = db.events.find((entry) => entry.id === notification.entityId);
              if (event?.date) selectCalendarDate(event.date, { openDay: true });
            }
          },
        })),
    ].slice(0, 4);
    const recentContacts = orderedConversations
      .filter((conversation) => conversation.type === "direct")
      .map((conversation) => {
        const contact = (conversation.participants || []).find((participant) => participant.uid !== user.uid);
        return contact ? { ...contact, conversationId: conversation.id } : null;
      })
      .filter(Boolean)
      .slice(0, 4);
    const dashboardOrder = [
      ...new Set([
        ...((Array.isArray(db.settings?.dashboardOrder) ? db.settings.dashboardOrder : []).filter((key) => DASHBOARD_WIDGET_KEYS.includes(key))),
        ...DASHBOARD_WIDGET_KEYS,
      ]),
    ];
    const dashboardWidgets = {
      priority: topPriorities.length ? {
        title: "Priorité du jour",
        sub: "Trois actions nettes, pas plus.",
        content: (
          <div className="list-rows">
            {topPriorities.map((item) => (
              <button key={item.id} type="button" className="list-row clickable" onClick={item.onClick}>
                <div className="list-main">
                  <div className="list-icon">{item.icon}</div>
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ),
      } : null,
      timeline: timelineToday.length ? {
        title: "Timeline aujourd’hui",
        sub: "Tâches, événements et points du jour dans une seule vue.",
        content: (
          <div className="list-rows">
            {timelineToday.map((item) => (
              <button key={item.id} type="button" className="list-row clickable" onClick={item.onClick}>
                <div className="list-main">
                  <div className="list-icon">{item.icon}</div>
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ),
      } : null,
      overdue: overdueItems.length ? {
        title: "Retards à corriger",
        sub: "Ce qui doit être remis d’équerre rapidement.",
        content: (
          <div className="list-rows">
            {overdueItems.map((item) => (
              <button key={item.id} type="button" className="list-row clickable" onClick={item.onClick}>
                <div className="list-main">
                  <div className="list-icon">{item.icon}</div>
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ),
      } : null,
      week: {
        title: "Progression semaine",
        sub: "Courbe simple de régularité et d’exécution.",
        content: (
          <div className="bar-chart">
            {weeklyProgress.map((day) => (
              <div key={day.date} className="bar-col">
                <div className="bar-stick" style={{ height: `${Math.max(16, day.value * 1.6)}px` }} />
                <div className="bar-label">{new Date(`${day.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" })}</div>
              </div>
            ))}
          </div>
        ),
      },
      messages: importantMessages.length ? {
        title: "Messages importants",
        sub: "Non lus et échanges à ne pas laisser tomber.",
        content: (
          <div className="list-rows">
            {importantMessages.map((item) => (
              <button key={item.id} type="button" className="list-row clickable" onClick={item.onClick}>
                <div className="list-main">
                  <div className="list-icon">{item.icon}</div>
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ),
      } : null,
      goals: activeGoals.length ? {
        title: "Objectifs actifs",
        sub: "Un suivi plus premium des objectifs en cours.",
        content: (
          <div className="list-rows">
            {activeGoals.map((goal) => (
              <div key={goal.id} className="goal-card">
                <div className="goal-title">{goal.title}</div>
                <div className="goal-bar"><div className="goal-fill" style={{ width: `${goal.progress || 0}%` }} /></div>
                <div className="goal-meta"><span>{goal.progress || 0}%</span><span>{goal.deadline ? fmtDate(goal.deadline) : "Sans date"}</span></div>
              </div>
            ))}
          </div>
        ),
      } : null,
      shortcuts: {
        title: "Raccourcis intelligents",
        sub: "Les accès utiles selon l’état actuel du workspace.",
        content: (
          <div className="quick-grid">
            {smartShortcuts.map((item) => (
              <button key={item.id} type="button" className="quick-card" onClick={item.onClick}>
                <div className="list-icon">{item.icon}</div>
                <strong>{item.title}</strong>
                <span>{item.meta}</span>
              </button>
            ))}
          </div>
        ),
      },
      inbox: inboxItems.length ? {
        title: "Boîte de réception",
        sub: "Messages et alertes non lus.",
        content: (
          <div className="list-rows">
            {inboxItems.map((item) => (
              <button key={item.id} type="button" className="list-row clickable" onClick={item.onClick}>
                <div className="list-main">
                  <div className="list-icon">{item.icon}</div>
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                </div>
                {item.badge ? <span className="pill">{item.badge}</span> : <span className="pill">Voir</span>}
              </button>
            ))}
          </div>
        ),
      } : null,
      contacts: recentContacts.length ? {
        title: "Contacts récents",
        sub: "Accès direct aux derniers échanges.",
        content: (
          <div className="contact-grid">
            {recentContacts.map((contact) => (
              <button key={contact.uid} type="button" className="contact-card" onClick={() => { setView("conversations"); setSelectedConversationId(contact.conversationId); }}>
                <div className="conv-avatar">
                  {contact.photoUrl ? <img src={contact.photoUrl} alt="" /> : (contact.name || "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <strong>{contact.name}</strong>
                  <span>{contact.username ? `@${contact.username}` : contact.email || "Conversation"}</span>
                </div>
              </button>
            ))}
          </div>
        ),
      } : null,
      activity: compactActivity.length ? {
        title: "Activité récente",
        sub: "Version plus compacte et plus utile.",
        content: (
          <div className="list-rows">
            {compactActivity.map((item) => (
              <div key={item.id} className="list-row">
                <div className="list-main">
                  <div className="list-icon">{item.icon}</div>
                  <div className="list-copy">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ),
      } : null,
    };
    const visibleDashboardOrder = dashboardOrder.filter((widgetKey) => dashboardWidgets[widgetKey]);
    const swapDashboardWidgets = (firstKey, secondKey) => {
      if (!firstKey || !secondKey || firstKey === secondKey) return;
      updateDb((draft) => {
        const currentOrder = [...visibleDashboardOrder];
        draft.settings.dashboardOrder = currentOrder.map((key) => {
          if (key === firstKey) return secondKey;
          if (key === secondKey) return firstKey;
          return key;
        });
      });
    };

    return (
      <div className="dashboard-shell">
        <div className="dashboard-topbar">
          <div>
            <div className="dashboard-title">Dashboard</div>
            <div className="dashboard-subtitle">{greeting}, {db.profile?.name || user.name}. Une vue claire du workspace, dans un shell plus premium.</div>
          </div>
          <div className="dashboard-filters">
            <div className="dashboard-segmented">
              {dashboardRangeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`dashboard-range-btn ${dashboardRange === option.key ? "on" : ""}`}
                  onClick={() => { setDashboardRange(option.key); setDashboardReferenceDate(new Date()); }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="dashboard-date-pill">{dashboardWindow.label}</div>
          </div>
        </div>

        <EditableBlock blockKey="dashboard-summary" label="Stats dashboard" className="dashboard-summary-grid">
          {dashboardSummaryCards.map((card, index) => (
            <div key={card.key} className={`dashboard-stat-card ${index === 0 ? "primary" : ""}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.delta}</small>
            </div>
          ))}
        </EditableBlock>

        <div className="hero-grid">
          <EditableBlock blockKey="dashboard-hero" label="Hero dashboard" className="hero-main dashboard-hero-main">
            <div className="hero-head dashboard-hero-head">
              <div>
                <div className="hero-title">Welcome back, {db.profile?.name || user.name}</div>
                <div className="hero-actions">
                  <button className="btn btn-p" onClick={() => createQuickNote()}>{I.plus} Nouvelle note</button>
                  <button className="btn btn-g" onClick={() => setView("projects")}>{I.kanban} Ouvrir les projets</button>
                  <button className="btn btn-g" onClick={() => setView("calendar")}>{I.cal} Ouvrir le calendrier</button>
                </div>
              </div>
              <div className="dashboard-hero-side">
                <div className="dashboard-mini-calendar">
                  <div className="dashboard-mini-calendar-head">
                    <button type="button" onClick={() => setDashboardReferenceDate((prev) => shiftDashboardReferenceDate(prev, dashboardRange, -1))}>{I.chev}</button>
                    <strong>{dashboardWindow.label}</strong>
                    <button type="button" onClick={() => setDashboardReferenceDate((prev) => shiftDashboardReferenceDate(prev, dashboardRange, 1))}>{I.chev}</button>
                  </div>
                  <div className="dashboard-mini-calendar-strip">
                    {weekDates.slice(1, 6).map((date) => {
                      const day = new Date(`${date}T12:00:00`);
                      const active = date === dashboardWindow.accentDate;
                      return (
                        <div key={date} className={`dashboard-mini-day ${active ? "on" : ""}`}>
                          <span>{day.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                          <strong>{day.getDate()}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-mini-grid">
              <div className="hero-mini">
                <h4>Productivité du workspace</h4>
                <div className="big">{db.tasks.length + db.notes.length}</div>
                <div className="muted">{done} tâches terminées et {db.notes.length} notes synchronisées.</div>
              </div>
              <div className="hero-mini">
                <h4>Boîte de réception</h4>
                <div className="big">{unreadMessages + unreadNotifications}</div>
                <div className="muted">{unreadMessages} messages non lus et {unreadNotifications} notifications à traiter.</div>
              </div>
            </div>
          </EditableBlock>
          <EditableBlock blockKey="dashboard-quick" label="Vue rapide" className="surface dashboard-side-panel">
            <div className="surface-head">
              <div>
                <div className="surface-title">Vue rapide</div>
                <div className="surface-sub">Les points à ouvrir en un clic.</div>
              </div>
            </div>
            <div className="quick-grid">
              <button type="button" className="quick-card" onClick={() => setView("notes")}><div className="list-icon">{I.edit}</div><strong>Notes</strong><span>{[...db.notes].sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)))[0]?.favorite ? `★ ${[...db.notes].sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)))[0]?.title || "Favori"}` : `${db.notes.length} note${db.notes.length > 1 ? "s" : ""}`}</span></button>
              <button type="button" className="quick-card" onClick={() => setView("projects")}><div className="list-icon">{I.kanban}</div><strong>Projets</strong><span>{db.tasks.length} tâche{db.tasks.length > 1 ? "s" : ""}</span></button>
              <button type="button" className="quick-card" onClick={() => { setView("calendar"); setCalendarDayOpen(false); }}><div className="list-icon">{I.cal}</div><strong>Calendrier</strong><span>{upcomingEvents.length} à venir</span></button>
              <button type="button" className="quick-card" onClick={() => setView("habits")}><div className="list-icon">{I.check}</div><strong>Habitudes</strong><span>{todayDone}/{db.habits.length || 0} aujourd’hui</span></button>
            </div>
          </EditableBlock>
        </div>
        <EditableBlock blockKey="dashboard-widgets" label="Widgets dashboard" className="dashboard-widgets">
              {visibleDashboardOrder.map((widgetKey) => {
                const widget = dashboardWidgets[widgetKey];
                if (!widget) return null;
                return (
                  <div
                    key={widgetKey}
                    className={`surface dashboard-widget dashboard-widget-${widgetKey} ${draggingDashboardWidget === widgetKey ? "dragging" : ""} ${dashboardDropTarget === widgetKey ? "drag-target" : ""}`}
                    draggable={!isMobileViewport}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/flow-dashboard", widgetKey);
                      event.dataTransfer.effectAllowed = "move";
                      setDraggingDashboardWidget(widgetKey);
                    }}
                    onDragEnd={() => {
                      setDraggingDashboardWidget("");
                      setDashboardDropTarget("");
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragEnter={() => setDashboardDropTarget(widgetKey)}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedKey = event.dataTransfer.getData("text/flow-dashboard");
                      swapDashboardWidgets(draggedKey, widgetKey);
                      setDraggingDashboardWidget("");
                      setDashboardDropTarget("");
                    }}
                  >
                <div className="surface-head dashboard-widget-head">
                  <div>
                    <div className="surface-title">{widget.title}</div>
                    <div className="surface-sub">{widget.sub}</div>
                  </div>
                </div>
                {widget.content}
              </div>
            );
          })}
        </EditableBlock>
      </div>
    );
  };

  // ── Notes ──
  const ViewNotes = () => {
    const searchNeedle = noteSearchQuery.trim().toLowerCase();
    const allNotes = [...db.notes].sort((a, b) => {
      if (Boolean(b.favorite) !== Boolean(a.favorite)) return Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
      return `${b.updatedAt || b.createdAt || ""}`.localeCompare(`${a.updatedAt || a.createdAt || ""}`);
    });
    const globalSearchResults = searchNeedle
      ? allNotes.filter((note) => `${note.title || ""} ${noteTextFromHtml(note.content || "")}`.toLowerCase().includes(searchNeedle)).slice(0, 8)
      : [];
    const selectedCategory = noteCategories.find((category) => category.key === selectedNoteCategory) || null;
    const categoryNotes = selectedNoteCategory
      ? allNotes.filter((note) => (note.cat || firstNoteCategoryKey) === selectedNoteCategory)
      : allNotes;
    const editingNote = editNote ? db.notes.find((n) => n.id === editNote) : null;
    const groupedNotes = noteCategories.map((category) => ({
      ...category,
      notes: allNotes.filter((note) => (note.cat || firstNoteCategoryKey) === category.key),
    })).filter((group) => group.notes.length);
    const shareTargets = contactDirectory.filter((contact) => {
      const haystack = `${contact.name || ""} ${contact.email || ""} ${contact.username || ""} ${contact.phone || ""}`.toLowerCase();
      return !noteShareDialog.target.trim() || haystack.includes(noteShareDialog.target.trim().toLowerCase());
    }).slice(0, 8);

    const openNoteContextMenu = (point, note) => {
      setNoteContextMenu({
        x: Math.min(point.x, window.innerWidth - 260),
        y: Math.min(point.y, window.innerHeight - 260),
        noteId: note.id,
      });
    };
    const openZone = (categoryKey) => {
      setSelectedNoteCategory(categoryKey);
      setNoteView("category");
      setEditNote(null);
    };
    const openNote = (noteId, categoryKey = selectedNoteCategory) => {
      setSelectedNoteCategory(categoryKey || firstNoteCategoryKey);
      setNoteView("note");
      setEditNote(noteId);
    };
    const goBackInNotes = () => {
      if (noteView === "note") {
        setSelectedNoteCategory("");
        setEditNote(null);
        setNoteView("overview");
        return;
      }
      if (noteView === "category") {
        setSelectedNoteCategory("");
        setEditNote(null);
        setNoteView("overview");
        return;
      }
      setEditNote(null);
      setNoteView("overview");
    };
    const sidebarCategoryKey = selectedNoteCategory || editingNote?.cat || firstNoteCategoryKey;
    const sidebarCategory = noteCategories.find((category) => category.key === sidebarCategoryKey) || selectedCategory || noteCategories[0] || null;
    const sidebarNotes = sidebarCategory
      ? allNotes.filter((note) => (note.cat || firstNoteCategoryKey) === sidebarCategory.key)
      : [];

    const deleteNote = (note) => {
      void requestConfirm({
        title: "Supprimer cette note ?",
        detail: note.title || "Cette note sera retirée définitivement.",
        confirmLabel: "Supprimer",
        tone: "danger",
      }).then((ok) => {
        if (!ok) return;
        updateDb((draft) => {
          draft.notes = draft.notes.filter((item) => item.id !== note.id);
          addActivityEntry(draft, { type: "note", title: "Note supprimée", detail: note.title || "Note" });
        });
        if (editNote === note.id) setEditNote(null);
        setNoteContextMenu(null);
        toast("Note supprimée", "info");
      });
    };

    const renderSearchResults = () => (
      searchNeedle ? (
        <div className="note-search-pop">
          {globalSearchResults.length ? globalSearchResults.map((note) => (
            <button
              key={note.id}
              type="button"
              className="note-search-item"
              onClick={() => {
                openNote(note.id, note.cat || firstNoteCategoryKey);
                setNoteSearchQuery("");
              }}
            >
              <strong>{note.title || "Sans titre"}</strong>
              <span>{notePreviewFromContent(note.content || "") || "Note vide"}</span>
            </button>
          )) : <div className="note-search-empty">Aucune note</div>}
        </div>
      ) : null
    );

    const shareDialogNode = noteShareDialog.open ? (
      <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setNoteShareDialog({ open: false, noteId: "", target: "", role: "reader" }); }}>
        <div className="modal">
          <h3>Partager la note</h3>
          <ModalField label="Chercher un contact" id="m-note-share" value={noteShareDialog.target} onChange={(event) => setNoteShareDialog((prev) => ({ ...prev, target: event.target.value }))} placeholder="Nom, email ou téléphone" />
          <div className="choice-row">
            <button className={`choice-pill ${noteShareDialog.role === "reader" ? "on" : ""}`} onClick={() => setNoteShareDialog((prev) => ({ ...prev, role: "reader" }))}>Lecteur</button>
            <button className={`choice-pill ${noteShareDialog.role === "editor" ? "on" : ""}`} onClick={() => setNoteShareDialog((prev) => ({ ...prev, role: "editor" }))}>Éditeur</button>
          </div>
          {!!shareTargets.length && (
            <div className="panel-list">
              {shareTargets.map((contact) => (
                <button key={contact.uid} className="panel-item" onClick={() => {
                  updateDb((draft) => {
                    const currentNote = draft.notes.find((item) => item.id === noteShareDialog.noteId);
                    if (!currentNote) return;
                    currentNote.sharedWith = [
                      ...(Array.isArray(currentNote.sharedWith) ? currentNote.sharedWith : []),
                      { target: contact.email || contact.username || contact.name, role: noteShareDialog.role },
                    ];
                    currentNote.updatedAt = new Date().toISOString();
                  });
                  setNoteShareDialog({ open: false, noteId: "", target: "", role: "reader" });
                  toast("Partage ajouté");
                }}>
                  <strong>{contact.name}</strong>
                  <span>{contact.email || contact.username || contact.phone}</span>
                </button>
              ))}
            </div>
          )}
          <div className="modal-ft">
            <button className="btn btn-g" onClick={() => setNoteShareDialog({ open: false, noteId: "", target: "", role: "reader" })}>Annuler</button>
            <button className="btn btn-g" onClick={() => {
              setNoteShareDialog({ open: false, noteId: "", target: "", role: "reader" });
              setView("conversations");
            }}>{I.plus} Nouveau contact</button>
            <button className="btn btn-g" onClick={async () => {
              const note = db.notes.find((item) => item.id === noteShareDialog.noteId);
              if (!note || typeof window === "undefined") return;
              const payload = encodeSharedNotePayload({
                token: note.sharedImportToken || uid(),
                title: note.title || "Note partagée",
                content: note.content || "",
                cat: note.cat || firstNoteCategoryKey,
                links: note.links || createEmptyLinks(),
                attachments: note.attachments || [],
                sharedBy: db.profile?.username || db.profile?.name || user?.name || "Flow",
                role: noteShareDialog.role,
              });
              const url = `${window.location.origin}/?sharedNote=${payload}`;
              await navigator.clipboard.writeText(url).catch(() => {});
              toast("Lien copié");
            }}>Copier le lien</button>
            <button className="btn btn-p" onClick={() => {
              if (!noteShareDialog.target.trim()) return;
              updateDb((draft) => {
                const currentNote = draft.notes.find((item) => item.id === noteShareDialog.noteId);
                if (!currentNote) return;
                currentNote.sharedWith = [
                  ...(Array.isArray(currentNote.sharedWith) ? currentNote.sharedWith : []),
                  { target: noteShareDialog.target.trim(), role: noteShareDialog.role },
                ];
                currentNote.updatedAt = new Date().toISOString();
              });
              setNoteShareDialog({ open: false, noteId: "", target: "", role: "reader" });
              toast("Partage ajouté");
            }}>Ajouter</button>
          </div>
        </div>
      </div>
    ) : null;

    const unlockDialogNode = noteUnlockDialog.open ? (
      <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget && !noteUnlockDialog.busy) setNoteUnlockDialog({ open: false, noteId: "", password: "", busy: false }); }}>
        <div className="modal">
          <h3>Déverrouiller la note</h3>
          <ModalField label="Code du compte" id="m-note-unlock" type="password" value={noteUnlockDialog.password} onChange={(event) => setNoteUnlockDialog((prev) => ({ ...prev, password: event.target.value }))} placeholder="Mot de passe" />
          <div className="modal-ft">
            <button className="btn btn-g" onClick={() => setNoteUnlockDialog({ open: false, noteId: "", password: "", busy: false })}>Annuler</button>
            <button className="btn btn-p" onClick={async () => {
              if (!noteUnlockDialog.password.trim()) return;
              setNoteUnlockDialog((prev) => ({ ...prev, busy: true }));
              try {
                await api("/api/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email: user?.email || "", password: noteUnlockDialog.password }),
                });
                updateNoteField(noteUnlockDialog.noteId, { locked: false });
                setNoteUnlockDialog({ open: false, noteId: "", password: "", busy: false });
                toast("Note déverrouillée");
              } catch (error) {
                setNoteUnlockDialog((prev) => ({ ...prev, busy: false }));
                toast(error.message || "Mot de passe incorrect", "err");
              }
            }}>{noteUnlockDialog.busy ? "Vérification…" : "Déverrouiller"}</button>
          </div>
        </div>
      </div>
    ) : null;

    if (editNote !== null) {
      const note = editingNote;
      if (!note && pendingNoteIdRef.current === editNote) return (
        <div className="empty">
          <p>Ouverture de la note…</p>
        </div>
      );
      if (!note) return (
        <div className="empty">
          <p>Cette note n’existe plus.</p>
          <button className="btn btn-p" onClick={goBackInNotes}>Retour aux notes</button>
        </div>
      );

      return (
        <>
        <div className="note-shell">
          <div className="note-header-row">
            <div className="note-search-wrap">
              <button className="note-back-btn" type="button" onClick={goBackInNotes} aria-label="Retour aux notes">{I.reply}</button>
              <div className="note-search">
                {I.search}
                <input
                  ref={noteSearchInputRef}
                  value={noteSearchQuery}
                  onFocus={saveCurrentNoteSelection}
                  onChange={(event) => setNoteSearchQuery(event.target.value)}
                  placeholder="Rechercher Une Note"
                />
                {renderSearchResults()}
              </div>
            </div>
            <div className="note-toolbar">
              <div className="note-toolbar-group">
                <button className={`note-tool ${noteEditorMenu === "type" ? "on" : ""}`} onClick={() => setNoteEditorMenu((prev) => prev === "type" ? "" : "type")}>{I.type}</button>
                <button className="note-tool" onClick={() => insertChecklistIntoActiveNote()}>{I.list}</button>
                <button className={`note-tool ${noteEditorMenu === "attach" ? "on" : ""}`} onClick={() => setNoteEditorMenu((prev) => prev === "attach" ? "" : "attach")}>{I.paperclip}</button>
                <button className="note-tool" onClick={() => setNoteShareDialog({ open: true, noteId: note.id, target: "", role: "reader" })}>{I.share}</button>
                <button className={`note-tool ${noteEditorMenu === "more" ? "on" : ""}`} onClick={() => setNoteEditorMenu((prev) => prev === "more" ? "" : "more")}>{I.more}</button>
                {noteEditorMenu === "type" && (
                  <div className="note-pop right">
                    <div className="note-type-head">
                      <div className="note-type-size">
                        <button className="btn btn-g btn-sm" onClick={() => setNoteTypeSize((prev) => Math.max(6, prev - 1))}>-</button>
                        <select className="finput" value={noteTypeSize} onChange={(event) => setNoteTypeSize(Number(event.target.value) || 16)}>
                          {Array.from({ length: 139 }, (_, index) => index + 6).map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                        <button className="btn btn-g btn-sm" onClick={() => setNoteTypeSize((prev) => Math.min(144, prev + 1))}>+</button>
                      </div>
                    </div>
                    <div className="note-menu-list">
                      <button className="note-menu-btn" onClick={() => toggleCurrentNoteStyle("bold")}><strong>Gras</strong></button>
                      <button className="note-menu-btn" onClick={() => toggleCurrentNoteStyle("italic")}><strong>Italique</strong></button>
                      <button className="note-menu-btn" onClick={() => { setNoteTypeFontFamily("var(--serif)"); wrapCurrentNoteSelection({ fontFamily: "var(--serif)" }); }}><strong>Serif</strong></button>
                      <button className="note-menu-btn" onClick={() => { setNoteTypeFontFamily("var(--sans)"); wrapCurrentNoteSelection({ fontFamily: "var(--sans)" }); }}><strong>Sans</strong></button>
                      <button className="note-menu-btn" onClick={() => wrapCurrentNoteSelection({ fontSize: `${noteTypeSize}px`, fontFamily: noteTypeFontFamily })}><strong>Appliquer {noteTypeSize}px</strong></button>
                    </div>
                  </div>
                )}
                {noteEditorMenu === "attach" && (
                  <div className="note-pop right">
                    <div className="note-menu-list">
                      <button className="note-menu-btn" onClick={() => noteAttachmentInputRef.current?.click()}>{I.attachImage}<span>Importer une image</span></button>
                      <button className="note-menu-btn" onClick={() => noteAttachmentInputRef.current?.click()}>{I.paperclip}<span>Importer un fichier</span></button>
                    </div>
                  </div>
                )}
                {noteEditorMenu === "more" && (
                  <div className="note-pop right">
                    <div className="note-menu-list">
                      <button className="note-menu-btn" onClick={() => {
                        updateNoteField(note.id, { favorite: !note.favorite });
                        setNoteEditorMenu("");
                      }}>{I.star}<span>{note.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}</span></button>
                      <button className="note-menu-btn" onClick={() => { void lockOrUnlockNote(note); }}>{I.lock}<span>{note.locked ? "Déverrouiller" : "Verrouiller"}</span></button>
                      <button className="note-menu-btn" onClick={() => {
                        setNoteEditorMenu("");
                        noteSearchInputRef.current?.focus();
                      }}>{I.search}<span>Rechercher une note</span></button>
                      <button className="note-menu-btn" onClick={() => setNoteEditorMenu("move")}>{I.book}<span>Déplacer vers</span></button>
                      {noteEditorMenu === "move" && (
                        <div className="note-pop right" style={{ top: 0, right: -230 }}>
                          <div className="note-menu-list">
                            {noteCategories.filter((category) => category.key !== (note.cat || selectedNoteCategory || firstNoteCategoryKey)).map((category) => (
                              <button key={category.key} className="note-menu-btn" onClick={() => {
                                updateNoteField(note.id, { cat: category.key });
                                setSelectedNoteCategory(category.key);
                                setNoteEditorMenu("");
                              }}>{I.book}<span>{category.label}</span></button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="note-editor-grid with-sidebar">
            <EditableBlock blockKey="note-editor-sidebar" label="Barre note ouverte" className="note-side-card">
              <div className="note-side-actions">
                <button className="btn btn-p btn-sm" onClick={() => createQuickNote(sidebarCategory?.key || note.cat || selectedNoteCategory)}>{I.plus} Ajouter Une Note</button>
              </div>
              <div className="note-side-title">{sidebarCategory?.label || "Notes"}</div>
              <div className="note-side-list">
                {sidebarNotes.map((entry) => (
                  <button key={entry.id} type="button" className={`panel-item ${entry.id === note.id ? "selected" : ""}`} onClick={() => openNote(entry.id, entry.cat || selectedNoteCategory)}>
                    <strong>{entry.title || "Sans titre"}</strong>
                    <span>{notePreviewFromContent(entry.content || "") || "Note vide"}</span>
                  </button>
                ))}
              </div>
            </EditableBlock>

            <EditableBlock blockKey="note-editor-main" label="Éditeur de note" className="note-editor-main">
              <div className={`note-editor-card ${note.locked ? "locked" : ""}`}>
                <input className="note-editor-title" id="ne-t" value={note.title || ""} onChange={(event) => updateNoteField(note.id, { title: event.target.value })} placeholder="Titre" disabled={note.locked} />
                {note.sharedByName && <div className="pill" style={{ alignSelf: "flex-start", marginBottom: 12 }}>Partagé par {note.sharedByName}</div>}
                <div
                  ref={noteEditorRef}
                  id="ne-c"
                  className="note-editor-text"
                  contentEditable={!note.locked}
                  suppressContentEditableWarning
                  onInput={() => syncNoteEditorHtml(note.id)}
                  onKeyUp={saveCurrentNoteSelection}
                  onMouseUp={saveCurrentNoteSelection}
                  onBlur={saveCurrentNoteSelection}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleNoteAttachmentFile(event.dataTransfer?.files?.[0]);
                  }}
                  onClick={(event) => {
                    const checkbox = event.target.closest?.('[data-note-check="1"]');
                    noteEditorRef.current?.querySelectorAll(".note-embed.selected").forEach((node) => node.classList.remove("selected"));
                    const embed = event.target.closest?.(".note-embed");
                    if (embed) embed.classList.add("selected");
                    if (checkbox) syncNoteEditorHtml(note.id);
                  }}
                />
                {note.locked && (
                  <div className="note-locked-overlay">
                    <button className="btn btn-p" onClick={() => setNoteUnlockDialog({ open: true, noteId: note.id, password: "", busy: false })}>Déverrouiller avec le mot de passe</button>
                  </div>
                )}
              </div>
            </EditableBlock>
          </div>

          <input ref={noteAttachmentInputRef} type="file" style={{ display: "none" }} onChange={(event) => {
            void handleNoteAttachmentFile(event.target.files?.[0]);
            event.target.value = "";
          }} />
        </div>
        {shareDialogNode}
        {unlockDialogNode}
        </>
      );
    }

    return (
      <div className="note-shell">
        <div className="note-header-row">
          <div className="note-search-wrap">
            <button className="note-back-btn" type="button" onClick={goBackInNotes} aria-label="Retour aux notes">{I.reply}</button>
            <div className="note-search">
              {I.search}
              <input
                ref={noteSearchInputRef}
                value={noteSearchQuery}
                onChange={(event) => setNoteSearchQuery(event.target.value)}
                placeholder="Rechercher Une Note"
              />
              {renderSearchResults()}
            </div>
          </div>
          <button className="btn btn-p" onClick={() => createQuickNote(selectedNoteCategory || firstNoteCategoryKey)}>{I.plus} Ajouter Une Note</button>
        </div>

        <div className="note-zone-layout">
          <EditableBlock blockKey="notes-sidebar" label="Barre catégories notes" className="note-side-card">
            <div className="note-view-panel">
              <div className="note-side-actions">
                {selectedNoteCategory
                  ? <button className="btn btn-p btn-sm" onClick={() => createQuickNote(selectedNoteCategory || firstNoteCategoryKey)}>{I.plus} Ajouter Une Note</button>
                  : <button className="btn btn-p btn-sm" onClick={() => { setNoteModalCategory(firstNoteCategoryKey); setModal("note-category"); }}>{I.plus} Ajouter Une Catégorie</button>}
              </div>
              <div className="note-side-title">{selectedNoteCategory ? (selectedCategory?.label || "Notes") : "Catégories"}</div>
              <div className="note-side-list">
                {!selectedNoteCategory ? noteCategories.map((category) => {
                  const count = db.notes.filter((note) => (note.cat || firstNoteCategoryKey) === category.key).length;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      className={`panel-item ${selectedNoteCategory === category.key ? "selected" : ""} ${noteDropTarget === category.key ? "drop-preview" : ""}`}
                      onClick={() => openZone(category.key)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragEnter={() => setNoteDropTarget(category.key)}
                      onDrop={(event) => {
                        event.preventDefault();
                        const noteId = event.dataTransfer.getData("text/flow-note");
                        if (!noteId) return;
                        updateDb((draftDb) => {
                          const currentNote = draftDb.notes.find((item) => item.id === noteId);
                          if (!currentNote) return;
                          currentNote.cat = category.key;
                          currentNote.updatedAt = new Date().toISOString();
                        });
                        setDraggingNoteId("");
                        setNoteDropTarget("");
                      }}
                    >
                      <strong>{category.label}</strong>
                      <span>{count} note{count > 1 ? "s" : ""}</span>
                    </button>
                  );
                }) : categoryNotes.map((n) => (
                  <button key={n.id} type="button" className={`panel-item ${editNote === n.id ? "selected" : ""}`} onClick={() => openNote(n.id, n.cat || selectedNoteCategory || firstNoteCategoryKey)}>
                    <strong>{n.title || "Sans titre"}</strong>
                    <span>{n.locked ? "Note verrouillée" : (notePreviewFromContent(n.content || "") || "Note vide")}</span>
                  </button>
                ))}
              </div>
            </div>
          </EditableBlock>
          <EditableBlock blockKey="notes-board" label="Grille notes" className={`note-zone-main note-stage ${noteView === "overview" ? "back" : ""}`}>
            {noteView === "overview" ? (
              <div className="note-group-stack">
                {groupedNotes.map((group) => (
                  <section key={group.key} className="note-group-row">
                    <div className="note-group-head">
                      <strong>{group.label}</strong>
                      <span>{group.notes.length} note{group.notes.length > 1 ? "s" : ""}</span>
                    </div>
                    <div className="note-zone-list">
                      {group.notes.map((n) => (
                        <div
                          key={n.id}
                          className={`note-card ${draggingNoteId === n.id ? "dragging" : ""}`}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            openNoteContextMenu({ x: event.clientX, y: event.clientY }, n);
                          }}
                          onTouchStart={(event) => {
                            const touch = event.touches[0];
                            clearLongPress();
                            longPressRef.current = setTimeout(() => openNoteContextMenu({ x: touch.clientX, y: touch.clientY }, n), 450);
                          }}
                          onTouchEnd={clearLongPress}
                          onTouchCancel={clearLongPress}
                          onClick={() => openNote(n.id, n.cat || firstNoteCategoryKey)}
                        >
                          <div
                            className="note-card-drag"
                            draggable
                            onClick={(event) => event.stopPropagation()}
                            onDragStart={(event) => {
                              event.stopPropagation();
                              event.dataTransfer.setData("text/flow-note", n.id);
                              setDraggingNoteId(n.id);
                            }}
                            onDragEnd={() => {
                              setDraggingNoteId("");
                              setNoteDropTarget("");
                            }}
                          />
                          <div className="note-accent" style={{ background: n.color || "var(--accent)" }} />
                          {n.favorite && <div className="note-star-badge">{I.star}</div>}
                          <div className="note-title">{n.title || "Sans titre"}</div>
                          <div className="note-preview">{n.locked ? "Note verrouillée" : (notePreviewFromContent(n.content || "") || "Note vide…")}</div>
                          {n.sharedByName && <div className="pill" style={{ marginTop: 10 }}>Partagé par {n.sharedByName}</div>}
                          <div className="note-foot">
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(n.updatedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : categoryNotes.length ? (
              <>
                <div className="note-stage-title">
                  <h3>{selectedCategory?.label || "Notes"}</h3>
                  <span>{categoryNotes.length} note{categoryNotes.length > 1 ? "s" : ""}</span>
                </div>
                <div className="note-zone-list">
                  {categoryNotes.map((n) => (
                  <div
                    key={n.id}
                    className={`note-card ${draggingNoteId === n.id ? "dragging" : ""}`}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openNoteContextMenu({ x: event.clientX, y: event.clientY }, n);
                    }}
                    onTouchStart={(event) => {
                      const touch = event.touches[0];
                      clearLongPress();
                      longPressRef.current = setTimeout(() => openNoteContextMenu({ x: touch.clientX, y: touch.clientY }, n), 450);
                    }}
                    onTouchEnd={clearLongPress}
                    onTouchCancel={clearLongPress}
                    onClick={() => openNote(n.id, n.cat || selectedNoteCategory || firstNoteCategoryKey)}
                  >
                    <div
                      className="note-card-drag"
                      draggable
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.setData("text/flow-note", n.id);
                        setDraggingNoteId(n.id);
                      }}
                      onDragEnd={() => {
                        setDraggingNoteId("");
                        setNoteDropTarget("");
                      }}
                    />
                    <div className="note-accent" style={{ background: n.color || "var(--accent)" }} />
                    {n.favorite && <div className="note-star-badge">{I.star}</div>}
                    <div className="note-title">{n.title || "Sans titre"}</div>
                    <div className="note-preview">{n.locked ? "Note verrouillée" : (notePreviewFromContent(n.content || "") || "Note vide…")}</div>
                    {n.sharedByName && <div className="pill" style={{ marginTop: 10 }}>Partagé par {n.sharedByName}</div>}
                    <div className="note-foot">
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(n.updatedAt)}</span>
                    </div>
                  </div>
                  ))}
                </div>
              </>
            ) : <div className="empty"><p>Aucune note dans {(selectedCategory?.label || "cette zone").toLowerCase()}.</p><button className="btn btn-p" onClick={() => createQuickNote(selectedNoteCategory || firstNoteCategoryKey)}>Créer une note</button></div>}
          </EditableBlock>
        </div>

        {noteContextMenu && (
          <div className="note-context-menu" style={{ left: noteContextMenu.x, top: noteContextMenu.y }}>
            {(() => {
              const note = db.notes.find((entry) => entry.id === noteContextMenu.noteId);
              if (!note) return null;
              return (
                <div className="note-menu-list">
                  <button className="note-menu-btn" onClick={() => { setEditNote(note.id); setNoteContextMenu(null); }}>{I.edit}<span>Ouvrir</span></button>
                  <button className="note-menu-btn" onClick={() => {
                    updateNoteField(note.id, { favorite: !note.favorite });
                    setNoteContextMenu(null);
                  }}>{I.star}<span>{note.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}</span></button>
                  <button className="note-menu-btn" onClick={() => { void lockOrUnlockNote(note); setNoteContextMenu(null); }}>{I.lock}<span>{note.locked ? "Déverrouiller" : "Verrouiller"}</span></button>
                  <button className="note-menu-btn" onClick={() => duplicateNote(note)}>{I.edit}<span>Dupliquer</span></button>
                  {noteCategories.filter((category) => category.key !== (note.cat || firstNoteCategoryKey)).map((category) => (
                    <button key={category.key} className="note-menu-btn" onClick={() => {
                      updateNoteField(note.id, { cat: category.key });
                      setNoteContextMenu(null);
                    }}>{I.book}<span>Déplacer vers {category.label}</span></button>
                  ))}
                  <button className="note-menu-btn" onClick={() => deleteNote(note)}>{I.trash}<span>Supprimer</span></button>
                </div>
              );
            })()}
          </div>
        )}
        {shareDialogNode}
        {unlockDialogNode}
      </div>
    );
  };

  // ── Kanban ──
  const COLS = ["À faire", "En cours", "Révision", "Terminé"];
  const COL_PIPS = ["#4a5568", "#4a7ec8", "#8a6ec8", "#4a9e6e"];
  const ViewProjects = () => {
    const roleChoices = [
      { key: "viewer", label: "Viewer" },
      { key: "editor", label: "Editor" },
    ];
    const availableMembers = contactDirectory.filter((contact) => !selectedTask?.members?.some((member) => member.uid === contact.uid));

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, marginBottom: 4 }}>Projets</h2>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn-g" onClick={() => setModal("task-template")}>Template</button>
            <button className="btn btn-p" onClick={() => setModal("task")}>{I.plus} Nouvelle tâche</button>
          </div>
        </div>

        {!!db.taskTemplates?.length && (
          <div className="surface" style={{ marginBottom: 14 }}>
            <div className="surface-head">
              <div>
                <div className="surface-title">Templates réutilisables</div>
              </div>
            </div>
            <div className="contact-grid">
              {db.taskTemplates.map((template) => (
                <button key={template.id} type="button" className="contact-card" onClick={() => createTaskFromTemplate(template)}>
                  <div>
                    <strong>{template.title}</strong>
                    <span>{template.subtasks?.length || 0} sous-tâche{(template.subtasks?.length || 0) > 1 ? "s" : ""} · priorité {template.prio || "none"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="k-board">
          {COLS.map((col, ci) => {
            const tasks = db.tasks.filter((task) => columnFromTaskStatus(task.status, task.colIdx) === ci);
            return (
              <div key={ci} className={`k-col ${taskDropTarget === ci ? "drop-preview" : ""}`} style={taskDropTarget === ci ? { width: 320 } : undefined}>
                <div className="k-col-hd"><div className="k-col-pip" style={{ background: COL_PIPS[ci] }} /><div className="k-col-nm">{col}</div><div className="k-col-ct">{tasks.length}</div></div>
                <div
                  className="k-cards"
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnter={() => setTaskDropTarget(ci)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const taskId = event.dataTransfer.getData("text/flow-task");
                    if (!taskId) return;
                    updateDb((draftDb) => {
                      const task = draftDb.tasks.find((item) => item.id === taskId);
                      if (!task) return;
                      task.colIdx = ci;
                      task.status = normalizeTaskStatusFromColumn(ci);
                      task.updatedAt = new Date().toISOString();
                      addActivityEntry(draftDb, { type: "task", title: "Tâche déplacée", detail: `${task.title || "Tâche"} → ${col}` });
                    });
                    setDraggingTaskId("");
                    setTaskDropTarget(-1);
                  }}
                >
                  {tasks.map((t) => {
                    const progress = percentFromSubtasks(t.subtasks || []);
                    const role = getTaskMemberRole(t, user);
                    return (
                      <div
                        key={t.id}
                        className={`k-card ${selectedTaskId === t.id ? "ring" : ""} ${draggingTaskId === t.id ? "dragging" : ""}`}
                        draggable={role === "editor"}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/flow-task", t.id);
                          setDraggingTaskId(t.id);
                        }}
                        onDragEnd={() => {
                          setDraggingTaskId("");
                          setTaskDropTarget(-1);
                        }}
                        onClick={() => setSelectedTaskId(t.id)}
                        onDoubleClick={() => {
                          if (role !== "editor") return;
                          const next = (columnFromTaskStatus(t.status, t.colIdx) + 1) % 4;
                          updateDb((draft) => {
                            const task = draft.tasks.find((item) => item.id === t.id);
                            if (!task) return;
                            task.colIdx = next;
                            task.status = normalizeTaskStatusFromColumn(next);
                            task.updatedAt = new Date().toISOString();
                          });
                        }}
                      >
                        <div className="k-card-title">{t.title}</div>
                        {t.desc && <div className="k-card-desc">{t.desc.slice(0, 90)}</div>}
                        {!!t.subtasks?.length && <div className="settings-note" style={{ marginTop: 8 }}>{progress}% terminé · {t.subtasks.filter((item) => item.done).length}/{t.subtasks.length} sous-tâches</div>}
                        {!!t.members?.length && <div className="settings-note">{t.members.length} membre{t.members.length > 1 ? "s" : ""} · rôle courant {role === "editor" ? "Editor" : "Viewer"}</div>}
                        {!!Object.keys(t.reactions || {}).length && <div className="settings-note">{Object.values(t.reactions).join(" ")}</div>}
                        {renderLinksInline(t.links)}
                        <div className="k-card-ft">
                          <div className="prio" style={{ background: { none: "var(--muted)", low: "var(--green)", med: "var(--orange)", high: "var(--red)" }[t.prio] || "var(--muted)" }} />
                          {t.due && <span className={`k-due ${t.due < todayStr() && ci !== 3 ? "over" : ""}`}>{fmtDate(t.due)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="k-add" onClick={() => setModal("task")}>+ Tâche</div>
              </div>
            );
          })}
        </div>

        {selectedTask && (
          <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setSelectedTaskId(null); }}>
            <div className="task-modal" role="dialog" aria-modal="true" aria-label={selectedTask.title || "Carte projet"}>
              <div className="task-modal-head">
                <div>
                  <div className="surface-title">{selectedTask.title || "Carte"}</div>
                  <div className="surface-sub">Rôle {selectedTaskRole === "editor" ? "Editor" : "Viewer"} · {selectedTaskProgress}% terminé</div>
                </div>
                <div className="task-modal-actions">
                  {selectedTaskRole === "editor" && (
                    <button className="btn btn-g btn-sm" onClick={() => {
                      const now = new Date().toISOString();
                      updateDb((draft) => {
                        const task = draft.tasks.find((item) => item.id === selectedTask.id);
                        if (!task) return;
                        draft.taskTemplates = [
                          {
                            id: uid(),
                            title: task.title,
                            desc: task.desc || "",
                            prio: task.prio || "none",
                            dueOffsetDays: 0,
                            subtasks: (task.subtasks || []).map((subtask) => ({ id: uid(), title: subtask.title })),
                            members: task.members || [buildTaskMember(user, "editor")],
                            createdAt: now,
                            updatedAt: now,
                          },
                          ...(Array.isArray(draft.taskTemplates) ? draft.taskTemplates : []),
                        ];
                        addActivityEntry(draft, { type: "task", title: "Template créé depuis une carte", detail: task.title || "Tâche" });
                      });
                      toast("Template créé");
                    }}>Sauver en template</button>
                  )}
                  <button className="btn btn-g btn-sm" onClick={() => setSelectedTaskId(null)}>{I.x} Fermer</button>
                </div>
              </div>

              <div className="task-modal-grid">
                <div className="task-modal-main">
                  <div className="task-modal-stack">
                    <div className="settings-card">
                      <div className="task-modal-meta">
                        <div className="field">
                          <label>Titre</label>
                          <input
                            className="finput"
                            value={selectedTask.title || ""}
                            disabled={selectedTaskRole !== "editor"}
                            onChange={(event) => updateDb((draft) => {
                              const task = draft.tasks.find((item) => item.id === selectedTask.id);
                              if (!task) return;
                              task.title = event.target.value;
                              task.updatedAt = new Date().toISOString();
                            })}
                          />
                        </div>
                        <div className="field">
                          <label>Colonne</label>
                          <select
                            className="finput"
                            value={columnFromTaskStatus(selectedTask.status, selectedTask.colIdx)}
                            disabled={selectedTaskRole !== "editor"}
                            onChange={(event) => updateDb((draft) => {
                              const task = draft.tasks.find((item) => item.id === selectedTask.id);
                              if (!task) return;
                              const next = Number(event.target.value) || 0;
                              task.colIdx = next;
                              task.status = normalizeTaskStatusFromColumn(next);
                              task.updatedAt = new Date().toISOString();
                            })}
                          >
                            {COLS.map((columnLabel, index) => <option key={columnLabel} value={index}>{columnLabel}</option>)}
                          </select>
                        </div>
                        <div className="field">
                          <label>Priorité</label>
                          <select
                            className="finput"
                            value={selectedTask.prio || "none"}
                            disabled={selectedTaskRole !== "editor"}
                            onChange={(event) => updateDb((draft) => {
                              const task = draft.tasks.find((item) => item.id === selectedTask.id);
                              if (!task) return;
                              task.prio = event.target.value;
                              task.updatedAt = new Date().toISOString();
                            })}
                          >
                            <option value="none">Aucune</option>
                            <option value="low">Basse</option>
                            <option value="med">Moyenne</option>
                            <option value="high">Haute</option>
                          </select>
                        </div>
                      </div>
                      <div className="field">
                        <label>Description</label>
                        <textarea
                          className="finput"
                          style={{ minHeight: 120, resize: "vertical" }}
                          placeholder="Ajouter une description..."
                          value={selectedTask.desc || ""}
                          disabled={selectedTaskRole !== "editor"}
                          onChange={(event) => updateDb((draft) => {
                            const task = draft.tasks.find((item) => item.id === selectedTask.id);
                            if (!task) return;
                            task.desc = event.target.value;
                            task.updatedAt = new Date().toISOString();
                          })}
                        />
                      </div>
                      <div className="field">
                        <label>Date limite</label>
                        <input
                          className="finput"
                          type="date"
                          value={selectedTask.due || ""}
                          disabled={selectedTaskRole !== "editor"}
                          onChange={(event) => updateDb((draft) => {
                            const task = draft.tasks.find((item) => item.id === selectedTask.id);
                            if (!task) return;
                            task.due = event.target.value;
                            task.updatedAt = new Date().toISOString();
                          })}
                        />
                      </div>
                    </div>

                    <div className="settings-card">
                      <h3>Checklist</h3>
                      <div className="list-rows">
                        {(selectedTask.subtasks || []).map((subtask) => (
                          <label key={subtask.id} className="list-row" style={{ cursor: selectedTaskRole === "editor" ? "pointer" : "default" }}>
                            <div className="list-main">
                              <input
                                type="checkbox"
                                checked={Boolean(subtask.done)}
                                disabled={selectedTaskRole !== "editor"}
                                onChange={() => {
                                  updateDb((draft) => {
                                    const task = draft.tasks.find((item) => item.id === selectedTask.id);
                                    const current = task?.subtasks?.find((item) => item.id === subtask.id);
                                    if (!task || !current) return;
                                    current.done = !current.done;
                                    current.doneAt = current.done ? new Date().toISOString() : "";
                                    task.updatedAt = new Date().toISOString();
                                  });
                                }}
                              />
                              <div className="list-copy">
                                <strong>{subtask.title}</strong>
                                <span>{subtask.done ? `Terminée ${fmtRel(subtask.doneAt)}` : "En attente"}</span>
                              </div>
                            </div>
                          </label>
                        ))}
                        {!selectedTask.subtasks?.length && <div className="muted-box">Aucun élément</div>}
                      </div>
                      {selectedTaskRole === "editor" && (
                        <>
                          <input className="finput" placeholder="Ajouter un élément" value={taskSubtaskDraft} onChange={(e) => setTaskSubtaskDraft(e.target.value)} />
                          <div className="settings-actions">
                            <button className="btn btn-p btn-sm" onClick={() => {
                              const value = taskSubtaskDraft.trim();
                              if (!value) return;
                              updateDb((draft) => {
                                const task = draft.tasks.find((item) => item.id === selectedTask.id);
                                if (!task) return;
                                task.subtasks = [
                                  ...(Array.isArray(task.subtasks) ? task.subtasks : []),
                                  { id: uid(), title: value, done: false, createdAt: new Date().toISOString(), doneAt: "" },
                                ];
                                task.updatedAt = new Date().toISOString();
                              });
                              setTaskSubtaskDraft("");
                            }}>Ajouter</button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="settings-card">
                      <h3>Membres et réactions</h3>
                      <div className="choice-row" style={{ flexWrap: "wrap", marginBottom: 10 }}>
                        {["👍", "🔥", "🚀", "👀", "✅"].map((emoji) => (
                          <button key={emoji} type="button" className="btn btn-g btn-sm" onClick={() => {
                            updateDb((draft) => {
                              const task = draft.tasks.find((item) => item.id === selectedTask.id);
                              if (!task) return;
                              task.reactions = { ...(task.reactions || {}) };
                              if (task.reactions[user.uid] === emoji) delete task.reactions[user.uid];
                              else task.reactions[user.uid] = emoji;
                              task.updatedAt = new Date().toISOString();
                            });
                          }}>{emoji}</button>
                        ))}
                      </div>
                      {!!Object.keys(selectedTask.reactions || {}).length && <div className="task-modal-quiet">{Object.values(selectedTask.reactions).join(" ")}</div>}
                      <div className="list-rows" style={{ marginTop: 12 }}>
                        {(selectedTask.members || []).map((member) => (
                          <div key={member.uid} className="list-row">
                            <div className="list-main">
                              <div className="list-copy">
                                <strong>{member.name}</strong>
                                <span>{member.email || member.username || member.uid}</span>
                              </div>
                            </div>
                            {selectedTaskRole === "editor" ? (
                              <select
                                className="finput"
                                style={{ width: 110 }}
                                value={member.role || "viewer"}
                                onChange={(e) => {
                                  const nextRole = e.target.value;
                                  updateDb((draft) => {
                                    const task = draft.tasks.find((item) => item.id === selectedTask.id);
                                    const target = task?.members?.find((item) => item.uid === member.uid);
                                    if (!task || !target) return;
                                    target.role = nextRole;
                                    task.updatedAt = new Date().toISOString();
                                  });
                                }}
                              >
                                {roleChoices.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
                              </select>
                            ) : <span className="pill">{member.role || "viewer"}</span>}
                          </div>
                        ))}
                      </div>
                      {selectedTaskRole === "editor" && !!availableMembers.length && (
                        <div className="task-modal-actions" style={{ marginTop: 12 }}>
                          {availableMembers.slice(0, 4).map((member) => (
                            <button
                              key={member.uid}
                              type="button"
                              className="btn btn-g btn-sm"
                              onClick={() => {
                                updateDb((draft) => {
                                  const task = draft.tasks.find((item) => item.id === selectedTask.id);
                                  if (!task) return;
                                  task.members = [
                                    ...(Array.isArray(task.members) ? task.members : []),
                                    { uid: member.uid, name: member.name, email: member.email, username: member.username, role: "viewer" },
                                  ];
                                  task.updatedAt = new Date().toISOString();
                                });
                              }}
                            >
                              + {member.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="task-modal-side">
                  <div className="settings-card" style={{ minHeight: "100%" }}>
                    <div className="surface-head">
                      <div>
                        <div className="surface-title">Commentaires et activité</div>
                      </div>
                    </div>
                    <div className="list-rows">
                      {(selectedTask.comments || []).map((comment) => (
                        <div key={comment.id} className="list-row" style={{ alignItems: "flex-start" }}>
                          <div className="list-main" style={{ alignItems: "flex-start" }}>
                            <div className="list-copy">
                              <strong>{comment.author?.name || "Utilisateur"}</strong>
                              <span>{fmtRel(comment.createdAt)}</span>
                              <span style={{ color: "var(--text)" }}>{comment.body}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {!selectedTask.comments?.length && <div className="muted-box">Aucun commentaire</div>}
                    </div>
                    <textarea className="finput" placeholder={selectedTaskRole === "editor" ? "Écrire un commentaire..." : "Lecture seule"} disabled={selectedTaskRole !== "editor"} value={taskCommentDraft} onChange={(e) => setTaskCommentDraft(e.target.value)} />
                    {selectedTaskRole === "editor" && (
                      <div className="settings-actions">
                        <button className="btn btn-p btn-sm" onClick={() => {
                          const value = taskCommentDraft.trim();
                          if (!value) return;
                          updateDb((draft) => {
                            const task = draft.tasks.find((item) => item.id === selectedTask.id);
                            if (!task) return;
                            task.comments = [
                              ...(Array.isArray(task.comments) ? task.comments : []),
                              {
                                id: uid(),
                                body: value,
                                createdAt: new Date().toISOString(),
                                author: {
                                  uid: user?.uid || "",
                                  name: db.profile?.name || user?.name || "Utilisateur",
                                  email: user?.email || "",
                                  username: db.profile?.username || "",
                                },
                              },
                            ];
                            task.updatedAt = new Date().toISOString();
                          });
                          setTaskCommentDraft("");
                        }}>Commenter</button>
                        <button className="btn btn-d btn-sm" onClick={() => {
                          void requestConfirm({
                            title: "Supprimer cette tâche ?",
                            detail: selectedTask.title || "Cette tâche sera supprimée définitivement.",
                            confirmLabel: "Supprimer",
                            tone: "danger",
                          }).then((ok) => {
                            if (!ok) return;
                            updateDb((draft) => {
                              draft.tasks = draft.tasks.filter((item) => item.id !== selectedTask.id);
                              addActivityEntry(draft, { type: "task", title: "Tâche supprimée", detail: selectedTask.title || "Tâche" });
                            });
                            setSelectedTaskId(null);
                            toast("Tâche supprimée", "info");
                          });
                        }}>Supprimer</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // ── Calendar ──
  const MNAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const ViewCalendar = () => {
    const today = new Date();
    const cells = buildCalendarCells(calYear, calMonth, db.events);
    const activeDate = selectedCalendarDate || todayStr();
    const activeEvents = sortEventsByDateTime(db.events.filter((event) => event.date === activeDate));
    const renderAttendeeSummary = (event) => !!event.attendees?.length && (
      <div className="event-attendee-list">
        {event.attendees.map((attendee) => (
          <span
            key={`${event.id}-${attendee.uid}`}
            className="event-attendee-pill"
            style={{ borderColor: getEventStatusTone(attendee.status), color: getEventStatusTone(attendee.status) }}
          >
            {attendee.name} · {getEventStatusLabel(attendee.status)}
          </span>
        ))}
      </div>
    );
    const renderEventActions = (event) => {
      const eventId = getEventId(event);
      const ownsEvent = !event?.createdBy || event.createdBy === user?.uid;
      const currentStatus = event?.attendees?.find((attendee) => attendee.uid === user?.uid)?.status || (ownsEvent ? "confirmed" : "pending");

      if (ownsEvent) {
        return (
          <div className="event-action-row">
            <button type="button" className="btn btn-g btn-sm" onClick={(actionEvent) => { actionEvent.stopPropagation(); openEventModal(event); }}>
              Modifier
            </button>
            <button
              type="button"
              className="btn btn-d btn-sm"
              disabled={eventActionId === `${eventId}:delete`}
              onClick={(actionEvent) => {
                actionEvent.stopPropagation();
                void deleteSharedEvent(event);
              }}
            >
              {eventActionId === `${eventId}:delete` ? "Suppression…" : "Supprimer"}
            </button>
          </div>
        );
      }

      return (
        <div className="event-action-row">
          {[
            { key: "confirmed", label: "Accepter" },
            { key: "maybe", label: "Peut-être" },
            { key: "declined", label: "Refuser" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              className={`btn btn-sm ${currentStatus === option.key ? "btn-p" : "btn-g"}`}
              disabled={eventActionId === `${eventId}:${option.key}`}
              onClick={(actionEvent) => {
                actionEvent.stopPropagation();
                void respondToEventInvite(event, option.key);
              }}
            >
              {eventActionId === `${eventId}:${option.key}` ? "..." : option.label}
            </button>
          ))}
        </div>
      );
    };

    if (calendarDayOpen) {
      return (
        <div className="calendar-day-shell">
          <div className="surface">
            <div className="calendar-day-head">
              <div>
                <div className="surface-title">Jour du {fmtDate(activeDate)}</div>
                <div className="surface-sub">La journée s’ouvre ici en plein écran, avec tous ses créneaux.</div>
              </div>
              <div className="calendar-day-actions">
                <button className="btn btn-g btn-sm" onClick={() => setCalendarDayOpen(false)}>Retour au mois</button>
              </div>
            </div>
            <div className="calendar-schedule">
              {TIME_OPTIONS.map((hour) => {
                const slotEvents = activeEvents.filter((event) => {
                  const start = toTimeNumber(event.time || "00:00");
                  const end = toTimeNumber(event.endTime || addMinutesToTime(event.time || "00:00", 60));
                  const slot = toTimeNumber(hour);
                  return slot >= start && slot < end;
                });
                return (
                  <div key={hour} className="day-slot">
                    <div className="day-slot-hour">{hour}</div>
                    {slotEvents.length ? (
                      <div className="day-slot-body has-events">
                        {slotEvents.map((event) => (
                          <div key={event.id} className="day-event-card" style={{ borderColor: event.color || "var(--accent-b)" }}>
                            <strong>{event.title}</strong>
                            <span>{formatEventWindow(event)}</span>
                            {event.desc ? <span>{event.desc}</span> : null}
                            {renderAttendeeSummary(event)}
                            {renderEventActions(event)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button type="button" className="day-slot-body" onClick={() => openEventModal({ date: activeDate, time: hour, endTime: addMinutesToTime(hour, 60) })}>
                        <span className="day-slot-empty">Créer un événement à {hour}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (<>
      <div className="calendar-topbar">
        <div className="calendar-month-nav">
          <button className="btn btn-g btn-sm" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>‹</button>
          <span style={{ fontFamily: "var(--serif)", fontSize: 18, minWidth: 160, textAlign: "center" }}>{MNAMES[calMonth]} {calYear}</span>
          <button className="btn btn-g btn-sm" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>›</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-g btn-sm" onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); selectCalendarDate(todayStr(), { openDay: false }); }}>Aujourd'hui</button>
        </div>
      </div>
      <div className="calendar-layout">
        <div className="surface calendar-main-surface">
          <div>
            <div className="surface-title">Vue mensuelle</div>
            <div className="surface-sub">{activeDate ? fmtDate(activeDate) : "Calendrier"}</div>
          </div>
          <div className="cal-grid">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => <div key={day} className="cal-wd">{day}</div>)}
            {cells.map((cell, index) => (
              <button
                key={index}
                type="button"
                className={`cal-cell ${cell.other ? "oth" : ""} ${cell.today ? "today" : ""} ${cell.ds && calendarDayOpen && cell.ds === activeDate ? "selected" : ""}`}
                onClick={() => cell.ds && selectCalendarDate(cell.ds, { openDay: true })}
              >
                <div className="cal-dn">{cell.num}</div>
                {cell.events?.slice(0, 2).map((event) => <div key={event.id} className="cal-ev" style={{ background: event.color }}>{event.title}</div>)}
                {!!cell.events?.length && <div className="cal-dot-row">{cell.events.slice(0, 4).map((event) => <span key={`${cell.ds}-${event.id}`} className="cal-dot" style={{ background: event.color || "var(--accent)" }} />)}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>);
  };

  // ── Habits ──
  const ViewHabits = () => {
    const weekDates = getWeekDatesFrom();
    const previousWeekDates = getWeekDatesFrom(new Date(Date.now() - 7 * 86400000));
    const monday = new Date(`${weekDates[0]}T12:00:00`);
    const sunday = new Date(`${weekDates[6]}T12:00:00`);
    const scheduledSlots = db.habits.reduce((total, habit) => total + weekDates.filter((date) => isHabitScheduledForDate(habit, date)).length, 0);
    const doneSlots = db.habits.reduce((total, habit) => total + weekDates.filter((date) => isHabitScheduledForDate(habit, date) && isHabitDoneForDate(habit, date)).length, 0);
    const lastWeekDone = db.habits.reduce((total, habit) => total + previousWeekDates.filter((date) => isHabitScheduledForDate(habit, date) && isHabitDoneForDate(habit, date)).length, 0);
    const rate = scheduledSlots ? Math.round((doneSlots / scheduledSlots) * 100) : 0;
    const todayDone = db.habits.filter((habit) => isHabitScheduledForDate(habit, todayStr()) && isHabitDoneForDate(habit, todayStr())).length;

    return (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div><div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Habitudes</div><div style={{ fontSize: 12, color: "var(--sub)" }}>Semaine du {monday.getDate()}/{monday.getMonth() + 1} – {sunday.getDate()}/{sunday.getMonth() + 1}</div></div>
        {db.habits.length > 0 && <button className="btn btn-p" onClick={() => openHabitModal()}>{I.plus} Habitude</button>}
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
        <div className="stat"><div className="stat-label">Taux semaine</div><div className="stat-val">{rate}%</div></div>
        <div className="stat"><div className="stat-label">Aujourd'hui</div><div className="stat-val">{todayDone}/{db.habits.length}</div></div>
        <div className="stat"><div className="stat-label">Total</div><div className="stat-val">{db.habits.length}</div></div>
      </div>
      <div className="habit-week-summary">Semaine dernière: {lastWeekDone} validation{lastWeekDone > 1 ? "s" : ""}</div>
      {db.habits.map(h => {
        const streak = computeHabitStreak(h);
        const targetMinutes = getHabitTargetMinutes(h);
        return (<div key={h.id} className="habit-row">
          <button type="button" className="habit-main" onClick={() => openHabitModal(h)}>
            <div className="habit-icon">{h.icon || "⭐"}</div>
            <div className="habit-info">
              <div className="habit-nm">{h.name}</div>
              <div className="habit-meta">{targetMinutes} min par session · {streak} jour{streak > 1 ? "s" : ""} de suite{h.desc ? ` · ${h.desc}` : ""}</div>
            </div>
          </button>
          <div className="habit-days">{weekDates.map((date) => {
            const weekday = WEEKDAY_OPTIONS[getWeekdayIndex(date)];
            const scheduled = isHabitScheduledForDate(h, date);
            const done = isHabitDoneForDate(h, date);
            const minutes = getHabitMinutesForDate(h, date);
            return (
              <button
                key={date}
                type="button"
                className={`hday ${done ? "done" : ""} ${scheduled ? "" : "off"}`}
                title={scheduled ? `${weekday.label} · ${minutes}/${targetMinutes} min` : `${weekday.label} non prévu`}
                onClick={() => {
                  if (!scheduled) return toast("Jour non prévu pour cette habitude", "info");
                  updateDb((draftDb) => {
                    const habit = draftDb.habits.find((item) => item.id === h.id);
                    if (!habit) return;
                    const currentMinutes = getHabitMinutesForDate(habit, date);
                    const nextMinutes = currentMinutes >= getHabitTargetMinutes(habit) ? 0 : getHabitTargetMinutes(habit);
                    habit.entries = { ...(habit.entries || {}) };
                    habit.done = { ...(habit.done || {}) };
                    if (nextMinutes > 0) {
                      habit.entries[date] = nextMinutes;
                      habit.done[date] = true;
                    } else {
                      delete habit.entries[date];
                      delete habit.done[date];
                    }
                    habit.updatedAt = new Date().toISOString();
                  });
                }}
              >
                <span>{weekday.short}</span>
                <small>{minutes > 0 ? minutes : "·"}</small>
              </button>
            );
          })}</div>
          <div className="habit-actions">
            <button className="btn btn-g btn-sm" onClick={() => openHabitLogModal(h)}>Ajouter manuellement</button>
            <button className="btn btn-g btn-sm" onClick={() => openHabitModal(h)}>Modifier</button>
            <button className="btn btn-d btn-sm" onClick={() => {
              void requestConfirm({
                title: "Supprimer cette habitude ?",
                detail: h.name || "Cette habitude sera retirée de votre suivi.",
                confirmLabel: "Supprimer",
                tone: "danger",
              }).then((ok) => {
                if (!ok) return;
                updateDb((draftDb) => {
                  draftDb.habits = draftDb.habits.filter((item) => item.id !== h.id);
                  addActivityEntry(draftDb, { type: "habit", title: "Habitude supprimée", detail: h.name });
                });
                toast("Habitude supprimée", "info");
              });
            }}>Supprimer</button>
          </div>
          <div className="habit-streak">{streak}<small>jours</small></div>
        </div>);
      })}
      {!db.habits.length && <div className="empty"><p>Aucune habitude</p><button className="btn btn-p" onClick={() => openHabitModal()}>Créer une habitude</button></div>}
    </>);
  };

  const ViewJournal = () => {
    const entries = [...db.journal].sort((a, b) => `${b.date || b.updatedAt || b.createdAt || ""}`.localeCompare(`${a.date || a.updatedAt || a.createdAt || ""}`));
    const currentEntry = editJournal ? db.journal.find((entry) => entry.id === editJournal) : null;
    const moodOptions = ["😄", "🙂", "😐", "😓", "😴"];

    if (editJournal) {
      if (!currentEntry) {
        return (
          <div className="empty">
            <p>Cette entrée n’existe plus.</p>
            <button className="btn btn-p" onClick={() => setEditJournal(null)}>Retour au journal</button>
          </div>
        );
      }

      return (
        <div className="note-shell">
          <div className="note-header-row">
            <div>
              <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Journal</h2>
              <div className="surface-sub">Capture rapide, gratitude et ressenti du jour.</div>
            </div>
            <button className="btn btn-g" onClick={() => setEditJournal(null)}>Retour</button>
          </div>
          <div className="surface" style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ModalField
                label="Date"
                id="j-date"
                type="date"
                value={currentEntry.date || todayStr()}
                onChange={(event) => updateDb((draft) => {
                  const entry = draft.journal.find((item) => item.id === currentEntry.id);
                  if (!entry) return;
                  entry.date = event.target.value || todayStr();
                  entry.updatedAt = new Date().toISOString();
                })}
              />
            </div>
            <div className="field">
              <label>Humeur</label>
              <div className="choice-row">
                {moodOptions.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    className={`choice-pill ${currentEntry.mood === mood ? "on" : ""}`}
                    onClick={() => updateDb((draft) => {
                      const entry = draft.journal.find((item) => item.id === currentEntry.id);
                      if (!entry) return;
                      entry.mood = mood;
                      entry.updatedAt = new Date().toISOString();
                    })}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>
            <ModalField
              label="Gratitude"
              id="j-gratitude"
              as="textarea"
              placeholder="Ce qui a compté aujourd'hui…"
              value={currentEntry.gratitude || ""}
              onChange={(event) => updateDb((draft) => {
                const entry = draft.journal.find((item) => item.id === currentEntry.id);
                if (!entry) return;
                entry.gratitude = event.target.value;
                entry.updatedAt = new Date().toISOString();
              })}
            />
            <ModalField
              label="Entrée"
              id="j-text"
              as="textarea"
              placeholder="Raconte ta journée, une idée, un ressenti…"
              value={currentEntry.text || ""}
              onChange={(event) => updateDb((draft) => {
                const entry = draft.journal.find((item) => item.id === currentEntry.id);
                if (!entry) return;
                entry.text = event.target.value;
                entry.updatedAt = new Date().toISOString();
              })}
            />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <span className="surface-sub">Sauvegarde automatique active sur chaque modification.</span>
              <button className="btn btn-d" onClick={() => {
                void requestConfirm({
                  title: "Supprimer cette entrée ?",
                  detail: currentEntry.text?.slice(0, 120) || "Cette entrée sera supprimée définitivement.",
                  confirmLabel: "Supprimer",
                  tone: "danger",
                }).then((ok) => {
                  if (!ok) return;
                  updateDb((draft) => {
                    draft.journal = draft.journal.filter((item) => item.id !== currentEntry.id);
                    addActivityEntry(draft, { type: "journal", title: "Entrée supprimée", detail: currentEntry.date || todayStr() });
                  });
                  setEditJournal(null);
                  toast("Entrée supprimée", "info");
                });
              }}>Supprimer</button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Journal</h2>
            <div className="surface-sub">Un historique simple, lisible et éditable de tes journées.</div>
          </div>
          <button className="btn btn-p" onClick={() => {
            const nextId = uid();
            updateDb((draft) => {
              draft.journal.unshift({
                id: nextId,
                date: todayStr(),
                mood: "🙂",
                gratitude: "",
                text: "",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              addActivityEntry(draft, { type: "journal", title: "Entrée de journal créée", detail: todayStr() });
            });
            setEditJournal(nextId);
          }}>{I.plus} Entrée</button>
        </div>
        {entries.length ? (
          entries.map((entry) => (
            <button key={entry.id} type="button" className="journal-entry" style={{ width: "100%", textAlign: "left" }} onClick={() => setEditJournal(entry.id)}>
              <div className="journal-date"><span className="journal-mood">{entry.mood || "🙂"}</span>{fmtDate(entry.date || entry.createdAt)}</div>
              <div className="journal-text">{entry.text || entry.gratitude || "Entrée vide…"}</div>
            </button>
          ))
        ) : (
          <div className="empty"><p>Aucune entrée</p><button className="btn btn-p" onClick={() => {
            const nextId = uid();
            updateDb((draft) => {
              draft.journal.unshift({ id: nextId, date: todayStr(), mood: "🙂", gratitude: "", text: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
              addActivityEntry(draft, { type: "journal", title: "Entrée de journal créée", detail: todayStr() });
            });
            setEditJournal(nextId);
          }}>Écrire aujourd'hui</button></div>
        )}
      </>
    );
  };

  const ViewFinance = () => {
    const items = [...db.transactions].sort((a, b) => `${b.date || b.createdAt || ""}`.localeCompare(`${a.date || a.createdAt || ""}`));
    const income = items.filter((item) => item.type === "income").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const expenses = items.filter((item) => item.type !== "income").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const balance = income - expenses;

    const deleteTransaction = async (transaction) => {
      const ok = await requestConfirm({
        title: "Supprimer cette transaction ?",
        detail: transaction.description || "Cette transaction sera retirée des finances.",
        confirmLabel: "Supprimer",
        tone: "danger",
      });
      if (!ok) return;
      updateDb((draft) => {
        draft.transactions = draft.transactions.filter((item) => item.id !== transaction.id);
        addActivityEntry(draft, { type: "finance", title: "Transaction supprimée", detail: transaction.description || "Transaction" });
      });
      toast("Transaction supprimée", "info");
    };

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Finances</h2>
            <div className="surface-sub">Vision nette du solde, des revenus et des dépenses.</div>
          </div>
          <button className="btn btn-p" onClick={() => openTransactionModal()}>{I.plus} Transaction</button>
        </div>
        <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
          <div className="stat"><div className="stat-label">Revenus</div><div className="stat-val">{fmtMoney(income)}</div></div>
          <div className="stat"><div className="stat-label">Dépenses</div><div className="stat-val">{fmtMoney(expenses)}</div></div>
          <div className="stat"><div className="stat-label">Solde</div><div className="stat-val">{fmtMoney(balance)}</div></div>
        </div>
        {items.length ? (
          <div className="surface">
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Catégorie</th>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.description}</td>
                    <td>{transaction.category || "—"}</td>
                    <td>{fmtDate(transaction.date)}</td>
                    <td className="tx-amt" style={{ color: transaction.type === "income" ? "#4a9e6e" : "var(--text)" }}>
                      {transaction.type === "income" ? "+" : "-"}{fmtMoney(transaction.amount)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-g btn-sm" onClick={() => openTransactionModal(transaction)}>Modifier</button>
                        <button className="btn btn-d btn-sm" onClick={() => void deleteTransaction(transaction)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><p>Aucune transaction</p><button className="btn btn-p" onClick={() => openTransactionModal()}>Ajouter une transaction</button></div>
        )}
      </>
    );
  };

  // ── Focus ──
  const ViewFocus = () => {
    const m = String(Math.floor(focusState.sec / 60)).padStart(2, "0");
    const s = String(focusState.sec % 60).padStart(2, "0");
    const pct = focusState.total > 0 ? (focusState.sec / focusState.total) * 100 : 100;
    const labels = { focus: "FOCUS", short: "PAUSE COURTE", long: "PAUSE LONGUE" };
    return (
      <div className="focus-center">
        <div className="focus-modes">
          {[{ k: "focus", l: `Focus ${db.settings?.focusDur || 25}` }, { k: "short", l: `Pause ${db.settings?.shortBreak || 5}` }, { k: "long", l: `Pause ${db.settings?.longBreak || 15}` }].map(fm => (
            <div key={fm.k} className={`focus-mode ${focusState.mode === fm.k ? "on" : ""}`} onClick={() => { if (!focusState.running) { const dur = fm.k === "focus" ? (db.settings?.focusDur || 25) : fm.k === "short" ? (db.settings?.shortBreak || 5) : (db.settings?.longBreak || 15); setFocusState({ running: false, mode: fm.k, sec: dur * 60, total: dur * 60 }); } }}>{fm.l}</div>
          ))}
        </div>
        <div className={`focus-display ${focusState.running ? "running" : ""}`}>{m}:{s}</div>
        <div className="focus-lbl">{labels[focusState.mode]}{focusState.running ? " — EN COURS" : ""}</div>
        <div className="focus-prog"><div className="focus-prog-bar" style={{ width: `${pct}%` }} /></div>
        <div className="focus-ctrls">
          <button className="focus-btn-sec" onClick={resetFocus}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6" /><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" /></svg></button>
          <button className="focus-btn-main" onClick={toggleFocus}>{focusState.running ? I.pause : I.play}</button>
          <button className="focus-btn-sec" onClick={() => { clearInterval(focusRef.current); const dur = db.settings?.focusDur || 25; setFocusState(p => p.mode === "focus" ? { running: false, mode: "short", sec: (db.settings?.shortBreak || 5) * 60, total: (db.settings?.shortBreak || 5) * 60 } : { running: false, mode: "focus", sec: dur * 60, total: dur * 60 }); }}>{I.chev}</button>
        </div>
      </div>
    );
  };

  const focusHeaderProgress = focusState.total > 0 ? Math.max(0, Math.min(100, (focusState.sec / focusState.total) * 100)) : 0;
  const focusHeaderLabel = { focus: "Focus", short: "Pause courte", long: "Pause longue" }[focusState.mode] || "Focus";

  // ── Goals ──
  const ViewGoals = () => {
    const items = [...db.goals].sort((a, b) => `${a.deadline || "9999-12-31"}`.localeCompare(`${b.deadline || "9999-12-31"}`));

    const changeGoalProgress = (goalId, delta) => {
      updateDb((draft) => {
        const goal = draft.goals.find((item) => item.id === goalId);
        if (!goal) return;
        goal.progress = Math.max(0, Math.min(100, Number(goal.progress || 0) + delta));
        addActivityEntry(draft, {
          type: "goal",
          title: delta > 0 ? "Objectif avancé" : "Objectif ajusté",
          detail: `${goal.title || "Objectif"} · ${goal.progress}%`,
        });
      });
    };

    const deleteGoal = async (goal) => {
      if (!goal?.id) return;
      const ok = await requestConfirm({
        title: "Supprimer cet objectif ?",
        detail: goal.title || "Cet objectif sera retiré du suivi.",
        confirmLabel: "Supprimer",
        tone: "danger",
      });
      if (!ok) return;
      updateDb((draft) => {
        draft.goals = draft.goals.filter((item) => item.id !== goal.id);
        addActivityEntry(draft, { type: "goal", title: "Objectif supprimé", detail: goal.title || "Objectif" });
      });
      toast("Objectif supprimé", "info");
    };

    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Objectifs</h2>
            <div className="surface-sub">Progression visible, ajustements rapides et suppression propre.</div>
          </div>
          <button className="btn btn-p" onClick={() => setModal("goal")}>{I.plus} Objectif</button>
        </div>
        {items.length ? (
          <div className="list-rows">
            {items.map((goal) => (
              <div key={goal.id} className="goal-card" style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <div>
                    <div className="goal-title">{goal.title}</div>
                    <div className="surface-sub">{goal.deadline ? `Échéance ${fmtDate(goal.deadline)}` : "Sans deadline"}</div>
                  </div>
                  <span className="pill">{goal.progress || 0}%</span>
                </div>
                <div className="goal-bar"><div className="goal-fill" style={{ width: `${goal.progress || 0}%` }} /></div>
                <div className="goal-meta"><span>{goal.progress || 0}% complété</span><span>{(goal.progress || 0) >= 100 ? "Terminé" : "En cours"}</span></div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-g btn-sm" onClick={() => changeGoalProgress(goal.id, -10)} disabled={(goal.progress || 0) <= 0}>-10%</button>
                  <button className="btn btn-g btn-sm" onClick={() => changeGoalProgress(goal.id, 10)} disabled={(goal.progress || 0) >= 100}>+10%</button>
                  <button className="btn btn-d btn-sm" onClick={() => void deleteGoal(goal)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty"><p>Aucun objectif</p><button className="btn btn-p" onClick={() => setModal("goal")}>Créer un objectif</button></div>
        )}
      </>
    );
  };

  // ── Bookmarks ──
  const ViewBookmarks = () => {
    const items = [...db.bookmarks].sort((a, b) => `${b.createdAt || ""}`.localeCompare(`${a.createdAt || ""}`));
    return (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Signets</h2>
          <div className="surface-sub">Liens, images, inspirations et notes visuelles dans une seule grille plus riche.</div>
        </div>
        <button className="btn btn-p" onClick={() => openBookmarkModal()}>{I.plus} Signet</button>
      </div>
      {items.length ? (
        <div className="bm-grid rich">{items.map((bookmark) => {
          const cover = getBookmarkCover(bookmark);
          const summary = getBookmarkSummary(bookmark);
          const source = getBookmarkSourceLabel(bookmark);
          return (
            <div key={bookmark.id} className="bm-card">
              <div className="bm-card-cover">
                {cover ? <img src={cover} alt="" /> : <div className="bm-card-fallback">{bookmark.icon || "🔖"}</div>}
                <div className="bm-card-overlay">
                  <span className="pill">{bookmark.type === "text" ? "Texte" : bookmark.type === "image" ? "Image" : source}</span>
                </div>
              </div>
              <div className="bm-card-body">
                <div className="bm-card-head">
                  <div className="bm-fav">{bookmark.icon || "🔖"}</div>
                  <div className="bm-info">
                    <h4>{bookmark.title}</h4>
                    <p>{source}</p>
                  </div>
                </div>
                <div className="bm-card-text">{summary || "Aperçu bientôt disponible."}</div>
                {bookmark.type === "text" && bookmark.text && <div className="bm-card-note">{bookmark.text}</div>}
                {renderLinksInline(bookmark.links)}
                <div className="bm-card-actions">
                  {bookmark.url ? <button className="btn btn-g btn-sm" onClick={() => window.open(bookmark.url, "_blank", "noopener,noreferrer")}>Ouvrir</button> : <span className="pill">Local</span>}
                  <button className="btn btn-g btn-sm" onClick={() => openBookmarkModal(bookmark)}>Modifier</button>
                  <button className="btn btn-d btn-sm" onClick={() => deleteBookmark(bookmark)}>Supprimer</button>
                  {bookmark.note ? <span className="pill">Note liée</span> : <span className="pill">{bookmark.mediaKind || bookmark.type}</span>}
                </div>
              </div>
            </div>
          );
        })}</div>
      ) : <div className="empty"><p>Aucun signet</p><button className="btn btn-p" onClick={() => openBookmarkModal()}>Créer un signet</button></div>}
    </>);
  };

  // ── Conversations ──
  const ViewConversations = () => {
    const sendCurrentMessage = async ({
      messageType = "text",
      callMode = "",
      bodyOverride = null,
      attachmentsOverride = null,
    } = {}) => {
      const attachments = attachmentsOverride || [
        ...(attachmentDraft.url.trim()
          ? [{ id: uid(), name: attachmentDraft.name.trim() || "Pièce jointe", type: attachmentDraft.type, url: attachmentDraft.url.trim() }]
          : []),
        ...(voiceDraft.url
          ? [{
              id: uid(),
              name: `Message vocal · ${fmtDurationSeconds(voiceDraft.durationSec)}`,
              type: "voice",
              url: voiceDraft.url,
            }]
          : []),
      ];
      if (!selectedConversation?.id) return;
      try {
        await runConversationAction("send-message", {
          conversationId: selectedConversation.id,
          text: bodyOverride ?? composerText,
          messageType,
          callMode,
          attachments,
        });
        setComposerText("");
        setAttachmentDraft({ name: "", url: "", type: "file" });
        clearVoiceDraft();
        setAttachmentChooserOpen(false);
        requestAnimationFrame(() => {
          const thread = conversationThreadRef.current;
          if (thread) thread.scrollTop = thread.scrollHeight;
        });
      } catch (error) {
        toast(error.message || "Envoi impossible", "err");
      }
    };

    const launchCall = async (mode) => {
      if (!selectedConversation?.id) return;
      const roomName = `flow-${selectedConversation.id.replace(/[^a-z0-9]/gi, "").slice(0, 12)}-${Date.now()}`;
      const roomUrl = buildJitsiRoomUrl(roomName, mode);

      await sendCurrentMessage({
        messageType: "call",
        callMode: mode,
        bodyOverride: mode === "video" ? "vous appelle en vidéo" : "vous appelle en audio",
        attachmentsOverride: [{ id: uid(), name: "Rejoindre l'appel", type: mode, url: roomUrl }],
      });
      openCallRoom({ roomName, mode, title: selectedConversation.title });
    };

    const saveConversationSettings = async () => {
      if (!selectedConversation?.id || selectedConversation.type !== "group") return;
      try {
        await runConversationAction("update-group", {
          conversationId: selectedConversation.id,
          title: groupManageTitle,
          participantIds: groupManageMembers,
        });
        setConversationManageOpen(false);
        setGroupManageSearch("");
        setGroupManageMatches([]);
        toast("Groupe mis à jour");
      } catch (error) {
        toast(error.message || "Mise à jour du groupe impossible", "err");
      }
    };

    const deleteSelectedConversation = async () => {
      if (!selectedConversation?.id) return;
      const label = selectedConversation.type === "group"
        ? `Supprimer définitivement le groupe "${selectedConversation.title}" pour tous les membres ?`
        : "Supprimer définitivement cette conversation directe pour les deux participants ?";
      const ok = await requestConfirm({
        title: selectedConversation.type === "group" ? "Supprimer ce groupe ?" : "Supprimer cette conversation ?",
        detail: label,
        confirmLabel: "Supprimer",
        tone: "danger",
      });
      if (!ok) return;

      try {
        await runConversationAction("delete-conversation", { conversationId: selectedConversation.id });
        setConversationManageOpen(false);
        toast(selectedConversation.type === "group" ? "Groupe supprimé" : "Conversation supprimée", "info");
      } catch (error) {
        toast(error.message || "Suppression impossible", "err");
      }
    };

    const openAttachment = (attachment) => {
      if (!attachment?.url) return;
      if (attachment.type === "voice") {
        const link = document.createElement("a");
        link.href = attachment.url;
        link.download = attachment.name || "message-vocal.webm";
        link.click();
        return;
      }
      if (["audio", "video"].includes(attachment.type)) {
        const roomName = parseCallRoomName(attachment.url);
        if (roomName) {
          openCallRoom({ roomName, mode: attachment.type, title: selectedConversation?.title || "Appel Flow" });
          return;
        }
      }
      window.open(attachment.url, "_blank", "noopener,noreferrer");
    };

    return (
      <div className={`conv-shell ${isMobileViewport && selectedConversation ? "mobile-detail" : "mobile-list"}`}>
        <div className="conv-sidebar">
          <div className="surface-head">
            <div>
              <div className="surface-title">Conversations</div>
            </div>
          </div>

          <div className="conv-search" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="tb-icon" title="Ajouter une conversation ou un groupe" onClick={() => setNewConversationOpen((prev) => !prev)}>{I.plus}</button>
            <input className="finput" value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)} placeholder="Chercher une conversation…" />
          </div>

          {newConversationOpen && (
            <div className="surface" style={{ padding: 14, marginBottom: 12 }}>
              <div className="surface-head" style={{ marginBottom: 10 }}>
                <div>
                  <div className="surface-title" style={{ fontSize: 15 }}>Nouvelle discussion</div>
                  <div className="surface-sub">Cherchez un utilisateur pour un direct, ou préparez un groupe.</div>
                </div>
              </div>
              <input className="finput" value={newConversationSearch} onChange={(e) => setNewConversationSearch(e.target.value)} placeholder="Email, téléphone ou identifiant" style={{ marginBottom: 10 }} />
              {!!conversationMatches.length && (
                <div className="panel-list" style={{ marginBottom: 12 }}>
                  {conversationMatches.map((match) => {
                    const inGroup = groupDraftMembers.includes(match.uid);
                    return (
                      <div key={match.uid} className="panel-item">
                        <strong>{match.name}</strong>
                        <span>{match.username ? `@${match.username}` : match.email}{match.phone ? ` · ${match.phone}` : ""}</span>
                        <div className="choice-row" style={{ marginTop: 10 }}>
                          <button className="btn btn-g btn-sm" onClick={async () => {
                            await runConversationAction("create-direct", { participantId: match.uid });
                            setNewConversationSearch("");
                            setConversationMatches([]);
                            setNewConversationOpen(false);
                          }}>Message direct</button>
                          <button className={`choice-pill ${inGroup ? "on" : ""}`} onClick={() => {
                            setGroupDraftMembers((prev) => inGroup ? prev.filter((uid) => uid !== match.uid) : [...prev, match.uid]);
                          }}>{inGroup ? "Ajouté au groupe" : "Ajouter au groupe"}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <input className="finput" value={groupDraftTitle} onChange={(e) => setGroupDraftTitle(e.target.value)} placeholder="Nom du groupe" style={{ marginBottom: 10 }} />
              <div className="link-pack" style={{ marginBottom: 10 }}>
                {groupDraftMembers.map((uid) => {
                  const match = [...conversationMatches, ...contactDirectory].find((entry) => entry.uid === uid);
                  return (
                    <button key={uid} className="link-chip" onClick={() => setGroupDraftMembers((prev) => prev.filter((item) => item !== uid))}>
                      {(match?.name || uid)} ×
                    </button>
                  );
                })}
              </div>
              <button
                className="btn btn-p btn-sm"
                disabled={conversationBusy || groupDraftMembers.length < 2}
                onClick={async () => {
                  try {
                    await runConversationAction("create-group", { title: groupDraftTitle, participantIds: groupDraftMembers });
                    setGroupDraftTitle("");
                    setGroupDraftMembers([]);
                    setNewConversationSearch("");
                    setConversationMatches([]);
                    setNewConversationOpen(false);
                    toast("Groupe créé");
                  } catch (error) {
                    toast(error.message || "Création du groupe impossible", "err");
                  }
                }}
              >
                {I.plus} Créer le groupe
              </button>
            </div>
          )}

          <div className="conv-list">
            {filteredConversations.map((conversation) => (
              <button key={conversation.id} className={`conv-item ${selectedConversation?.id === conversation.id ? "on" : ""}`} onClick={() => setSelectedConversationId(conversation.id)}>
                <div className="conv-item-row">
                  <div className="conv-avatar">
                    {conversation.participants?.find((participant) => participant.uid !== user.uid)?.photoUrl
                      ? <img src={conversation.participants.find((participant) => participant.uid !== user.uid)?.photoUrl} alt="" />
                      : (conversation.title || "?")[0]?.toUpperCase()}
                  </div>
                  <div className="conv-copy">
                    <strong>{conversation.title}</strong>
                    <span>{conversation.lastMessage?.deletedAt ? "Message supprimé" : conversation.lastMessage?.body || "Aucun message"}</span>
                  </div>
                  {!!conversation.unreadCount && <span className="tb-count" style={{ position: "static" }}>{conversation.unreadCount}</span>}
                </div>
              </button>
            ))}
            {!conversations.length && <div className="muted-box">Recherchez un utilisateur pour démarrer votre première conversation.</div>}
          </div>
        </div>

        <div className="conv-main">
          {selectedConversation ? (
            <>
              <div className="conv-head">
                <div style={{ textAlign: "left", cursor: "pointer" }} onClick={() => setConversationManageOpen((prev) => !prev)}>
                  {isMobileViewport && <button className="btn btn-g btn-sm" onClick={(event) => { event.stopPropagation(); setSelectedConversationId(null); }} style={{ marginBottom: 10 }}>← Retour</button>}
                  <div className="surface-title" style={{ fontSize: 18 }}>{selectedConversation.title}</div>
                  <div className="surface-sub">{selectedConversation.participants?.map((participant) => participant.name).join(", ")}</div>
                </div>
                <div className="conv-head-actions">
                  <button className="tb-icon" onClick={() => void launchCall("audio")} title="Appel audio">{I.phone}</button>
                  <button className="tb-icon" onClick={() => void launchCall("video")} title="Appel vidéo">{I.video}</button>
                </div>
              </div>

              {conversationManageOpen && (
                <div className="surface" style={{ padding: 14, marginBottom: 12 }}>
                  <div className="surface-head" style={{ marginBottom: 10 }}>
                    <div>
                      <div className="surface-title" style={{ fontSize: 15 }}>Infos de conversation</div>
                      <div className="surface-sub">
                        Réglages, recherche interne, médias et suppression.
                      </div>
                    </div>
                  </div>
                  <div className="settings-grid" style={{ marginBottom: 12 }}>
                    <div className="field">
                      <label>Rechercher dans le chat</label>
                      <input className="finput" value={conversationInfoQuery} onChange={(e) => setConversationInfoQuery(e.target.value)} placeholder="Texte du message…" />
                    </div>
                    <div className="field">
                      <label>Raccourcis</label>
                      <div className="choice-row">
                        <button className="choice-pill on" onClick={() => updateDb((draft) => {
                          draft.settings.conversationPrefs = {
                            ...(draft.settings.conversationPrefs || {}),
                            [selectedConversation.id]: {
                              ...(draft.settings.conversationPrefs?.[selectedConversation.id] || {}),
                              muted: !(draft.settings.conversationPrefs?.[selectedConversation.id]?.muted),
                            },
                          };
                        })}>Notif {db.settings?.conversationPrefs?.[selectedConversation.id]?.muted ? "off" : "on"}</button>
                        <button className="choice-pill" onClick={() => updateDb((draft) => {
                          draft.settings.conversationPrefs = {
                            ...(draft.settings.conversationPrefs || {}),
                            [selectedConversation.id]: {
                              ...(draft.settings.conversationPrefs?.[selectedConversation.id] || {}),
                              favorite: !(draft.settings.conversationPrefs?.[selectedConversation.id]?.favorite),
                            },
                          };
                        })}>{db.settings?.conversationPrefs?.[selectedConversation.id]?.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}</button>
                      </div>
                    </div>
                  </div>
                  <div className="muted-box" style={{ marginBottom: 12 }}>
                    Médias, liens et fichiers envoyés: {selectedConversation.messages.flatMap((message) => message.attachments || []).length}
                  </div>
                  {!!selectedConversation.messages.flatMap((message) => message.attachments || []).length && (
                    <div className="link-pack" style={{ marginBottom: 12 }}>
                      {selectedConversation.messages.flatMap((message) => message.attachments || []).map((attachment) => (
                        <button key={attachment.id} type="button" className="link-chip" onClick={() => openAttachment(attachment)}>{attachment.name}</button>
                      ))}
                    </div>
                  )}

                  {selectedConversation.type === "group" ? (
                    <>
                      <div className="field" style={{ marginBottom: 10 }}>
                        <label>Nom du groupe</label>
                        <input className="finput" value={groupManageTitle} onChange={(e) => setGroupManageTitle(e.target.value)} placeholder="Nom du groupe" />
                      </div>
                      <div className="field" style={{ marginBottom: 10 }}>
                        <label>Ajouter des membres</label>
                        <input className="finput" value={groupManageSearch} onChange={(e) => setGroupManageSearch(e.target.value)} placeholder="Email, téléphone ou identifiant" />
                      </div>
                      {!!groupManageMatches.length && (
                        <div className="panel-list" style={{ maxHeight: 220, marginBottom: 10 }}>
                          {groupManageMatches.map((match) => {
                            const selected = groupManageMembers.includes(match.uid);
                            return (
                              <div key={match.uid} className="panel-item">
                                <strong>{match.name}</strong>
                                <span>{match.username ? `@${match.username}` : match.email}{match.phone ? ` · ${match.phone}` : ""}</span>
                                <div className="choice-row" style={{ marginTop: 10 }}>
                                  <button className={`choice-pill ${selected ? "on" : ""}`} onClick={() => {
                                    setGroupManageMembers((prev) => selected ? prev.filter((uid) => uid !== match.uid) : [...prev, match.uid]);
                                  }}>{selected ? "Retirer du groupe" : "Ajouter au groupe"}</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="link-pack" style={{ marginBottom: 12 }}>
                        {groupManageMembers.map((uid) => {
                          const match = [...groupManageMatches, ...contactDirectory, ...(selectedConversation.participants || [])].find((entry) => entry.uid === uid);
                          return (
                            <button key={uid} className="link-chip" onClick={() => setGroupManageMembers((prev) => prev.filter((item) => item !== uid))}>
                              {match?.name || uid} ×
                            </button>
                          );
                        })}
                        {!groupManageMembers.length && <div className="muted-box" style={{ width: "100%" }}>Ajoutez au moins 2 membres en plus de vous.</div>}
                      </div>
                      <div className="settings-actions" style={{ marginTop: 0 }}>
                        <button className="btn btn-p btn-sm" disabled={conversationBusy || groupManageMembers.length < 2} onClick={() => void saveConversationSettings()}>Enregistrer le groupe</button>
                        <button className="btn btn-d btn-sm" disabled={conversationBusy} onClick={() => void deleteSelectedConversation()}>Supprimer le groupe</button>
                      </div>
                    </>
                  ) : (
                    <div className="settings-actions" style={{ marginTop: 0, justifyContent: "space-between" }}>
                      <div className="muted-box" style={{ flex: 1 }}>Aucun réglage de nom pour une conversation directe. Vous pouvez en revanche la supprimer proprement.</div>
                      <button className="btn btn-d btn-sm" disabled={conversationBusy} onClick={() => void deleteSelectedConversation()}>Supprimer</button>
                    </div>
                  )}
                </div>
              )}

              <div className="conv-thread" ref={conversationThreadRef}>
                {selectedConversationMessages.map((message) => {
                  const isSelf = message.senderId === user.uid;
                  const reactionCounts = Object.values(message.reactions || {}).reduce((acc, emoji) => {
                    acc[emoji] = (acc[emoji] || 0) + 1;
                    return acc;
                  }, {});

                  return (
                    <div
                      key={message.id}
                      className={`bubble-wrap ${isSelf ? "self" : ""}`}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        openMessageContextMenu({ x: event.clientX, y: event.clientY }, message);
                      }}
                      onTouchStart={(event) => {
                        const touch = event.touches[0];
                        clearLongPress();
                        longPressRef.current = setTimeout(() => {
                          openMessageContextMenu({ x: touch.clientX, y: touch.clientY }, message);
                        }, 450);
                      }}
                      onTouchEnd={clearLongPress}
                      onTouchCancel={clearLongPress}
                    >
                      <div className={`bubble ${isSelf ? "self" : ""}`}>
                        {message.deletedAt ? (
                          <div style={{ marginTop: 6, fontSize: 13, color: "var(--sub)" }}>Le message a été supprimé</div>
                        ) : messageEdit.id === message.id ? (
                          <div style={{ marginTop: 8 }}>
                            <textarea
                              ref={editMessageRef}
                              className="finput"
                              value={messageEdit.text}
                              onChange={(e) => setMessageEdit({ id: message.id, text: e.target.value })}
                              onKeyDown={async (event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                  event.preventDefault();
                                  await runConversationAction("edit-message", { conversationId: selectedConversation.id, messageId: message.id, text: messageEdit.text });
                                  setMessageEdit({ id: "", text: "" });
                                }
                              }}
                            />
                          </div>
                        ) : (
                          <>
                            {message.type === "call" && <div style={{ whiteSpace: "pre-wrap" }}>{message.callMode === "video" ? "Invitation d'appel vidéo" : "Invitation d'appel audio"}</div>}
                            {!!message.body && <div style={{ marginTop: message.type === "call" ? 6 : 0, whiteSpace: "pre-wrap" }}>{message.body}</div>}
                            {!!message.attachments?.length && (
                              <div className="link-pack call-link">
                                {message.attachments.map((attachment) => (
                                  attachment.type === "voice" ? (
                                    <div key={attachment.id} className="voice-bubble">
                                      <div className="voice-bubble-head">{attachment.name || "Message vocal"}</div>
                                      <audio controls preload="metadata" src={attachment.url} />
                                    </div>
                                  ) : (
                                    <button key={attachment.id} type="button" className="link-chip" onClick={() => openAttachment(attachment)}>{attachment.name}</button>
                                  )
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        <div className="bubble-meta">{fmtRel(message.createdAt)}{message.editedAt ? " · modifié" : ""}</div>
                        {!!Object.keys(reactionCounts).length && (
                          <div className="message-reactions">
                            {Object.entries(reactionCounts).map(([emoji, count]) => <span key={emoji} className="message-reaction-chip">{emoji} {count}</span>)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!selectedConversation.messages.length && <div className="empty-state">Aucun message pour l’instant. Lancez la conversation juste en dessous.</div>}
              </div>

              <div className="composer">
                {!!attachmentDraft.url && (
                  <div className="composer-preview">
                    <div className="composer-preview-main">
                      <span>{attachmentDraft.type === "image" ? "Image" : "Fichier"} prêt</span>
                      <strong style={{ color: "var(--text)" }}>{attachmentDraft.name}</strong>
                    </div>
                    <button className="btn btn-g btn-sm" onClick={() => setAttachmentDraft({ name: "", url: "", type: "file" })}>Retirer</button>
                  </div>
                )}
                {!!voiceDraft.url && (
                  <div className="composer-preview">
                    <div className="voice-preview">
                      <strong style={{ color: "var(--text)" }}>Message vocal prêt</strong>
                      <div className="voice-meta">{fmtDurationSeconds(voiceDraft.durationSec)} · {Math.round((voiceDraft.size || 0) / 1024)} Ko</div>
                      <audio controls preload="metadata" src={voiceDraft.url} />
                    </div>
                    <button className="btn btn-g btn-sm" onClick={() => clearVoiceDraft()}>Retirer</button>
                  </div>
                )}
                <input ref={filePickerRef} type="file" style={{ display: "none" }} onChange={(event) => { void readAttachmentFile(event.target.files?.[0], "file"); event.target.value = ""; }} />
                <input ref={imagePickerRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(event) => { void readAttachmentFile(event.target.files?.[0], "image"); event.target.value = ""; }} />
                {attachmentChooserOpen && (
                  <div className="attach-actions">
                    <button className="btn btn-g btn-sm" onClick={() => filePickerRef.current?.click()}>Fichier</button>
                    <button className="btn btn-g btn-sm" onClick={() => imagePickerRef.current?.click()}>Image</button>
                  </div>
                )}
                {(voiceState.recording || voiceState.processing) && (
                  <div className={`voice-pill ${voiceState.recording ? "live" : ""}`}>
                    {voiceState.recording ? <span className="voice-dot" /> : null}
                    <span>
                      {voiceState.recording ? `Enregistrement en cours · ${fmtDurationSeconds(voiceState.seconds)}` : "Préparation du vocal…"}
                    </span>
                  </div>
                )}
                <div className="composer-row">
                  <button className="composer-attach" title="Ajouter un fichier" onClick={() => setAttachmentChooserOpen((prev) => !prev)}>📎</button>
                  <button
                    className="composer-attach"
                    title={voiceState.recording ? "Arrêter l'enregistrement" : "Enregistrer un vocal"}
                    onClick={() => {
                      if (voiceState.recording) {
                        stopVoiceRecording();
                      } else {
                        void startVoiceRecording();
                      }
                    }}
                    disabled={voiceState.processing}
                  >
                    {voiceState.recording ? "■" : "🎙️"}
                  </button>
                  <textarea
                    className="finput"
                    value={composerText}
                    onChange={(e) => setComposerText(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendCurrentMessage();
                      }
                    }}
                    placeholder="Écrire un message…"
                  />
                  <button className="btn btn-p" disabled={conversationBusy || voiceState.recording || voiceState.processing} onClick={() => void sendCurrentMessage()}>{I.send} Envoyer</button>
                </div>
                {(voiceDraft.url || voiceState.recording) && (
                  <div className="voice-actions">
                    {voiceState.recording && <button className="btn btn-g btn-sm" onClick={cancelVoiceRecording}>Annuler le vocal</button>}
                    {!!voiceDraft.url && <button className="btn btn-g btn-sm" onClick={() => { clearVoiceDraft(); toast("Vocal retiré", "info"); }}>Supprimer le vocal</button>}
                    <div className="voice-meta">Vocaux courts, optimisés pour rester rapides à sauvegarder sur tous les appareils.</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">Sélectionnez ou créez une conversation pour commencer.</div>
          )}
        </div>
        {messageMenu && (
          <div className="context-menu" style={{ left: messageMenu.x, top: messageMenu.y }} onMouseLeave={() => setMessageMenu(null)}>
            {messageMenu.composer ? (
              <>
                <button className="context-btn" onClick={() => { setMessageMenu(null); filePickerRef.current?.click(); }}>Choisir un fichier</button>
                <button className="context-btn" onClick={() => { setMessageMenu(null); imagePickerRef.current?.click(); }}>Choisir une image</button>
              </>
            ) : (
              <>
                <div className="context-row">
                  {["👍", "❤️", "🔥", "👏"].map((emoji) => (
                    <button
                      key={emoji}
                      className="bubble-reaction"
                      onClick={async () => {
                        await runConversationAction("react-message", { conversationId: selectedConversation.id, messageId: messageMenu.messageId, emoji });
                        setMessageMenu(null);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {messageMenu.canEdit && <button className="context-btn" onClick={() => {
                  const original = selectedConversation.messages.find((message) => message.id === messageMenu.messageId);
                  setMessageEdit({ id: messageMenu.messageId, text: original?.body || "" });
                  setMessageMenu(null);
                }}>Modifier le message</button>}
                {messageMenu.canEdit && <button className="context-btn" onClick={async () => {
                  await runConversationAction("delete-message", { conversationId: selectedConversation.id, messageId: messageMenu.messageId });
                  setMessageMenu(null);
                }}>Supprimer le message</button>}
                {messageMenu.canReport && <button className="context-btn" onClick={async () => {
                  const targetId = messageMenu.messageId;
                  setMessageMenu(null);
                  setReportDialog({ open: true, messageId: targetId, reason: "abus", details: "" });
                }}>Signaler le message</button>}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Settings ──
  const ViewSettings = () => {
    const handleProfilePhotoFile = async (file) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast("Choisissez une image valide", "err");
        return;
      }
      if (file.size > 3 * 1024 * 1024) {
        toast("Image limitée à 3 Mo", "err");
        return;
      }
      const dataUrl = await readImageFileAsDataUrl(file, 720, 0.84).catch(() => "");
      if (!dataUrl) return toast("Impossible de charger l’image", "err");
      setProfileDraft((prev) => ({ ...prev, photoUrl: dataUrl }));
      toast("Photo prête à être enregistrée");
    };

    const saveProfile = async () => {
      const nextName = profileDraft.name.trim();
      const nextEmail = profileDraft.email.trim().toLowerCase();
      const nextUsername = normalizeUsernameInput(profileDraft.username);
      const nextPhone = normalizePhoneInput(profileDraft.phone);
      const nextPhotoUrl = profileDraft.photoUrl.trim();

      if (!nextName) return toast("Nom affiché requis", "err");
      if (!nextEmail) return toast("Email requis", "err");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return toast("Email invalide", "err");
      if (nextUsername && !/^[a-z0-9._-]{3,20}$/.test(nextUsername)) {
        return toast("Identifiant: 3-20 caractères, lettres/chiffres/._-", "err");
      }
      if (nextPhone && !/^\+?\d{6,15}$/.test(nextPhone)) return toast("Téléphone invalide", "err");
      if (nextPhotoUrl && !isSupportedPhotoSource(nextPhotoUrl)) return toast("Photo invalide: utilisez une URL web ou une image locale", "err");
      if (profileDraft.newPassword && profileDraft.newPassword !== profileDraft.confirmPassword) {
        return toast("Les nouveaux mots de passe ne correspondent pas", "err");
      }

      try {
        setAccountBusy(true);
        const payload = await api("/api/account", {
          method: "PATCH",
          body: JSON.stringify({
            name: nextName,
            email: nextEmail,
            currentPassword: profileDraft.currentPassword,
            newPassword: profileDraft.newPassword,
            profile: {
              username: nextUsername,
              fullName: profileDraft.fullName.trim(),
              phone: nextPhone,
              phoneVisible: profileDraft.phoneVisible === "public",
              photoUrl: nextPhotoUrl,
            },
          }),
        });

        setUser(payload.user);
        setIsAdmin(Boolean(payload.admin));
        setDb(payload.db);
        setTheme(payload.db.settings?.theme || "dark");
        setSaveState("saved");
        setProfileDraft((prev) => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
        toast("Profil synchronisé");
      } catch (error) {
        toast(error.message || "Impossible de mettre à jour le compte", "err");
      } finally {
        setAccountBusy(false);
      }
    };

  const exportBackup = () => {
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `flow-backup-${todayStr()}.json`;
      a.click();
      updateDb((draft) => addActivityEntry(draft, { type: "backup", title: "Backup exporté", detail: "Un export JSON a été téléchargé." }));
      toast("Export téléchargé");
    };

    const resetWorkspace = () => {
      void requestConfirm({
        title: "Réinitialiser tout le workspace ?",
        detail: "Toutes les notes, tâches, événements, messages locaux et modules seront vidés. Le compte, le profil et le forfait seront conservés.",
        confirmLabel: "Tout supprimer",
        tone: "danger",
      }).then((ok) => {
        if (!ok) return;
        const fresh = emptyDB();
        fresh.profile = {
          ...fresh.profile,
          name: user.name,
          email: user.email,
          username: db.profile?.username || "",
          fullName: db.profile?.fullName || user.name,
          phone: db.profile?.phone || "",
          phoneVisible: Boolean(db.profile?.phoneVisible),
          photoUrl: db.profile?.photoUrl || "",
        };
        fresh.subscription = db.subscription || fresh.subscription;
        addActivityEntry(fresh, { type: "workspace", title: "Workspace réinitialisé", detail: "Les modules ont été remis à zéro." });
        setDb(fresh);
        save(fresh, true);
        toast("Données effacées", "info");
      });
    };

    const settingsTabs = [
      { key: "profile", label: "Compte", sub: "Identité, accès, photo et coordonnées", icon: I.user },
      { key: "appearance", label: "Apparence", sub: "Thème, langue et lisibilité", icon: theme === "dark" ? I.moon : I.sun },
      { key: "shortcuts", label: "Discussions et raccourcis", sub: "Actions clavier et gestes rapides", icon: I.msg },
      { key: "activity", label: "Notifications et activité", sub: "Historique et centre de suivi", icon: I.bell },
      { key: "billing", label: "Stockage et forfait", sub: "Plan, exports et espace utilisé", icon: I.target },
    ];
    const settingsGroups = [
      { key: "identity", title: "Profil", items: ["profile"] },
      { key: "preferences", title: "Préférences", items: ["appearance", "shortcuts", "activity"] },
      { key: "workspace", title: "Workspace", items: ["billing"] },
    ];
    const activityItems = Array.isArray(db.activity) ? db.activity : [];
    const activityCounts = activityItems.reduce((acc, item) => {
      const key = item?.type || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const activityFilters = [
      { key: "all", label: "Tout" },
      { key: "account", label: "Compte" },
      { key: "conversation", label: "Messages" },
      { key: "note", label: "Notes" },
      { key: "task", label: "Tâches" },
      { key: "appearance", label: "Apparence" },
      { key: "backup", label: "Backups" },
      { key: "report", label: "Signalements" },
    ];
    const filteredActivity = settingsActivityFilter === "all"
      ? activityItems
      : activityItems.filter((item) => item.type === settingsActivityFilter);
    const showingReports = settingsActivityFilter === "report";
    const shortcutGroups = Object.entries(SHORTCUT_GROUP_LABELS).map(([groupKey, groupLabel]) => ({
      key: groupKey,
      label: groupLabel,
      items: SHORTCUT_ACTIONS.filter((action) => action.group === groupKey),
    }));
    const currentSettingsItem = settingsTabs.find((item) => item.key === settingsTab) || settingsTabs[0];
    const showSettingsList = !isCompactViewport || !settingsDetailOpen;
    const showSettingsDetail = !isCompactViewport || settingsDetailOpen;

    return (
      <>
        <div className="settings-shell">
          {showSettingsList && (
          <EditableBlock blockKey="settings-nav" label="Navigation paramètres" className="settings-nav">
            {settingsGroups.map((group) => (
              <div key={group.key} className="settings-nav-group">
                <div className="settings-nav-group-title">{group.title}</div>
                <div className="settings-nav-card">
                  {group.items.map((key) => {
                    const item = settingsTabs.find((entry) => entry.key === key);
                    if (!item) return null;
                    return (
                      <button key={item.key} className={`settings-tab ${settingsTab === item.key ? "on" : ""}`} onClick={() => openSettingsSection(item.key)} type="button">
                        <span className="settings-tab-icon">{item.icon}</span>
                        <div className="settings-tab-copy"><strong>{item.label}</strong><span>{item.sub}</span></div>
                        <span className="settings-nav-chevron">{I.chev}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </EditableBlock>
          )}

          {showSettingsDetail && (
          <EditableBlock blockKey="settings-panel" label="Panneau paramètres" className="settings-panel">
            {isCompactViewport && (
              <button className="settings-back-btn" type="button" onClick={() => setSettingsDetailOpen(false)}>
                <span>{I.chev}</span>
                <span>Retour aux paramètres</span>
              </button>
            )}

            {settingsTab === "profile" && (
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Profil</h3>
                  <p>Ces champs sont réellement sauvegardés et reviennent sur la prochaine connexion.</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div className="sb-av" style={{ width: 56, height: 56, fontSize: 18 }}>
                      {profileDraft.photoUrl ? <img src={profileDraft.photoUrl} alt="Profil" /> : (profileDraft.name || user.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{profileDraft.name || "Votre profil"}</div>
                      <div className="s-sub">{profileDraft.username ? `@${profileDraft.username}` : "Ajoutez un identifiant public"}</div>
                      <div className="choice-row" style={{ marginTop: 10 }}>
                        <button type="button" className="choice-pill on" onClick={() => profilePhotoInputRef.current?.click()}>Choisir une photo</button>
                        {!!profileDraft.photoUrl && <button type="button" className="choice-pill" onClick={() => setProfileDraft((prev) => ({ ...prev, photoUrl: "" }))}>Retirer</button>}
                      </div>
                    </div>
                  </div>
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(event) => {
                      void handleProfilePhotoFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <div className="settings-form">
                    <div className="field"><label>Nom affiché</label><input className="finput" value={profileDraft.name} onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))} placeholder="Nom visible dans l'app" /></div>
                    <div className="field"><label>Identifiant</label><input className="finput" value={profileDraft.username} onChange={(e) => setProfileDraft((prev) => ({ ...prev, username: normalizeUsernameInput(e.target.value) }))} placeholder="aymen.flow" /></div>
                    <div className="field"><label>Nom complet</label><input className="finput" value={profileDraft.fullName} onChange={(e) => setProfileDraft((prev) => ({ ...prev, fullName: e.target.value }))} placeholder="Nom complet" /></div>
                    <div className="field"><label>Email de connexion</label><input className="finput" type="email" value={profileDraft.email} onChange={(e) => setProfileDraft((prev) => ({ ...prev, email: e.target.value }))} placeholder="email@exemple.com" /></div>
                    <div className="field"><label>Téléphone</label><input className="finput" value={profileDraft.phone} onChange={(e) => setProfileDraft((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+33 6 00 00 00 00" /></div>
                    <div className="field">
                      <label>Visibilité du téléphone</label>
                      <div className="choice-row">
                        <button type="button" className={`choice-pill ${profileDraft.phoneVisible === "private" ? "on" : ""}`} onClick={() => setProfileDraft((prev) => ({ ...prev, phoneVisible: "private" }))}>Privé</button>
                        <button type="button" className={`choice-pill ${profileDraft.phoneVisible === "public" ? "on" : ""}`} onClick={() => setProfileDraft((prev) => ({ ...prev, phoneVisible: "public" }))}>Visible par les utilisateurs</button>
                      </div>
                    </div>
                    <div className="field span-2"><label>Photo de profil (URL ou image choisie)</label><input className="finput" value={profileDraft.photoUrl} onChange={(e) => setProfileDraft((prev) => ({ ...prev, photoUrl: e.target.value }))} placeholder="https://... ou image locale" /></div>
                  </div>
                </div>

                <div className="settings-card">
                  <h3>Sécurité</h3>
                  <p>L’email et le mot de passe sont protégés. Le mot de passe actuel est demandé pour tout changement sensible.</p>
                  <div className="settings-form">
                    <div className="field span-2"><label>Mot de passe actuel</label><input className="finput" type="password" value={profileDraft.currentPassword} onChange={(e) => setProfileDraft((prev) => ({ ...prev, currentPassword: e.target.value }))} placeholder="Obligatoire pour changer email ou mot de passe" /></div>
                    <div className="field"><label>Nouveau mot de passe</label><input className="finput" type="password" value={profileDraft.newPassword} onChange={(e) => setProfileDraft((prev) => ({ ...prev, newPassword: e.target.value }))} placeholder="8 caractères minimum" /></div>
                    <div className="field"><label>Confirmer</label><input className="finput" type="password" value={profileDraft.confirmPassword} onChange={(e) => setProfileDraft((prev) => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Répéter le mot de passe" /></div>
                  </div>
                  <div className="settings-actions">
                    <button className="btn btn-p" onClick={saveProfile} disabled={accountBusy}>{accountBusy ? "Enregistrement…" : "Enregistrer le profil"}</button>
                  </div>
                  <div style={{ background: "var(--red-d)", border: "1px solid rgba(216,92,92,.2)", borderRadius: "var(--r)", padding: 16, marginTop: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", marginBottom: 4 }}>Zone dangereuse</div>
                    <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 10 }}>Réinitialise les modules du workspace sans supprimer le compte, la session ni l’abonnement courant.</div>
                    <button type="button" className="btn btn-d" onClick={resetWorkspace}>Tout supprimer</button>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "appearance" && (
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Apparence</h3>
                  <p>Ces réglages s’appliquent maintenant en direct sur l’interface et se sauvegardent automatiquement.</p>
                  <div className="settings-form">
                    <div className="field">
                      <label>Thème</label>
                      <div className="choice-row">
                        <button type="button" className={`choice-pill ${appearanceDraft.theme === "dark" ? "on" : ""}`} onClick={() => applyAppearanceChoice({ theme: "dark" })}>Sombre</button>
                        <button type="button" className={`choice-pill ${appearanceDraft.theme === "light" ? "on" : ""}`} onClick={() => applyAppearanceChoice({ theme: "light" })}>Clair</button>
                      </div>
                    </div>
                    <div className="field">
                      <label>Langue</label>
                      <div className="choice-row">
                        <button type="button" className={`choice-pill ${appearanceDraft.locale === "fr" ? "on" : ""}`} onClick={() => applyAppearanceChoice({ locale: "fr" })}>Français</button>
                        <button type="button" className={`choice-pill ${appearanceDraft.locale === "en" ? "on" : ""}`} onClick={() => applyAppearanceChoice({ locale: "en" })}>English</button>
                      </div>
                    </div>
                    <div className="field">
                      <label>Couleur du thème</label>
                      <div className="choice-row">
                        {ACCENT_PRESETS.map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            className={`choice-pill ${appearanceDraft.accent === preset.value ? "on" : ""}`}
                            onClick={() => applyAppearanceChoice({ accent: preset.value })}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="settings-note">Aucun bouton d’application: chaque changement est pris en compte et synchronisé automatiquement.</div>
                </div>

                <div className="settings-card">
                  <h3>Compte et stockage</h3>
                  <p>Le compte reste synchronisé sur le même cloud chiffré qu’avant, sans perte des données existantes.</p>
                  <div className="s-group" style={{ marginBottom: 0 }}>
                    <div className="s-row"><div><div className="s-lbl">Stockage estimé</div><div className="s-sub">{(() => { try { return (new Blob([JSON.stringify(db)]).size / 1024).toFixed(1) + " Ko"; } catch { return "—"; } })()}</div></div><span className="tag">Cloud</span></div>
                    <div className="s-row"><div><div className="s-lbl">Backup JSON</div><div className="s-sub">Exporter ou réimporter un workspace complet</div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" className="btn btn-g" onClick={exportBackup}>Exporter</button><button type="button" className="btn btn-g" onClick={() => backupImportInputRef.current?.click()}>Importer</button></div></div>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "shortcuts" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="settings-card">
                  <h3>Raccourcis clavier</h3>
                  <p>Cliquez sur une action, appuyez sur la combinaison voulue, puis Flow la sauvegarde immédiatement sur votre profil.</p>
                  <div className="shortcut-groups">
                    {shortcutGroups.map((group) => (
                      <div key={group.key} className="shortcut-group">
                        <div className="surface-head" style={{ marginBottom: 10 }}>
                          <div>
                            <div className="surface-title" style={{ fontSize: 16 }}>{group.label}</div>
                            <div className="surface-sub">{group.items.length} action(s) configurables</div>
                          </div>
                        </div>
                        <div className="s-group" style={{ marginBottom: 0 }}>
                          {group.items.map((action) => {
                            const currentCombo = shortcutBindings[action.key] || "";
                            const isCapturing = shortcutCaptureAction === action.key;
                            return (
                              <div key={action.key} className="s-row shortcut-row">
                                <div className="shortcut-copy">
                                  <div className="s-lbl">{action.label}</div>
                                  <div className="s-sub">{action.description}</div>
                                  <div className="shortcut-default">Par défaut: {formatShortcutLabel(action.defaultCombo)}</div>
                                </div>
                                <button
                                  type="button"
                                  className={`shortcut-trigger ${isCapturing ? "on" : ""}`}
                                  onClick={() => setShortcutCaptureAction((prev) => prev === action.key ? "" : action.key)}
                                >
                                  {isCapturing ? "Appuyez sur les touches…" : formatShortcutLabel(currentCombo)}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="settings-actions">
                    <button type="button" className="btn btn-g" onClick={() => setShortcutCaptureAction("")}>Annuler la capture</button>
                    <button type="button" className="btn btn-p" onClick={resetShortcutBindings}>Réinitialiser les raccourcis</button>
                  </div>
                  <div className="settings-note">Pendant la capture: `Échap` annule, `Retour arrière` ou `Suppr` retire le raccourci courant.</div>
                </div>
              </div>
            )}

            {settingsTab === "activity" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="settings-grid">
                  <div className="settings-card">
                    <h3>Résumé activité</h3>
                    <p>Vue rapide des actions réellement enregistrées sur ce compte.</p>
                    <div className="s-group" style={{ marginBottom: 0 }}>
                      <div className="s-row"><div><div className="s-lbl">Total récent</div><div className="s-sub">{activityItems.length} entrées conservées</div></div><span className="tag">120 max</span></div>
                      <div className="s-row"><div><div className="s-lbl">Compte</div><div className="s-sub">{activityCounts.account || 0} action(s)</div></div><span className="tag">Profil</span></div>
                      <div className="s-row"><div><div className="s-lbl">Messages</div><div className="s-sub">{activityCounts.conversation || 0} action(s)</div></div><span className="tag">Interne</span></div>
                      <div className="s-row"><div><div className="s-lbl">Contenu</div><div className="s-sub">{(activityCounts.note || 0) + (activityCounts.task || 0) + (activityCounts.event || 0) + (activityCounts.bookmark || 0)} action(s)</div></div><span className="tag">Modules</span></div>
                    </div>
                  </div>
                  <div className="settings-card">
                    <h3>Filtrer</h3>
                    <p>Concentrez-vous sur une catégorie utile avant d’auditer le détail.</p>
                    <div className="choice-row">
                      {activityFilters.map((filter) => (
                        <button key={filter.key} type="button" className={`choice-pill ${settingsActivityFilter === filter.key ? "on" : ""}`} onClick={() => setSettingsActivityFilter(filter.key)}>
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="settings-card">
                  <h3>{showingReports ? "Mes signalements" : "Historique détaillé"}</h3>
                  <p>{showingReports ? "Vue réelle des messages que vous avez signalés, avec motif, aperçu et conversation d’origine." : "Les créations, sauvegardes, changements de compte et actions de conversation récentes remontent ici avec leur horodatage."}</p>
                  {showingReports ? (
                    reportedMessages.length ? (
                      <div className="activity-list">
                        {reportedMessages.map((item) => (
                          <div key={item.id || `${item.messageId}-${item.createdAt}`} className="activity-item">
                            <div className="activity-dot" />
                            <div className="activity-copy">
                              <strong>{item.reason || "Signalement"}</strong>
                              <span>{item.conversationTitle || "Conversation"}{item.sender?.name ? ` · message de ${item.sender.name}` : ""}</span>
                              <span>{item.messagePreview || "Aperçu indisponible"}</span>
                              {item.details ? <span>{item.details}</span> : null}
                              <span>{fmtRel(item.createdAt)}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString("fr-FR")}` : ""}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted-box">Aucun signalement envoyé depuis ce compte pour le moment.</div>
                    )
                  ) : filteredActivity.length ? (
                    <div className="activity-list">
                      {filteredActivity.map((item) => (
                        <div key={item.id || `${item.title}-${item.createdAt}`} className="activity-item">
                          <div className="activity-dot" />
                          <div className="activity-copy">
                            <strong>{item.title || "Activité"}</strong>
                            <span>{item.detail || "Action synchronisée"}</span>
                            <span>{fmtRel(item.createdAt)}{item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString("fr-FR")}` : ""}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted-box">Aucune entrée pour ce filtre. L’activité détaillée couvre déjà le profil, l’apparence, les notes, tâches, signets, événements, exports, réinitialisations et les nouvelles actions de conversation.</div>
                  )}
                </div>
              </div>
            )}

            {settingsTab === "billing" && (
              <div style={{ display: "grid", gap: 14 }}>
                <div className="settings-card">
                  <h3>Forfait actuel</h3>
                  <p>Le paiement est maintenant branché sur Stripe. Choisissez un cycle ci-dessous, puis gérez ensuite votre abonnement dans le portail client.</p>
                  <div className="muted-box">Plan actif: <strong>{currentPlan.name}</strong> · statut <strong>{db.subscription?.status === "complimentary" ? "offert" : db.subscription?.status}</strong> · cycle <strong>{db.subscription?.billingCycle === "lifetime" ? "à vie" : db.subscription?.billingCycle}</strong>.</div>
                  <div className="settings-actions">
                    <button type="button" className="btn btn-g" onClick={openBillingPortal} disabled={billingBusy === "portal" || !db.subscription?.stripeCustomerId}>
                      {billingBusy === "portal" ? "Ouverture…" : "Gérer dans Stripe"}
                    </button>
                    {db.subscription?.stripeSubscriptionId ? (
                      <button type="button" className="btn btn-d" onClick={cancelBillingSubscription} disabled={billingBusy === "cancel"}>
                        {billingBusy === "cancel" ? "Annulation…" : "Annuler l'abonnement"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="plan-grid">
                  {PLAN_DEFS.map((plan) => {
                    const active = plan.key === currentPlan.key;
                    return (
                      <div key={plan.key} className={`plan-card ${active ? "current" : ""}`}>
                        <div className="plan-head">
                          <h3>{plan.name}</h3>
                          <div className="plan-desc">{plan.desc}</div>
                        </div>
                        <div className="plan-price">{plan.priceMonth}<span style={{ fontSize: 12, color: "var(--sub)" }}> /mois</span></div>
                        <div className="s-sub">{plan.priceYear} /an · {plan.priceLife} à vie</div>
                        <div className="plan-features">
                          {plan.features.map((feature) => <div key={feature}><span style={{ color: "var(--accent)" }}>•</span><span>{feature}</span></div>)}
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <button
                            type="button"
                            className={`btn ${active && db.subscription?.billingCycle === "monthly" ? "btn-p" : "btn-g"}`}
                            disabled={billingBusy === `${plan.key}:monthly` || (active && db.subscription?.billingCycle === "monthly")}
                            onClick={() => startBillingCheckout(plan.key, "monthly")}
                          >
                            {active && db.subscription?.billingCycle === "monthly" ? "Déjà actif" : billingBusy === `${plan.key}:monthly` ? "Ouverture…" : `Mensuel · ${plan.priceMonth}`}
                          </button>
                          <button
                            type="button"
                            className={`btn ${active && db.subscription?.billingCycle === "yearly" ? "btn-p" : "btn-g"}`}
                            disabled={billingBusy === `${plan.key}:yearly` || (active && db.subscription?.billingCycle === "yearly")}
                            onClick={() => startBillingCheckout(plan.key, "yearly")}
                          >
                            {active && db.subscription?.billingCycle === "yearly" ? "Déjà actif" : billingBusy === `${plan.key}:yearly` ? "Ouverture…" : `Annuel · ${plan.priceYear}`}
                          </button>
                          <button
                            type="button"
                            className={`btn ${active && db.subscription?.billingCycle === "lifetime" ? "btn-p" : "btn-g"}`}
                            disabled={billingBusy === `${plan.key}:lifetime` || (active && db.subscription?.billingCycle === "lifetime")}
                            onClick={() => startBillingCheckout(plan.key, "lifetime")}
                          >
                            {active && db.subscription?.billingCycle === "lifetime" ? "Déjà actif" : billingBusy === `${plan.key}:lifetime` ? "Ouverture…" : `À vie · ${plan.priceLife}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </EditableBlock>
          )}
        </div>
      </>
    );
  };

  const EditableBlock = ({ blockKey, label, className = "", style, children }) => {
    return (
      <div
        className={className}
        style={style}
      >
        {children}
      </div>
    );
  };

  const renderCurrentView = () => {
    if (view === "settings") return <ViewSettings />;
    if (view === "notes") return ViewNotes();
    if (view === "projects") return ViewProjects();
    if (view === "calendar") return ViewCalendar();
    if (view === "conversations") return ViewConversations();
    if (view === "habits") return ViewHabits();
    if (view === "goals") return ViewGoals();
    if (view === "focus") return ViewFocus();
    if (view === "bookmarks") return ViewBookmarks();
    return ViewDashboard();
  };

  // ═══════ RENDER ═══════
  return (
    <>
      <style>{CSS}</style>
      {splashOverlay}
      <input
        ref={backupImportInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={(event) => {
          void importBackupFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {commandPaletteOpen && (
        <div className="cp-overlay" onClick={(event) => { if (event.target === event.currentTarget) closeCommandPalette(); }}>
          <div className="cp-shell" role="dialog" aria-modal="true" aria-label="Command Palette Flow">
            <div className="cp-head">
              <div className="cp-search">
                {I.search}
                <input
                  ref={commandPaletteInputRef}
                  value={commandPaletteQuery}
                  onChange={(event) => setCommandPaletteQuery(event.target.value)}
                  placeholder="Rechercher une note, une tâche, un module ou lancer une action…"
                />
              </div>
              <div className="cp-search-meta">
                <span>{commandPaletteResults.length} résultat{commandPaletteResults.length > 1 ? "s" : ""}</span>
                <span>Navigation universelle Flow</span>
              </div>
            </div>
            <div className="cp-body">
              {commandPaletteResults.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`cp-item ${commandPaletteIndex === index ? "on" : ""}`}
                  onMouseEnter={() => setCommandPaletteIndex(index)}
                  onClick={() => executeCommandPaletteItem(item)}
                >
                  <div className="cp-item-copy">
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <span className="cp-kind">{item.kind === "nav" ? "Module" : item.kind === "action" ? "Action" : item.kind}</span>
                </button>
              ))}
              {!commandPaletteResults.length && (
                <div className="cp-empty">
                  Aucun résultat. Essaie un nom de module, une note, une tâche ou une action comme "nouvelle note".
                </div>
              )}
            </div>
            <div className="cp-foot">
              <div className="cp-hints">
                <span className="cp-kbd">↑↓</span>
                <span>naviguer</span>
                <span className="cp-kbd">Entrée</span>
                <span>ouvrir</span>
                <span className="cp-kbd">Échap</span>
                <span>fermer</span>
              </div>
              <div className="cp-hints">
                <span className="cp-kbd">{formatShortcutLabel(shortcutBindings.commandPalette)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={`app ${isMobileViewport ? "mobile-shell" : ""} ${sidebarPinned ? "sidebar-pinned" : ""}`} onTouchStart={handleAppTouchStart} onTouchMove={handleAppTouchMove} onTouchEnd={handleAppTouchEnd}>
        {/* Sidebar veil (mobile) */}
        <div className={`sb-veil ${sbOpen || mobileSidebarProgress > 0 ? "show" : ""}`} style={isMobileViewport ? { opacity: Math.max(0, Math.min(0.52, mobileSidebarProgress * 0.52)) } : undefined} onClick={() => { setSbOpen(false); setMobileSidebarProgress(0); }} />

        {/* Sidebar */}
        <EditableBlock blockKey="sidebar" label="Barre de menu">
        <aside
          ref={sidebarRef}
          className={`sb ${sbOpen ? "open" : ""} ${!isMobileViewport && sidebarHover ? "hovered" : ""} ${sidebarCompact ? "compact" : ""}`}
          style={isMobileViewport ? { "--sb-mobile-progress": mobileSidebarProgress } : undefined}
          onMouseEnter={() => { if (!isMobileViewport) setSidebarHover(true); }}
          onMouseLeave={() => { if (!isMobileViewport) setSidebarHover(false); }}
        >
          <div className="sb-top">
            <div className="sb-logo">
              <div className="sb-mark"><FlowLogo size={28} /></div>
              <div className="sb-name">Flow</div>
              {!sidebarCompact && (
                <>
                  <ReleaseBadge className="sb-release" label={releaseBadgeLabel} onClick={() => setReleaseWidgetOpen(true)} />
                  {!isMobileViewport && <button className={`sb-pin ${sidebarPinned ? "on" : ""}`} onClick={() => setSidebarPinned((prev) => !prev)} title={sidebarPinned ? "Déverrouiller le menu" : "Verrouiller le menu"}>{I.lock}</button>}
                </>
              )}
            </div>
          </div>
          <nav className="sb-nav">
            <div className="sb-nav-main">
              <div className="sb-sec">Main Menu</div>
              {spaceNav.map((n) => (
                <div key={n.key} title={n.label} className={`ni ${view === n.key ? "on" : ""}`} onClick={() => { setView(n.key); if (n.key === "calendar") setCalendarDayOpen(false); setSbOpen(false); setEditNote(null); closeTransientSidebar(); }}>
                  <span className="ni-icon">{n.icon}</span><span className="ni-label">{n.label}</span>{n.badge && <span className="ni-badge">{n.badge}</span>}
                </div>
              ))}
            </div>
            <div className="sb-nav-bottom">
              <div className="sb-sec">Features</div>
              {organizationNav.map((n) => (
                <div key={n.key} title={n.label} className={`ni ${view === n.key ? "on" : ""}`} onClick={() => { setView(n.key); setSbOpen(false); closeTransientSidebar(); }}>
                  <span className="ni-icon">{n.icon}</span><span className="ni-label">{n.label}</span>{n.badge && <span className="ni-badge">{n.badge}</span>}
                </div>
              ))}
              <div className="sb-sec">General</div>
              {generalNav.map((n) => (
                <div key={n.key} title={n.label} className={`ni ${view === n.key ? "on" : ""}`} onClick={() => { n.onClick?.(); if (n.key !== "help") closeTransientSidebar(); }}>
                  <span className="ni-icon">{n.icon}</span><span className="ni-label">{n.label}</span>
                </div>
              ))}
            </div>
          </nav>
          <div className="sb-user">
            <button className="sb-user-main" onClick={() => setToolbarPanel((prev) => prev === "account" ? null : "account")}>
              <div className="sb-av">
                {db.profile?.photoUrl ? <img src={db.profile.photoUrl} alt="Profil" /> : (db.profile?.name || user.name || "?")[0].toUpperCase()}
              </div>
              {!sidebarCompact && (
                <div className="sb-user-meta">
                  <div className="sb-uname">{db.profile?.name || user.name}</div>
                  <div className="sb-plan">{currentPlan.name}</div>
                </div>
              )}
            </button>
          </div>
          {toolbarPanel === "account" && (
            <div ref={accountPanelRef} className="sb-account-pop">
              <div className="account-panel-head">
                <div className="account-panel-avatar">
                  {db.profile?.photoUrl ? <img src={db.profile.photoUrl} alt="Profil" /> : (db.profile?.name || user.name || "?")[0].toUpperCase()}
                </div>
                <div className="account-panel-meta">
                  <strong>{db.profile?.name || user.name}</strong>
                  <span>{db.profile?.username ? `@${db.profile.username}` : user.email}</span>
                  <small>{currentPlan.name} · {db.subscription?.status === "complimentary" ? "offert" : db.subscription?.status || "actif"}</small>
                </div>
              </div>
              <div className="account-grid">
                <button className="account-link" onClick={() => { openSettingsSection("profile", { openView: true }); setToolbarPanel(null); closeTransientSidebar(); }}>
                  <span className="account-link-icon">{I.user}</span>
                  <div className="account-link-copy"><strong>Profil</strong><span>Modifier l'identité et la photo</span></div>
                  <span className="account-link-arrow">{I.chev}</span>
                </button>
                <button className="account-link" onClick={() => { openSettingsSection("billing", { openView: true }); setToolbarPanel(null); closeTransientSidebar(); }}>
                  <span className="account-link-icon">{I.target}</span>
                  <div className="account-link-copy"><strong>Forfait</strong><span>Voir le plan actif et les offres</span></div>
                  <span className="account-link-arrow">{I.chev}</span>
                </button>
                <button className="account-link" onClick={() => { openSettingsSection("shortcuts", { openView: true }); setToolbarPanel(null); closeTransientSidebar(); }}>
                  <span className="account-link-icon">{I.gear}</span>
                  <div className="account-link-copy"><strong>Paramètres</strong><span>Réglages et préférences avancées</span></div>
                  <span className="account-link-arrow">{I.chev}</span>
                </button>
                <button className="account-link" onClick={() => { setToolbarPanel("help"); }}>
                  <span className="account-link-icon">{I.help}</span>
                  <div className="account-link-copy"><strong>Aide</strong><span>Conseils, support et contact admin</span></div>
                  <span className="account-link-arrow">{I.chev}</span>
                </button>
                <button className="account-link" onClick={() => { setToolbarPanel(null); closeTransientSidebar(); void askLogout(); }}>
                  <span className="account-link-icon">{I.logout}</span>
                  <div className="account-link-copy"><strong>Se déconnecter</strong><span>Quitter Flow sur cet appareil</span></div>
                  <span className="account-link-arrow">{I.chev}</span>
                </button>
              </div>
            </div>
          )}
          {toolbarPanel === "help" && !isMobileViewport && (
            <div ref={helpPanelRef} className="sb-help-pop">
              <h4>Aide Flow</h4>
              <p>Support rapide sans quitter le menu.</p>
              <div className="panel-list">
                <div className="panel-item"><strong>Créer du contenu lié</strong><span>Relie notes, tâches, événements et conversations depuis leurs modules.</span></div>
                <div className="panel-item"><strong>Messagerie interne</strong><span>Recherche par email, téléphone ou identifiant pour ouvrir un échange.</span></div>
                <button className="panel-item" onClick={() => { void openSupportConversation(); }}>
                  <strong>Contacter l'équipe Flow</strong>
                  <span>Ouvre une vraie conversation support dans Flow.</span>
                </button>
              </div>
            </div>
          )}
        </aside>
        </EditableBlock>

        {/* Main */}
        <div className="main">
          <EditableBlock blockKey="topbar" label="Barre d'en-tête" className="topbar">
            <button className="tb-menu" onClick={() => setSbOpen(true)}>{I.menu}</button>
            {!isMobileViewport ? (
              <div className="tb-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><input value={globalQuery} onFocus={() => setToolbarPanel(globalQuery ? "search" : null)} onChange={(e) => { setGlobalQuery(e.target.value); setToolbarPanel(e.target.value ? "search" : null); }} placeholder="Rechercher" /><span className="tb-search-kbd">⌘ K</span></div>
            ) : (
              <div className="tb-mobile-slot">
                <button className="tb-mobile-search" onClick={() => openCommandPalette(globalQuery || "")}>
                  {I.search}
                  <span>Rechercher</span>
                </button>
              </div>
            )}
            {focusState.running && view !== "focus" && (
              <div className="tb-focus" onClick={() => setView("focus")}>
                <div className="tb-focus-copy">
                  <strong>{focusHeaderLabel}</strong>
                  <span>{fmtDurationSeconds(focusState.sec)} restant</span>
                </div>
                <div className="tb-focus-bar"><span style={{ width: `${focusHeaderProgress}%` }} /></div>
              </div>
            )}
            <div className="tb-spacer" />
            <div className="tb-right">
              {isOffline && <div className="offline-pill">Hors ligne</div>}
              <button className="tb-icon" title="Notifications" onClick={() => {
                void syncDevicePushState();
                setToolbarPanel((prev) => prev === "notifications" ? null : "notifications");
              }}>{I.bell}{!!unreadNotifications && <span className="tb-count">{Math.min(99, unreadNotifications)}</span>}</button>
              <button className="tb-icon" title="Changer le thème" onClick={applyThemeToggle}>{theme === "dark" ? I.sun : I.moon}</button>
            </div>
          </EditableBlock>
          {toolbarPanel === "help" && isMobileViewport && (
            <div className="panel-pop">
              <h4>Aide Flow</h4>
              <p>Tout est géré dans l’app: préférences, notifications, conversations et liens entre modules.</p>
              <div className="panel-list">
                <div className="panel-item"><strong>Créer du contenu lié</strong><span>Depuis une note, une tâche, un événement ou un signet, utilisez la zone de liaison pour raccrocher un contact, une conversation ou un autre module.</span></div>
                <div className="panel-item"><strong>Messagerie interne</strong><span>Recherchez un utilisateur par email, téléphone ou identifiant, puis démarrez un message direct ou un groupe.</span></div>
                <div className="panel-item"><strong>Paramètres</strong><span>Le bouton profil du menu ouvre le compte, le forfait, l’aide et les réglages utiles.</span></div>
                <button className="panel-item" onClick={() => { void openSupportConversation(); }}>
                  <strong>Contacter l'équipe Flow</strong>
                  <span>Ouvre une vraie conversation support accessible aussi depuis le dashboard admin.</span>
                </button>
              </div>
            </div>
          )}
          {toolbarPanel === "search" && (
            <div className="panel-pop">
              <h4>Recherche Flow</h4>
              <p>Contacts, conversations, notes, dates, modules et raccourcis cachés.</p>
              <div className="panel-list">
                {globalSearchResults.map((item) => (
                  <button key={item.id} className="panel-item" onClick={() => openSearchResult(item)}>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </button>
                ))}
                {!globalSearchResults.length && <div className="panel-item"><strong>Aucun résultat</strong><span>Essayez avec un nom, une date, un email ou un module.</span></div>}
              </div>
            </div>
          )}
          {toolbarPanel === "notifications" && (
            <>
              <div className="sheet-backdrop" onClick={() => setToolbarPanel(null)} />
              <aside className="sheet sheet-notifications" role="dialog" aria-modal="true" aria-label="Notifications Flow">
                <div className="sheet-head">
                  <div>
                    <div className="sheet-kicker">Centre de notifications</div>
                    <h4>Notifications</h4>
                  </div>
                  <button className="sheet-close" onClick={() => setToolbarPanel(null)} aria-label="Fermer les notifications">{I.x}</button>
                </div>
                <div className="notif-device-card" style={{ justifyContent: "flex-end" }}>
                  <button className={`btn ${devicePushEnabled ? "btn-g" : "btn-p"}`} onClick={() => { void toggleDevicePushNotifications(); }} disabled={devicePushBusy}>
                    {devicePushBusy ? "Patiente…" : devicePushEnabled ? "Désactiver sur cet appareil" : "Activer sur cet appareil"}
                  </button>
                </div>
                <div className="notif-summary">
                  <strong>{unreadNotifications} non lue{unreadNotifications > 1 ? "s" : ""}</strong>
                  <span>{appNotifications.length} élément{appNotifications.length > 1 ? "s" : ""} au total</span>
                </div>
                <div className="sheet-tools">
                  <button className="btn btn-g btn-sm" onClick={markNotificationsAsRead}>Tout marquer comme lu</button>
                  <button className="btn btn-g btn-sm" onClick={dismissViewedNotifications}>Effacer les lues</button>
                </div>
                <div className="sheet-list">
                  {appNotifications.map((notification) => (
                    <button key={notification.id} className={`notif-card ${notification.readAt ? "" : "unread"}`} onClick={() => {
                      openNotificationTarget(notification, { closePanel: true, markRead: true });
                    }}>
                      <span className="notif-card-icon">{notification.type === "message" ? I.msg : notification.type === "call" ? I.phone : notification.type === "note" ? I.edit : notification.type === "event" ? I.cal : notification.type === "bookmark" ? I.bookmark : I.bell}</span>
                      <div className="notif-card-copy">
                        <div className="notif-card-head">
                          <strong>{notification.title}</strong>
                          <span>{fmtRel(notification.createdAt)}</span>
                        </div>
                        <span>{notification.detail || "Nouvelle activité sur Flow"}</span>
                      </div>
                    </button>
                  ))}
                  {!appNotifications.length && <div className="panel-item"><strong>Aucune notification</strong></div>}
                </div>
              </aside>
            </>
          )}
          <div className={`pull-indicator ${pullRefreshOffset > 0 || pullRefreshBusy ? "show" : ""} ${pullRefreshArmed ? "armed" : ""}`} style={{ transform: `translate(-50%, ${pullRefreshBusy ? 72 : pullRefreshOffset}px)` }}>
            <div className={`pull-wheel ${pullRefreshBusy ? "busy" : ""}`}>{pullRefreshBusy ? "" : "↻"}</div>
            <span>{pullRefreshBusy ? "Mise à jour…" : pullRefreshArmed ? "Relâche pour actualiser" : "Tire pour mettre à jour"}</span>
          </div>
          <div
            ref={contentRef}
            className={`content ${view === "dashboard" ? "dashboard-content" : ""} ${historySwipeDirection ? `history-swipe-${historySwipeDirection}` : ""}`}
            style={{
              transform: historySwipeOffset || pullRefreshOffset ? `translate3d(${historySwipeOffset}px, ${pullRefreshOffset}px, 0)` : undefined,
              transition: historySwipeOffset || pullRefreshOffset ? "none" : undefined,
            }}
          >
            <div key={`${view}-${moduleTransitionKey}`} className={`view-stage view-stage-${moduleTransitionMode}`}>
              {renderCurrentView()}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {renderModal()}
      {confirmDialog && (
        <div className="confirm-overlay" onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          confirmDialog.resolve(false);
          setConfirmDialog(null);
        }}>
          <div className="confirm-card">
            <h3>{confirmDialog.title}</h3>
            {confirmDialog.detail ? <p>{confirmDialog.detail}</p> : null}
            <div className="confirm-actions">
              <button className="btn btn-g" onClick={() => {
                confirmDialog.resolve(false);
                setConfirmDialog(null);
              }}>{confirmDialog.cancelLabel}</button>
              <button className={`btn ${confirmDialog.tone === "danger" ? "btn-d" : "btn-p"}`} onClick={() => {
                confirmDialog.resolve(true);
                setConfirmDialog(null);
              }}>{confirmDialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
      {backupImportDialog.open && (
        <div className="confirm-overlay" onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          setBackupImportDialog({ open: false, raw: "", name: "" });
        }}>
          <div className="confirm-card">
            <h3>Importer ce backup ?</h3>
            <p>{backupImportDialog.name || "backup.json"}<br />Choisissez si Flow doit fusionner les données importées avec l'existant, ou remplacer tout le workspace par ce backup.</p>
            <div className="confirm-actions" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <button className="btn btn-g" type="button" onClick={() => setBackupImportDialog({ open: false, raw: "", name: "" })}>Annuler</button>
              <button className="btn btn-g" type="button" onClick={() => { void applyBackupImport(backupImportDialog.raw, "merge"); }}>Ajouter en plus</button>
              <button className="btn btn-d" type="button" onClick={() => { void applyBackupImport(backupImportDialog.raw, "replace"); }}>Remplacer totalement</button>
            </div>
          </div>
        </div>
      )}
      {reportDialog.open && (
        <div className="modal-overlay" onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          setReportDialog({ open: false, messageId: "", reason: "abus", details: "" });
        }}>
          <div className="modal" style={{ width: 520, maxWidth: "96vw" }}>
            <h3>{reportDialog.messageId ? "Signaler ce message" : "Signaler un bug"}</h3>
            <div className="field">
              <label>Motif</label>
              <div className="choice-row">
                {["abus", "spam", "bug", "synchro", "affichage", "autre"].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    className={`choice-pill ${reportDialog.reason === reason ? "on" : ""}`}
                    onClick={() => setReportDialog((prev) => ({ ...prev, reason }))}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
            <ModalField
              label="Détail"
              id="m-report-details"
              as="textarea"
              placeholder={reportDialog.messageId ? "Ajoutez un contexte utile si besoin." : "Décrivez brièvement le problème rencontré."}
              value={reportDialog.details}
              onChange={(event) => setReportDialog((prev) => ({ ...prev, details: event.target.value }))}
            />
            <div className="modal-ft">
              <button className="btn btn-g" onClick={() => setReportDialog({ open: false, messageId: "", reason: "abus", details: "" })}>Annuler</button>
              <button className="btn btn-p" onClick={() => {
                const details = reportDialog.details.trim();
                void submitReport({ messageId: reportDialog.messageId, reason: reportDialog.reason, details });
                setReportDialog({ open: false, messageId: "", reason: "abus", details: "" });
              }}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
      {connectionNoticeOpen && connectionNotifications.length > 0 && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setConnectionNoticeOpen(false); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="surface-title">Messages Flow</div>
            <div className="surface-sub" style={{ marginBottom: 12 }}>
              Une information importante t’attend sur le site. Ce message s’affiche à la connexion pour ne rien rater.
            </div>
            <div className="panel-list" style={{ marginTop: 12 }}>
              {connectionNotifications.map((notification) => (
                <button
                  key={notification.id}
                  className="panel-item"
                  onClick={() => {
                    setConnectionNoticeOpen(false);
                    openNotificationTarget(notification, { closePanel: false, markRead: true });
                  }}
                >
                  <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{notification.type === "security" ? I.lock : I.bell}</span>
                    <span>{notification.title}</span>
                  </strong>
                  <span>{notification.detail || fmtRel(notification.createdAt)}</span>
                </button>
              ))}
            </div>
            <div className="action-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn btn-g" onClick={() => {
                markNotificationIdsAsRead(connectionNoticeIds);
                setConnectionNoticeOpen(false);
              }}>Marquer comme lu</button>
              <button className="btn" onClick={() => {
                setConnectionNoticeOpen(false);
                setToolbarPanel("notifications");
              }}>Ouvrir le centre</button>
              <button className="btn btn-ghost" onClick={() => setConnectionNoticeOpen(false)}>Plus tard</button>
            </div>
          </div>
        </div>
      )}
      {activeCall.open && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setActiveCall({ open: false, roomName: "", mode: "video", title: "" }); }}>
          <div className="call-modal">
            <div className="call-head">
              <div>
                <div className="surface-title" style={{ fontSize: 18 }}>{activeCall.mode === "video" ? "Appel vidéo" : "Appel audio"}</div>
                <div className="surface-sub">{activeCall.title || "Conversation Flow"} · intégré directement dans l'app.</div>
              </div>
              <div className="calendar-inline-actions">
                <button className="btn btn-g btn-sm" onClick={() => window.open(buildJitsiRoomUrl(activeCall.roomName, activeCall.mode), "_blank", "noopener,noreferrer")}>Ouvrir à part</button>
                <button className="btn btn-d btn-sm" onClick={() => setActiveCall({ open: false, roomName: "", mode: "video", title: "" })}>Fermer</button>
              </div>
            </div>
            <iframe title="Appel Flow" className="call-frame" allow="camera; microphone; fullscreen; display-capture" src={buildJitsiRoomUrl(activeCall.roomName, activeCall.mode)} />
          </div>
        </div>
      )}
      {releaseWidget}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
      </div>
    </>
  );
}
