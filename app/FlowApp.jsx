"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
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

function startOfDaysAgo(days) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function isoDate(date) {
  return new Date(date).toISOString();
}

function safeAmount(value) {
  return Number.parseFloat(value || 0) || 0;
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

function summarizeShopifyData({ todayOrders, monthOrders, recentOrders, latestOrders, unfulfilledCount }) {
  const revenueToday = todayOrders.reduce((sum, order) => sum + safeAmount(order.total_price), 0);
  const revenueMonth = monthOrders.reduce((sum, order) => sum + safeAmount(order.total_price), 0);
  const ordersToday = todayOrders.length;
  const pendingFulfillment = Number(unfulfilledCount?.count) || 0;

  const byDay = new Map();
  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = startOfDaysAgo(offset);
    const key = date.toISOString().slice(0, 10);
    byDay.set(key, {
      key,
      label: formatDayLabel(date),
      revenue: 0,
    });
  }

  recentOrders.forEach((order) => {
    const key = `${order.created_at || ""}`.slice(0, 10);
    if (!byDay.has(key)) return;
    byDay.get(key).revenue += safeAmount(order.total_price);
  });

  const topProductsMap = new Map();
  monthOrders.forEach((order) => {
    (order.line_items || []).forEach((item) => {
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
    kpis: {
      revenueToday,
      revenueMonth,
      ordersToday,
      pendingFulfillment,
    },
    chart: [...byDay.values()],
    latestOrders: latestOrders.map((order) => ({
      id: order.id,
      number: order.name || `#${order.order_number || order.id}`,
      createdAt: order.created_at,
      customer: order.customer?.first_name || order.customer?.last_name
        ? `${order.customer?.first_name || ""} ${order.customer?.last_name || ""}`.trim()
        : order.email || "Client inconnu",
      total: safeAmount(order.total_price),
      paymentStatus: order.financial_status || "pending",
      fulfillmentStatus: order.fulfillment_status || "unfulfilled",
    })),
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
  const [shopifyRangeDays, setShopifyRangeDays] = useState(30);
  const [shopifyOrderFilter, setShopifyOrderFilter] = useState("all");
  const [shopifyState, setShopifyState] = useState({
    loading: false,
    error: "",
    data: null,
    refreshedAt: "",
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

  const shopifyOverview = useMemo(
    () =>
      shopifyState.data?.kpis || {
        revenueToday: 0,
        revenueMonth: 0,
        ordersToday: 0,
        pendingFulfillment: 0,
      },
    [shopifyState.data],
  );

  const currentThemeBackground = useMemo(() => {
    const customBackgrounds = db.settings?.customBackgrounds || {};
    return shellTheme === "light" ? customBackgrounds.light || "" : customBackgrounds.dark || "";
  }, [db.settings?.customBackgrounds, shellTheme]);

  const flowShellStyle = useMemo(() => {
    if (!currentThemeBackground) return undefined;
    const overlay = shellTheme === "light"
      ? "linear-gradient(180deg, rgba(255,255,255,0.54), rgba(242,239,232,0.88))"
      : "linear-gradient(180deg, rgba(6,8,11,0.42), rgba(6,8,11,0.88))";
    return {
      background: `${overlay}, url("${currentThemeBackground}") center center / cover no-repeat fixed`,
    };
  }, [currentThemeBackground, shellTheme]);

  const immersiveBackgroundStyle = useMemo(() => {
    if (!currentThemeBackground) return undefined;
    const overlay = shellTheme === "light"
      ? "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(247,245,239,0.82))"
      : "linear-gradient(180deg, rgba(10,12,14,0.18), rgba(10,12,14,0.78))";
    return {
      background: `${overlay}, url("${currentThemeBackground}") center center / cover no-repeat`,
    };
  }, [currentThemeBackground, shellTheme]);

  const visibleShopifyChart = useMemo(() => {
    const chart = shopifyState.data?.chart || [];
    return chart.slice(-shopifyRangeDays);
  }, [shopifyRangeDays, shopifyState.data]);

  const visibleShopifyOrders = useMemo(() => {
    const orders = shopifyState.data?.latestOrders || [];
    if (shopifyOrderFilter === "today") {
      const todayKey = new Date().toISOString().slice(0, 10);
      return orders.filter((order) => `${order.createdAt || ""}`.slice(0, 10) === todayKey);
    }
    if (shopifyOrderFilter === "pending") {
      return orders.filter((order) => normalizeStatusTone(order.fulfillmentStatus) !== "success");
    }
    return orders;
  }, [shopifyOrderFilter, shopifyState.data]);

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

  const navSections = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", icon: "grid" },
      { id: "notes", label: "Notes", icon: "note" },
      { id: "contacts", label: "Contacts", icon: "users" },
      { id: "events", label: "Événements", icon: "calendar" },
      { id: "tasks", label: "Tâches", icon: "check" },
      { id: "shopify", label: "Shopify", icon: "bag" },
      { id: "profile", label: "Profil", icon: "sliders" },
    ],
    [],
  );

  const effectiveLayout = isMobile ? "overview" : dashboardLayout;
  const sidebarExpanded = sidebarLocked || sidebarHover;
  const shellCollapsedClass = !sidebarExpanded ? "collapsed" : "";
  const themeClass = shellTheme === "light" ? "theme-light" : "theme-dark";
  const shouldShowSidebar = effectiveLayout !== "immersive";

  useEffect(() => {
    const savedEmail = readStoredEmail();
    if (!savedEmail) return;
    setLogin((current) => ({ ...current, email: current.email || savedEmail }));
    setRegister((current) => ({ ...current, email: current.email || savedEmail }));
    setReset((current) => ({ ...current, email: current.email || savedEmail }));
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
    if (!isMobile) return;
    setMobileNavOpen(false);
  }, [isMobile]);

  async function refreshShopifyData() {
    setShopifyState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const statusPayload = await fetchShopifyProxy("__status");
      if (statusPayload?.ready === false) {
        throw new Error(statusPayload?.error || "Shopify non configuré");
      }

      const todayStart = isoDate(startOfToday());
      const monthStart = isoDate(startOfMonth());
      const last30Start = isoDate(startOfDaysAgo(29));

      const [todayPayload, monthPayload, recentPayload, latestPayload, unfulfilledPayload] = await Promise.all([
        fetchShopifyProxy("orders", {
          status: "any",
          limit: 250,
          created_at_min: todayStart,
          fields: "id,name,order_number,created_at,total_price,financial_status,fulfillment_status,customer,email",
          order: "created_at desc",
        }),
        fetchShopifyProxy("orders", {
          status: "any",
          limit: 250,
          created_at_min: monthStart,
          fields: "id,name,order_number,created_at,total_price,financial_status,fulfillment_status,customer,email,line_items",
          order: "created_at desc",
        }),
        fetchShopifyProxy("orders", {
          status: "any",
          limit: 250,
          created_at_min: last30Start,
          fields: "id,created_at,total_price",
          order: "created_at desc",
        }),
        fetchShopifyProxy("orders", {
          status: "any",
          limit: 10,
          fields: "id,name,order_number,created_at,total_price,financial_status,fulfillment_status,customer,email",
          order: "created_at desc",
        }),
        fetchShopifyProxy("orders/count", {
          status: "any",
          fulfillment_status: "unfulfilled",
        }),
      ]);

      const data = summarizeShopifyData({
        todayOrders: todayPayload.orders || [],
        monthOrders: monthPayload.orders || [],
        recentOrders: recentPayload.orders || [],
        latestOrders: latestPayload.orders || [],
        unfulfilledCount: unfulfilledPayload,
      });

      setShopifyState({
        loading: false,
        error: "",
        data,
        refreshedAt: new Date().toISOString(),
      });
    } catch (shopError) {
      setShopifyState((current) => ({
        ...current,
        loading: false,
        error: shopError?.message || "Shopify inaccessible",
      }));
    }
  }

  useEffect(() => {
    if (!user) return;
    if (shopifyState.data || shopifyState.loading) return;
    void refreshShopifyData();
  }, [user]);

  useEffect(() => {
    if (user) return;
    setShopifyState({
      loading: false,
      error: "",
      data: null,
      refreshedAt: "",
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

  const notificationFeed = useMemo(() => {
    return [...(db.notifications || [])]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 8);
  }, [db.notifications]);

  return (
    <div className={`flow-shell ${themeClass}`} style={flowShellStyle}>
      <style jsx>{`
        :global(html), :global(body) {
          margin: 0;
          min-height: 100%;
        }
        :global(body) {
          background: #090a0d;
          color: #f6f7fb;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif;
        }
        :global(*) {
          box-sizing: border-box;
        }
        :global(button),
        :global(input) {
          appearance: none;
          -webkit-appearance: none;
          border-radius: 0;
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
          --page-bg:
            linear-gradient(180deg, rgba(5, 7, 9, 0.46), rgba(5, 7, 9, 0.88)),
            url("/theme-dark-wave.jpg") center center / cover no-repeat fixed;
          --shell-bg: rgba(10, 12, 14, 0.64);
          --shell-border: rgba(255, 255, 255, 0.07);
          --panel-bg: rgba(23, 25, 29, 0.66);
          --panel-soft: rgba(28, 31, 35, 0.76);
          --panel-strong: rgba(18, 20, 24, 0.88);
          --text-main: #f4f5f7;
          --text-soft: rgba(230, 233, 239, 0.74);
          --text-faint: rgba(199, 205, 216, 0.48);
          --line: rgba(255, 255, 255, 0.08);
          --line-strong: rgba(255, 255, 255, 0.16);
          --accent: #dde3d7;
          --accent-strong: #ffffff;
          --accent-glow: rgba(133, 160, 113, 0.16);
          --danger: rgba(96, 51, 46, 0.72);
          --notice: rgba(23, 25, 29, 0.92);
          --shadow: 0 30px 90px rgba(0, 0, 0, 0.42);
          --map-veil: linear-gradient(180deg, rgba(8, 9, 12, 0.1), rgba(8, 9, 12, 0.8));
          --topbar-glow: rgba(101, 123, 87, 0.22);
          --surface-layer:
            radial-gradient(circle at 0% 0%, rgba(137, 159, 114, 0.14), transparent 38%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015) 46%, rgba(255, 255, 255, 0.028)),
            rgba(18, 21, 24, 0.72);
          --surface-layer-strong:
            radial-gradient(circle at 0% 0%, rgba(148, 174, 119, 0.18), transparent 40%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.018) 48%, rgba(255, 255, 255, 0.035)),
            rgba(16, 18, 21, 0.82);
          --surface-layer-soft:
            radial-gradient(circle at 0% 0%, rgba(120, 142, 98, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.014) 52%, rgba(255, 255, 255, 0.026)),
            rgba(20, 23, 26, 0.58);
        }
        .theme-light {
          --page-bg:
            linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(243, 241, 235, 0.88)),
            url("/theme-light-grain.jpg") center center / cover no-repeat fixed;
          --shell-bg: rgba(250, 248, 243, 0.68);
          --shell-border: rgba(17, 20, 26, 0.08);
          --panel-bg: rgba(255, 255, 255, 0.7);
          --panel-soft: rgba(250, 248, 244, 0.84);
          --panel-strong: rgba(255, 255, 255, 0.9);
          --text-main: #15171b;
          --text-soft: rgba(21, 23, 27, 0.7);
          --text-faint: rgba(21, 23, 27, 0.46);
          --line: rgba(17, 20, 26, 0.08);
          --line-strong: rgba(17, 20, 26, 0.15);
          --accent: #111316;
          --accent-strong: #030405;
          --accent-glow: rgba(118, 134, 98, 0.12);
          --danger: rgba(176, 118, 108, 0.22);
          --notice: rgba(255, 255, 255, 0.94);
          --shadow: 0 22px 70px rgba(42, 45, 57, 0.12);
          --map-veil: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.86));
          --topbar-glow: rgba(166, 171, 150, 0.12);
          --surface-layer:
            radial-gradient(circle at 0% 0%, rgba(156, 169, 129, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.28) 52%, rgba(255, 255, 255, 0.5)),
            rgba(255, 255, 255, 0.62);
          --surface-layer-strong:
            radial-gradient(circle at 0% 0%, rgba(147, 159, 121, 0.14), transparent 36%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.34) 52%, rgba(255, 255, 255, 0.62)),
            rgba(255, 255, 255, 0.74);
          --surface-layer-soft:
            radial-gradient(circle at 0% 0%, rgba(165, 174, 138, 0.1), transparent 30%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.22) 52%, rgba(255, 255, 255, 0.42)),
            rgba(255, 255, 255, 0.54);
        }
        .flow-shell {
          min-height: 100vh;
          padding: 18px;
          position: relative;
          overflow-x: hidden;
          background: var(--page-bg);
          color: var(--text-main);
          transition: background 0.35s ease, color 0.35s ease;
          animation: shellFadeIn 0.52s ease;
        }
        @keyframes shellFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
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
          position: fixed;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          display: grid;
          gap: 10px;
          width: min(560px, calc(100vw - 32px));
          z-index: 50;
        }
        .toast {
          border-radius: 20px;
          border: 1px solid var(--line);
          background: var(--notice);
          backdrop-filter: blur(20px);
          box-shadow: var(--shadow);
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
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
          min-height: calc(100vh - 36px);
          display: grid;
          place-items: center;
        }
        .auth-card {
          width: min(440px, 100%);
          border-radius: 30px;
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
          border-radius: 18px;
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
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          margin-bottom: 18px;
        }
        :global(.auth-tab) {
          all: unset;
          box-sizing: border-box;
          border: 0;
          border-radius: 14px;
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
          border-radius: 18px;
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
          border-radius: 18px;
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
          min-height: calc(100vh - 36px);
          border-radius: 34px;
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
        }
        .theme-light .sidebar {
          background: var(--surface-layer-strong);
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
          border-radius: 18px;
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
          border-radius: 14px;
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
          border-radius: 18px;
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
          border-radius: 26px;
          background: var(--surface-layer-soft);
          border: 1px solid var(--line);
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
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: relative;
          background: transparent;
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
          border-radius: 28px;
          border: 1px solid var(--line);
          background: var(--surface-layer);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(18px);
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
          border-radius: 16px;
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
        }
        .search-box {
          width: 100%;
          height: 54px;
          border-radius: 22px;
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
          border-radius: 12px;
          border: 1px solid var(--line);
          color: var(--text-faint);
          font-size: 12px;
          white-space: nowrap;
        }
        .search-dropdown,
        .command-modal,
        .notification-panel,
        .spotlight-card,
        .metric-card,
        .content-card,
        .surface-card,
        .floating-card {
          border: 1px solid var(--line);
          background: var(--surface-layer);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
        }
        .search-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          left: 0;
          right: 0;
          border-radius: 24px;
          padding: 12px;
          z-index: 30;
          animation: riseIn 0.24s ease;
        }
        .search-result {
          all: unset;
          box-sizing: border-box;
          width: 100%;
          border: 0;
          background: transparent;
          color: var(--text-main);
          border-radius: 18px;
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
        }
        .shell-panel {
          display: grid;
          gap: 18px;
          animation: riseIn 0.28s ease;
        }
        .overview-layout {
          display: grid;
          gap: 18px;
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
          border-radius: 18px;
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
          border-radius: 30px;
          padding: 18px;
          animation: riseIn 0.32s ease;
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
          border-radius: 30px;
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
          border-radius: 26px;
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
        .mini-card {
          border-radius: 22px;
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
          border-radius: 22px;
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
          top: 72px;
          right: 18px;
          width: min(390px, calc(100vw - 36px));
          border-radius: 30px;
          padding: 16px;
          z-index: 35;
          background: var(--surface-layer-strong);
          animation: riseIn 0.24s ease;
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
          border-radius: 24px;
          border: 1px solid var(--line);
          background:
            radial-gradient(circle at 0% 0%, rgba(162, 94, 81, 0.16), transparent 36%),
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
          border-radius: 24px;
          border: 1px dashed var(--line);
          padding: 22px;
          text-align: center;
          color: var(--text-soft);
        }
        .command-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 10, 0.54);
          backdrop-filter: blur(10px);
          display: grid;
          place-items: center;
          z-index: 60;
          padding: 18px;
        }
        .command-modal {
          width: min(760px, 100%);
          border-radius: 30px;
          padding: 16px;
          animation: riseIn 0.26s ease;
        }
        .command-input {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--line);
          border-radius: 22px;
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
          border-radius: 34px;
          position: relative;
          overflow: hidden;
          border: 1px solid var(--line);
          background:
            linear-gradient(180deg, rgba(10, 12, 14, 0.18), rgba(10, 12, 14, 0.78)),
            url("/theme-dark-wave.jpg") center center / cover no-repeat;
        }
        .theme-light .immersive-layout {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.36), rgba(247, 245, 239, 0.82)),
            url("/theme-light-grain.jpg") center center / cover no-repeat;
        }
        .immersive-map {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(116, 141, 95, 0.22), transparent 18%),
            radial-gradient(circle at 72% 48%, rgba(119, 141, 101, 0.16), transparent 14%),
            repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.02) 0 2px, transparent 2px 16px),
            linear-gradient(115deg, rgba(255, 255, 255, 0.04), transparent 28%);
          opacity: 0.95;
        }
        .immersive-map::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, transparent 0 16%, rgba(255, 255, 255, 0.06) 16.4%, transparent 16.7% 51%, rgba(255, 255, 255, 0.06) 51.4%, transparent 51.7%),
            linear-gradient(0deg, transparent 0 22%, rgba(255, 255, 255, 0.04) 22.2%, transparent 22.5% 64%, rgba(255, 255, 255, 0.04) 64.2%, transparent 64.6%);
          mix-blend-mode: screen;
          opacity: 0.25;
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
          border-radius: 22px;
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
        .setting-stack {
          display: grid;
          gap: 18px;
        }
        .setting-card {
          border-radius: 28px;
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
          border-radius: 20px;
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
          border-radius: 24px;
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
          background: linear-gradient(90deg, rgba(150, 172, 125, 0.25), rgba(236, 239, 228, 0.82));
        }
        .theme-light .scale-fill {
          background: linear-gradient(90deg, rgba(113, 131, 94, 0.32), rgba(30, 34, 39, 0.92));
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
        .shopify-card {
          border-radius: 30px;
          padding: 18px;
          border: 1px solid var(--line);
          background: var(--surface-layer);
          box-shadow: var(--shadow);
          backdrop-filter: blur(20px);
          animation: riseIn 0.3s ease;
          min-width: 0;
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
          border-radius: 24px;
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
          color: #d7f5df;
          border-color: rgba(110, 183, 132, 0.24);
          background: rgba(37, 96, 54, 0.34);
        }
        .status-pill.warning {
          color: #f6ead2;
          border-color: rgba(212, 169, 101, 0.26);
          background: rgba(120, 84, 28, 0.3);
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
          border-radius: 22px;
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
        .shopify-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
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
          border-radius: 16px;
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
          .shopify-grid {
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
            min-height: calc(100vh - 24px);
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
            min-height: 100vh;
            border-radius: 0;
            border: 0;
          }
          .auth-card {
            width: calc(100vw - 28px);
            padding: 22px;
            border-radius: 28px;
          }
          .app-main {
            padding: 14px;
          }
          .topbar {
            gap: 10px;
          }
          .search-box {
            height: 50px;
            border-radius: 18px;
            padding: 0 14px;
          }
          .search-shortcut {
            display: none;
          }
          .metrics-grid,
          .mini-grid,
          .shopify-kpis {
            grid-template-columns: 1fr;
          }
          .module-rail {
            display: grid;
          }
          .notification-panel {
            top: 68px;
            right: 14px;
            left: 14px;
            width: auto;
          }
          .command-backdrop {
            padding: 10px;
            align-items: flex-start;
          }
          .command-modal {
            margin-top: 70px;
            border-radius: 24px;
          }
          .command-footer {
            display: none;
          }
        }
      `}</style>

      {(error || notice || availableUpdate) && (
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
      )}

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
                <button
                  type="button"
                  className="lock-button"
                  onClick={() => applySidebarLock(!sidebarLocked)}
                  aria-label={sidebarLocked ? "Déverrouiller la barre" : "Verrouiller la barre"}
                >
                  <Icon name={sidebarLocked ? "lock" : "unlock"} size={16} />
                </button>
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

              <div className="sidebar-footer">
                <div className="sidebar-footer-copy">
                  <strong>{user.name || "Compte Flow"}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="button-row" style={{ marginTop: 14 }}>
                  <button type="button" className="secondary" onClick={() => setActiveSection("profile")} style={{ width: "100%" }}>
                    Ouvrir le profil
                  </button>
                  <button type="button" className="ghost" onClick={submitLogout} disabled={busy === "logout"} style={{ width: "100%" }}>
                    {busy === "logout" ? "Déconnexion..." : "Se déconnecter"}
                  </button>
                </div>
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

              <div className="search-wrap" ref={searchWrapRef}>
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
                      </div>
                    </div>

                    <div className="metrics-grid">
                      <div className="metric-card primary">
                        <div className="metric-card-head">
                          <span>Notes</span>
                          <Icon name="note" size={18} />
                        </div>
                        <div className="metric-value">{dashboardMetrics.notes}</div>
                        <div className="metric-foot">
                          <span>{dashboardMetrics.bookmarks} signets</span>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-card-head">
                          <span>Tâches ouvertes</span>
                          <Icon name="check" size={18} />
                        </div>
                        <div className="metric-value">{dashboardMetrics.tasks}</div>
                        <div className="metric-foot">
                          <span>En cours</span>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-card-head">
                          <span>Événements</span>
                          <Icon name="calendar" size={18} />
                        </div>
                        <div className="metric-value">{dashboardMetrics.events}</div>
                        <div className="metric-foot">
                          <span>Planifiés</span>
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-card-head">
                          <span>Notifications</span>
                          <Icon name="bell" size={18} />
                        </div>
                        <div className="metric-value">{dashboardMetrics.notifications}</div>
                        <div className="metric-foot">
                          <span>{dashboardMetrics.contacts} contact(s) connus</span>
                        </div>
                      </div>
                      <div className="metric-card primary">
                        <div className="metric-card-head">
                          <span>Shopify</span>
                          <Icon name="bag" size={18} />
                        </div>
                        {shopifyState.loading && !shopifyState.data ? (
                          <div className="shopify-skeleton" style={{ marginTop: 22 }}>
                            <div className="skeleton-line" style={{ width: "58%", height: 38, borderRadius: 20 }} />
                            <div className="skeleton-line" style={{ width: "74%", marginTop: 14 }} />
                          </div>
                        ) : shopifyState.error ? (
                          <>
                            <div className="metric-value">—</div>
                            <div className="metric-foot">
                              <span>{shopifyState.error}</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="metric-value">{formatCurrency(shopifyOverview.revenueToday)}</div>
                            <div className="metric-foot">
                              <span>{formatCurrency(shopifyOverview.revenueMonth)} ce mois</span>
                              <button type="button" className="ghost" onClick={() => setActiveSection("shopify")}>
                                Voir détails
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="overview-grid">
                      <div className="content-stack">
                        <div className="content-card">
                          <div className="content-card-header">
                            <div>
                              <h2>Performance du workspace</h2>
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
                                  <stop offset="0%" stopColor="rgba(181, 197, 157, 0.42)" />
                                  <stop offset="100%" stopColor="rgba(181, 197, 157, 0.02)" />
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
                            <span><span className="legend-dot" style={{ background: "rgba(181,197,157,0.45)" }} />Résumé synthétique</span>
                          </div>
                        </div>

                        <div className="content-card">
                          <div className="content-card-header">
                            <div>
                              <h2>Actions rapides</h2>
                            </div>
                          </div>
                          <div className="button-row">
                            <button type="button" className="secondary" onClick={() => setCommandOpen(true)}>Rechercher</button>
                            <button type="button" className="secondary" onClick={() => setNotificationOpen(true)}>Notifications</button>
                            <button type="button" className="secondary" onClick={() => setActiveSection("shopify")}>Shopify</button>
                            <button type="button" className="secondary" onClick={() => void refreshShopifyData()} disabled={shopifyState.loading}>
                              {shopifyState.loading ? "Actualisation..." : "Actualiser"}
                            </button>
                          </div>
                        </div>

                        <div className="mini-grid">
                          <div className="mini-card">
                            <strong>Recherche globale</strong>
                            <span>La barre du haut et `⌘K / Ctrl+K` utilisent la même indexation sans doublons.</span>
                          </div>
                          <div className="mini-card">
                            <strong>Sidebar vivante</strong>
                            <span>Hover pour ouvrir, clic sur le cadenas pour la laisser ouverte entre les visites.</span>
                          </div>
                          <div className="mini-card">
                            <strong>Thème persistant</strong>
                            <span>Le switch clair / sombre est sauvegardé dans le compte, pas seulement dans le navigateur.</span>
                          </div>
                          <div className="mini-card">
                            <strong>Layouts jumeaux</strong>
                            <span>Le changement complet de structure se règle depuis le profil utilisateur.</span>
                          </div>
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
                              <p>Sélectionne un résultat depuis la recherche.</p>
                            </>
                          )}
                        </div>

                        <div className="surface-card">
                          <div className="surface-head">
                            <div>
                              <h2>Activité récente</h2>
                            </div>
                          </div>
                          <div className="overview-list">
                            {(db.activity || []).slice(0, 4).map((item) => (
                              <div key={item.id} className="overview-list-item">
                                <div>
                                  <strong>{item.title}</strong>
                                  <span>{item.detail || item.type}</span>
                                </div>
                                <span className="helper">{formatRelative(item.createdAt)}</span>
                              </div>
                            ))}
                            {!db.activity.length ? (
                              <div className="overview-list-item">
                                <div>
                                  <strong>Aucune activité récente</strong>
                                  <span>Rien à afficher.</span>
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
                    </div>
                    <div className="shopify-actions">
                      <button type="button" className="secondary" onClick={() => void refreshShopifyData()} disabled={shopifyState.loading}>
                        <Icon name="refresh" size={16} />
                        {shopifyState.loading ? "Rafraîchissement..." : "Rafraîchir"}
                      </button>
                    </div>
                  </div>

                  <div className="shopify-actions">
                    {[7, 30].map((range) => (
                      <button
                        key={range}
                        type="button"
                        className={`pill-button ${shopifyRangeDays === range ? "active" : ""}`}
                        onClick={() => setShopifyRangeDays(range)}
                      >
                        {range} jours
                      </button>
                    ))}
                    {[
                      { id: "all", label: "Toutes" },
                      { id: "today", label: "Aujourd'hui" },
                      { id: "pending", label: "En attente" },
                    ].map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={`pill-button ${shopifyOrderFilter === filter.id ? "active" : ""}`}
                        onClick={() => setShopifyOrderFilter(filter.id)}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  {shopifyState.error ? (
                    <div className="surface-card">
                      <div className="surface-head">
                        <div>
                          <h2>Connexion Shopify indisponible</h2>
                          <p>{shopifyState.error}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="shopify-kpis">
                    {[
                      { label: "CA aujourd'hui", value: formatCurrency(shopifyOverview.revenueToday), icon: "activity" },
                      { label: "CA ce mois", value: formatCurrency(shopifyOverview.revenueMonth), icon: "grid" },
                      { label: "Commandes aujourd'hui", value: `${shopifyOverview.ordersToday}`, icon: "note" },
                      { label: "Non fulfillées", value: `${shopifyOverview.pendingFulfillment}`, icon: "check" },
                    ].map((item) => (
                      <div key={item.label} className="shopify-card">
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
                      </div>
                    ))}
                  </div>

                  <div className="shopify-grid">
                    <div className="content-stack">
                      <div className="shopify-card">
                        <div className="surface-head">
                          <div>
                            <h2>CA — {shopifyRangeDays} derniers jours</h2>
                            <p>{shopifyState.refreshedAt ? `Dernière mise à jour ${formatShopifyDate(shopifyState.refreshedAt)}` : "En attente de données Shopify."}</p>
                          </div>
                        </div>
                        {shopifyState.loading && !shopifyState.data ? (
                          <div className="shopify-skeleton skeleton-box" />
                        ) : (
                          <div className="shopify-chart-wrap">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={visibleShopifyChart}>
                                <defs>
                                  <linearGradient id="shopifyArea" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(185,197,171,0.72)" />
                                    <stop offset="100%" stopColor="rgba(185,197,171,0.04)" />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                                <XAxis dataKey="label" stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12, opacity: 0.7 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="currentColor" tick={{ fill: "currentColor", fontSize: 12, opacity: 0.7 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value)}€`} />
                                <Tooltip
                                  contentStyle={{
                                    background: "rgba(16,18,22,0.92)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "18px",
                                    color: "#f5f7fb",
                                  }}
                                  formatter={(value) => [formatCurrency(value), "CA"]}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="currentColor" strokeWidth={2.4} fill="url(#shopifyArea)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      <div className="shopify-card">
                        <div className="surface-head">
                          <div>
                            <h2>10 dernières commandes</h2>
                            <p>{shopifyOrderFilter === "all" ? "Flux direct Shopify." : `Filtre: ${shopifyOrderFilter === "today" ? "Aujourd'hui" : "En attente"}`}</p>
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
                            {!visibleShopifyOrders.length ? <div className="notification-empty">Aucune commande pour ce filtre.</div> : null}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="content-stack">
                      <div className="shopify-card">
                        <div className="surface-head">
                          <div>
                            <h2>Top 5 produits du mois</h2>
                            <p>Agrégation des <code>line_items</code> des commandes du mois en cours.</p>
                          </div>
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
                              <div className="notification-empty">Aucun produit remonté pour la période courante.</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              ) : activeSection === "profile" ? (
                <section className="overview-layout">
                  <div className="page-head">
                    <div>
                      <h1>Profil et paramètres</h1>
                    </div>
                  </div>

                  <div className="profile-layout-grid">
                    <div className="setting-stack">
                      <div className="setting-card">
                        <div className="profile-identity">
                          <div className="profile-avatar">{initialsFromName(user.name)}</div>
                          <div style={{ minWidth: 0 }}>
                            <strong>{user.name || "Compte Flow"}</strong>
                            <span>{user.email}</span>
                          </div>
                        </div>
                        <div className="setting-options">
                          <div className="setting-option active">
                            <strong>Session active</strong>
                            <span>Compte mémorisé sur cet appareil.</span>
                          </div>
                          <div className="setting-option active">
                            <strong>Thème actuel: {shellTheme === "dark" ? "Sombre" : "Clair"}</strong>
                            <span>Bascule disponible dans la topbar.</span>
                          </div>
                        </div>
                      </div>

                      <div className="setting-card">
                        <h2>Structure du site</h2>
                        <p>Sur téléphone, la vue tableau reste imposée.</p>
                        <div className="setting-options">
                          <button
                            type="button"
                            className={`setting-option ${dashboardLayout === "overview" ? "active" : ""}`}
                            onClick={() => void applyLayout("overview")}
                          >
                            <strong>Vue tableau</strong>
                            <span>Sidebar gauche et lecture dense.</span>
                          </button>
                          <button
                            type="button"
                            className={`setting-option ${dashboardLayout === "immersive" ? "active" : ""} ${isMobile ? "disabled" : ""}`}
                            onClick={() => void applyLayout("immersive")}
                            disabled={isMobile}
                          >
                            <strong>Vue immersive</strong>
                            <span>Modules en haut et sans barre gauche.</span>
                          </button>
                        </div>
                      </div>

                      <div className="setting-card">
                        <h2>Fond</h2>
                        <div className="setting-options">
                          <div className="setting-option active">
                            <strong>{shellTheme === "dark" ? "Fond sombre" : "Fond clair"}</strong>
                            <span>{currentThemeBackground ? "Image personnalisée active." : "Fond par défaut actif."}</span>
                          </div>
                        </div>
                        <div className="button-row" style={{ marginTop: 18 }}>
                          <button type="button" className="secondary" onClick={() => backgroundInputRef.current?.click()} disabled={backgroundBusy}>
                            {backgroundBusy ? "Import..." : "Importer une image"}
                          </button>
                          <button type="button" className="ghost" onClick={() => void applyCustomBackground("")} disabled={!currentThemeBackground || backgroundBusy}>
                            Retirer le fond
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="setting-stack">
                      <div className="setting-card">
                        <h2>État du shell</h2>
                        <div className="overview-list" style={{ marginTop: 18 }}>
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
                              <strong>Release chargée</strong>
                              <span>{releaseMeta}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="setting-card">
                        <h2>Compte</h2>
                        <div className="button-row" style={{ marginTop: 18 }}>
                          <button type="button" className="secondary" onClick={() => setReleaseOpen(true)}>
                            Voir la version
                          </button>
                          <button type="button" className="ghost" onClick={submitLogout} disabled={busy === "logout"}>
                            {busy === "logout" ? "Déconnexion..." : "Se déconnecter"}
                          </button>
                        </div>
                      </div>
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

      {releaseOpen ? <ReleaseWidget release={remoteRelease || RELEASE} label={releaseMeta || RELEASE_LABEL} onClose={() => setReleaseOpen(false)} /> : null}
    </div>
  );
}
