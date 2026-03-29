"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RELEASE } from "../lib/release";

/* ═══════════════════════════════════════════════════════════
   FLOW — Complete Workspace App
   Auth distante · Sync multi-appareils · 12 modules
   ═══════════════════════════════════════════════════════════ */

// ── Utility helpers ──
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().split("T")[0];
const esc = (s) => (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmtDate = (d) => { if (!d) return "—"; const dt = new Date(d); return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }); };
const fmtRel = (iso) => { if (!iso) return ""; const diff = (Date.now() - new Date(iso).getTime()) / 1000; if (diff < 60) return "à l'instant"; if (diff < 3600) return `il y a ${Math.floor(diff / 60)}m`; if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`; return fmtDate(iso); };
const fmtRelease = (iso) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(",", " ·");

const SAVE_DEBOUNCE_MS = 1200;

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
  notes: [], tasks: [], projects: [], events: [], habits: [],
  journal: [], transactions: [], bookmarks: [], goals: [],
  activity: [], settings: { theme: "dark", accent: "#c8a96e", weekStart: 1, focusDur: 25, shortBreak: 5, longBreak: 15 },
  profile: { name: "", email: "" }
});

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
};

// ── CSS (all styles as a string) ──
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

:root {
  --bg:#0e0e0e;--bg2:#161616;--bg3:#1c1c1c;--bg4:#232323;--line:#262626;--line2:#333;
  --muted:#4a4a4a;--sub:#6e6e6e;--sub2:#999;--text:#edebe6;--text2:#ccc;
  --accent:#c8a96e;--accent2:#e0c080;--accent-d:rgba(200,169,110,.12);--accent-b:rgba(200,169,110,.25);
  --red:#d85c5c;--red-d:rgba(216,92,92,.12);--green:#4a9e6e;--green-d:rgba(74,158,110,.12);
  --blue:#4a7ec8;--blue-d:rgba(74,126,200,.12);--orange:#c87a4a;--violet:#8a6ec8;
  --r:12px;--r-sm:8px;--serif:'Instrument Serif',Georgia,serif;--sans:'Geist',system-ui,sans-serif;--mono:'Geist Mono',monospace;
  --shadow:0 4px 24px rgba(0,0,0,.5);
}
[data-t="light"]{--bg:#f5f4f0;--bg2:#fff;--bg3:#f0efe9;--bg4:#e8e6df;--line:#e4e2db;--line2:#d4d1c8;--muted:#aaa89e;--sub:#7a7870;--sub2:#555;--text:#1a1916;--text2:#333;--shadow:0 2px 16px rgba(0,0,0,.08)}

*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body,#root{height:100%;overflow:hidden}
body{font-family:var(--sans);background:var(--bg);color:var(--text);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
body::before,body::after{content:'';position:fixed;inset:auto;pointer-events:none;z-index:0;border-radius:999px;filter:blur(60px);opacity:.16;animation:drift 18s ease-in-out infinite}
body::before{width:280px;height:280px;top:-90px;left:-40px;background:radial-gradient(circle,var(--accent) 0%,transparent 72%)}
body::after{width:240px;height:240px;right:-60px;bottom:-70px;background:radial-gradient(circle,var(--blue) 0%,transparent 70%);animation-delay:-7s}
input,textarea,select,button{font-family:inherit;font-size:inherit;color:inherit;border:none;background:none;outline:none}
button{cursor:pointer}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--line2);border-radius:99px}

.auth-wrap{height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:20px;position:relative;isolation:isolate}
.auth-card{width:100%;max-width:400px;background:linear-gradient(180deg,rgba(255,255,255,.02),transparent 22%),var(--bg2);border:1px solid var(--line2);border-radius:20px;padding:36px 32px;box-shadow:var(--shadow);position:relative;overflow:hidden;animation:panelIn .45s cubic-bezier(.2,.8,.2,1)}
.auth-card::after{content:'';position:absolute;left:28%;right:-22%;bottom:-40%;height:180px;background:radial-gradient(circle,rgba(200,169,110,.18) 0%,transparent 70%);pointer-events:none}
.auth-logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}
.auth-mark{width:36px;height:36px;border-radius:10px;background:var(--accent);display:flex;align-items:center;justify-content:center}
.auth-mark svg{width:18px;height:18px;stroke:#0e0e0e;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.auth-name{font-family:var(--serif);font-size:24px}
.auth-release,.sb-release{display:inline-flex;align-items:center;padding:4px 8px;border:1px solid var(--accent-b);border-radius:999px;background:linear-gradient(180deg,rgba(200,169,110,.18),rgba(200,169,110,.05));color:var(--accent);font-size:10px;font-weight:600;letter-spacing:.2px;white-space:nowrap;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
.auth-tabs{display:flex;border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden;margin-bottom:24px}
.auth-tab{flex:1;padding:9px;text-align:center;font-size:13px;font-weight:500;cursor:pointer;color:var(--sub);background:transparent;transition:all .15s}
.auth-tab.on{background:var(--accent);color:#0e0e0e}
.field{margin-bottom:14px}
.field label{display:block;font-size:11.5px;font-weight:500;color:var(--sub);margin-bottom:5px}
.finput{width:100%;padding:10px 13px;background:var(--bg3);border:1px solid var(--line);border-radius:var(--r-sm);color:var(--text);transition:border-color .15s}
.finput:focus{border-color:var(--accent)}
.finput::placeholder{color:var(--muted)}
.auth-btn{width:100%;padding:11px;background:var(--accent);color:#0e0e0e;font-weight:600;border-radius:var(--r-sm);cursor:pointer;transition:all .18s;margin-top:6px;transform:translateY(0);box-shadow:0 10px 24px rgba(200,169,110,.16)}
.auth-btn:hover{background:var(--accent2);transform:translateY(-1px);box-shadow:0 14px 28px rgba(200,169,110,.22)}
.auth-btn:disabled{opacity:.78;cursor:wait;transform:none;box-shadow:none}
.auth-err{font-size:12px;color:var(--red);padding:8px 0;min-height:28px}

.app{display:flex;height:100vh;overflow:hidden;position:relative;isolation:isolate}
.sb{width:240px;flex-shrink:0;background:linear-gradient(180deg,rgba(255,255,255,.02),transparent 18%),var(--bg2);border-right:1px solid var(--line);display:flex;flex-direction:column;z-index:200;transition:transform .25s cubic-bezier(.4,0,.2,1),background .3s;position:relative;overflow:hidden}
.sb::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(200,169,110,.08),transparent 18%);pointer-events:none}
.sb-top{padding:14px;border-bottom:1px solid var(--line)}
.sb-logo{display:flex;align-items:center;gap:9px}
.sb-mark{width:28px;height:28px;border-radius:8px;background:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sb-mark svg{width:14px;height:14px;stroke:#0e0e0e;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.sb-name{font-family:var(--serif);font-size:18px}
.sb-saved{width:8px;height:8px;border-radius:50%;background:var(--green);margin-left:auto;flex-shrink:0;box-shadow:0 0 0 0 rgba(74,158,110,.42)}
.sb-saved.saved{animation:pulseDot 2.8s infinite}
.sb-saved.saving{background:var(--blue);box-shadow:0 0 0 0 rgba(74,126,200,.4);animation:pingDot 1.15s infinite}
.sb-saved.dirty{background:var(--orange);box-shadow:none;animation:none}
.sb-nav{flex:1;overflow-y:auto;padding:6px 8px;scrollbar-width:none}
.sb-nav::-webkit-scrollbar{display:none}
.sb-sec{font-size:10px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:var(--muted);padding:12px 10px 4px}
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--r-sm);color:var(--sub);font-size:13px;cursor:pointer;transition:background .14s,color .14s,transform .14s,border-color .14s;position:relative;user-select:none;margin-bottom:1px;border:1px solid transparent}
.ni:hover{background:var(--bg3);color:var(--text);transform:translateX(2px);border-color:rgba(255,255,255,.03)}
.ni.on{background:var(--accent-d);color:var(--accent)}
.ni.on::before{content:'';position:absolute;left:0;top:22%;height:56%;width:2px;background:var(--accent);border-radius:0 2px 2px 0}
.ni svg{flex-shrink:0;opacity:.7}.ni.on svg{opacity:1}
.ni-badge{margin-left:auto;font-size:10px;font-family:var(--mono);background:var(--bg4);color:var(--sub);padding:1px 6px;border-radius:99px}
.sb-user{padding:12px 14px;border-top:1px solid var(--line);display:flex;align-items:center;gap:9px}
.sb-av{width:30px;height:30px;border-radius:50%;background:var(--accent-d);border:1px solid var(--accent-b);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;font-family:var(--serif);color:var(--accent);flex-shrink:0}
.sb-uname{font-size:13px;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sb-logout{color:var(--sub);cursor:pointer;padding:4px;border-radius:4px;transition:color .15s}.sb-logout:hover{color:var(--red)}

.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
.topbar{height:52px;min-height:52px;display:flex;align-items:center;padding:0 16px;border-bottom:1px solid var(--line);gap:12px;background:rgba(0,0,0,.04);backdrop-filter:blur(8px)}
.tb-menu{display:none;color:var(--sub);padding:4px}
.tb-title{font-size:14px;font-weight:600}
.tb-search{flex:1;max-width:360px;margin:0 auto;position:relative}
.tb-search input{width:100%;padding:7px 12px 7px 32px;background:var(--bg3);border:1px solid var(--line);border-radius:20px;font-size:12px;color:var(--text);transition:border-color .15s}
.tb-search input:focus{border-color:var(--accent)}
.tb-search svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted)}
.tb-right{display:flex;gap:6px;align-items:center}
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--r-sm);font-size:12px;font-weight:500;cursor:pointer;transition:all .16s;white-space:nowrap;position:relative;overflow:hidden;transform:translateY(0)}
.btn::after{content:'';position:absolute;top:0;bottom:0;left:-35%;width:28%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-18deg);opacity:0;transition:transform .4s,opacity .25s}
.btn:hover::after{transform:translateX(320%) skewX(-18deg);opacity:1}
.btn-p{background:var(--accent);color:#0e0e0e;box-shadow:0 10px 22px rgba(200,169,110,.14)}.btn-p:hover{background:var(--accent2);transform:translateY(-1px)}
.btn-g{color:var(--sub);border:1px solid var(--line)}.btn-g:hover{background:var(--bg3);color:var(--text);transform:translateY(-1px)}
.btn-d{color:var(--red);border:1px solid rgba(216,92,92,.3)}.btn-d:hover{background:var(--red-d);transform:translateY(-1px)}
.btn-sm{padding:5px 10px;font-size:11px}

.content{flex:1;overflow-y:auto;padding:18px;animation:fadeIn .25s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes panelIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
@keyframes drift{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(14px,18px,0)}}
@keyframes pulseDot{0%{box-shadow:0 0 0 0 rgba(74,158,110,.45)}70%{box-shadow:0 0 0 8px rgba(74,158,110,0)}100%{box-shadow:0 0 0 0 rgba(74,158,110,0)}}
@keyframes pingDot{0%{box-shadow:0 0 0 0 rgba(74,126,200,.45)}70%{box-shadow:0 0 0 8px rgba(74,126,200,0)}100%{box-shadow:0 0 0 0 rgba(74,126,200,0)}}

.card{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:16px;transition:background .3s,transform .18s,border-color .18s,box-shadow .18s}
.card:hover{transform:translateY(-2px);border-color:var(--line2);box-shadow:var(--shadow)}
.card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.card-title{font-family:var(--serif);font-size:15px}

.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:18px}
.stat{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:14px;transition:background .3s,transform .18s,border-color .18s,box-shadow .18s}
.stat:hover{transform:translateY(-2px);border-color:var(--line2);box-shadow:var(--shadow)}
.stat-label{font-size:10.5px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px}
.stat-val{font-family:var(--serif);font-size:24px;letter-spacing:-1px}
.stat-sub{font-size:11px;color:var(--sub);margin-top:2px}

.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

.notes-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.note-card{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:14px;cursor:pointer;transition:border-color .14s,background .3s,transform .14s,box-shadow .14s;position:relative;overflow:hidden}
.note-card:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.note-accent{position:absolute;top:0;left:0;right:0;height:3px;border-radius:var(--r) var(--r) 0 0}
.note-title{font-size:14px;font-weight:500;margin-bottom:4px;margin-top:6px}
.note-preview{font-size:12px;color:var(--sub);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.note-foot{display:flex;align-items:center;justify-content:space-between;margin-top:10px}
.tag{font-size:10px;padding:2px 8px;border-radius:4px;background:var(--bg4);color:var(--sub)}

.ne-wrap{display:flex;flex-direction:column;height:100%}
.ne-bar{display:flex;align-items:center;gap:8px;padding:10px 0;flex-wrap:wrap;border-bottom:1px solid var(--line);margin-bottom:12px}
.ne-title{font-size:20px;font-weight:600;background:none;border:none;color:var(--text);width:100%;font-family:var(--serif)}
.ne-title::placeholder{color:var(--muted)}
.ne-body{flex:1;display:flex;min-height:0}
.ne-body textarea{flex:1;background:none;border:none;color:var(--text);resize:none;font-size:14px;line-height:1.7;font-family:var(--sans)}
.ne-body textarea::placeholder{color:var(--muted)}
.ne-foot{display:flex;align-items:center;gap:12px;padding:8px 0;font-size:11px;color:var(--muted);border-top:1px solid var(--line);margin-top:8px}

.k-board{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;min-height:0;flex:1;align-items:flex-start}
.k-col{flex-shrink:0;width:260px;background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);display:flex;flex-direction:column;max-height:calc(100vh - 180px);transition:background .3s}
.k-col-hd{display:flex;align-items:center;gap:7px;padding:10px 12px;border-bottom:1px solid var(--line);flex-shrink:0}
.k-col-pip{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.k-col-nm{font-size:11px;font-weight:600;flex:1;text-transform:uppercase;letter-spacing:.5px;color:var(--sub)}
.k-col-ct{font-size:10px;font-family:var(--mono);background:var(--bg4);color:var(--muted);padding:1px 6px;border-radius:99px}
.k-cards{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:7px;scrollbar-width:none}
.k-cards::-webkit-scrollbar{display:none}
.k-card{background:var(--bg);border:1px solid var(--line);border-radius:var(--r-sm);padding:10px;cursor:pointer;transition:border-color .12s,box-shadow .12s,background .3s,transform .12s}
.k-card:hover{border-color:var(--line2);box-shadow:var(--shadow);transform:translateY(-2px)}
.k-card-title{font-size:13px;font-weight:500;margin-bottom:4px}
.k-card-desc{font-size:11px;color:var(--sub);margin-bottom:6px}
.k-card-ft{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.prio{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.k-due{font-size:10px;color:var(--muted);font-family:var(--mono)}
.k-due.over{color:var(--red)}
.k-add{margin:0 8px 8px;border:1px dashed var(--line);border-radius:var(--r-sm);padding:8px;text-align:center;font-size:12px;color:var(--muted);cursor:pointer;transition:all .12s}
.k-add:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-d)}

.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.cal-wd{font-size:10px;font-weight:600;color:var(--muted);text-align:center;padding:8px 0;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--line)}
.cal-cell{min-height:72px;padding:6px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);cursor:pointer;transition:background .1s;position:relative}
.cal-cell:nth-child(7n){border-right:none}
.cal-cell:hover{background:var(--bg3)}
.cal-cell.oth{opacity:.3}
.cal-cell.today{background:rgba(200,169,110,.06)}
.cal-dn{font-size:12px;font-weight:500;margin-bottom:3px}
.cal-cell.today .cal-dn{background:var(--accent);color:#0e0e0e;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600}
.cal-ev{font-size:9px;padding:1px 4px;border-radius:3px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#0e0e0e;font-weight:500}

.habit-row{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:13px 15px;display:flex;align-items:center;gap:13px;transition:border-color .12s,background .3s,transform .12s,box-shadow .12s;margin-bottom:8px}
.habit-row:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.habit-icon{font-size:20px;width:32px;text-align:center}
.habit-info{flex:1;min-width:0}
.habit-nm{font-size:14px;font-weight:500}
.habit-meta{font-size:11px;color:var(--muted)}
.habit-days{display:flex;gap:4px}
.hday{width:28px;height:28px;border-radius:6px;border:1px solid var(--line2);background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--muted);cursor:pointer;transition:all .15s;font-weight:600}
.hday:hover{border-color:var(--muted)}
.hday.done{background:var(--green);border-color:var(--green);color:#0e0e0e}
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
.focus-btn-main{width:52px;height:52px;border-radius:50%;background:var(--accent);color:#0e0e0e;display:flex;align-items:center;justify-content:center;transition:all .15s}
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
.bm-item{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border-color .12s,transform .12s,box-shadow .12s}
.bm-item:hover{border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow)}
.bm-fav{width:36px;height:36px;border-radius:var(--r-sm);background:var(--bg4);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.bm-info{flex:1;min-width:0}.bm-info h4{font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bm-info p{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.goal-card{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);padding:16px;transition:border-color .12s,transform .12s,box-shadow .12s}
.goal-card:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--shadow)}
.goal-title{font-size:14px;font-weight:500;margin-bottom:10px}
.goal-bar{height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:6px}
.goal-fill{height:100%;background:var(--accent);border-radius:3px;transition:width .5s}
.goal-meta{display:flex;justify-content:space-between;font-size:11px;color:var(--sub)}

.s-group{background:var(--bg2);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;margin-bottom:12px}
.s-row{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid var(--line);gap:12px}
.s-row:last-child{border-bottom:none}
.s-lbl{font-size:13px;font-weight:500}
.s-sub{font-size:11px;color:var(--sub);margin-top:1px}
.s-select{background:var(--bg3);border:1px solid var(--line);border-radius:var(--r-sm);padding:6px 10px;font-size:12px;color:var(--text);min-width:130px;cursor:pointer}
.s-select option{background:var(--bg2)}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;animation:fadeIn .15s}
.modal{background:linear-gradient(180deg,rgba(255,255,255,.02),transparent 22%),var(--bg2);border:1px solid var(--line2);border-radius:16px;padding:24px;width:420px;max-width:92vw;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow);animation:panelIn .28s ease}
.modal h3{font-family:var(--serif);font-size:18px;margin-bottom:16px}
.modal-ft{display:flex;gap:8px;justify-content:flex-end;margin-top:20px}

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
  .sb{position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%);z-index:300}
  .sb.open{transform:translateX(0)}
  .sb-veil{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:299;display:none}
  .sb-veil.show{display:block}
  .tb-menu{display:flex}
  .tb-search{display:none}
  .grid2{grid-template-columns:1fr}
  .notes-grid{grid-template-columns:1fr}
  .k-board{flex-direction:column;align-items:stretch}
  .k-col{width:100%}
  .stat-grid{grid-template-columns:repeat(2,1fr)}
}
`;

// ═══════════════════════════════════════════════════════════
// MAIN APP COMPONENT
// ═══════════════════════════════════════════════════════════
export default function FlowApp() {
  const releaseLabel = useMemo(() => `v${RELEASE.version} · ${fmtRelease(RELEASE.deployedAt)}`, []);

  // ── Auth state ──
  const [user, setUser] = useState(null);
  const [authTab, setAuthTab] = useState("login");
  const [authErr, setAuthErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [saveState, setSaveState] = useState("saved");

  // ── App state ──
  const [db, setDb] = useState(() => emptyDB());
  const [view, setView] = useState("dashboard");
  const [sbOpen, setSbOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [theme, setTheme] = useState(() => db.settings?.theme || "dark");

  // ── Module states ──
  const [editNote, setEditNote] = useState(null);
  const [noteView, setNoteView] = useState("list");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [focusState, setFocusState] = useState({ running: false, mode: "focus", sec: 25 * 60, total: 25 * 60 });
  const focusRef = useRef(null);
  const [editJournal, setEditJournal] = useState(null);
  const saveTimerRef = useRef(null);
  const dbRef = useRef(db);

  // ── Toast ──
  const toast = useCallback((msg, type = "ok") => {
    const id = uid();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  const flushSave = useCallback(async (payload) => {
    if (!user) return;
    setSaveState("saving");
    try {
      await api("/api/db", { method: "PUT", body: JSON.stringify({ db: payload }) });
      setSaveState("saved");
    } catch (error) {
      setSaveState("dirty");
      toast(error.message || "Sauvegarde distante impossible", "err");
    }
  }, [toast, user]);

  const save = useCallback((newDb, immediate = false) => {
    if (!user) return;
    dbRef.current = newDb;

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

  const updateDb = useCallback((fn) => {
    setDb(prev => {
      const next = { ...prev };
      fn(next);
      save(next);
      return next;
    });
  }, [save]);

  useEffect(() => { document.documentElement.setAttribute("data-t", theme); }, [theme]);

  useEffect(() => { dbRef.current = db; }, [db]);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const payload = await api("/api/session", { method: "GET" });
        if (cancelled) return;

        if (payload.user) {
          const loadedDb = payload.db || emptyDB();
          setUser(payload.user);
          setDb(loadedDb);
          setTheme(loadedDb.settings?.theme || "dark");
        } else {
          setUser(null);
          setDb(emptyDB());
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setDb(emptyDB());
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

  // ── Auth functions ──
  const doAuth = async (isRegister) => {
    const email = document.getElementById("a-email")?.value?.trim();
    const pwd = document.getElementById("a-pwd")?.value;
    const name = document.getElementById("a-name")?.value?.trim();
    const pwd2 = document.getElementById("a-pwd2")?.value;
    setAuthErr("");
    if (!email || !pwd) return setAuthErr("Email et mot de passe requis");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setAuthErr("Email invalide");
    if (pwd.length < 6) return setAuthErr("Mot de passe : 6 caractères minimum");

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

      const loadedDb = payload.db || emptyDB();
      setUser(payload.user);
      setDb(loadedDb);
      setTheme(loadedDb.settings?.theme || "dark");
      setView("dashboard");
      setSaveState("saved");
      toast(isRegister ? "Compte créé !" : "Connecté !");
    } catch (error) {
      setAuthErr(error.message || "Connexion impossible");
    } finally {
      setAuthBusy(false);
    }
  };

  const doLogout = async () => {
    try {
      if (saveState === "dirty") {
        await flushSave(dbRef.current);
      }
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    setUser(null);
    setDb(emptyDB());
    setView("dashboard");
    setSaveState("saved");
    toast("Déconnecté", "info");
  };

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

  useEffect(() => { return () => clearInterval(focusRef.current); }, []);

  // ── Navigation items ──
  const NAV = [
    { key: "dashboard", label: "Tableau de bord", icon: I.home },
    { key: "notes", label: "Notes", icon: I.edit, badge: db.notes.length || null },
    { key: "projects", label: "Projets", icon: I.kanban, badge: db.tasks.length || null },
    { key: "calendar", label: "Calendrier", icon: I.cal, badge: db.events.filter(e => e.date >= todayStr()).length || null },
    { key: "habits", label: "Habitudes", icon: I.check, badge: db.habits.length || null },
    { key: "focus", label: "Focus", icon: I.clock, badge: focusState.running ? "●" : null },
    { key: "journal", label: "Journal", icon: I.book },
    { key: "finances", label: "Finances", icon: I.dollar },
    { key: "bookmarks", label: "Signets", icon: I.bookmark },
    { key: "goals", label: "Objectifs", icon: I.target },
    { key: "settings", label: "Paramètres", icon: I.gear },
  ];

  const TITLES = {};
  NAV.forEach(n => TITLES[n.key] = n.label);

  if (loadingSession) {
    return (
      <>
        <style>{CSS}</style>
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-mark"><svg viewBox="0 0 20 20"><polyline points="2,14 6,7 10,10 18,3"/></svg></div>
              <div className="auth-release">{releaseLabel}</div>
              <div className="auth-name">Flow</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--sub)", textAlign: "center" }}>Chargement de votre espace…</div>
          </div>
        </div>
      </>
    );
  }

  // ═══════ AUTH SCREEN ═══════
  if (!user) {
    return (
      <>
        <style>{CSS}</style>
        <div className="auth-wrap">
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-mark"><svg viewBox="0 0 20 20"><polyline points="2,14 6,7 10,10 18,3"/></svg></div>
              <div className="auth-release">{releaseLabel}</div>
              <div className="auth-name">Flow</div>
            </div>
            <div className="auth-tabs">
              <button className={`auth-tab ${authTab === "login" ? "on" : ""}`} onClick={() => { setAuthTab("login"); setAuthErr(""); }}>Connexion</button>
              <button className={`auth-tab ${authTab === "register" ? "on" : ""}`} onClick={() => { setAuthTab("register"); setAuthErr(""); }}>Inscription</button>
            </div>
            {authTab === "register" && (
              <div className="field"><label>Nom complet</label><input className="finput" id="a-name" placeholder="Votre nom" autoComplete="name" /></div>
            )}
            <div className="field"><label>Email</label><input className="finput" id="a-email" type="email" placeholder="email@exemple.com" autoComplete="email" /></div>
            <div className="field"><label>Mot de passe</label><input className="finput" id="a-pwd" type="password" placeholder="6 caractères min." autoComplete={authTab === "login" ? "current-password" : "new-password"} /></div>
            {authTab === "register" && (
              <div className="field"><label>Confirmer le mot de passe</label><input className="finput" id="a-pwd2" type="password" placeholder="Confirmez" autoComplete="new-password" /></div>
            )}
            <div className="auth-err">{authErr}</div>
            <button className="auth-btn" onClick={() => doAuth(authTab === "register")} disabled={authBusy}>{authBusy ? "Patientez…" : authTab === "login" ? "Se connecter" : "Créer un compte"}</button>
          </div>
        </div>
      </>
    );
  }

  // ═══════ MODAL RENDERER ═══════
  const renderModal = () => {
    if (!modal) return null;
    const close = () => setModal(null);
    const Field = ({ label, id, type = "text", placeholder, as, ...props }) => (
      <div className="field">
        <label>{label}</label>
        {as === "textarea" ? <textarea className="finput" id={id} placeholder={placeholder} style={{ minHeight: 70, resize: "vertical" }} {...props} />
          : as === "select" ? <select className="finput" id={id} {...props}>{props.children}</select>
          : <input className="finput" id={id} type={type} placeholder={placeholder} {...props} />}
      </div>
    );

    if (modal === "note") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvelle note</h3>
          <Field label="Titre" id="m-n-title" placeholder="Titre…" />
          <Field label="Catégorie" id="m-n-cat" as="select"><option value="perso">Perso</option><option value="travail">Travail</option><option value="idee">Idée</option></Field>
          <Field label="Contenu" id="m-n-body" as="textarea" placeholder="Commencez à écrire…" />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-n-title")?.value?.trim();
            if (!t) return toast("Titre requis", "err");
            updateDb(d => d.notes.push({ id: uid(), title: t, content: document.getElementById("m-n-body")?.value || "", cat: document.getElementById("m-n-cat")?.value || "perso", color: "#c8a96e", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
            close(); toast("Note créée");
          }}>Créer</button></div>
        </div>
      </div>
    );

    if (modal === "task") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvelle tâche</h3>
          <Field label="Titre" id="m-t-title" placeholder="Titre de la tâche" />
          <Field label="Description" id="m-t-desc" as="textarea" placeholder="Détails…" />
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Priorité" id="m-t-prio" as="select"><option value="none">Aucune</option><option value="low">Basse</option><option value="med">Moyenne</option><option value="high">Haute</option></Field>
            <Field label="Date limite" id="m-t-due" type="date" />
          </div>
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-t-title")?.value?.trim();
            if (!t) return toast("Titre requis", "err");
            updateDb(d => d.tasks.push({ id: uid(), title: t, desc: document.getElementById("m-t-desc")?.value || "", prio: document.getElementById("m-t-prio")?.value || "none", due: document.getElementById("m-t-due")?.value || "", colIdx: 0, projectId: db.projects[0]?.id || "", createdAt: new Date().toISOString() }));
            close(); toast("Tâche créée");
          }}>Créer</button></div>
        </div>
      </div>
    );

    if (modal === "event") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvel événement</h3>
          <Field label="Titre" id="m-e-title" placeholder="Réunion, appel…" />
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Date" id="m-e-date" type="date" />
            <Field label="Heure" id="m-e-time" type="time" />
          </div>
          <Field label="Description" id="m-e-desc" as="textarea" placeholder="Détails…" />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-e-title")?.value?.trim();
            const d = document.getElementById("m-e-date")?.value;
            if (!t || !d) return toast("Titre et date requis", "err");
            updateDb(db2 => db2.events.push({ id: uid(), title: t, date: d, time: document.getElementById("m-e-time")?.value || "", desc: document.getElementById("m-e-desc")?.value || "", color: "#c8a96e", createdAt: new Date().toISOString() }));
            close(); toast("Événement créé");
          }}>Créer</button></div>
        </div>
      </div>
    );

    if (modal === "habit") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvelle habitude</h3>
          <Field label="Nom" id="m-h-name" placeholder="Méditation, sport…" />
          <Field label="Icône (emoji)" id="m-h-icon" placeholder="⭐" />
          <Field label="Description" id="m-h-desc" placeholder="Optionnel" />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const n = document.getElementById("m-h-name")?.value?.trim();
            if (!n) return toast("Nom requis", "err");
            updateDb(d => d.habits.push({ id: uid(), name: n, icon: document.getElementById("m-h-icon")?.value || "⭐", desc: document.getElementById("m-h-desc")?.value || "", done: {}, createdAt: new Date().toISOString() }));
            close(); toast("Habitude ajoutée");
          }}>Ajouter</button></div>
        </div>
      </div>
    );

    if (modal === "transaction") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvelle transaction</h3>
          <Field label="Description" id="m-tx-desc" placeholder="Description" />
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Montant (€)" id="m-tx-amt" type="number" placeholder="0.00" />
            <Field label="Type" id="m-tx-type" as="select"><option value="expense">Dépense</option><option value="income">Revenu</option></Field>
          </div>
          <Field label="Catégorie" id="m-tx-cat" placeholder="Alimentation, Transport…" />
          <Field label="Date" id="m-tx-date" type="date" defaultValue={todayStr()} />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const d = document.getElementById("m-tx-desc")?.value?.trim();
            const a = parseFloat(document.getElementById("m-tx-amt")?.value);
            if (!d || isNaN(a)) return toast("Description et montant requis", "err");
            updateDb(db2 => db2.transactions.push({ id: uid(), description: d, amount: a, type: document.getElementById("m-tx-type")?.value || "expense", category: document.getElementById("m-tx-cat")?.value || "", date: document.getElementById("m-tx-date")?.value || todayStr() }));
            close(); toast("Transaction ajoutée");
          }}>Ajouter</button></div>
        </div>
      </div>
    );

    if (modal === "bookmark") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouveau signet</h3>
          <Field label="Titre" id="m-bm-title" placeholder="Titre du lien" />
          <Field label="URL" id="m-bm-url" placeholder="https://…" />
          <Field label="Icône (emoji)" id="m-bm-icon" placeholder="🔗" />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-bm-title")?.value?.trim();
            if (!t) return toast("Titre requis", "err");
            updateDb(d => d.bookmarks.push({ id: uid(), title: t, url: document.getElementById("m-bm-url")?.value || "", icon: document.getElementById("m-bm-icon")?.value || "🔗" }));
            close(); toast("Signet ajouté");
          }}>Ajouter</button></div>
        </div>
      </div>
    );

    if (modal === "goal") return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
        <div className="modal"><h3>Nouvel objectif</h3>
          <Field label="Titre" id="m-gl-title" placeholder="Lancer le site, apprendre…" />
          <Field label="Deadline" id="m-gl-dead" type="date" />
          <div className="modal-ft"><button className="btn btn-g" onClick={close}>Annuler</button><button className="btn btn-p" onClick={() => {
            const t = document.getElementById("m-gl-title")?.value?.trim();
            if (!t) return toast("Titre requis", "err");
            updateDb(d => d.goals.push({ id: uid(), title: t, deadline: document.getElementById("m-gl-dead")?.value || "", progress: 0 }));
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
    const done = db.tasks.filter(t => t.colIdx === 3).length;
    const todayDone = db.habits.filter(h => h.done?.[todayStr()]).length;
    const upcoming = db.events.filter(e => e.date >= todayStr()).length;
    const d = new Date();
    const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const MONS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

    return (<>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: 24 }}>{greeting}, <em>{db.profile?.name || user.name}</em></h1>
        <p style={{ fontSize: 13, color: "var(--sub)" }}>{DAYS[d.getDay()]} {d.getDate()} {MONS[d.getMonth()]} {d.getFullYear()}</p>
      </div>
      <div className="stat-grid">
        <div className="stat"><div className="stat-label">Notes</div><div className="stat-val">{db.notes.length}</div><div className="stat-sub">au total</div></div>
        <div className="stat"><div className="stat-label">Tâches</div><div className="stat-val">{db.tasks.length}</div><div className="stat-sub">{done} terminée{done > 1 ? "s" : ""}</div></div>
        <div className="stat"><div className="stat-label">Habitudes</div><div className="stat-val">{todayDone}/{db.habits.length}</div><div className="stat-sub">aujourd'hui</div></div>
        <div className="stat"><div className="stat-label">Événements</div><div className="stat-val">{upcoming}</div><div className="stat-sub">à venir</div></div>
      </div>
      <div className="grid2">
        <div className="card"><div className="card-hd"><span className="card-title">Tâches récentes</span><button className="btn btn-g btn-sm" onClick={() => setView("projects")}>Voir tout</button></div>
          {db.tasks.slice(-5).reverse().map(t => (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="prio" style={{ background: { none: "var(--muted)", low: "var(--green)", med: "var(--orange)", high: "var(--red)" }[t.prio] || "var(--muted)" }} />
            <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
            <span className="tag">{["À faire", "En cours", "Révision", "Terminé"][t.colIdx]}</span>
          </div>))}
          {!db.tasks.length && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 16 }}>Aucune tâche</p>}
        </div>
        <div className="card"><div className="card-hd"><span className="card-title">Prochains événements</span><button className="btn btn-g btn-sm" onClick={() => setView("calendar")}>Voir tout</button></div>
          {db.events.filter(e => e.date >= todayStr()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5).map(e => (<div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid var(--line)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13 }}>{e.title}</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(e.date)}{e.time ? ` ${e.time}` : ""}</span>
          </div>))}
          {!db.events.filter(e => e.date >= todayStr()).length && <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", padding: 16 }}>Aucun événement</p>}
        </div>
      </div>
    </>);
  };

  // ── Notes ──
  const ViewNotes = () => {
    if (editNote !== null) {
      const note = db.notes.find(n => n.id === editNote);
      return (<div className="ne-wrap">
        <div className="ne-bar">
          <button className="btn btn-g btn-sm" onClick={() => setEditNote(null)}>← Retour</button>
          <button className="btn btn-p btn-sm" onClick={() => {
            const t = document.getElementById("ne-t")?.value;
            const c = document.getElementById("ne-c")?.value;
            updateDb(d => { const n = d.notes.find(x => x.id === editNote); if (n) { n.title = t; n.content = c; n.updatedAt = new Date().toISOString(); } });
            toast("Note sauvée");
          }}>Enregistrer</button>
        </div>
        <input className="ne-title" id="ne-t" defaultValue={note?.title || ""} placeholder="Titre de la note…" />
        <div className="ne-body"><textarea id="ne-c" defaultValue={note?.content || ""} placeholder="Commencez à écrire…" /></div>
        <div className="ne-foot"><span>Modifié {fmtDate(note?.updatedAt)}</span><span>{(note?.content || "").split(/\s+/).filter(Boolean).length} mots</span></div>
      </div>);
    }
    return (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Notes</h2>
        <button className="btn btn-p" onClick={() => setModal("note")}>{I.plus} Nouvelle note</button>
      </div>
      {db.notes.length ? (
        <div className="notes-grid">
          {[...db.notes].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).map(n => (
            <div key={n.id} className="note-card" onClick={() => setEditNote(n.id)}>
              <div className="note-accent" style={{ background: n.color || "#c8a96e" }} />
              <div className="note-title">{n.title || "Sans titre"}</div>
              <div className="note-preview">{n.content?.slice(0, 120) || "Note vide…"}</div>
              <div className="note-foot">
                <span className="tag">{n.cat || "perso"}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtDate(n.updatedAt)}</span>
                  <button style={{ color: "var(--muted)", padding: 2 }} onClick={e => { e.stopPropagation(); if (confirm("Supprimer ?")) { updateDb(d => d.notes = d.notes.filter(x => x.id !== n.id)); toast("Supprimée", "info"); } }}>{I.trash}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : <div className="empty"><p>Aucune note</p><button className="btn btn-p" onClick={() => setModal("note")}>Créer une note</button></div>}
    </>);
  };

  // ── Kanban ──
  const COLS = ["À faire", "En cours", "Révision", "Terminé"];
  const COL_PIPS = ["#4a5568", "#4a7ec8", "#8a6ec8", "#4a9e6e"];
  const ViewProjects = () => (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Projets</h2>
        <button className="btn btn-p" onClick={() => setModal("task")}>{I.plus} Nouvelle tâche</button>
      </div>
      <div className="k-board">
        {COLS.map((col, ci) => {
          const tasks = db.tasks.filter(t => t.colIdx === ci);
          return (
            <div key={ci} className="k-col">
              <div className="k-col-hd"><div className="k-col-pip" style={{ background: COL_PIPS[ci] }} /><div className="k-col-nm">{col}</div><div className="k-col-ct">{tasks.length}</div></div>
              <div className="k-cards">
                {tasks.map(t => (
                  <div key={t.id} className="k-card" onClick={() => {
                    const next = (t.colIdx + 1) % 4;
                    updateDb(d => { const task = d.tasks.find(x => x.id === t.id); if (task) task.colIdx = next; });
                  }}>
                    <div className="k-card-title">{t.title}</div>
                    {t.desc && <div className="k-card-desc">{t.desc.slice(0, 60)}</div>}
                    <div className="k-card-ft">
                      <div className="prio" style={{ background: { none: "var(--muted)", low: "var(--green)", med: "var(--orange)", high: "var(--red)" }[t.prio] || "var(--muted)" }} />
                      {t.due && <span className={`k-due ${t.due < todayStr() && t.colIdx !== 3 ? "over" : ""}`}>{fmtDate(t.due)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="k-add" onClick={() => setModal("task")}>+ Tâche</div>
            </div>
          );
        })}
      </div>
    </>
  );

  // ── Calendar ──
  const MNAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const ViewCalendar = () => {
    const firstDay = new Date(calYear, calMonth, 1);
    let startDay = firstDay.getDay() - 1; if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    const prevDays = new Date(calYear, calMonth, 0).getDate();
    const cells = [];
    for (let i = startDay - 1; i >= 0; i--) cells.push({ num: prevDays - i, other: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
      cells.push({ num: d, ds, today: isToday, events: db.events.filter(e => e.date === ds) });
    }
    const rem = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= rem; i++) cells.push({ num: i, other: true });

    return (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-g btn-sm" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>‹</button>
          <span style={{ fontFamily: "var(--serif)", fontSize: 18, minWidth: 160, textAlign: "center" }}>{MNAMES[calMonth]} {calYear}</span>
          <button className="btn btn-g btn-sm" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>›</button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-g btn-sm" onClick={() => { setCalMonth(today.getMonth()); setCalYear(today.getFullYear()); }}>Aujourd'hui</button>
          <button className="btn btn-p btn-sm" onClick={() => setModal("event")}>{I.plus} Événement</button>
        </div>
      </div>
      <div className="cal-grid">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map(d => <div key={d} className="cal-wd">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={`cal-cell ${c.other ? "oth" : ""} ${c.today ? "today" : ""}`}>
            <div className="cal-dn">{c.num}</div>
            {c.events?.slice(0, 3).map(e => <div key={e.id} className="cal-ev" style={{ background: e.color }}>{e.title}</div>)}
          </div>
        ))}
      </div>
    </>);
  };

  // ── Habits ──
  const ViewHabits = () => {
    const d = new Date(); const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
    const mon = new Date(d); mon.setDate(d.getDate() - dow);
    const weekDates = []; for (let i = 0; i < 7; i++) { const dd = new Date(mon); dd.setDate(mon.getDate() + i); weekDates.push(dd.toISOString().split("T")[0]); }
    const WD = ["L", "M", "M", "J", "V", "S", "D"];
    let total = db.habits.length * 7, done = 0;
    db.habits.forEach(h => weekDates.forEach(ds => { if (h.done?.[ds]) done++; }));
    const rate = total ? Math.round(done / total * 100) : 0;
    const todayDone = db.habits.filter(h => h.done?.[todayStr()]).length;

    return (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div><div style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Habitudes</div><div style={{ fontSize: 12, color: "var(--sub)" }}>Semaine du {mon.getDate()}/{mon.getMonth() + 1} – {new Date(mon.getTime() + 6 * 86400000).getDate()}/{new Date(mon.getTime() + 6 * 86400000).getMonth() + 1}</div></div>
        <button className="btn btn-p" onClick={() => setModal("habit")}>{I.plus} Habitude</button>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
        <div className="stat"><div className="stat-label">Taux semaine</div><div className="stat-val">{rate}%</div></div>
        <div className="stat"><div className="stat-label">Aujourd'hui</div><div className="stat-val">{todayDone}/{db.habits.length}</div></div>
        <div className="stat"><div className="stat-label">Total</div><div className="stat-val">{db.habits.length}</div></div>
      </div>
      {db.habits.map(h => {
        let streak = 0; for (const ds of [...weekDates].reverse()) { if (h.done?.[ds]) streak++; else break; }
        return (<div key={h.id} className="habit-row">
          <div className="habit-icon">{h.icon || "⭐"}</div>
          <div className="habit-info"><div className="habit-nm">{h.name}</div><div className="habit-meta">{streak}j de suite{h.desc ? ` · ${h.desc}` : ""}</div></div>
          <div className="habit-days">{weekDates.map((ds, i) => (
            <div key={ds} className={`hday ${h.done?.[ds] ? "done" : ""}`} onClick={() => updateDb(d => { const hb = d.habits.find(x => x.id === h.id); if (hb) { if (!hb.done) hb.done = {}; hb.done[ds] = !hb.done[ds]; } })}>{WD[i]}</div>
          ))}</div>
          <div className="habit-streak">{streak}<small>jours</small></div>
        </div>);
      })}
      {!db.habits.length && <div className="empty"><p>Aucune habitude</p><button className="btn btn-p" onClick={() => setModal("habit")}>Créer une habitude</button></div>}
    </>);
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

  // ── Journal ──
  const ViewJournal = () => (<>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Journal</h2>
      <button className="btn btn-p" onClick={() => {
        const today = todayStr();
        const existing = db.journal.find(j => j.date === today);
        if (existing) { setEditJournal(existing.id); } else {
          const id = uid();
          updateDb(d => d.journal.push({ id, date: today, mood: "😊", gratitude: "", text: "" }));
          setEditJournal(id);
        }
      }}>{I.plus} Aujourd'hui</button>
    </div>
    {editJournal ? (() => {
      const j = db.journal.find(x => x.id === editJournal);
      if (!j) return null;
      return (<div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 18 }}>{fmtDate(j.date)}</span>
          <button className="btn btn-g btn-sm" onClick={() => setEditJournal(null)}>← Retour</button>
        </div>
        <div className="field"><label>Humeur</label>
          <div style={{ display: "flex", gap: 8 }}>{["😊", "😐", "😔", "🔥", "😴"].map(m => (
            <span key={m} style={{ fontSize: 24, cursor: "pointer", opacity: j.mood === m ? 1 : 0.3, transition: "opacity .15s" }} onClick={() => updateDb(d => { const je = d.journal.find(x => x.id === j.id); if (je) je.mood = m; })}>{m}</span>
          ))}</div>
        </div>
        <div className="field"><label>Gratitudes</label><textarea className="finput" value={j.gratitude || ""} onChange={e => updateDb(d => { const je = d.journal.find(x => x.id === j.id); if (je) je.gratitude = e.target.value; })} placeholder="3 choses positives aujourd'hui…" style={{ minHeight: 60 }} /></div>
        <div className="field"><label>Notes du jour</label><textarea className="finput" value={j.text || ""} onChange={e => updateDb(d => { const je = d.journal.find(x => x.id === j.id); if (je) je.text = e.target.value; })} placeholder="Comment s'est passée ta journée ?" style={{ minHeight: 120 }} /></div>
      </div>);
    })() : (<>
      {[...db.journal].sort((a, b) => b.date.localeCompare(a.date)).map(j => (
        <div key={j.id} className="journal-entry" onClick={() => setEditJournal(j.id)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="journal-mood">{j.mood}</span><span className="journal-date">{fmtDate(j.date)}</span></div>
          {j.text && <div className="journal-text">{j.text}</div>}
        </div>
      ))}
      {!db.journal.length && <div className="empty"><p>Aucune entrée de journal</p></div>}
    </>)}
  </>);

  // ── Finances ──
  const ViewFinances = () => {
    const income = db.transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expense = db.transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const bal = income - expense;
    return (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Finances</h2>
        <button className="btn btn-p" onClick={() => setModal("transaction")}>{I.plus} Transaction</button>
      </div>
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 16 }}>
        <div className="stat"><div className="stat-label">Revenus</div><div className="stat-val" style={{ color: "var(--green)" }}>+{income.toFixed(2)}€</div></div>
        <div className="stat"><div className="stat-label">Dépenses</div><div className="stat-val" style={{ color: "var(--red)" }}>-{expense.toFixed(2)}€</div></div>
        <div className="stat"><div className="stat-label">Solde</div><div className="stat-val" style={{ color: bal >= 0 ? "var(--green)" : "var(--red)" }}>{bal.toFixed(2)}€</div></div>
      </div>
      {db.transactions.length ? (
        <table className="tx-table"><thead><tr><th>Date</th><th>Description</th><th>Catégorie</th><th style={{ textAlign: "right" }}>Montant</th></tr></thead>
          <tbody>{[...db.transactions].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map(t => (
            <tr key={t.id}><td>{fmtDate(t.date)}</td><td>{t.description}</td><td><span className="tag">{t.category || "—"}</span></td>
              <td className={`tx-amt ${t.type === "income" ? "tx-in" : "tx-out"}`} style={{ textAlign: "right" }}>{t.type === "income" ? "+" : "-"}{(t.amount || 0).toFixed(2)}€</td></tr>
          ))}</tbody></table>
      ) : <div className="empty"><p>Aucune transaction</p></div>}
    </>);
  };

  // ── Bookmarks ──
  const ViewBookmarks = () => (<>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Signets</h2>
      <button className="btn btn-p" onClick={() => setModal("bookmark")}>{I.plus} Signet</button>
    </div>
    {db.bookmarks.length ? (
      <div className="bm-grid">{db.bookmarks.map(b => (
        <a key={b.id} className="bm-item" href={b.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="bm-fav">{b.icon || "🔗"}</div>
          <div className="bm-info"><h4>{b.title}</h4><p>{b.url}</p></div>
        </a>
      ))}</div>
    ) : <div className="empty"><p>Aucun signet</p></div>}
  </>);

  // ── Goals ──
  const ViewGoals = () => (<>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 20 }}>Objectifs</h2>
      <button className="btn btn-p" onClick={() => setModal("goal")}>{I.plus} Objectif</button>
    </div>
    {db.goals.length ? (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 12 }}>
        {db.goals.map(g => (
          <div key={g.id} className="goal-card" onClick={() => updateDb(d => { const gl = d.goals.find(x => x.id === g.id); if (gl) gl.progress = Math.min(100, (gl.progress || 0) + 10); })} style={{ cursor: "pointer" }}>
            <div className="goal-title">{g.title}</div>
            <div className="goal-bar"><div className="goal-fill" style={{ width: `${g.progress || 0}%` }} /></div>
            <div className="goal-meta"><span>{g.progress || 0}%</span><span>{g.deadline ? fmtDate(g.deadline) : "—"}</span></div>
          </div>
        ))}
      </div>
    ) : <div className="empty"><p>Aucun objectif</p></div>}
  </>);

  // ── Settings ──
  const ViewSettings = () => (<>
    <h2 style={{ fontFamily: "var(--serif)", fontSize: 20, marginBottom: 16 }}>Paramètres</h2>
    <div className="s-group">
      <div className="s-row"><div><div className="s-lbl">Nom</div><div className="s-sub">{db.profile?.name || user.name}</div></div></div>
      <div className="s-row"><div><div className="s-lbl">Email</div><div className="s-sub">{db.profile?.email || user.email}</div></div></div>
    </div>
    <div className="s-group">
      <div className="s-row"><div><div className="s-lbl">Thème</div></div>
        <select className="s-select" value={theme} onChange={e => { setTheme(e.target.value); updateDb(d => d.settings.theme = e.target.value); }}>
          <option value="dark">Sombre</option><option value="light">Clair</option>
        </select>
      </div>
      <div className="s-row"><div><div className="s-lbl">Durée focus (min)</div></div>
        <input className="finput" type="number" defaultValue={db.settings?.focusDur || 25} style={{ width: 80 }} onChange={e => updateDb(d => d.settings.focusDur = parseInt(e.target.value) || 25)} />
      </div>
    </div>
    <div className="s-group">
      <div className="s-row"><div><div className="s-lbl">Exporter les données</div><div className="s-sub">Télécharger un backup JSON</div></div>
        <button className="btn btn-g" onClick={() => {
          const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
          const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `flow-backup-${todayStr()}.json`; a.click();
          toast("Export téléchargé");
        }}>Exporter</button>
      </div>
      <div className="s-row"><div><div className="s-lbl">Stockage</div><div className="s-sub">{(() => { try { return (new Blob([JSON.stringify(db)]).size / 1024).toFixed(1) + " Ko"; } catch { return "—"; } })()}</div></div><span className="tag">Cloud</span></div>
    </div>
    <div style={{ background: "var(--red-d)", border: "1px solid rgba(216,92,92,.2)", borderRadius: "var(--r)", padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)", marginBottom: 4 }}>Zone dangereuse</div>
      <div style={{ fontSize: 12, color: "var(--sub)", marginBottom: 10 }}>Supprime toutes les données. Irréversible.</div>
      <button className="btn btn-d" onClick={() => { if (confirm("Supprimer TOUTES les données ?")) { const fresh = emptyDB(); fresh.profile = { name: user.name, email: user.email }; setDb(fresh); save(fresh, true); toast("Données effacées", "info"); } }}>Tout supprimer</button>
    </div>
  </>);

  // ── View map ──
  const VIEWS = {
    dashboard: ViewDashboard, notes: ViewNotes, projects: ViewProjects,
    calendar: ViewCalendar, habits: ViewHabits, focus: ViewFocus,
    journal: ViewJournal, finances: ViewFinances, bookmarks: ViewBookmarks,
    goals: ViewGoals, settings: ViewSettings,
  };
  const CurrentView = VIEWS[view] || ViewDashboard;

  // ═══════ RENDER ═══════
  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* Sidebar veil (mobile) */}
        <div className={`sb-veil ${sbOpen ? "show" : ""}`} onClick={() => setSbOpen(false)} />

        {/* Sidebar */}
        <aside className={`sb ${sbOpen ? "open" : ""}`}>
          <div className="sb-top">
            <div className="sb-logo">
              <div className="sb-mark"><svg viewBox="0 0 20 20"><polyline points="2,14 6,7 10,10 18,3" /></svg></div>
              <div className="sb-release">{releaseLabel}</div>
              <div className="sb-name">Flow</div>
              <div className={`sb-saved ${saveState}`} title={saveState === "dirty" ? "Synchronisation en attente" : saveState === "saving" ? "Synchronisation…" : "Sauvegardé"} />
            </div>
          </div>
          <nav className="sb-nav">
            <div className="sb-sec">Espace</div>
            {NAV.slice(0, 6).map(n => (
              <div key={n.key} className={`ni ${view === n.key ? "on" : ""}`} onClick={() => { setView(n.key); setSbOpen(false); setEditNote(null); setEditJournal(null); }}>
                {n.icon}<span>{n.label}</span>{n.badge && <span className="ni-badge">{n.badge}</span>}
              </div>
            ))}
            <div className="sb-sec">Vie quotidienne</div>
            {NAV.slice(6, 10).map(n => (
              <div key={n.key} className={`ni ${view === n.key ? "on" : ""}`} onClick={() => { setView(n.key); setSbOpen(false); setEditJournal(null); }}>
                {n.icon}<span>{n.label}</span>
              </div>
            ))}
            <div className="sb-sec">Système</div>
            {NAV.slice(10).map(n => (
              <div key={n.key} className={`ni ${view === n.key ? "on" : ""}`} onClick={() => { setView(n.key); setSbOpen(false); }}>
                {n.icon}<span>{n.label}</span>
              </div>
            ))}
          </nav>
          <div className="sb-user">
            <div className="sb-av">{(db.profile?.name || user.name || "?")[0].toUpperCase()}</div>
            <span className="sb-uname">{db.profile?.name || user.name}</span>
            <button className="sb-logout" onClick={() => { setTheme(t => t === "dark" ? "light" : "dark"); updateDb(d => d.settings.theme = theme === "dark" ? "light" : "dark"); }} title="Changer thème">{theme === "dark" ? I.sun : I.moon}</button>
            <button className="sb-logout" onClick={doLogout} title="Déconnexion">{I.logout}</button>
          </div>
        </aside>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <button className="tb-menu" onClick={() => setSbOpen(true)}>{I.menu}</button>
            <span className="tb-title">{TITLES[view] || "Flow"}</span>
            <div className="tb-search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg><input placeholder="Rechercher… (⌘K)" /></div>
            <div className="tb-right">
              <button className="btn btn-p btn-sm" onClick={() => {
                if (view === "notes") setModal("note");
                else if (view === "projects") setModal("task");
                else if (view === "calendar") setModal("event");
                else if (view === "habits") setModal("habit");
                else if (view === "finances") setModal("transaction");
                else if (view === "bookmarks") setModal("bookmark");
                else if (view === "goals") setModal("goal");
                else setModal("note");
              }}>{I.plus} Nouveau</button>
            </div>
          </div>
          <div className="content" key={view}><CurrentView /></div>
        </div>
      </div>

      {/* Modals */}
      {renderModal()}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
      </div>
    </>
  );
}
