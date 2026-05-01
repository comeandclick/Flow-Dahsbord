"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getStoredLocale } from "../../lib/i18n";

function formatNumber(value, locale = "fr") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "fr-FR").format(Number(value) || 0);
}

function formatDate(value, locale = "fr") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function relativeTime(value, locale = "fr") {
  if (!value) return locale === "en" ? "never" : "jamais";
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return locale === "en" ? "never" : "jamais";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return locale === "en" ? "just now" : "à l'instant";
  if (minutes < 60) return locale === "en" ? `${minutes} min ago` : `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return locale === "en" ? `${hours} h ago` : `il y a ${hours} h`;
  return locale === "en" ? `${Math.round(hours / 24)} d ago` : `il y a ${Math.round(hours / 24)} j`;
}

function reportStatusLabel(status, locale = "fr") {
  if (status === "resolved") return locale === "en" ? "Resolved" : "Résolu";
  if (status === "dismissed") return locale === "en" ? "Dismissed" : "Classé";
  return locale === "en" ? "Open" : "Ouvert";
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
  if (!response.ok) throw new Error(payload?.error || "Request failed");
  return payload;
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <div className="choice-buttons">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`choice-button ${value === option.value ? "active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="flow-card stat-card">
      <div className="meta">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="soft">{hint}</div>
    </div>
  );
}

function DataMetric({ label, value, hint = "" }) {
  return (
    <div className="detail-box">
      <div className="meta">{label}</div>
      <strong>{value || "—"}</strong>
      {hint ? <div className="soft">{hint}</div> : null}
    </div>
  );
}

const DEFAULT_ADMIN_FORM = {
  name: "",
  email: "",
  password: "",
  role: "admin",
  permissions: ["dashboard.read", "users.read", "messages.send"],
};

function buildAdminUi(locale = "fr") {
  const en = locale === "en";
  return {
    permissions: [
      { key: "dashboard.read", label: "Dashboard" },
      { key: "users.read", label: en ? "Read users" : "Lecture utilisateurs" },
      { key: "users.manage", label: en ? "Manage users" : "Gestion utilisateurs" },
      { key: "messages.send", label: en ? "Notifications" : "Notifications" },
      { key: "accounts.block", label: en ? "Block accounts" : "Blocage comptes" },
      { key: "accounts.reset_password", label: en ? "Reset password" : "Reset mot de passe" },
      { key: "accounts.delete", label: en ? "Delete accounts" : "Suppression comptes" },
      { key: "admins.read", label: en ? "Read admins" : "Lecture admins" },
      { key: "admins.create", label: en ? "Create admins" : "Creation admins" },
      { key: "admins.manage", label: en ? "Manage admins" : "Gestion admins" },
      { key: "email.send", label: en ? "Transactional email" : "Email transactionnel" },
      { key: "exports.csv", label: en ? "CSV export" : "Export CSV" },
    ],
    statusOptions: [
      { value: "all", label: en ? "All" : "Tous" },
      { value: "active", label: en ? "Active" : "Actifs" },
      { value: "blocked", label: en ? "Blocked" : "Bloques" },
    ],
    adminOptions: [
      { value: "all", label: en ? "All roles" : "Tous roles" },
      { value: "users", label: en ? "Users" : "Utilisateurs" },
      { value: "admins", label: en ? "All admins" : "Tous admins" },
      { value: "admin", label: en ? "Admins" : "Admins" },
      { value: "super_admin", label: en ? "Super admins" : "Super admins" },
    ],
    planOptions: [
      { value: "all", label: en ? "All plans" : "Tous forfaits" },
      { value: "starter", label: "Starter" },
      { value: "pro", label: "Pro" },
      { value: "summit", label: "Summit" },
    ],
    recipientOptions: [
      { value: "single", label: en ? "Current selection" : "Selection actuelle" },
      { value: "all", label: en ? "All" : "Tous" },
      { value: "active", label: en ? "Active" : "Actifs" },
      { value: "blocked", label: en ? "Blocked" : "Bloques" },
      { value: "admins", label: "Admins" },
      { value: "plan:starter", label: "Starter" },
      { value: "plan:pro", label: "Pro" },
      { value: "plan:summit", label: "Summit" },
    ],
    roleOptions: [
      { value: "admin", label: "Admin" },
      { value: "super_admin", label: "Super Admin" },
    ],
  };
}

export default function AdminDashboard() {
  const [locale, setLocale] = useState(() => getStoredLocale());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openSection, setOpenSection] = useState("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedUid, setSelectedUid] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [supportConversations, setSupportConversations] = useState([]);
  const [selectedSupportId, setSelectedSupportId] = useState("");
  const [supportReply, setSupportReply] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [reportResolutionNote, setReportResolutionNote] = useState("");
  const [form, setForm] = useState({
    recipientMode: "single",
    title: "",
    detail: "",
    type: "admin",
  });
  const [adminForm, setAdminForm] = useState(DEFAULT_ADMIN_FORM);
  const ui = useMemo(() => buildAdminUi(locale), [locale]);
  const t = useCallback((fr, en) => (locale === "en" ? en : fr), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const syncLocale = () => setLocale(getStoredLocale());
    window.addEventListener("storage", syncLocale);
    window.addEventListener("focus", syncLocale);
    return () => {
      window.removeEventListener("storage", syncLocale);
      window.removeEventListener("focus", syncLocale);
    };
  }, []);

  async function loadOverview(silent = false) {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const payload = await api("/api/admin/overview");
      setData(payload);
      if (!selectedUid && payload.users?.[0]?.uid) setSelectedUid(payload.users[0].uid);
      if (!selectedReportId && payload.reports?.[0]?.id) setSelectedReportId(payload.reports[0].id);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadSupportConversations() {
    try {
      const payload = await api("/api/admin/conversations");
      setSupportConversations(Array.isArray(payload?.conversations) ? payload.conversations : []);
      if (!selectedSupportId && payload?.conversations?.[0]?.id) setSelectedSupportId(payload.conversations[0].id);
    } catch {}
  }

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { void loadSupportConversations(); }, []);
  useEffect(() => {
    const interval = setInterval(() => { void loadOverview(true); }, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => { void loadSupportConversations(); }, 5000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { setConfirmDelete(false); }, [selectedUid]);

  const filteredUsers = useMemo(() => {
    const users = Array.isArray(data?.users) ? data.users : [];
    const needle = query.trim().toLowerCase();
    return users.filter((entry) => {
      const matchesQuery = !needle || (
        entry.name.toLowerCase().includes(needle)
        || entry.email.toLowerCase().includes(needle)
        || `${entry.profile?.username || ""}`.toLowerCase().includes(needle)
      );
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      const matchesAdmin = adminFilter === "all"
        || (adminFilter === "admins" && entry.admin?.enabled)
        || (adminFilter === "users" && !entry.admin?.enabled)
        || (adminFilter === "super_admin" && entry.admin?.role === "super_admin")
        || (adminFilter === "admin" && entry.admin?.role === "admin");
      const matchesPlan = planFilter === "all" || entry.plan === planFilter;
      return matchesQuery && matchesStatus && matchesAdmin && matchesPlan;
    });
  }, [adminFilter, data, planFilter, query, statusFilter]);

  const selectedUser = filteredUsers.find((entry) => entry.uid === selectedUid)
    || (Array.isArray(data?.users) ? data.users.find((entry) => entry.uid === selectedUid) : null)
    || filteredUsers[0]
    || null;

  const capabilities = data?.capabilities || {};
  const reports = Array.isArray(data?.reports) ? data.reports : [];
  const selectedSupportConversation = supportConversations.find((entry) => entry.id === selectedSupportId) || supportConversations[0] || null;
  const selectedReport = reports.find((entry) => entry.id === selectedReportId) || reports[0] || null;

  useEffect(() => {
    setReportResolutionNote(selectedReport?.resolutionNote || "");
  }, [selectedReport?.id, selectedReport?.resolutionNote]);

  useEffect(() => {
    if (!filteredUsers.length) {
      if (selectedUid) setSelectedUid("");
      return;
    }
    if (!filteredUsers.some((entry) => entry.uid === selectedUid)) {
      setSelectedUid(filteredUsers[0].uid);
    }
  }, [filteredUsers, selectedUid]);

  function resetUserFilters() {
    setQuery("");
    setStatusFilter("all");
    setAdminFilter("all");
    setPlanFilter("all");
  }

  async function runAction(action, extra = {}) {
    setSending(true);
    setNotice("");
    setTempPassword("");
    try {
      if (action === "notify") {
        const nextTitle = `${extra?.title || ""}`.trim();
        const nextDetail = `${extra?.detail || ""}`.trim();
        const nextRecipientMode = `${extra?.recipientMode || "single"}`;
        if (!nextTitle || !nextDetail) {
          throw new Error(t("Le titre et le message sont requis.", "Title and message are required."));
        }
        if (nextRecipientMode === "single" && !selectedUser?.uid) {
          throw new Error(t("Sélectionne un utilisateur avant d'envoyer un message ciblé.", "Select a user before sending a targeted message."));
        }
      }
      const payload = await api("/api/admin/actions", {
        method: "POST",
        body: JSON.stringify({ action, uid: selectedUser?.uid || "", ...extra }),
      });
      if (payload?.temporaryPassword) setTempPassword(payload.temporaryPassword);
      setNotice(t("Action appliquee.", "Action applied."));
      await loadOverview(true);
      await loadSupportConversations();
      if (action === "notify") {
        setForm({ recipientMode: "single", title: "", detail: "", type: "admin" });
      }
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSending(false);
    }
  }

  async function createAdminAccount() {
    if (sending) return;

    const nextName = `${adminForm.name || ""}`.trim();
    const nextEmail = `${adminForm.email || ""}`.trim().toLowerCase();
    const nextPassword = `${adminForm.password || ""}`;

    if (!nextName || !nextEmail || !nextPassword) {
      setNotice(t("Nom, email et mot de passe admin sont requis.", "Admin name, email and password are required."));
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setNotice(t("Email admin invalide.", "Invalid admin email."));
      return;
    }

    if (nextPassword.length < 8) {
      setNotice(t("Le mot de passe admin doit contenir au moins 8 caractères.", "The admin password must be at least 8 characters long."));
      return;
    }

    setSending(true);
    setNotice("");
    try {
      await runAction("create-admin", {
        ...adminForm,
        name: nextName,
        email: nextEmail,
        password: nextPassword,
      });
      setAdminForm(DEFAULT_ADMIN_FORM);
      setNotice(t("Administrateur créé.", "Administrator created."));
    } finally {
      setSending(false);
    }
  }

  async function runSupportAction(action, extra = {}) {
    setSending(true);
    try {
      const payload = await api("/api/admin/conversations", {
        method: "POST",
        body: JSON.stringify({ action, conversationId: selectedSupportConversation?.id || "", ...extra }),
      });
      if (payload?.conversation?.id) {
        setSelectedSupportId(payload.conversation.id);
      }
      setSupportReply("");
      await loadSupportConversations();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSending(false);
    }
  }

  const topModules = [
    { key: "overview", label: t("Vue générale", "Overview"), value: `${formatNumber(data?.stats?.usersTotal || 0, locale)} ${t("comptes", "accounts")}` },
    { key: "users", label: t("Utilisateurs", "Users"), value: `${filteredUsers.length} ${t("visibles", "visible")}` },
    { key: "data", label: t("Données live", "Live data"), value: selectedUser ? (selectedUser.name || selectedUser.email) : t("Aucune sélection", "No selection") },
    { key: "support", label: t("Support", "Support"), value: `${supportConversations.length} ${t("conversations", "conversations")}` },
    { key: "reports", label: t("Signalements", "Reports"), value: `${reports.length} ${t("entrées", "entries")}` },
    { key: "admins", label: t("Administration", "Administration"), value: `${(data?.permissions || []).length} ${t("permissions", "permissions")}` },
  ];

  function toggleSection(key) {
    setOpenSection(key);
  }

  return (
    <div className="admin-shell">
      <style jsx>{`
        :global(html),:global(body){margin:0;min-height:100%}
        :global(body){
          font-family:"Inter",system-ui,sans-serif;
          color:#eef1f8;
          background-color:#04050a;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(180deg, #04050a 0%, #06070b 100%);
          background-size:26px 26px;
          overflow:hidden;
        }
        :global(body)::before{
          content:"";
          position:fixed;
          inset:0;
          pointer-events:none;
          background:
            radial-gradient(circle at 18% 20%, rgba(255,255,255,.12), transparent 24%),
            linear-gradient(180deg, rgba(255,255,255,.03), transparent 40%);
          opacity:.72;
          filter:blur(22px);
          z-index:0;
        }
        .admin-shell{
          min-height:100vh;
          height:100vh;
          overflow:hidden;
          padding:14px;
          position:relative;
          z-index:1;
        }
        .admin-layout{
          min-height:100%;
          height:100%;
          display:grid;
          grid-template-columns:300px minmax(0,1fr);
          gap:14px;
          align-items:start;
        }
        .flow-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:17px;
          background:rgba(10,12,16,0.78);
          box-shadow:0 32px 120px rgba(0,0,0,.28);
          overflow:hidden;
          backdrop-filter:blur(18px);
          position:relative;
          z-index:1;
        }
        .admin-shell :is(.flow-card, .user-row, .detail-box, .data-block, .section-toggle, .section-chevron, .notice, .error-box, .activity-item, .message-card, .support-message, .permission-toggle, .permission-pill, input, textarea, .search, .chip, .mini-stat, .btn) {
          border-radius: 17px !important;
        }
        .sidebar{
          padding:18px;
          display:flex;
          flex-direction:column;
          gap:16px;
          height:calc(100vh - 28px);
          position:sticky;
          top:14px;
        }
        .brand{
          display:flex;
          flex-direction:column;
          gap:10px;
          padding-bottom:14px;
          border-bottom:1px solid rgba(255,255,255,.08);
        }
        .logo{
          width:48px;
          height:48px;
          border-radius:17px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.14);
          color:#f3f3f6;
          font-weight:800;
          font-size:20px;
        }
        .eyebrow,.meta{
          font-size:11px;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:rgba(242,243,248,.48);
        }
        .brand h1,.panel-title{
          margin:0;
          font-size:28px;
          line-height:1;
          letter-spacing:-.05em;
        }
        .soft{
          color:rgba(242,243,248,.68);
          line-height:1.55;
          font-size:13px;
        }
        .nav-group{
          display:flex;
          flex-direction:column;
          gap:8px;
        }
        .nav-item{
          appearance:none;
          width:100%;
          padding:13px 14px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.06);
          background:rgba(255,255,255,.03);
          color:#f6f7fb;
          text-align:left;
          cursor:pointer;
          transition:transform .16s ease,border-color .16s ease,background .16s ease;
        }
        .nav-item:hover{
          transform:translateY(-1px);
          border-color:rgba(255,255,255,.12);
        }
        .nav-item strong{
          display:block;
          font-size:14px;
        }
        .nav-item span{
          display:block;
          margin-top:4px;
          font-size:12px;
          color:rgba(242,243,248,.62);
        }
        .nav-item.on{
          background:rgba(255,255,255,.1);
          border-color:rgba(255,255,255,.16);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
        }
        .admin-main{
          min-width:0;
          min-height:0;
          display:flex;
          flex-direction:column;
          gap:14px;
          overflow:auto;
        }
        .hero{
          padding:22px;
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(220px,280px);
          gap:16px;
          align-items:start;
        }
        .hero h2{
          margin:8px 0 0;
          font-size:clamp(32px,4vw,54px);
          line-height:.94;
          letter-spacing:-.06em;
        }
        .hero-copy{
          display:flex;
          flex-direction:column;
          gap:14px;
        }
        .hero-actions,.panel-actions,.inline-actions{
          display:flex;
          flex-wrap:wrap;
          gap:10px;
        }
        .hero-copy .soft,
        .brand .soft,
        .panel-sub{
          display:none;
        }
        .status-pill{
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:10px 14px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.04);
          color:rgba(242,243,248,.78);
          font-size:13px;
          max-width:max-content;
        }
        .summary-box{
          display:grid;
          gap:10px;
          align-content:start;
        }
        .mini-stat{
          padding:14px 16px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.04);
        }
        .mini-stat strong{
          display:block;
          margin-top:8px;
          font-size:22px;
        }
        .btn{
          appearance:none;
          border:1px solid rgba(255,255,255,.08);
          border-radius:17px;
          background:rgba(24,28,36,0.92);
          color:#eef1f8;
          padding:12px 16px;
          font-weight:700;
          cursor:pointer;
          transition:transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease;
          box-shadow:0 18px 40px rgba(0,0,0,.18);
        }
        .btn:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.14)}
        .btn.primary{
          background:linear-gradient(180deg, rgba(255,136,100,0.18), rgba(210,85,66,0.24));
          color:#eef3ff;
          border-color:rgba(255,124,88,.26);
        }
        .btn.soft{
          background:rgba(18,22,30,0.94);
        }
        .btn.danger{
          background:linear-gradient(180deg, rgba(235,95,112,0.18), rgba(213,67,84,0.24));
          color:white;
          border-color:rgba(255,133,133,.24);
        }
        .btn:disabled{opacity:.52;cursor:wait;transform:none}
        .stats-grid{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:12px;
        }
        .stat-card{
          padding:18px;
          min-height:124px;
        }
        .stat-value{
          margin-top:10px;
          font-size:34px;
          font-weight:800;
          letter-spacing:-.04em;
        }
        .panel{
          padding:18px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }
        .panel-head{
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:flex-start;
          flex-wrap:wrap;
        }
        .panel-sub{
          margin-top:6px;
          font-size:13px;
          color:rgba(242,243,248,.62);
        }
        .search{
          width:100%;
          padding:14px 16px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          color:#f7f7fb;
          outline:none;
        }
        .chip-row{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        }
        .chip{
          padding:9px 12px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          color:rgba(242,243,248,.78);
          cursor:pointer;
        }
        .chip.on{
          background:rgba(255,255,255,.1);
          border-color:rgba(255,255,255,.16);
          color:#fff;
        }
        .stack-scroll{
          overflow:auto;
          display:flex;
          flex-direction:column;
          gap:10px;
          padding-right:4px;
          overscroll-behavior:contain;
          max-height:calc(100vh - 420px);
        }
        .section-stack{
          display:flex;
          flex-direction:column;
          gap:14px;
        }
        .section-card{
          padding:0;
          overflow:hidden;
        }
        .section-card:not(.open){
          display:none;
        }
        .section-toggle{
          appearance:none;
          width:100%;
          border:none;
          background:transparent;
          color:inherit;
          padding:18px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:16px;
          cursor:pointer;
          text-align:left;
        }
        .section-toggle:hover{
          background:rgba(255,255,255,.02);
        }
        .section-toggle-main{
          min-width:0;
        }
        .section-toggle h3{
          margin:6px 0 0;
          font-size:clamp(24px,3vw,34px);
          letter-spacing:-.05em;
          line-height:.96;
        }
        .section-summary{
          text-align:right;
          display:grid;
          gap:6px;
          justify-items:end;
        }
        .section-kpi{
          font-size:12px;
          color:rgba(242,243,248,.62);
        }
        .section-chevron{
          width:40px;
          height:40px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.04);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:16px;
          transition:transform .18s ease, background .18s ease;
        }
        .section-card.open .section-chevron{
          transform:rotate(180deg);
          background:rgba(255,255,255,.08);
        }
        .section-content{
          padding:0 18px 18px;
          display:grid;
          gap:14px;
          max-height:calc(100vh - 320px);
          overflow:auto;
          overscroll-behavior:contain;
        }
        .admin-home-grid{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:12px;
        }
        .admin-home-tile{
          text-align:left;
          display:grid;
          gap:8px;
          padding:16px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(15,18,25,.88);
          color:#eef1f8;
          cursor:pointer;
          transition:transform .18s ease,border-color .18s ease,background .18s ease;
        }
        .admin-home-tile:hover{
          transform:translateY(-1px);
          border-color:rgba(255,255,255,.14);
          background:rgba(18,21,29,.96);
        }
        .admin-home-tile strong{
          font-size:16px;
        }
        .admin-home-tile span{
          color:rgba(242,243,248,.62);
          font-size:12px;
        }
        .split-grid{
          display:grid;
          grid-template-columns:minmax(320px,.9fr) minmax(0,1.1fr);
          gap:14px;
        }
        .user-row,.activity-item,.message-card,.detail-box,.permission-pill{
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          overflow:hidden;
        }
        .user-row{
          padding:14px;
          cursor:pointer;
          transition:border-color .16s ease,transform .16s ease,background .16s ease;
        }
        .user-row.active{
          background:rgba(255,255,255,.08);
          border-color:rgba(255,255,255,.14);
        }
        .user-row:hover{transform:translateY(-1px)}
        .user-top{
          display:flex;
          gap:12px;
          justify-content:space-between;
          align-items:flex-start;
        }
        .badge{
          padding:7px 10px;
          border-radius:999px;
          border:1px solid rgba(255, 125, 98, .18);
          background:rgba(255, 112, 82, .12);
          color:#ffe5d8;
          font-size:11px;
          font-weight:700;
          white-space:nowrap;
        }
        .badge.blocked{
          border-color:rgba(255,133,133,.2);
          background:rgba(226,98,98,.12);
          color:#ffc5c5;
        }
        .user-meta{
          margin-top:8px;
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          color:rgba(242,243,248,.58);
          font-size:12px;
        }
        .permission-pill{
          padding:10px 12px;
          font-size:12px;
          color:#eceefa;
        }
        .detail-grid,.two-col{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:12px;
        }
        .data-grid{
          display:grid;
          grid-template-columns:repeat(4,minmax(0,1fr));
          gap:12px;
        }
        .data-block{
          padding:16px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          display:grid;
          gap:12px;
          align-content:start;
        }
        .data-list{
          display:grid;
          gap:8px;
        }
        .data-row{
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:flex-start;
          font-size:13px;
          color:rgba(242,243,248,.82);
        }
        .data-row span:last-child{
          text-align:right;
          color:rgba(242,243,248,.62);
          word-break:break-word;
        }
        .detail-box{
          padding:14px 16px;
        }
        .detail-box strong{
          display:block;
          margin-top:8px;
          font-size:16px;
        }
        .composer-box{
          display:grid;
          gap:12px;
        }
        label{
          display:block;
          font-size:11px;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:rgba(242,243,248,.48);
        }
        input,textarea{
          width:100%;
          padding:13px 14px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          color:#f7f7fb;
          outline:none;
          resize:none;
        }
        textarea{min-height:126px}
        .notice{
          padding:13px 14px;
          border-radius:17px;
          border:1px solid rgba(255, 152, 113, .22);
          background:rgba(255, 142, 110, .08);
        }
        .warning-row{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .danger-box{
          padding:12px 14px;
          border-radius:17px;
          border:1px solid rgba(255,133,133,.18);
          background:rgba(226,98,98,.08);
        }
        .activity-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:14px;
        }
        .activity-item{
          padding:14px 16px;
        }
        .activity-item strong{
          display:block;
          font-size:14px;
        }
        .activity-item span{
          display:block;
          margin-top:8px;
          font-size:12px;
          color:rgba(242,243,248,.64);
          line-height:1.5;
        }
        .presence-strip{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
        }
        .presence-pill{
          padding:10px 12px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          display:grid;
          gap:3px;
          min-width:88px;
        }
        .presence-pill strong{
          font-size:16px;
          line-height:1;
        }
        .conversation-shell{
          min-height:0;
          display:grid;
          grid-template-columns:minmax(240px,.48fr) minmax(0,.52fr);
          gap:12px;
        }
        .support-thread{
          min-height:0;
          display:flex;
          flex-direction:column;
          gap:10px;
        }
        .support-message{
          padding:12px 14px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
        }
        .support-message.admin{
          background:rgba(255,255,255,.08);
          border-color:rgba(255,255,255,.14);
        }
        .support-meta{
          font-size:11px;
          color:rgba(242,243,248,.52);
          margin-top:6px;
        }
        .permission-grid{
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        }
        .permission-toggle{
          display:flex;
          align-items:center;
          gap:10px;
          padding:12px 14px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          cursor:pointer;
        }
        .permission-toggle input{width:auto}
        .error-box,.empty{
          padding:18px;
          border-radius:17px;
          border:1px solid rgba(255,255,255,.08);
          background:#16181e;
          color:rgba(242,243,248,.72);
        }
        .error-box{
          border-color:rgba(255,133,133,.18);
          background:rgba(226,98,98,.08);
          color:#ffd5d5;
        }
        .nav-actions{
          display:grid;
          gap:10px;
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
        @media (max-width:1400px){
          .stats-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
        }
        @media (max-width:1160px){
          .admin-layout{grid-template-columns:1fr}
          .hero,.detail-grid,.two-col,.permission-grid,.conversation-shell,.activity-grid,.split-grid,.data-grid{grid-template-columns:1fr}
          .sidebar{
            min-height:auto;
            position:static;
          }
          .stack-scroll{max-height:none}
        }
        @media (max-width:720px){
          .admin-shell{padding:10px}
          .hero,.panel,.sidebar{padding:16px}
          .stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
          .brand h1,.panel-title{font-size:24px}
          .section-toggle{
            padding:16px;
            align-items:flex-start;
          }
          .section-summary{
            text-align:left;
            justify-items:start;
          }
          .nav-actions{
            grid-template-columns:1fr;
          }
        }
      `}</style>

      <div className="admin-layout">
        <aside className="flow-card sidebar">
          <div className="brand">
            <div className="logo">F</div>
            <div className="eyebrow">{t("Flow Control", "Flow Control")}</div>
            <h1>{t("Admin Flow", "Admin Flow")}</h1>
            <div className="soft">{t("Shell admin simplifié, même identité que Flow, avec seulement les panneaux utiles.", "Cleaner admin shell, same Flow identity, only useful panels.")}</div>
          </div>

          <div className="nav-group">
            <div className="eyebrow">{t("Navigation admin", "Admin navigation")}</div>
            {topModules.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={`nav-item ${openSection === item.key || (!openSection && index === 0) ? "on" : ""}`}
                onClick={() => setOpenSection(item.key)}
              >
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </button>
            ))}
          </div>

          <div className="nav-group" style={{ marginTop: "auto" }}>
            <div className="eyebrow">{t("Actions", "Actions")}</div>
            <div className="nav-actions">
              <a className="btn soft" href="/">{t("Ouvrir Flow", "Open Flow")}</a>
              <button className="btn soft" type="button" onClick={() => runAction("toggle-fake-info")}>{data?.fakeInfoMode ? t("Désactiver fausse info", "Disable fake info") : t("Activer fausse info", "Enable fake info")}</button>
              <button className="btn soft" onClick={() => loadOverview()} disabled={loading || sending}>{t("Rafraichir", "Refresh")}</button>
              <button className="btn soft" onClick={async () => { await api("/api/admin/auth/logout", { method: "POST" }); window.location.href = "/admin/login"; }}>{t("Deconnexion", "Log out")}</button>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <section className="flow-card hero">
            <div className="hero-copy">
              <div className="eyebrow">{t("Dashboard admin Flow", "Flow Admin Dashboard")}</div>
              <h2>{t("Piloter Flow avec des sections nettes.", "Operate Flow with cleaner sections.")}</h2>
              {data?.fakeInfoMode ? <div className="status-pill">{t("Mode fausse info actif", "Fake info mode active")}</div> : null}
            </div>
            <div className="summary-box">
              <div className="mini-stat">
                <div className="meta">{t("Santé du store", "Store health")}</div>
                <strong>{data?.health?.status || "—"}</strong>
                <div className="soft">{t("Version", "Version")} {data?.release?.version ? `v${data.release.version}` : "—"}</div>
              </div>
              <div className="mini-stat">
                <div className="meta">{t("Dernière mise à jour", "Latest update")}</div>
                <strong style={{ fontSize: 16, lineHeight: 1.35 }}>{formatDate(data?.release?.deployedAt, locale)}</strong>
                <div className="soft">{data?.health?.latencyMs ? `${data.health.latencyMs} ms` : t("Latence indisponible", "Latency unavailable")}</div>
              </div>
            </div>
          </section>

          <section className="admin-home-grid">
            {topModules.map((item) => (
              <button key={item.key} type="button" className="admin-home-tile" onClick={() => setOpenSection(item.key)}>
                <strong>{item.label}</strong>
                <span>{item.value}</span>
              </button>
            ))}
          </section>

          {error ? <div className="error-box">{error}</div> : null}

          <section className="stats-grid">
            <StatCard label={t("Utilisateurs", "Users")} value={formatNumber(data?.stats?.usersTotal || 0, locale)} hint={`${data?.stats?.newUsers7d || 0} ${t("nouveaux sur 7 jours", "new in 7 days")}`} />
            <StatCard label={t("En ligne", "Online")} value={formatNumber(data?.stats?.onlineNow || 0, locale)} hint={`${data?.stats?.active5m || 0} ${t("actifs sur 5 min", "active in 5 min")}`} />
            <StatCard label={t("Conversations", "Conversations")} value={formatNumber(data?.stats?.conversations || 0, locale)} hint={`${data?.stats?.groupConversations || 0} ${t("groupes", "groups")}`} />
            <StatCard label={t("Signalements", "Reports")} value={formatNumber(data?.stats?.reportsOpen || 0, locale)} hint={`${data?.stats?.blockedUsers || 0} ${t("comptes bloques", "blocked accounts")}`} />
          </section>

          <section className="section-stack">
            <section className={`flow-card section-card ${openSection === "overview" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("overview")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">{t("Vue générale", "Overview")}</div>
                  <h3>{t("Store, activité et état global", "Store, activity and global state")}</h3>
                  <div className="panel-sub">{t("Santé du store, activité admin et comptes les plus actifs dans un seul panneau.", "Store health, admin activity and live account presence in a single panel.")}</div>
                </div>
                  <div className="section-summary">
                  <div className="section-kpi">{formatNumber(data?.stats?.usersTotal || 0, locale)} {t("comptes", "accounts")}</div>
                  <div className="section-kpi">{formatNumber(data?.stats?.onlineNow || 0, locale)} {t("en ligne", "online")}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "overview" ? (
                <div className="section-content">
                  <div className="activity-grid">
                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">{t("Journal admin", "Admin journal")}</div>
                          <h3 className="panel-title">{t("Actions récentes", "Recent actions")}</h3>
                        </div>
                      </div>
                      <div className="stack-scroll">
                        {(data?.analytics?.auditTrail || []).map((entry) => (
                          <div key={entry.id} className="activity-item">
                            <strong>{entry.title || t("Action admin", "Admin action")}</strong>
                            <span>{entry.detail || "—"}</span>
                            <span>{entry.actor?.name || "Admin"} · {entry.actor?.email || "—"} · {entry.actor?.role || "admin"} · {formatDate(entry.createdAt, locale)}</span>
                          </div>
                        ))}
                        {!(data?.analytics?.auditTrail || []).length && <div className="empty">{t("Aucune action admin récente.", "No recent admin actions.")}</div>}
                      </div>
                    </div>

                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">{t("Présence live", "Live presence")}</div>
                          <h3 className="panel-title">{t("Comptes en mouvement", "Accounts in motion")}</h3>
                        </div>
                      </div>
                      <div className="presence-strip">
                        <div className="presence-pill">
                          <div className="meta">{t("Maintenant", "Now")}</div>
                          <strong>{formatNumber(data?.stats?.onlineNow || 0, locale)}</strong>
                        </div>
                        <div className="presence-pill">
                          <div className="meta">5 min</div>
                          <strong>{formatNumber(data?.stats?.active5m || 0, locale)}</strong>
                        </div>
                        <div className="presence-pill">
                          <div className="meta">24 h</div>
                          <strong>{formatNumber(data?.stats?.active24h || 0, locale)}</strong>
                        </div>
                        <div className="presence-pill">
                          <div className="meta">7 j</div>
                          <strong>{formatNumber(data?.stats?.active7d || 0, locale)}</strong>
                        </div>
                        <div className="presence-pill">
                          <div className="meta">+7 {t("j", "d")}</div>
                          <strong>{formatNumber(data?.stats?.newUsers7d || 0, locale)}</strong>
                        </div>
                      </div>
                      <div className="stack-scroll">
                        {(data?.users || []).slice(0, 8).map((entry) => (
                          <div key={entry.uid} className="activity-item">
                            <strong>{entry.name}</strong>
                            <span>{entry.email} · @{entry.profile?.username || t("sans-identifiant", "no-username")}</span>
                            <span>{entry.status === "blocked" ? t("Bloqué", "Blocked") : t("Actif", "Active")} · {t("forfait", "plan")} {entry.plan} · {t("vu", "seen")} {relativeTime(entry.lastSeenAt || entry.lastLoginAt, locale)}</span>
                            <span>{entry.metrics.notes} {t("notes", "notes")} · {entry.metrics.tasks} {t("tâches", "tasks")} · {entry.metrics.events} {t("événements", "events")} · {entry.metrics.unreadNotifications} {t("notif. non lues", "unread notifications")}</span>
                          </div>
                        ))}
                        {!(data?.users || []).length && <div className="empty">{t("Aucune donnée d’activité disponible.", "No activity data available.")}</div>}
                        {!!(data?.analytics?.recentSignups || []).length && (
                          <div className="activity-item">
                            <strong>{t("Nouveaux cette semaine", "New this week")}</strong>
                            <span>
                              {data.analytics.recentSignups.slice(0, 3).map((entry) => `${entry.name} · ${entry.email}`).join(" | ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={`flow-card section-card ${openSection === "users" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("users")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">{t("Comptes Flow", "Flow accounts")}</div>
                  <h3>{t("Utilisateurs", "Users")}</h3>
                  <div className="panel-sub">{t("Recherche, sélection, actions et modération sans surcharge visuelle.", "Search, selection, actions and moderation without visual overload.")}</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{filteredUsers.length} {t("affichés", "shown")}</div>
                  <div className="section-kpi">{selectedUser?.name || t("Aucun compte", "No account")}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "users" ? (
                <div className="section-content">
                  <div className="split-grid">
                    <div className="flow-card panel">
                      <input className="search" placeholder={t("Rechercher par nom, email ou identifiant", "Search by name, email or username")} value={query} onChange={(event) => setQuery(event.target.value)} />
                      <div className="inline-actions" style={{ marginBottom: 8 }}>
                        <button className="btn soft" type="button" disabled={loading || sending} onClick={resetUserFilters}>{t("Réinitialiser les filtres", "Reset filters")}</button>
                      </div>
                      <ChoiceRow options={ui.statusOptions} value={statusFilter} onChange={setStatusFilter} />
                      <ChoiceRow options={ui.adminOptions} value={adminFilter} onChange={setAdminFilter} />
                      <ChoiceRow options={ui.planOptions} value={planFilter} onChange={setPlanFilter} />
                      <div className="stack-scroll">
                        {loading ? <div className="empty">{t("Chargement des utilisateurs…", "Loading users...")}</div> : null}
                        {!loading && !filteredUsers.length ? <div className="empty">{t("Aucun utilisateur trouvé.", "No users found.")}</div> : null}
                        {!loading && filteredUsers.map((entry) => (
                          <button key={entry.uid} type="button" className={`user-row ${selectedUser?.uid === entry.uid ? "active" : ""}`} onClick={() => setSelectedUid(entry.uid)}>
                            <div className="user-top">
                              <div style={{ textAlign: "left" }}>
                                <strong>{entry.name}</strong>
                                <div className="soft">{entry.email}</div>
                              </div>
                              <div className={`badge ${entry.status === "blocked" ? "blocked" : ""}`}>{entry.status === "blocked" ? t("Bloqué", "Blocked") : t("Actif", "Active")}</div>
                            </div>
                            <div className="user-meta">
                              <span>@{entry.profile?.username || t("sans-identifiant", "no-username")}</span>
                              <span>{entry.plan}</span>
                              <span>{relativeTime(entry.lastLoginAt, locale)}</span>
                              {entry.admin?.enabled ? <span>admin {entry.admin.role}</span> : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">{t("Sélection active", "Active selection")}</div>
                          <h3 className="panel-title">{selectedUser?.name || t("Sélectionner un utilisateur", "Select a user")}</h3>
                          <div className="panel-sub">{t("Tout le nécessaire pour agir sur le compte sélectionné.", "Everything needed to act on the selected account.")}</div>
                        </div>
                      </div>
                      {!selectedUser ? <div className="empty">{t("Sélectionne un utilisateur pour agir.", "Select a user to act on it.")}</div> : (
                        <>
                          <div className="detail-grid">
                            <div className="detail-box">
                              <div className="meta">{t("Contact", "Contact")}</div>
                              <strong>{selectedUser.email}</strong>
                              <div className="soft">{t("Créé le", "Created on")} {formatDate(selectedUser.createdAt, locale)}</div>
                            </div>
                            <div className="detail-box">
                              <div className="meta">{t("Connexion", "Login")}</div>
                              <strong>{formatDate(selectedUser.lastLoginAt, locale)}</strong>
                              <div className="soft">{selectedUser.loginCount} {t("connexions", "logins")} · {t("présence", "presence")} {relativeTime(selectedUser.lastSeenAt || selectedUser.lastLoginAt, locale)}</div>
                            </div>
                          </div>

                          <div className="two-col">
                            <div className="message-card" style={{ padding: 16 }}>
                              <div className="meta">{t("Message rapide", "Quick message")}</div>
                              <div className="soft" style={{ marginTop: 6, marginBottom: 12 }}>{t("Choisis l’audience, un titre court puis envoie.", "Choose the audience, a short title and send.")}</div>
                              <div className="composer-box">
                                <ChoiceRow options={ui.recipientOptions} value={form.recipientMode} onChange={(value) => setForm((prev) => ({ ...prev, recipientMode: value }))} />
                                <div>
                                  <label>{t("Titre", "Title")}</label>
                                  <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder={t("Ex: mise à jour, rappel, action requise", "Ex: update, reminder, action required")} />
                                </div>
                                <div>
                                  <label>{t("Message", "Message")}</label>
                                  <textarea value={form.detail} onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))} placeholder={t("Écris un message simple, clair et utile.", "Write a simple, clear and useful message.")} />
                                </div>
                                <div className="inline-actions">
                                  <button className="btn primary" type="button" disabled={sending} onClick={() => runAction("notify", form)}>{t("Envoyer", "Send")}</button>
                                  <button className="btn soft" type="button" disabled={sending} onClick={() => setForm({ recipientMode: "single", title: "", detail: "", type: "admin" })}>{t("Vider", "Clear")}</button>
                                  <button className="btn soft" type="button" disabled={sending || !capabilities.canExportCsv} onClick={() => { window.location.href = "/api/admin/export"; }}>{t("Exporter CSV", "Export CSV")}</button>
                                </div>
                              </div>
                            </div>

                            <div className="message-card" style={{ padding: 16 }}>
                              <div className="meta">{t("Compte et statut", "Account and status")}</div>
                              <div className="inline-actions" style={{ marginTop: 12 }}>
                                <button className="btn soft" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => runAction(selectedUser.status === "blocked" ? "unblock" : "block")}>{selectedUser.status === "blocked" ? t("Débloquer", "Unblock") : t("Bloquer", "Block")}</button>
                                <button className="btn soft" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => runAction("reset-password")}>{t("Reset MDP", "Reset password")}</button>
                                <button className="btn soft" type="button" disabled={sending || !capabilities.canManageAdmins} onClick={() => runAction("update-admin-permissions", { role: selectedUser.admin?.role === "super_admin" ? "admin" : "super_admin", permissions: selectedUser.admin?.permissions || [] })}>{selectedUser.admin?.enabled ? t("Basculer rôle", "Switch role") : t("Promouvoir admin", "Promote admin")}</button>
                              </div>
                              <div className="soft" style={{ marginTop: 14 }}>
                                {t("Admin", "Admin")}: {selectedUser.admin?.enabled ? `${selectedUser.admin.role} · ${(selectedUser.admin.permissions || []).length} ${t("permissions", "permissions")}` : t("non", "no")}
                              </div>
                              {!!selectedUser.admin?.enabled && (
                                <div className="permission-grid" style={{ marginTop: 12 }}>
                                  {(selectedUser.admin.permissions || []).map((permission) => <div key={permission} className="permission-pill">{permission}</div>)}
                                </div>
                              )}
                              <div className="danger-box" style={{ marginTop: 14 }}>
                                <div className="meta">{t("Suppression compte", "Delete account")}</div>
                                <div className="soft" style={{ marginTop: 6 }}>{t("La confirmation reste dans la carte pour éviter les clics accidentels.", "Confirmation stays inside the card to avoid accidental clicks.")}</div>
                                {!confirmDelete ? (
                                  <div className="inline-actions" style={{ marginTop: 12 }}>
                                    <button className="btn danger" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => setConfirmDelete(true)}>{t("Supprimer", "Delete")}</button>
                                  </div>
                                ) : (
                                  <div className="warning-row" style={{ marginTop: 12 }}>
                                    <span className="soft">{t("Confirmer la suppression de", "Confirm deletion of")} {selectedUser.name} ?</span>
                                    <button className="btn danger" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => { setConfirmDelete(false); void runAction("delete-user"); }}>{t("Oui, supprimer", "Yes, delete")}</button>
                                    <button className="btn soft" type="button" disabled={sending} onClick={() => setConfirmDelete(false)}>{t("Annuler", "Cancel")}</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {notice ? <div className="notice">{notice}</div> : null}
                          {tempPassword ? <div className="notice">{t("Mot de passe temporaire :", "Temporary password:")} {tempPassword}</div> : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={`flow-card section-card ${openSection === "data" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("data")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">{t("Données live", "Live data")}</div>
                  <h3>{t("Lecture complète du compte sélectionné", "Full readout of the selected account")}</h3>
                  <div className="panel-sub">{t("Profil, sécurité, plan, activité, volumes métier et signaux de santé en direct.", "Profile, security, plan, activity, business volumes and health signals in real time.")}</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{selectedUser?.name || t("Aucune sélection", "No selection")}</div>
                  <div className="section-kpi">{selectedUser?.email || t("Choisis un compte", "Choose an account")}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "data" ? (
                <div className="section-content">
                  {!selectedUser ? <div className="empty">{t("Sélectionne un utilisateur dans la section comptes pour afficher ses données live.", "Select a user in the accounts section to display live data.")}</div> : (
                    <>
                      <div className="data-grid">
                        <DataMetric label={t("Nom affiché", "Display name")} value={selectedUser.name} hint={selectedUser.profile?.fullName || t("Nom complet non renseigné", "Full name not set")} />
                        <DataMetric label={t("Identifiant", "Username")} value={selectedUser.profile?.username ? `@${selectedUser.profile.username}` : t("Aucun", "None")} hint={selectedUser.email} />
                        <DataMetric label={t("Forfait", "Plan")} value={selectedUser.plan} hint={`${t("Statut", "Status")}: ${selectedUser.planStatus || "—"}`} />
                        <DataMetric label={t("Dernière présence", "Last presence")} value={relativeTime(selectedUser.lastSeenAt || selectedUser.lastLoginAt, locale)} hint={formatDate(selectedUser.lastSeenAt || selectedUser.lastLoginAt, locale)} />
                      </div>

                      <div className="activity-grid">
                        <div className="data-block">
                          <div>
                            <div className="eyebrow">{t("Compte", "Account")}</div>
                            <h3 className="panel-title">{selectedUser.name}</h3>
                          </div>
                          <div className="data-list">
                            <div className="data-row"><span>{t("Email", "Email")}</span><span>{selectedUser.email}</span></div>
                            <div className="data-row"><span>UID</span><span>{selectedUser.uid}</span></div>
                            <div className="data-row"><span>{t("Création", "Creation")}</span><span>{formatDate(selectedUser.createdAt, locale)}</span></div>
                            <div className="data-row"><span>{t("Dernière connexion", "Last login")}</span><span>{formatDate(selectedUser.lastLoginAt, locale)}</span></div>
                            <div className="data-row"><span>{t("Dernière activité", "Last activity")}</span><span>{formatDate(selectedUser.lastSeenAt, locale)}</span></div>
                            <div className="data-row"><span>{t("Connexions", "Logins")}</span><span>{formatNumber(selectedUser.loginCount, locale)}</span></div>
                          </div>
                        </div>

                        <div className="data-block">
                          <div>
                            <div className="eyebrow">{t("Profil", "Profile")}</div>
                            <h3 className="panel-title">{t("Identité et contact", "Identity and contact")}</h3>
                          </div>
                          <div className="data-list">
                            <div className="data-row"><span>{t("Nom complet", "Full name")}</span><span>{selectedUser.profile?.fullName || "—"}</span></div>
                            <div className="data-row"><span>{t("Téléphone", "Phone")}</span><span>{selectedUser.profile?.phone || "—"}</span></div>
                            <div className="data-row"><span>{t("Téléphone visible", "Phone visible")}</span><span>{selectedUser.profile?.phoneVisible ? t("Oui", "Yes") : t("Non", "No")}</span></div>
                            <div className="data-row"><span>{t("Photo profil", "Profile photo")}</span><span>{selectedUser.profile?.photoUrl ? t("Configurée", "Configured") : t("Absente", "Missing")}</span></div>
                            <div className="data-row"><span>{t("Admin", "Admin")}</span><span>{selectedUser.admin?.enabled ? selectedUser.admin.role : t("Non", "No")}</span></div>
                            <div className="data-row"><span>{t("Permissions", "Permissions")}</span><span>{formatNumber((selectedUser.admin?.permissions || []).length, locale)}</span></div>
                          </div>
                        </div>

                        <div className="data-block">
                          <div>
                            <div className="eyebrow">{t("Sécurité", "Security")}</div>
                            <h3 className="panel-title">{t("État et signaux", "State and signals")}</h3>
                          </div>
                          <div className="data-list">
                            <div className="data-row"><span>{t("Statut", "Status")}</span><span>{selectedUser.status === "blocked" ? t("Bloqué", "Blocked") : t("Actif", "Active")}</span></div>
                            <div className="data-row"><span>{t("Mot de passe à changer", "Must change password")}</span><span>{selectedUser.mustChangePassword ? t("Oui", "Yes") : t("Non", "No")}</span></div>
                            <div className="data-row"><span>{t("Blocage", "Block date")}</span><span>{selectedUser.blockedAt ? formatDate(selectedUser.blockedAt, locale) : "—"}</span></div>
                            <div className="data-row"><span>{t("Motif blocage", "Block reason")}</span><span>{selectedUser.blockedReason || "—"}</span></div>
                            <div className="data-row"><span>{t("Plan billing", "Billing plan")}</span><span>{selectedUser.planStatus || "—"}</span></div>
                          </div>
                        </div>

                        <div className="data-block">
                          <div>
                            <div className="eyebrow">{t("Volumes métier", "Business volume")}</div>
                            <h3 className="panel-title">{t("Modules utilisés", "Modules used")}</h3>
                          </div>
                          <div className="data-list">
                            <div className="data-row"><span>{t("Notes", "Notes")}</span><span>{formatNumber(selectedUser.metrics?.notes, locale)}</span></div>
                            <div className="data-row"><span>{t("Tâches", "Tasks")}</span><span>{formatNumber(selectedUser.metrics?.tasks, locale)}</span></div>
                            <div className="data-row"><span>{t("Événements", "Events")}</span><span>{formatNumber(selectedUser.metrics?.events, locale)}</span></div>
                            <div className="data-row"><span>{t("Habitudes", "Habits")}</span><span>{formatNumber(selectedUser.metrics?.habits, locale)}</span></div>
                            <div className="data-row"><span>{t("Objectifs", "Goals")}</span><span>{formatNumber(selectedUser.metrics?.goals, locale)}</span></div>
                            <div className="data-row"><span>{t("Signets", "Bookmarks")}</span><span>{formatNumber(selectedUser.metrics?.bookmarks, locale)}</span></div>
                            <div className="data-row"><span>{t("Notifications", "Notifications")}</span><span>{formatNumber(selectedUser.metrics?.notifications, locale)}</span></div>
                            <div className="data-row"><span>{t("Non lues", "Unread")}</span><span>{formatNumber(selectedUser.metrics?.unreadNotifications, locale)}</span></div>
                            <div className="data-row"><span>{t("Activité", "Activity")}</span><span>{formatNumber(selectedUser.metrics?.activity, locale)}</span></div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </section>

            <section className={`flow-card section-card ${openSection === "support" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("support")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">{t("Support Flow", "Flow support")}</div>
                  <h3>{t("Conversations utilisateurs", "User conversations")}</h3>
                  <div className="panel-sub">{t("Messages support ouverts depuis Flow, avec réponse admin directe.", "Support messages opened from Flow, with direct admin reply.")}</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{supportConversations.length} {t("conversations", "conversations")}</div>
                  <div className="section-kpi">{selectedSupportConversation?.title || t("Aucune sélection", "No selection")}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "support" ? (
                <div className="section-content">
                  <div className="conversation-shell">
                    <div className="stack-scroll">
                      {!supportConversations.length && <div className="empty">{t("Aucune conversation support pour le moment.", "No support conversation yet.")}</div>}
                      {supportConversations.map((conversation) => (
                        <button key={conversation.id} type="button" className={`user-row ${selectedSupportConversation?.id === conversation.id ? "active" : ""}`} onClick={() => setSelectedSupportId(conversation.id)}>
                          <div className="user-top">
                            <div style={{ textAlign: "left" }}>
                              <strong>{conversation.title}</strong>
                              <div className="soft">{conversation.participants?.map((participant) => participant.name).join(", ")}</div>
                            </div>
                            <div className={`badge ${conversation.supportStatus === "closed" ? "blocked" : ""}`}>{conversation.supportStatus === "closed" ? t("Fermée", "Closed") : t("Ouverte", "Open")}</div>
                            </div>
                            <div className="user-meta">
                              <span>{conversation.unreadCount || 0} {t("non lus", "unread")}</span>
                              <span>{conversation.lastMessageAt ? formatDate(conversation.lastMessageAt, locale) : t("Pas de message", "No message")}</span>
                            </div>
                          </button>
                      ))}
                    </div>

                    <div className="support-thread">
                      {!selectedSupportConversation ? <div className="empty">{t("Sélectionne une conversation support.", "Select a support conversation.")}</div> : (
                        <>
                          <div className="detail-box">
                            <div className="meta">{t("Conversation active", "Active conversation")}</div>
                            <strong>{selectedSupportConversation.title}</strong>
                            <div className="soft">{selectedSupportConversation.participants?.map((participant) => participant.name).join(", ")}</div>
                            <div className="inline-actions" style={{ marginTop: 12 }}>
                              <button className="btn soft" type="button" disabled={sending} onClick={() => runSupportAction("mark-read")}>{t("Marquer lu", "Mark as read")}</button>
                              <button className="btn soft" type="button" disabled={sending} onClick={() => runSupportAction("toggle-support-status")}>{selectedSupportConversation.supportStatus === "closed" ? t("Réouvrir", "Reopen") : t("Clore", "Close")}</button>
                            </div>
                          </div>
                          <div className="stack-scroll">
                            {(selectedSupportConversation.messages || []).map((message) => (
                              <div key={message.id} className={`support-message ${message.sender?.email === data?.admin?.email ? "admin" : ""}`}>
                                <strong>{message.sender?.name || t("Système", "System")}</strong>
                              <div className="soft" style={{ marginTop: 6 }}>{message.body || t("Message système", "System message")}</div>
                                <div className="support-meta">{formatDate(message.createdAt, locale)}</div>
                              </div>
                            ))}
                          </div>
                          <div className="message-card" style={{ padding: 16 }}>
                            <label>{t("Réponse admin", "Admin reply")}</label>
                            <textarea value={supportReply} onChange={(event) => setSupportReply(event.target.value)} placeholder={t("Répondre à l’utilisateur depuis le dashboard admin...", "Reply to the user from the admin dashboard...")} />
                            <div className="inline-actions" style={{ marginTop: 12 }}>
                              <button className="btn primary" type="button" disabled={sending || !supportReply.trim()} onClick={() => runSupportAction("send-message", { text: supportReply })}>{t("Envoyer", "Send")}</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={`flow-card section-card ${openSection === "reports" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("reports")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">{t("Signalements", "Reports")}</div>
                  <h3>{t("Messages et bugs remontés", "Messages and bugs reported")}</h3>
                  <div className="panel-sub">{t("Messages signalés et bugs interface dans une modération unique.", "Reported messages and interface bugs in a single moderation area.")}</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{formatNumber(data?.stats?.reportsOpen || 0, locale)} {t("ouverts", "open")}</div>
                  <div className="section-kpi">{selectedReport?.reason || t("Aucune sélection", "No selection")}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "reports" ? (
                <div className="section-content">
                  <div className="conversation-shell">
                    <div className="stack-scroll">
                      {!reports.length && <div className="empty">{t("Aucun signalement dans le store pour le moment.", "No report in the store right now.")}</div>}
                      {reports.map((report) => (
                        <button key={report.id} type="button" className={`user-row ${selectedReport?.id === report.id ? "active" : ""}`} onClick={() => setSelectedReportId(report.id)}>
                          <div className="user-top">
                            <div style={{ textAlign: "left" }}>
                              <strong>{report.reason || t("Signalement Flow", "Flow report")}</strong>
                              <div className="soft">{report.reporter?.name || t("Utilisateur", "User")} · {report.type === "bug" ? t("bug", "bug") : t("message", "message")}</div>
                            </div>
                            <div className={`badge ${report.status !== "open" ? "blocked" : ""}`}>{reportStatusLabel(report.status, locale)}</div>
                          </div>
                          <div className="user-meta">
                            <span>{report.conversationTitle || "Flow"}</span>
                            <span>{relativeTime(report.createdAt, locale)}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="support-thread">
                      {!selectedReport ? <div className="empty">{t("Sélectionne un signalement pour l’analyser.", "Select a report to review it.")}</div> : (
                        <>
                          <div className="detail-box">
                            <div className="meta">{t("Signalement actif", "Active report")}</div>
                            <strong>{selectedReport.reason || t("Signalement Flow", "Flow report")}</strong>
                            <div className="soft">
                              {selectedReport.reporter?.name || t("Utilisateur", "User")} · {selectedReport.reporter?.email || "—"} · {selectedReport.type === "bug" ? t("Bug interface", "Interface bug") : t("Message signalé", "Reported message")}
                            </div>
                            <div className="soft" style={{ marginTop: 6 }}>
                              {selectedReport.conversationTitle || "Flow"} · {t("envoyé", "sent")} {formatDate(selectedReport.createdAt, locale)}
                            </div>
                            <div className="inline-actions" style={{ marginTop: 12 }}>
                              <button
                                className="btn soft"
                                type="button"
                                disabled={sending || !capabilities.canModerateReports || selectedReport.status === "resolved"}
                                onClick={() => runAction("update-report-status", { reportId: selectedReport.id, status: "resolved", resolutionNote: reportResolutionNote })}
                              >
                                {t("Marquer résolu", "Mark resolved")}
                              </button>
                              <button
                                className="btn soft"
                                type="button"
                                disabled={sending || !capabilities.canModerateReports || selectedReport.status === "dismissed"}
                                onClick={() => runAction("update-report-status", { reportId: selectedReport.id, status: "dismissed", resolutionNote: reportResolutionNote })}
                              >
                                {t("Classer sans suite", "Dismiss")}
                              </button>
                            </div>
                          </div>
                          <div className="stack-scroll">
                            <div className="activity-item">
                              <strong>{t("Reporter", "Reporter")}</strong>
                              <span>{selectedReport.reporter?.name || t("Utilisateur", "User")} · {selectedReport.reporter?.email || "—"}</span>
                              <span>@{selectedReport.reporter?.profile?.username || t("sans-identifiant", "no-username")}</span>
                            </div>
                            {selectedReport.sender ? (
                              <div className="activity-item">
                                <strong>{t("Auteur du message", "Message author")}</strong>
                                <span>{selectedReport.sender.name} · {selectedReport.sender.email}</span>
                                <span>@{selectedReport.sender.profile?.username || t("sans-identifiant", "no-username")}</span>
                              </div>
                            ) : null}
                            <div className="activity-item">
                              <strong>{t("Détail", "Detail")}</strong>
                              <span>{selectedReport.details || t("Aucun détail supplémentaire.", "No extra detail.")}</span>
                              {selectedReport.messagePreview ? <span>{t("Aperçu:", "Preview:")} {selectedReport.messagePreview}</span> : null}
                            </div>
                            {selectedReport.resolvedAt ? (
                              <div className="activity-item">
                                <strong>{t("Clôture", "Closure")}</strong>
                                <span>{reportStatusLabel(selectedReport.status, locale)} {t("le", "on")} {formatDate(selectedReport.resolvedAt, locale)}</span>
                                <span>{selectedReport.resolver?.name || "Admin"}{selectedReport.resolutionNote ? ` · ${selectedReport.resolutionNote}` : ""}</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="message-card" style={{ padding: 16 }}>
                            <label>{t("Note de résolution", "Resolution note")}</label>
                            <textarea
                              value={reportResolutionNote}
                              onChange={(event) => setReportResolutionNote(event.target.value)}
                              placeholder={t("Précise la décision prise ou le suivi envoyé à l'utilisateur.", "Describe the decision or the follow-up sent to the user.")}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={`flow-card section-card ${openSection === "admins" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("admins")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">{t("Administration", "Administration")}</div>
                  <h3>{t("Admin actif et création de comptes", "Active admin and account creation")}</h3>
                  <div className="panel-sub">{t("Rôle courant, permissions et création d’admin dans une zone dédiée.", "Current role, permissions and admin creation in one dedicated area.")}</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{data?.admin?.admin?.role || "—"}</div>
                  <div className="section-kpi">{(data?.permissions || []).length} {t("permissions", "permissions")}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "admins" ? (
                <div className="section-content">
                  <div className="activity-grid">
                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">{t("Admin actif", "Active admin")}</div>
                          <h3 className="panel-title">{data?.admin?.name || "—"}</h3>
                          <div className="panel-sub">{data?.admin?.email || "—"}</div>
                        </div>
                      </div>
                      <div className="detail-grid">
                        <div className="detail-box">
                          <div className="meta">{t("Rôle", "Role")}</div>
                          <strong>{data?.admin?.admin?.role || "—"}</strong>
                        </div>
                        <div className="detail-box">
                          <div className="meta">{t("Permissions", "Permissions")}</div>
                          <strong>{(data?.permissions || []).length}</strong>
                        </div>
                      </div>
                      <div className="stack-scroll">
                        {(data?.permissions || []).map((permission) => <div key={permission} className="permission-pill">{permission}</div>)}
                      </div>
                    </div>

                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">{t("Créer un admin", "Create admin")}</div>
                          <h3 className="panel-title">{t("Nouveau compte admin", "New admin account")}</h3>
                          <div className="panel-sub">{t("Compte, rôle et permissions dans une seule carte.", "Account, role and permissions in a single card.")}</div>
                        </div>
                      </div>
                      <div className="stack-scroll">
                        <div className="composer-box">
                          <div>
                            <label>{t("Nom", "Name")}</label>
                            <input value={adminForm.name} onChange={(event) => setAdminForm((prev) => ({ ...prev, name: event.target.value }))} />
                          </div>
                          <div>
                            <label>{t("Email", "Email")}</label>
                            <input value={adminForm.email} onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))} />
                          </div>
                          <div>
                            <label>{t("Mot de passe", "Password")}</label>
                            <input value={adminForm.password} onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))} />
                          </div>
                          <div>
                            <label>{t("Rôle", "Role")}</label>
                            <ChoiceRow
                              options={ui.roleOptions}
                              value={adminForm.role}
                              onChange={(value) => setAdminForm((prev) => ({
                                ...prev,
                                role: value,
                                permissions: value === "super_admin" ? ui.permissions.map((item) => item.key) : prev.permissions,
                              }))}
                            />
                          </div>
                          <div>
                            <label>{t("Permissions", "Permissions")}</label>
                            <div className="permission-grid">
                              {ui.permissions.map((permission) => (
                                <label key={permission.key} className="permission-toggle">
                                  <input
                                    type="checkbox"
                                    checked={adminForm.role === "super_admin" || adminForm.permissions.includes(permission.key)}
                                    disabled={adminForm.role === "super_admin"}
                                    onChange={() => setAdminForm((prev) => ({
                                      ...prev,
                                      permissions: prev.permissions.includes(permission.key)
                                        ? prev.permissions.filter((item) => item !== permission.key)
                                        : [...prev.permissions, permission.key],
                                    }))}
                                  />
                                  <span>{permission.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="inline-actions">
                        <button
                          className="btn primary"
                          type="button"
                          disabled={sending || !capabilities.canCreateAdmins}
                          onClick={() => void createAdminAccount()}
                        >
                          {t("Créer l'admin", "Create admin")}
                        </button>
                        <button className="btn soft" type="button" disabled={sending} onClick={() => setAdminForm(DEFAULT_ADMIN_FORM)}>{t("Réinitialiser", "Reset")}</button>
                      </div>
                    </div>
                  </div>
                  {notice && openSection === "admins" ? <div className="notice">{notice}</div> : null}
                </div>
              ) : null}
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
