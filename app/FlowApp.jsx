"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ReleaseBadge, ReleaseWidget } from "./flow/release-ui";
import { RELEASE } from "../lib/release";

const RELEASE_LABEL = formatReleaseLabel(RELEASE);
const LAST_EMAIL_KEY = "flow:last-email";
const UPDATE_POLL_MS = 45_000;
const AUTO_RELOAD_SECONDS = 12;

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

function normalizeMessage(error, fallback) {
  return error?.message || fallback;
}

function isReleaseDifferent(remote) {
  if (!remote?.version || !remote?.deployedAt) return false;
  return remote.version !== RELEASE.version || remote.deployedAt !== RELEASE.deployedAt;
}

function StatusPill({ tone = "neutral", children }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
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

export default function FlowApp() {
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState("");
  const [providers, setProviders] = useState({ google: false, email: false });
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [remoteRelease, setRemoteRelease] = useState(RELEASE);
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [reloadCountdown, setReloadCountdown] = useState(AUTO_RELOAD_SECONDS);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [register, setRegister] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [reset, setReset] = useState({ email: "", code: "", password: "" });
  const intervalRef = useRef(null);
  const reloadTimerRef = useRef(null);

  const releaseMeta = useMemo(() => formatReleaseLabel(remoteRelease || RELEASE), [remoteRelease]);

  useEffect(() => {
    const savedEmail = readStoredEmail();
    if (!savedEmail) return;
    setLogin((current) => ({ ...current, email: current.email || savedEmail }));
    setRegister((current) => ({ ...current, email: current.email || savedEmail }));
    setReset((current) => ({ ...current, email: current.email || savedEmail }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const [providerPayload, sessionPayload, releasePayload] = await Promise.all([
          api("/api/auth/providers").catch(() => ({ google: false, email: false })),
          api("/api/session").catch(() => ({ user: null, admin: false })),
          api("/api/release/current").catch(() => RELEASE),
        ]);

        if (cancelled) return;

        setProviders({
          google: Boolean(providerPayload?.google),
          email: Boolean(providerPayload?.email),
        });
        setUser(sessionPayload?.user || null);
        setIsAdmin(Boolean(sessionPayload?.admin));
        setRemoteRelease(releasePayload?.version ? releasePayload : RELEASE);

        const params = new URLSearchParams(window.location.search);
        const googleState = params.get("authGoogle");
        if (googleState === "success") {
          setNotice("Connexion Google réussie. Ton compte est prêt.");
        } else if (googleState === "cancelled") {
          setError("Connexion Google annulée.");
        } else if (googleState === "failed") {
          setError("Connexion Google impossible. Vérifie la configuration OAuth.");
        } else if (googleState === "invalid-state") {
          setError("Etat OAuth invalide. Relance la connexion Google.");
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
          setNotice(`Nouvelle version disponible: v${payload.version}. Rechargement en préparation.`);
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
        summary: "Une nouvelle version a été poussée et attend ton rechargement.",
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

  function syncEmailAcrossForms(email) {
    setLogin((current) => ({ ...current, email }));
    setRegister((current) => ({ ...current, email }));
    setReset((current) => ({ ...current, email }));
  }

  async function refreshSession() {
    const payload = await api("/api/session");
    setUser(payload?.user || null);
    setIsAdmin(Boolean(payload?.admin));
    return payload;
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
      setIsAdmin(Boolean(payload?.admin));
      setNotice("Connexion réussie. La session est mémorisée.");
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
      setIsAdmin(Boolean(payload?.admin));
      setRegister((current) => ({ ...current, password: "", confirmPassword: "" }));
      setNotice("Compte créé. La session est déjà ouverte.");
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
      setNotice("Mot de passe mis à jour. Tu peux te reconnecter.");
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
      setIsAdmin(false);
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

  return (
    <div className="flow-shell">
      <style jsx>{`
        :global(html), :global(body) {
          margin: 0;
          min-height: 100%;
        }
        :global(body) {
          background:
            radial-gradient(circle at top, rgba(45, 85, 255, 0.15), transparent 30%),
            radial-gradient(circle at right top, rgba(0, 204, 153, 0.12), transparent 25%),
            linear-gradient(180deg, #09111f 0%, #0c1324 44%, #0b1020 100%);
          color: #edf3ff;
          font-family: "Geist", system-ui, sans-serif;
        }
        :global(*) {
          box-sizing: border-box;
        }
        .flow-shell {
          min-height: 100vh;
          padding: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .canvas {
          width: min(1180px, 100%);
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 460px);
          gap: 24px;
          align-items: stretch;
        }
        .hero,
        .panel,
        .release-card,
        .support-card {
          border: 1px solid rgba(203, 221, 255, 0.12);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02)),
            rgba(8, 14, 28, 0.84);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(22px);
        }
        .hero {
          border-radius: 32px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          gap: 22px;
          min-height: 720px;
        }
        .panel {
          border-radius: 28px;
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          color: rgba(225, 235, 255, 0.7);
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .mark {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          border: 1px solid rgba(221, 230, 255, 0.12);
          display: grid;
          place-items: center;
          background: rgba(255, 255, 255, 0.05);
        }
        .mark img {
          width: 20px;
          height: 20px;
        }
        h1 {
          margin: 0;
          font-size: clamp(40px, 6vw, 74px);
          line-height: 0.94;
          letter-spacing: -0.06em;
          max-width: 10ch;
        }
        .lede {
          margin: 0;
          max-width: 58ch;
          color: rgba(225, 235, 255, 0.72);
          line-height: 1.7;
          font-size: 15px;
        }
        .hero-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        .hero-card,
        .signal-card {
          border-radius: 22px;
          border: 1px solid rgba(203, 221, 255, 0.1);
          background: rgba(12, 20, 39, 0.78);
          padding: 18px;
        }
        .hero-card strong,
        .signal-card strong {
          display: block;
          font-size: 14px;
          margin-bottom: 8px;
        }
        .hero-card p,
        .signal-card p {
          margin: 0;
          color: rgba(225, 235, 255, 0.66);
          line-height: 1.6;
          font-size: 14px;
        }
        .hero-stack {
          display: grid;
          gap: 16px;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
        .release-card,
        .support-card {
          border-radius: 24px;
          padding: 20px;
        }
        .release-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
          margin-top: 10px;
        }
        .panel-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
        }
        .panel-head h2 {
          margin: 8px 0 0;
          font-size: 28px;
          line-height: 1;
          letter-spacing: -0.05em;
        }
        .panel-head p {
          margin: 8px 0 0;
          color: rgba(225, 235, 255, 0.65);
          line-height: 1.55;
          font-size: 14px;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border-radius: 999px;
          border: 1px solid rgba(203, 221, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #f5f8ff;
          font-size: 12px;
          white-space: nowrap;
        }
        .status-pill.success {
          background: rgba(17, 198, 132, 0.14);
          border-color: rgba(17, 198, 132, 0.24);
        }
        .status-pill.warning {
          background: rgba(255, 184, 77, 0.14);
          border-color: rgba(255, 184, 77, 0.24);
        }
        .status-pill.info {
          background: rgba(85, 145, 255, 0.14);
          border-color: rgba(85, 145, 255, 0.24);
        }
        .banner {
          border-radius: 18px;
          padding: 14px 16px;
          font-size: 14px;
          line-height: 1.55;
          border: 1px solid rgba(203, 221, 255, 0.12);
        }
        .banner.error {
          background: rgba(255, 97, 125, 0.12);
          border-color: rgba(255, 97, 125, 0.22);
          color: #ffd8e1;
        }
        .banner.notice {
          background: rgba(75, 127, 255, 0.12);
          border-color: rgba(75, 127, 255, 0.24);
          color: #dbe6ff;
        }
        .auth-tabs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 6px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(203, 221, 255, 0.08);
        }
        .auth-tab {
          border: 0;
          border-radius: 14px;
          padding: 12px 14px;
          background: transparent;
          color: rgba(233, 240, 255, 0.72);
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        .auth-tab.active {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          transform: translateY(-1px);
        }
        form {
          display: grid;
          gap: 14px;
        }
        .field {
          display: grid;
          gap: 8px;
          color: rgba(237, 243, 255, 0.88);
          font-size: 13px;
        }
        .field span {
          color: rgba(225, 235, 255, 0.68);
        }
        input {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(203, 221, 255, 0.12);
          background: rgba(10, 17, 34, 0.92);
          color: #f7faff;
          padding: 14px 16px;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }
        input:focus {
          border-color: rgba(99, 150, 255, 0.72);
          box-shadow: 0 0 0 4px rgba(70, 125, 255, 0.16);
          transform: translateY(-1px);
        }
        .button-row,
        .inline-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .primary,
        .secondary,
        .ghost {
          border-radius: 16px;
          padding: 13px 16px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .primary {
          border: 0;
          color: #03101d;
          background: linear-gradient(180deg, #f7fbff 0%, #cfe2ff 100%);
          box-shadow: 0 12px 32px rgba(106, 164, 255, 0.22);
        }
        .secondary {
          border: 1px solid rgba(203, 221, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #f5f8ff;
        }
        .ghost {
          border: 1px dashed rgba(203, 221, 255, 0.16);
          background: transparent;
          color: rgba(237, 243, 255, 0.78);
        }
        .primary:hover,
        .secondary:hover,
        .ghost:hover {
          transform: translateY(-1px);
        }
        .primary:disabled,
        .secondary:disabled,
        .ghost:disabled {
          opacity: 0.55;
          cursor: wait;
          transform: none;
        }
        .helper {
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(225, 235, 255, 0.64);
        }
        .account-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .account-tile {
          border-radius: 20px;
          padding: 16px;
          border: 1px solid rgba(203, 221, 255, 0.1);
          background: rgba(10, 16, 32, 0.7);
        }
        .account-tile strong {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .account-tile p {
          margin: 0;
          color: rgba(225, 235, 255, 0.68);
          line-height: 1.6;
          font-size: 14px;
        }
        .account-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .release-click {
          border: 1px solid rgba(203, 221, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          color: #f5f8ff;
          border-radius: 999px;
          padding: 11px 14px;
          cursor: pointer;
          font-weight: 700;
        }
        :global(.release-widget-backdrop) {
          position: fixed;
          inset: 0;
          padding: 24px;
          background: rgba(2, 6, 14, 0.74);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 70;
        }
        :global(.release-widget) {
          width: min(780px, 100%);
          max-height: min(82vh, 920px);
          overflow: auto;
          border-radius: 28px;
          border: 1px solid rgba(203, 221, 255, 0.12);
          background: linear-gradient(180deg, rgba(16, 24, 42, 0.96), rgba(7, 12, 24, 0.98));
          color: #edf3ff;
          padding: 24px;
          box-shadow: 0 36px 90px rgba(0, 0, 0, 0.46);
        }
        :global(.release-widget-head) {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 18px;
        }
        :global(.release-widget-kicker) {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(225, 235, 255, 0.64);
        }
        :global(.release-widget h3) {
          margin: 8px 0;
          font-size: 28px;
          letter-spacing: -0.04em;
        }
        :global(.release-widget p) {
          margin: 0;
          color: rgba(225, 235, 255, 0.66);
          line-height: 1.65;
        }
        :global(.release-close) {
          border: 1px solid rgba(203, 221, 255, 0.14);
          background: rgba(255, 255, 255, 0.05);
          color: #edf3ff;
          border-radius: 14px;
          padding: 11px 14px;
          cursor: pointer;
        }
        :global(.release-stats) {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        :global(.release-stat),
        :global(.release-entry) {
          border: 1px solid rgba(203, 221, 255, 0.12);
          border-radius: 18px;
          padding: 16px;
        }
        :global(.release-stat) {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.04);
        }
        :global(.release-dot) {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
          flex: none;
        }
        :global(.release-list) {
          display: grid;
          gap: 12px;
        }
        :global(.release-entry-head) {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        :global(.release-entry-head strong) {
          display: block;
          margin-bottom: 6px;
        }
        :global(.release-entry-head span) {
          color: rgba(225, 235, 255, 0.64);
        }
        :global(.release-status) {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(203, 221, 255, 0.14);
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          white-space: nowrap;
        }
        @media (max-width: 1080px) {
          .canvas {
            grid-template-columns: 1fr;
          }
          .hero {
            min-height: auto;
          }
        }
        @media (max-width: 720px) {
          .flow-shell {
            padding: 16px;
          }
          .hero,
          .panel {
            padding: 18px;
            border-radius: 24px;
          }
          .hero-grid,
          .hero-stack,
          .account-grid,
          :global(.release-stats) {
            grid-template-columns: 1fr;
          }
          .panel-head {
            flex-direction: column;
          }
          .auth-tabs {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="canvas">
        <section className="hero">
          <div className="eyebrow">
            <div className="mark">
              <img src="/icon.svg" alt="Flow" />
            </div>
            <span>Flow Core Platform</span>
          </div>

          <div>
            <h1>Auth, déploiement et mises à jour, proprement.</h1>
            <p className="lede">
              Cette base ne contient plus les modules produit. Elle se concentre uniquement sur les systèmes
              critiques: création de compte, connexion persistante, Google OAuth, journal de version,
              détection de mise à jour, rechargement et readiness pour Vercel.
            </p>
          </div>

          <div className="hero-grid">
            <div className="hero-card">
              <strong>Création de compte</strong>
              <p>Inscription sécurisée, mot de passe hashé, persistance distante et ouverture automatique de session.</p>
            </div>
            <div className="hero-card">
              <strong>Connexion mémorisée</strong>
              <p>Cookie signé longue durée et rappel du dernier email utilisé pour revenir plus vite.</p>
            </div>
            <div className="hero-card">
              <strong>Google Auth</strong>
              <p>OAuth prêt à brancher sur la config Google, avec récupération ou fusion du compte existant.</p>
            </div>
          </div>

          <div className="hero-stack">
            <div className="release-card">
              <div className="eyebrow">Release actuelle</div>
              <h3 style={{ margin: "10px 0 4px", fontSize: 24 }}>{RELEASE_LABEL}</h3>
              <p className="helper">{RELEASE.summary}</p>
              <div className="release-line">
                <ReleaseBadge label={RELEASE_LABEL} onClick={() => setReleaseOpen(true)} />
                <StatusPill tone="success">Déploiement prêt pour Vercel</StatusPill>
              </div>
            </div>

            <div className="support-card">
              <div className="eyebrow">Systèmes actifs</div>
              <div className="inline-row" style={{ marginTop: 12 }}>
                <StatusPill tone={providers.google ? "success" : "warning"}>
                  Google {providers.google ? "configuré" : "non configuré"}
                </StatusPill>
                <StatusPill tone={providers.email ? "success" : "warning"}>
                  Reset email {providers.email ? "actif" : "indisponible"}
                </StatusPill>
                <StatusPill tone="info">Admin séparé</StatusPill>
              </div>
            </div>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Portail d’accès</div>
              <h2>{booting ? "Initialisation..." : user ? "Session active" : "Connexion Flow"}</h2>
              <p>
                {user
                  ? "Le compte reste connecté et la release courante continue à être surveillée."
                  : "Crée un compte, reconnecte-toi, utilise Google ou réinitialise ton mot de passe depuis cette base minimale."}
              </p>
            </div>
            <StatusPill tone={user ? "success" : "info"}>{user ? "Connecté" : "Prêt"}</StatusPill>
          </div>

          {availableUpdate ? (
            <div className="banner notice">
              Nouvelle version détectée: <strong>v{availableUpdate.version}</strong>. Rechargement automatique dans{" "}
              <strong>{reloadCountdown}s</strong>.
              <div className="button-row" style={{ marginTop: 12 }}>
                <button type="button" className="primary" onClick={() => window.location.reload()}>
                  Recharger maintenant
                </button>
                <button type="button" className="ghost" onClick={() => setAvailableUpdate(null)}>
                  Ignorer pour l’instant
                </button>
              </div>
            </div>
          ) : null}

          {error ? <div className="banner error">{error}</div> : null}
          {notice ? <div className="banner notice">{notice}</div> : null}

          {booting ? (
            <div className="helper">Chargement de la session, des providers et de la release...</div>
          ) : user ? (
            <>
              <div className="account-grid">
                <div className="account-tile">
                  <strong>Compte connecté</strong>
                  <p>{user.name || "Sans nom"}</p>
                  <p>{user.email}</p>
                </div>
                <div className="account-tile">
                  <strong>Version chargée</strong>
                  <p>{releaseMeta}</p>
                  <p>{remoteRelease.summary || "Aucun résumé disponible."}</p>
                </div>
                <div className="account-tile">
                  <strong>Authentification</strong>
                  <p>Session persistante par cookie signé</p>
                  <p>Compatibilité Google et mot de passe</p>
                </div>
                <div className="account-tile">
                  <strong>Accès admin</strong>
                  <p>{isAdmin ? "Ce compte peut ouvrir la console admin." : "Compte utilisateur standard."}</p>
                  <p>/admin/login reste séparé du site principal.</p>
                </div>
              </div>

              <div className="account-actions">
                <button type="button" className="primary" onClick={() => setReleaseOpen(true)}>
                  Ouvrir le journal de version
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    setBusy("refresh-session");
                    setError("");
                    try {
                      await refreshSession();
                      setNotice("Session revalidée.");
                    } catch (sessionError) {
                      setError(normalizeMessage(sessionError, "Session introuvable."));
                    } finally {
                      setBusy("");
                    }
                  }}
                  disabled={busy === "refresh-session"}
                >
                  {busy === "refresh-session" ? "Validation..." : "Revalider la session"}
                </button>
                {isAdmin ? (
                  <a className="secondary" href="/admin" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                    Ouvrir l’admin
                  </a>
                ) : null}
                <button type="button" className="ghost" onClick={submitLogout} disabled={busy === "logout"}>
                  {busy === "logout" ? "Déconnexion..." : "Se déconnecter"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="auth-tabs">
                <AuthTabButton active={activeTab === "login"} onClick={() => setActiveTab("login")}>Connexion</AuthTabButton>
                <AuthTabButton active={activeTab === "register"} onClick={() => setActiveTab("register")}>Créer un compte</AuthTabButton>
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
                    {providers.google ? (
                      <button type="button" className="secondary" onClick={startGoogleAuth} disabled={Boolean(busy)}>
                        Continuer avec Google
                      </button>
                    ) : null}
                  </div>
                  <p className="helper">Le compte reste reconnu automatiquement tant que la session signée est valide.</p>
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
                    label="Confirmer le mot de passe"
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
                    {providers.google ? (
                      <button type="button" className="secondary" onClick={startGoogleAuth} disabled={Boolean(busy)}>
                        Créer via Google
                      </button>
                    ) : null}
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
                    <p className="helper">
                      {providers.email
                        ? "Le code est envoyé par email si la messagerie transactionnelle est configurée."
                        : "La messagerie n’est pas encore configurée. Le endpoint reste prêt mais l’envoi sera refusé proprement."}
                    </p>
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
                        {busy === "reset" ? "Réinitialisation..." : "Mettre à jour le mot de passe"}
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {releaseOpen ? <ReleaseWidget release={RELEASE} label={RELEASE_LABEL} onClose={() => setReleaseOpen(false)} /> : null}
    </div>
  );
}
