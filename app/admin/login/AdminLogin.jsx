"use client";

import { useEffect, useState } from "react";
import { getStoredLocale } from "../../../lib/i18n";

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || "Connexion impossible");
  return payload;
}

export default function AdminLogin() {
  const [locale] = useState(() => getStoredLocale());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const copy = locale === "en"
    ? {
        eyebrow: "Flow Control",
        title: "Admin login",
        body: "Access the Flow admin console with the same visual identity and a cleaner control surface.",
        email: "Admin email",
        emailPlaceholder: "admin@flow...",
        password: "Password",
        passwordPlaceholder: "Administrator password",
        submit: "Open admin dashboard",
        pending: "Signing in...",
        back: "Back to Flow",
      }
    : {
        eyebrow: "Flow Control",
        title: "Connexion admin",
        body: "Accède à la console admin Flow avec la même identité visuelle et une surface de contrôle plus claire.",
        email: "Email admin",
        emailPlaceholder: "admin@flow...",
        password: "Mot de passe",
        passwordPlaceholder: "Mot de passe administrateur",
        submit: "Ouvrir le dashboard admin",
        pending: "Connexion...",
        back: "Retour à Flow",
      };

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  async function submitLogin(event) {
    event?.preventDefault?.();
    if (busy) return;

    const trimmedEmail = `${email || ""}`.trim();
    const nextPassword = `${password || ""}`;

    if (!trimmedEmail || !nextPassword) {
      setError(locale === "en" ? "Enter your admin email and password." : "Entre l'email admin et le mot de passe.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await api("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail, password: nextPassword }),
      });
      window.location.href = "/admin";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <style jsx>{`
        :global(html),:global(body){margin:0;min-height:100%;overflow-x:hidden}
        :global(body){
          font-family:"Inter",system-ui,sans-serif;
          color:#eef1f8;
          background-color:#05060a;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(180deg, #05060a 0%, #090b10 100%);
          background-size:26px 26px;
        }
        :global(body)::before{
          content:"";
          position:fixed;
          inset:0;
          pointer-events:none;
          background:
            radial-gradient(circle at 26% 24%, rgba(255,255,255,.12), transparent 24%),
            radial-gradient(circle at 74% 28%, rgba(255,143,105,0.12), transparent 18%),
            linear-gradient(180deg, rgba(255,255,255,.03), transparent 46%);
          opacity:.72;
          filter:blur(18px);
          z-index:0;
        }
        .shell{
          min-height:100vh;
          display:grid;
          place-items:center;
          padding:20px;
          width:100%;
        }
        .card{
          width:min(480px,100%);
          border-radius:30px;
          padding:32px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(12,14,19,0.84);
          box-shadow:0 28px 90px rgba(0,0,0,.32);
          backdrop-filter:blur(24px);
          position:relative;
          z-index:1;
        }
        .logo{
          width:52px;
          height:52px;
          border-radius:18px;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(255,255,255,.08);
          border:1px solid rgba(255,255,255,.14);
          color:#f2f2f4;
          font-size:22px;
          font-weight:800;
          margin-bottom:16px;
        }
        .eyebrow{
          font-size:11px;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:rgba(242,243,248,.48);
        }
        h1{
          margin:8px 0 10px;
          font-size:38px;
          line-height:.94;
          letter-spacing:-.06em;
        }
        p{
          margin:0 0 20px;
          color:rgba(242,243,248,.72);
          line-height:1.6;
        }
        label{
          display:block;
          margin:14px 0 8px;
          font-size:11px;
          letter-spacing:.08em;
          text-transform:uppercase;
          color:rgba(242,243,248,.48);
        }
        input{
          width:100%;
          box-sizing:border-box;
          border-radius:16px;
          border:1px solid rgba(255,255,255,.08);
          background:rgba(18,21,29,0.94);
          color:#f7f7fb;
          padding:14px 16px;
          outline:none;
        }
        button{
          width:100%;
          margin-top:18px;
          border:1px solid rgba(255,124,85,.28);
          border-radius:16px;
          background:linear-gradient(180deg, rgba(255,142,108,0.22), rgba(221,92,76,0.26));
          color:#eef3ff;
          padding:14px 16px;
          font-weight:800;
          cursor:pointer;
          box-shadow:0 14px 32px rgba(120, 45, 32, 0.18);
        }
        button:disabled{opacity:.6;cursor:wait}
        .error{
          margin-top:14px;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgba(255,133,133,.18);
          background:rgba(216,92,101,.14);
          color:#ffd3db;
        }
        .link{
          margin-top:16px;
          text-align:center;
        }
        .link a{color:#afc8ff}
      `}</style>

      <form className="card" onSubmit={submitLogin}>
        <div className="logo">F</div>
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>
        <label>{copy.email}</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder={copy.emailPlaceholder} autoComplete="username" />
        <label>{copy.password}</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={copy.passwordPlaceholder} autoComplete="current-password" />
        <button type="submit" disabled={busy}>
          {busy ? copy.pending : copy.submit}
        </button>
        {error ? <div className="error">{error}</div> : null}
        <div className="link"><a href="/">{copy.back}</a></div>
      </form>
    </div>
  );
}
