"use client";

import { Component } from "react";
import { RELEASE } from "../../lib/release";

function readErrorMessage(error) {
  if (!error) return "Erreur inconnue";
  if (typeof error === "string") return error;
  return error.message || error.reason?.message || error.reason || "Erreur inconnue";
}

function FallbackPanel({ detail, onReload }) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0e0e0e",
      color: "#edebe6",
      padding: 20,
      fontFamily: "'Geist',system-ui,sans-serif",
    }}
    >
      <div style={{
        width: "min(520px,100%)",
        borderRadius: 24,
        border: "1px solid rgba(200,169,110,.22)",
        background: "linear-gradient(180deg,rgba(255,255,255,.03),transparent 24%),#161616",
        boxShadow: "0 24px 70px rgba(0,0,0,.38)",
        padding: 24,
      }}
      >
        <div style={{ color: "#c8a96e", fontSize: 12, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>
          Recuperation Flow
        </div>
        <h1 style={{ fontSize: 26, margin: "0 0 8px" }}>Flow a rencontre un souci cote interface.</h1>
        <p style={{ margin: "0 0 14px", color: "#a6a29a", lineHeight: 1.6 }}>
          L'app a bloque une exception client pour eviter l'ecran d'erreur brut. Tu peux recharger proprement sans quitter Flow.
        </p>
        <div style={{
          borderRadius: 16,
          background: "rgba(255,255,255,.03)",
          border: "1px solid rgba(255,255,255,.06)",
          padding: 14,
          marginBottom: 14,
          fontSize: 13,
          color: "#d7d2c7",
          wordBreak: "break-word",
        }}
        >
          {detail || "Exception client capturee"}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={onReload}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              background: "#c8a96e",
              color: "#161411",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recharger Flow
          </button>
          <div style={{ color: "#8f897f", fontSize: 12 }}>
            Version {`v${RELEASE.version}`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default class AppCrashGuard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      detail: "",
    };
    this.handleWindowError = this.handleWindowError.bind(this);
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      detail: readErrorMessage(error),
    };
  }

  componentDidCatch(error) {
    const detail = readErrorMessage(error);
    this.setState({ hasError: true, detail });
    try {
      sessionStorage.setItem("flow_last_client_error", detail);
    } catch {}
    console.error("[FlowCrashGuard]", error);
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  handleWindowError(event) {
    if (!event?.error && !event?.message) return;
    const detail = readErrorMessage(event.error || event.message);
    if (!detail) return;
    this.setState({ hasError: true, detail });
    try {
      sessionStorage.setItem("flow_last_client_error", detail);
    } catch {}
  }

  handleUnhandledRejection(event) {
    if (!event?.reason) return;
    const detail = readErrorMessage(event.reason);
    if (!detail) return;
    this.setState({ hasError: true, detail });
    try {
      sessionStorage.setItem("flow_last_client_error", detail);
    } catch {}
  }

  handleReload() {
    this.setState({ hasError: false, detail: "" });
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return <FallbackPanel detail={this.state.detail} onReload={this.handleReload} />;
    }
    return this.props.children;
  }
}
