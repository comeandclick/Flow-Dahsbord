"use client";

import { useEffect, useMemo, useState } from "react";
import { getStoredLocale, installDomTranslator } from "../../lib/i18n";

const nf = new Intl.NumberFormat("fr-FR");
const PERMISSIONS = [
  { key: "dashboard.read", label: "Dashboard" },
  { key: "users.read", label: "Lecture utilisateurs" },
  { key: "users.manage", label: "Gestion utilisateurs" },
  { key: "messages.send", label: "Notifications" },
  { key: "accounts.block", label: "Blocage comptes" },
  { key: "accounts.reset_password", label: "Reset mot de passe" },
  { key: "accounts.delete", label: "Suppression comptes" },
  { key: "admins.read", label: "Lecture admins" },
  { key: "admins.create", label: "Creation admins" },
  { key: "admins.manage", label: "Gestion admins" },
  { key: "email.send", label: "Email transactionnel" },
  { key: "exports.csv", label: "Export CSV" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "blocked", label: "Bloques" },
];

const ADMIN_OPTIONS = [
  { value: "all", label: "Tous roles" },
  { value: "users", label: "Utilisateurs" },
  { value: "admins", label: "Tous admins" },
  { value: "admin", label: "Admins" },
  { value: "super_admin", label: "Super admins" },
];

const PLAN_OPTIONS = [
  { value: "all", label: "Tous forfaits" },
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "summit", label: "Summit" },
];

const RECIPIENT_OPTIONS = [
  { value: "single", label: "Selection actuelle" },
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "blocked", label: "Bloques" },
  { value: "admins", label: "Admins" },
  { value: "plan:starter", label: "Starter" },
  { value: "plan:pro", label: "Pro" },
  { value: "plan:summit", label: "Summit" },
];

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
];

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function relativeTime(value) {
  if (!value) return "jamais";
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) return "jamais";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "a l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function reportStatusLabel(status) {
  if (status === "resolved") return "Résolu";
  if (status === "dismissed") return "Classé";
  return "Ouvert";
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
  if (!response.ok) throw new Error(payload?.error || "Requete impossible");
  return payload;
}

function ChoiceRow({ options, value, onChange }) {
  return (
    <div className="chip-row">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`chip ${value === option.value ? "on" : ""}`}
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

export default function AdminDashboard() {
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
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    permissions: ["dashboard.read", "users.read", "messages.send"],
  });

  useEffect(() => {
    const locale = getStoredLocale();
    document.documentElement.lang = locale;
    return installDomTranslator(document.body, locale);
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

  async function runAction(action, extra = {}) {
    setSending(true);
    setNotice("");
    setTempPassword("");
    try {
      const payload = await api("/api/admin/actions", {
        method: "POST",
        body: JSON.stringify({ action, uid: selectedUser?.uid || "", ...extra }),
      });
      if (payload?.temporaryPassword) setTempPassword(payload.temporaryPassword);
      setNotice("Action appliquee.");
      await loadOverview(true);
      await loadSupportConversations();
    } catch (err) {
      setNotice(err.message);
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
    { key: "overview", label: "Vue générale", value: `${nf.format(data?.stats?.usersTotal || 0)} comptes` },
    { key: "users", label: "Utilisateurs", value: `${filteredUsers.length} visibles` },
    { key: "support", label: "Support", value: `${supportConversations.length} conversations` },
    { key: "reports", label: "Signalements", value: `${reports.length} entrées` },
    { key: "admins", label: "Administration", value: `${(data?.permissions || []).length} permissions` },
  ];

  function toggleSection(key) {
    setOpenSection((prev) => (prev === key ? "" : key));
  }

  return (
    <div className="admin-shell">
      <style jsx>{`
        :global(html),:global(body){margin:0;min-height:100%}
        :global(body){
          font-family:"Geist",system-ui,sans-serif;
          background:
            radial-gradient(circle at top left, rgba(255,255,255,.12), transparent 26%),
            linear-gradient(145deg, rgba(255,255,255,.03), transparent 28%),
            #0b0b0d;
          color:#f7f7fb;
          overflow:auto;
        }
        :global(body)::before{
          content:"";
          position:fixed;
          top:-180px;
          left:-140px;
          width:min(54vw,620px);
          height:min(54vw,620px);
          pointer-events:none;
          background:
            radial-gradient(circle at 40% 42%, rgba(255,255,255,.18) 0%, rgba(255,255,255,.08) 22%, transparent 60%),
            conic-gradient(from 220deg at 42% 42%, rgba(255,255,255,.12) 0deg, transparent 64deg, rgba(255,255,255,.04) 96deg, transparent 170deg, rgba(255,255,255,.06) 220deg, transparent 360deg);
          opacity:.95;
          filter:blur(10px);
          z-index:0;
        }
        .admin-shell{
          min-height:100vh;
          padding:14px;
          position:relative;
          z-index:1;
        }
        .admin-layout{
          min-height:calc(100vh - 28px);
          display:grid;
          grid-template-columns:300px minmax(0,1fr);
          gap:14px;
          align-items:start;
        }
        .flow-card{
          border:1px solid rgba(255,255,255,.08);
          border-radius:28px;
          background:
            radial-gradient(circle at top left, rgba(255,255,255,.08), transparent 26%),
            linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015) 18%, transparent 44%),
            #121318;
          box-shadow:0 24px 70px rgba(0,0,0,.24);
          overflow:hidden;
        }
        .sidebar{
          padding:18px;
          display:flex;
          flex-direction:column;
          gap:16px;
          min-height:calc(100vh - 28px);
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
          border-radius:16px;
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
          border-radius:18px;
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
          display:flex;
          flex-direction:column;
          gap:14px;
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
        .summary-box{
          display:grid;
          gap:10px;
          align-content:start;
        }
        .mini-stat{
          padding:14px 16px;
          border-radius:22px;
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
          border-radius:16px;
          background:#1a1c22;
          color:#f6f7fb;
          padding:12px 16px;
          font-weight:700;
          cursor:pointer;
          transition:transform .16s ease,border-color .16s ease,background .16s ease;
        }
        .btn:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.14)}
        .btn.primary{
          background:linear-gradient(180deg,#f5f5f7,#cfcfd4);
          color:#111113;
          border-color:rgba(255,255,255,.22);
        }
        .btn.soft{
          background:#17191f;
        }
        .btn.danger{
          background:linear-gradient(180deg,#ef8a8a,#e26262);
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
          border-radius:18px;
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
          border-radius:14px;
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
          max-height:520px;
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
          border-radius:14px;
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
          max-height:min(68vh,880px);
          overflow:auto;
          overscroll-behavior:contain;
        }
        .split-grid{
          display:grid;
          grid-template-columns:minmax(320px,.9fr) minmax(0,1.1fr);
          gap:14px;
        }
        .user-row,.activity-item,.message-card,.detail-box,.permission-pill{
          border-radius:20px;
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
          border:1px solid rgba(115,208,170,.18);
          background:rgba(83,185,143,.12);
          color:#a9efcf;
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
          border-radius:16px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          color:#f7f7fb;
          outline:none;
          resize:none;
        }
        textarea{min-height:126px}
        .notice{
          padding:13px 14px;
          border-radius:18px;
          border:1px solid rgba(178,167,255,.24);
          background:rgba(139,125,255,.1);
        }
        .warning-row{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          align-items:center;
        }
        .danger-box{
          padding:12px 14px;
          border-radius:18px;
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
          border-radius:18px;
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
          border-radius:18px;
          border:1px solid rgba(255,255,255,.08);
          background:#17191f;
          cursor:pointer;
        }
        .permission-toggle input{width:auto}
        .error-box,.empty{
          padding:18px;
          border-radius:22px;
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
          .hero,.detail-grid,.two-col,.permission-grid,.conversation-shell,.activity-grid,.split-grid{grid-template-columns:1fr}
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
            <div className="eyebrow">Flow Control</div>
            <h1>Admin Flow</h1>
            <div className="soft">Shell admin simplifié, même identité que Flow, avec seulement les panneaux utiles.</div>
          </div>

          <div className="nav-group">
            <div className="eyebrow">Navigation admin</div>
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
            <div className="eyebrow">Actions</div>
            <div className="nav-actions">
              <a className="btn soft" href="/">Ouvrir Flow</a>
              <a className="btn soft" href="/api/admin/export">Export CSV</a>
              <button className="btn soft" onClick={() => loadOverview()} disabled={loading || sending}>Rafraichir</button>
              <button className="btn soft" onClick={async () => { await api("/api/admin/auth/logout", { method: "POST" }); window.location.href = "/admin/login"; }}>Deconnexion</button>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <section className="flow-card hero">
            <div className="hero-copy">
              <div className="eyebrow">Flow Admin Dashboard</div>
              <h2>Piloter Flow sans bruit inutile.</h2>
              <div className="soft">Ouvre une zone, traite l’action, puis referme. Le dashboard garde la même DA que Flow et reste simple à lire sur PC comme sur téléphone.</div>
              <div className="hero-actions">
                <button className="btn primary" type="button" onClick={() => setOpenSection("users")}>Ouvrir les comptes</button>
                <button className="btn soft" type="button" onClick={() => setOpenSection("support")}>Ouvrir le support</button>
                <button className="btn soft" type="button" onClick={() => setOpenSection("reports")}>Ouvrir les signalements</button>
              </div>
            </div>
            <div className="summary-box">
              <div className="mini-stat">
                <div className="meta">Santé du store</div>
                <strong>{data?.health?.status || "—"}</strong>
                <div className="soft">Version {data?.release?.version ? `v${data.release.version}` : "—"}</div>
              </div>
              <div className="mini-stat">
                <div className="meta">Dernière mise à jour</div>
                <strong style={{ fontSize: 16, lineHeight: 1.35 }}>{formatDate(data?.release?.deployedAt)}</strong>
                <div className="soft">{data?.health?.latencyMs ? `${data.health.latencyMs} ms` : "Latence indisponible"}</div>
              </div>
            </div>
          </section>

          {error ? <div className="error-box">{error}</div> : null}

          <section className="stats-grid">
            <StatCard label="Utilisateurs" value={nf.format(data?.stats?.usersTotal || 0)} hint={`${data?.stats?.newUsers7d || 0} nouveaux sur 7 jours`} />
            <StatCard label="En ligne" value={nf.format(data?.stats?.onlineNow || 0)} hint={`${data?.stats?.active5m || 0} actifs sur 5 min`} />
            <StatCard label="Conversations" value={nf.format(data?.stats?.conversations || 0)} hint={`${data?.stats?.groupConversations || 0} groupes`} />
            <StatCard label="Signalements" value={nf.format(data?.stats?.reportsOpen || 0)} hint={`${data?.stats?.blockedUsers || 0} comptes bloques`} />
          </section>

          <section className="section-stack">
            <section className={`flow-card section-card ${openSection === "overview" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("overview")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">Vue générale</div>
                  <h3>Store, activité et état global</h3>
                  <div className="panel-sub">Santé du store, activité admin et comptes les plus actifs dans un seul panneau.</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{nf.format(data?.stats?.usersTotal || 0)} comptes</div>
                  <div className="section-kpi">{nf.format(data?.stats?.onlineNow || 0)} en ligne</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "overview" ? (
                <div className="section-content">
                  <div className="activity-grid">
                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">Journal admin</div>
                          <h3 className="panel-title">Actions récentes</h3>
                        </div>
                      </div>
                      <div className="stack-scroll">
                        {(data?.analytics?.auditTrail || []).map((entry) => (
                          <div key={entry.id} className="activity-item">
                            <strong>{entry.title || "Action admin"}</strong>
                            <span>{entry.detail || "—"}</span>
                            <span>{entry.actor?.name || "Admin"} · {entry.actor?.email || "—"} · {entry.actor?.role || "admin"} · {formatDate(entry.createdAt)}</span>
                          </div>
                        ))}
                        {!(data?.analytics?.auditTrail || []).length && <div className="empty">Aucune action admin récente.</div>}
                      </div>
                    </div>

                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">Activité comptes</div>
                          <h3 className="panel-title">Profils les plus actifs</h3>
                        </div>
                      </div>
                      <div className="stack-scroll">
                        {(data?.analytics?.topActiveUsers || []).map((entry) => (
                          <div key={entry.uid} className="activity-item">
                            <strong>{entry.name}</strong>
                            <span>{entry.email}</span>
                            <span>{entry.metrics.notes} notes · {entry.metrics.tasks} tâches · {entry.metrics.events} événements · {entry.metrics.bookmarks} signets · {entry.metrics.goals} objectifs</span>
                            <span>Dernière connexion: {formatDate(entry.lastLoginAt)} · score: {entry.metrics.activity}</span>
                          </div>
                        ))}
                        {!(data?.analytics?.topActiveUsers || []).length && <div className="empty">Aucune donnée d’activité disponible.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={`flow-card section-card ${openSection === "users" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("users")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">Comptes Flow</div>
                  <h3>Utilisateurs</h3>
                  <div className="panel-sub">Recherche, sélection, actions et modération sans surcharge visuelle.</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{filteredUsers.length} affichés</div>
                  <div className="section-kpi">{selectedUser?.name || "Aucun compte"}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "users" ? (
                <div className="section-content">
                  <div className="split-grid">
                    <div className="flow-card panel">
                      <input className="search" placeholder="Rechercher par nom, email ou identifiant" value={query} onChange={(event) => setQuery(event.target.value)} />
                      <ChoiceRow options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
                      <ChoiceRow options={ADMIN_OPTIONS} value={adminFilter} onChange={setAdminFilter} />
                      <ChoiceRow options={PLAN_OPTIONS} value={planFilter} onChange={setPlanFilter} />
                      <div className="stack-scroll">
                        {loading ? <div className="empty">Chargement des utilisateurs…</div> : null}
                        {!loading && !filteredUsers.length ? <div className="empty">Aucun utilisateur trouvé.</div> : null}
                        {!loading && filteredUsers.map((entry) => (
                          <button key={entry.uid} type="button" className={`user-row ${selectedUser?.uid === entry.uid ? "active" : ""}`} onClick={() => setSelectedUid(entry.uid)}>
                            <div className="user-top">
                              <div style={{ textAlign: "left" }}>
                                <strong>{entry.name}</strong>
                                <div className="soft">{entry.email}</div>
                              </div>
                              <div className={`badge ${entry.status === "blocked" ? "blocked" : ""}`}>{entry.status === "blocked" ? "Bloqué" : "Actif"}</div>
                            </div>
                            <div className="user-meta">
                              <span>@{entry.profile?.username || "sans-identifiant"}</span>
                              <span>{entry.plan}</span>
                              <span>{relativeTime(entry.lastLoginAt)}</span>
                              {entry.admin?.enabled ? <span>admin {entry.admin.role}</span> : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">Sélection active</div>
                          <h3 className="panel-title">{selectedUser?.name || "Sélectionner un utilisateur"}</h3>
                          <div className="panel-sub">Tout le nécessaire pour agir sur le compte sélectionné.</div>
                        </div>
                      </div>
                      {!selectedUser ? <div className="empty">Sélectionne un utilisateur pour agir.</div> : (
                        <>
                          <div className="detail-grid">
                            <div className="detail-box">
                              <div className="meta">Contact</div>
                              <strong>{selectedUser.email}</strong>
                              <div className="soft">Créé le {formatDate(selectedUser.createdAt)}</div>
                            </div>
                            <div className="detail-box">
                              <div className="meta">Connexion</div>
                              <strong>{formatDate(selectedUser.lastLoginAt)}</strong>
                              <div className="soft">{selectedUser.loginCount} connexions</div>
                            </div>
                          </div>

                          <div className="two-col">
                            <div className="message-card" style={{ padding: 16 }}>
                              <div className="meta">Message rapide</div>
                              <div className="soft" style={{ marginTop: 6, marginBottom: 12 }}>Choisis l’audience, un titre court puis envoie.</div>
                              <div className="composer-box">
                                <ChoiceRow options={RECIPIENT_OPTIONS} value={form.recipientMode} onChange={(value) => setForm((prev) => ({ ...prev, recipientMode: value }))} />
                                <div>
                                  <label>Titre</label>
                                  <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Ex: mise à jour, rappel, action requise" />
                                </div>
                                <div>
                                  <label>Message</label>
                                  <textarea value={form.detail} onChange={(event) => setForm((prev) => ({ ...prev, detail: event.target.value }))} placeholder="Écris un message simple, clair et utile." />
                                </div>
                                <div className="inline-actions">
                                  <button className="btn primary" type="button" disabled={sending} onClick={() => runAction("notify", form)}>Envoyer</button>
                                  <button className="btn soft" type="button" disabled={sending || !capabilities.canExportCsv} onClick={() => { window.location.href = "/api/admin/export"; }}>Exporter CSV</button>
                                </div>
                              </div>
                            </div>

                            <div className="message-card" style={{ padding: 16 }}>
                              <div className="meta">Compte et statut</div>
                              <div className="inline-actions" style={{ marginTop: 12 }}>
                                <button className="btn soft" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => runAction(selectedUser.status === "blocked" ? "unblock" : "block")}>{selectedUser.status === "blocked" ? "Débloquer" : "Bloquer"}</button>
                                <button className="btn soft" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => runAction("reset-password")}>Reset MDP</button>
                                <button className="btn soft" type="button" disabled={sending || !capabilities.canManageAdmins} onClick={() => runAction("update-admin-permissions", { role: selectedUser.admin?.role === "super_admin" ? "admin" : "super_admin", permissions: selectedUser.admin?.permissions || [] })}>{selectedUser.admin?.enabled ? "Basculer rôle" : "Promouvoir admin"}</button>
                              </div>
                              <div className="soft" style={{ marginTop: 14 }}>
                                Admin: {selectedUser.admin?.enabled ? `${selectedUser.admin.role} · ${(selectedUser.admin.permissions || []).length} permissions` : "non"}
                              </div>
                              {!!selectedUser.admin?.enabled && (
                                <div className="permission-grid" style={{ marginTop: 12 }}>
                                  {(selectedUser.admin.permissions || []).map((permission) => <div key={permission} className="permission-pill">{permission}</div>)}
                                </div>
                              )}
                              <div className="danger-box" style={{ marginTop: 14 }}>
                                <div className="meta">Suppression compte</div>
                                <div className="soft" style={{ marginTop: 6 }}>La confirmation reste dans la carte pour éviter les clics accidentels.</div>
                                {!confirmDelete ? (
                                  <div className="inline-actions" style={{ marginTop: 12 }}>
                                    <button className="btn danger" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => setConfirmDelete(true)}>Supprimer</button>
                                  </div>
                                ) : (
                                  <div className="warning-row" style={{ marginTop: 12 }}>
                                    <span className="soft">Confirmer la suppression de {selectedUser.name} ?</span>
                                    <button className="btn danger" type="button" disabled={sending || !capabilities.canManageUsers} onClick={() => { setConfirmDelete(false); void runAction("delete-user"); }}>Oui, supprimer</button>
                                    <button className="btn soft" type="button" disabled={sending} onClick={() => setConfirmDelete(false)}>Annuler</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {notice ? <div className="notice">{notice}</div> : null}
                          {tempPassword ? <div className="notice">Mot de passe temporaire : {tempPassword}</div> : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>

            <section className={`flow-card section-card ${openSection === "support" ? "open" : ""}`}>
              <button type="button" className="section-toggle" onClick={() => toggleSection("support")}>
                <div className="section-toggle-main">
                  <div className="eyebrow">Support Flow</div>
                  <h3>Conversations utilisateurs</h3>
                  <div className="panel-sub">Messages support ouverts depuis Flow, avec réponse admin directe.</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{supportConversations.length} conversations</div>
                  <div className="section-kpi">{selectedSupportConversation?.title || "Aucune sélection"}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "support" ? (
                <div className="section-content">
                  <div className="conversation-shell">
                    <div className="stack-scroll">
                      {!supportConversations.length && <div className="empty">Aucune conversation support pour le moment.</div>}
                      {supportConversations.map((conversation) => (
                        <button key={conversation.id} type="button" className={`user-row ${selectedSupportConversation?.id === conversation.id ? "active" : ""}`} onClick={() => setSelectedSupportId(conversation.id)}>
                          <div className="user-top">
                            <div style={{ textAlign: "left" }}>
                              <strong>{conversation.title}</strong>
                              <div className="soft">{conversation.participants?.map((participant) => participant.name).join(", ")}</div>
                            </div>
                            <div className={`badge ${conversation.supportStatus === "closed" ? "blocked" : ""}`}>{conversation.supportStatus === "closed" ? "Fermée" : "Ouverte"}</div>
                          </div>
                          <div className="user-meta">
                            <span>{conversation.unreadCount || 0} non lu</span>
                            <span>{conversation.lastMessageAt ? formatDate(conversation.lastMessageAt) : "Pas de message"}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="support-thread">
                      {!selectedSupportConversation ? <div className="empty">Sélectionne une conversation support.</div> : (
                        <>
                          <div className="detail-box">
                            <div className="meta">Conversation active</div>
                            <strong>{selectedSupportConversation.title}</strong>
                            <div className="soft">{selectedSupportConversation.participants?.map((participant) => participant.name).join(", ")}</div>
                            <div className="inline-actions" style={{ marginTop: 12 }}>
                              <button className="btn soft" type="button" disabled={sending} onClick={() => runSupportAction("mark-read")}>Marquer lu</button>
                              <button className="btn soft" type="button" disabled={sending} onClick={() => runSupportAction("toggle-support-status")}>{selectedSupportConversation.supportStatus === "closed" ? "Réouvrir" : "Clore"}</button>
                            </div>
                          </div>
                          <div className="stack-scroll">
                            {(selectedSupportConversation.messages || []).map((message) => (
                              <div key={message.id} className={`support-message ${message.sender?.email === data?.admin?.email ? "admin" : ""}`}>
                                <strong>{message.sender?.name || "Système"}</strong>
                                <div className="soft" style={{ marginTop: 6 }}>{message.body || "Message système"}</div>
                                <div className="support-meta">{formatDate(message.createdAt)}</div>
                              </div>
                            ))}
                          </div>
                          <div className="message-card" style={{ padding: 16 }}>
                            <label>Réponse admin</label>
                            <textarea value={supportReply} onChange={(event) => setSupportReply(event.target.value)} placeholder="Répondre à l’utilisateur depuis le dashboard admin..." />
                            <div className="inline-actions" style={{ marginTop: 12 }}>
                              <button className="btn primary" type="button" disabled={sending || !supportReply.trim()} onClick={() => runSupportAction("send-message", { text: supportReply })}>Envoyer</button>
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
                  <div className="eyebrow">Signalements</div>
                  <h3>Messages et bugs remontés</h3>
                  <div className="panel-sub">Messages signalés et bugs interface dans une modération unique.</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{nf.format(data?.stats?.reportsOpen || 0)} ouverts</div>
                  <div className="section-kpi">{selectedReport?.reason || "Aucune sélection"}</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "reports" ? (
                <div className="section-content">
                  <div className="conversation-shell">
                    <div className="stack-scroll">
                      {!reports.length && <div className="empty">Aucun signalement dans le store pour le moment.</div>}
                      {reports.map((report) => (
                        <button key={report.id} type="button" className={`user-row ${selectedReport?.id === report.id ? "active" : ""}`} onClick={() => setSelectedReportId(report.id)}>
                          <div className="user-top">
                            <div style={{ textAlign: "left" }}>
                              <strong>{report.reason || "Signalement Flow"}</strong>
                              <div className="soft">{report.reporter?.name || "Utilisateur"} · {report.type === "bug" ? "bug" : "message"}</div>
                            </div>
                            <div className={`badge ${report.status !== "open" ? "blocked" : ""}`}>{reportStatusLabel(report.status)}</div>
                          </div>
                          <div className="user-meta">
                            <span>{report.conversationTitle || "Flow"}</span>
                            <span>{relativeTime(report.createdAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="support-thread">
                      {!selectedReport ? <div className="empty">Sélectionne un signalement pour l’analyser.</div> : (
                        <>
                          <div className="detail-box">
                            <div className="meta">Signalement actif</div>
                            <strong>{selectedReport.reason || "Signalement Flow"}</strong>
                            <div className="soft">
                              {selectedReport.reporter?.name || "Utilisateur"} · {selectedReport.reporter?.email || "—"} · {selectedReport.type === "bug" ? "Bug interface" : "Message signalé"}
                            </div>
                            <div className="soft" style={{ marginTop: 6 }}>
                              {selectedReport.conversationTitle || "Flow"} · envoyé {formatDate(selectedReport.createdAt)}
                            </div>
                            <div className="inline-actions" style={{ marginTop: 12 }}>
                              <button
                                className="btn soft"
                                type="button"
                                disabled={sending || !capabilities.canModerateReports || selectedReport.status === "resolved"}
                                onClick={() => runAction("update-report-status", { reportId: selectedReport.id, status: "resolved", resolutionNote: reportResolutionNote })}
                              >
                                Marquer résolu
                              </button>
                              <button
                                className="btn soft"
                                type="button"
                                disabled={sending || !capabilities.canModerateReports || selectedReport.status === "dismissed"}
                                onClick={() => runAction("update-report-status", { reportId: selectedReport.id, status: "dismissed", resolutionNote: reportResolutionNote })}
                              >
                                Classer sans suite
                              </button>
                            </div>
                          </div>
                          <div className="stack-scroll">
                            <div className="activity-item">
                              <strong>Reporter</strong>
                              <span>{selectedReport.reporter?.name || "Utilisateur"} · {selectedReport.reporter?.email || "—"}</span>
                              <span>@{selectedReport.reporter?.profile?.username || "sans-identifiant"}</span>
                            </div>
                            {selectedReport.sender ? (
                              <div className="activity-item">
                                <strong>Auteur du message</strong>
                                <span>{selectedReport.sender.name} · {selectedReport.sender.email}</span>
                                <span>@{selectedReport.sender.profile?.username || "sans-identifiant"}</span>
                              </div>
                            ) : null}
                            <div className="activity-item">
                              <strong>Détail</strong>
                              <span>{selectedReport.details || "Aucun détail supplémentaire."}</span>
                              {selectedReport.messagePreview ? <span>Aperçu: {selectedReport.messagePreview}</span> : null}
                            </div>
                            {selectedReport.resolvedAt ? (
                              <div className="activity-item">
                                <strong>Clôture</strong>
                                <span>{reportStatusLabel(selectedReport.status)} le {formatDate(selectedReport.resolvedAt)}</span>
                                <span>{selectedReport.resolver?.name || "Admin"}{selectedReport.resolutionNote ? ` · ${selectedReport.resolutionNote}` : ""}</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="message-card" style={{ padding: 16 }}>
                            <label>Note de résolution</label>
                            <textarea
                              value={reportResolutionNote}
                              onChange={(event) => setReportResolutionNote(event.target.value)}
                              placeholder="Précise la décision prise ou le suivi envoyé à l'utilisateur."
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
                  <div className="eyebrow">Administration</div>
                  <h3>Admin actif et création de comptes</h3>
                  <div className="panel-sub">Rôle courant, permissions et création d’admin dans une zone dédiée.</div>
                </div>
                <div className="section-summary">
                  <div className="section-kpi">{data?.admin?.admin?.role || "—"}</div>
                  <div className="section-kpi">{(data?.permissions || []).length} permissions</div>
                  <div className="section-chevron">⌄</div>
                </div>
              </button>
              {openSection === "admins" ? (
                <div className="section-content">
                  <div className="activity-grid">
                    <div className="flow-card panel">
                      <div className="panel-head">
                        <div>
                          <div className="eyebrow">Admin actif</div>
                          <h3 className="panel-title">{data?.admin?.name || "—"}</h3>
                          <div className="panel-sub">{data?.admin?.email || "—"}</div>
                        </div>
                      </div>
                      <div className="detail-grid">
                        <div className="detail-box">
                          <div className="meta">Rôle</div>
                          <strong>{data?.admin?.admin?.role || "—"}</strong>
                        </div>
                        <div className="detail-box">
                          <div className="meta">Permissions</div>
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
                          <div className="eyebrow">Créer un admin</div>
                          <h3 className="panel-title">Nouveau compte admin</h3>
                          <div className="panel-sub">Compte, rôle et permissions dans une seule carte.</div>
                        </div>
                      </div>
                      <div className="stack-scroll">
                        <div className="composer-box">
                          <div>
                            <label>Nom</label>
                            <input value={adminForm.name} onChange={(event) => setAdminForm((prev) => ({ ...prev, name: event.target.value }))} />
                          </div>
                          <div>
                            <label>Email</label>
                            <input value={adminForm.email} onChange={(event) => setAdminForm((prev) => ({ ...prev, email: event.target.value }))} />
                          </div>
                          <div>
                            <label>Mot de passe</label>
                            <input value={adminForm.password} onChange={(event) => setAdminForm((prev) => ({ ...prev, password: event.target.value }))} />
                          </div>
                          <div>
                            <label>Rôle</label>
                            <ChoiceRow
                              options={ROLE_OPTIONS}
                              value={adminForm.role}
                              onChange={(value) => setAdminForm((prev) => ({
                                ...prev,
                                role: value,
                                permissions: value === "super_admin" ? PERMISSIONS.map((item) => item.key) : prev.permissions,
                              }))}
                            />
                          </div>
                          <div>
                            <label>Permissions</label>
                            <div className="permission-grid">
                              {PERMISSIONS.map((permission) => (
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
                          onClick={async () => {
                            setSending(true);
                            setNotice("");
                            try {
                              await runAction("create-admin", adminForm);
                              setAdminForm({ name: "", email: "", password: "", role: "admin", permissions: ["dashboard.read", "users.read", "messages.send"] });
                              setNotice("Administrateur créé.");
                            } finally {
                              setSending(false);
                            }
                          }}
                        >
                          Créer l'admin
                        </button>
                        <button className="btn soft" type="button" disabled={sending} onClick={() => setAdminForm({ name: "", email: "", password: "", role: "admin", permissions: ["dashboard.read", "users.read", "messages.send"] })}>Réinitialiser</button>
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
