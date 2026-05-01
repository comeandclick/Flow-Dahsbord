"use client";

/**
 * FlowApp.jsx - Application principale Flow
 *
 * Ce fichier contient le composant principal de l'application Flow.
 * Il gère l'authentification, le dashboard, et tous les modules (notes, contacts, événements, tâches, Shopify).
 *
 * Structure :
 * - États et constantes
 * - Fonctions utilitaires (formatage, API, etc.)
 * - Hooks et effets
 * - Gestionnaires d'événements (submit functions)
 * - Composant principal FlowApp
 * - Rendu conditionnel selon l'état d'authentification
 * - Dashboard avec sections (métriques, focus, mini-widgets)
 * - Sections spécialisées (notes, contacts, événements, tâches, Shopify)
 * - Sidebar et navigation
 * - Modales et overlays
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReleaseWidget } from "./flow/release-ui";
import { RELEASE } from "../lib/release";
import { createEmptyDb } from "../lib/schema";

const RELEASE_LABEL = formatReleaseLabel(RELEASE);
const LAST_EMAIL_KEY = "flow:last-email";
const DASHBOARD_LAYOUT_KEY = "flow:shell-layout";
const SIDEBAR_LOCK_KEY = "flow:sidebar-lock";
const UPDATE_POLL_MS = 45_000;
const AUTO_RELOAD_SECONDS = 12;
const CUSTOM_BACKGROUND_MAX_DIMENSION = 1800;
const CUSTOM_BACKGROUND_QUALITY = 0.84;
const SHOPIFY_PERIODS = [
  { id: "today", label: "Aujourd'hui" },
  { id: "yesterday", label: "Hier" },
  { id: "7d", label: "7 jours" },
  { id: "30d", label: "1 mois" },
  { id: "365d", label: "1 an" },
  { id: "all", label: "Depuis toujours" },
];
const DEFAULT_DASHBOARD_ARRANGEMENT = {
  metrics: ["notes", "tasks", "events", "shopify"],
  focus: ["upcoming", "tasks", "notifications", "shopify"],
  mini: ["contacts", "latest-note", "month-revenue", "background"],
};

function formatReleaseLabel(release) {
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(release.deployedAt)).replace(",", " ·");
  return `v${release.version} · ${formattedDate}`;
}

function normalizeDashboardArrangement(input = {}) {
  return {
    metrics: Array.isArray(input.metrics) && input.metrics.length ? [...input.metrics] : [...DEFAULT_DASHBOARD_ARRANGEMENT.metrics],
    focus: Array.isArray(input.focus) && input.focus.length ? [...input.focus] : [...DEFAULT_DASHBOARD_ARRANGEMENT.focus],
    mini: Array.isArray(input.mini) && input.mini.length ? [...input.mini] : [...DEFAULT_DASHBOARD_ARRANGEMENT.mini],
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  let payload = {};
  const responseText = await response.text();
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch {
    payload = { error: responseText || "Une erreur interne est survenue." };
  }

  if (!response.ok) {
    const error = new Error(payload?.error || "Une erreur interne est survenue.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

function readStoredEmail() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_EMAIL_KEY) || "";
}

function rememberEmail(email) {
  if (typeof window === "undefined") return;
  const normalized = `${email || ""}`.trim().toLowerCase();
  if (!normalized) return;
  window.localStorage.setItem(LAST_EMAIL_KEY, normalized);
}

function readStoredLayout() {
  if (typeof window === "undefined") return "overview";
  return window.localStorage.getItem(DASHBOARD_LAYOUT_KEY) || "overview";
}

function rememberLayout(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DASHBOARD_LAYOUT_KEY, value);
}

function readStoredSidebarLock() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_LOCK_KEY) === "true";
}

function rememberSidebarLock(value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIDEBAR_LOCK_KEY, value ? "true" : "false");
}

function normalizeMessage(error, fallback) {
  return error?.message || fallback;
}

function isReleaseDifferent(remote) {
  if (!remote?.version || !remote?.deployedAt) return false;
  return remote.version !== RELEASE.version || remote.deployedAt !== RELEASE.deployedAt;
}

function initialsFromName(name) {
  return `${name || ""}`
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase() || "FL";
}

function firstName(name) {
  return `${name || ""}`.trim().split(/\s+/)[0] || "Flow";
}

function formatShortDate(value) {
  if (!value) return "Sans date";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatRelative(value) {
  if (!value) return "Maintenant";
  const delta = Date.now() - new Date(value).getTime();
  const abs = Math.abs(delta);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "À l’instant";
  if (abs < hour) return `${Math.round(abs / minute)} min`;
  if (abs < day) return `${Math.round(abs / hour)} h`;
  return `${Math.round(abs / day)} j`;
}

function createChartPoints(values, width = 520, height = 180) {
  const safeValues = values.length ? values : [1, 2, 1, 3, 2];
  const max = Math.max(...safeValues, 1);
  const min = Math.min(...safeValues, 0);
  const spread = Math.max(max - min, 1);
  return safeValues
    .map((value, index) => {
      const x = (index / Math.max(safeValues.length - 1, 1)) * width;
      const y = height - ((value - min) / spread) * (height - 18) - 9;
      return `${x},${y}`;
    })
    .join(" ");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDayLabel(value) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatShopifyDate(value) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value || "—";
  }
}

function formatEventSlot(value, time) {
  if (!value) return "Aucun créneau";
  try {
    const date = new Date(value);
    const day = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    }).format(date);
    return time ? `${day} · ${time}` : day;
  } catch {
    return time ? `${value} · ${time}` : value;
  }
}

function orderItemsByIds(items, order) {
  const rank = new Map((order || []).map((id, index) => [id, index]));
  return [...items].sort((left, right) => {
    const leftRank = rank.has(left.id) ? rank.get(left.id) : 10_000;
    const rightRank = rank.has(right.id) ? rank.get(right.id) : 10_000;
    return leftRank - rightRank;
  });
}

function reorderIds(list, draggedId, overId) {
  if (!draggedId || !overId || draggedId === overId) return list;
  const current = [...list];
  const from = current.indexOf(draggedId);
  const to = current.indexOf(overId);
  if (from === -1 || to === -1) return list;
  current.splice(from, 1);
  current.splice(to, 0, draggedId);
  return current;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`${reader.result || ""}`);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image invalide."));
    image.src = src;
  });
}

async function compressBackgroundFile(file) {
  const rawDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(rawDataUrl);
  const ratio = Math.min(
    1,
    CUSTOM_BACKGROUND_MAX_DIMENSION / Math.max(image.width || 1, image.height || 1),
  );
  const width = Math.max(1, Math.round((image.width || 1) * ratio));
  const height = Math.max(1, Math.round((image.height || 1) * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Préparation du fond impossible.");
  }
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", CUSTOM_BACKGROUND_QUALITY);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfYesterday() {
  const date = startOfToday();
  date.setDate(date.getDate() - 1);
  return date;
}

function startOfTomorrow() {
  const date = startOfToday();
  date.setDate(date.getDate() + 1);
  return date;
}

function startOfYear() {
  const date = startOfToday();
  date.setMonth(0, 1);
  return date;
}

function startOfDaysAgo(days) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date) {
  return new Date(date).toISOString();
}

function safeAmount(value) {
  return Number.parseFloat(value || 0) || 0;
}

function isShopifyOrderCancelled(order) {
  const paymentStatus = `${order?.financial_status || order?.paymentStatus || ""}`.toLowerCase();
  return Boolean(order?.cancelled_at || order?.cancelledAt || order?.cancel_reason || order?.cancelReason || paymentStatus === "voided");
}

function toTimestamp(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfDayFromValue(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getShopifyPeriodBounds(period, orders) {
  const now = new Date();
  const today = startOfToday();
  if (period === "today") return { start: today, end: startOfTomorrow(), mode: "day" };
  if (period === "yesterday") return { start: startOfYesterday(), end: today, mode: "day" };
  if (period === "7d") return { start: startOfDaysAgo(6), end: startOfTomorrow(), mode: "day" };
  if (period === "30d") return { start: startOfDaysAgo(29), end: startOfTomorrow(), mode: "day" };
  if (period === "365d") return { start: startOfDaysAgo(364), end: startOfTomorrow(), mode: "month" };

  const oldest = [...(orders || [])]
    .sort((left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt))[0]?.createdAt;
  const start = oldest ? startOfDayFromValue(oldest) : startOfDaysAgo(29);
  const daySpan = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86_400_000));
  return { start, end: startOfTomorrow(), mode: daySpan > 120 ? "month" : "day" };
}

function filterShopifyOrdersByPeriod(orders, period) {
  const { start, end } = getShopifyPeriodBounds(period, orders);
  return [...(orders || [])]
    .filter((order) => {
      const createdAt = new Date(order.createdAt);
      if (Number.isNaN(createdAt.getTime())) return false;
      if (createdAt < start) return false;
      if (end && createdAt >= end) return false;
      return true;
    })
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
}

function buildShopifyChartData(allOrders, period) {
  const { start, end, mode } = getShopifyPeriodBounds(period, allOrders);
  const currentEnd = end || startOfTomorrow();
  const rangeMs = Math.max(86_400_000, currentEnd.getTime() - start.getTime());
  const previousStart = new Date(start.getTime() - rangeMs);
  const previousEnd = new Date(currentEnd.getTime() - rangeMs);
  const buckets = [];

  if (mode === "month") {
    const cursor = new Date(start);
    cursor.setDate(1);
    const previousCursor = new Date(previousStart);
    previousCursor.setDate(1);
    while (cursor < currentEnd) {
      const currentBucketStart = new Date(cursor);
      const currentBucketEnd = new Date(cursor);
      currentBucketEnd.setMonth(currentBucketEnd.getMonth() + 1);
      const previousBucketStart = new Date(previousCursor);
      const previousBucketEnd = new Date(previousCursor);
      previousBucketEnd.setMonth(previousBucketEnd.getMonth() + 1);
      buckets.push({
        label: new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(currentBucketStart),
        current: 0,
        previous: 0,
        currentBucketStart,
        currentBucketEnd,
        previousBucketStart,
        previousBucketEnd,
      });
      cursor.setMonth(cursor.getMonth() + 1);
      previousCursor.setMonth(previousCursor.getMonth() + 1);
    }
  } else {
    const slots = Math.max(1, Math.ceil(rangeMs / 86_400_000));
    for (let index = 0; index < slots; index += 1) {
      const currentBucketStart = addDays(start, index);
      const currentBucketEnd = addDays(start, index + 1);
      const previousBucketStart = addDays(previousStart, index);
      const previousBucketEnd = addDays(previousStart, index + 1);
      buckets.push({
        label: formatDayLabel(currentBucketStart),
        current: 0,
        previous: 0,
        currentBucketStart,
        currentBucketEnd,
        previousBucketStart,
        previousBucketEnd,
      });
    }
  }

  allOrders.forEach((order) => {
    const createdAt = new Date(order.createdAt);
    const total = safeAmount(order.total);
    for (const bucket of buckets) {
      if (createdAt >= bucket.currentBucketStart && createdAt < bucket.currentBucketEnd) {
        bucket.current += total;
        return;
      }
      if (createdAt >= bucket.previousBucketStart && createdAt < bucket.previousBucketEnd) {
        bucket.previous += total;
        return;
      }
    }
  });

  return buckets.map(({ label, current, previous }) => ({ label, current, previous }));
}

function buildShopifyKpis(orders) {
  return {
    revenue: orders.reduce((sum, order) => sum + safeAmount(order.total), 0),
    orders: orders.length,
    pendingFulfillment: orders.filter((order) => normalizeStatusTone(order.fulfillmentStatus) !== "success").length,
  };
}

function buildLatestVisibleShopifyOrders(orders) {
  const threshold = startOfDaysAgo(3).getTime();
  return [...(orders || [])]
    .filter((order) => {
      const createdAt = toTimestamp(order.createdAt);
      if (createdAt >= threshold) return true;
      return normalizeStatusTone(order.fulfillmentStatus) !== "success";
    })
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
    .slice(0, 12);
}

function sortShopifyOrders(orders, sortBy) {
  const list = [...(orders || [])];
  if (sortBy === "oldest") {
    return list.sort((left, right) => toTimestamp(left.createdAt) - toTimestamp(right.createdAt));
  }
  if (sortBy === "expensive") {
    return list.sort((left, right) => safeAmount(right.total) - safeAmount(left.total));
  }
  if (sortBy === "cheap") {
    return list.sort((left, right) => safeAmount(left.total) - safeAmount(right.total));
  }
  return list.sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));
}

function filterShopifyOrdersByQuery(orders, query) {
  const normalized = `${query || ""}`.trim().toLowerCase();
  if (!normalized) return [...(orders || [])];
  return (orders || []).filter((order) => {
    const searchable = [
      order.number,
      order.customer,
      formatShopifyDate(order.createdAt),
      ...(order.lineItems || []).map((item) => item.title),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(normalized);
  });
}

function createDemoFixtures(user) {
  const now = new Date();
  const isoNow = now.toISOString();
  return {
    notes: [
      {
        id: "demo-note-1",
        title: "Synthese de la semaine",
        content: "Verifier la progression Shopify, confirmer les relances clients et preparer le prochain sprint Flow.",
        cat: "Pilotage",
        color: "#c8cfbf",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "demo-note-2",
        title: "Points de contact prioritaires",
        content: "Central Station, Laura Martin, Samuel Costa, suivi commande premium et preparation support.",
        cat: "Contacts",
        color: "#aeb8a2",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ],
    tasks: [
      {
        id: "demo-task-1",
        title: "Verifier les commandes premium",
        desc: "Controler les commandes du jour et preparer les priorites de fulfillment.",
        prio: "high",
        due: isoNow.slice(0, 10),
        status: "in_progress",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "demo-task-2",
        title: "Appeler Laura Martin",
        desc: "Valider la date de livraison et le besoin de SAV.",
        prio: "med",
        due: addDays(now, 1).toISOString().slice(0, 10),
        status: "todo",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ],
    events: [
      {
        id: "demo-event-1",
        title: "Revue commerciale",
        desc: "Lecture du CA, alertes, et arbitrage commandes en attente.",
        date: isoNow,
        time: "10:30",
        endTime: "11:15",
        createdAt: isoNow,
        attendees: [
          { uid: "demo-contact-1", name: "Laura Martin", email: "laura@atelier.test", username: "laura", phone: "+33610101010", status: "confirmed" },
          { uid: "demo-contact-2", name: "Samuel Costa", email: "samuel@atelier.test", username: "samuel", phone: "+33620202020", status: "confirmed" },
        ],
      },
    ],
    bookmarks: [
      {
        id: "demo-bookmark-1",
        title: "Suivi priorites",
        type: "text",
        text: "Point d'ancrage pour relire les sujets essentiels du compte.",
        note: "Acces rapide au tableau de bord et aux alertes.",
      },
    ],
    notifications: [
      {
        id: "demo-notif-1",
        type: "shopify",
        title: "Commande premium a traiter",
        detail: "Laura Martin attend une confirmation d'expedition aujourd'hui.",
        createdAt: isoNow,
        readAt: "",
      },
      {
        id: "demo-notif-2",
        type: "agenda",
        title: "Revue commerciale planifiee",
        detail: "Le point de 10:30 est pret avec les contacts relies.",
        createdAt: addDays(now, -1).toISOString(),
        readAt: "",
      },
    ],
    activity: [
      {
        id: "demo-activity-1",
        type: "seed",
        title: "Jeu de donnees de travail active",
        detail: `Compte ${user?.email || "Flow"} rempli pour accelerer le developpement.`,
        createdAt: isoNow,
      },
    ],
    shopifyOrders: Array.from({ length: 12 }, (_, index) => {
      const createdAt = addDays(now, -index).toISOString();
      const total = 48 + index * 17;
      return {
        id: `demo-shopify-${index + 1}`,
        name: `#10${index + 1}`,
        order_number: `${1000 + index + 1}`,
        created_at: createdAt,
        cancelled_at: "",
        cancel_reason: "",
        total_price: `${total}`,
        financial_status: index % 4 === 0 ? "pending" : "paid",
        fulfillment_status: index % 3 === 0 ? "unfulfilled" : "fulfilled",
        email: `client${index + 1}@atelier.test`,
        customer: {
          first_name: ["Laura", "Noah", "Mila", "Adam", "Chloe", "Lina"][index % 6],
          last_name: ["Martin", "Costa", "Pires", "Santos", "Bernard", "Lopez"][index % 6],
        },
        line_items: [
          {
            product_id: `prod-${(index % 4) + 1}`,
            variant_id: `var-${index + 1}`,
            title: ["Oreiller Cloud", "Pack Nuit", "Brume Relax", "Drap Signature"][index % 4],
            quantity: (index % 3) + 1,
            price: `${Math.max(18, Math.round(total / ((index % 3) + 1)))}`,
          },
        ],
      };
    }),
  };
}

function buildDashboardFeed(db) {
  const source = db || createEmptyDb();
  const activity = [...(source.activity || [])]
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt))
    .slice(0, 5);
  if (activity.length) {
    return activity.map((item) => ({
      id: item.id,
      title: item.title || "Activité",
      subtitle: item.detail || item.type || "Mise à jour",
      meta: formatRelative(item.createdAt),
    }));
  }

  const fallback = [
    ...(source.tasks || []).slice(0, 2).map((item) => ({
      id: `task:${item.id}`,
      title: item.title || "Tâche",
      subtitle: item.status || "En cours",
      meta: item.dueDate ? formatShortDate(item.dueDate) : "Sans date",
    })),
    ...(source.events || []).slice(0, 2).map((item) => ({
      id: `event:${item.id}`,
      title: item.title || "Événement",
      subtitle: item.desc || "Planifié",
      meta: item.date ? formatShortDate(item.date) : "À venir",
    })),
    ...(source.notes || []).slice(0, 1).map((item) => ({
      id: `note:${item.id}`,
      title: item.title || "Note",
      subtitle: item.cat || "Brouillon",
      meta: "Note",
    })),
  ];

  return fallback.slice(0, 5);
}

function buildShopifyQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, `${value}`);
  });
  return search.toString();
}

async function fetchShopifyProxy(endpoint, params = {}) {
  const response = await fetch(`/api/shopify?endpoint=${encodeURIComponent(endpoint)}&params=${encodeURIComponent(buildShopifyQuery(params))}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "Shopify inaccessible");
  }
  if (payload && payload.ready === false) {
    throw new Error(payload?.error || "Shopify non configuré");
  }
  return payload;
}

function summarizeShopifyData({ orders }) {
  const allOrders = [...(orders || [])]
    .map((order) => ({
      id: order.id,
      number: order.name || `#${order.order_number || order.id}`,
      createdAt: order.created_at,
      cancelledAt: order.cancelled_at || "",
      cancelReason: order.cancel_reason || "",
      customer: order.customer?.first_name || order.customer?.last_name
        ? `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim()
        : order.email || "Client inconnu",
      total: safeAmount(order.total_price),
      paymentStatus: order.financial_status || "pending",
      fulfillmentStatus: order.fulfillment_status || "unfulfilled",
      lineItems: order.line_items || [],
    }))
    .filter((order) => !isShopifyOrderCancelled(order))
    .sort((left, right) => toTimestamp(right.createdAt) - toTimestamp(left.createdAt));

  const monthStart = startOfMonth().getTime();
  const topProductsMap = new Map();
  allOrders.forEach((order) => {
    if (toTimestamp(order.createdAt) < monthStart) return;
    (order.lineItems || []).forEach((item) => {
      const key = item.product_id || item.variant_id || item.title;
      const current = topProductsMap.get(key) || {
        id: key,
        title: item.title || "Produit",
        quantity: 0,
        revenue: 0,
      };
      current.quantity += Number(item.quantity) || 0;
      current.revenue += safeAmount(item.price) * (Number(item.quantity) || 0);
      topProductsMap.set(key, current);
    });
  });

  return {
    allOrders,
    topProducts: [...topProductsMap.values()]
      .sort((left, right) => right.quantity - left.quantity)
      .slice(0, 5),
  };
}

function normalizeStatusTone(status) {
  const value = `${status || ""}`.toLowerCase();
  if (["paid", "fulfilled", "success"].includes(value)) return "success";
  if (["pending", "authorized", "partially_fulfilled", "unfulfilled"].includes(value)) return "warning";
  return "danger";
}

function buildSearchEntries(db, user) {
  const source = db || createEmptyDb();
  const seen = new Set();
  const items = [];

  function push(item) {
    const key = item.key || `${item.kind}:${item.id || item.title}`;
    if (!item.title || seen.has(key)) return;
    seen.add(key);
    items.push({ ...item, key });
  }

  push({
    key: `contact:user:${user?.uid || "self"}`,
    kind: "contact",
    id: user?.uid || "self",
    title: source.profile?.fullName || user?.name || "Mon compte",
    subtitle: source.profile?.email || user?.email || "",
    body: source.profile?.phone || "Compte principal",
    section: "contacts",
  });

  source.notes.forEach((note) =>
    push({
      kind: "note",
      id: note.id,
      title: note.title || "Note sans titre",
      subtitle: note.cat || "Note",
      body: note.content || "",
      section: "notes",
    }),
  );

  source.tasks.forEach((task) =>
    push({
      kind: "task",
      id: task.id,
      title: task.title || "Tâche sans titre",
      subtitle: task.status || "Tâche",
      body: task.desc || "",
      section: "tasks",
    }),
  );

  source.events.forEach((event) => {
    push({
      kind: "event",
      id: event.id,
      title: event.title || "Événement sans titre",
      subtitle: event.date || "Événement",
      body: event.desc || "",
      section: "events",
    });

    (event.attendees || []).forEach((attendee) =>
      push({
        key: `contact:${attendee.uid || attendee.email || attendee.name}`,
        kind: "contact",
        id: attendee.uid || attendee.email || attendee.name,
        title: attendee.name || attendee.email || "Contact",
        subtitle: attendee.email || attendee.username || "Participant",
        body: attendee.phone || "",
        section: "contacts",
      }),
    );
  });

  source.bookmarks.forEach((bookmark) =>
    push({
      kind: "bookmark",
      id: bookmark.id,
      title: bookmark.title || "Signet",
      subtitle: bookmark.sourceLabel || bookmark.url || "Signet",
      body: bookmark.note || bookmark.previewText || "",
      section: "notes",
    }),
  );

  return items;
}

function getShellSettings(db) {
  const settings = db?.settings || {};
  return {
    theme: settings.theme === "light" ? "light" : "dark",
    dashboardLayout: settings.dashboardLayout === "immersive" ? "immersive" : "overview",
    sidebarLocked: Boolean(settings.sidebarLocked),
  };
}

function Icon({ name, size = 18, stroke = 1.8 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  switch (name) {
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.8-3.8" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5Z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" rx="3" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
    case "unlock":
      return (
        <svg {...common}>
          <rect x="5" y="11" width="14" height="10" rx="3" />
          <path d="M8 11V8a4 4 0 0 1 7-2.5" />
        </svg>
      );
    case "grid":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </svg>
      );
    case "note":
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v6h6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3.5" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.85" />
          <path d="M15.5 3.15a3.5 3.5 0 0 1 0 6.7" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 13 4 4L19 7" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l2-5 4 10 2-5h6" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 0 1-15.4 6.4" />
          <path d="M3 12A9 9 0 0 1 18.4 5.6" />
          <path d="M3 16v-4h4" />
          <path d="M17 8h4v-4" />
        </svg>
      );
    case "bag":
      return (
        <svg {...common}>
          <path d="M6 8h12l1 12H5L6 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "sliders":
      return (
        <svg {...common}>
          <path d="M4 21v-7M4 10V3M12 21v-3M12 14V3M20 21v-9M20 8V3" />
          <path d="M2 14h4M10 10h4M18 8h4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function AuthTabButton({ active, onClick, children }) {
  return (
    <button type="button" className={`auth-tab ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, autoComplete, disabled = false, name }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
      />
    </label>
  );
}

function SettingQuickButton({ active, onClick, children }) {
  return (
    <button type="button" className={`setting-option compact ${active ? "active" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

function NavItem({ active, icon, label, collapsed, onClick }) {
  return (
    <button type="button" className={`nav-item ${active ? "active" : ""} ${collapsed ? "collapsed" : ""}`} onClick={onClick}>
      <span className="nav-icon"><Icon name={icon} size={18} /></span>
      <span className="nav-label">{label}</span>
    </button>
  );
}

function ResultIcon({ kind }) {
  if (kind === "note" || kind === "bookmark") return <Icon name="note" size={16} />;
  if (kind === "contact") return <Icon name="users" size={16} />;
  if (kind === "event") return <Icon name="calendar" size={16} />;
  if (kind === "task") return <Icon name="check" size={16} />;
  return <Icon name="grid" size={16} />;
}

export default function FlowApp() {
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState("");
  const [providers, setProviders] = useState({ google: false, email: false });
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(createEmptyDb());
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [shopifyGuideOpen, setShopifyGuideOpen] = useState(false);
  const [remoteRelease, setRemoteRelease] = useState(RELEASE);
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [reloadCountdown, setReloadCountdown] = useState(AUTO_RELOAD_SECONDS);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [register, setRegister] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [reset, setReset] = useState({ email: "", code: "", password: "" });
  const [searchValue, setSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [shellTheme, setShellTheme] = useState("dark");
  const [dashboardLayout, setDashboardLayout] = useState("overview");
  const [sidebarLocked, setSidebarLocked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [backgroundBusy, setBackgroundBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [domReady, setDomReady] = useState(false);
  const [dashboardArrangement, setDashboardArrangement] = useState(() => normalizeDashboardArrangement());
  const [draggingCard, setDraggingCard] = useState(null);
  const [settingsTab, setSettingsTab] = useState("account");
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    username: "",
    fullName: "",
    phone: "",
    phoneVisible: false,
    photoUrl: "",
    currentPassword: "",
    newPassword: "",
  });
  const [shopifyPeriod, setShopifyPeriod] = useState("30d");
  const [shopifyOrderSort, setShopifyOrderSort] = useState("recent");
  const [shopifyOrderQuery, setShopifyOrderQuery] = useState("");
  const [shopifyDomainInput, setShopifyDomainInput] = useState("");
  const [shopifyTokenInput, setShopifyTokenInput] = useState("");
  const [shopifyConfigBusy, setShopifyConfigBusy] = useState(false);
  const [shopifyState, setShopifyState] = useState({
    loading: false,
    error: "",
    data: null,
    refreshedAt: "",
    ready: false,
    storeDomain: "",
  });
  const intervalRef = useRef(null);
  const reloadTimerRef = useRef(null);
  const searchWrapRef = useRef(null);
  const notifRef = useRef(null);
  const commandInputRef = useRef(null);
  const backgroundInputRef = useRef(null);

  const releaseMeta = useMemo(() => formatReleaseLabel(remoteRelease || RELEASE), [remoteRelease]);
  const searchEntries = useMemo(() => buildSearchEntries(db, user), [db, user]);
  const unreadNotifications = useMemo(
    () => (db.notifications || []).filter((item) => !item.readAt).length,
    [db.notifications],
  );

  const dashboardMetrics = useMemo(() => {
    const uniqueContacts = new Map();
    (db.events || []).forEach((event) => {
      (event.attendees || []).forEach((attendee) => {
        const key = attendee.uid || attendee.email || attendee.name;
        if (key) uniqueContacts.set(key, attendee);
      });
    });

    return {
      notes: db.notes.length,
      tasks: db.tasks.filter((item) => item.status !== "done").length,
      events: db.events.length,
      contacts: uniqueContacts.size + 1,
      notifications: unreadNotifications,
      activity: db.activity.length,
      bookmarks: db.bookmarks.length,
    };
  }, [db, unreadNotifications]);

  const dashboardFeed = useMemo(() => buildDashboardFeed(db), [db]);
  const notificationFeed = useMemo(() => {
    return [...(db.notifications || [])]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 8);
  }, [db.notifications]);
  const upcomingEvents = useMemo(
    () =>
      [...(db.events || [])]
        .filter((item) => toTimestamp(item.date) >= startOfToday().getTime())
        .sort((left, right) => toTimestamp(left.date) - toTimestamp(right.date))
        .slice(0, 3),
    [db.events],
  );
  const openTasks = useMemo(
    () =>
      [...(db.tasks || [])]
        .filter((item) => item.status !== "done")
        .sort((left, right) => {
          const leftDue = toTimestamp(left.due || left.createdAt);
          const rightDue = toTimestamp(right.due || right.createdAt);
          return leftDue - rightDue;
        })
        .slice(0, 4),
    [db.tasks],
  );
  const recentNotes = useMemo(
    () =>
      [...(db.notes || [])]
        .sort((left, right) => toTimestamp(right.updatedAt || right.createdAt) - toTimestamp(left.updatedAt || left.createdAt))
        .slice(0, 3),
    [db.notes],
  );
  const activeShopifyPeriodLabel = useMemo(
    () => SHOPIFY_PERIODS.find((item) => item.id === shopifyPeriod)?.label || "1 mois",
    [shopifyPeriod],
  );

  const currentThemeBackground = useMemo(() => {
    const customBackgrounds = db.settings?.customBackgrounds || {};
    return shellTheme === "light" ? customBackgrounds.light || "" : customBackgrounds.dark || "";
  }, [db.settings?.customBackgrounds, shellTheme]);
  const profilePhotoUrl = db.profile?.photoUrl || "";
  const storedShopifyConfig = db.settings?.shopify || {};
  const shopifyDemoOrders = db.settings?.demoFixtures?.shopifyOrders || [];

  const flowShellStyle = useMemo(() => {
    if (!currentThemeBackground) return undefined;
    const overlay = shellTheme === "light"
      ? "linear-gradient(180deg, rgba(214,220,227,0.42), rgba(169,177,188,0.84))"
      : "linear-gradient(180deg, rgba(6,8,11,0.42), rgba(6,8,11,0.88))";
    return {
      background: `${overlay}, url("${currentThemeBackground}") center center / cover no-repeat fixed`,
    };
  }, [currentThemeBackground, shellTheme]);

  const immersiveBackgroundStyle = useMemo(() => {
    if (!currentThemeBackground) return undefined;
    const overlay = shellTheme === "light"
      ? "linear-gradient(180deg, rgba(214,220,227,0.24), rgba(166,174,185,0.8))"
      : "linear-gradient(180deg, rgba(10,12,14,0.18), rgba(10,12,14,0.78))";
    return {
      background: `${overlay}, url("${currentThemeBackground}") center center / cover no-repeat`,
    };
  }, [currentThemeBackground, shellTheme]);

  const filteredShopifyOrders = useMemo(
    () => filterShopifyOrdersByPeriod(shopifyState.data?.allOrders || [], shopifyPeriod),
    [shopifyPeriod, shopifyState.data],
  );

  const visibleShopifyChart = useMemo(
    () => buildShopifyChartData(shopifyState.data?.allOrders || [], shopifyPeriod),
    [shopifyPeriod, shopifyState.data],
  );

  const visibleShopifyOrders = useMemo(
    () => buildLatestVisibleShopifyOrders(filteredShopifyOrders),
    [filteredShopifyOrders],
  );

  const shopifyOrdersPageRows = useMemo(() => {
    const queried = filterShopifyOrdersByQuery(filteredShopifyOrders, shopifyOrderQuery);
    return sortShopifyOrders(queried, shopifyOrderSort);
  }, [filteredShopifyOrders, shopifyOrderQuery, shopifyOrderSort]);

  const shopifyOverview = useMemo(() => {
    const current = buildShopifyKpis(filteredShopifyOrders);
    const monthOrders = (shopifyState.data?.allOrders || []).filter((order) => toTimestamp(order.createdAt) >= startOfMonth().getTime());
    return {
      revenueCurrent: current.revenue,
      ordersCurrent: current.orders,
      pendingFulfillment: current.pendingFulfillment,
      revenueMonth: buildShopifyKpis(monthOrders).revenue,
    };
  }, [filteredShopifyOrders, shopifyState.data]);

  const searchResults = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    const items = query
      ? searchEntries.filter((item) =>
          [item.title, item.subtitle, item.body, item.kind]
            .filter(Boolean)
            .some((value) => `${value}`.toLowerCase().includes(query)),
        )
      : searchEntries.slice(0, 8);
    return items.slice(0, 10);
  }, [searchEntries, searchValue]);

  const chartPoints = useMemo(
    () =>
      createChartPoints([
        Math.max(dashboardMetrics.notes, 1),
        Math.max(dashboardMetrics.tasks + 1, 1),
        Math.max(dashboardMetrics.events + 1, 1),
        Math.max(dashboardMetrics.contacts, 1),
        Math.max(dashboardMetrics.notifications + 1, 1),
        Math.max(dashboardMetrics.bookmarks + 1, 1),
      ]),
    [dashboardMetrics],
  );

  const dashboardCards = useMemo(
    () => [
      {
        id: "notes",
        section: "notes",
        label: "Notes actives",
        value: `${dashboardMetrics.notes}`,
        meta: recentNotes[0]?.title || `${dashboardMetrics.bookmarks} signet(s)`,
        icon: "note",
        primary: true,
      },
      {
        id: "tasks",
        section: "tasks",
        label: "À traiter",
        value: `${dashboardMetrics.tasks}`,
        meta: openTasks[0]?.title || "Aucune tâche urgente",
        icon: "check",
      },
      {
        id: "events",
        section: "events",
        label: "Agenda",
        value: `${dashboardMetrics.events}`,
        meta: upcomingEvents[0] ? formatEventSlot(upcomingEvents[0].date, upcomingEvents[0].time) : "Aucun créneau",
        icon: "calendar",
      },
      {
        id: "shopify",
        section: "shopify",
        label: `Shopify · ${activeShopifyPeriodLabel}`,
        value: formatCurrency(shopifyOverview.revenueCurrent),
        meta: shopifyState.ready ? `${shopifyOverview.ordersCurrent} commande(s) · ${shopifyOverview.pendingFulfillment} à traiter` : "Aucune boutique connectée",
        icon: "bag",
      },
    ],
    [activeShopifyPeriodLabel, dashboardMetrics, openTasks, recentNotes, shopifyOverview, shopifyState.ready, upcomingEvents],
  );

  const dashboardFocusCards = useMemo(
    () => [
      {
        id: "upcoming",
        title: upcomingEvents[0]?.title || "Aucun événement proche",
        body: upcomingEvents[0] ? formatEventSlot(upcomingEvents[0].date, upcomingEvents[0].time) : "Ajoute un créneau ou utilise la recherche.",
        onClick: () => (upcomingEvents[0] ? setActiveSection("events") : setCommandOpen(true)),
      },
      {
        id: "tasks",
        title: openTasks[0]?.title || "Aucune tâche urgente",
        body: openTasks[0]?.desc || "Tes prochaines tâches apparaîtront ici.",
        onClick: () => (openTasks[0] ? setActiveSection("tasks") : setCommandOpen(true)),
      },
      {
        id: "notifications",
        title: unreadNotifications ? `${unreadNotifications} notification(s) à lire` : "Centre de notifications propre",
        body: notificationFeed[0]?.detail || "Le panneau reste prêt pour les retours modules et système.",
        onClick: () => setNotificationOpen(true),
      },
      {
        id: "shopify",
        title: shopifyState.ready ? `${shopifyState.storeDomain}` : "Shopify non connecté",
        body: shopifyState.ready ? `${shopifyOverview.pendingFulfillment} commande(s) à traiter.` : "Connecte une boutique ou injecte une démo de travail.",
        onClick: () => setActiveSection("shopify"),
      },
    ],
    [notificationFeed, openTasks, shopifyOverview.pendingFulfillment, shopifyState.ready, shopifyState.storeDomain, unreadNotifications, upcomingEvents],
  );

  const dashboardMiniCards = useMemo(
    () => [
      {
        id: "contacts",
        title: "Contacts suivis",
        body: `${dashboardMetrics.contacts} contact(s) reliés à tes événements et à ton compte.`,
        onClick: () => setActiveSection("contacts"),
      },
      {
        id: "latest-note",
        title: "Dernière note",
        body: recentNotes[0]?.title || "Aucune note récente.",
        onClick: () => setActiveSection("notes"),
      },
      {
        id: "month-revenue",
        title: "CA du mois",
        body: formatCurrency(shopifyOverview.revenueMonth),
        onClick: () => setActiveSection("shopify"),
      },
      {
        id: "background",
        title: "Fond actif",
        body: currentThemeBackground ? "Image personnalisée active." : "Fond de base actif.",
        onClick: () => setActiveSection("profile"),
      },
    ],
    [currentThemeBackground, dashboardMetrics.contacts, recentNotes, shopifyOverview.revenueMonth],
  );

  const orderedDashboardCards = useMemo(
    () => orderItemsByIds(dashboardCards, dashboardArrangement.metrics),
    [dashboardArrangement.metrics, dashboardCards],
  );
  const orderedDashboardFocusCards = useMemo(
    () => orderItemsByIds(dashboardFocusCards, dashboardArrangement.focus),
    [dashboardArrangement.focus, dashboardFocusCards],
  );
  const orderedDashboardMiniCards = useMemo(
    () => orderItemsByIds(dashboardMiniCards, dashboardArrangement.mini),
    [dashboardArrangement.mini, dashboardMiniCards],
  );

  const settingsItems = useMemo(
    () => [
      { id: "account", label: "My Account" },
      { id: "appearance", label: "Appearance" },
      { id: "privacy", label: "Privacy & Safety" },
      { id: "integrations", label: "Integrations" },
      { id: "billing", label: "Billing" },
      { id: "notifications", label: "Notifications" },
      { id: "language", label: "Language" },
      { id: "keys", label: "Key Bindings" },
      { id: "advanced", label: "Advanced" },
    ],
    [],
  );

  const navSections = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", icon: "grid" },
      { id: "notes", label: "Notes", icon: "note" },
      { id: "contacts", label: "Contacts", icon: "users" },
      { id: "events", label: "Événements", icon: "calendar" },
      { id: "tasks", label: "Tâches", icon: "check" },
      { id: "shopify", label: "Shopify", icon: "bag" },
      { id: "profile", label: "Paramètres", icon: "sliders" },
    ],
    [],
  );

  const effectiveLayout = isMobile ? "overview" : dashboardLayout;
  const sidebarExpanded = isMobile ? mobileNavOpen : sidebarLocked || sidebarHover;
  const shellCollapsedClass = !sidebarExpanded && !isMobile ? "collapsed" : "";
  const themeClass = shellTheme === "light" ? "theme-light" : "theme-dark";
  const shouldShowSidebar = effectiveLayout !== "immersive";
  const sidebarShowsDetails = isMobile || sidebarExpanded;

  useEffect(() => {
    const savedEmail = readStoredEmail();
    if (!savedEmail) return;
    setLogin((current) => ({ ...current, email: current.email || savedEmail }));
    setRegister((current) => ({ ...current, email: current.email || savedEmail }));
    setReset((current) => ({ ...current, email: current.email || savedEmail }));
  }, []);

  useEffect(() => {
    setDomReady(true);
  }, []);

  useEffect(() => {
    function updateViewport() {
      setIsMobile(window.innerWidth <= 980);
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousBodyHeight = body.style.height;
    const previousHtmlHeight = documentElement.style.height;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    body.style.height = "100%";
    documentElement.style.height = "100%";
    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
      body.style.height = previousBodyHeight;
      documentElement.style.height = previousHtmlHeight;
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = window.setTimeout(() => setError(""), 4000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!isMobile) return;
    setMobileNavOpen(false);
  }, [isMobile]);

  useEffect(() => {
    setAccountForm({
      name: user?.name || "",
      email: user?.email || "",
      username: db.profile?.username || "",
      fullName: db.profile?.fullName || user?.name || "",
      phone: db.profile?.phone || "",
      phoneVisible: Boolean(db.profile?.phoneVisible),
      photoUrl: db.profile?.photoUrl || "",
      currentPassword: "",
      newPassword: "",
    });
  }, [db.profile, user]);

  useEffect(() => {
    setDashboardArrangement(normalizeDashboardArrangement(db.settings?.dashboardArrangement));
  }, [db.settings?.dashboardArrangement]);

  useEffect(() => {
    const config = db.settings?.shopify || {};
    setShopifyDomainInput(config.storeDomain || "");
    setShopifyTokenInput(config.accessToken || "");
  }, [db.settings?.shopify?.storeDomain, db.settings?.shopify?.accessToken]);

  async function refreshShopifyData() {
    setShopifyState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const statusPayload = await fetchShopifyProxy("__status");
      if (statusPayload?.ready === false) {
        if (shopifyDemoOrders.length) {
          const data = summarizeShopifyData({ orders: shopifyDemoOrders });
          setShopifyState({
            loading: false,
            error: "",
            data,
            refreshedAt: db.settings?.demoFixtures?.seededAt || new Date().toISOString(),
            ready: false,
            storeDomain: "",
          });
          return;
        }
        setShopifyState({
          loading: false,
          error: statusPayload?.error || "Aucune boutique Shopify n'est connectee sur ce compte.",
          data: null,
          refreshedAt: "",
          ready: false,
          storeDomain: "",
        });
        return;
      }

      const ordersPayload = await fetchShopifyProxy("orders", {
        status: "any",
        limit: 250,
        fields: "id,name,order_number,created_at,cancelled_at,cancel_reason,total_price,financial_status,fulfillment_status,customer,email,line_items",
        order: "created_at desc",
      });

      const data = summarizeShopifyData({
        orders: ordersPayload.orders || [],
      });

      setShopifyState({
        loading: false,
        error: "",
        data,
        refreshedAt: new Date().toISOString(),
        ready: true,
        storeDomain: statusPayload?.storeDomain || "",
      });
    } catch (shopError) {
      setShopifyState((current) => ({
        ...current,
        loading: false,
        error: shopError?.message || "Shopify inaccessible",
        ready: false,
      }));
    }
  }

  useEffect(() => {
    if (!user) return;
    if (shopifyState.data || shopifyState.loading) return;
    void refreshShopifyData();
  }, [user, shopifyDemoOrders.length]);

  useEffect(() => {
    if (user) return;
    setShopifyState({
      loading: false,
      error: "",
      data: null,
      refreshedAt: "",
      ready: false,
      storeDomain: "",
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const sessionPayload = await api("/api/session").catch(() => ({ user: null, admin: false, db: createEmptyDb() }));
        if (cancelled) return;

        const nextDb = sessionPayload?.db || createEmptyDb();
        const shellSettings = getShellSettings(nextDb);
        setUser(sessionPayload?.user || null);
        setDb(nextDb);
        setIsAdmin(Boolean(sessionPayload?.admin));
        setShellTheme(shellSettings.theme);
        setDashboardLayout(shellSettings.dashboardLayout || readStoredLayout());
        setSidebarLocked(shellSettings.sidebarLocked || readStoredSidebarLock());
        setBooting(false);

        const [providerPayload, releasePayload] = await Promise.all([
          api("/api/auth/providers").catch(() => ({ google: false, email: false })),
          api("/api/release/current").catch(() => RELEASE),
        ]);
        if (cancelled) return;

        setProviders({
          google: Boolean(providerPayload?.google),
          email: Boolean(providerPayload?.email),
        });
        setRemoteRelease(releasePayload?.version ? releasePayload : RELEASE);

        const params = new URLSearchParams(window.location.search);
        const googleState = params.get("authGoogle");
        if (googleState === "success") {
          setNotice("Connexion Google réussie.");
        } else if (googleState === "missing-config") {
          setError("Google n'est pas encore configuré sur cet environnement.");
        } else if (googleState === "cancelled") {
          setError("Connexion Google annulée.");
        } else if (googleState === "failed") {
          setError("Connexion Google impossible. Vérifie la configuration OAuth.");
        } else if (googleState === "invalid-state") {
          setError("État OAuth invalide. Relance la connexion Google.");
        } else if (googleState === "missing-code") {
          setError("Code Google manquant. Relance la connexion.");
        }

        if (googleState) {
          params.delete("authGoogle");
          const next = params.toString();
          window.history.replaceState({}, "", next ? `/?${next}` : "/");
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    async function pollRelease() {
      try {
        const payload = await api("/api/release/current");
        setRemoteRelease(payload?.version ? payload : RELEASE);
        if (isReleaseDifferent(payload)) {
          setAvailableUpdate(payload);
          setNotice(`Nouvelle version disponible: v${payload.version}.`);
        }
      } catch {}
    }

    void pollRelease();
    intervalRef.current = window.setInterval(() => {
      void pollRelease();
    }, UPDATE_POLL_MS);

    const onFocus = () => void pollRelease();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void pollRelease();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    const onMessage = (event) => {
      if (event?.data?.type !== "flow-release-refresh") return;
      setAvailableUpdate({
        version: event?.data?.version || RELEASE.version,
        deployedAt: new Date().toISOString(),
        summary: "Une nouvelle version vient d’être publiée.",
      });
      setNotice("Une mise à jour a été détectée en direct.");
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  useEffect(() => {
    if (!availableUpdate) {
      setReloadCountdown(AUTO_RELOAD_SECONDS);
      if (reloadTimerRef.current) window.clearInterval(reloadTimerRef.current);
      return undefined;
    }

    setReloadCountdown(AUTO_RELOAD_SECONDS);
    reloadTimerRef.current = window.setInterval(() => {
      setReloadCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(reloadTimerRef.current);
          window.location.reload();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (reloadTimerRef.current) window.clearInterval(reloadTimerRef.current);
    };
  }, [availableUpdate]);

  useEffect(() => {
    function onKeyDown(event) {
      const wantsPalette = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (wantsPalette) {
        event.preventDefault();
        setCommandOpen(true);
        setSearchOpen(false);
        setNotificationOpen(false);
        return;
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
        setCommandOpen(false);
        setMobileNavOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    window.setTimeout(() => {
      commandInputRef.current?.focus();
    }, 40);
  }, [commandOpen]);

  useEffect(() => {
    const overlayActive = commandOpen || shopifyGuideOpen || releaseOpen || searchOpen || notificationOpen;
    document.body.style.overflow = overlayActive ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [commandOpen, shopifyGuideOpen, releaseOpen, searchOpen, notificationOpen]);

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotificationOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function syncEmailAcrossForms(email) {
    setLogin((current) => ({ ...current, email }));
    setRegister((current) => ({ ...current, email }));
    setReset((current) => ({ ...current, email }));
  }

  async function refreshSession() {
    const payload = await api("/api/session");
    const nextDb = payload?.db || createEmptyDb();
    const settings = getShellSettings(nextDb);
    setUser(payload?.user || null);
    setDb(nextDb);
    setIsAdmin(Boolean(payload?.admin));
    setShellTheme(settings.theme);
    setDashboardLayout(settings.dashboardLayout);
    setSidebarLocked(settings.sidebarLocked);
    return payload;
  }

  async function persistDb(nextDb, optimistic = null) {
    const previousDb = db;
    setDb(nextDb);
    if (optimistic) setNotice(optimistic);
    try {
      const payload = await api("/api/db", {
        method: "PUT",
        body: JSON.stringify({ db: nextDb }),
      });
      setDb(payload?.db || nextDb);
      return payload?.db || nextDb;
    } catch (persistError) {
      setDb(previousDb);
      setError(normalizeMessage(persistError, "Sauvegarde impossible."));
      throw persistError;
    }
  }

  function nextDbWithSettings(patch) {
    return {
      ...db,
      settings: {
        ...(db.settings || {}),
        ...patch,
      },
    };
  }

  async function applyTheme(nextTheme) {
    setShellTheme(nextTheme);
    const nextDb = nextDbWithSettings({ theme: nextTheme });
    try {
      await persistDb(nextDb);
    } catch {
      setShellTheme(db?.settings?.theme === "light" ? "light" : "dark");
    }
  }

  async function applyLayout(nextLayout) {
    if (isMobile && nextLayout === "immersive") {
      setNotice("La vue immersive reste réservée au desktop.");
      return;
    }
    setDashboardLayout(nextLayout);
    rememberLayout(nextLayout);
    const nextDb = nextDbWithSettings({ dashboardLayout: nextLayout });
    try {
      await persistDb(nextDb);
    } catch {
      setDashboardLayout(getShellSettings(db).dashboardLayout);
    }
  }

  async function applySidebarLock(nextValue) {
    if (isMobile) return;
    setSidebarLocked(nextValue);
    rememberSidebarLock(nextValue);
    const nextDb = nextDbWithSettings({ sidebarLocked: nextValue });
    try {
      await persistDb(nextDb);
    } catch {
      setSidebarLocked(getShellSettings(db).sidebarLocked);
    }
  }

  async function applyCustomBackground(nextImage) {
    const themeKey = shellTheme === "light" ? "light" : "dark";
    const nextDb = nextDbWithSettings({
      customBackgrounds: {
        ...(db.settings?.customBackgrounds || {}),
        [themeKey]: nextImage,
      },
    });
    await persistDb(nextDb, nextImage ? "Fond mis à jour." : "Fond réinitialisé.");
  }

  async function importBackgroundFromDevice(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBackgroundBusy(true);
    setError("");
    try {
      const compressed = await compressBackgroundFile(file);
      await applyCustomBackground(compressed);
    } catch (uploadError) {
      setError(normalizeMessage(uploadError, "Import du fond impossible."));
    } finally {
      setBackgroundBusy(false);
    }
  }

  async function markNotificationsAsRead(ids = []) {
    const date = new Date().toISOString();
    const nextDb = {
      ...db,
      notifications: db.notifications.map((item) =>
        ids.length === 0 || ids.includes(item.id)
          ? { ...item, readAt: item.readAt || date }
          : item,
      ),
    };
    await persistDb(nextDb);
  }

  async function submitLogin(event) {
    event.preventDefault();
    if (busy) return;
    setBusy("login");
    setError("");
    setNotice("");
    try {
      const payload = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(login),
      });
      rememberEmail(login.email);
      syncEmailAcrossForms(login.email);
      setUser(payload?.user || null);
      setDb(payload?.db || createEmptyDb());
      setIsAdmin(Boolean(payload?.admin));
      const settings = getShellSettings(payload?.db || createEmptyDb());
      setShellTheme(settings.theme);
      setDashboardLayout(settings.dashboardLayout || readStoredLayout());
      setSidebarLocked(settings.sidebarLocked || readStoredSidebarLock());
      setNotice("Connexion réussie.");
      setLogin((current) => ({ ...current, password: "" }));
    } catch (authError) {
      setError(normalizeMessage(authError, "Connexion impossible."));
    } finally {
      setBusy("");
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    if (busy) return;
    setBusy("register");
    setError("");
    setNotice("");

    if (!register.name.trim()) {
      setError("Le nom est requis.");
      setBusy("");
      return;
    }
    if (register.password !== register.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      setBusy("");
      return;
    }

    try {
      const payload = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: register.name,
          email: register.email,
          password: register.password,
        }),
      });
      rememberEmail(register.email);
      syncEmailAcrossForms(register.email);
      setUser(payload?.user || null);
      setDb(payload?.db || createEmptyDb());
      setIsAdmin(Boolean(payload?.admin));
      setShellTheme("dark");
      setDashboardLayout(readStoredLayout());
      setSidebarLocked(readStoredSidebarLock());
      setRegister((current) => ({ ...current, password: "", confirmPassword: "" }));
      setNotice("Compte créé. La session est ouverte.");
    } catch (registerError) {
      setError(normalizeMessage(registerError, "Création de compte impossible."));
    } finally {
      setBusy("");
    }
  }

  async function requestResetCode(event) {
    event.preventDefault();
    if (busy) return;
    setBusy("request-reset");
    setError("");
    setNotice("");
    try {
      const payload = await api("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: reset.email }),
      });
      rememberEmail(reset.email);
      syncEmailAcrossForms(reset.email);
      setNotice(payload?.message || "Si le compte existe, un code sera envoyé.");
    } catch (resetError) {
      setError(normalizeMessage(resetError, "Envoi du code impossible."));
    } finally {
      setBusy("");
    }
  }

  async function submitPasswordReset(event) {
    event.preventDefault();
    if (busy) return;
    setBusy("reset");
    setError("");
    setNotice("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(reset),
      });
      rememberEmail(reset.email);
      syncEmailAcrossForms(reset.email);
      setNotice("Mot de passe mis à jour.");
      setLogin((current) => ({ ...current, email: reset.email, password: "" }));
      setReset((current) => ({ ...current, code: "", password: "" }));
      setActiveTab("login");
    } catch (resetError) {
      setError(normalizeMessage(resetError, "Réinitialisation impossible."));
    } finally {
      setBusy("");
    }
  }

  async function submitLogout() {
    if (busy) return;
    setBusy("logout");
    setError("");
    setNotice("");
    try {
      await api("/api/auth/logout", { method: "POST" });
      setUser(null);
      setDb(createEmptyDb());
      setIsAdmin(false);
      setSearchValue("");
      setSelectedResult(null);
      setNotice("Session fermée.");
      await refreshSession().catch(() => {});
    } catch (logoutError) {
      setError(normalizeMessage(logoutError, "Déconnexion impossible."));
    } finally {
      setBusy("");
    }
  }

  function startGoogleAuth() {
    window.location.href = "/api/auth/google/start?returnTo=/";
  }

  function selectSearchResult(result) {
    setSelectedResult(result);
    setActiveSection(result.section || "dashboard");
    setSearchOpen(false);
    setCommandOpen(false);
    setNotificationOpen(false);
    setMobileNavOpen(false);
    setSearchValue(result.title);
    setNotice(`Résultat chargé: ${result.title}`);
  }

  async function saveAccountSettings(event) {
    event?.preventDefault?.();
    if (accountBusy) return;
    setAccountBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = await api("/api/account", {
        method: "PATCH",
        body: JSON.stringify({
          name: accountForm.name,
          email: accountForm.email,
          currentPassword: accountForm.currentPassword,
          newPassword: accountForm.newPassword,
          profile: {
            username: accountForm.username,
            fullName: accountForm.fullName,
            phone: accountForm.phone,
            phoneVisible: accountForm.phoneVisible,
            photoUrl: accountForm.photoUrl,
          },
        }),
      });
      setUser(payload?.user || null);
      setDb(payload?.db || createEmptyDb());
      setIsAdmin(Boolean(payload?.admin));
      setAccountForm((current) => ({ ...current, currentPassword: "", newPassword: "" }));
      setNotice("Parametres du compte enregistres.");
    } catch (accountError) {
      setError(normalizeMessage(accountError, "Mise a jour du compte impossible."));
    } finally {
      setAccountBusy(false);
    }
  }

  async function saveSettingsPatch(patch, message = "Paramètres mis à jour.") {
    try {
      await persistDb(nextDbWithSettings(patch), message);
    } catch {
      // handled by persistDb
    }
  }

  async function saveDashboardArrangement(nextArrangement) {
    setDashboardArrangement(nextArrangement);
    try {
      await persistDb(nextDbWithSettings({ dashboardArrangement: nextArrangement }), "Disposition du dashboard mise à jour.");
    } catch {
      setDashboardArrangement(normalizeDashboardArrangement(db.settings?.dashboardArrangement));
    }
  }

  function onDragStart(group, id) {
    setDraggingCard({ group, id });
  }

  function onDragOver(group, id) {
    if (!draggingCard || draggingCard.group !== group || draggingCard.id === id) return;
    setDashboardArrangement((current) => {
      const next = normalizeDashboardArrangement(current);
      next[group] = reorderIds(next[group], draggingCard.id, id);
      return next;
    });
  }

  async function onDragEnd(group) {
    if (!draggingCard || draggingCard.group !== group) {
      setDraggingCard(null);
      return;
    }
    const nextArrangement = normalizeDashboardArrangement(dashboardArrangement);
    setDraggingCard(null);
    await saveDashboardArrangement(nextArrangement);
  }

  async function saveShopifyConfig() {
    if (shopifyConfigBusy) return;
    setShopifyConfigBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = await api("/api/shopify-config", {
        method: "POST",
        body: JSON.stringify({
          storeDomain: shopifyDomainInput,
          accessToken: shopifyTokenInput,
        }),
      });
      setDb(payload?.db || db);
      setNotice(`Boutique Shopify connectee${payload?.shop?.name ? ` : ${payload.shop.name}` : ""}.`);
      await refreshShopifyData();
    } catch (configError) {
      setError(normalizeMessage(configError, "Connexion Shopify impossible."));
    } finally {
      setShopifyConfigBusy(false);
    }
  }

  async function clearShopifyConfig() {
    if (shopifyConfigBusy) return;
    setShopifyConfigBusy(true);
    setError("");
    try {
      const payload = await api("/api/shopify-config", {
        method: "DELETE",
      });
      setDb(payload?.db || db);
      setShopifyState({
        loading: false,
        error: "",
        data: null,
        refreshedAt: "",
        ready: false,
        storeDomain: "",
      });
      setNotice("Boutique Shopify deconnectee.");
    } catch (configError) {
      setError(normalizeMessage(configError, "Suppression Shopify impossible."));
    } finally {
      setShopifyConfigBusy(false);
    }
  }

  async function seedDemoData() {
    if (demoBusy) return;
    setDemoBusy(true);
    setError("");
    setNotice("");
    try {
      const fixtures = createDemoFixtures(user);
      const hasRealShopify = Boolean(storedShopifyConfig.storeDomain && storedShopifyConfig.accessToken);
      const isDemoActive = !hasRealShopify && shopifyDemoOrders.length > 0;

      const extractIds = (items) => (Array.isArray(items) ? items.map((item) => item?.id).filter(Boolean) : []);
      const demoIds = new Set([
        ...extractIds(fixtures.notes),
        ...extractIds(fixtures.tasks),
        ...extractIds(fixtures.events),
        ...extractIds(fixtures.bookmarks),
        ...extractIds(fixtures.notifications),
        ...extractIds(fixtures.activity),
      ]);

      if (isDemoActive) {
        const nextDb = {
          ...db,
          notes: (db.notes || []).filter((item) => !demoIds.has(item?.id)),
          tasks: (db.tasks || []).filter((item) => !demoIds.has(item?.id)),
          events: (db.events || []).filter((item) => !demoIds.has(item?.id)),
          bookmarks: (db.bookmarks || []).filter((item) => !demoIds.has(item?.id)),
          notifications: (db.notifications || []).filter((item) => !demoIds.has(item?.id)),
          activity: (db.activity || []).filter((item) => !demoIds.has(item?.id)),
          settings: {
            ...(db.settings || {}),
            demoFixtures: {},
          },
        };
        await persistDb(nextDb, "Mode test desactive.");
        await refreshShopifyData();
        setNotice("Mode test désactivé. Aucune boutique n'est connectée.");
        return;
      }

      const uniqueById = (existing, incoming) => {
        const merged = new Map();
        [...incoming, ...existing].forEach((item) => {
          if (!item?.id) return;
          if (!merged.has(item.id)) merged.set(item.id, item);
        });
        return [...merged.values()];
      };

      const nextDb = {
        ...db,
        notes: uniqueById(db.notes || [], fixtures.notes),
        tasks: uniqueById(db.tasks || [], fixtures.tasks),
        events: uniqueById(db.events || [], fixtures.events),
        bookmarks: uniqueById(db.bookmarks || [], fixtures.bookmarks),
        notifications: uniqueById(db.notifications || [], fixtures.notifications),
        activity: uniqueById(db.activity || [], fixtures.activity),
        settings: {
          ...(db.settings || {}),
          demoFixtures: {
            seededAt: new Date().toISOString(),
            shopifyOrders: hasRealShopify ? (db.settings?.demoFixtures?.shopifyOrders || []) : fixtures.shopifyOrders,
          },
        },
      };
      await persistDb(nextDb, "Donnees de travail injectees.");
      await refreshShopifyData();
      setNotice(hasRealShopify ? "Donnees de travail injectees." : "Mode test active: donnees Shopify factices et notifications ajoutees.");
    } catch (seedError) {
      setError(normalizeMessage(seedError, "Remplissage des donnees impossible."));
    } finally {
      setDemoBusy(false);
    }
  }

  return (
    <div className={`flow-shell ${themeClass}`} style={flowShellStyle}>
      <style jsx>{`
        :global(html), :global(body) {
          margin: 0;
          min-height: 100%;
        }
        :global(body) {
          background-color: #020107;
          background-image:
            linear-gradient(135deg, rgba(139, 69, 19, 0.1) 0%, transparent 40%),
            radial-gradient(ellipse at 60% 40%, rgba(139, 69, 19, 0.08), transparent 50%);
          background-size: 100% 100%, 100% 100%;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
          background-attachment: fixed;
        }
        :global(*) {
          box-sizing: border-box;
        }
        :global(button),
        :global(input),
        :global(textarea),
        :global(select) {
          appearance: none;
          -webkit-appearance: none;
          border-radius: 17px;
          font: inherit;
        }
        :global(::-webkit-scrollbar) {
          width: 10px;
          height: 10px;
        }
        :global(::-webkit-scrollbar-thumb) {
          background: rgba(140, 148, 168, 0.3);
          border-radius: 999px;
        }
        .theme-dark {
          --page-bg: #020107;
          background-size: 26px 26px;
          --shell-bg: rgba(18, 20, 28, 0.22);
          --shell-border: rgba(255, 255, 255, 0.14);
          --panel-bg: rgba(18, 20, 28, 0.22);
          --panel-soft: rgba(18, 20, 28, 0.15);
          --panel-strong: rgba(18, 20, 28, 0.35);
          --text-main: #ffffff;
          --text-soft: rgba(255, 255, 255, 0.75);
          --text-faint: rgba(255, 255, 255, 0.62);
          --line: rgba(255, 255, 255, 0.14);
          --line-strong: rgba(255, 255, 255, 0.22);
          --accent: #ffffff;
          --accent-strong: #ffffff;
          --accent-glow: rgba(255, 255, 255, 0.08);
          --danger: rgba(255, 102, 92, 0.14);
          --orange: rgba(255, 102, 64, 0.14);
          --orange-d: rgba(255, 102, 64, 0.08);
          --red: rgba(255, 102, 92, 0.6);
          --red-d: rgba(255, 102, 92, 0.14);
          --notice: rgba(18, 20, 28, 0.9);
          --shadow: 0 28px 90px rgba(0, 0, 0, 0.35);
          --map-veil: linear-gradient(180deg, rgba(2, 1, 7, 0.1), rgba(2, 1, 7, 0.88));
          --topbar-glow: rgba(255, 255, 255, 0.08);
          --surface-layer:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02) 46%, rgba(255, 255, 255, 0.03)),
            rgba(18, 20, 28, 0.22);
          --surface-layer-strong:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.016) 48%, rgba(255, 255, 255, 0.04)),
            rgba(18, 20, 28, 0.35);
          --surface-layer-soft:
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.012) 52%, rgba(255, 255, 255, 0.028)),
            rgba(18, 20, 28, 0.15);
        }
        .theme-light {
          --page-bg:
            radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px),
            linear-gradient(145deg, #acb3bc 0%, #959da7 34%, #838b95 62%, #7a828c 100%);
          background-size: 26px 26px;
          --shell-bg: rgba(182, 190, 199, 0.44);
          --shell-border: rgba(17, 20, 26, 0.1);
          --panel-bg: rgba(214, 220, 227, 0.5);
          --panel-soft: rgba(194, 201, 209, 0.62);
          --panel-strong: rgba(204, 211, 219, 0.72);
          --text-main: #15171b;
          --text-soft: rgba(21, 23, 27, 0.74);
          --text-faint: rgba(21, 23, 27, 0.5);
          --line: rgba(17, 20, 26, 0.1);
          --line-strong: rgba(17, 20, 26, 0.18);
          --accent: #111316;
          --accent-strong: #030405;
          --accent-glow: rgba(255, 255, 255, 0.08);
          --danger: rgba(176, 118, 108, 0.28);
          --orange: #ffffff;
          --orange-d: rgba(255, 255, 255, 0.08);
          --red: #ff6b5c;
          --red-d: rgba(255, 102, 92, 0.14);
          --notice: rgba(205, 212, 220, 0.96);
          --shadow: 0 28px 78px rgba(22, 26, 33, 0.22);
          --map-veil: linear-gradient(180deg, rgba(197, 204, 212, 0.16), rgba(157, 166, 176, 0.82));
          --topbar-glow: rgba(255, 255, 255, 0.08);
          --surface-layer:
            linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.05) 52%, rgba(255, 255, 255, 0.12)),
            rgba(171, 180, 189, 0.58);
          --surface-layer-strong:
            linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.06) 52%, rgba(255, 255, 255, 0.12)),
            rgba(162, 172, 181, 0.72);
          --surface-layer-soft:
            radial-gradient(circle at 0% 0%, rgba(205, 130, 100, 0.16), transparent 30%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.04) 52%, rgba(255, 255, 255, 0.1)),
            rgba(173, 181, 188, 0.46);
        }
        :global(html),
        :global(body) {
          min-height: 100%;
          height: 100%;
        }
        :global(body) {
          margin: 0;
        }
        .flow-shell {
          min-height: 100dvh;
          height: 100dvh;
          padding: 18px;
          position: relative;
          overflow: hidden;
          background: var(--page-bg);
          color: var(--text-main);
          transition: background 0.35s ease, color 0.35s ease;
          animation: shellFadeIn 0.52s ease;
        }
        .flow-shell::before,
        .flow-shell::after {
          content: "";
          position: absolute;
          inset: -8%;
          pointer-events: none;
        }
        .flow-shell::before {
          background:
            radial-gradient(55% 32% at 20% 18%, rgba(255, 255, 255, 0.06), transparent 60%),
            radial-gradient(44% 28% at 82% 22%, rgba(255, 255, 255, 0.06), transparent 62%),
            radial-gradient(60% 30% at 58% 86%, rgba(255, 255, 255, 0.04), transparent 64%),
            linear-gradient(115deg, transparent 24%, rgba(255,255,255,0.03) 31%, transparent 39% 61%, rgba(255,255,255,0.04) 69%, transparent 78%),
            radial-gradient(60% 18% at 50% 52%, rgba(255,255,255,0.04), transparent 72%);
          filter: blur(26px);
          animation: ambientFloat 22s ease-in-out infinite alternate;
          opacity: 0.92;
          z-index: 0;
        }
        .flow-shell::after {
          background:
            linear-gradient(115deg, transparent 10%, rgba(255,255,255,0.05) 28%, transparent 46%),
            linear-gradient(295deg, transparent 34%, rgba(255, 255, 255, 0.04) 52%, transparent 70%),
            radial-gradient(36% 12% at 68% 36%, rgba(255,255,255,0.035), transparent 76%);
          opacity: 0.62;
          animation: ambientShift 30s ease-in-out infinite;
          z-index: 0;
        }
        .flow-shell > * {
          position: relative;
          z-index: 1;
        }
        .flow-shell > .command-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
        }
        @keyframes shellFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ambientFloat {
          0% { transform: translate3d(-2%, -1%, 0) scale(1); }
          100% { transform: translate3d(2%, 1%, 0) scale(1.04); }
        }
        @keyframes ambientShift {
          0% { transform: translate3d(-1%, 0, 0); opacity: 0.42; }
          50% { transform: translate3d(1%, -1%, 0); opacity: 0.58; }
          100% { transform: translate3d(-1%, 1%, 0); opacity: 0.42; }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(18px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .toast-stack {
          position: fixed !important;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          display: grid;
          gap: 10px;
          width: min(560px, calc(100vw - 32px));
          z-index: 100050;
          pointer-events: none;
        }
        .toast {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--notice);
          backdrop-filter: blur(20px);
          box-shadow: var(--shadow);
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          pointer-events: auto;
        }
        .toast.error {
          background: rgba(104, 38, 44, 0.9);
          border-color: rgba(222, 114, 125, 0.18);
        }
        .toast strong {
          display: block;
          margin-bottom: 4px;
          font-size: 13px;
        }
        .toast p {
          margin: 0;
          color: var(--text-soft);
          line-height: 1.5;
          font-size: 13px;
        }
        .toast button {
          border: 0;
          background: transparent;
          color: inherit;
          padding: 0;
          cursor: pointer;
        }
        .auth-stage {
          min-height: calc(100dvh - 36px);
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .auth-card {
          width: min(440px, 100%);
          border-radius: 17px;
          border: 1px solid var(--shell-border);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 34%),
            var(--panel-strong);
          box-shadow: var(--shadow);
          padding: 28px;
          backdrop-filter: blur(18px);
          animation: riseIn 0.38s ease;
        }
        .auth-loading-card {
          width: 120px;
          padding: 26px;
          display: grid;
          gap: 16px;
          justify-items: center;
        }
        .loading-pulse {
          width: 64px;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 1.15s linear infinite;
        }
        .auth-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .auth-brand-mark {
          width: 52px;
          height: 52px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--line);
          flex: none;
        }
        .auth-brand img {
          width: 24px;
          height: 24px;
        }
        .auth-brand-copy strong {
          display: block;
          font-size: 15px;
          letter-spacing: -0.03em;
        }
        .auth-brand-copy span {
          display: block;
          margin-top: 4px;
          color: var(--text-faint);
          font-size: 12px;
        }
        .auth-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 6px;
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          margin-bottom: 18px;
        }
        :global(.auth-tab) {
          all: unset;
          box-sizing: border-box;
          border: 0;
          border-radius: 17px;
          padding: 12px 10px;
          background: transparent;
          color: var(--text-soft);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
          display: block;
          text-align: center;
        }
        :global(.auth-tab.active) {
          background: var(--panel-bg);
          color: var(--text-main);
        }
        form {
          display: grid;
          gap: 14px;
        }
        :global(.field) {
          display: grid;
          gap: 8px;
        }
        :global(.field span) {
          font-size: 12px;
          color: var(--text-soft);
        }
        :global(.field input) {
          all: unset;
          box-sizing: border-box;
          display: block;
          width: 100%;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-main);
          border-radius: 17px;
          padding: 14px 16px;
          outline: none;
          font-size: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        :global(.field input::placeholder) {
          color: var(--text-faint);
        }
        :global(.field input:focus) {
          border-color: var(--line-strong);
          box-shadow: 0 0 0 4px var(--accent-glow);
          background: rgba(255, 255, 255, 0.05);
        }
        .button-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .primary,
        .secondary,
        .ghost,
        .pill-button {
          all: unset;
          box-sizing: border-box;
          border-radius: 17px;
          padding: 13px 16px;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
          font-weight: 700;
          font-size: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .primary {
          border: 0;
          color: ${shellTheme === "light" ? "#ffffff" : "#0b0d10"};
          background: ${shellTheme === "light"
            ? "linear-gradient(180deg, #23272d 0%, #13161b 100%)"
            : "linear-gradient(180deg, #f5f7f2 0%, #d8ddd2 100%)"};
          box-shadow: 0 18px 28px rgba(0, 0, 0, 0.18);
        }
        .secondary,
        .ghost,
        .pill-button {
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          backdrop-filter: blur(18px);
        }
        .ghost {
          background: transparent;
        }
        .primary:hover,
        .secondary:hover,
        .ghost:hover,
        .pill-button:hover {
          transform: translateY(-1px);
        }
        .primary:disabled,
        .secondary:disabled,
        .ghost:disabled {
          opacity: 0.6;
          cursor: wait;
          transform: none;
        }
        .helper {
          margin: 0;
          color: var(--text-soft);
          font-size: 13px;
          line-height: 1.55;
        }
        .app-shell {
          min-height: calc(100dvh - 36px);
          height: calc(100dvh - 36px);
          border-radius: 17px;
          border: 1px solid var(--shell-border);
          background: var(--shell-bg);
          backdrop-filter: blur(22px);
          box-shadow: var(--shadow);
          overflow: hidden;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          position: relative;
          animation: fadeScaleIn 0.42s ease;
        }
        .app-shell.no-sidebar {
          grid-template-columns: 1fr;
        }
        .sidebar {
          width: 292px;
          border-right: 1px solid var(--line);
          background: var(--surface-layer-strong);
          padding: 18px 14px 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          transition: width 0.28s ease, transform 0.28s ease, padding 0.28s ease;
          position: relative;
          z-index: 20;
          overflow: hidden;
          min-height: 0;
        }
        .theme-light .sidebar {
          background: var(--surface-layer-strong);
        }
        .theme-light .search-dropdown,
        .theme-light .notification-panel {
          background: #d6dbe2;
        }
        .sidebar.collapsed {
          width: 94px;
          padding-left: 14px;
          padding-right: 14px;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .brand-mark {
          width: 48px;
          height: 48px;
          border-radius: 17px;
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--line);
          flex: none;
        }
        .brand-mark img {
          width: 22px;
          height: 22px;
        }
        .brand-copy {
          min-width: 0;
          transition: opacity 0.2s ease;
        }
        .brand-copy strong {
          display: block;
          font-size: 15px;
          letter-spacing: -0.02em;
        }
        .brand-copy span {
          display: block;
          margin-top: 3px;
          color: var(--text-faint);
          font-size: 12px;
        }
        .sidebar.collapsed .brand-copy,
        .sidebar.collapsed .sidebar-sub,
        .sidebar.collapsed .sidebar-footer-copy,
        .sidebar.collapsed .sidebar-group-label {
          opacity: 0;
          pointer-events: none;
          width: 0;
          overflow: hidden;
        }
        .sidebar.collapsed :global(.nav-label) {
          display: none;
        }
        .sidebar.collapsed .sidebar-header {
          justify-content: center;
        }
        .sidebar.collapsed .brand {
          justify-content: center;
          width: 100%;
        }
        .sidebar.collapsed .lock-button {
          display: none;
        }
        .lock-button {
          all: unset;
          box-sizing: border-box;
          width: 40px;
          height: 40px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-main);
          display: grid;
          place-items: center;
          cursor: pointer;
          flex: none;
        }
        .sidebar-nav {
          display: grid;
          gap: 8px;
          min-height: 0;
          overflow: auto;
          padding-right: 4px;
        }
        .sidebar-group-label {
          color: var(--text-faint);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 8px 10px 0;
        }
        :global(.nav-item) {
          all: unset;
          box-sizing: border-box;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text-soft);
          border-radius: 17px;
          padding: 13px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          text-align: left;
          min-height: 50px;
          width: 100%;
          min-width: 0;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        :global(.nav-item.active) {
          border-color: var(--line);
          background: var(--panel-soft);
          color: var(--text-main);
        }
        :global(.nav-item:hover) {
          transform: translateX(1px);
        }
        :global(.nav-item.collapsed) {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }
        :global(.nav-icon) {
          width: 24px;
          height: 24px;
          display: grid;
          place-items: center;
          flex: none;
        }
        :global(.nav-label) {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-footer {
          margin-top: auto;
          padding: 14px;
          border-radius: 17px;
          background: var(--surface-layer-soft);
          border: 1px solid var(--line);
          min-height: 74px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .sidebar-footer.collapsed {
          padding: 10px;
          align-items: center;
          justify-content: center;
        }
        .sidebar-footer-mini {
          width: 46px;
          height: 46px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.06);
          display: grid;
          place-items: center;
          overflow: hidden;
          font-weight: 700;
          font-size: 15px;
          flex: none;
        }
        .sidebar-footer-mini img,
        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .sidebar-footer-copy strong {
          display: block;
          font-size: 14px;
        }
        .sidebar-footer-copy span {
          display: block;
          margin-top: 5px;
          font-size: 12px;
          color: var(--text-soft);
          line-height: 1.5;
        }
        .app-main {
          min-width: 0;
          min-height: 0;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
          background: transparent;
          overflow: hidden;
        }
        .app-main.immersive-main {
          padding: 18px;
        }
        .topbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(18px);
          position: relative;
          z-index: 60;
          flex: none;
        }
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          justify-self: end;
        }
        .icon-button {
          all: unset;
          box-sizing: border-box;
          width: 46px;
          height: 46px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          display: grid;
          place-items: center;
          cursor: pointer;
          position: relative;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .icon-button:hover {
          transform: translateY(-1px);
          border-color: var(--line-strong);
        }
        .icon-button:disabled {
          opacity: 0.56;
          cursor: wait;
          transform: none;
        }
        .badge {
          position: absolute;
          top: -4px;
          right: -2px;
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          border-radius: 999px;
          background: #cf6654;
          color: #fff;
          font-size: 11px;
          display: grid;
          place-items: center;
          border: 2px solid var(--panel-strong);
        }
        .search-wrap {
          position: relative;
          min-width: 0;
          z-index: 1;
        }
        .search-wrap.active {
          z-index: 90;
        }
        .search-box {
          width: 100%;
          height: 54px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 16px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          position: relative;
          overflow: hidden;
        }
        .search-box input {
          border: 0;
          background: transparent;
          padding: 0;
          box-shadow: none;
          height: 100%;
          color: var(--text-main);
          width: 100%;
          min-width: 0;
        }
        .search-box input::placeholder {
          color: var(--text-faint);
        }
        .search-shortcut {
          padding: 8px 10px;
          border-radius: 17px;
          border: 1px solid var(--line);
          color: var(--text-faint);
          font-size: 12px;
          white-space: nowrap;
        }
        .search-dropdown,
        .command-modal,
        .spotlight-card,
        .metric-card,
        .content-card,
        .surface-card,
        .floating-card {
          border: 1px solid var(--line);
          background: var(--surface-layer-strong);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }
        .notification-panel {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          z-index: 190;
          overflow: auto;
          width: min(420px, calc(100vw - 28px));
          max-height: min(72vh, 640px);
          border-radius: 17px;
          background: #12151c;
          padding: 16px;
          animation: riseIn 0.24s ease;
        }
        .search-dropdown::before,
        .command-modal::before,
        .notification-panel::before,
        .spotlight-card::before,
        .metric-card::before,
        .content-card::before,
        .surface-card::before,
        .floating-card::before,
        .shopify-card::before,
        .mini-card::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 0% 0%, rgba(181, 199, 160, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.06), transparent 30%);
          opacity: 0.88;
        }
        .search-dropdown > *,
        .command-modal > *,
        .notification-panel > *,
        .spotlight-card > *,
        .metric-card > *,
        .content-card > *,
        .surface-card > *,
        .floating-card > *,
        .shopify-card > *,
        .mini-card > * {
          position: relative;
          z-index: 1;
        }
        .search-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          right: 0;
          border-radius: 17px;
          padding: 12px;
          z-index: 95;
          animation: riseIn 0.24s ease;
          background: #12151c;
        }
        .search-result {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          border: 0;
          background: transparent;
          color: var(--text-main);
          border-radius: 17px;
          padding: 12px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          text-align: left;
          cursor: pointer;
        }
        .search-result:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .search-result-copy strong {
          display: block;
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .search-result-copy span,
        .search-result-copy p {
          display: block;
          margin: 3px 0 0;
          color: var(--text-soft);
          font-size: 12px;
          line-height: 1.45;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .shell-content {
          flex: 1;
          min-height: 0;
          min-width: 0;
          overflow: hidden;
        }
        .shell-panel {
          display: grid;
          gap: 18px;
          animation: riseIn 0.28s ease;
          height: 100%;
          min-height: 0;
          overflow: auto;
          padding-right: 6px;
          overscroll-behavior: contain;
        }
        .metric-card,
        .mini-card,
        .shopify-card,
        .interactive-card {
          cursor: pointer;
        }
        .metric-card.dragging,
        .mini-card.dragging {
          animation: cardWiggle 0.45s ease-in-out infinite;
          transform: scale(0.985);
          border-color: var(--line-strong);
        }
        .overview-layout {
          display: grid;
          gap: 18px;
          align-content: start;
        }
        .page-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: 6px 2px 2px;
        }
        .page-head h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1;
          letter-spacing: -0.05em;
        }
        .page-head p {
          margin: 8px 0 0;
          color: var(--text-soft);
          line-height: 1.55;
          max-width: 52ch;
        }
        .module-rail {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 2px 2px 0;
        }
        .module-chip {
          all: unset;
          box-sizing: border-box;
          min-height: 46px;
          padding: 0 16px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-soft);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          backdrop-filter: blur(18px);
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .module-chip:hover {
          transform: translateY(-1px);
        }
        .module-chip.active {
          background: var(--surface-layer-strong);
          color: var(--text-main);
          border-color: var(--line-strong);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.03);
        }
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .metric-card {
          border-radius: 17px;
          padding: 18px;
          animation: riseIn 0.32s ease;
        }
        button.metric-card {
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
        }
        button.metric-card:hover {
          transform: translateY(-2px);
          border-color: var(--line-strong);
        }
        .metric-card.primary {
          background: var(--surface-layer-strong);
          color: var(--text-main);
        }
        .metric-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .metric-card-head span {
          color: var(--text-soft);
          font-size: 13px;
        }
        .metric-value {
          margin-top: 22px;
          font-size: clamp(28px, 4vw, 44px);
          letter-spacing: -0.05em;
          line-height: 1;
        }
        .metric-foot {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          color: var(--text-soft);
          font-size: 12px;
        }
        .metric-meta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-soft);
          font-size: 12px;
        }
        .overview-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.75fr);
          gap: 18px;
        }
        .content-stack {
          display: grid;
          gap: 18px;
        }
        .content-card,
        .surface-card,
        .spotlight-card,
        .floating-card {
          border-radius: 17px;
          padding: 20px;
          animation: riseIn 0.32s ease;
          min-width: 0;
        }
        .content-card-header,
        .surface-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }
        .content-card-header h2,
        .surface-head h2 {
          margin: 0;
          font-size: 22px;
          letter-spacing: -0.04em;
        }
        .content-card-header p,
        .surface-head p {
          margin: 6px 0 0;
          color: var(--text-soft);
          line-height: 1.5;
          font-size: 13px;
        }
        .chart-wrap {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          padding: 14px;
        }
        .chart-legend {
          display: flex;
          gap: 14px;
          color: var(--text-soft);
          font-size: 12px;
          margin-top: 8px;
        }
        .legend-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          display: inline-block;
          margin-right: 6px;
        }
        .mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .dashboard-focus-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .mini-card {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          padding: 16px;
        }
        .mini-card strong {
          display: block;
          font-size: 14px;
        }
        .mini-card span {
          display: block;
          margin-top: 6px;
          color: var(--text-soft);
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }
        .spotlight-card {
          display: grid;
          gap: 16px;
        }
        .spotlight-card.empty {
          min-height: 220px;
          place-content: center;
          text-align: center;
        }
        .spotlight-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          border-radius: 999px;
          border: 1px solid var(--line);
          padding: 10px 12px;
          color: var(--text-soft);
          font-size: 12px;
        }
        .spotlight-card h3 {
          margin: 0;
          font-size: 30px;
          line-height: 1;
          letter-spacing: -0.05em;
        }
        .spotlight-card p {
          margin: 0;
          color: var(--text-soft);
          line-height: 1.6;
        }
        .overview-list {
          display: grid;
          gap: 12px;
        }
        .overview-list-item {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          padding: 15px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }
        .overview-list-item strong {
          display: block;
          font-size: 14px;
          overflow-wrap: anywhere;
        }
        .overview-list-item span {
          display: block;
          margin-top: 4px;
          color: var(--text-soft);
          font-size: 12px;
          overflow-wrap: anywhere;
        }
        .notification-panel {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          width: min(420px, calc(100vw - 28px));
          max-height: min(72vh, 640px);
          z-index: 2200;
          overflow: auto;
          padding: 16px;
          background: #12151c;
          animation: riseIn 0.24s ease;
        }
        .notification-panel,
        .search-dropdown,
        .search-result,
        .module-chip,
        .metric-card,
        .mini-card,
        .shopify-card,
        .interactive-card,
        .content-card,
        .surface-card,
        .floating-card,
        .command-modal,
        .spotlight-card,
        .notification-card,
        .notification-empty {
          border-radius: 17px !important;
        }
        .notification-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }
        .notification-panel-header h3 {
          margin: 0;
          font-size: 22px;
          letter-spacing: -0.04em;
        }
        .notification-list {
          display: grid;
          gap: 12px;
        }
        .notification-card {
          border-radius: 17px;
          border: 1px solid var(--line);
          background:
            linear-gradient(180deg, rgba(139, 92, 84, 0.16), rgba(255, 255, 255, 0.01) 46%, rgba(80, 45, 40, 0.12)),
            rgba(88, 54, 50, 0.22);
          padding: 14px;
        }
        .notification-card.read {
          background: var(--surface-layer-soft);
        }
        .notification-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .notification-card strong {
          display: block;
          font-size: 14px;
        }
        .notification-card p {
          margin: 10px 0 0;
          color: var(--text-soft);
          line-height: 1.6;
          font-size: 13px;
        }
        .notification-card small {
          color: var(--text-faint);
          display: block;
          margin-top: 10px;
        }
        .notification-empty {
          border-radius: 17px;
          border: 1px dashed var(--line);
          padding: 22px;
          text-align: center;
          color: var(--text-soft);
        }
        .command-backdrop {
          position: fixed;
          inset: 0;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(4, 6, 10, 0.92);
          backdrop-filter: blur(18px);
          display: grid;
          place-items: center;
          z-index: 99999;
          padding: 24px;
          overflow: auto;
          pointer-events: auto;
        }
        .command-modal {
          position: relative;
          z-index: 100000;
          width: min(760px, 100%);
          max-height: min(84vh, 860px);
          border-radius: 17px;
          padding: 16px;
          animation: riseIn 0.26s ease;
          overflow: hidden;
          box-shadow: 0 40px 120px rgba(0, 0, 0, 0.28);
        }
        .command-input {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 17px;
          padding: 0 16px;
          min-height: 58px;
          background: rgba(255, 255, 255, 0.04);
          margin-bottom: 12px;
        }
        .command-input input {
          border: 0;
          background: transparent;
          padding: 0;
          box-shadow: none;
        }
        .command-list {
          display: grid;
          gap: 8px;
          max-height: min(55vh, 520px);
          overflow: auto;
        }
        .command-footer {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          color: var(--text-faint);
          font-size: 12px;
          margin-top: 12px;
        }
        .immersive-layout {
          min-height: 100%;
          height: 100%;
          border-radius: 17px;
          position: relative;
          overflow: hidden;
          border: 1px solid var(--line);
          background:
            linear-gradient(180deg, rgba(10, 12, 14, 0.18), rgba(10, 12, 14, 0.78)),
            linear-gradient(145deg, #090b0d 0%, #0d1013 44%, #12161a 100%);
        }
        .theme-light .immersive-layout {
          background:
            linear-gradient(180deg, rgba(220, 226, 233, 0.34), rgba(176, 184, 193, 0.82)),
            linear-gradient(135deg, rgba(255,255,255,0.18), transparent 42%),
            linear-gradient(145deg, #bfc5cc 0%, #9da5ae 44%, #8f98a1 100%);
        }
        .immersive-map {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(52% 30% at 8% 2%, rgba(255, 255, 255, 0.08), transparent 72%),
            radial-gradient(34% 22% at 22% 18%, rgba(150, 184, 126, 0.08), transparent 64%),
            linear-gradient(115deg, rgba(255, 255, 255, 0.035), transparent 32%);
          opacity: 0.9;
          filter: blur(0.25px);
        }
        .immersive-map::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(60% 24% at 12% 0%, rgba(255, 255, 255, 0.09), transparent 72%),
            linear-gradient(120deg, rgba(255,255,255,0.03), transparent 38%);
          mix-blend-mode: screen;
          opacity: 0.32;
          filter: blur(20px);
        }
        .immersive-veil {
          position: absolute;
          inset: 0;
          background: var(--map-veil);
        }
        .immersive-content {
          position: relative;
          z-index: 2;
          padding: 22px;
          min-height: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
          gap: 18px;
        }
        .floating-stack {
          display: grid;
          gap: 18px;
          align-content: start;
        }
        .floating-card {
          background: var(--surface-layer-strong);
        }
        .floating-kpis {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .floating-kpi {
          border-radius: 17px;
          border: 1px solid var(--line);
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
        }
        .floating-kpi span {
          display: block;
          color: var(--text-soft);
          font-size: 12px;
        }
        .floating-kpi strong {
          display: block;
          margin-top: 8px;
          font-size: 30px;
          letter-spacing: -0.05em;
        }
        .immersive-right {
          display: grid;
          grid-template-rows: auto auto 1fr;
          gap: 18px;
          min-width: 0;
        }
        .immersive-header {
          padding-top: 10px;
        }
        .immersive-header h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 56px);
          line-height: 0.95;
          letter-spacing: -0.06em;
          max-width: 12ch;
        }
        .immersive-header p {
          margin: 10px 0 0;
          color: var(--text-soft);
          max-width: 46ch;
          line-height: 1.6;
        }
        .route-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }
        .route-pill {
          border-radius: 999px;
          border: 1px solid var(--line);
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-soft);
          font-size: 12px;
        }
        .profile-layout-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 18px;
        }
        .settings-layout {
          display: grid;
          grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
          gap: 20px;
        }
        .settings-side,
        .settings-panel {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-strong);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          min-width: 0;
        }
        .settings-side {
          padding: 18px;
          display: grid;
          align-content: start;
          gap: 10px;
        }
        .settings-nav-item {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          min-height: 54px;
          border-radius: 17px;
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          color: var(--text-soft);
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .settings-nav-item:hover {
          transform: translateY(-1px);
        }
        .settings-nav-item.active {
          background: var(--surface-layer-soft);
          border-color: var(--line);
          color: var(--text-main);
        }
        .settings-panel {
          padding: 22px;
        }
        .settings-form {
          display: grid;
          gap: 18px;
        }
        .settings-field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .toggle-field {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: var(--text-soft);
        }
        .toggle-field input {
          width: 18px;
          height: 18px;
        }
        .setting-stack {
          display: grid;
          gap: 18px;
        }
        .setting-card {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer);
          padding: 20px;
          backdrop-filter: blur(20px);
          box-shadow: var(--shadow);
          animation: riseIn 0.32s ease;
        }
        .setting-card h3,
        .setting-card h2 {
          margin: 0;
          font-size: 22px;
          letter-spacing: -0.04em;
        }
        .setting-card p {
          margin: 8px 0 0;
          color: var(--text-soft);
          line-height: 1.6;
        }
        .profile-identity {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .profile-avatar {
          width: 58px;
          height: 58px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.06);
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 700;
          flex: none;
        }
        .profile-identity strong,
        .profile-identity span {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .setting-options {
          display: grid;
          gap: 12px;
          margin-top: 18px;
        }
        .setting-option {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          padding: 16px 18px;
          cursor: pointer;
          display: grid;
          gap: 6px;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }
        .setting-option:hover {
          transform: translateY(-1px);
        }
        .setting-option.active {
          border-color: var(--line-strong);
          background: var(--surface-layer-strong);
        }
        .setting-option.compact {
          min-height: 88px;
          padding: 14px 16px;
        }
        .setting-option.disabled {
          opacity: 0.48;
          cursor: not-allowed;
          transform: none;
        }
        .setting-option strong {
          display: block;
        }
        .setting-option span {
          color: var(--text-soft);
          font-size: 13px;
          line-height: 1.5;
        }
        .immersive-bottom {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
          gap: 18px;
          align-items: end;
        }
        .schedule-card {
          min-height: 240px;
        }
        .schedule-scale {
          margin-top: 18px;
          display: grid;
          gap: 12px;
        }
        .scale-row {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
        }
        .scale-row span {
          color: var(--text-soft);
          font-size: 12px;
        }
        .scale-bar {
          position: relative;
          height: 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .scale-fill {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(255, 138, 102, 0.28), rgba(255, 225, 205, 0.78));
        }
        .theme-light .scale-fill {
          background: linear-gradient(90deg, rgba(255, 156, 112, 0.32), rgba(44, 34, 30, 0.92));
        }
        .shopify-layout {
          display: grid;
          gap: 18px;
        }
        .shopify-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .shopify-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .shopify-mobile-kpi-card {
          display: none;
        }
        .shopify-mobile-kpi-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
        }
        .shopify-mobile-kpi-item {
          min-width: 0;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          padding: 14px;
        }
        .shopify-mobile-kpi-item span {
          display: block;
          color: var(--text-soft);
          font-size: 12px;
        }
        .shopify-mobile-kpi-item strong {
          display: block;
          margin-top: 10px;
          font-size: 24px;
          letter-spacing: -0.04em;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .shopify-card {
          border-radius: 17px;
          padding: 18px;
          border: 1px solid var(--line);
          background: var(--surface-layer);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          animation: riseIn 0.3s ease;
          min-width: 0;
        }
        .interactive-card {
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .interactive-card:hover {
          transform: translateY(-2px);
          border-color: var(--line-strong);
        }
        .shopify-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .shopify-card-head span,
        .shopify-table td,
        .shopify-table th,
        .shopify-muted {
          color: var(--text-soft);
        }
        .shopify-value {
          margin-top: 22px;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1;
          letter-spacing: -0.05em;
        }
        .shopify-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(320px, 0.9fr);
          gap: 18px;
        }
        .shopify-chart-wrap {
          height: 320px;
          margin-top: 12px;
        }
        .shopify-table-wrap {
          overflow: auto;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
        }
        .shopify-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }
        .shopify-table th,
        .shopify-table td {
          padding: 14px 16px;
          text-align: left;
          border-bottom: 1px solid var(--line);
          white-space: nowrap;
          font-size: 13px;
        }
        .shopify-table tr:last-child td {
          border-bottom: 0;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 700;
        }
        .status-pill.success {
          color: #f7d8cf;
          border-color: rgba(255, 120, 88, 0.24);
          background: rgba(108, 46, 36, 0.34);
        }
        .status-pill.warning {
          color: #f6ead2;
          border-color: rgba(224, 129, 98, 0.26);
          background: rgba(128, 60, 42, 0.3);
        }
        .status-pill.danger {
          color: #f8dbd7;
          border-color: rgba(176, 88, 78, 0.26);
          background: rgba(111, 39, 31, 0.32);
        }
        .shopify-products {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }
        .shopify-product-row {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .shopify-product-row strong,
        .shopify-product-row span {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .shopify-product-row > div:last-child {
          flex: none;
          text-align: right;
          max-width: 40%;
        }
        .shopify-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .shopify-connect-card {
          min-height: 280px;
        }
        .shopify-connect-form {
          display: grid;
          gap: 14px;
          margin-top: 18px;
        }
        .shopify-connect-form input,
        .shopify-connect-form textarea {
          width: 100%;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          padding: 16px 18px;
        }
        .shopify-connect-form textarea {
          min-height: 136px;
          resize: vertical;
        }
        .orders-shell {
          display: grid;
          gap: 18px;
        }
        .orders-toolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }
        .orders-sort-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: flex-end;
        }
        .inline-search {
          min-width: 0;
        }
        .orders-table-wrap {
          max-height: min(62dvh, 760px);
        }
        .shopify-skeleton {
          position: relative;
          overflow: hidden;
        }
        .shopify-skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent);
          animation: shimmer 1.25s linear infinite;
        }
        .skeleton-line,
        .skeleton-box {
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.06);
        }
        .skeleton-line {
          height: 14px;
        }
        .skeleton-box {
          height: 100%;
          min-height: 180px;
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes cardWiggle {
          0% { transform: rotate(-0.9deg) scale(0.985); }
          50% { transform: rotate(0.9deg) scale(0.985); }
          100% { transform: rotate(-0.9deg) scale(0.985); }
        }
        .mobile-backdrop {
          display: none;
        }
        .section-placeholder {
          min-height: 320px;
          display: grid;
          gap: 14px;
          align-content: center;
          text-align: center;
        }
        .section-placeholder h3 {
          margin: 0;
          font-size: 32px;
          letter-spacing: -0.05em;
        }
        .section-placeholder p {
          margin: 0;
          color: var(--text-soft);
          line-height: 1.6;
          max-width: 44ch;
          justify-self: center;
        }
        .release-chip {
          all: unset;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          border-radius: 999px;
          padding: 10px 14px;
          cursor: pointer;
        }
        .pill-button.active {
          background: var(--surface-layer-strong);
          border-color: var(--line-strong);
        }
        .mobile-only {
          display: none;
        }
        @media (max-width: 1200px) {
          .metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .overview-grid,
          .immersive-bottom,
          .profile-layout-grid,
          .shopify-grid,
          .settings-layout {
            grid-template-columns: 1fr;
          }
          .shopify-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 980px) {
          .flow-shell {
            padding: 12px;
          }
          .toast-stack {
            top: auto;
            bottom: 14px;
          }
          .app-shell {
            min-height: calc(100dvh - 24px);
            height: calc(100dvh - 24px);
            grid-template-columns: 1fr;
          }
          .sidebar {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: min(320px, 86vw);
            transform: translateX(-100%);
            border-right: 1px solid var(--line);
            border-radius: 0 30px 30px 0;
            z-index: 90;
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          .sidebar.collapsed {
            width: min(320px, 86vw);
            padding-right: 14px;
          }
          .sidebar.collapsed .brand-copy,
          .sidebar.collapsed :global(.nav-label),
          .sidebar.collapsed .sidebar-footer-copy,
          .sidebar.collapsed .sidebar-group-label {
            opacity: 1;
            width: auto;
          }
          .mobile-backdrop {
            display: block;
            position: absolute;
            inset: 0;
            background: rgba(6, 8, 12, 0.42);
            backdrop-filter: blur(6px);
            z-index: 10;
          }
          .topbar {
            grid-template-columns: auto minmax(0, 1fr) auto;
          }
          .topbar-actions {
            gap: 8px;
          }
          .icon-button {
            width: 42px;
            height: 42px;
            border-radius: 17px;
          }
          .topbar.mobile-topbar {
            padding-left: 12px;
          }
          .page-head {
            flex-direction: column;
          }
          .immersive-content {
            grid-template-columns: 1fr;
          }
          .mobile-only {
            display: inline-grid;
          }
        }
        @media (max-width: 720px) {
          .flow-shell {
            padding: 0;
          }
          .auth-stage,
          .app-shell {
            min-height: 100dvh;
            height: 100dvh;
            border-radius: 0;
            border: 0;
          }
          .auth-card {
            width: calc(100vw - 28px);
            padding: 22px;
            border-radius: 17px;
          }
          .app-main {
            padding: 14px;
          }
          .sidebar {
            height: 100dvh;
            max-height: 100dvh;
            gap: 14px;
          }
          .sidebar-footer {
            border-radius: 17px;
          }
          .topbar {
            gap: 10px;
          }
          .topbar-actions {
            gap: 6px;
          }
          .search-box {
            height: 50px;
            border-radius: 17px;
            padding: 0 14px;
          }
          .search-shortcut {
            display: none;
          }
          .metrics-grid,
          .mini-grid,
          .dashboard-focus-grid {
            grid-template-columns: 1fr;
          }
          .settings-field-grid,
          .orders-toolbar {
            grid-template-columns: 1fr;
          }
          .orders-sort-row {
            justify-content: flex-start;
          }
          .shopify-kpis {
            display: none;
          }
          .shopify-mobile-kpi-card {
            display: block;
          }
          .module-rail {
            display: grid;
          }
          .notification-panel {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            left: auto;
            width: min(360px, calc(100vw - 24px));
            max-height: min(68vh, 560px);
            z-index: 2200;
            overflow: auto;
            padding: 14px;
            background: #12151c;
          }
          .page-head p,
          .content-card-header p,
          .surface-head p,
          .mini-card span,
          .overview-list-item span {
            font-size: 12px;
          }
          .shopify-table th,
          .shopify-table td {
            padding: 12px 13px;
            font-size: 12px;
          }
          .command-backdrop {
            padding: 10px;
            align-items: center;
            place-items: center;
          }
          .command-modal {
            margin-top: 0;
            border-radius: 17px;
            width: min(100%, 96vw);
          }
          .command-footer {
            display: none;
          }
        }
      `}</style>

      {domReady && (error || notice || availableUpdate) ? createPortal(
        <div className="toast-stack">
          {error ? (
            <div className="toast error">
              <div>
                <strong>Erreur</strong>
                <p>{error}</p>
              </div>
              <button type="button" onClick={() => setError("")} aria-label="Fermer">
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : null}
          {notice ? (
            <div className="toast">
              <div>
                <strong>Information</strong>
                <p>{notice}</p>
              </div>
              <button type="button" onClick={() => setNotice("")} aria-label="Fermer">
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : null}
          {availableUpdate ? (
            <div className="toast">
              <div>
                <strong>Mise à jour prête</strong>
                <p>La page se rechargera dans {reloadCountdown}s pour charger {formatReleaseLabel(availableUpdate)}.</p>
              </div>
              <button type="button" onClick={() => window.location.reload()} aria-label="Recharger">
                <Icon name="arrow-right" size={16} />
              </button>
            </div>
          ) : null}
        </div>
      , document.body) : null}

      {booting ? (
        <div className="auth-stage">
          <div className="auth-card auth-loading-card">
            <div className="auth-brand">
              <div className="auth-brand-mark">
                <img src="/icon.svg" alt="Flow" />
              </div>
              <div className="auth-brand-copy">
                <strong>Flow</strong>
              </div>
            </div>
            <div className="loading-pulse" />
          </div>
        </div>
      ) : user ? (
        <div className={`app-shell ${shouldShowSidebar ? "" : "no-sidebar"}`}>
          {mobileNavOpen ? <button type="button" className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Fermer le menu" /> : null}

          {shouldShowSidebar ? (
            <aside
              className={`sidebar ${shellCollapsedClass} ${mobileNavOpen ? "mobile-open" : ""}`}
              onMouseEnter={() => setSidebarHover(true)}
              onMouseLeave={() => {
                setSidebarHover(false);
                if (!sidebarLocked) setMobileNavOpen(false);
              }}
            >
              <div className="sidebar-header">
                <div className="brand">
                  <div className="brand-mark">
                    <img src="/icon.svg" alt="Flow" />
                  </div>
                  <div className="brand-copy">
                    <strong>Flow</strong>
                  </div>
                </div>
                {!isMobile ? (
                  <button
                    type="button"
                    className="lock-button"
                    onClick={() => applySidebarLock(!sidebarLocked)}
                    aria-label={sidebarLocked ? "Déverrouiller la barre" : "Verrouiller la barre"}
                  >
                    <Icon name={sidebarLocked ? "lock" : "unlock"} size={16} />
                  </button>
                ) : null}
              </div>

              <div className="sidebar-nav">
                <div className="sidebar-group-label">Navigation</div>
                {navSections.map((section) => (
                  <NavItem
                    key={section.id}
                    collapsed={!sidebarExpanded && !mobileNavOpen}
                    active={activeSection === section.id}
                    icon={section.icon}
                    label={section.label}
                    onClick={() => {
                      setActiveSection(section.id);
                      setMobileNavOpen(false);
                    }}
                  />
                ))}
              </div>

              <div className={`sidebar-footer ${sidebarShowsDetails ? "" : "collapsed"}`}>
                {sidebarShowsDetails ? (
                  <>
                    <div className="sidebar-footer-copy">
                      <strong>{user.name || "Compte Flow"}</strong>
                      <span>{user.email}</span>
                    </div>
                    <div className="button-row" style={{ marginTop: 14 }}>
                      <button type="button" className="secondary" onClick={() => setActiveSection("profile")} style={{ width: "100%" }}>
                        Profil
                      </button>
                      <button type="button" className="ghost" onClick={submitLogout} disabled={busy === "logout"} style={{ width: "100%" }}>
                        {busy === "logout" ? "Déconnexion..." : "Se déconnecter"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="sidebar-footer-mini" aria-label={user.name || "Profil"}>
                    {profilePhotoUrl ? <img src={profilePhotoUrl} alt={user.name || "Profil"} /> : initialsFromName(user.name).slice(0, 1)}
                  </div>
                )}
              </div>
            </aside>
          ) : null}

          <main className={`app-main ${effectiveLayout === "immersive" ? "immersive-main" : ""}`}>
            <div className={`topbar ${isMobile ? "mobile-topbar" : ""}`}>
              {isMobile ? (
                <button
                  type="button"
                  className="icon-button mobile-only"
                  onClick={() => setMobileNavOpen((current) => !current)}
                  aria-label="Ouvrir la barre latérale"
                >
                  <Icon name="menu" size={18} />
                </button>
              ) : null}

              <div className={`search-wrap ${searchOpen ? "active" : ""}`} ref={searchWrapRef}>
                <div className="search-box">
                  <Icon name="search" size={18} />
                  <input
                    value={searchValue}
                    onChange={(event) => {
                      setSearchValue(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Rechercher notes, contacts, événements, tâches..."
                    aria-label="Recherche globale"
                  />
                  <span className="search-shortcut">⌘K / Ctrl+K</span>
                </div>

                {searchOpen ? (
                  <div className="search-dropdown">
                    {searchResults.length ? (
                      searchResults.map((result) => (
                        <button key={result.key} type="button" className="search-result" onClick={() => selectSearchResult(result)}>
                          <span className="nav-icon"><ResultIcon kind={result.kind} /></span>
                          <div className="search-result-copy">
                            <strong>{result.title}</strong>
                            <span>{result.subtitle}</span>
                            {result.body ? <p>{`${result.body}`.slice(0, 84)}</p> : null}
                          </div>
                          <Icon name="arrow-right" size={15} />
                        </button>
                      ))
                    ) : (
                      <div className="notification-empty">Aucun résultat sur cette recherche.</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="topbar-actions" ref={notifRef}>
                <button type="button" className="icon-button" onClick={() => setNotificationOpen((current) => !current)} aria-label="Ouvrir les notifications">
                  <Icon name="bell" size={18} />
                  {unreadNotifications ? <span className="badge">{Math.min(unreadNotifications, 9)}</span> : null}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void seedDemoData()}
                  aria-label={shopifyDemoOrders.length && !storedShopifyConfig.storeDomain ? "Reinitialiser le mode test" : "Remplir le site avec des donnees de travail"}
                  disabled={demoBusy}
                >
                  <Icon name="spark" size={18} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void applyTheme(shellTheme === "dark" ? "light" : "dark")}
                  aria-label="Changer le thème"
                >
                  <Icon name={shellTheme === "dark" ? "sun" : "moon"} size={18} />
                </button>
              </div>

              {notificationOpen ? (
                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <div>
                      <h3>Notifications</h3>
                      <p className="helper" style={{ marginTop: 6 }}>
                        {unreadNotifications ? `${unreadNotifications} non lue(s)` : "Aucune alerte en attente"}
                      </p>
                    </div>
                    {notificationFeed.length ? (
                      <button type="button" className="ghost" onClick={() => void markNotificationsAsRead([])}>
                        Tout lire
                      </button>
                    ) : null}
                  </div>

                  <div className="notification-list">
                    {notificationFeed.length ? (
                      notificationFeed.map((item) => (
                        <div key={item.id} className={`notification-card ${item.readAt ? "read" : ""}`}>
                          <div className="notification-card-head">
                            <strong>{item.title}</strong>
                            {!item.readAt ? (
                              <button type="button" className="ghost" onClick={() => void markNotificationsAsRead([item.id])}>
                                Lire
                              </button>
                            ) : null}
                          </div>
                          <p>{item.detail || "Notification système"}</p>
                          <small>{formatRelative(item.createdAt)} · {formatShortDate(item.createdAt)}</small>
                        </div>
                      ))
                    ) : (
                      <div className="notification-empty">
                        Les nouvelles notifications apparaîtront ici dès qu’on branchera les modules.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shell-content">
              <div className="shell-panel" key={`${activeSection}-${effectiveLayout}`}>
              {effectiveLayout === "immersive" ? (
                <div className="module-rail">
                  {navSections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={`module-chip ${activeSection === section.id ? "active" : ""}`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon name={section.icon} size={16} />
                      {section.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {activeSection === "dashboard" ? (
                effectiveLayout === "overview" ? (
                <section className="overview-layout">
                  <div className="page-head">
                    <div>
                      <h1>Bienvenue, {firstName(user.name)}</h1>
                      <p>Résumé direct de ton compte, de ce qui doit bouger maintenant et de la période active.</p>
                    </div>
                  </div>

                  <div className="metrics-grid">
                    {orderedDashboardCards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        className={`metric-card ${card.primary ? "primary" : ""} ${draggingCard?.group === "metrics" && draggingCard?.id === card.id ? "dragging" : ""}`}
                        onClick={() => setActiveSection(card.section)}
                        draggable={!isMobile}
                        onDragStart={() => onDragStart("metrics", card.id)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          onDragOver("metrics", card.id);
                        }}
                        onDragEnd={() => void onDragEnd("metrics")}
                      >
                        <div className="metric-card-head">
                          <span>{card.label}</span>
                          <Icon name={card.icon} size={18} />
                        </div>
                        {card.id === "shopify" && shopifyState.loading && !shopifyState.data ? (
                          <div className="shopify-skeleton" style={{ marginTop: 22 }}>
                            <div className="skeleton-line" style={{ width: "58%", height: 38, borderRadius: 20 }} />
                            <div className="skeleton-line" style={{ width: "74%", marginTop: 14 }} />
                          </div>
                        ) : card.id === "shopify" && shopifyState.error ? (
                          <>
                            <div className="metric-value">—</div>
                            <div className="metric-foot">
                              <span>{shopifyState.error}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="metric-value">{card.value}</div>
                            <div className="metric-foot">
                              <span className="metric-meta">{card.meta}</span>
                            </div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="overview-grid">
                      <div className="content-stack">
                        <div className="content-card">
                          <div className="content-card-header">
                            <div>
                              <h2>Rythme du compte</h2>
                              <p>Charge active sur les éléments qui demandent une action.</p>
                            </div>
                            <button type="button" className="release-chip" onClick={() => setReleaseOpen(true)}>
                              <Icon name="spark" size={15} />
                              {releaseMeta}
                            </button>
                          </div>
                          <div className="chart-wrap">
                            <svg viewBox="0 0 520 190" width="100%" height="220" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="flowChartFill" x1="0" x2="0" y1="0" y2="1">
                                  <stop offset="0%" stopColor="rgba(255, 146, 113, 0.42)" />
                                  <stop offset="100%" stopColor="rgba(255, 146, 113, 0.02)" />
                                </linearGradient>
                              </defs>
                              {[30, 80, 130, 180].map((line) => (
                                <line key={line} x1="0" y1={line} x2="520" y2={line} stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                              ))}
                              <polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="3" opacity="0.92" />
                              <polyline points={`${chartPoints} 520,190 0,190`} fill="url(#flowChartFill)" stroke="none" />
                            </svg>
                          </div>
                          <div className="chart-legend">
                            <span><span className="legend-dot" style={{ background: "currentColor" }} />Charge active</span>
                            <span><span className="legend-dot" style={{ background: "rgba(255,146,113,0.45)" }} />Résumé synthétique</span>
                          </div>
                        </div>

                        <div className="content-card">
                          <div className="content-card-header">
                            <div>
                              <h2>Vue du jour</h2>
                              <p>Ce qui mérite ton attention en premier.</p>
                            </div>
                          </div>
                          <div className="dashboard-focus-grid">
                            {orderedDashboardFocusCards.map((card) => (
                              <button
                                key={card.id}
                                type="button"
                                className={`mini-card interactive-card ${draggingCard?.group === "focus" && draggingCard?.id === card.id ? "dragging" : ""}`}
                                onClick={card.onClick}
                                draggable={!isMobile}
                                onDragStart={() => onDragStart("focus", card.id)}
                                onDragOver={(event) => {
                                  event.preventDefault();
                                  onDragOver("focus", card.id);
                                }}
                                onDragEnd={() => void onDragEnd("focus")}
                              >
                                <strong>{card.title}</strong>
                                <span>{card.body}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mini-grid">
                          {orderedDashboardMiniCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              className={`mini-card interactive-card ${draggingCard?.group === "mini" && draggingCard?.id === card.id ? "dragging" : ""}`}
                              onClick={card.onClick}
                              draggable={!isMobile}
                              onDragStart={() => onDragStart("mini", card.id)}
                              onDragOver={(event) => {
                                event.preventDefault();
                                onDragOver("mini", card.id);
                              }}
                              onDragEnd={() => void onDragEnd("mini")}
                            >
                              <strong>{card.title}</strong>
                              <span>{card.body}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="content-stack">
                        <div className={`spotlight-card ${selectedResult ? "" : "empty"}`}>
                          {selectedResult ? (
                            <>
                              <span className="spotlight-pill">
                                <ResultIcon kind={selectedResult.kind} />
                                {selectedResult.kind}
                              </span>
                              <h3>{selectedResult.title}</h3>
                              <p>{selectedResult.subtitle}</p>
                              <p>{selectedResult.body || "Le détail complet s’ouvrira ici pendant qu’on construit les modules un par un."}</p>
                            </>
                          ) : (
                            <>
                              <h3>Zone de focus</h3>
                              <p>Sélectionne une note, un contact, un événement ou une tâche.</p>
                            </>
                          )}
                        </div>

                        <div className="surface-card">
                          <div className="surface-head">
                            <div>
                              <h2>Derniers éléments</h2>
                              <p>Notes, tâches, événements et activité du compte, triés sans bruit.</p>
                            </div>
                          </div>
                          <div className="overview-list">
                            {dashboardFeed.map((item) => (
                              <div key={item.id} className="overview-list-item">
                                <div>
                                  <strong>{item.title}</strong>
                                  <span>{item.subtitle}</span>
                                </div>
                                <span className="helper">{item.meta}</span>
                              </div>
                            ))}
                            {!dashboardFeed.length ? (
                              <div className="overview-list-item">
                                <div>
                                  <strong>Rien de récent</strong>
                                  <span>Le compte attend ses premiers éléments.</span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="immersive-layout" style={immersiveBackgroundStyle}>
                    <div className="immersive-map" />
                    <div className="immersive-veil" />
                    <div className="immersive-content">
                      <div className="floating-stack">
                        <div className="floating-card">
                          <div className="surface-head">
                            <div>
                              <h2>Centre de pilotage</h2>
                              <p>Version immersive du dashboard, sans barre latérale, avec tous les modules remontés en haut du site.</p>
                            </div>
                            <button type="button" className="ghost" onClick={() => setActiveSection("profile")}>
                              Ouvrir le profil
                            </button>
                          </div>
                          <div className="floating-kpis">
                            <div className="floating-kpi">
                              <span>Notes</span>
                              <strong>{dashboardMetrics.notes}</strong>
                            </div>
                            <div className="floating-kpi">
                              <span>En cours</span>
                              <strong>{dashboardMetrics.tasks}</strong>
                            </div>
                            <div className="floating-kpi">
                              <span>Événements</span>
                              <strong>{dashboardMetrics.events}</strong>
                            </div>
                            <div className="floating-kpi">
                              <span>Alertes</span>
                              <strong>{dashboardMetrics.notifications}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="floating-card">
                          <div className="surface-head">
                            <div>
                              <h2>Panneau de veille</h2>
                              <p>Le même langage visuel servira aux modules quand on les branchera un par un.</p>
                            </div>
                          </div>
                          <div className="overview-list">
                            <div className="overview-list-item">
                              <div>
                                <strong>Recherche haute priorité</strong>
                                <span>Sans doublon, avec ouverture rapide au clavier.</span>
                              </div>
                            </div>
                            <div className="overview-list-item">
                              <div>
                                <strong>Notifications</strong>
                                <span>Panneau flottant aligné sur la topbar et thème commun dark / light.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="immersive-right">
                        <div className="immersive-header">
                          <h1>Dashboard Flow</h1>
                          <p>La structure immersive garde les mêmes données, mais remplace la barre gauche par une navigation supérieure et un espace plus atmosphérique.</p>
                          <div className="route-pills">
                            <span className="route-pill">Recherche globale</span>
                            <span className="route-pill">Notifications flottantes</span>
                            <span className="route-pill">Profil et structure</span>
                          </div>
                        </div>

                        <div className="floating-card">
                          <div className="surface-head">
                            <div>
                              <h2>Résultat ciblé</h2>
                              <p>{selectedResult ? "Le résultat sélectionné depuis la recherche apparaît ici." : "Aucun résultat actif pour le moment."}</p>
                            </div>
                          </div>
                          {selectedResult ? (
                            <div className="spotlight-card" style={{ padding: 0, border: 0, background: "transparent", boxShadow: "none" }}>
                              <span className="spotlight-pill">
                                <ResultIcon kind={selectedResult.kind} />
                                {selectedResult.kind}
                              </span>
                              <h3>{selectedResult.title}</h3>
                              <p>{selectedResult.subtitle}</p>
                              <p>{selectedResult.body || "Le détail complet du module arrivera ici au fur et à mesure de la reconstruction."}</p>
                            </div>
                          ) : (
                            <div className="section-placeholder" style={{ minHeight: 160 }}>
                              <p>Utilise la recherche du haut ou `⌘K / Ctrl+K` pour charger une fiche ici.</p>
                            </div>
                          )}
                        </div>

                        <div className="immersive-bottom">
                          <div className="floating-card schedule-card">
                            <div className="surface-head">
                              <div>
                                <h2>Cadence des modules</h2>
                                <p>Vision simple de l’état des briques qu’on est en train de remettre à plat.</p>
                              </div>
                              <button type="button" className="release-chip" onClick={() => setReleaseOpen(true)}>
                                <Icon name="spark" size={15} />
                                {releaseMeta}
                              </button>
                            </div>
                            <div className="schedule-scale">
                              <div className="scale-row">
                                <span>Recherche</span>
                                <div className="scale-bar"><div className="scale-fill" style={{ width: "74%" }} /></div>
                              </div>
                              <div className="scale-row">
                                <span>Topbar</span>
                                <div className="scale-bar"><div className="scale-fill" style={{ width: "82%" }} /></div>
                              </div>
                              <div className="scale-row">
                                <span>Shell</span>
                                <div className="scale-bar"><div className="scale-fill" style={{ width: "88%" }} /></div>
                              </div>
                              <div className="scale-row">
                                <span>Modules</span>
                                <div className="scale-bar"><div className="scale-fill" style={{ width: "26%" }} /></div>
                              </div>
                            </div>
                          </div>

                          <div className="floating-card">
                            <div className="surface-head">
                              <div>
                                <h2>Alertes</h2>
                                <p>Panneau inspiré des références, branché sur les vraies notifications du compte.</p>
                              </div>
                            </div>
                            <div className="overview-list">
                              {notificationFeed.slice(0, 2).map((item) => (
                                <div key={item.id} className="overview-list-item">
                                  <div>
                                    <strong>{item.title}</strong>
                                    <span>{item.detail || "Notification système"}</span>
                                  </div>
                                  <span className="helper">{formatRelative(item.createdAt)}</span>
                                </div>
                              ))}
                              {!notificationFeed.length ? (
                                <div className="overview-list-item">
                                  <div>
                                    <strong>Aucune alerte</strong>
                                    <span>Le panneau est prêt pour les prochaines remontées du produit.</span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )
              ) : activeSection === "shopify" ? (
                <section className="shopify-layout">
                  <div className="page-head">
                    <div>
                      <h1>Shopify</h1>
                      <p>{shopifyState.ready ? `Boutique connectee · ${shopifyState.storeDomain}` : "Connecte ta boutique ou remplis le site avec des donnees de travail."}</p>
                    </div>
                  </div>

                  {!shopifyState.ready && !shopifyState.data ? (
                    <div className="surface-card shopify-connect-card">
                      <div className="surface-head">
                        <div>
                          <h2>Aucune boutique connectee</h2>
                          <p>Renseigne le domaine Shopify et le token séparément. Le token se recupere dans Shopify Admin avec la permission <code>read_orders</code>. <button type="button" onClick={() => setShopifyGuideOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>Guide complet</button>.</p>
                        </div>
                      </div>
                      <div className="shopify-connect-form">
                        <input
                          value={shopifyDomainInput}
                          onChange={(event) => setShopifyDomainInput(event.target.value)}
                          placeholder="store.myshopify.com"
                          aria-label="Shop domain"
                        />
                        <input
                          value={shopifyTokenInput}
                          onChange={(event) => setShopifyTokenInput(event.target.value)}
                          placeholder="shpat_xxx"
                          aria-label="Shopify access token"
                        />
                        <div className="button-row">
                          <button type="button" className="primary" onClick={() => void saveShopifyConfig()} disabled={shopifyConfigBusy}>
                            {shopifyConfigBusy ? "Connexion..." : "Connecter la boutique"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="shopify-actions">
                        {SHOPIFY_PERIODS.map((period) => (
                          <button
                            key={period.id}
                            type="button"
                            className={`pill-button ${shopifyPeriod === period.id ? "active" : ""}`}
                            onClick={() => setShopifyPeriod(period.id)}
                          >
                            {period.label}
                          </button>
                        ))}
                      </div>

                      <div className="shopify-kpis">
                        {[
                          { label: "CA periode", value: formatCurrency(shopifyOverview.revenueCurrent), icon: "activity" },
                          { label: "CA ce mois", value: formatCurrency(shopifyOverview.revenueMonth), icon: "grid" },
                          { label: "Commandes", value: `${shopifyOverview.ordersCurrent}`, icon: "note", action: () => setActiveSection("shopify-orders") },
                          { label: "Non fulfillées", value: `${shopifyOverview.pendingFulfillment}`, icon: "check" },
                        ].map((item) => {
                          const Tag = item.action ? "button" : "div";
                          return (
                            <Tag key={item.label} type={item.action ? "button" : undefined} className={`shopify-card ${item.action ? "interactive-card" : ""}`} onClick={item.action}>
                              <div className="shopify-card-head">
                                <span>{item.label}</span>
                                <Icon name={item.icon} size={18} />
                              </div>
                              {shopifyState.loading && !shopifyState.data ? (
                                <div className="shopify-skeleton" style={{ marginTop: 22 }}>
                                  <div className="skeleton-line" style={{ width: "62%", height: 36, borderRadius: 18 }} />
                                </div>
                              ) : (
                                <div className="shopify-value">{item.value}</div>
                              )}
                            </Tag>
                          );
                        })}
                      </div>

                      <div className="shopify-card shopify-mobile-kpi-card interactive-card" onClick={() => setActiveSection("shopify-orders")} role="button" tabIndex={0}>
                        <div className="surface-head">
                          <div>
                            <h2>Période · {activeShopifyPeriodLabel}</h2>
                          </div>
                        </div>
                        <div className="shopify-mobile-kpi-grid">
                          <div className="shopify-mobile-kpi-item">
                            <span>CA période</span>
                            <strong>{formatCurrency(shopifyOverview.revenueCurrent)}</strong>
                          </div>
                          <div className="shopify-mobile-kpi-item">
                            <span>CA du mois</span>
                            <strong>{formatCurrency(shopifyOverview.revenueMonth)}</strong>
                          </div>
                          <div className="shopify-mobile-kpi-item">
                            <span>Commandes</span>
                            <strong>{shopifyOverview.ordersCurrent}</strong>
                          </div>
                          <div className="shopify-mobile-kpi-item">
                            <span>À traiter</span>
                            <strong>{shopifyOverview.pendingFulfillment}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="shopify-grid">
                        <div className="content-stack">
                          <div className="shopify-card">
                            <div className="surface-head">
                              <div>
                                <h2>Performance commerciale</h2>
                                <p>{shopifyState.refreshedAt ? `Mise à jour ${formatShopifyDate(shopifyState.refreshedAt)}` : "En attente de données Shopify."}</p>
                              </div>
                            </div>
                            {shopifyState.loading && !shopifyState.data ? (
                              <div className="shopify-skeleton skeleton-box" />
                            ) : (
                              <div className="shopify-chart-wrap">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={visibleShopifyChart}>
                                    <defs>
                                      <linearGradient id="shopifyCurrentArea" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="rgba(190,201,174,0.44)" />
                                        <stop offset="100%" stopColor="rgba(190,201,174,0.04)" />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                    <XAxis dataKey="label" stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12, opacity: 0.72 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12, opacity: 0.72 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                                    <Tooltip
                                      contentStyle={{
                                        background: "rgba(16,18,22,0.92)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "18px",
                                        color: "#f5f7fb",
                                      }}
                                      formatter={(value, key) => [formatCurrency(value), key === "previous" ? "Periode precedente" : "Periode courante"]}
                                    />
                                    <Area type="monotone" dataKey="previous" stroke="rgba(255,255,255,0.3)" strokeWidth={2} fill="rgba(255,255,255,0)" />
                                    <Area type="monotone" dataKey="current" stroke="currentColor" strokeWidth={2.8} fill="url(#shopifyCurrentArea)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>

                          <div className="shopify-card interactive-card" onClick={() => setActiveSection("shopify-orders")} role="button" tabIndex={0}>
                            <div className="surface-head">
                              <div>
                                <h2>Dernières commandes</h2>
                                <p>Les plus récentes en haut. Les commandes traitées de plus de 3 jours sont masquées.</p>
                              </div>
                            </div>
                            {shopifyState.loading && !shopifyState.data ? (
                              <div className="shopify-skeleton skeleton-box" />
                            ) : (
                              <div className="shopify-table-wrap">
                                <table className="shopify-table">
                                  <thead>
                                    <tr>
                                      <th>#</th>
                                      <th>Date</th>
                                      <th>Client</th>
                                      <th>Total €</th>
                                      <th>Paiement</th>
                                      <th>Fulfillment</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {visibleShopifyOrders.map((order) => (
                                      <tr key={order.id}>
                                        <td>{order.number}</td>
                                        <td>{formatShopifyDate(order.createdAt)}</td>
                                        <td>{order.customer}</td>
                                        <td>{formatCurrency(order.total)}</td>
                                        <td><span className={`status-pill ${normalizeStatusTone(order.paymentStatus)}`}>{order.paymentStatus}</span></td>
                                        <td><span className={`status-pill ${normalizeStatusTone(order.fulfillmentStatus)}`}>{order.fulfillmentStatus}</span></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {!visibleShopifyOrders.length ? <div className="notification-empty">Aucune commande sur cette période.</div> : null}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="content-stack">
                          <div className="shopify-card">
                            <div className="surface-head">
                              <div>
                                <h2>Top 5 produits du mois</h2>
                                <p>Produits les plus vendus du mois courant.</p>
                              </div>
                              {storedShopifyConfig.storeDomain ? (
                                <button type="button" className="ghost" onClick={() => void clearShopifyConfig()} disabled={shopifyConfigBusy}>
                                  Déconnecter
                                </button>
                              ) : null}
                            </div>
                            {shopifyState.loading && !shopifyState.data ? (
                              <div className="shopify-skeleton skeleton-box" />
                            ) : (
                              <div className="shopify-products">
                                {(shopifyState.data?.topProducts || []).map((product) => (
                                  <div key={product.id} className="shopify-product-row">
                                    <div style={{ minWidth: 0 }}>
                                      <strong>{product.title}</strong>
                                      <span>{product.quantity} vente(s)</span>
                                    </div>
                                    <strong>{formatCurrency(product.revenue)}</strong>
                                  </div>
                                ))}
                                {!(shopifyState.data?.topProducts || []).length ? (
                                  <div className="notification-empty">Aucun produit sur la période.</div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              ) : activeSection === "shopify-orders" ? (
                <section className="shopify-layout">
                  <div className="page-head">
                    <div>
                      <h1>Commandes Shopify</h1>
                      <p>Tri et recherche directe sur les commandes de la période active.</p>
                    </div>
                  </div>
                  <div className="orders-shell">
                    <div className="orders-toolbar">
                      <div className="search-box inline-search">
                        <Icon name="search" size={18} />
                        <input
                          value={shopifyOrderQuery}
                          onChange={(event) => setShopifyOrderQuery(event.target.value)}
                          placeholder="Rechercher par produit, date ou client"
                          aria-label="Rechercher dans les commandes Shopify"
                        />
                      </div>
                      <div className="orders-sort-row">
                        {[
                          { id: "recent", label: "Récent" },
                          { id: "oldest", label: "Ancien" },
                          { id: "expensive", label: "Plus cher" },
                          { id: "cheap", label: "Moins cher" },
                        ].map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={`pill-button ${shopifyOrderSort === option.id ? "active" : ""}`}
                            onClick={() => setShopifyOrderSort(option.id)}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="shopify-card">
                      <div className="surface-head">
                        <div>
                          <h2>Commandes visibles</h2>
                          <p>{shopifyOrdersPageRows.length} résultat(s) sur {activeShopifyPeriodLabel.toLowerCase()}.</p>
                        </div>
                      </div>
                      <div className="shopify-table-wrap orders-table-wrap">
                        <table className="shopify-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Date</th>
                              <th>Client</th>
                              <th>Total €</th>
                              <th>Paiement</th>
                              <th>Fulfillment</th>
                              <th>Produits</th>
                            </tr>
                          </thead>
                          <tbody>
                            {shopifyOrdersPageRows.map((order) => (
                              <tr key={order.id}>
                                <td>{order.number}</td>
                                <td>{formatShopifyDate(order.createdAt)}</td>
                                <td>{order.customer}</td>
                                <td>{formatCurrency(order.total)}</td>
                                <td><span className={`status-pill ${normalizeStatusTone(order.paymentStatus)}`}>{order.paymentStatus}</span></td>
                                <td><span className={`status-pill ${normalizeStatusTone(order.fulfillmentStatus)}`}>{order.fulfillmentStatus}</span></td>
                                <td>{(order.lineItems || []).map((item) => item.title).filter(Boolean).join(", ") || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!shopifyOrdersPageRows.length ? <div className="notification-empty">Aucune commande ne correspond à cette recherche.</div> : null}
                      </div>
                    </div>
                  </div>
                </section>
              ) : activeSection === "profile" ? (
                <section className="overview-layout">
                  <div className="page-head">
                    <div>
                      <h1>Paramètres</h1>
                    </div>
                  </div>

                  <div className="settings-layout">
                    <div className="settings-side">
                      {settingsItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`settings-nav-item ${settingsTab === item.id ? "active" : ""}`}
                          onClick={() => setSettingsTab(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="settings-panel">
                      {settingsTab === "account" ? (
                        <form className="settings-form" onSubmit={saveAccountSettings}>
                          <div className="surface-head">
                            <div>
                              <h2>My Account</h2>
                              <p>Informations principales visibles sur ton compte.</p>
                            </div>
                          </div>
                          <div className="settings-field-grid">
                            <Field label="Nom" value={accountForm.name} onChange={(value) => setAccountForm((current) => ({ ...current, name: value }))} placeholder="Ton nom" />
                            <Field label="Email" type="email" value={accountForm.email} onChange={(value) => setAccountForm((current) => ({ ...current, email: value }))} placeholder="toi@flow.app" />
                            <Field label="Username" value={accountForm.username} onChange={(value) => setAccountForm((current) => ({ ...current, username: value }))} placeholder="username" />
                            <Field label="Nom complet" value={accountForm.fullName} onChange={(value) => setAccountForm((current) => ({ ...current, fullName: value }))} placeholder="Nom complet" />
                            <Field label="Telephone" value={accountForm.phone} onChange={(value) => setAccountForm((current) => ({ ...current, phone: value }))} placeholder="+33..." />
                            <Field label="Photo" value={accountForm.photoUrl} onChange={(value) => setAccountForm((current) => ({ ...current, photoUrl: value }))} placeholder="URL ou image locale deja importee" />
                          </div>
                          <label className="toggle-field">
                            <input type="checkbox" checked={accountForm.phoneVisible} onChange={(event) => setAccountForm((current) => ({ ...current, phoneVisible: event.target.checked }))} />
                            <span>Afficher le téléphone dans le compte</span>
                          </label>
                          <div className="button-row">
                            <button type="submit" className="primary" disabled={accountBusy}>
                              {accountBusy ? "Enregistrement..." : "Enregistrer"}
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {settingsTab === "appearance" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Appearance</h2>
                              <p>Theme, structure et fond du shell.</p>
                            </div>
                          </div>
                          <div className="setting-options">
                            <button type="button" className={`setting-option ${shellTheme === "dark" ? "active" : ""}`} onClick={() => void applyTheme("dark")}>
                              <strong>Mode sombre</strong>
                              <span>Fond sombre anime et cartes opaques.</span>
                            </button>
                            <button type="button" className={`setting-option ${shellTheme === "light" ? "active" : ""}`} onClick={() => void applyTheme("light")}>
                              <strong>Mode clair</strong>
                              <span>Version eclaircie sans basculer en blanc.</span>
                            </button>
                            <button type="button" className={`setting-option ${dashboardLayout === "overview" ? "active" : ""}`} onClick={() => void applyLayout("overview")}>
                              <strong>Vue tableau</strong>
                              <span>Sidebar gauche et grille dense.</span>
                            </button>
                            <button type="button" className={`setting-option ${dashboardLayout === "immersive" ? "active" : ""} ${isMobile ? "disabled" : ""}`} onClick={() => void applyLayout("immersive")} disabled={isMobile}>
                              <strong>Vue immersive</strong>
                              <span>Desktop seulement, modules remontes en haut.</span>
                            </button>
                          </div>
                          <div className="button-row">
                            <button type="button" className="secondary" onClick={() => backgroundInputRef.current?.click()} disabled={backgroundBusy}>
                              {backgroundBusy ? "Import..." : "Importer un fond"}
                            </button>
                            <button type="button" className="ghost" onClick={() => void applyCustomBackground("")} disabled={!currentThemeBackground || backgroundBusy}>
                              Retirer le fond
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "privacy" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Privacy & Safety</h2>
                              <p>Connexion, sécurité et exposition minimale des données.</p>
                            </div>
                          </div>
                          <div className="settings-field-grid">
                            <Field label="Mot de passe actuel" type="password" value={accountForm.currentPassword} onChange={(value) => setAccountForm((current) => ({ ...current, currentPassword: value }))} placeholder="Mot de passe actuel" />
                            <Field label="Nouveau mot de passe" type="password" value={accountForm.newPassword} onChange={(value) => setAccountForm((current) => ({ ...current, newPassword: value }))} placeholder="Nouveau mot de passe" />
                          </div>
                          <div className="mini-grid">
                            <div className="mini-card">
                              <strong>Google</strong>
                              <span>{providers.google ? "Connexion disponible." : "Configuration absente sur cet environnement."}</span>
                            </div>
                            <div className="mini-card">
                              <strong>Email reset</strong>
                              <span>{providers.email ? "Réinitialisation disponible." : "Réinitialisation email indisponible."}</span>
                            </div>
                            <div className="mini-card">
                              <strong>Téléphone</strong>
                              <span>{accountForm.phoneVisible ? "Visible sur le compte." : "Masqué sur le compte."}</span>
                            </div>
                            <div className="mini-card">
                              <strong>Session</strong>
                              <span>Compte relié au store distant et reconnectable sur plusieurs appareils.</span>
                            </div>
                          </div>
                          <div className="button-row">
                            <button type="button" className="primary" onClick={(event) => void saveAccountSettings({ preventDefault() {} })} disabled={accountBusy}>
                              {accountBusy ? "Enregistrement..." : "Mettre à jour la sécurité"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "integrations" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Integrations</h2>
                              <p>Chaque utilisateur connecte sa propre boutique Shopify.</p>
                            </div>
                          </div>
                          <div className="shopify-connect-form">
                            <input
                              value={shopifyDomainInput}
                              onChange={(event) => setShopifyDomainInput(event.target.value)}
                              placeholder="store.myshopify.com"
                              aria-label="Shop domain"
                            />
                            <input
                              value={shopifyTokenInput}
                              onChange={(event) => setShopifyTokenInput(event.target.value)}
                              placeholder="shpat_xxx"
                              aria-label="Shopify access token"
                            />
                            <div className="button-row">
                              <button type="button" className="primary" onClick={() => void saveShopifyConfig()} disabled={shopifyConfigBusy}>
                                {shopifyConfigBusy ? "Verification..." : "Verifier et connecter"}
                              </button>
                              <button type="button" className="ghost" onClick={() => void clearShopifyConfig()} disabled={shopifyConfigBusy || !storedShopifyConfig.storeDomain}>
                                Deconnecter
                              </button>
                            </div>
                            <p className="helper">{storedShopifyConfig.storeDomain ? `Boutique active : ${storedShopifyConfig.storeDomain}` : "Aucune boutique connectee. Colle la clé privée liée à read_orders."}</p>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "billing" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Billing</h2>
                              <p>Lecture directe de l’état d’abonnement du compte.</p>
                            </div>
                          </div>
                          <div className="settings-field-grid">
                            <Field label="Plan" value={db.subscription?.plan || "summit"} onChange={() => {}} disabled placeholder="" />
                            <Field label="Statut" value={db.subscription?.status || "complimentary"} onChange={() => {}} disabled placeholder="" />
                            <Field label="Cycle" value={db.subscription?.billingCycle || "lifetime"} onChange={() => {}} disabled placeholder="" />
                            <Field label="Renouvellement" value={db.subscription?.renewsAt ? formatShopifyDate(db.subscription.renewsAt) : "Aucune date"} onChange={() => {}} disabled placeholder="" />
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "notifications" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Notifications</h2>
                              <p>Centre de lecture rapide, avec état lu / non lu.</p>
                            </div>
                          </div>
                          <div className="button-row">
                            <button type="button" className="secondary" onClick={() => void markNotificationsAsRead([])} disabled={!notificationFeed.length}>
                              Tout marquer lu
                            </button>
                          </div>
                          <div className="overview-list">
                            {notificationFeed.map((item) => (
                              <div key={item.id} className="overview-list-item">
                                <div>
                                  <strong>{item.title}</strong>
                                  <span>{item.detail}</span>
                                </div>
                                <span className="helper">{formatRelative(item.createdAt)}</span>
                              </div>
                            ))}
                            {!notificationFeed.length ? (
                              <div className="overview-list-item">
                                <div>
                                  <strong>Aucune notification</strong>
                                  <span>Le centre est pret.</span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "language" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Language</h2>
                              <p>Réglages simples de langue et de semaine.</p>
                            </div>
                          </div>
                          <div className="setting-options">
                            <SettingQuickButton active={(db.settings?.locale || "fr") === "fr"} onClick={() => void saveSettingsPatch({ locale: "fr" }, "Langue mise à jour.")}>
                              <strong>Français</strong>
                            </SettingQuickButton>
                            <SettingQuickButton active={(db.settings?.locale || "fr") === "en"} onClick={() => void saveSettingsPatch({ locale: "en" }, "Langue mise à jour.")}>
                              <strong>English</strong>
                            </SettingQuickButton>
                            <SettingQuickButton active={(db.settings?.weekStart || 1) === 1} onClick={() => void saveSettingsPatch({ weekStart: 1 }, "Début de semaine mis à jour.")}>
                              <strong>Lundi</strong>
                            </SettingQuickButton>
                            <SettingQuickButton active={(db.settings?.weekStart || 1) === 0} onClick={() => void saveSettingsPatch({ weekStart: 0 }, "Début de semaine mis à jour.")}>
                              <strong>Dimanche</strong>
                            </SettingQuickButton>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "keys" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Key Bindings</h2>
                              <p>Raccourcis utiles déjà actifs dans le shell.</p>
                            </div>
                          </div>
                          <div className="overview-list">
                            <div className="overview-list-item"><div><strong>⌘K / Ctrl+K</strong><span>Ouvrir la palette de recherche globale.</span></div></div>
                            <div className="overview-list-item"><div><strong>Échap</strong><span>Fermer la palette ou un popup visible.</span></div></div>
                            <div className="overview-list-item"><div><strong>Recherche du haut</strong><span>Filtrer notes, contacts, événements, tâches et signets sans doublon.</span></div></div>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "advanced" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Advanced</h2>
                              <p>Etat du shell, release et session.</p>
                            </div>
                          </div>
                          <div className="overview-list">
                            <div className="overview-list-item">
                              <div>
                                <strong>Barre latérale</strong>
                                <span>{sidebarLocked ? "Verrouillée ouverte" : "Hover pour ouverture temporaire"}</span>
                              </div>
                            </div>
                            <div className="overview-list-item">
                              <div>
                                <strong>Vue active</strong>
                                <span>{effectiveLayout === "immersive" ? "Immersive desktop" : "Tableau"}</span>
                              </div>
                            </div>
                            <div className="overview-list-item">
                              <div>
                                <strong>Version chargee</strong>
                                <span>{releaseMeta}</span>
                              </div>
                            </div>
                          </div>
                          <div className="button-row">
                            <button type="button" className="secondary" onClick={() => setReleaseOpen(true)}>
                              Ouvrir le journal
                            </button>
                            <button type="button" className="ghost" onClick={submitLogout} disabled={busy === "logout"}>
                              {busy === "logout" ? "Déconnexion..." : "Se déconnecter"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              ) : (
                <div className="surface-card section-placeholder">
                  <h3>{navSections.find((section) => section.id === activeSection)?.label || "Module"}</h3>
                  <p>Module en préparation.</p>
                </div>
              )}
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="auth-stage">
          <div className="auth-card">
            <div className="auth-brand">
              <div className="auth-brand-mark">
                <img src="/icon.svg" alt="Flow" />
              </div>
              <div className="auth-brand-copy">
                <strong>Flow</strong>
              </div>
              <button type="button" className="ghost auth-journal-button" onClick={() => setReleaseOpen(true)}>
                Journal de version
              </button>
            </div>

            <div className="auth-tabs">
              <AuthTabButton active={activeTab === "login"} onClick={() => setActiveTab("login")}>Connexion</AuthTabButton>
              <AuthTabButton active={activeTab === "register"} onClick={() => setActiveTab("register")}>Créer</AuthTabButton>
              <AuthTabButton active={activeTab === "reset"} onClick={() => setActiveTab("reset")}>Mot de passe</AuthTabButton>
            </div>

            {activeTab === "login" ? (
              <form onSubmit={submitLogin}>
                <Field
                  label="Email"
                  type="email"
                  value={login.email}
                  onChange={(value) => syncEmailAcrossForms(value)}
                  placeholder="toi@flow.app"
                  autoComplete="username"
                  name="email"
                  disabled={Boolean(busy)}
                />
                <Field
                  label="Mot de passe"
                  type="password"
                  value={login.password}
                  onChange={(value) => setLogin((current) => ({ ...current, password: value }))}
                  placeholder="Mot de passe"
                  autoComplete="current-password"
                  name="password"
                  disabled={Boolean(busy)}
                />
                <div className="button-row">
                  <button type="submit" className="primary" disabled={busy === "login"}>
                    {busy === "login" ? "Connexion..." : "Se connecter"}
                  </button>
                  <button type="button" className="secondary" onClick={startGoogleAuth} disabled={Boolean(busy)}>
                    Continuer avec Google
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === "register" ? (
              <form onSubmit={submitRegister}>
                <Field
                  label="Nom"
                  value={register.name}
                  onChange={(value) => setRegister((current) => ({ ...current, name: value }))}
                  placeholder="Ton nom"
                  autoComplete="name"
                  name="name"
                  disabled={Boolean(busy)}
                />
                <Field
                  label="Email"
                  type="email"
                  value={register.email}
                  onChange={(value) => syncEmailAcrossForms(value)}
                  placeholder="toi@flow.app"
                  autoComplete="email"
                  name="email"
                  disabled={Boolean(busy)}
                />
                <Field
                  label="Mot de passe"
                  type="password"
                  value={register.password}
                  onChange={(value) => setRegister((current) => ({ ...current, password: value }))}
                  placeholder="8 caractères minimum"
                  autoComplete="new-password"
                  name="password"
                  disabled={Boolean(busy)}
                />
                <Field
                  label="Confirmer"
                  type="password"
                  value={register.confirmPassword}
                  onChange={(value) => setRegister((current) => ({ ...current, confirmPassword: value }))}
                  placeholder="Répète le mot de passe"
                  autoComplete="new-password"
                  name="confirmPassword"
                  disabled={Boolean(busy)}
                />
                <div className="button-row">
                  <button type="submit" className="primary" disabled={busy === "register"}>
                    {busy === "register" ? "Création..." : "Créer le compte"}
                  </button>
                  <button type="button" className="secondary" onClick={startGoogleAuth} disabled={Boolean(busy)}>
                    Créer via Google
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === "reset" ? (
              <>
                <form onSubmit={requestResetCode}>
                  <Field
                    label="Email du compte"
                    type="email"
                    value={reset.email}
                    onChange={(value) => syncEmailAcrossForms(value)}
                    placeholder="toi@flow.app"
                    autoComplete="email"
                    name="resetEmail"
                    disabled={Boolean(busy)}
                  />
                  <div className="button-row">
                    <button type="submit" className="secondary" disabled={busy === "request-reset"}>
                      {busy === "request-reset" ? "Envoi..." : "Envoyer le code"}
                    </button>
                  </div>
                </form>

                <form onSubmit={submitPasswordReset}>
                  <Field
                    label="Code reçu"
                    value={reset.code}
                    onChange={(value) => setReset((current) => ({ ...current, code: value }))}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    name="code"
                    disabled={Boolean(busy)}
                  />
                  <Field
                    label="Nouveau mot de passe"
                    type="password"
                    value={reset.password}
                    onChange={(value) => setReset((current) => ({ ...current, password: value }))}
                    placeholder="Nouveau mot de passe"
                    autoComplete="new-password"
                    name="newPassword"
                    disabled={Boolean(busy)}
                  />
                  <div className="button-row">
                    <button type="submit" className="primary" disabled={busy === "reset"}>
                      {busy === "reset" ? "Réinitialisation..." : "Mettre à jour"}
                    </button>
                  </div>
                  <p className="helper">{providers.email ? "Code envoyé si l’email est branché." : "Email non disponible sur cet environnement."}</p>
                </form>
              </>
            ) : null}
          </div>
        </div>
      )}

      <input ref={backgroundInputRef} type="file" accept="image/*" hidden onChange={(event) => void importBackgroundFromDevice(event)} />

      {commandOpen ? (
        <div className="command-backdrop" onClick={() => setCommandOpen(false)}>
          <div className="command-modal" onClick={(event) => event.stopPropagation()}>
            <div className="command-input">
              <Icon name="search" size={18} />
              <input
                ref={commandInputRef}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Rechercher notes, contacts, événements, tâches..."
                aria-label="Palette de commande"
              />
            </div>
            <div className="command-list">
              {searchResults.length ? (
                searchResults.map((result) => (
                  <button key={result.key} type="button" className="search-result" onClick={() => selectSearchResult(result)}>
                    <span className="nav-icon"><ResultIcon kind={result.kind} /></span>
                    <div className="search-result-copy">
                      <strong>{result.title}</strong>
                      <span>{result.subtitle}</span>
                      {result.body ? <p>{`${result.body}`.slice(0, 96)}</p> : null}
                    </div>
                    <Icon name="arrow-right" size={15} />
                  </button>
                ))
              ) : (
                <div className="notification-empty">Aucun résultat sur cette recherche.</div>
              )}
            </div>
            <div className="command-footer">
              <span>Échap pour fermer</span>
              <span>Recherche unique sans doublons</span>
            </div>
          </div>
        </div>
      ) : null}

      {shopifyGuideOpen ? (
        <div className="command-backdrop" onClick={() => setShopifyGuideOpen(false)}>
          <div className="command-modal" onClick={(event) => event.stopPropagation()} style={{ maxHeight: '84vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Guide Shopify
                </div>
                <h3 style={{ margin: 0, fontSize: '22px' }}>Installation de Shopify</h3>
                <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Suivez ces étapes pour récupérer votre token Shopify et le connecter directement sans quitter la page.
                </p>
              </div>
              <button type="button" onClick={() => setShopifyGuideOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '8px', fontWeight: 600 }} aria-label="Fermer le guide Shopify">
                Fermer
              </button>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <section>
                <h4>1. Créer l'application Shopify</h4>
                <ol style={{ margin: '10px 0 0 16px', color: 'var(--text-soft)' }}>
                  <li>Connectez-vous à l’admin Shopify.</li>
                  <li>Ouvrez <strong>Apps</strong> puis <strong>Develop apps</strong>.</li>
                  <li>Créez une app, donnez-lui un nom et sauvegardez.</li>
                </ol>
              </section>
              <section>
                <h4>2. Donner les permissions API</h4>
                <p style={{ margin: '8px 0 4px', color: 'var(--text-soft)' }}>Activez au minimum :</p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-soft)' }}>
                  <li><code>read_orders</code></li>
                  <li><code>read_products</code></li>
                  <li><code>read_customers</code></li>
                  <li><code>read_inventory</code></li>
                </ul>
              </section>
              <section>
                <h4>3. Installer l'application</h4>
                <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>
                  Installez l’app depuis l’onglet <strong>API credentials</strong> puis copiez le token une fois affiché.
                </p>
              </section>
              <section>
                <h4>4. Récupérer le token</h4>
                <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>
                  Copiez le token d’accès affiché (début <code>shpat_</code>) car il ne sera visible qu’une seule fois.
                </p>
              </section>
              <section>
                <h4>5. Connecter Shopify sur Flow</h4>
                <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>
                  Collez le domaine Shopify et le token dans le formulaire de connexion Shopify présent ici même.
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}><strong>Format attendu :</strong> <code>store.myshopify.com|shpat_xxx</code></p>
              </section>
              <section style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 10px' }}>Astuce rapide</h4>
                <p style={{ margin: 0, color: 'var(--text-soft)' }}>
                  Si vous perdez le token, régénérez-en un nouveau depuis Shopify puis remplacez l’ancien.
                </p>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {releaseOpen ? <ReleaseWidget release={remoteRelease || RELEASE} label={releaseMeta || RELEASE_LABEL} onClose={() => setReleaseOpen(false)} /> : null}
    </div>
  );
}
