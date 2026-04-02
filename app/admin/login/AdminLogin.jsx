"use client";

import { useEffect, useState } from "react";
import { getStoredLocale, installDomTranslator } from "../../../lib/i18n";

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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const locale = getStoredLocale();
    document.documentElement.lang = locale;
    return installDomTranslator(document.body, locale);
  }, []);

  return (
    <div className="shell">
      <style jsx>{`
        :global(html),:global(body){margin:0;min-height:100%}
        :global(body){
          font-family:"Geist",system-ui,sans-serif;
          background:
            radial-gradient(circle at top left, rgba(255,255,255,.12), transparent 26%),
            linear-gradient(145deg, rgba(255,255,255,.03), transparent 28%),
            #0b0b0d;
          color:#f7f7fb;
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
        }
        .shell{
          min-height:100vh;
          display:grid;
          place-items:center;
          padding:20px;
        }
        .card{
          width:min(480px,100%);
          border-radius:30px;
          padding:28px;
          border:1px solid rgba(255,255,255,.08);
          background:
            radial-gradient(circle at top left, rgba(255,255,255,.08), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,.045), rgba(255,255,255,.015) 18%, transparent 44%),
            #121318;
          box-shadow:0 24px 70px rgba(0,0,0,.24);
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
          color:rgba(242,243,248,.7);
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
          background:#17191f;
          color:#f7f7fb;
          padding:14px 16px;
          outline:none;
        }
        button{
          width:100%;
          margin-top:18px;
          border:1px solid rgba(255,255,255,.22);
          border-radius:16px;
          background:linear-gradient(180deg,#f5f5f7,#cfcfd4);
          color:#111113;
          padding:14px 16px;
          font-weight:800;
          cursor:pointer;
        }
        button:disabled{opacity:.6;cursor:wait}
        .error{
          margin-top:14px;
          padding:12px 14px;
          border-radius:14px;
          border:1px solid rgba(255,133,133,.18);
          background:rgba(226,98,98,.08);
          color:#ffd3db;
        }
        .link{
          margin-top:16px;
          text-align:center;
        }
        .link a{color:#f0f0f3}
      `}</style>

      <div className="card">
        <div className="logo">F</div>
        <div className="eyebrow">Flow Control</div>
        <h1>Connexion admin</h1>
        <p>Le shell admin reprend maintenant le meme langage visuel que Flow pour garder une experience plus propre et plus lisible.</p>
        <label>Email admin</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="admin@flow..." autoComplete="username" />
        <label>Mot de passe</label>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Mot de passe administrateur" autoComplete="current-password" />
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await api("/api/admin/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
              });
              window.location.href = "/admin";
            } catch (err) {
              setError(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Connexion..." : "Ouvrir le dashboard admin"}
        </button>
        {error ? <div className="error">{error}</div> : null}
        <div className="link"><a href="/">Retour a Flow</a></div>
      </div>
    </div>
  );
}
