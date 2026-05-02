"use client";

/**
 * FlowApp.jsx - Flow main application
 *
 * This file contains the main Flow application component.
 * It handles authentication, the dashboard, and all modules (notes, contacts, events, tasks, Shopify).
 *
 * Structure:
 * - State and constants
 * - Utility functions (formatting, API, etc.)
 * - Hooks and effects
 * - Event handlers (submit functions)
 * - Main FlowApp component
 * - Conditional rendering based on auth state
 * - Dashboard with sections (metrics, focus, mini-widgets)
 * - Specialized sections (notes, contacts, events, tasks, Shopify)
 * - Sidebar and navigation
 * - Modals and overlays
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
  focus: ["upcoming", "tasks", "shopify"],
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
  if (!value) return "No date";
  try {
    return new Intl.DateTimeFormat("en-US", {
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
  if (!value) return "Now";
  const delta = Date.now() - new Date(value).getTime();
  const abs = Math.abs(delta);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < minute) return "Just now";
  if (abs < hour) return `${Math.round(abs / minute)} min`;
  if (abs < day) return `${Math.round(abs / hour)} h`;
  return `${Math.round(abs / day)} d`;
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
  if (!value) return "No available slot";
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
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

function loadImageFromDataUrl(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Invalid image."));
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
    throw new Error("Background preparation failed.");
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
        title: "Weekly summary",
        content: "Check Shopify progress, confirm customer follow-ups, and prepare the next Flow sprint.",
        cat: "Control",
        color: "#c8cfbf",
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        id: "demo-note-2",
        title: "Priority touchpoints",
        content: "Central Station, Laura Martin, Samuel Costa, premium order tracking and support preparation.",
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
        title: "Call Laura Martin",
        desc: "Confirm delivery date and support needs.",
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
        title: "Business Review",
        desc: "Revenue review, alerts, and pending orders arbitration.",
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
        title: "Priority tracking",
        type: "text",
        text: "Anchor point to review essential account topics.",
        note: "Quick access to dashboard and alerts.",
      },
    ],
    activity: [
      {
        id: "demo-activity-1",
        type: "seed",
        title: "Active working dataset",
        detail: `Account ${user?.email || "Flow"} filled to accelerate development.`,
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
          title: item.title || "Activity",
      subtitle: item.detail || item.type || "Update",
      meta: formatRelative(item.createdAt),
    }));
  }

  const fallback = [
    ...(source.tasks || []).slice(0, 2).map((item) => ({
      id: `task:${item.id}`,
      title: item.title || "Task",
      subtitle: item.status || "In progress",
      meta: item.dueDate ? formatShortDate(item.dueDate) : "No date",
    })),
    ...(source.events || []).slice(0, 2).map((item) => ({
      id: `event:${item.id}`,
      title: item.title || "Event",
      subtitle: item.desc || "Scheduled",
      meta: item.date ? formatShortDate(item.date) : "Coming up",
    })),
    ...(source.notes || []).slice(0, 1).map((item) => ({
      id: `note:${item.id}`,
      title: item.title || "Note",
      subtitle: item.cat || "Draft",
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
    throw new Error(payload?.error || "Shopify not configured");
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

function stripHtml(value) {
  return `${value || ""}`
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value) {
  return `${value || ""}`
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function noteHtmlFromText(value) {
  const lines = `${value || ""}`.split(/\n/);
  return lines.map((line) => `<div>${escapeHtml(line) || "<br>"}</div>`).join("");
}

function getStoredNoteCategories(db) {
  const fromSettings = Array.isArray(db?.settings?.noteCategories) ? db.settings.noteCategories.filter((item) => `${item}`.trim() !== "Toutes les notes") : [];
  const fromNotes = (db?.notes || []).map((item) => item.cat).filter((item) => item && `${item}`.trim() !== "Toutes les notes");
  return ["Toutes les notes", ...new Set([...fromSettings, ...fromNotes].map((item) => `${item}`.trim()).filter(Boolean))];
}

function createNoteRecord(category) {
  const now = new Date().toISOString();
  return {
    id: `note-${Math.random().toString(36).slice(2, 10)}`,
    title: "",
    content: "<div><br></div>",
    cat: category || "Notes",
    color: "",
    createdAt: now,
    updatedAt: now,
  };
}

function notePreview(note) {
  return stripHtml(note?.content || "").slice(0, 180) || "Empty note";
}

function noteDateBucket(note) {
  const updated = toTimestamp(note?.updatedAt || note?.createdAt);
  const now = Date.now();
  const diff = now - updated;
  if (diff < 24 * 60 * 60 * 1000) return "Today";
  if (diff < 48 * 60 * 60 * 1000) return "Yesterday";
  if (diff < 7 * 24 * 60 * 60 * 1000) return "Last 7 days";
  return "Older";
}

function groupNotesByBucket(notes) {
  const order = ["Today", "Yesterday", "Last 7 days", "Older"];
  const map = new Map(order.map((label) => [label, []]));
  (notes || []).forEach((note) => {
    map.get(noteDateBucket(note))?.push(note);
  });
  return order
    .map((label) => ({ label, notes: map.get(label) || [] }))
    .filter((entry) => entry.notes.length);
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
      title: note.title || "Untitled note",
      subtitle: note.cat || "Note",
      body: stripHtml(note.content || ""),
      section: "notes",
    }),
  );

  source.tasks.forEach((task) =>
    push({
      kind: "task",
      id: task.id,
      title: task.title || "Untitled task",
      subtitle: task.status || "Task",
      body: task.desc || "",
      section: "tasks",
    }),
  );

  source.events.forEach((event) => {
    push({
      kind: "event",
      id: event.id,
      title: event.title || "Untitled event",
      subtitle: event.date || "Event",
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
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
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
    case "arrow-left":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m11 6-6 6 6 6" />
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
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
  const [noteQuery, setNoteQuery] = useState("");
  const [selectedNoteCategory, setSelectedNoteCategory] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [noteToolsOpen, setNoteToolsOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [noteCategoryDraft, setNoteCategoryDraft] = useState("");
  const [noteTitleDraft, setNoteTitleDraft] = useState("");
  const [noteFontFamily, setNoteFontFamily] = useState("inherit");
  const [noteTextColor, setNoteTextColor] = useState("#f4f5f7");
  const [noteFontSize, setNoteFontSize] = useState("18");
  const [shopifyDomainInput, setShopifyDomainInput] = useState("");
  const [shopifyTokenInput, setShopifyTokenInput] = useState("");
  const [shopifyConfigBusy, setShopifyConfigBusy] = useState(false);
  const [showShopifySecrets, setShowShopifySecrets] = useState(false);
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
  const noteSaveTimerRef = useRef(null);
  const searchWrapRef = useRef(null);
  const notifRef = useRef(null);
  const profileMenuRef = useRef(null);
  const noteToolsRef = useRef(null);
  const commandInputRef = useRef(null);
  const backgroundInputRef = useRef(null);
  const noteEditorRef = useRef(null);
  const noteCategoryInputRef = useRef(null);
  const noteSelectionRef = useRef(null);

  const releaseMeta = useMemo(() => formatReleaseLabel(remoteRelease || RELEASE), [remoteRelease]);
  const searchEntries = useMemo(() => buildSearchEntries(db, user), [db, user]);
  const notificationFeed = useMemo(
    () => [...(db.notifications || [])].sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)).slice(0, 8),
    [db.notifications],
  );
  const unreadNotifications = useMemo(
    () => (Array.isArray(db.notifications) ? db.notifications.filter((item) => !item.readAt).length : 0),
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
      activity: db.activity.length,
      bookmarks: db.bookmarks.length,
    };
  }, [db]);

  const dashboardFeed = useMemo(() => buildDashboardFeed(db), [db]);
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

  const noteCategories = useMemo(() => {
    const categories = getStoredNoteCategories(db);
    return categories.length ? categories : ["Notes"];
  }, [db]);

  const notesInSelectedCategory = useMemo(() => {
    const currentCategory = selectedNoteCategory || noteCategories[0] || "Notes";
    return [...(db.notes || [])]
      .filter((note) => currentCategory === "Toutes les notes" || (note.cat || "Notes") === currentCategory)
      .sort((left, right) => toTimestamp(right.updatedAt || right.createdAt) - toTimestamp(left.updatedAt || left.createdAt));
  }, [db.notes, noteCategories, selectedNoteCategory]);

  const filteredNotesInSelectedCategory = useMemo(() => {
    const query = noteQuery.trim().toLowerCase();
    if (!query) return notesInSelectedCategory;
    return notesInSelectedCategory.filter((note) =>
      [note.title, note.cat, stripHtml(note.content)]
        .filter(Boolean)
        .some((value) => `${value}`.toLowerCase().includes(query)),
    );
  }, [noteQuery, notesInSelectedCategory]);

  const selectedNote = useMemo(
    () => (db.notes || []).find((note) => note.id === selectedNoteId) || null,
    [db.notes, selectedNoteId],
  );

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
        Math.max(dashboardMetrics.bookmarks + 1, 1),
      ]),
    [dashboardMetrics],
  );

  const dashboardCards = useMemo(
    () => [
      {
        id: "notes",
        section: "notes",
        label: "Active notes",
        value: `${dashboardMetrics.notes}`,
        meta: recentNotes[0]?.title || `${dashboardMetrics.bookmarks} bookmarks`,
        icon: "note",
        primary: true,
      },
      {
        id: "tasks",
        section: "tasks",
        label: "To-do",
        value: `${dashboardMetrics.tasks}`,
        meta: openTasks[0]?.title || "No urgent task",
        icon: "check",
      },
      {
        id: "events",
        section: "events",
        label: "Calendar",
        value: `${dashboardMetrics.events}`,
        meta: upcomingEvents[0] ? formatEventSlot(upcomingEvents[0].date, upcomingEvents[0].time) : "No upcoming slot",
        icon: "calendar",
      },
      {
        id: "shopify",
        section: "shopify",
        label: `Shopify · ${activeShopifyPeriodLabel}`,
        value: formatCurrency(shopifyOverview.revenueCurrent),
        meta: shopifyState.ready ? `${shopifyOverview.ordersCurrent} order(s) · ${shopifyOverview.pendingFulfillment} to process` : "No store connected",
        icon: "bag",
      },
    ],
    [activeShopifyPeriodLabel, dashboardMetrics, openTasks, recentNotes, shopifyOverview, shopifyState.ready, upcomingEvents],
  );

  const dashboardFocusCards = useMemo(
    () => [
      {
        id: "upcoming",
        title: upcomingEvents[0]?.title || "No upcoming events",
        body: upcomingEvents[0] ? formatEventSlot(upcomingEvents[0].date, upcomingEvents[0].time) : "Add a slot or use search.",
        onClick: () => (upcomingEvents[0] ? setActiveSection("events") : setCommandOpen(true)),
      },
      {
        id: "tasks",
        title: openTasks[0]?.title || "No urgent task",
        body: openTasks[0]?.desc || "Your next tasks will appear here.",
        onClick: () => (openTasks[0] ? setActiveSection("tasks") : setCommandOpen(true)),
      },
      {
        id: "shopify",
        title: shopifyState.ready ? `${shopifyState.storeDomain}` : "Shopify not connected",
        body: shopifyState.ready ? `${shopifyOverview.pendingFulfillment} order(s) to process.` : "Connect a store or inject demo data.",
        onClick: () => setActiveSection("shopify"),
      },
    ],
    [openTasks, shopifyOverview.pendingFulfillment, shopifyState.ready, shopifyState.storeDomain, upcomingEvents],
  );

  const dashboardMiniCards = useMemo(
    () => [
      {
        id: "contacts",
        title: "Tracked contacts",
        body: `${dashboardMetrics.contacts} contacts linked to your events and account.`,
        onClick: () => setActiveSection("contacts"),
      },
      {
        id: "latest-note",
        title: "Latest note",
        body: recentNotes[0]?.title || "No recent note.",
        onClick: () => setActiveSection("notes"),
      },
      {
        id: "month-revenue",
        title: "Month revenue",
        body: formatCurrency(shopifyOverview.revenueMonth),
        onClick: () => setActiveSection("shopify"),
      },
      {
        id: "background",
        title: "Active background",
        body: currentThemeBackground ? "Custom image active." : "Base background active.",
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
      { id: "account", label: "Account" },
      { id: "appearance", label: "Appearance" },
      { id: "privacy", label: "Security" },
      { id: "integrations", label: "Integrations" },
      { id: "billing", label: "Billing" },
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
      { id: "events", label: "Events", icon: "calendar" },
      { id: "tasks", label: "Tasks", icon: "check" },
      { id: "shopify", label: "Shopify", icon: "bag" },
      { id: "profile", label: "Settings", icon: "sliders" },
    ],
    [],
  );

  const effectiveLayout = isMobile ? "overview" : dashboardLayout;
  const sidebarExpanded = isMobile ? mobileNavOpen : sidebarLocked || sidebarHover;
  const shellCollapsedClass = !sidebarExpanded && !isMobile ? "collapsed" : "";
  const themeClass = shellTheme === "light" ? "theme-light" : "theme-dark";
  const shouldShowSidebar = effectiveLayout !== "immersive";
  const sidebarShowsDetails = isMobile || sidebarExpanded;
  const demoModeActive = Boolean(db.settings?.demoFixtures?.overrideShopify);

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
    if (!noteCategories.length) return;
    if (!selectedNoteCategory || !noteCategories.includes(selectedNoteCategory)) {
      setSelectedNoteCategory(noteCategories[0]);
    }
  }, [noteCategories, selectedNoteCategory]);

  useEffect(() => {
    if (!notesInSelectedCategory.length) {
      setSelectedNoteId("");
      setNoteTitleDraft("");
      return;
    }
    if (selectedNoteId && !notesInSelectedCategory.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId("");
    }
  }, [notesInSelectedCategory, selectedNoteId]);

  useEffect(() => {
    if (!selectedNote) return;
    setNoteTitleDraft(selectedNote.title || "");
    if (noteEditorRef.current) {
      noteEditorRef.current.innerHTML = selectedNote.content || "";
    }
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!creatingCategory) return;
    window.setTimeout(() => noteCategoryInputRef.current?.focus(), 20);
  }, [creatingCategory]);

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
      if (db.settings?.demoFixtures?.overrideShopify && shopifyDemoOrders.length) {
        const data = summarizeShopifyData({ orders: shopifyDemoOrders });
        setShopifyState({
          loading: false,
          error: "",
          data,
          refreshedAt: db.settings?.demoFixtures?.seededAt || new Date().toISOString(),
          ready: Boolean(storedShopifyConfig.storeDomain && storedShopifyConfig.accessToken),
          storeDomain: storedShopifyConfig.storeDomain || "",
        });
        return;
      }

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
          error: statusPayload?.error || "No Shopify store is connected to this account.",
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
          setNotice("Google login successful.");
        } else if (googleState === "missing-config") {
          setError("Google is not configured in this environment.");
        } else if (googleState === "cancelled") {
          setError("Google login cancelled.");
        } else if (googleState === "failed") {
          setError("Google login failed. Check OAuth configuration.");
        } else if (googleState === "invalid-state") {
          setError("Invalid OAuth state. Retry Google login.");
        } else if (googleState === "missing-code") {
          setError("Missing Google code. Retry the login.");
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
          setNotice(`New version available: v${payload.version}.`);
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
        summary: "A new version was published.",
      });
      setNotice("A live update has been detected.");
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
    document.documentElement.style.overflow = overlayActive ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [commandOpen, shopifyGuideOpen, releaseOpen, searchOpen, notificationOpen]);

  useEffect(() => {
    function onPointerDown(event) {
      const target = event.target;
      if (searchWrapRef.current && !searchWrapRef.current.contains(target)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(target)) setNotificationOpen(false);
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) setProfileMenuOpen(false);
      if (noteToolsRef.current && !noteToolsRef.current.contains(target)) setNoteToolsOpen(false);
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
      setNotice("Immersive view is desktop only.");
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
    await persistDb(nextDb, nextImage ? "Background updated." : "Background reset.");
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

  function scheduleNotePersist(nextDb) {
    setDb(nextDb);
    if (noteSaveTimerRef.current) window.clearTimeout(noteSaveTimerRef.current);
    noteSaveTimerRef.current = window.setTimeout(async () => {
      try {
        const payload = await api("/api/db", {
          method: "PUT",
          body: JSON.stringify({ db: nextDb }),
        });
        setDb(payload?.db || nextDb);
      } catch (persistError) {
        setError(normalizeMessage(persistError, "Sauvegarde de la note impossible."));
      }
    }, 420);
  }

  function updateSelectedNote(fields) {
    if (!selectedNote) return;
    const nextDb = {
      ...db,
      notes: (db.notes || []).map((note) =>
        note.id === selectedNote.id
          ? {
              ...note,
              ...fields,
              updatedAt: new Date().toISOString(),
            }
          : note,
      ),
    };
    scheduleNotePersist(nextDb);
  }

  async function commitNoteCategory() {
    const name = noteCategoryDraft.trim();
    if (!name) {
      setCreatingCategory(false);
      setNoteCategoryDraft("");
      return;
    }
    if (noteCategories.includes(name)) {
      setSelectedNoteCategory(name);
      setNoteCategoryDraft("");
      setCreatingCategory(false);
      return;
    }
    const nextDb = nextDbWithSettings({
      noteCategories: [...noteCategories.filter((item) => item !== "Toutes les notes"), name],
    });
    setSelectedNoteCategory(name);
    setNoteCategoryDraft("");
    setCreatingCategory(false);
    await persistDb(nextDb, "Category created.");
  }

  function createNoteCategory() {
    setCreatingCategory(true);
    setNoteCategoryDraft("");
    setSelectedNoteId("");
  }

  async function createNoteInCategory(category = selectedNoteCategory || noteCategories[0] || "Notes") {
    const targetCategory = category === "Toutes les notes" ? (noteCategories.find((item) => item !== "Toutes les notes") || "Notes") : category;
    const note = createNoteRecord(targetCategory);
    const nextDb = {
      ...db,
      notes: [note, ...(db.notes || [])],
      settings: {
        ...(db.settings || {}),
        noteCategories: noteCategories.includes(targetCategory) ? noteCategories.filter((item) => item !== "Toutes les notes") : [...noteCategories.filter((item) => item !== "Toutes les notes"), targetCategory],
      },
    };
    setSelectedNoteCategory(targetCategory);
    setSelectedNoteId(note.id);
    setNoteTitleDraft(note.title || "");
    await persistDb(nextDb, "Note created.");
  }

  function persistEditorHtml() {
    const html = noteEditorRef.current?.innerHTML || "";
    updateSelectedNote({ content: html });
  }

  function rememberNoteSelection() {
    const selection = window.getSelection?.();
    if (!selection || !selection.rangeCount || !noteEditorRef.current) return;
    const range = selection.getRangeAt(0);
    if (!noteEditorRef.current.contains(range.commonAncestorContainer)) return;
    noteSelectionRef.current = range.cloneRange();
  }

  function restoreNoteSelection() {
    const selection = window.getSelection?.();
    if (!selection || !noteSelectionRef.current) return;
    selection.removeAllRanges();
    selection.addRange(noteSelectionRef.current);
  }

  function preserveNoteSelection(event) {
    event.preventDefault();
  }

  function applyNoteCommand(command, value = null) {
    restoreNoteSelection();
    noteEditorRef.current?.focus();
    document.execCommand(command, false, value);
    rememberNoteSelection();
    persistEditorHtml();
  }

  function applyNoteFontSize(size) {
    setNoteFontSize(size);
    restoreNoteSelection();
    noteEditorRef.current?.focus();
    document.execCommand("fontSize", false, "7");
    noteEditorRef.current?.querySelectorAll('font[size="7"]').forEach((node) => {
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      span.innerHTML = node.innerHTML;
      node.replaceWith(span);
    });
    rememberNoteSelection();
    persistEditorHtml();
  }

  function insertChecklistLine() {
    restoreNoteSelection();
    noteEditorRef.current?.focus();
    document.execCommand(
      "insertHTML",
      false,
      '<div class="note-check-row"><span class="note-check" data-checked="false" contenteditable="false"></span><span>&nbsp;</span></div>',
    );
    rememberNoteSelection();
    persistEditorHtml();
  }

  function applyNoteBlock(type) {
    restoreNoteSelection();
    noteEditorRef.current?.focus();
    if (type === "body") {
      document.execCommand("formatBlock", false, "div");
    } else if (type === "title") {
      document.execCommand("formatBlock", false, "h1");
    } else if (type === "subtitle") {
      document.execCommand("formatBlock", false, "h2");
    } else if (type === "secondary") {
      document.execCommand("formatBlock", false, "h3");
    } else if (type === "mono") {
      document.execCommand("fontName", false, "Courier New");
    } else if (type === "bullets") {
      document.execCommand("insertUnorderedList");
    } else if (type === "numbers") {
      document.execCommand("insertOrderedList");
    } else if (type === "quote") {
      document.execCommand("formatBlock", false, "blockquote");
    }
    rememberNoteSelection();
    persistEditorHtml();
    setNoteToolsOpen(false);
  }

  function onNoteEditorInput(event) {
    updateSelectedNote({ content: event.currentTarget.innerHTML || "" });
    rememberNoteSelection();
  }

  function onNoteEditorClick(event) {
    const toggle = event.target.closest?.(".note-check");
    if (!toggle) return;
    const checked = toggle.getAttribute("data-checked") === "true";
    toggle.setAttribute("data-checked", checked ? "false" : "true");
    persistEditorHtml();
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
      setNotice("Login successful.");
      setLogin((current) => ({ ...current, password: "" }));
    } catch (authError) {
      setError(normalizeMessage(authError, "Login failed."));
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
      setError("Name is required.");
      setBusy("");
      return;
    }
    if (register.password !== register.confirmPassword) {
      setError("Passwords do not match.");
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
      setNotice("Account created. Your session is now active.");
    } catch (registerError) {
      setError(normalizeMessage(registerError, "Account creation failed."));
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
      setNotice(payload?.message || "If the account exists, a code will be sent.");
    } catch (resetError) {
      setError(normalizeMessage(resetError, "Code delivery failed."));
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
      setNotice("Password updated.");
      setLogin((current) => ({ ...current, email: reset.email, password: "" }));
      setReset((current) => ({ ...current, code: "", password: "" }));
      setActiveTab("login");
    } catch (resetError) {
      setError(normalizeMessage(resetError, "Password reset failed."));
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
      setNotice("Session closed.");
      await refreshSession().catch(() => {});
    } catch (logoutError) {
      setError(normalizeMessage(logoutError, "Logout failed."));
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
    if (result.section === "notes") {
      const matchingNote = (db.notes || []).find((item) => item.id === result.id);
      if (matchingNote) {
        setSelectedNoteCategory(matchingNote.cat || "Notes");
        setSelectedNoteId(matchingNote.id);
      }
    }
    setSearchOpen(false);
    setCommandOpen(false);
    setMobileNavOpen(false);
    setSearchValue(result.title);
    setNotice(`Result loaded: ${result.title}`);
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
      setNotice("Account settings saved.");
    } catch (accountError) {
      setError(normalizeMessage(accountError, "Unable to update account settings."));
    } finally {
      setAccountBusy(false);
    }
  }

  async function markNotificationsAsRead(ids = []) {
    const existingNotifications = Array.isArray(db.notifications) ? db.notifications : [];
    const now = new Date().toISOString();
    const nextDb = {
      ...db,
      notifications: existingNotifications.map((notification) => {
        if (ids.length === 0) {
          return notification.readAt ? notification : { ...notification, readAt: now };
        }
        if (ids.includes(notification.id)) {
          return notification.readAt ? notification : { ...notification, readAt: now };
        }
        return notification;
      }),
    };

    try {
      await persistDb(nextDb, ids.length ? "Notification marked as read." : "All notifications marked as read.");
      setNotificationOpen(true);
    } catch {
      // persistDb handles error feedback.
    }
  }

  async function saveSettingsPatch(patch, message = "Settings updated.") {
    try {
      await persistDb(nextDbWithSettings(patch), message);
    } catch {
      // handled by persistDb
    }
  }

  async function saveDashboardArrangement(nextArrangement) {
    setDashboardArrangement(nextArrangement);
    try {
      await persistDb(nextDbWithSettings({ dashboardArrangement: nextArrangement }), "Dashboard arrangement updated.");
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
      setNotice(`Shopify store connected${payload?.shop?.name ? ` : ${payload.shop.name}` : ""}.`);
      await refreshShopifyData();
    } catch (configError) {
      setError(normalizeMessage(configError, "Shopify connection failed."));
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
      setNotice("Shopify store disconnected.");
    } catch (configError) {
      setError(normalizeMessage(configError, "Shopify removal failed."));
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
      const isDemoActive = Boolean(db.settings?.demoFixtures?.overrideShopify);

      const extractIds = (items) => (Array.isArray(items) ? items.map((item) => item?.id).filter(Boolean) : []);
      const demoIds = new Set([
        ...extractIds(fixtures.notes),
        ...extractIds(fixtures.tasks),
        ...extractIds(fixtures.events),
        ...extractIds(fixtures.bookmarks),
        ...extractIds(fixtures.activity),
      ]);

      if (isDemoActive) {
        const nextDb = {
          ...db,
          notes: (db.notes || []).filter((item) => !demoIds.has(item?.id)),
          tasks: (db.tasks || []).filter((item) => !demoIds.has(item?.id)),
          events: (db.events || []).filter((item) => !demoIds.has(item?.id)),
          bookmarks: (db.bookmarks || []).filter((item) => !demoIds.has(item?.id)),
          activity: (db.activity || []).filter((item) => !demoIds.has(item?.id)),
          settings: {
            ...(db.settings || {}),
            demoFixtures: {
              seededAt: "",
              shopifyOrders: [],
              overrideShopify: false,
            },
          },
        };
        await persistDb(nextDb, "Mode test desactive.");
        await refreshShopifyData();
        setNotice("Demo mode disabled. No store is connected.");
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
        activity: uniqueById(db.activity || [], fixtures.activity),
        settings: {
          ...(db.settings || {}),
          demoFixtures: {
            seededAt: new Date().toISOString(),
            shopifyOrders: fixtures.shopifyOrders,
            overrideShopify: true,
          },
        },
      };
      await persistDb(nextDb, "Donnees de travail injectees.");
      await refreshShopifyData();
      setNotice("Demo mode enabled.");
    } catch (seedError) {
      setError(normalizeMessage(seedError, "Demo data injection failed."));
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
          transition: width 0.22s ease, transform 0.22s ease, padding 0.22s ease;
          position: relative;
          z-index: 20;
          overflow: hidden;
          min-height: 0;
        }
        .theme-light .sidebar {
          background: var(--surface-layer-strong);
        }
        .theme-light .search-dropdown,
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
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .sidebar-nav::-webkit-scrollbar {
          display: none;
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
          padding: 0;
          border: 0;
          background: none;
          box-shadow: none;
          backdrop-filter: none;
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
          background: transparent;
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
          background: transparent;
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
        .profile-menu {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 0;
          z-index: 190;
          border-radius: 17px;
          background: var(--surface-layer-strong);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          animation: riseIn 0.24s ease;
          min-width: 200px;
          overflow: hidden;
        }
        .notification-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: min(360px, calc(100vw - 32px));
          z-index: 190;
          border-radius: 17px;
          background: rgba(16, 18, 24, 0.98);
          border: 1px solid var(--line);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          animation: riseIn 0.24s ease;
          overflow: hidden;
        }
        .theme-light .notification-menu {
          background: rgba(240, 243, 247, 0.98);
        }
        .notification-menu-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid var(--line);
        }
        .notification-menu-head strong {
          font-size: 14px;
        }
        .notification-menu-list {
          display: grid;
          gap: 8px;
          padding: 12px;
          max-height: min(52vh, 420px);
          overflow: auto;
        }
        .notification-menu-item {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          padding: 12px 14px;
          display: grid;
          gap: 8px;
        }
        .notification-menu-item p,
        .notification-menu-item span {
          margin: 0;
          color: var(--text-soft);
          font-size: 12px;
        }
        .notification-menu-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .notification-menu-actions button {
          border-radius: 12px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--text-main);
          min-height: 34px;
          padding: 0 12px;
        }
        .profile-menu-item {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--text-main);
          font-size: 14px;
          text-align: left;
          transition: background 0.2s ease;
          border-bottom: 1px solid var(--line);
        }
        .profile-menu-item:last-child {
          border-bottom: none;
        }
        .profile-menu-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .search-dropdown::before,
        .command-modal::before,
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
        .theme-toggle {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
          cursor: pointer;
        }
        .theme-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .toggle-slider {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--surface-layer);
          border: 1px solid var(--line);
          border-radius: 17px;
          transition: 0.3s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
        }
        .toggle-slider:before {
          content: "";
          position: absolute;
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background: var(--text-main);
          border-radius: 50%;
          transition: 0.3s;
        }
        .theme-toggle input:checked + .toggle-slider:before {
          transform: translateX(26px);
        }
        .theme-toggle input:checked + .toggle-slider {
          background: var(--accent);
        }
        .layout-toggle {
          position: relative;
          display: inline-block;
          width: 80px;
          height: 24px;
          cursor: pointer;
        }
        .layout-toggle input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .layout-toggle .toggle-slider {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--surface-layer);
          border: 1px solid var(--line);
          border-radius: 17px;
          transition: 0.3s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          font-size: 12px;
          color: var(--text-soft);
        }
        .layout-toggle .toggle-slider:before {
          content: "";
          position: absolute;
          height: 16px;
          width: 16px;
          left: 3px;
          bottom: 3px;
          background: var(--text-main);
          border-radius: 50%;
          transition: 0.3s;
        }
        .layout-toggle input:checked + .toggle-slider:before {
          transform: translateX(56px);
        }
        .layout-toggle input:checked + .toggle-slider {
          background: var(--accent);
        }
        .shopify-connect-form {
          display: grid;
          gap: 12px;
        }
        .shopify-secret-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
        }
        .shopify-secret-row input {
          min-width: 0;
          width: 100%;
        }
        .secret-toggle {
          all: unset;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer);
          color: var(--text-soft);
          cursor: pointer;
        }
        .secret-toggle:hover {
          border-color: var(--text-main);
          color: var(--text-main);
        }
        .setting-stack {
          display: grid;
          gap: 18px;
        }
        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid var(--line);
        }
        .setting-row:last-child {
          border-bottom: none;
        }
        .setting-row label {
          font-weight: 500;
          color: var(--text-main);
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
        .notes-layout {
          display: grid;
          grid-template-columns: 280px minmax(0, 1fr);
          gap: 18px;
          min-height: 0;
        }
        .notes-categories,
        .notes-content-pane,
        .notes-editor-pane {
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-strong);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          min-width: 0;
          min-height: 0;
        }
        .notes-categories {
          padding: 16px;
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr);
          gap: 12px;
        }
        .notes-categories-top,
        .notes-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .notes-categories-top h2,
        .notes-list-head h1 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.05em;
        }
        .notes-list-head span,
        .notes-categories-top span {
          color: var(--text-soft);
          font-size: 13px;
        }
        .notes-category-create {
          display: grid;
          gap: 10px;
        }
        .notes-category-create input,
        .note-title-input,
        .notes-editor-toolbar select {
          width: 100%;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          padding: 14px 16px;
          outline: none;
        }
        .notes-category-list,
        .notes-list-scroll {
          min-height: 0;
          overflow: auto;
          display: grid;
          align-content: start;
          gap: 10px;
          padding-right: 4px;
        }
        .notes-category-item {
          all: unset;
          box-sizing: border-box;
          border-radius: 17px;
          border: 1px solid transparent;
          background: rgba(255,255,255,0.03);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          color: var(--text-soft);
        }
        .notes-category-item.active {
          background: var(--surface-layer-soft);
          border-color: var(--line);
          color: var(--text-main);
        }
        .notes-content-pane {
          padding: 16px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          gap: 14px;
        }
        .notes-card-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          align-content: start;
        }
        .note-card {
          all: unset;
          box-sizing: border-box;
          border-radius: 17px;
          border: 1px solid var(--line);
          background: var(--surface-layer);
          padding: 16px;
          display: grid;
          gap: 8px;
          cursor: pointer;
          min-width: 0;
        }
        .note-card.active {
          border-color: var(--line-strong);
          background: var(--surface-layer-soft);
        }
        .note-card strong,
        .note-card span,
        .note-card small {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .note-card span,
        .note-card small {
          color: var(--text-soft);
        }
        .notes-editor-pane {
          padding: 16px;
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr);
          gap: 14px;
          min-height: calc(100dvh - 170px);
        }
        .notes-editor-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .notes-editor-actions {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .notes-tools-button {
          min-width: 42px;
          height: 42px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          font-size: 18px;
          font-weight: 700;
        }
        .notes-tools-popup {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: min(320px, calc(100vw - 48px));
          border-radius: 17px;
          border: 1px solid var(--line);
          background: rgba(18, 20, 27, 0.98);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(24px);
          padding: 14px;
          display: grid;
          gap: 14px;
          z-index: 40;
        }
        .theme-light .notes-tools-popup {
          background: rgba(241, 243, 247, 0.98);
        }
        .notes-tools-inline {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .notes-tools-inline button,
        .notes-tools-inline select,
        .notes-tools-inline input[type="color"] {
          min-height: 40px;
          border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          padding: 0 12px;
        }
        .notes-tools-inline input[type="color"] {
          width: 44px;
          padding: 4px;
        }
        .notes-tools-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .notes-tools-grid button {
          border-radius: 14px;
          border: 1px solid var(--line);
          background: var(--surface-layer-soft);
          color: var(--text-main);
          min-height: 42px;
          padding: 0 12px;
          text-align: left;
        }
        .note-title-input {
          font-size: 38px;
          font-weight: 700;
          letter-spacing: -0.06em;
          background: transparent;
          border: 0;
          padding: 0;
        }
        .note-title-input::placeholder {
          color: var(--text-soft);
        }
        .note-editor {
          min-height: 0;
          overflow: auto;
          padding-right: 4px;
          font-size: 18px;
          line-height: 1.7;
          outline: none;
          white-space: normal;
          color: var(--text-main);
        }
        .note-editor:empty::before {
          content: attr(data-placeholder);
          color: var(--text-soft);
        }
        .note-editor > div,
        .note-editor > p {
          margin: 0 0 12px;
        }
        .note-check-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .note-check {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 1px solid var(--line-strong);
          background: transparent;
          display: inline-block;
          cursor: pointer;
          flex: none;
          position: relative;
        }
        .note-check[data-checked="true"]::after {
          content: "";
          position: absolute;
          inset: 4px;
          border-radius: 999px;
          background: currentColor;
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
        .input-with-toggle {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-with-toggle input {
          flex: 1;
          padding-right: 48px;
        }
        .input-toggle-button {
          position: absolute;
          right: 14px;
          all: unset;
          cursor: pointer;
          padding: 8px;
          display: grid;
          place-items: center;
          color: var(--text-soft);
          transition: color 0.2s ease;
        }
        .input-toggle-button:hover {
          color: var(--text-main);
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
          .notes-layout {
            grid-template-columns: 1fr;
          }
          .notes-categories,
          .notes-content-pane,
          .notes-editor-pane {
            max-height: 32dvh;
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
                <strong>Update ready</strong>
                <p>This page will reload in {reloadCountdown}s to load {formatReleaseLabel(availableUpdate)}.</p>
              </div>
              <button type="button" onClick={() => window.location.reload()} aria-label="Reload">
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
                    aria-label={sidebarLocked ? "Unlock sidebar" : "Lock sidebar"}
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

              <div className={`sidebar-footer ${sidebarShowsDetails ? "" : "collapsed"}`} ref={profileMenuRef}>
                {sidebarShowsDetails ? (
                  <>
                    <button type="button" style={{ all: 'unset', cursor: 'pointer', width: '100%', textAlign: 'left' }} onClick={() => setProfileMenuOpen(!profileMenuOpen)} aria-label="Open profile menu">
                      <div className="sidebar-footer-copy">
                        <strong>{user.name || "Flow account"}</strong>
                        <span>{user.email}</span>
                      </div>
                    </button>
                    {profileMenuOpen ? (
                      <div className="profile-menu">
                        <button type="button" className="profile-menu-item" onClick={() => {
                          setActiveSection("profile");
                          setSettingsTab("account");
                          setProfileMenuOpen(false);
                        }}>
                          <Icon name="user" size={16} />
                          <span>Profile</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={() => {
                          setActiveSection("profile");
                          setSettingsTab("account");
                          setProfileMenuOpen(false);
                        }}>
                          <Icon name="settings" size={16} />
                          <span>Settings</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={() => setProfileMenuOpen(false)}>
                          <Icon name="help" size={16} />
                          <span>Help</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={() => setProfileMenuOpen(false)}>
                          <Icon name="mail" size={16} />
                          <span>Contact us</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={submitLogout} disabled={busy === "logout"}>
                          <Icon name="log-out" size={16} />
                          <span>{busy === "logout" ? "Logging out..." : "Sign out"}</span>
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <button type="button" style={{ all: 'unset', cursor: 'pointer' }} onClick={() => setProfileMenuOpen(!profileMenuOpen)} aria-label={user.name || "Profil"}>
                    <div className="sidebar-footer-mini">
                      {profilePhotoUrl ? <img src={profilePhotoUrl} alt={user.name || "Profil"} /> : initialsFromName(user.name).slice(0, 1)}
                    </div>
                    {profileMenuOpen ? (
                      <div className="profile-menu">
                        <button type="button" className="profile-menu-item" onClick={() => {
                          setActiveSection("profile");
                          setSettingsTab("account");
                          setProfileMenuOpen(false);
                        }}>
                          <Icon name="user" size={16} />
                          <span>Profile</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={() => {
                          setActiveSection("profile");
                          setSettingsTab("account");
                          setProfileMenuOpen(false);
                        }}>
                          <Icon name="settings" size={16} />
                          <span>Settings</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={() => setProfileMenuOpen(false)}>
                          <Icon name="help" size={16} />
                          <span>Help</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={() => setProfileMenuOpen(false)}>
                          <Icon name="mail" size={16} />
                          <span>Contact us</span>
                        </button>
                        <button type="button" className="profile-menu-item" onClick={submitLogout} disabled={busy === "logout"}>
                          <Icon name="log-out" size={16} />
                          <span>{busy === "logout" ? "Logging out..." : "Sign out"}</span>
                        </button>
                      </div>
                    ) : null}
                  </button>
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
                  aria-label="Open sidebar"
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
                    placeholder="Search notes, contacts, events, tasks..."
                    aria-label="Global search"
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
                      <div className="notification-empty">No results found for this search.</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="topbar-actions" ref={notifRef}>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    setNotificationOpen((current) => !current);
                    setSearchOpen(false);
                  }}
                  aria-label="Open notifications"
                >
                  <Icon name="bell" size={18} />
                  {unreadNotifications ? <span className="badge">{Math.min(unreadNotifications, 9)}</span> : null}
                </button>
                {notificationOpen ? (
                  <div className="notification-menu">
                    <div className="notification-menu-head">
                      <strong>Notifications</strong>
                      <button type="button" onClick={() => void markNotificationsAsRead()} disabled={!unreadNotifications}>
                        Mark all read
                      </button>
                    </div>
                    <div className="notification-menu-list">
                      {notificationFeed.length ? notificationFeed.map((item) => (
                        <div key={item.id} className="notification-menu-item">
                          <strong>{item.title || "Notification"}</strong>
                          <p>{item.body || ""}</p>
                          <div className="notification-menu-actions">
                            <span>{formatRelative(item.createdAt)}</span>
                            {!item.readAt ? (
                              <button type="button" onClick={() => void markNotificationsAsRead([item.id])}>Mark as read</button>
                            ) : (
                              <span>Read</span>
                            )}
                          </div>
                        </div>
                      )) : <div className="notification-empty">No notifications.</div>}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void seedDemoData()}
                  aria-label={demoModeActive ? "Disable demo mode" : "Enable demo mode"}
                  disabled={demoBusy}
                >
                  <Icon name="spark" size={18} />
                </button>
                <label className="theme-toggle">
                  <input
                    type="checkbox"
                    checked={shellTheme === "dark"}
                    onChange={() => void applyTheme(shellTheme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                  />
                  <span className="toggle-slider">
                    <Icon name="sun" size={14} />
                    <Icon name="moon" size={14} />
                  </span>
                </label>
              </div>
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
                            <span><span className="legend-dot" style={{ background: "currentColor" }} />Active load</span>
                            <span><span className="legend-dot" style={{ background: "rgba(255,146,113,0.45)" }} />Summary snapshot</span>
                          </div>
                        </div>

                        <div className="content-card">
                          <div className="content-card-header">
                            <div>
                              <h2>Day view</h2>
                              <p>What deserves your attention first.</p>
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
                              <p>{selectedResult.body || "Full details will open here while modules are built one by one."}</p>
                            </>
                          ) : (
                            <>
                              <h3>Focus area</h3>
                              <p>Select a note, contact, event, or task.</p>
                            </>
                          )}
                        </div>

                        <div className="surface-card">
                          <div className="surface-head">
                            <div>
                              <h2>Recent items</h2>
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
                                  <strong>Nothing recent</strong>
                                  <span>The account is waiting for its first items.</span>
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
                              <h2>Control Center</h2>
                              <p>Immersive dashboard layout, no sidebar, with all modules moved to the top of the page.</p>
                            </div>
                            <button type="button" className="ghost" onClick={() => setActiveSection("profile")}>
                              Open profile
                            </button>
                          </div>
                          <div className="floating-kpis">
                            <div className="floating-kpi">
                              <span>Notes</span>
                              <strong>{dashboardMetrics.notes}</strong>
                            </div>
                            <div className="floating-kpi">
                              <span>Active</span>
                              <strong>{dashboardMetrics.tasks}</strong>
                            </div>
                            <div className="floating-kpi">
                              <span>Events</span>
                              <strong>{dashboardMetrics.events}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="floating-card">
                          <div className="surface-head">
                            <div>
                              <h2>Watchboard</h2>
                              <p>The same visual system will serve the modules as they are connected one by one.</p>
                            </div>
                          </div>
                          <div className="overview-list">
                            <div className="overview-list-item">
                              <div>
                                <strong>Priority search</strong>
                                <span>Duplicate-free results with fast keyboard access.</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="immersive-right">
                        <div className="immersive-header">
                          <h1>Flow Dashboard</h1>
                          <p>The immersive layout keeps the same data while replacing the left sidebar with a top-level workspace.</p>
                          <div className="route-pills">
                            <span className="route-pill">Global search</span>
                            <span className="route-pill">Profile & structure</span>
                          </div>
                        </div>

                        <div className="floating-card">
                          <div className="surface-head">
                            <div>
                              <h2>Selected result</h2>
                              <p>{selectedResult ? "The selected search result appears here." : "No active result at the moment."}</p>
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
                              <p>{selectedResult.body || "Full module details will appear here as sections are rebuilt."}</p>
                            </div>
                          ) : (
                            <div className="section-placeholder" style={{ minHeight: 160 }}>
                              <p>Use the top search or `⌘K / Ctrl+K` to load a card here.</p>
                            </div>
                          )}
                        </div>

                        <div className="immersive-bottom">
                          <div className="floating-card schedule-card">
                            <div className="surface-head">
                              <div>
                                <h2>Module cadence</h2>
                                <p>A simple overview of the building blocks we're reworking.</p>
                              </div>
                              <button type="button" className="release-chip" onClick={() => setReleaseOpen(true)}>
                                <Icon name="spark" size={15} />
                                {releaseMeta}
                              </button>
                            </div>
                            <div className="schedule-scale">
                              <div className="scale-row">
                                <span>Search</span>
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
                      <p>{shopifyState.ready ? `Store connected · ${shopifyState.storeDomain}` : "Connect your store or load demo work data."}</p>
                    </div>
                  </div>

                  {!shopifyState.ready && !shopifyState.data ? (
                    <div className="surface-card shopify-connect-card">
                      <div className="surface-head">
                        <div>
                          <h2>No store connected</h2>
                          <p>Enter your Shopify domain and token separately. The token is retrieved from Shopify Admin with the <code>read_orders</code> permission. <button type="button" onClick={() => setShopifyGuideOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>Full guide</button>.</p>
                        </div>
                      </div>
                      <div className="shopify-connect-form">
                        <input
                          type="text"
                          value={shopifyDomainInput}
                          onChange={(event) => setShopifyDomainInput(event.target.value)}
                          placeholder="store.myshopify.com"
                          aria-label="Shop domain"
                        />
                        <input
                          type="text"
                          value={shopifyTokenInput}
                          onChange={(event) => setShopifyTokenInput(event.target.value)}
                          placeholder="shpat_xxx"
                          aria-label="Shopify access token"
                        />
                        <div className="button-row">
                          <button type="button" className="primary" onClick={() => void saveShopifyConfig()} disabled={shopifyConfigBusy}>
                            {shopifyConfigBusy ? "Connecting..." : "Connect store"}
                          </button>
                          <button type="button" className="ghost" onClick={() => void seedDemoData()} disabled={demoBusy}>
                            {db.settings?.demoFixtures?.overrideShopify ? "Stop demo mode" : "Test with fake shop data"}
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
                          { label: "Period revenue", value: formatCurrency(shopifyOverview.revenueCurrent), icon: "activity" },
                          { label: "Month revenue", value: formatCurrency(shopifyOverview.revenueMonth), icon: "grid" },
                          { label: "Orders", value: `${shopifyOverview.ordersCurrent}`, icon: "note", action: () => setActiveSection("shopify-orders") },
                          { label: "Unfulfilled", value: `${shopifyOverview.pendingFulfillment}`, icon: "check" },
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
                            <h2>Period · {activeShopifyPeriodLabel}</h2>
                          </div>
                        </div>
                        <div className="shopify-mobile-kpi-grid">
                          <div className="shopify-mobile-kpi-item">
                            <span>Period revenue</span>
                            <strong>{formatCurrency(shopifyOverview.revenueCurrent)}</strong>
                          </div>
                          <div className="shopify-mobile-kpi-item">
                            <span>Month revenue</span>
                            <strong>{formatCurrency(shopifyOverview.revenueMonth)}</strong>
                          </div>
                          <div className="shopify-mobile-kpi-item">
                            <span>Orders</span>
                            <strong>{shopifyOverview.ordersCurrent}</strong>
                          </div>
                          <div className="shopify-mobile-kpi-item">
                            <span>Pending</span>
                            <strong>{shopifyOverview.pendingFulfillment}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="shopify-grid">
                        <div className="content-stack">
                          <div className="shopify-card">
                            <div className="surface-head">
                              <div>
                                <h2>Commercial performance</h2>
                                <p>{shopifyState.refreshedAt ? `Updated ${formatShopifyDate(shopifyState.refreshedAt)}` : "Waiting on Shopify data."}</p>
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
                                      formatter={(value, key) => [formatCurrency(value), key === "previous" ? "Previous period" : "Current period"]}
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
                                <h2>Recent orders</h2>
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
                                      <th>Payment</th>
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
                                {!visibleShopifyOrders.length ? <div className="notification-empty">No orders in this period.</div> : null}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="content-stack">
                          <div className="shopify-card">
                            <div className="surface-head">
                              <div>
                                <h2>Top 5 products this month</h2>
                              </div>
                              {storedShopifyConfig.storeDomain ? (
                                <button type="button" className="ghost" onClick={() => void clearShopifyConfig()} disabled={shopifyConfigBusy}>
                                  Disconnect
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
                                      <span>{product.quantity} sale(s)</span>
                                    </div>
                                    <strong>{formatCurrency(product.revenue)}</strong>
                                  </div>
                                ))}
                                {!(shopifyState.data?.topProducts || []).length ? (
                                  <div className="notification-empty">No products in this period.</div>
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
                      <h1>Shopify orders</h1>
                      <p>Sort and search orders for the active period.</p>
                    </div>
                  </div>
                  <div className="orders-shell">
                    <div className="orders-toolbar">
                      <div className="search-box inline-search">
                        <Icon name="search" size={18} />
                        <input
                          value={shopifyOrderQuery}
                          onChange={(event) => setShopifyOrderQuery(event.target.value)}
                          placeholder="Search by product, date, or customer"
                          aria-label="Search Shopify orders"
                        />
                      </div>
                      <div className="orders-sort-row">
                        {[
                          { id: "recent", label: "Recent" },
                          { id: "oldest", label: "Oldest" },
                          { id: "expensive", label: "Highest" },
                          { id: "cheap", label: "Lowest" },
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
                          <h2>Visible orders</h2>
                          <p>{shopifyOrdersPageRows.length} result(s) in {activeShopifyPeriodLabel.toLowerCase()}.</p>
                        </div>
                      </div>
                      <div className="shopify-table-wrap orders-table-wrap">
                        <table className="shopify-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Date</th>
                              <th>Customer</th>
                              <th>Total €</th>
                              <th>Payment</th>
                              <th>Fulfillment</th>
                              <th>Products</th>
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
                        {!shopifyOrdersPageRows.length ? <div className="notification-empty">No orders match this search.</div> : null}
                      </div>
                    </div>
                  </div>
                </section>
              ) : activeSection === "notes" ? (
                <section className="notes-layout">
                  <aside className="notes-categories">
                    <div className="notes-categories-top">
                      <div>
                        <h2>Notes</h2>
                      </div>
                      <button type="button" className="icon-button" onClick={() => void createNoteCategory()} aria-label="Create category">
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                    <div className="notes-category-create">
                      <div className="search-box inline-search">
                        <Icon name="search" size={18} />
                        <input
                          value={noteQuery}
                          onChange={(event) => setNoteQuery(event.target.value)}
                          placeholder="Search"
                          aria-label="Search notes"
                        />
                      </div>
                    </div>
                    <div className="notes-category-list">
                      {creatingCategory ? (
                        <div className="notes-category-create">
                          <input
                            ref={noteCategoryInputRef}
                            value={noteCategoryDraft}
                            onChange={(event) => setNoteCategoryDraft(event.target.value)}
                            onBlur={() => void commitNoteCategory()}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void commitNoteCategory();
                              }
                              if (event.key === "Escape") {
                                setCreatingCategory(false);
                                setNoteCategoryDraft("");
                              }
                            }}
                            placeholder="Category name"
                            aria-label="Category name"
                          />
                        </div>
                      ) : null}
                      {noteCategories.map((category) => {
                        const count = category === "Toutes les notes"
                          ? (db.notes || []).length
                          : (db.notes || []).filter((note) => (note.cat || "Notes") === category).length;
                        return (
                          <button
                            key={category}
                            type="button"
                            className={`notes-category-item ${selectedNoteCategory === category ? "active" : ""}`}
                            onClick={() => {
                              setSelectedNoteCategory(category);
                              setSelectedNoteId("");
                            }}
                          >
                            <span>{category}</span>
                            <strong>{count}</strong>
                          </button>
                        );
                      })}
                    </div>
                  </aside>

                  {selectedNote ? (
                    <div className="notes-editor-pane">
                      <>
                        <div className="notes-editor-toolbar">
                          <button type="button" className="ghost" onClick={() => setSelectedNoteId("")} aria-label="Back to notes">
                            <Icon name="arrow-left" size={16} />
                          </button>
                          <div className="notes-editor-actions" ref={noteToolsRef}>
                            <button
                              type="button"
                              className="notes-tools-button"
                              onClick={() => setNoteToolsOpen((current) => !current)}
                              aria-label="Open text options"
                            >
                              T
                            </button>
                            {noteToolsOpen ? (
                              <div className="notes-tools-popup">
                                <div className="notes-tools-inline">
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteCommand("bold")}><strong>B</strong></button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteCommand("italic")}><em>I</em></button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteCommand("underline")}><u>U</u></button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteCommand("strikeThrough")}><s>S</s></button>
                                  <select value={noteFontFamily} onChange={(event) => { setNoteFontFamily(event.target.value); applyNoteCommand("fontName", event.target.value); }}>
                                    <option value="inherit">System</option>
                                    <option value="Georgia">Serif</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Courier New">Mono</option>
                                  </select>
                                  <select value={noteFontSize} onChange={(event) => applyNoteFontSize(event.target.value)}>
                                    <option value="16">16</option>
                                    <option value="18">18</option>
                                    <option value="22">22</option>
                                    <option value="28">28</option>
                                  </select>
                                  <input
                                    type="color"
                                    value={noteTextColor}
                                    onChange={(event) => {
                                      setNoteTextColor(event.target.value);
                                      applyNoteCommand("foreColor", event.target.value);
                                    }}
                                    aria-label="Text color"
                                  />
                                </div>
                                <div className="notes-tools-grid">
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("title")}>Title</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("subtitle")}>Subtitle</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("secondary")}>Secondary title</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("body")}>Body</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("mono")}>Monospace</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={insertChecklistLine}>Checklist</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("bullets")}>Bulleted list</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteCommand("insertHTML", "— ")}>Dashed list</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("numbers")}>Numbered list</button>
                                  <button type="button" onMouseDown={preserveNoteSelection} onClick={() => applyNoteBlock("quote")}>Quote block</button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <input
                          className="note-title-input"
                          value={noteTitleDraft}
                          onChange={(event) => {
                            const value = event.target.value;
                            setNoteTitleDraft(value);
                            updateSelectedNote({ title: value });
                          }}
                          placeholder="New note"
                          aria-label="Note title"
                        />
                        <div
                          ref={noteEditorRef}
                          className="note-editor"
                          contentEditable
                          suppressContentEditableWarning
                          data-placeholder="Write your note here..."
                          onInput={onNoteEditorInput}
                          onClick={onNoteEditorClick}
                          onKeyUp={rememberNoteSelection}
                          onMouseUp={rememberNoteSelection}
                          onFocus={rememberNoteSelection}
                        />
                      </>
                    </div>
                  ) : (
                    <div className="notes-content-pane">
                      <div className="notes-list-head">
                        <div>
                          <h1>{selectedNoteCategory || "Notes"}</h1>
                        </div>
                        <button type="button" className="primary notes-add-button" onClick={() => void createNoteInCategory()}>
                          Add note
                        </button>
                      </div>
                      <div className="notes-list-scroll">
                        <div className="notes-card-grid">
                          {filteredNotesInSelectedCategory.map((note) => (
                            <button
                              key={note.id}
                              type="button"
                              className="note-card"
                              onClick={() => setSelectedNoteId(note.id)}
                            >
                              <strong>{note.title || "New note"}</strong>
                              <span>{notePreview(note)}</span>
                              <small>{formatRelative(note.updatedAt || note.createdAt)}</small>
                            </button>
                          ))}
                        </div>
                        {!filteredNotesInSelectedCategory.length ? <div className="notification-empty">No notes in this category.</div> : null}
                      </div>
                    </div>
                  )}
                </section>
              ) : activeSection === "profile" ? (
                <section className="overview-layout">
                  <div className="page-head">
                    <div>
                      <h1>Settings</h1>
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
                              <p>Main account information visible on your profile.</p>
                            </div>
                          </div>
                          <div className="settings-field-grid">
                            <Field label="Name" value={accountForm.name} onChange={(value) => setAccountForm((current) => ({ ...current, name: value }))} placeholder="Your name" />
                            <Field label="Email" type="email" value={accountForm.email} onChange={(value) => setAccountForm((current) => ({ ...current, email: value }))} placeholder="you@flow.app" />
                            <Field label="Username" value={accountForm.username} onChange={(value) => setAccountForm((current) => ({ ...current, username: value }))} placeholder="username" />
                            <Field label="Full name" value={accountForm.fullName} onChange={(value) => setAccountForm((current) => ({ ...current, fullName: value }))} placeholder="Full name" />
                            <Field label="Phone" value={accountForm.phone} onChange={(value) => setAccountForm((current) => ({ ...current, phone: value }))} placeholder="+1..." />
                            <Field label="Profile photo" value={accountForm.photoUrl} onChange={(value) => setAccountForm((current) => ({ ...current, photoUrl: value }))} placeholder="URL or local image already uploaded" />
                          </div>
                          <label className="toggle-field">
                            <input type="checkbox" checked={accountForm.phoneVisible} onChange={(event) => setAccountForm((current) => ({ ...current, phoneVisible: event.target.checked }))} />
                            <span>Show phone in profile</span>
                          </label>
                          <div className="button-row">
                            <button type="submit" className="primary" disabled={accountBusy}>
                              {accountBusy ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </form>
                      ) : null}

                      {settingsTab === "appearance" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Appearance</h2>
                              <p>Choose theme, layout and background for the shell.</p>
                            </div>
                          </div>
                          <div className="setting-row">
                            <label>Theme</label>
                            <label className="layout-toggle">
                              <input
                                type="checkbox"
                                checked={shellTheme === "dark"}
                                onChange={() => void applyTheme(shellTheme === "dark" ? "light" : "dark")}
                                aria-label="Toggle theme"
                              />
                              <span className="toggle-slider">
                                <span>Light</span>
                                <span>Dark</span>
                              </span>
                            </label>
                          </div>
                          <div className="setting-row">
                            <label>Dashboard view</label>
                            <label className="layout-toggle">
                              <input
                                type="checkbox"
                                checked={dashboardLayout === "immersive"}
                                onChange={() => void applyLayout(dashboardLayout === "immersive" ? "overview" : "immersive")}
                                disabled={isMobile}
                                aria-label="Toggle dashboard view"
                              />
                              <span className="toggle-slider">
                                <span>Board</span>
                                <span>Immersive</span>
                              </span>
                            </label>
                          </div>
                          <div className="button-row">
                            <button type="button" className="secondary" onClick={() => backgroundInputRef.current?.click()} disabled={backgroundBusy}>
                              {backgroundBusy ? "Importing..." : "Upload background"}
                            </button>
                            <button type="button" className="ghost" onClick={() => void applyCustomBackground("")} disabled={!currentThemeBackground || backgroundBusy}>
                              Remove background
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "privacy" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Security</h2>
                              <p>Update passwords and manage account safety.</p>
                            </div>
                          </div>
                          <div className="settings-field-grid">
                            <Field label="Current password" type="password" value={accountForm.currentPassword} onChange={(value) => setAccountForm((current) => ({ ...current, currentPassword: value }))} placeholder="Current password" />
                            <Field label="New password" type="password" value={accountForm.newPassword} onChange={(value) => setAccountForm((current) => ({ ...current, newPassword: value }))} placeholder="New password" />
                          </div>
                          <div className="mini-grid">
                            <div className="mini-card">
                              <strong>Google</strong>
                              <span>{providers.google ? "Google sign-in available." : "Google login not configured."}</span>
                            </div>
                            <div className="mini-card">
                              <strong>Email recovery</strong>
                              <span>{providers.email ? "Reset email available." : "Email reset unavailable."}</span>
                            </div>
                            <div className="mini-card">
                              <strong>Phone</strong>
                              <span>{accountForm.phoneVisible ? "Visible in profile." : "Hidden from public profile."}</span>
                            </div>
                            <div className="mini-card">
                              <strong>Session</strong>
                              <span>Logged in across devices with secure session handling.</span>
                            </div>
                          </div>
                          <div className="button-row">
                            <button type="button" className="primary" onClick={(event) => void saveAccountSettings({ preventDefault() {} })} disabled={accountBusy}>
                              {accountBusy ? "Saving..." : "Update security"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "integrations" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Integrations</h2>
                              <p>Connect your Shopify store securely and manage fake data mode.</p>
                            </div>
                          </div>
                          <div className="shopify-connect-form">
                            <div className="shopify-secret-row">
                              <input
                                value={shopifyDomainInput}
                                onChange={(event) => setShopifyDomainInput(event.target.value)}
                                type={showShopifySecrets ? "text" : "password"}
                                placeholder="store.myshopify.com"
                                aria-label="Shop domain"
                              />
                              <button type="button" className="secret-toggle" onClick={() => setShowShopifySecrets((current) => !current)}>
                                <Icon name={showShopifySecrets ? "eye-off" : "eye"} size={16} />
                              </button>
                            </div>
                            <div className="shopify-secret-row">
                              <input
                                value={shopifyTokenInput}
                                onChange={(event) => setShopifyTokenInput(event.target.value)}
                                type={showShopifySecrets ? "text" : "password"}
                                placeholder="shpat_xxx"
                                aria-label="Shopify access token"
                              />
                              <button type="button" className="secret-toggle" onClick={() => setShowShopifySecrets((current) => !current)}>
                                <Icon name={showShopifySecrets ? "eye-off" : "eye"} size={16} />
                              </button>
                            </div>
                            <div className="button-row">
                              <button type="button" className="primary" onClick={() => void saveShopifyConfig()} disabled={shopifyConfigBusy}>
                                {shopifyConfigBusy ? "Checking..." : "Verify & connect"}
                              </button>
                              <button type="button" className="ghost" onClick={() => void clearShopifyConfig()} disabled={shopifyConfigBusy || !storedShopifyConfig.storeDomain}>
                                Disconnect
                              </button>
                            </div>
                            <p className="helper">{storedShopifyConfig.storeDomain ? `Active store: ${storedShopifyConfig.storeDomain}` : "No store connected. Paste the private key for read_orders."}</p>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "billing" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Billing</h2>
                              <p>View your subscription status directly in the shell.</p>
                            </div>
                          </div>
                          <div className="settings-field-grid">
                            <Field label="Plan" value={db.subscription?.plan || "summit"} onChange={() => {}} disabled placeholder="" />
                            <Field label="Status" value={db.subscription?.status || "complimentary"} onChange={() => {}} disabled placeholder="" />
                            <Field label="Cycle" value={db.subscription?.billingCycle || "lifetime"} onChange={() => {}} disabled placeholder="" />
                            <Field label="Renewal" value={db.subscription?.renewsAt ? formatShopifyDate(db.subscription.renewsAt) : "No date"} onChange={() => {}} disabled placeholder="" />
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "language" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Language</h2>
                              <p>Select interface language and first day of week.</p>
                            </div>
                          </div>
                          <div className="setting-options">
                            <SettingQuickButton active={(db.settings?.locale || "fr") === "fr"} onClick={() => void saveSettingsPatch({ locale: "fr" }, "Language updated.")}>
                              <strong>Français</strong>
                            </SettingQuickButton>
                            <SettingQuickButton active={(db.settings?.locale || "fr") === "en"} onClick={() => void saveSettingsPatch({ locale: "en" }, "Language updated.")}>
                              <strong>English</strong>
                            </SettingQuickButton>
                            <SettingQuickButton active={(db.settings?.weekStart || 1) === 1} onClick={() => void saveSettingsPatch({ weekStart: 1 }, "Week start updated.")}>
                              <strong>Monday</strong>
                            </SettingQuickButton>
                            <SettingQuickButton active={(db.settings?.weekStart || 1) === 0} onClick={() => void saveSettingsPatch({ weekStart: 0 }, "Week start updated.")}>
                              <strong>Sunday</strong>
                            </SettingQuickButton>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "keys" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Key Bindings</h2>
                              <p>Useful shortcuts already available in the shell.</p>
                            </div>
                          </div>
                          <div className="overview-list">
                            <div className="overview-list-item"><div><strong>⌘K / Ctrl+K</strong><span>Open the global command palette.</span></div></div>
                            <div className="overview-list-item"><div><strong>Escape</strong><span>Close the palette or any open popover.</span></div></div>
                            <div className="overview-list-item"><div><strong>Top search</strong><span>Filter notes, contacts, events, tasks, and bookmarks in one place.</span></div></div>
                          </div>
                        </div>
                      ) : null}

                      {settingsTab === "advanced" ? (
                        <div className="settings-form">
                          <div className="surface-head">
                            <div>
                              <h2>Advanced</h2>
                              <p>Shell status, release metadata, and session state.</p>
                            </div>
                          </div>
                          <div className="overview-list">
                            <div className="overview-list-item">
                              <div>
                                <strong>Sidebar</strong>
                                <span>{sidebarLocked ? "Locked open" : "Hover to expand temporarily"}</span>
                              </div>
                            </div>
                            <div className="overview-list-item">
                              <div>
                                <strong>Active view</strong>
                                <span>{effectiveLayout === "immersive" ? "Immersive desktop" : "Board"}</span>
                              </div>
                            </div>
                            <div className="overview-list-item">
                              <div>
                                <strong>Loaded version</strong>
                                <span>{releaseMeta}</span>
                              </div>
                            </div>
                          </div>
                          <div className="button-row">
                            <button type="button" className="secondary" onClick={() => setReleaseOpen(true)}>
                              Open changelog
                            </button>
                            <button type="button" className="ghost" onClick={submitLogout} disabled={busy === "logout"}>
                              {busy === "logout" ? "Logging out..." : "Sign out"}
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
                  <p>Module in preparation.</p>
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
                Release log
              </button>
            </div>

            <div className="auth-tabs">
              <AuthTabButton active={activeTab === "login"} onClick={() => setActiveTab("login")}>Login</AuthTabButton>
              <AuthTabButton active={activeTab === "register"} onClick={() => setActiveTab("register")}>Create</AuthTabButton>
              <AuthTabButton active={activeTab === "reset"} onClick={() => setActiveTab("reset")}>Password</AuthTabButton>
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
                  label="Password"
                  type="password"
                  value={login.password}
                  onChange={(value) => setLogin((current) => ({ ...current, password: value }))}
                  placeholder="Password"
                  autoComplete="current-password"
                  name="password"
                  disabled={Boolean(busy)}
                />
                <div className="button-row">
                  <button type="submit" className="primary" disabled={busy === "login"}>
                    {busy === "login" ? "Logging in..." : "Sign in"}
                  </button>
                  <button type="button" className="secondary" onClick={startGoogleAuth} disabled={Boolean(busy)}>
                    Continue with Google
                  </button>
                </div>
              </form>
            ) : null}

            {activeTab === "register" ? (
              <form onSubmit={submitRegister}>
                <Field
                  label="Name"
                  value={register.name}
                  onChange={(value) => setRegister((current) => ({ ...current, name: value }))}
                  placeholder="Your name"
                  autoComplete="name"
                  name="name"
                  disabled={Boolean(busy)}
                />
                <Field
                  label="Email"
                  type="email"
                  value={register.email}
                  onChange={(value) => syncEmailAcrossForms(value)}
                  placeholder="you@flow.app"
                  autoComplete="email"
                  name="email"
                  disabled={Boolean(busy)}
                />
                <Field
                  label="Password"
                  type="password"
                  value={register.password}
                  onChange={(value) => setRegister((current) => ({ ...current, password: value }))}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  name="password"
                  disabled={Boolean(busy)}
                />
                <Field
                  label="Confirm"
                  type="password"
                  value={register.confirmPassword}
                  onChange={(value) => setRegister((current) => ({ ...current, confirmPassword: value }))}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  name="confirmPassword"
                  disabled={Boolean(busy)}
                />
                <div className="button-row">
                  <button type="submit" className="primary" disabled={busy === "register"}>
                    {busy === "register" ? "Creating..." : "Create account"}
                  </button>
                  <button type="button" className="secondary" onClick={startGoogleAuth} disabled={Boolean(busy)}>
                    Create with Google
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
                    label="Verification code"
                    value={reset.code}
                    onChange={(value) => setReset((current) => ({ ...current, code: value }))}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    name="code"
                    disabled={Boolean(busy)}
                  />
                  <Field
                    label="New password"
                    type="password"
                    value={reset.password}
                    onChange={(value) => setReset((current) => ({ ...current, password: value }))}
                    placeholder="New password"
                    autoComplete="new-password"
                    name="newPassword"
                    disabled={Boolean(busy)}
                  />
                  <div className="button-row">
                    <button type="submit" className="primary" disabled={busy === "reset"}>
                      {busy === "reset" ? "Resetting..." : "Update password"}
                    </button>
                  </div>
                  <p className="helper">{providers.email ? "Code sent if email is configured." : "Email reset unavailable in this environment."}</p>
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
                placeholder="Search notes, contacts, events, tasks..."
                aria-label="Command palette"
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
                <div className="notification-empty">No results for this search.</div>
              )}
            </div>
            <div className="command-footer">
              <span>Esc to close</span>
              <span>One search, no duplicates</span>
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
                  Shopify guide
                </div>
                <h3 style={{ margin: 0, fontSize: '22px' }}>Shopify setup</h3>
                <p style={{ margin: '12px 0 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Follow these steps to retrieve your Shopify token and connect it directly without leaving the page.
                </p>
              </div>
              <button type="button" onClick={() => setShopifyGuideOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '8px', fontWeight: 600 }} aria-label="Close Shopify guide">
                Close
              </button>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <section>
                <h4>1. Create the Shopify app</h4>
                <ol style={{ margin: '10px 0 0 16px', color: 'var(--text-soft)' }}>
                  <li>Sign in to Shopify Admin.</li>
                  <li>Open <strong>Apps</strong> then <strong>Develop apps</strong>.</li>
                  <li>Create an app, give it a name, and save.</li>
                </ol>
              </section>
              <section>
                <h4>2. Grant API permissions</h4>
                <p style={{ margin: '8px 0 4px', color: 'var(--text-soft)' }}>Enable at least:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-soft)' }}>
                  <li><code>read_orders</code></li>
                  <li><code>read_products</code></li>
                  <li><code>read_customers</code></li>
                  <li><code>read_inventory</code></li>
                </ul>
              </section>
              <section>
                <h4>3. Install the app</h4>
                <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>
                  Install the app from the <strong>API credentials</strong> tab, then copy the token once it appears.
                </p>
              </section>
              <section>
                <h4>4. Retrieve the token</h4>
                <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>
                  Copy the access token shown (starting with <code>shpat_</code>) because it is only visible once.
                </p>
              </section>
              <section>
                <h4>5. Connect Shopify in Flow</h4>
                <p style={{ margin: '8px 0 0', color: 'var(--text-soft)' }}>
                  Paste the Shopify domain and token into the Shopify connection form found on this page.
                </p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)' }}><strong>Expected format:</strong> <code>store.myshopify.com|shpat_xxx</code></p>
              </section>
              <section style={{ padding: '14px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h4 style={{ margin: '0 0 10px' }}>Quick tip</h4>
                <p style={{ margin: 0, color: 'var(--text-soft)' }}>
                  If you lose the token, regenerate a new one in Shopify and replace the old one.
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
